import type { CardId, EstadoDeJogador, PlayerId } from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import { REGRAS_UNIVERSAIS } from '@arcane-duel/rules-engine';

import {
  ajustar,
  definirGuarda,
  perderVidaDireta,
  recuperarAp,
  reduzirNaResposta,
  somarAoAtaque,
} from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { consumirLimitePorTurno, jogadorDo, slotDe } from '../contexto.js';
import type {
  AlvoDoEfeito,
  ConsultaDeLegalidade,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import {
  atendeJuramento,
  descerJuramento,
  juramentoDe,
  subirJuramento,
} from '../recursos-classe.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  escolhasDaAcao,
  exigirReforco,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Paladino.
 *
 * A Convicção é estado, não moeda. Subir é o Cumprimento do Juramento
 * equipado — e cada um dos três Juramentos define um Cumprimento diferente.
 * Descer é preço: várias cartas trocam um estado por poder, e essa troca é
 * sempre uma escolha explícita de quem joga.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** Os três Juramentos e as três Auras. */
export const JURAMENTOS: readonly CardId[] = [id('PC01'), id('PC02'), id('PC03')];
export const AURAS: readonly CardId[] = [id('PC04'), id('PC05'), id('PC06')];

const PESO_DA_SENTENCA = id('PP10');
const GUARDIAO_DA_LUZ = id('PP09');
const VOTO_CUMPRIDO = id('PP08');

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

/** O Juramento equipado deste jogador, Exaurido ou não. */
export const juramentoEquipado = (jogador: EstadoDeJogador): CardId | null =>
  JURAMENTOS.find(
    (carta) =>
      jogador.cartasDeClasse.some((item) => item.carta === carta) ||
      jogador.removidas.includes(carta),
  ) ?? null;

/** Rodada em andamento: cada rodada tem o turno de cada um dos dois. */
export const rodadaDe = (ctx: Contexto): number => Math.ceil((ctx.partida.turno?.numero ?? 1) / 2);

/* ------------------------------------------------------------------ */
/* Cumprimento do Juramento                                            */
/* ------------------------------------------------------------------ */

/**
 * "Cumpra o requisito de avanço do seu Juramento."
 *
 * O limite impresso muda com o Juramento: a Proteção cumpre uma vez por
 * rodada, a Retribuição e a Conquista uma vez em cada próprio turno. Quem
 * chama diz qual é o limite, e este ponto único é onde a Convicção sobe.
 */
export const cumprirJuramento = (
  ctx: Contexto,
  jogador: PlayerId,
  escopo: 'rodada' | 'turno',
  origem: CardId,
): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'paladino') return false;

  if (escopo === 'rodada') {
    const rodada = rodadaDe(ctx);
    if (valorDaAnotacao(atual.anotacoes, CHAVE.cumprimentoNaRodada) === rodada) return false;
    prometerAoProximoAtaque(
      ctx,
      jogador,
      origem,
      CHAVE.cumprimentoNaRodada,
      rodada - valorDaAnotacao(atual.anotacoes, CHAVE.cumprimentoNaRodada),
      'partida',
    );
  } else if (!consumirLimitePorTurno(ctx, jogador, `${CHAVE.cumprimentoNaRodada}:turno`, origem)) {
    return false;
  }

  subirJuramento(ctx, jogador);
  prometerAoProximoAtaque(ctx, jogador, origem, CHAVE.cumprimentosDoJuramento, 1, 'partida');

  // "Voto Cumprido: a primeira vez em cada rodada que cumprir esse requisito,
  // sua próxima ação recebe +1 D ou +1 I se for ofensiva."
  if (
    passivaRevelada(jogadorDo(ctx, jogador), VOTO_CUMPRIDO) &&
    consumirLimitePorTurno(ctx, jogador, chaveDaPassiva(VOTO_CUMPRIDO), VOTO_CUMPRIDO)
  ) {
    prometerAoProximoAtaque(ctx, jogador, VOTO_CUMPRIDO, CHAVE.proximoAtaqueDano, 1);
  }
  return true;
};

/* ------------------------------------------------------------------ */
/* Requisitos de Convicção                                             */
/* ------------------------------------------------------------------ */

const ORDEM = ['vacilante', 'resoluto', 'inabalavel'] as const;

