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

/**
 * Índice de um espaço central de Ação.
 *
 * Zero, um e dois são os três espaços do jogo-base. O três é o espaço da
 * exceção impressa na Runa Prismática Exaurida e fica `indisponivel` enquanto
 * ela não for usada.
 */
export type IndiceDeAcao = 0 | 1 | 2 | 3;

/** Os três espaços que todo turno tem. */
export const INDICES_DE_ACAO: readonly IndiceDeAcao[] = [0, 1, 2];

/** O espaço da quarta Ação, que só existe quando uma carta o libera. */
export const INDICE_DA_ACAO_EXTRA: IndiceDeAcao = 3;
