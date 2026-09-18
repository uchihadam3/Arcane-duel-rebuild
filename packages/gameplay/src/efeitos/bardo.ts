import type { CardId, EstadoDeJogador, Nota, PlayerId } from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import { adiantarCartaNoCooldown, devolverCartaAMao } from '@arcane-duel/rules-engine';

import { ajustar, recuperarAp, reduzirNaResposta, somarAoAtaque } from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { consumirLimitePorTurno, emitir, gravarJogador, jogadorDo, slotDe } from '../contexto.js';
import type {
  AlvoDoEfeito,
  ConsultaDeCusto,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import {
  cadenciasDoTurno,
  notaAnterior,
  notasDe,
  notasDistintasNoTurno,
  registrarNota,
} from '../recursos-classe.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  escolhasDaAcao,
  escolhasDaResposta,
  exigirCartaEntre,
  exigirReforco,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Bardo.
 *
 * O Bardo não tem número para gastar: o recurso dele é a ordem em que as Notas
 * saem. A Nota é dado impresso, vem do catálogo, e só duas cartas pedem que o
 * jogador escolha uma — o Improviso, que não imprime nenhuma, e o Afinar, que
 * troca a Nota da próxima Ação para efeito de Cadência.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** As três Canções e os três Instrumentos. */
export const CANCOES: readonly CardId[] = [id('BC01'), id('BC02'), id('BC03')];
export const INSTRUMENTOS: readonly CardId[] = [id('BC04'), id('BC05'), id('BC06')];

const NOTAS: readonly Nota[] = ['pulso', 'melodia', 'harmonia'];

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

/**
 * A Nota que esta Ação vai registrar.
 *
 * O Afinar substitui a Nota da próxima Ação; o Improviso não imprime Nota e
 * pede uma. Fora esses dois casos, a Nota é a impressa na carta — e uma Reação
 * não tem Nota nenhuma.
 */
export const notaDaAcao = (
  jogador: EstadoDeJogador,
  perfil: { readonly nota?: Nota },
  escolhas: { readonly nota?: Nota },
): Nota | null => {
  const substituta = NOTAS.find(
    (nota) => valorDaAnotacao(jogador.anotacoes, `${CHAVE.notaSubstituta}:${nota}`) > 0,
  );
  return substituta ?? perfil.nota ?? escolhas.nota ?? null;
};

const adiantar = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const movimento = adiantarCartaNoCooldown(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(
    ctx,
    movimento.valor.voltouParaAMao
      ? { tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de }
      : {
          tipo: 'carta-adiantada-no-cooldown',
          jogador,
          carta,
          de: movimento.valor.de,
          para: movimento.valor.para,
        },
  );
};

const devolver = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const movimento = devolverCartaAMao(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(ctx, { tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de });
  prometerAoProximoAtaque(ctx, jogador, carta, CHAVE.cartaVoltouCedo, 1);
};

/** "Deixe Pronta 1 de suas Cartas de Classe Ativadas." */
const prontificarCartaDeClasse = (
  ctx: Contexto,
  jogador: PlayerId,
  carta: CardId,
  origem: CardId,
): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.cartasDeClasse.find((item) => item.carta === carta)?.estado !== 'ativada') return;
  gravarJogador(ctx, {
    ...atual,
    cartasDeClasse: atual.cartasDeClasse.map((item) =>
      item.carta === carta ? { ...item, estado: 'pronta' as const } : item,
    ),
  });
  emitir(ctx, { tipo: 'carta-de-classe-prontificada-por-efeito', jogador, carta, origem });
};

/** "Deixe Pronta uma Passiva sua Ativada." */
const prontificarPassiva = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.passivas.find((item) => item.carta === carta)?.estado !== 'ativada') return;
  gravarJogador(ctx, {
    ...atual,
    passivas: atual.passivas.map((item) =>
      item.carta === carta ? { ...item, estado: 'pronta' as const } : item,
    ),
  });
  emitir(ctx, { tipo: 'passiva-prontificada', jogador, carta });
};

/** "Recebe +1 D ou +1 I se for Ataque": guarda a promessa da escolha feita. */
const prometerReforco = (ctx: Contexto, alvo: AlvoDoEfeito, escolha: 'dano' | 'impacto'): void => {
  prometerAoProximoAtaque(
    ctx,
    alvo.dono,
    alvo.origem,
    escolha === 'impacto' ? CHAVE.proximoAtaqueImpacto : CHAVE.proximoAtaqueDano,
    1,
  );
};