/**
 * "Justiça Imediata: seu primeiro Ataque no próximo turno pode ser usado como
 * se seu estado estivesse 1 nível acima para verificar requisito."
 */
const degrauEmprestado = (consulta: ConsultaDeLegalidade): number =>
  consulta.acaoRespondida === null &&
  consulta.ordem === 1 &&
  valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.degrauNoProximoTurno) > 0
    ? 1
    : 0;

const alcanca = (consulta: ConsultaDeLegalidade, minimo: 'resoluto' | 'inabalavel'): boolean => {
  const atual = juramentoDe(consulta.jogador);
  if (atual === null) return false;
  return ORDEM.indexOf(atual) + degrauEmprestado(consulta) >= ORDEM.indexOf(minimo);
};

const exigeResoluto = (consulta: ConsultaDeLegalidade): string | null =>
  alcanca(consulta, 'resoluto') ? null : 'requer Resoluto ou Inabalável';

const exigeInabalavel = (consulta: ConsultaDeLegalidade): string | null =>
  alcanca(consulta, 'inabalavel') ? null : 'requer Inabalável';

/**
 * "Desça 1 estado para receber +X": a descida voluntária, com o bônus que o
 * Peso da Sentença soma quando está revelado.
 */
const descerVoluntariamente = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  descerJuramento(ctx, alvo.dono);
  prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.desceuVoluntariamenteNoTurno, 1);

  const dono = jogadorDo(ctx, alvo.dono);
  if (!passivaRevelada(dono, PESO_DA_SENTENCA)) return;
  if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(PESO_DA_SENTENCA), PESO_DA_SENTENCA)) {
    return;
  }
  const escolha = escolhasDaAcao(ctx, alvo).reforco;
  if (escolha === undefined) return;
  somarAoAtaque(
    ctx,
    alvo.atacante,
    alvo.indice,
    escolha === 'impacto' ? { impacto: 1 } : { dano: 1 },
  );
};

