import type { PlayerId } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';

import { ganharRecurso } from '../apoio.js';
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

export {
  ORIGEM_BARREIRA_ARCANA,
  ORIGEM_GUARDA_MARCIAL,
  aplicarDefesaInata,
  defesaInataJaUsada,
  escolhaExigidaPelaDefesaInata,
  motivoParaNaoUsarDefesaInata,
  nomeDaDefesaInata,
} from './defesas-inatas.js';

export { ORIGEM_MANA, ORIGEM_MOMENTUM };
