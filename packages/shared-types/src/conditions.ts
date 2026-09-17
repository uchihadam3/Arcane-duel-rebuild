/** Condições definidas no jogo-base (FULL_GAME_SPEC.md §15). */
export type CondicaoId = 'queimadura' | 'lento' | 'murchar' | 'sangramento';

export const CONDICOES: readonly CondicaoId[] = ['queimadura', 'lento', 'murchar', 'sangramento'];
