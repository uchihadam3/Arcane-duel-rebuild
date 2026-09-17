import type {
  CardId,
  EstadoDeJogador,
  PlayerId,
  ReforcoEscolhido,
} from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';
import { valorDoRecurso } from '@arcane-duel/rules-engine';

import { ganharRecurso, reduzirNaResposta } from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { consumirLimitePorTurno, jogadorDo } from '../contexto.js';
import type { AlvoDoEfeito, ResumoDaResolucao } from '../ganchos.js';
import { lerPromessa, prometerAoProximoAtaque } from './comum.js';

/*
 * As mecânicas de classe: Momentum, Mana e as duas Defesas Inatas.
 *
 * Elas não são cartas e por isso não passam pelo catálogo. A origem usada nas
 * anotações é um identificador de sistema, fora do catálogo de propósito.
 */

const ORIGEM_MOMENTUM = cardId('sistema:momentum');
const ORIGEM_MANA = cardId('sistema:mana');
const ORIGEM_GUARDA_MARCIAL = cardId('sistema:guarda-marcial');
const ORIGEM_BARREIRA_ARCANA = cardId('sistema:barreira-arcana');
const POSTURA_DA_FORTALEZA = cardId('WC01');

/**
 * Mago, início do próprio turno: "recupere 2 Mana, até o máximo".
 *
 * Reserva Arcana, quando revelada, troca esse 2 por 3 caso o turno comece com
 * 1 Mana ou menos.
 */
export const reporManaNoInicioDoTurno = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'mago') return;

  const reservaArcanaRevelada = atual.passivas.some(
    (passiva) => passiva.carta === cardId('MP01') && passiva.estado !== 'oculta',
  );
  const quantidade = reservaArcanaRevelada && atual.recurso.mana <= 1 ? 3 : 2;
  ganharRecurso(ctx, jogador, 'mana', quantidade);
};

/**
 * Guerreiro, depois de uma Ação resolver.
 *
 * "A primeira vez em cada próprio turno que um Ataque remover pelo menos 2 de
 * Guarda, ganha 1 Momentum."
 */
export const momentumPorRemoverGuarda = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  resumo: ResumoDaResolucao,
): void => {
  const atacante = jogadorDo(ctx, alvo.atacante);
  if (atacante.recurso.classe !== 'guerreiro') return;
  // "remover pelo menos 2 de Guarda" é sobre a Guarda que saiu de fato, não
  // sobre o Impacto impresso: um Impacto 3 contra Guarda 1 remove 1.
  if (!resumo.houveAtaque || resumo.guardaRemovida < 2) return;
  if (!consumirLimitePorTurno(ctx, alvo.atacante, CHAVE.momentumPorGuarda, ORIGEM_MOMENTUM)) {
    return;
  }
  ganharRecurso(ctx, alvo.atacante, 'momentum', 1);
};

/**
 * Guerreiro, depois de uma Ação resolver no turno inimigo.
 *
 * "A primeira vez em cada turno inimigo que uma Reação do Guerreiro reduzir o
 * Dano final a 0, ganha 1 Momentum."
 */
export const momentumPorAnularDano = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  resumo: ResumoDaResolucao,
): void => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (defensor.recurso.classe !== 'guerreiro') return;
  if (!resumo.houveAtaque || !resumo.houveReacao || resumo.dano !== 0) return;
  if (!consumirLimitePorTurno(ctx, alvo.defensor, CHAVE.momentumPorDanoZero, ORIGEM_MOMENTUM)) {
    return;
  }
  ganharRecurso(ctx, alvo.defensor, 'momentum', 1);
};

