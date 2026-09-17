/** Zonas do campo de um jogador (FULL_GAME_SPEC.md §4). */
export type Zona =
  | 'mao'
  | 'acao'
  | 'resposta'
  | 'cd1'
  | 'cd2'
  | 'cd3'
  | 'passiva'
  | 'carta-de-classe'
  | 'ultimate'
  | 'personagem'
  | 'condicoes'
  | 'removidas';

/** Índice de um dos três espaços centrais de Ação. */
export type IndiceDeAcao = 0 | 1 | 2;

export const INDICES_DE_ACAO: readonly IndiceDeAcao[] = [0, 1, 2];
