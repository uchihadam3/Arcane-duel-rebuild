import type { CardId, EstadoDeJogador, PlayerId } from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import { adiantarCartaNoCooldown, atrasarCartaNoCooldown } from '@arcane-duel/rules-engine';

import { aplicarCondicaoEm, perderVidaDireta, reduzirNaResposta, somarAoAtaque } from '../apoio.js';
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
import { marcarPresa, removerMarca, temMarca } from '../recursos-classe.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  escolhasDaAcao,
  escolhasDaResposta,
  exigirCartaEntre,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Patrulheiro.
 *
 * A Marca da Presa é uma só e fica sobre o adversário. Ela não é moeda: não
 * entra em custo nenhum. Usar a Marca e Explorar a Marca são coisas
 * diferentes — usar não consome, Explorar consome depois da resolução —, e
 * "pode Explorar" é sempre escolha de quem joga.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** Os três Estilos de Caça e as três Armadilhas. */
export const ESTILOS: readonly CardId[] = [id('RC01'), id('RC02'), id('RC03')];
export const ARMADILHAS: readonly CardId[] = [id('RC04'), id('RC05'), id('RC06')];

const ESTILO_DO_ATIRADOR = id('RC01');
const ESTILO_DO_RASTREADOR = id('RC02');
const ULTIMA_CACADA = id('RP10');
const PREDADOR_PACIENTE = id('RP01');

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

/** "Aplique a Marca da Presa." Ela é uma só: aplicar de novo não empilha. */
export const aplicarMarca = (ctx: Contexto, jogador: PlayerId, origem: CardId): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'patrulheiro' || temMarca(atual)) return false;

  marcarPresa(ctx, jogador);
  prometerAoProximoAtaque(ctx, jogador, origem, CHAVE.marcasAplicadas, 1, 'partida');
  prometerAoProximoAtaque(ctx, jogador, origem, CHAVE.marcaAplicadaNaAcao, 1, 'acao');

  // "Pista Fresca: sempre que uma nova Marca for aplicada, o próximo Ataque
  // contra aquele alvo recebe +1 I."
  if (passivaRevelada(jogadorDo(ctx, jogador), id('RP03'))) {
    prometerAoProximoAtaque(ctx, jogador, id('RP03'), CHAVE.proximoAtaqueMarcadoImpacto, 1);
  }
  return true;
};

/** O jogador pediu para Explorar a Marca nesta jogada? */
const pediuExplorar = (ctx: Contexto, alvo: AlvoDoEfeito): boolean =>
  (alvo.dono === alvo.atacante ? escolhasDaAcao(ctx, alvo) : escolhasDaResposta(ctx, alvo))
    .explorarMarca === true;

/**
 * "Explore a Marca": ela é consumida, e os efeitos que dependem da Exploração
 * entram aqui — o Estilo do Atirador, a Última Caçada e o Predador Paciente.
 */
export const explorarMarca = (ctx: Contexto, alvo: AlvoDoEfeito): boolean => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'patrulheiro' || !temMarca(dono)) return false;

  removerMarca(ctx, alvo.atacante);
  prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.marcasExploradas, 1, 'partida');
  prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.explorouMarcaNoTurno, 1);

  let bonus = 0;

  // "Estilo do Atirador — Ativar: +1 D; Exaurir: +3 D."
  const estilo = dono.cartasDeClasse.find((item) => item.carta === ESTILO_DO_ATIRADOR);
  if (estilo?.estado === 'ativada') bonus += 1;
  else if (dono.removidas.includes(ESTILO_DO_ATIRADOR)) bonus += 3;

  // "Última Caçada: a primeira vez em cada turno que Explorar, +1 D."
  if (
    passivaRevelada(dono, ULTIMA_CACADA) &&
    consumirLimitePorTurno(ctx, alvo.atacante, chaveDaPassiva(ULTIMA_CACADA), ULTIMA_CACADA)
  ) {
    bonus += 1;
  }

  // "Predador Paciente: o primeiro Ataque que Explorar uma Marca mantida por
  // pelo menos um turno inteiro recebe +1 D."
  if (
    passivaRevelada(dono, PREDADOR_PACIENTE) &&
    lerPromessa(ctx, alvo.atacante, CHAVE.marcaMantidaPorUmTurno) > 0 &&
    consumirLimitePorTurno(ctx, alvo.atacante, chaveDaPassiva(PREDADOR_PACIENTE), PREDADOR_PACIENTE)
  ) {
    bonus += 1;
  }

  if (bonus > 0 && alvo.perfil.valores !== null) {
    somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: bonus });
  }

  // "Estilo do Rastreador — Exaurir: aplique imediatamente uma nova Marca."
  if (jogadorDo(ctx, alvo.atacante).removidas.includes(ESTILO_DO_RASTREADOR)) {
    aplicarMarca(ctx, alvo.atacante, ESTILO_DO_RASTREADOR);
  }
  return true;
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