/** Marca, para o fim do turno, o que o atacante conseguiu fazer nesta Ação. */
export const registrarPegadaDoTurno = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  resumo: ResumoDaResolucao,
): void => {
  if (resumo.dano > 0 && lerPromessa(ctx, alvo.atacante, CHAVE.causouDanoNoTurno) === 0) {
    prometerAoProximoAtaque(ctx, alvo.atacante, ORIGEM_MOMENTUM, CHAVE.causouDanoNoTurno, 1);
  }
  if (resumo.ruptura && lerPromessa(ctx, alvo.atacante, CHAVE.causouRupturaNoTurno) === 0) {
    prometerAoProximoAtaque(ctx, alvo.atacante, ORIGEM_MOMENTUM, CHAVE.causouRupturaNoTurno, 1);
  }
};

/**
 * Guerreiro, fim do próprio turno.
 *
 * "No fim do próprio turno, se não causou Dano à Vida e não provocou Ruptura,
 * perde 1 Momentum."
 */
export const momentumNoFimDoTurno = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'guerreiro') return;

  const causouDano = lerPromessa(ctx, jogador, CHAVE.causouDanoNoTurno) > 0;
  const causouRuptura = lerPromessa(ctx, jogador, CHAVE.causouRupturaNoTurno) > 0;
  if (causouDano || causouRuptura) return;

  ganharRecurso(ctx, jogador, 'momentum', -1);
};

/** A Defesa Inata da classe do jogador, se ela existir. */
export const nomeDaDefesaInata = (jogador: EstadoDeJogador): string | null => {
  if (jogador.classe === 'guerreiro') return 'Guarda Marcial';
  return jogador.classe === 'mago' ? 'Barreira Arcana' : null;
};

/** A Defesa Inata já foi usada neste turno? */
export const defesaInataJaUsada = (ctx: Contexto, jogador: PlayerId): boolean =>
  lerPromessa(ctx, jogador, CHAVE.defesaInataUsada) > 0;

/** O jogador consegue pagar a Defesa Inata dele agora? */
export const podeUsarDefesaInata = (ctx: Contexto, jogador: PlayerId): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (defesaInataJaUsada(ctx, jogador)) return false;
  if (atual.classe === 'guerreiro') return true;
  if (atual.classe === 'mago') return (valorDoRecurso(atual, 'mana') ?? 0) >= 1;
  return false;
};

/**
 * Resolve a Defesa Inata escolhida como Resposta.
 *
 * Guarda Marcial: "uma vez por turno inimigo, reduza 1 D ou 1 I."
 * Barreira Arcana: "uma vez por turno inimigo, gaste 1 Mana para reduzir 1 D e
 * 1 I."
 */
export const aplicarDefesaInata = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  reducao: ReforcoEscolhido,
): CardId | null => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (!consumirLimitePorTurno(ctx, alvo.defensor, CHAVE.defesaInataUsada, ORIGEM_GUARDA_MARCIAL)) {
    return null;
  }

  if (defensor.classe === 'guerreiro') {
    // "Postura da Fortaleza — Ativar: quando estiver recebendo um Ataque,
    // Guarda Marcial reduz 1 D e 1 I nesta ação." A carta não soma uma redução
    // própria: ela troca o "ou" da Defesa Inata por um "e".
    const fortalezaAtivada = defensor.cartasDeClasse.some(
      (item) => item.carta === POSTURA_DA_FORTALEZA && item.estado === 'ativada',
    );
    reduzirNaResposta(
      ctx,
      alvo.atacante,
      alvo.indice,
      fortalezaAtivada
        ? { dano: 1, impacto: 1 }
        : reducao === 'impacto'
          ? { impacto: 1 }
          : { dano: 1 },
    );
    return ORIGEM_GUARDA_MARCIAL;
  }

  if (defensor.classe === 'mago') {
    ganharRecurso(ctx, alvo.defensor, 'mana', -1);
    reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
    return ORIGEM_BARREIRA_ARCANA;
  }

  return null;
};

export { ORIGEM_MANA, ORIGEM_MOMENTUM, ORIGEM_GUARDA_MARCIAL, ORIGEM_BARREIRA_ARCANA };
