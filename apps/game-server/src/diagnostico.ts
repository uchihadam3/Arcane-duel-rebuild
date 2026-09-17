import { CARD_DATA_VERSION } from '@arcane-duel/card-data';
import { RULES_VERSION } from '@arcane-duel/rules-engine';
import type { CarimboDeVersao } from '@arcane-duel/shared-types';

export interface Diagnostico extends CarimboDeVersao {
  readonly status: 'ok';
  readonly servico: 'arcane-duel-game-server';
  /** O que este servidor ainda não faz. Mantido explícito para não haver ilusão. */
  readonly implementado: readonly string[];
  readonly pendente: readonly string[];
}

export const montarDiagnostico = (): Diagnostico => ({
  status: 'ok',
  servico: 'arcane-duel-game-server',
  rulesVersion: RULES_VERSION,
  cardDataVersion: CARD_DATA_VERSION,
  implementado: ['diagnostico'],
  pendente: [
    'salas',
    'matchmaking',
    'validacao-de-jogada',
    'mascara-de-informacao-privada',
    'timers',
    'reconexao',
    'log-de-eventos',
  ],
});
