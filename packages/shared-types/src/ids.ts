import type { Marcado } from './brand.js';

export type PlayerId = Marcado<string, 'PlayerId'>;
export type MatchId = Marcado<string, 'MatchId'>;
export type CardId = Marcado<string, 'CardId'>;
export type BuildId = Marcado<string, 'BuildId'>;

export const playerId = (valor: string): PlayerId => valor as PlayerId;
export const matchId = (valor: string): MatchId => valor as MatchId;
export const cardId = (valor: string): CardId => valor as CardId;
export const buildId = (valor: string): BuildId => valor as BuildId;

/** As doze classes do lançamento inicial (FULL_GAME_SPEC.md §2). */
export type ClassId =
  | 'guerreiro'
  | 'mago'
  | 'clerigo'
  | 'necromante'
  | 'paladino'
  | 'ladino'
  | 'bardo'
  | 'monge'
  | 'patrulheiro'
  | 'barbaro'
  | 'druida'
  | 'bruxo';