/** O jogador pediu para descer de estado nesta jogada? */
const pediuDescer = (ctx: Contexto, alvo: AlvoDoEfeito): boolean =>
  escolhasDaAcao(ctx, alvo).descerEstado === true;

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('P01'),
    {
      // "Se sua Guarda estiver em 6 ao declarar, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.atacante).guarda >= REGRAS_UNIVERSAIS.guardaInicial) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        }
      },
    },
  ],
  [
    id('P02'),
    {
      // "Se estiver Resoluto ou Inabalável, você pode descer 1 estado ao
      // declarar para receber +2 D."
      validarEscolhas: (consulta) => {
        if (consulta.escolhas.descerEstado !== true) return null;
        return atendeJuramento(consulta.jogador, 'resoluto')
          ? null
          : {
              tipo: 'escolha-invalida',
              carta: id('P02'),
              detalhe: 'só desce de estado quem está Resoluto ou Inabalável',
            };
      },
      aoDeclarar: (ctx, alvo) => {
        if (!pediuDescer(ctx, alvo)) return;
        if (!atendeJuramento(jogadorDo(ctx, alvo.atacante), 'resoluto')) return;
        descerVoluntariamente(ctx, alvo);
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('P03'),
    {
      // "Se começou este turno com 2 de Reserva, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.comecouTurnoComReserva2) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('P04'),
    {
      legalidade: exigeResoluto,
      // "Se causar Ruptura, cumpra o requisito de avanço do seu Juramento uma
      // vez, se ainda não o cumpriu neste ciclo."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.ruptura) cumprirJuramento(ctx, alvo.atacante, 'rodada', alvo.origem);
      },
    },
  ],
  [
    id('P05'),
    {
      // "Se o adversário usou uma carta de Reação contra uma ação anterior
      // neste turno, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.defensor, CHAVE.reacoesUsadas) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('P06'),
    {
      // "Se sua Guarda estiver em 4 ou mais, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.atacante).guarda >= 4) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        }
      },
    },
  ],
  [
    id('P07'),
    {
      legalidade: exigeInabalavel,
      // "Ao declarar, você pode descer para Resoluto. Se fizer isso e o
      // adversário estiver com Guarda 0, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (!pediuDescer(ctx, alvo)) return;
        descerVoluntariamente(ctx, alvo);
        if (jogadorDo(ctx, alvo.defensor).guarda !== 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('P08'),
    {
      // "Se você usou uma carta de Reação desde o fim do seu último turno,
      // recebe +1 D e +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.usouReacaoNoTurnoInimigo) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
      },
    },
  ],
  [
    id('P09'),
    {
      legalidade: exigeResoluto,
      // "Se estiver Inabalável, você pode descer para Resoluto para receber +1 D."
      validarEscolhas: (consulta) => {
        if (consulta.escolhas.descerEstado !== true) return null;
        return atendeJuramento(consulta.jogador, 'inabalavel')
          ? null
          : {
              tipo: 'escolha-invalida',
              carta: id('P09'),
              detalhe: 'só desce por esta carta quem está Inabalável',
            };
      },
      aoDeclarar: (ctx, alvo) => {
        if (!pediuDescer(ctx, alvo)) return;
        if (!atendeJuramento(jogadorDo(ctx, alvo.atacante), 'inabalavel')) return;
        descerVoluntariamente(ctx, alvo);
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('P10'),
    {
      // "Se for sua terceira Ação do turno e você estiver Resoluto ou
      // Inabalável, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem !== 3) return;
        if (!atendeJuramento(jogadorDo(ctx, alvo.atacante), 'resoluto')) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('P11'),
    {
      // "No fim deste turno, ganhe +1 Reserva além da conversão normal."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.reservaExtraNoFim, 1);
      },
    },
  ],
  [
    id('P12'),
    {
      legalidade: exigeResoluto,
      // "Seu próximo Ataque neste turno recebe +1 D e +2 I."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueDano, 1);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 2);
      },
    },
  ],
  [
    id('P13'),
    {
      // "Suba 1 estado de Convicção. Você não pode realizar outra Técnica
      // neste turno." A trava vale para **qualquer** Técnica, então ela mora
      // na legalidade de classe e não só nesta carta.
      aposResolver: (ctx, alvo) => {
        subirJuramento(ctx, alvo.atacante);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.tecnicaBloqueada, 1);
      },
    },
  ],
  [
    id('P14'),
    {
      // "Seu próximo Ataque de custo impresso 2 AP ou mais custa 1 AP a menos,
      // mínimo 1."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueDescontoAp, 1);
      },
    },
  ],
  [
    id('P15'),
    {
      // "Reduza 3 I. Se impedir Ruptura, aplique normalmente a condição de
      // avanço do Juramento da Proteção caso seja o seu Juramento."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        if (juramentoEquipado(jogadorDo(ctx, alvo.defensor)) !== id('PC01')) return;
        cumprirJuramento(ctx, alvo.defensor, 'rodada', alvo.origem);
      },
    },
  ],
  [
    id('P16'),
    {
      legalidade: exigeResoluto,
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
    },
  ],
  [
    id('P17'),
    {
      legalidade: exigeResoluto,
      // "Reduza 3 D. Se o Dano final for 0, o adversário perde 2 de Vida."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveAtaque && resumo.dano === 0) {
          perderVidaDireta(ctx, alvo.atacante, 2, alvo.origem);
        }
      },
    },
  ],
  [
    id('P18'),
    {
      // "Só contra um Ataque que causaria Ruptura. Reduza 4 I."
      legalidade: (consulta) => {
        const valores = consulta.acaoRespondida?.valores;
        if (valores === undefined || valores === null) return 'só responde a um Ataque';
        return consulta.jogador.guarda > 0 && consulta.jogador.guarda - valores.impacto <= 0
          ? null
          : 'só contra um Ataque que causaria Ruptura';
      },
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 4 });
      },
    },
  ],
  [
    id('P19'),
    {
      legalidade: exigeResoluto,
      // "Reduza 2 D e 1 I. Se ainda perder Vida, seu primeiro Ataque no próximo
      // turno recebe +1 D."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 1 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano <= 0) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.defensor,
          alvo.origem,
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('P20'),
    {
      legalidade: exigeInabalavel,
      // "Reduza 3 D e 3 I. Depois da resolução, desça para Resoluto."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 3 });
      },
      aposResolver: (ctx, alvo) => {
        descerJuramento(ctx, alvo.defensor);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

const impediuRuptura = (resumo: { teriaRompidoSemResposta: boolean; ruptura: boolean }): boolean =>
  resumo.teriaRompidoSemResposta && !resumo.ruptura;

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('PP01'),
    {
      // "Revele quando impedir sua primeira Ruptura. Depois disso, na primeira
      // vez de cada turno inimigo em que impedir Ruptura, se estiver
      // Vacilante, suba para Resoluto."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.defensor === revelacao.dono &&
        revelacao.resumo !== null &&
        impediuRuptura(revelacao.resumo),
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || !impediuRuptura(resumo)) return;
        if (juramentoDe(jogadorDo(ctx, alvo.dono)) !== 'vacilante') return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        subirJuramento(ctx, alvo.dono);
      },
    },
  ],
  [
    id('PP02'),
    {
      // "Revele quando terminar um turno com Guarda 6 e Reserva 2. Depois
      // disso, enquanto começar o turno com Guarda 6, seu primeiro Ataque
      // recebe +1 I."
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return (
          revelacao.gatilho === 'fim-do-turno' &&
          dono.guarda >= REGRAS_UNIVERSAIS.guardaInicial &&
          dono.reserva === 2
        );
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.comecouTurnoComGuardaCheia) === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('PP03'),
    {
      // "Revele quando perder 4 ou mais de Vida de um Ataque. Depois disso,
      // seu primeiro Ataque no próximo turno pode ser usado como se seu estado
      // estivesse 1 nível acima para verificar requisito."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.defensor === revelacao.dono &&
        (revelacao.resumo?.dano ?? 0) >= 4,
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || resumo.dano < 4) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.dono,
          alvo.origem,
          CHAVE.degrauNoProximoTurno,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('PP04'),
    {
      // "Revele quando uma Reação reduzir Dano e Impacto ao mesmo tempo.
      // Depois disso, na primeira vez de cada turno inimigo que isso
      // acontecer, se estiver Vacilante, suba para Resoluto."
      revelaEm: (ctx, revelacao) => {
        const alvo = revelacao.alvo;
        if (alvo?.defensor !== revelacao.dono) return false;
        if (alvo.reacao === null) return false;
        const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
        return (
          (slot?.reducaoDaResposta.dano ?? 0) > 0 && (slot?.reducaoDaResposta.impacto ?? 0) > 0
        );
      },
      aposResolver: (ctx, alvo) => {
        if (alvo.defensor !== alvo.dono || alvo.reacao === null) return;
        const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
        if ((slot?.reducaoDaResposta.dano ?? 0) <= 0) return;
        if ((slot?.reducaoDaResposta.impacto ?? 0) <= 0) return;
        if (juramentoDe(jogadorDo(ctx, alvo.dono)) !== 'vacilante') return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        subirJuramento(ctx, alvo.dono);
      },
    },
  ],
  [
    id('PP05'),
    {
      // "Revele ao alcançar Inabalável pela primeira vez. Depois disso, o
      // primeiro Ataque de cada turno usado enquanto estiver Inabalável recebe
      // +1 D."
      revelaEm: (ctx, revelacao) => juramentoDe(jogadorDo(ctx, revelacao.dono)) === 'inabalavel',
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (juramentoDe(jogadorDo(ctx, alvo.dono)) !== 'inabalavel') return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('PP06'),
    {
      // "Revele quando provocar sua primeira Ruptura. Depois disso, o primeiro
      // Ataque de cada turno contra Guarda 0 recebe +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.resumo?.ruptura === true,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (jogadorDo(ctx, alvo.defensor).guarda !== 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('PP07'),
    {
      // "Revele quando terminar um turno sem Reserva depois de realizar 3
      // Ações. Depois disso, quando repetir essa situação, seu primeiro Ataque
      // no próximo turno recebe +1 D."
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return (
          revelacao.gatilho === 'fim-do-turno' &&
          dono.reserva === 0 &&
          dono.acoesRealizadasNoTurno >= 3
        );
      },
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(
          ctx,
          revelacao.dono,
          id('PP07'),
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('PP08'),
    {
      // "Revele quando cumprir o requisito de avanço do seu Juramento pela
      // segunda vez." O bônus que ela concede é somado por `cumprirJuramento`.
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.cumprimentosDoJuramento) >= 2,
    },
  ],
  [
    id('PP09'),
    {
      // "Revele ao chegar a 10 de Vida ou menos. Depois disso, sua Defesa
      // Inata usa o valor de Resoluto mesmo se você estiver Vacilante." O
      // efeito é lido pela própria Defesa Inata.
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 10,
    },
  ],
  [
    id('PP10'),
    {
      // "Revele quando descer voluntariamente um estado para fortalecer uma
      // habilidade ofensiva." O bônus é somado por `descerVoluntariamente`.
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.desceuVoluntariamenteNoTurno) > 0,
      validarEscolhas: (consulta) =>
        consulta.escolhas.descerEstado === true
          ? exigirReforco(consulta.escolhas, id('PP10'), 'escolha +1 D ou +1 I para a descida')
          : null,
    },
  ],
]);