const atrasar = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const movimento = atrasarCartaNoCooldown(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok || movimento.valor.de === movimento.valor.para) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(ctx, {
    tipo: 'carta-atrasada-no-cooldown',
    jogador,
    carta,
    de: movimento.valor.de,
    para: movimento.valor.para,
  });
};

/** "Deixe Pronta sua Armadilha se estiver Ativada." */
const prontificarArmadilha = (ctx: Contexto, jogador: PlayerId, origem: CardId): void => {
  const atual = jogadorDo(ctx, jogador);
  const armadilha = atual.cartasDeClasse.find(
    (item) => ARMADILHAS.includes(item.carta) && item.estado === 'ativada',
  );
  if (armadilha === undefined) return;
  gravarJogador(ctx, {
    ...atual,
    cartasDeClasse: atual.cartasDeClasse.map((item) =>
      item.carta === armadilha.carta ? { ...item, estado: 'pronta' as const } : item,
    ),
  });
  emitir(ctx, {
    tipo: 'carta-de-classe-prontificada-por-efeito',
    jogador,
    carta: armadilha.carta,
    origem,
  });
};

const exigirExploracaoPossivel = (
  consulta: ConsultaDeCusto,
  carta: CardId,
): ReturnType<typeof exigirCartaEntre> => {
  if (consulta.escolhas.explorarMarca !== true) return null;
  return temMarca(consulta.jogador)
    ? null
    : { tipo: 'escolha-invalida', carta, detalhe: 'não há Marca da Presa para Explorar' };
};

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('R01'),
    {
      // "Se causar Dano à Vida e o adversário ainda não estiver Marcado,
      // aplique a Marca da Presa."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) aplicarMarca(ctx, alvo.atacante, alvo.origem);
      },
    },
  ],
  [
    id('R02'),
    {
      // "Se o alvo estiver Marcado, pode Explorar a Marca para receber +2 D."
      validarEscolhas: (consulta) => exigirExploracaoPossivel(consulta, id('R02')),
      antesDeResolver: (ctx, alvo) => {
        if (!pediuExplorar(ctx, alvo)) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
        explorarMarca(ctx, alvo);
      },
    },
  ],
  [
    id('R03'),
    {
      // "Contra alvo Marcado, recebe +1 I sem consumir a Marca."
      aoDeclarar: (ctx, alvo) => {
        if (!temMarca(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('R04'),
    {
      // "Pode Explorar a Marca antes da resolução para receber +2 I."
      validarEscolhas: (consulta) => exigirExploracaoPossivel(consulta, id('R04')),
      antesDeResolver: (ctx, alvo) => {
        if (!pediuExplorar(ctx, alvo)) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 2 });
        explorarMarca(ctx, alvo);
      },
    },
  ],
  [
    id('R05'),
    {
      // "Se atingir a Vida de um alvo Marcado, aplique Sangramento 1. A Marca
      // não é consumida."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano <= 0 || !temMarca(jogadorDo(ctx, alvo.atacante))) return;
        aplicarCondicaoEm(ctx, alvo.defensor, 'sangramento', 1);
      },
    },
  ],
  [
    id('R06'),
    {
      // "Se for sua segunda ou terceira Ação e o alvo estiver Marcado, recebe
      // +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem < 2 || !temMarca(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('R07'),
    {
      // "Pode Explorar a Marca para receber +2 I."
      validarEscolhas: (consulta) => exigirExploracaoPossivel(consulta, id('R07')),
      antesDeResolver: (ctx, alvo) => {
        if (!pediuExplorar(ctx, alvo)) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 2 });
        explorarMarca(ctx, alvo);
      },
    },
  ],
  [
    id('R08'),
    {
      // "Só contra alvo Marcado com Guarda 0. Explora obrigatoriamente a Marca
      // e recebe +2 D."
      legalidade: (consulta) => {
        if (!temMarca(consulta.jogador)) return 'só contra alvo Marcado';
        return consulta.adversario.guarda === 0 ? null : 'só contra alvo com Guarda 0';
      },
      antesDeResolver: (ctx, alvo) => {
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
        explorarMarca(ctx, alvo);
      },
    },
  ],
  [
    id('R09'),
    {
      // "Se o adversário usar uma carta de Reação, no fim do turno ganhe
      // +1 Reserva."
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.houveReacao) return;
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.reservaExtraNoFim, 1);
      },
    },
  ],
  [
    id('R10'),
    {
      // "Se a Ação imediatamente anterior foi Técnica, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 1) return;
        if (lerPromessa(ctx, alvo.atacante, CHAVE.acaoAnteriorFoiAtaque) > 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('R11'),
    {
      // "Aplique a Marca da Presa. Se o alvo já estiver Marcado, seu próximo
      // Ataque neste turno recebe +1 I."
      aposResolver: (ctx, alvo) => {
        if (aplicarMarca(ctx, alvo.atacante, alvo.origem)) return;
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
      },
    },
  ],
  [
    id('R12'),
    {
      // "Seu próximo Ataque contra alvo Marcado recebe +1 D e +1 I."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueMarcadoDano, 1);
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.proximoAtaqueMarcadoImpacto,
          1,
        );
      },
    },
  ],
  [
    id('R13'),
    {
      // "Escolha 1 Ataque da mão e coloque face-down no terceiro espaço de
      // Ação. No próximo turno, ele está reservado para ser a terceira Ação e
      // custa 1 AP a menos."
      validarEscolhas: (consulta) => {
        const ataquesNaMao = consulta.jogador.mao.filter(
          (carta) => carta !== consulta.perfil.carta,
        );
        return exigirCartaEntre(
          consulta.escolhas.cartaDaMao,
          ataquesNaMao,
          id('R13'),
          'escolha um Ataque da sua mão',
        );
      },
      aposResolver: (ctx, alvo) => {
        const escolhida = escolhasDaAcao(ctx, alvo).cartaDaMao;
        if (escolhida === undefined) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          `${CHAVE.ataqueEmboscado}:${escolhida}`,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('R14'),
    {
      // "Deixe Pronta sua Carta de Classe do tipo Armadilha se estiver
      // Ativada."
      aposResolver: (ctx, alvo) => {
        prontificarArmadilha(ctx, alvo.atacante, alvo.origem);
      },
    },
  ],
  [
    id('R15'),
    {
      // "Se o adversário estiver Marcado e você não Explorar a Marca neste
      // turno, seu primeiro Ataque no próximo turno custa 1 AP a menos." A
      // conferência do "não Explorar" acontece no fecho do turno; aqui fica só
      // a exigência de que a Marca exista agora.
      aposResolver: (ctx, alvo) => {
        if (!temMarca(jogadorDo(ctx, alvo.atacante))) return;
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.pacienciaDoCacador, 1);
      },
    },
  ],
  [
    id('R16'),
    {
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
    },
  ],
  [
    id('R17'),
    {
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 2 });
      },
    },
  ],
  [
    id('R18'),
    {
      // "Reduza 2 D e 2 I. Se o adversário ainda não estiver Marcado, aplique
      // a Marca."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
        aplicarMarca(ctx, alvo.defensor, alvo.origem);
      },
    },
  ],
  [
    id('R19'),
    {
      // "Reduza 2 D. Se o Dano final for 0, o adversário perde 2 Vida. Se ainda
      // não estiver Marcado, aplique a Marca."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2 });
        aplicarMarca(ctx, alvo.defensor, alvo.origem);
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveAtaque && resumo.dano === 0) {
          perderVidaDireta(ctx, alvo.atacante, 2, alvo.origem);
        }
      },
    },
  ],
  [
    id('R20'),
    {
      // "Reduza 2 I. Se impedir Ruptura, aplique a Marca se ela ainda não
      // existir."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        aplicarMarca(ctx, alvo.defensor, alvo.origem);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('RP01'),
    {
      // "Revele quando passar um turno completo mantendo a Marca sem Explorar."
      // O bônus que ela concede é somado por `explorarMarca`.
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.marcaMantidaPorUmTurno) > 0,
    },
  ],
  [
    id('RP02'),
    {
      // "Revele quando um Ataque preparado por Emboscada acertar a Vida. Depois
      // disso, a próxima vez que usar um Ataque preparado por Emboscada, ele
      // recebe +1 D."
      revelaEm: (ctx, revelacao) =>
        revelacao.alvo?.atacante === revelacao.dono &&
        (revelacao.resumo?.dano ?? 0) > 0 &&
        lerPromessa(ctx, revelacao.dono, CHAVE.usouAtaqueEmboscado) > 0,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        // O desconto da Emboscada já foi gasto na hora de pagar o custo; a
        // marca de "este é o Ataque emboscado" é o que sobra para ler aqui.
        if (lerPromessa(ctx, alvo.dono, CHAVE.usouAtaqueEmboscado) === 0) return;
        if (lerPromessa(ctx, alvo.dono, chaveDaPassiva(alvo.origem)) > 0) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.dono,
          alvo.origem,
          chaveDaPassiva(alvo.origem),
          1,
          'partida',
        );
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('RP03'),
    {
      // "Revele quando aplicar a Marca pela segunda vez na partida." O bônus
      // que ela concede é somado por `aplicarMarca`.
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.marcasAplicadas) >= 2,
    },
  ],
  [
    id('RP04'),
    {
      // "Revele quando começar seu turno com o adversário Marcado e sem
      // Reserva. Seu primeiro Ataque recebe +1 D."
      revelaEm: (ctx, revelacao) => {
        if (revelacao.gatilho !== 'inicio-do-turno') return false;
        // "começar **seu** turno": o gatilho vale no turno do dono, e não no
        // início de qualquer turno.
        if (ctx.partida.turno?.jogadorAtivo !== revelacao.dono) return false;
        const dono = jogadorDo(ctx, revelacao.dono);
        const inimigo = ctx.partida.jogadores.find((item) => item.id !== revelacao.dono);
        return temMarca(dono) && inimigo?.reserva === 0;
      },
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(ctx, revelacao.dono, id('RP04'), CHAVE.proximoAtaqueDano, 1);
      },
      ativacao: {
        podeAtivar: (ctx, alvo) =>
          alvo.dono === alvo.atacante &&
          temMarca(jogadorDo(ctx, alvo.dono)) &&
          jogadorDo(ctx, alvo.defensor).reserva === 0 &&
          lerPromessa(ctx, alvo.dono, chaveDaPassiva(alvo.origem)) === 0,
        aplicar: (ctx, alvo) => {
          consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
      },
    },
  ],
  [
    id('RP05'),
    {
      // "Revele quando uma Armadilha for Ativada pela segunda vez. Depois
      // disso, na primeira vez a cada rodada em que uma Armadilha for Ativada,
      // mova uma Técnica sua de CD2 para CD1."
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.ativacoesDaArmadilha) >= 2,
      validarEscolhas: (consulta) => {
        const ativou = consulta.cartasDeClasse.some(
          (uso) => uso.modo === 'ativar' && ARMADILHAS.includes(uso.carta),
        );
        if (!ativou || consulta.jogador.cooldown[2].length === 0) return null;
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('RP05'))) > 0)
          return null;
        return exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          consulta.jogador.cooldown[2],
          id('RP05'),
          'escolha uma carta sua em CD2',
        );
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono) return;
        const usos = slotDe(jogadorDo(ctx, alvo.dono), alvo.indice)?.cartasDeClasseUsadas ?? [];
        if (!usos.some((uso) => uso.modo === 'ativar' && ARMADILHAS.includes(uso.carta))) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
        if (escolhida !== undefined) adiantar(ctx, alvo.dono, escolhida);
      },
    },
  ],
  [
    id('RP06'),
    {
      // "Revele quando realizar apenas 1 Ataque num turno e terminar com 2 de
      // Reserva. No próximo turno, seu primeiro Ataque recebe +1 D e +1 I."
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return (
          revelacao.gatilho === 'fim-do-turno' &&
          dono.reserva === 2 &&
          lerPromessa(ctx, revelacao.dono, CHAVE.ataquesResolvidos) === 1
        );
      },
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(
          ctx,
          revelacao.dono,
          id('RP06'),
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('RP07'),
    {
      // "Revele quando a Marca for Explorada pela terceira vez. Depois disso, a
      // primeira habilidade de cada turno que aplicar nova Marca custa 1 AP a
      // menos."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.marcasExploradas) >= 3,
      descontos: (consulta) => {
        if (temMarca(consulta.jogador)) return {};
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('RP07'))) > 0) return {};
        return { ap: 1, apMinimo: 1 };
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono) return;
        consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
      },
    },
  ],
  [
    id('RP08'),
    {
      // "Revele quando uma habilidade sua voltar à mão antes do momento normal.
      // Depois disso, a primeira habilidade que retornar dessa forma em cada
      // turno recebe +1 D se for Ataque."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.cartaVoltouCedo) > 0,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.cartaVoltouCedo) === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('RP09'),
    {
      // "Revele quando impedir Ruptura com uma Reação. Depois disso, na
      // primeira vez em cada turno inimigo que impedir Ruptura, seu próximo
      // Ataque recebe +1 I."
      revelaEm: (_ctx, revelacao) => {
        const resumo = revelacao.resumo;
        if (revelacao.alvo?.defensor !== revelacao.dono || resumo === null) return false;
        return resumo.houveReacao && resumo.teriaRompidoSemResposta && !resumo.ruptura;
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || !resumo.houveReacao) return;
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prometerAoProximoAtaque(
          ctx,
          alvo.dono,
          alvo.origem,
          CHAVE.primeiroAtaqueDoProximoTurnoImpacto,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('RP10'),
    {
      // "Revele quando chegar a 10 de Vida ou menos. Aplique imediatamente a
      // Marca se ela não estiver presente." O bônus por Exploração é somado por
      // `explorarMarca`.
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 10,
      aoRevelar: (ctx, revelacao) => {
        aplicarMarca(ctx, revelacao.dono, id('RP10'));
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Estilos e três Armadilhas                   */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('RC01'),
    {
      // Os dois lados são lidos por `explorarMarca`, que é por onde toda
      // Exploração passa.
      ativar: {},
      exaurir: {},
    },
  ],
  [
    id('RC02'),
    {
      ativar: {
        // "Depois que Explorar uma Marca, no fim daquele turno aplique
        // novamente a Marca da Presa."
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          if (lerPromessa(ctx, alvo.dono, CHAVE.explorouMarcaNoTurno) === 0) return;
          // "no fim daquele turno": a Marca só volta quando o turno fechar.
          marcarNoFimDoTurno(ctx, alvo.dono, alvo.origem);
        },
      },
      exaurir: {
        // "Depois que Explorar uma Marca, aplique imediatamente uma nova Marca."
        // A aplicação imediata é feita por `explorarMarca`.
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          if (lerPromessa(ctx, alvo.dono, CHAVE.explorouMarcaNoTurno) === 0) return;
          aplicarMarca(ctx, alvo.dono, alvo.origem);
        },
      },
    },
  ],
  [
    id('RC03'),
    {
      ativar: {
        // "Quando usar um Ataque colocado por Preparar Emboscada, ele recebe
        // +1 D e +1 I."
        legalidade: (consulta) =>
          valorDaAnotacao(
            consulta.jogador.anotacoes,
            `${CHAVE.ataqueEmboscado}:${consulta.perfil.carta}`,
          ) > 0
            ? null
            : 'o Estilo do Emboscador pede o Ataque preparado por Emboscada',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Aquele Ataque recebe +3 D e +1 I."
        legalidade: (consulta) =>
          valorDaAnotacao(
            consulta.jogador.anotacoes,
            `${CHAVE.ataqueEmboscado}:${consulta.perfil.carta}`,
          ) > 0
            ? null
            : 'o Estilo do Emboscador pede o Ataque preparado por Emboscada',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 1 });
        },
      },
    },
  ],
  [
    id('RC04'),
    {
      ativar: {
        // "Quando o adversário declarar a terceira Ação do turno, se for
        // Ataque, ela recebe -1 D e -2 I. Se for Técnica, resolve e depois
        // entra 1 etapa de cooldown mais distante."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono || alvo.ordem !== 3) return;
          if (alvo.perfil.valores === null) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 2 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || alvo.ordem !== 3) return;
          if (alvo.perfil.valores !== null || resumo.zonaDeCooldown === null) return;
          atrasar(ctx, alvo.atacante, alvo.perfil.carta);
        },
      },
      exaurir: {
        // "Contra a terceira Ação, se for Ataque, recebe -3 D e -3 I. Se for
        // Técnica, resolve e depois vai para CD3."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono || alvo.ordem !== 3) return;
          if (alvo.perfil.valores === null) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 3 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || alvo.ordem !== 3) return;
          if (alvo.perfil.valores !== null || resumo.zonaDeCooldown === null) return;
          atrasar(ctx, alvo.atacante, alvo.perfil.carta);
          atrasar(ctx, alvo.atacante, alvo.perfil.carta);
        },
      },
    },
  ],
  [
    id('RC05'),
    {
      ativar: {
        // "Depois que o adversário concluir o segundo Ataque no mesmo turno,
        // ele perde 1 Vida."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || !resumo.houveAtaque) return;
          if (lerPromessa(ctx, alvo.atacante, CHAVE.ataquesResolvidos) < 1) return;
          perderVidaDireta(ctx, alvo.atacante, 1, alvo.origem);
        },
      },
      exaurir: {
        // "Depois do segundo Ataque, ele perde 3 Vida e recebe a Marca da Presa
        // se ainda não estiver Marcado."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || !resumo.houveAtaque) return;
          if (lerPromessa(ctx, alvo.atacante, CHAVE.ataquesResolvidos) < 1) return;
          perderVidaDireta(ctx, alvo.atacante, 3, alvo.origem);
          aplicarMarca(ctx, alvo.dono, alvo.origem);
        },
      },
    },
  ],
  [
    id('RC06'),
    {
      ativar: {
        // "Quando um Ataque inimigo com pelo menos 3 I for declarado, reduza
        // 2 I."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono || alvo.perfil.valores === null) return;
          const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
          if (alvo.perfil.valores.impacto + (slot?.modificadores.impacto ?? 0) < 3) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 2 });
        },
      },
      exaurir: {
        // "Reduza 4 I daquele Ataque."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono || alvo.perfil.valores === null) return;
          const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
          if (alvo.perfil.valores.impacto + (slot?.modificadores.impacto ?? 0) < 3) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 4 });
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
    id('RU01'),
    {
      // "Só contra alvo Marcado. Explora obrigatoriamente a Marca. Se o
      // adversário estiver com Guarda 0, recebe +3 D."
      legalidade: (consulta) => (temMarca(consulta.jogador) ? null : 'só contra alvo Marcado'),
      antesDeResolver: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).guarda === 0) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 3 });
        }
        explorarMarca(ctx, alvo);
      },
    },
  ],
  [
    id('RU02'),
    {
      // "Se o adversário estiver Marcado, recebe +1 D e +1 I, sem consumir a
      // Marca."
      aoDeclarar: (ctx, alvo) => {
        if (!temMarca(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
      },
    },
  ],
  [
    id('RU03'),
    {
      // "Se o adversário não estiver Marcado, aplique a Marca. Deixe Pronta sua
      // Armadilha se estiver Ativada. Seu próximo Ataque neste turno custa
      // 1 AP a menos, recebe +1 D e +1 I."
      aposResolver: (ctx, alvo) => {
        aplicarMarca(ctx, alvo.atacante, alvo.origem);
        prontificarArmadilha(ctx, alvo.atacante, alvo.origem);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueDano, 1);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximaAcaoDescontoAp, 1);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

const MARCA_NO_FIM = `${CHAVE.marcasAplicadas}:no-fim`;

const marcarNoFimDoTurno = (ctx: Contexto, jogador: PlayerId, origem: CardId): void => {
  prometerAoProximoAtaque(ctx, jogador, origem, MARCA_NO_FIM, 1);
};

/** Bônus que o Patrulheiro guardou para um Ataque contra alvo Marcado. */
export const aplicarBonusDeMarca = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'patrulheiro' || alvo.perfil.valores === null) return;
  if (!temMarca(dono)) return;

  const dano = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoAtaqueMarcadoDano);
  const impacto = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoAtaqueMarcadoImpacto);
  if (dano !== 0 || impacto !== 0) {
    somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano, impacto });
  }
};