/** Esta Ação vai fechar a segunda Cadência do turno? */
const produzUmaSegundaCadencia = (consulta: ConsultaDeCusto): boolean => {
  if (consulta.ordem !== 3 || cadenciasDoTurno(consulta.jogador) !== 1) return false;
  const nota = notaDaAcao(consulta.jogador, consulta.perfil, consulta.escolhas);
  return nota !== null && nota !== notaAnterior(consulta.jogador);
};

const exigirNota = (consulta: ConsultaDeCusto, carta: CardId): ReturnType<typeof exigirReforco> => {
  const nota = consulta.escolhas.nota;
  if (nota === undefined) {
    return { tipo: 'escolha-obrigatoria', carta, detalhe: 'escolha Pulso, Melodia ou Harmonia' };
  }
  return NOTAS.includes(nota)
    ? null
    : { tipo: 'escolha-invalida', carta, detalhe: 'a Nota precisa ser Pulso, Melodia ou Harmonia' };
};

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('B01'),
    {
      // "Se for sua primeira Ação, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 1) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('B02'),
    {
      // "Se a Ação imediatamente anterior foi Pulso, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (notaAnterior(jogadorDo(ctx, alvo.atacante)) !== 'pulso') return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('B03'),
    {
      // "Só recebe o bônus se você já produziu Cadência neste turno. Se a Ação
      // anterior foi Melodia, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        const dono = jogadorDo(ctx, alvo.atacante);
        if (cadenciasDoTurno(dono) === 0 || notaAnterior(dono) !== 'melodia') return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('B04'),
    {
      // "Recebe +1 D por Nota diferente usada anteriormente neste turno,
      // máximo +2 D."
      aoDeclarar: (ctx, alvo) => {
        const distintas = Math.min(notasDistintasNoTurno(jogadorDo(ctx, alvo.atacante)), 2);
        if (distintas === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: distintas });
      },
    },
  ],
  [
    id('B05'),
    {
      // "Se causar Ruptura, sua próxima Ação neste turno custa 1 AP a menos."
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.ruptura) return;
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximaAcaoDescontoAp, 1);
      },
    },
  ],
  [
    id('B06'),
    {
      // "Só pode ser usado se você já produziu Cadência neste turno. Se for sua
      // terceira Ação, recebe +1 D."
      legalidade: (consulta) =>
        cadenciasDoTurno(consulta.jogador) > 0
          ? null
          : 'só pode ser usado depois de uma Cadência neste turno',
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 3) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('B07'),
    {
      // "Se o adversário usar uma carta de Reação e este Ataque ainda causar
      // Dano à Vida, sua próxima Ação neste turno recebe +1 D ou +1 I se for
      // Ataque."
      validarEscolhas: (consulta) =>
        exigirReforco(consulta.escolhas, id('B07'), 'escolha +1 D ou +1 I para a próxima Ação'),
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.houveReacao || resumo.dano <= 0) return;
        const escolha = escolhasDaAcao(ctx, alvo).reforco;
        if (escolha === undefined) return;
        prometerReforco(ctx, { ...alvo, dono: alvo.atacante }, escolha);
      },
    },
  ],
  [
    id('B08'),
    {
      // "Se o adversário estiver com Reserva 0 ao declarar, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).reserva !== 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('B09'),
    {
      // "Se as 2 Ações anteriores tiveram Notas diferentes entre si, recebe
      // +1 D e +1 I."
      aoDeclarar: (ctx, alvo) => {
        const notas = notasDe(jogadorDo(ctx, alvo.atacante)) ?? [];
        if (notas.length < 2) return;
        const ultima = notas[notas.length - 1];
        const penultima = notas[notas.length - 2];
        if (ultima === undefined || penultima === undefined || ultima === penultima) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
      },
    },
  ],
  [
    id('B10'),
    {
      // "Escolha a Nota de sua próxima Ação neste turno apenas para verificar
      // Cadência."
      validarEscolhas: (consulta) => exigirNota(consulta, id('B10')),
      aposResolver: (ctx, alvo) => {
        const nota = escolhasDaAcao(ctx, alvo).nota;
        if (nota === undefined) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          `${CHAVE.notaSubstituta}:${nota}`,
          1,
        );
      },
    },
  ],
  [
    id('B11'),
    {
      // "Escolha Pulso, Melodia ou Harmonia. Se a próxima Ação tiver Nota
      // diferente, ela recebe +1 D ou +1 I se for Ataque."
      validarEscolhas: (consulta) => {
        const daNota = exigirNota(consulta, id('B11'));
        return daNota ?? exigirReforco(consulta.escolhas, id('B11'), 'escolha +1 D ou +1 I');
      },
      aposResolver: (ctx, alvo) => {
        const escolhas = escolhasDaAcao(ctx, alvo);
        if (escolhas.reforco === undefined) return;
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.descontoSeNotaDiferente, 0);
        prometerReforco(ctx, { ...alvo, dono: alvo.atacante }, escolhas.reforco);
      },
    },
  ],
  [
    id('B12'),
    {
      // "A próxima Ação neste turno com Nota diferente custa 1 AP a menos."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.descontoSeNotaDiferente, 1);
      },
    },
  ],
  [
    id('B13'),
    {
      // "Só pode ser usada se você já produziu Cadência neste turno. Mova uma
      // habilidade sua de CD2 para CD1."
      legalidade: (consulta) =>
        cadenciasDoTurno(consulta.jogador) > 0
          ? null
          : 'só pode ser usada depois de uma Cadência neste turno',
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          consulta.jogador.cooldown[2],
          id('B13'),
          'escolha uma habilidade sua em CD2',
        ),
      aposResolver: (ctx, alvo) => {
        const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
        if (escolhida !== undefined) adiantar(ctx, alvo.atacante, escolhida);
      },
    },
  ],
  [
    id('B14'),
    {
      // "No fim deste turno, ganhe +1 Reserva além da conversão normal."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.reservaExtraNoFim, 1);
      },
    },
  ],
  [
    id('B15'),
    {
      // "Requer que você tenha produzido Cadência neste turno. A próxima carta
      // de Reação adversária neste turno reduz 1 D e 1 I a menos. Se não
      // houver Reação, sua terceira Ação, se for Ataque, recebe +1 D."
      legalidade: (consulta) =>
        cadenciasDoTurno(consulta.jogador) > 0 ? null : 'requer uma Cadência produzida neste turno',
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.desafinar, 1);
      },
    },
  ],
  [
    id('B16'),
    {
      // "Reduza 2 D e 1 I. Se estiver respondendo à segunda ou terceira Ação
      // inimiga, deixe Pronta uma Passiva sua Ativada, se houver."
      validarEscolhas: (consulta) => {
        if (consulta.ordem < 2) return null;
        const ativadas = consulta.jogador.passivas
          .filter((passiva) => passiva.estado === 'ativada')
          .map((passiva) => passiva.carta);
        if (ativadas.length === 0) return null;
        return exigirCartaEntre(
          consulta.escolhas.passiva,
          ativadas,
          id('B16'),
          'escolha uma Passiva sua Ativada',
        );
      },
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 1 });
        if (alvo.ordem < 2) return;
        const escolhida = escolhasDaResposta(ctx, alvo).passiva;
        if (escolhida !== undefined) prontificarPassiva(ctx, alvo.defensor, escolhida);
      },
    },
  ],
  [
    id('B17'),
    {
      // "Reduza 3 I. Se impedir Ruptura, sua primeira Ação no próximo turno
      // recebe +1 I se for Ataque."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.defensor,
          alvo.origem,
          CHAVE.primeiroAtaqueDoProximoTurnoImpacto,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('B18'),
    {
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4 });
      },
    },
  ],
  [
    id('B19'),
    {
      // "Reduza 2 D. Se estiver respondendo à terceira Ação inimiga, sua
      // primeira Ação do próximo turno custa 1 AP a menos."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
      aposResolver: (ctx, alvo) => {
        if (alvo.ordem !== 3) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.defensor,
          alvo.origem,
          CHAVE.primeiraAcaoDoProximoTurnoMaisBarata,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('B20'),
    {
      // "Reduza 3 D e 3 I. Depois, deixe Pronta 1 de suas Cartas de Classe
      // Ativadas."
      validarEscolhas: (consulta) => {
        const ativadas = consulta.jogador.cartasDeClasse
          .filter((item) => item.estado === 'ativada')
          .map((item) => item.carta);
        if (ativadas.length === 0) return null;
        return exigirCartaEntre(
          consulta.escolhas.cartaDeClasse,
          ativadas,
          id('B20'),
          'escolha uma Carta de Classe sua Ativada',
        );
      },
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 3 });
      },
      aposResolver: (ctx, alvo) => {
        const escolhida = escolhasDaResposta(ctx, alvo).cartaDeClasse;
        if (escolhida !== undefined) {
          prontificarCartaDeClasse(ctx, alvo.defensor, escolhida, alvo.origem);
        }
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('BP01'),
    {
      // "Revele quando produzir 2 Cadências no mesmo turno. Depois disso, na
      // primeira vez em cada turno que produzir a segunda Cadência, sua
      // terceira Ação recebe +1 D ou +1 I se for Ataque."
      revelaEm: (ctx, revelacao) => cadenciasDoTurno(jogadorDo(ctx, revelacao.dono)) >= 2,
      // A segunda Cadência é produzida **pela** terceira Ação, então a
      // condição é lida como "esta Ação vai produzi-la": uma Cadência já
      // existe e a Nota desta é diferente da anterior.
      validarEscolhas: (consulta) =>
        produzUmaSegundaCadencia(consulta) && consulta.perfil.valores !== null
          ? exigirReforco(consulta.escolhas, id('BP01'), 'escolha +1 D ou +1 I')
          : null,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.ordem !== 3 || alvo.perfil.valores === null) return;
        const dono = jogadorDo(ctx, alvo.dono);
        const nota = notaDaAcao(dono, alvo.perfil, escolhasDaAcao(ctx, alvo));
        if (cadenciasDoTurno(dono) !== 1 || nota === null || nota === notaAnterior(dono)) return;
        const escolha = escolhasDaAcao(ctx, alvo).reforco;
        if (escolha === undefined) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(
          ctx,
          alvo.atacante,
          alvo.indice,
          escolha === 'impacto' ? { impacto: 1 } : { dano: 1 },
        );
      },
    },
  ],
  [
    id('BP02'),
    {
      // "Revele quando realizar 3 Ações com 3 Notas diferentes. Depois disso, a
      // terceira Ação de cada turno, se for Ataque e completar 3 Notas
      // diferentes, recebe +1 D."
      revelaEm: (ctx, revelacao) => notasDistintasNoTurno(jogadorDo(ctx, revelacao.dono)) >= 3,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.ordem !== 3 || alvo.perfil.valores === null) return;
        const dono = jogadorDo(ctx, alvo.dono);
        const nota = notaDaAcao(dono, alvo.perfil, escolhasDaAcao(ctx, alvo));
        if (nota === null) return;
        if (new Set([...(notasDe(dono) ?? []), nota]).size < 3) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('BP03'),
    {
      // "Revele quando o adversário usar cartas de Reação contra 2 Ataques
      // diferentes seus na mesma rodada. Depois disso, a primeira vez em cada
      // próprio turno que o adversário usar uma Reação e o Ataque ainda causar
      // Dano à Vida, sua próxima Ação recebe +1 D se for Ataque."
      revelaEm: (ctx, revelacao) => {
        const alvo = revelacao.alvo;
        if (alvo?.atacante !== revelacao.dono) return false;
        return lerPromessa(ctx, alvo.defensor, CHAVE.reacoesUsadas) >= 2;
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.atacante !== alvo.dono || !resumo.houveReacao || resumo.dano <= 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueDano, 1);
      },
    },
  ],
  [
    id('BP04'),
    {
      // "Revele quando uma Reação sua reduzir Dano e Impacto ao mesmo tempo.
      // Depois disso, na primeira vez em cada turno inimigo que isso ocorrer, a
      // Reação reduz +1 D ou +1 I."
      revelaEm: (ctx, revelacao) => {
        const alvo = revelacao.alvo;
        if (alvo?.defensor !== revelacao.dono || alvo.reacao === null) return false;
        const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
        return (
          (slot?.reducaoDaResposta.dano ?? 0) > 0 && (slot?.reducaoDaResposta.impacto ?? 0) > 0
        );
      },
      validarEscolhas: (consulta) =>
        consulta.acaoRespondida !== null &&
        consulta.perfil.tipo === 'reacao' &&
        valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('BP04'))) === 0
          ? exigirReforco(consulta.escolhas, id('BP04'), 'escolha reduzir +1 D ou +1 I')
          : null,
      aoResponder: (ctx, alvo) => {
        if (alvo.defensor !== alvo.dono || alvo.reacao === null) return;
        const escolha = escolhasDaResposta(ctx, alvo).reforco;
        if (escolha === undefined) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        reduzirNaResposta(
          ctx,
          alvo.atacante,
          alvo.indice,
          escolha === 'impacto' ? { impacto: 1 } : { dano: 1 },
        );
      },
    },
  ],
  [
    id('BP05'),
    {
      // "Revele quando uma habilidade sua voltar à mão antes do momento normal.
      // Depois disso, a primeira habilidade de cada próprio turno que retornar
      // dessa forma custa 1 AP a menos se usada no mesmo turno."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.cartaVoltouCedo) > 0,
      descontos: (consulta) => {
        if (valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.cartaVoltouCedo) === 0) return {};
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('BP05'))) > 0) return {};
        return { ap: 1, apMinimo: 1 };
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.cartaVoltouCedo) === 0) return;
        consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
      },
    },
  ],
  [
    id('BP06'),
    {
      // "Revele quando terminar um turno com 2 de Reserva. Depois disso, na
      // primeira vez em cada turno que produzir Cadência tendo começado aquele
      // turno com 2 de Reserva, sua próxima Ação recebe +1 D ou +1 I se for
      // Ataque."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' && jogadorDo(ctx, revelacao.dono).reserva === 2,
      aposResolver: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.comecouTurnoComReserva2) === 0) return;
        if (cadenciasDoTurno(jogadorDo(ctx, alvo.dono)) === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueDano, 1);
      },
    },
  ],
  [
    id('BP07'),
    {
      // "Revele quando Ativar seu Instrumento pela terceira vez. Depois disso, a
      // primeira vez em cada rodada que Ativar o Instrumento, sua próxima Ação
      // recebe +1 D ou +1 I se for Ataque."
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.ativacoesDoInstrumento) >= 3,
      // "sua **próxima** Ação recebe +1 D": a promessa nasce depois que a Ação
      // que Ativou o Instrumento resolveu, senão ela mesma a consumiria.
      aposResolver: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono) return;
        const usos = slotDe(jogadorDo(ctx, alvo.dono), alvo.indice)?.cartasDeClasseUsadas ?? [];
        if (!usos.some((uso) => uso.modo === 'ativar' && INSTRUMENTOS.includes(uso.carta))) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueDano, 1);
      },
    },
  ],
  [
    id('BP08'),
    {
      // "Revele quando Ativar sua Canção pela terceira vez. Depois disso, a
      // primeira Ativação da Canção a cada rodada aumenta em 1 um valor
      // numérico adequado do efeito."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.ativacoesDaCancao) >= 3,
    },
  ],
  [
    id('BP09'),
    {
      // "Revele quando chegar a 10 de Vida ou menos. Depois disso, sua terceira
      // Ação de cada turno custa 1 AP a menos se você já produziu 2 Cadências
      // naquele turno."
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 10,
      descontos: (consulta) =>
        consulta.ordem === 3 && cadenciasDoTurno(consulta.jogador) >= 2
          ? { ap: 1, apMinimo: 1 }
          : {},
    },
  ],
  [
    id('BP10'),
    {
      // "Revele quando realizar apenas 1 Ação num turno e terminar com 2 de
      // Reserva. No próximo turno, seu primeiro Ataque recebe +2 D."
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return (
          revelacao.gatilho === 'fim-do-turno' &&
          dono.acoesRealizadasNoTurno === 1 &&
          dono.reserva === 2
        );
      },
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(
          ctx,
          revelacao.dono,
          id('BP10'),
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          2,
          'partida',
        );
      },
      // "Depois disso, quando repetir a preparação, recebe +1 D em vez de +2."
      aposResolver: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono) return;
        const dono = jogadorDo(ctx, alvo.dono);
        if (dono.acoesRealizadasNoTurno !== 1) return;
        prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.preparouOSilencio, 1);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Canções e três Instrumentos                 */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('BC01'),
    {
      ativar: {
        // "Quando produzir Cadência, seu próximo Ataque neste turno recebe +1 I."
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          if (cadenciasDoTurno(jogadorDo(ctx, alvo.dono)) === 0) return;
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
        },
      },
      exaurir: {
        // "Ao declarar sua terceira Ação depois de ter produzido 2 Cadências
        // neste turno, se ela for Ataque, recebe +2 D e +2 I."
        legalidade: (consulta) =>
          consulta.ordem === 3 &&
          consulta.perfil.valores !== null &&
          cadenciasDoTurno(consulta.jogador) >= 2
            ? null
            : 'a Canção da Marcha Exaurida pede a terceira Ação depois de 2 Cadências',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
        },
      },
    },
  ],
  [
    id('BC02'),
    {
      ativar: {
        // "Quando um Ataque inimigo for causar pelo menos 3 D antes das
        // reduções, reduza 1 D."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono || alvo.perfil.valores === null) return;
          const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
          const bruto = alvo.perfil.valores.dano + (slot?.modificadores.dano ?? 0);
          if (bruto < 3) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
      },
      exaurir: {
        // "Nas mesmas condições, reduza 4 D."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono || alvo.perfil.valores === null) return;
          const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
          const bruto = alvo.perfil.valores.dano + (slot?.modificadores.dano ?? 0);
          if (bruto < 3) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4 });
        },
      },
    },
  ],
  [
    id('BC03'),
    {
      ativar: {
        // "Quando o adversário usar uma carta de Reação contra seu Ataque,
        // depois da resolução, se o Ataque ainda causar Dano à Vida, sua
        // próxima Ação neste turno recebe +1 D ou +1 I se for Ataque."
        validarEscolhas: (consulta) =>
          exigirReforco(consulta.escolhas, id('BC03'), 'escolha +1 D ou +1 I para a próxima Ação'),
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.houveReacao || resumo.dano <= 0) return;
          const escolha = escolhasDaAcao(ctx, alvo).reforco;
          if (escolha === undefined) return;
          prometerReforco(ctx, alvo, escolha);
        },
      },
      exaurir: {
        // "Quando uma Reação for declarada contra seu Ataque, depois de aplicar
        // a redução da Reação, o Ataque recebe +3 D."
        antesDeResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.reacao === null) return;
          ajustar(ctx, alvo.atacante, alvo.indice, { bonusAposReducao: 3 });
        },
      },
    },
  ],
  [
    id('BC04'),
    {
      ativar: {
        // "Quando jogar um Ataque de Pulso, ele recebe +1 I."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null && consulta.perfil.nota === 'pulso'
            ? null
            : 'o Tambor de Guerra pede um Ataque de Pulso',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        },
      },
      exaurir: {
        // "O Ataque de Pulso recebe +3 I. Se causar Ruptura, sua próxima Ação
        // neste turno custa 1 AP a menos."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null && consulta.perfil.nota === 'pulso'
            ? null
            : 'o Tambor de Guerra pede um Ataque de Pulso',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximaAcaoDescontoAp, 1);
        },
      },
    },
  ],
  [
    id('BC05'),
    {
      ativar: {
        // "Depois que uma Ação de Melodia resolver, mova uma habilidade sua de
        // CD2 para CD1."
        legalidade: (consulta) =>
          consulta.perfil.nota === 'melodia'
            ? null
            : 'o Alaúde de Cristal pede uma Ação de Melodia',
        validarEscolhas: (consulta) =>
          exigirCartaEntre(
            consulta.escolhas.cartaEmCooldown,
            consulta.jogador.cooldown[2],
            id('BC05'),
            'escolha uma habilidade sua em CD2',
          ),
        aposResolver: (ctx, alvo) => {
          const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
          if (escolhida !== undefined) adiantar(ctx, alvo.dono, escolhida);
        },
      },
      exaurir: {
        // "Depois que uma Ação de Melodia resolver, devolva qualquer habilidade
        // sua em cooldown para a mão. Se usar neste turno, custa +1 AP."
        legalidade: (consulta) =>
          consulta.perfil.nota === 'melodia'
            ? null
            : 'o Alaúde de Cristal pede uma Ação de Melodia',
        validarEscolhas: (consulta) =>
          exigirCartaEntre(
            consulta.escolhas.cartaEmCooldown,
            [
              ...consulta.jogador.cooldown[1],
              ...consulta.jogador.cooldown[2],
              ...consulta.jogador.cooldown[3],
            ],
            id('BC05'),
            'escolha uma habilidade sua em cooldown',
          ),
        aposResolver: (ctx, alvo) => {
          const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
          if (escolhida === undefined) return;
          devolver(ctx, alvo.dono, escolhida);
          prometerAoProximoAtaque(
            ctx,
            alvo.dono,
            alvo.origem,
            `${CHAVE.ritoEncarece}:${escolhida}`,
            1,
          );
        },
      },
    },
  ],
  [
    id('BC06'),
    {
      ativar: {
        // "Depois que uma Ação de Harmonia resolver no seu turno, no fim
        // daquele turno ganhe +1 Reserva além da conversão normal."
        legalidade: (consulta) =>
          consulta.perfil.nota === 'harmonia'
            ? null
            : 'a Flauta de Prata pede uma Ação de Harmonia',
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.reservaExtraNoFim, 1);
        },
      },
      exaurir: {
        // "Durante o turno adversário, antes de responder a uma Ação, ajuste
        // sua Reserva para 2."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          const dono = jogadorDo(ctx, alvo.dono);
          if (dono.reserva >= 2) return;
          gravarJogador(ctx, { ...dono, reserva: 2 });
          emitir(ctx, { tipo: 'reserva-ganha', jogador: alvo.dono, valor: 2 - dono.reserva });
        },
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Ultimates                                                           */
/* ------------------------------------------------------------------ */