/** O Guardião da Luz deixa a Defesa Inata usar o valor de Resoluto. */
export const defesaInataUsaResoluto = (jogador: EstadoDeJogador): boolean =>
  passivaRevelada(jogador, GUARDIAO_DA_LUZ);

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Juramentos e três Auras                     */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('PC01'),
    {
      ativar: {
        // "Quando usar uma Reação, ela reduz +1 D e +1 I."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Quando um Ataque causaria Ruptura, o Impacto final se torna 0 e
        // reduza +2 D."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2 });
          ajustar(ctx, alvo.atacante, alvo.indice, { impactoFinal: 0 });
        },
      },
    },
  ],
  [
    id('PC02'),
    {
      ativar: {
        // "Depois que perder Vida de um Ataque, seu próximo Ataque recebe +1 D."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || resumo.vidaPerdidaPeloDefensor <= 0) return;
          prometerAoProximoAtaque(
            ctx,
            alvo.dono,
            alvo.origem,
            CHAVE.primeiroAtaqueDoProximoTurnoDano,
            1,
            'partida',
          );
        },
      },
      exaurir: {
        // "Depois que perder Vida de um Ataque, o adversário perde 3 de Vida e
        // você sobe 1 estado."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || resumo.vidaPerdidaPeloDefensor <= 0) return;
          perderVidaDireta(ctx, alvo.atacante, 3, alvo.origem);
          subirJuramento(ctx, alvo.dono);
        },
      },
    },
  ],
  [
    id('PC03'),
    {
      ativar: {
        // "Ao declarar um Ataque contra um adversário com 3 ou menos de Guarda,
        // ele recebe +1 I."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          if (jogadorDo(ctx, alvo.defensor).guarda > 3) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        },
      },
      exaurir: {
        // "Ao declarar um Ataque, ele recebe +2 D e +3 I."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 3 });
        },
      },
    },
  ],
  [
    id('PC04'),
    {
      ativar: {
        // "Quando terminar seu turno com 2 de Reserva, suba 1 estado se estiver
        // Vacilante." A conferência é feita no fecho do turno.
      },
      exaurir: {
        // "Durante o turno adversário, antes de jogar uma Reação, ajuste sua
        // Reserva para 2."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          const dono = jogadorDo(ctx, alvo.dono);
          if (dono.reserva >= 2) return;
          ctx.partida = {
            ...ctx.partida,
            jogadores: [
              ctx.partida.jogadores[0].id === alvo.dono
                ? { ...ctx.partida.jogadores[0], reserva: 2 }
                : ctx.partida.jogadores[0],
              ctx.partida.jogadores[1].id === alvo.dono
                ? { ...ctx.partida.jogadores[1], reserva: 2 }
                : ctx.partida.jogadores[1],
            ],
          };
          ctx.eventos.push({ tipo: 'reserva-ganha', jogador: alvo.dono, valor: 2 - dono.reserva });
        },
      },
    },
  ],
  [
    id('PC05'),
    {
      ativar: {
        // "Quando declarar seu primeiro Ataque do turno, ele recebe +1 D."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null
            ? null
            : 'a Aura da Coragem só Ativa ao declarar um Ataque',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          if (!consumirLimitePorTurno(ctx, alvo.dono, CHAVE.primeiroAtaqueDeclarado, alvo.origem)) {
            return;
          }
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
      },
      exaurir: {
        // "Seu próximo Ataque neste turno custa 1 AP a menos, mínimo 1, e
        // recebe +2 D." Como a Aura é usada na própria declaração, o desconto
        // e o bônus valem para o Ataque que a acompanha.
        descontos: (consulta) => (consulta.perfil.valores === null ? {} : { ap: 1, apMinimo: 1 }),
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
        },
      },
    },
  ],
  [
    id('PC06'),
    {
      ativar: {
        // "Quando declarar uma habilidade ofensiva enquanto estiver Resoluto ou
        // Inabalável, ela recebe +1 I."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null && atendeJuramento(consulta.jogador, 'resoluto')
            ? null
            : 'a Aura do Julgamento pede um Ataque e Resoluto ou Inabalável',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        },
      },
      exaurir: {
        // "Ao declarar um Ataque, desça 1 estado. Ele recebe +3 D. Se a descida
        // foi de Inabalável para Resoluto, recebe também +1 I."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          const antes = juramentoDe(jogadorDo(ctx, alvo.dono));
          descerJuramento(ctx, alvo.dono);
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, {
            dano: 3,
            impacto: antes === 'inabalavel' ? 1 : 0,
          });
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
    id('PU01'),
    {
      // "Requer Inabalável. Depois da resolução, desça para Resoluto. Se causar
      // Ruptura, permaneça Inabalável em vez disso."
      legalidade: exigeInabalavel,
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.ruptura) return;
        descerJuramento(ctx, alvo.atacante);
      },
    },
  ],
  [
    id('PU02'),
    {
      // "Requer Inabalável. Dano e Impacto finais da ação se tornam 0. Depois
      // da resolução, ajuste sua Guarda para 6 e desça para Resoluto."
      legalidade: exigeInabalavel,
      aoResponder: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0, impactoFinal: 0 });
      },
      aposResolver: (ctx, alvo) => {
        definirGuarda(ctx, alvo.defensor, REGRAS_UNIVERSAIS.guardaInicial);
        descerJuramento(ctx, alvo.defensor);
      },
    },
  ],
  [
    id('PU03'),
    {
      // "Requer Resoluto ou Inabalável. Durante o restante do turno, depois que
      // até 2 Ataques seus resolverem, recupere 1 AP. Depois do turno, desça 1
      // estado."
      legalidade: exigeResoluto,
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.cruzadaFinalRestante, 2);
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.cruzadaFinalDesce,
          1,
          'partida',
        );
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