/** Contagem de Ativações de Armadilha, para o Mestre das Armadilhas. */
export const contarArmadilhas = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  if (jogadorDo(ctx, alvo.atacante).recurso.classe !== 'patrulheiro') return;
  const usos = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice)?.cartasDeClasseUsadas ?? [];
  for (const uso of usos) {
    if (uso.modo !== 'ativar' || !ARMADILHAS.includes(uso.carta)) continue;
    prometerAoProximoAtaque(
      ctx,
      alvo.atacante,
      uso.carta,
      CHAVE.ativacoesDaArmadilha,
      1,
      'partida',
    );
  }
};

/** Fecho do turno do Patrulheiro: a Marca prometida e a Marca mantida. */
export const fechoDoPatrulheiro = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'patrulheiro') return;

  if (consumirPromessa(ctx, jogador, MARCA_NO_FIM) > 0) {
    aplicarMarca(ctx, jogador, ESTILO_DO_RASTREADOR);
  }

  // "Passar um turno completo mantendo a Marca sem Explorar."
  const manteve =
    temMarca(jogadorDo(ctx, jogador)) &&
    lerPromessa(ctx, jogador, CHAVE.explorouMarcaNoTurno) === 0;
  if (manteve) {
    prometerAoProximoAtaque(ctx, jogador, id('RP01'), CHAVE.marcaMantidaPorUmTurno, 1, 'partida');
  }
  // "Paciência do Caçador": o desconto só nasce se a Marca não foi Explorada.
  if (manteve && consumirPromessa(ctx, jogador, CHAVE.pacienciaDoCacador) > 0) {
    prometerAoProximoAtaque(
      ctx,
      jogador,
      id('R15'),
      CHAVE.primeiraAcaoDoProximoTurnoMaisBarata,
      1,
      'partida',
    );
  }
};

/** Descontos do Patrulheiro: o Ataque emboscado e a Paciência do Caçador. */
export const descontoDoPatrulheiro = (
  jogador: EstadoDeJogador,
  perfil: { readonly carta: CardId },
): boolean =>
  jogador.recurso.classe === 'patrulheiro' &&
  valorDaAnotacao(jogador.anotacoes, `${CHAVE.ataqueEmboscado}:${perfil.carta}`) > 0;

export const consumirDescontoDoPatrulheiro = (
  ctx: Contexto,
  jogador: PlayerId,
  carta: CardId,
): void => {
  if (jogadorDo(ctx, jogador).recurso.classe !== 'patrulheiro') return;
  if (consumirPromessa(ctx, jogador, `${CHAVE.ataqueEmboscado}:${carta}`) > 0) {
    prometerAoProximoAtaque(ctx, jogador, carta, CHAVE.usouAtaqueEmboscado, 1);
  }
};