export const ULTIMATES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('BU01'),
    {
      // "Só pode ser declarado como terceira Ação se as 2 Ações anteriores
      // tiverem Notas diferentes. Recebe +2 D para cada uma dessas Notas que
      // ainda não se repetiu no turno, máximo +4 D."
      legalidade: (consulta) => {
        if (consulta.ordem !== 3) return 'só pode ser declarado como terceira Ação';
        const notas = notasDe(consulta.jogador) ?? [];
        const ultima = notas[notas.length - 1];
        const penultima = notas[notas.length - 2];
        return ultima !== undefined && penultima !== undefined && ultima !== penultima
          ? null
          : 'as 2 Ações anteriores precisam ter Notas diferentes';
      },
      aoDeclarar: (ctx, alvo) => {
        const notas = notasDe(jogadorDo(ctx, alvo.atacante)) ?? [];
        const duasUltimas = notas.slice(-2);
        const naoRepetidas = duasUltimas.filter(
          (nota) => notas.filter((outra) => outra === nota).length === 1,
        ).length;
        if (naoRepetidas === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 * naoRepetidas });
      },
    },
  ],
  [
    id('BU02'),
    {
      // "Deixe Prontas sua Canção e seu Instrumento. Devolva 1 habilidade sua
      // de CD1 para a mão e recupere 1 AP."
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          consulta.jogador.cooldown[1],
          id('BU02'),
          'escolha uma habilidade sua em CD1',
        ),
      antesDeResolver: (ctx, alvo) => {
        for (const item of jogadorDo(ctx, alvo.atacante).cartasDeClasse) {
          if (item.estado === 'ativada') {
            prontificarCartaDeClasse(ctx, alvo.atacante, item.carta, alvo.origem);
          }
        }
        const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
        if (escolhida !== undefined) devolver(ctx, alvo.atacante, escolhida);
        recuperarAp(ctx, alvo.atacante, 1);
      },
    },
  ],
  [
    id('BU03'),
    {
      // "O Dano e o Impacto finais da ação se tornam 0. Depois, deixe Prontas
      // sua Canção e seu Instrumento."
      aoResponder: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0, impactoFinal: 0 });
      },
      aposResolver: (ctx, alvo) => {
        for (const item of jogadorDo(ctx, alvo.defensor).cartasDeClasse) {
          if (item.estado === 'ativada') {
            prontificarCartaDeClasse(ctx, alvo.defensor, item.carta, alvo.origem);
          }
        }
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

/** Registra a Nota da Ação que acabou de resolver e apura a Cadência. */
export const registrarNotaDaAcao = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'bardo') return;

  const nota = notaDaAcao(dono, alvo.perfil, escolhasDaAcao(ctx, alvo));
  if (nota === null) return;

  // A substituição do Afinar vale para uma Ação só.
  consumirPromessa(ctx, alvo.atacante, `${CHAVE.notaSubstituta}:${nota}`);
  registrarNota(ctx, alvo.atacante, nota);
};