/** Cumprimentos automáticos dos três Juramentos, depois de cada Ação. */
export const cumprimentosAposResolver = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  resumo: {
    readonly ruptura: boolean;
    readonly dano: number;
    readonly vidaPerdidaPeloDefensor: number;
    readonly teriaRompidoSemResposta: boolean;
    readonly houveReacao: boolean;
  },
): void => {
  // Juramento da Conquista: Ruptura provocada, uma vez por próprio turno.
  const atacante = jogadorDo(ctx, alvo.atacante);
  if (
    atacante.recurso.classe === 'paladino' &&
    juramentoEquipado(atacante) === id('PC03') &&
    resumo.ruptura
  ) {
    cumprirJuramento(ctx, alvo.atacante, 'turno', id('PC03'));
  }

  // Juramento da Retribuição: Dano à Vida depois de ter perdido Vida.
  const depois = jogadorDo(ctx, alvo.atacante);
  if (
    depois.recurso.classe === 'paladino' &&
    juramentoEquipado(depois) === id('PC02') &&
    resumo.dano > 0 &&
    lerPromessa(ctx, alvo.atacante, CHAVE.perdeuVidaDeAtaqueDesdeUltimoTurno) > 0
  ) {
    cumprirJuramento(ctx, alvo.atacante, 'turno', id('PC02'));
  }

  // Juramento da Proteção: Ruptura impedida por uma Resposta, uma vez por rodada.
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (
    defensor.recurso.classe === 'paladino' &&
    juramentoEquipado(defensor) === id('PC01') &&
    resumo.teriaRompidoSemResposta &&
    !resumo.ruptura
  ) {
    cumprirJuramento(ctx, alvo.defensor, 'rodada', id('PC01'));
  }

  // A marca de "perdi Vida de um Ataque desde o fim do meu último turno".
  if (resumo.vidaPerdidaPeloDefensor > 0) {
    prometerAoProximoAtaque(
      ctx,
      alvo.defensor,
      id('PC02'),
      CHAVE.perdeuVidaDeAtaqueDesdeUltimoTurno,
      1,
      'partida',
    );
  }

  // Cruzada Final: "depois que até 2 Ataques seus resolverem, recupere 1 AP."
  if (resumo.dano >= 0 && alvo.perfil.valores !== null) {
    const restante = lerPromessa(ctx, alvo.atacante, CHAVE.cruzadaFinalRestante);
    if (restante > 0) {
      prometerAoProximoAtaque(ctx, alvo.atacante, id('PU03'), CHAVE.cruzadaFinalRestante, -1);
      recuperarAp(ctx, alvo.atacante, 1);
    }
  }
};

