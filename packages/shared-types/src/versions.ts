/**
 * Carimbo de versão gravado em toda partida, para que um replay saiba com qual
 * versão de regras e de catálogo ele foi produzido (FULL_GAME_SPEC.md §31).
 */
export interface CarimboDeVersao {
  readonly rulesVersion: string;
  readonly cardDataVersion: string;
}