/** "A próxima carta de Reação adversária reduz 1 D e 1 I a menos." */
export const aplicarDesafinar = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  if (jogadorDo(ctx, alvo.atacante).recurso.classe !== 'bardo') return;
  if (alvo.reacao === null) return;
  if (consumirPromessa(ctx, alvo.atacante, CHAVE.desafinar) === 0) return;

  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  const dano = Math.min(1, slot?.reducaoDaResposta.dano ?? 0);
  const impacto = Math.min(1, slot?.reducaoDaResposta.impacto ?? 0);
  if (dano === 0 && impacto === 0) return;
  reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: -dano, impacto: -impacto });
};

/** Descontos de AP que o Bardo guarda para a próxima Ação. */
export const descontoDoBardo = (
  jogador: EstadoDeJogador,
  perfil: { readonly nota?: Nota },
  ordem: number,
): boolean => {
  if (jogador.recurso.classe !== 'bardo') return false;
  if (valorDaAnotacao(jogador.anotacoes, CHAVE.proximaAcaoDescontoAp) > 0) return true;
  if (
    ordem === 1 &&
    valorDaAnotacao(jogador.anotacoes, CHAVE.primeiraAcaoDoProximoTurnoMaisBarata) > 0
  ) {
    return true;
  }
  // "A próxima Ação com Nota diferente custa 1 AP a menos."
  if (valorDaAnotacao(jogador.anotacoes, CHAVE.descontoSeNotaDiferente) === 0) return false;
  const anterior = notaAnterior(jogador);
  return anterior !== null && perfil.nota !== undefined && perfil.nota !== anterior;
};