/** Marca de Reação usada, que precisa atravessar a fronteira do turno. */
export const registrarReacaoDoPaladino = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  if (jogadorDo(ctx, alvo.defensor).recurso.classe !== 'paladino') return;
  prometerAoProximoAtaque(
    ctx,
    alvo.defensor,
    id('P08'),
    CHAVE.usouReacaoNoTurnoInimigo,
    1,
    'partida',
  );
};

/** O que o Paladino lê no começo do próprio turno e guarda para as cartas. */
export const marcasDoInicioDoTurno = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'paladino') return;

  if (atual.guarda >= REGRAS_UNIVERSAIS.guardaInicial) {
    prometerAoProximoAtaque(ctx, jogador, id('PP02'), CHAVE.comecouTurnoComGuardaCheia, 1);
  }

  // O bônus e o degrau guardados para "o próximo turno" são deste turno agora.
  const bonus = consumirPromessa(ctx, jogador, CHAVE.primeiroAtaqueDoProximoTurnoDano);
  if (bonus > 0) {
    prometerAoProximoAtaque(ctx, jogador, id('P19'), CHAVE.proximoAtaqueDano, bonus);
  }
};

/**
 * Fecho do próprio turno do Paladino, **depois** da conversão de Reserva.
 *
 * "Quando terminar seu turno com 2 de Reserva" fala da Reserva que o turno
 * deixou, e não da que havia antes de a conversão acontecer.
 */
export const fechoDoPaladino = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'paladino') return;

  // "Aura do Santuário — Ativar: quando terminar seu turno com 2 de Reserva,
  // suba 1 estado se estiver Vacilante."
  const aura = atual.cartasDeClasse.find((item) => item.carta === id('PC04'));
  if (aura?.estado === 'ativada' && atual.reserva === 2 && juramentoDe(atual) === 'vacilante') {
    subirJuramento(ctx, jogador);
  }

  // "Cruzada Final: depois do turno, desça 1 estado."
  if (consumirPromessa(ctx, jogador, CHAVE.cruzadaFinalDesce) > 0) {
    descerJuramento(ctx, jogador);
  }

  // As marcas que valem "desde o fim do meu último turno" são apagadas aqui.
  consumirPromessa(ctx, jogador, CHAVE.usouReacaoNoTurnoInimigo);
  consumirPromessa(ctx, jogador, CHAVE.perdeuVidaDeAtaqueDesdeUltimoTurno);
  consumirPromessa(ctx, jogador, CHAVE.degrauNoProximoTurno);
};

/**
 * "Seu próximo Ataque de custo impresso 2 AP ou mais custa 1 AP a menos."
 *
 * A leitura acontece no cálculo do custo e o gasto acontece depois de o custo
 * ser pago: são dois momentos, e separar os dois evita que uma jogada recusada
 * consuma a promessa.
 */
export const descontoDaMarcha = (jogador: EstadoDeJogador, custoImpresso: number): boolean =>
  custoImpresso >= 2 && valorDaAnotacao(jogador.anotacoes, CHAVE.proximoAtaqueDescontoAp) > 0;

/**
 * "Você não pode realizar outra Técnica neste turno."
 *
 * A trava do Juramento Renovado não é condição de uma carta: ela vale para
 * toda Técnica do Paladino naquele turno, inclusive a própria.
 */
export const travaDeTecnicaDoPaladino = (
  jogador: EstadoDeJogador,
  ehTecnica: boolean,
): string | null =>
  ehTecnica && valorDaAnotacao(jogador.anotacoes, CHAVE.tecnicaBloqueada) > 0
    ? 'o Juramento renovado tranca as Técnicas deste turno'
    : null;

export const consumirDescontoDaMarcha = (
  ctx: Contexto,
  jogador: PlayerId,
  ehAtaque: boolean,
  custoImpresso: number,
): void => {
  if (!ehAtaque || custoImpresso < 2) return;
  consumirPromessa(ctx, jogador, CHAVE.proximoAtaqueDescontoAp);
};