export const consumirDescontoDoBardo = (ctx: Contexto, jogador: PlayerId, ordem: number): void => {
  if (jogadorDo(ctx, jogador).recurso.classe !== 'bardo') return;
  consumirPromessa(ctx, jogador, CHAVE.proximaAcaoDescontoAp);
  consumirPromessa(ctx, jogador, CHAVE.descontoSeNotaDiferente);
  if (ordem === 1) consumirPromessa(ctx, jogador, CHAVE.primeiraAcaoDoProximoTurnoMaisBarata);
};

/** Bônus guardados para o primeiro Ataque do próximo turno do Bardo. */
export const marcasDoBardoNoInicioDoTurno = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'bardo') return;

  const impacto = consumirPromessa(ctx, jogador, CHAVE.primeiroAtaqueDoProximoTurnoImpacto);
  if (impacto > 0) {
    prometerAoProximoAtaque(ctx, jogador, id('B17'), CHAVE.proximoAtaqueImpacto, impacto);
  }
  const dano = consumirPromessa(ctx, jogador, CHAVE.primeiroAtaqueDoProximoTurnoDano);
  if (dano > 0) {
    // "Depois disso, quando repetir a preparação, recebe +1 D em vez de +2."
    const repetiu = lerPromessa(ctx, jogador, CHAVE.preparouOSilencio) > 0;
    prometerAoProximoAtaque(
      ctx,
      jogador,
      id('BP10'),
      CHAVE.proximoAtaqueDano,
      repetiu ? Math.min(dano, 1) : dano,
    );
  }
};

/** Contagem de Ativações de Canção e Instrumento, para o Virtuose. */
export const contarAtivacoesDoBardo = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  if (jogadorDo(ctx, alvo.atacante).recurso.classe !== 'bardo') return;
  const usos = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice)?.cartasDeClasseUsadas ?? [];
  for (const uso of usos) {
    if (uso.modo !== 'ativar') continue;
    const chave = CANCOES.includes(uso.carta)
      ? CHAVE.ativacoesDaCancao
      : INSTRUMENTOS.includes(uso.carta)
        ? CHAVE.ativacoesDoInstrumento
        : null;
    if (chave === null) continue;
    prometerAoProximoAtaque(ctx, alvo.atacante, uso.carta, chave, 1, 'partida');
  }
};

export { passivaRevelada };
