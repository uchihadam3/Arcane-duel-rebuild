/**
 * Estrutura reservada para a IA.
 *
 * A IA opera sobre o mesmo motor de regras e nunca pode trapacear: ela não
 * conhece Passivas ainda não reveladas nem qualquer informação que um jogador
 * humano não conheceria (FULL_GAME_SPEC.md §18 e §34). A dificuldade muda a
 * qualidade da decisão, nunca Vida, Guarda, dano ou cartas disponíveis.
 *
 * A implementação entra na etapa oito do ROADMAP_CODEX.md. Por enquanto este
 * pacote publica apenas os contratos que o resto do projeto pode assumir.
 */

/** Posição do adversário na campanha: define a capacidade da IA (§18). */
export type NivelDeIA = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const NIVEIS_DE_IA: readonly NivelDeIA[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export type EstiloDeDecisao = 'heuristico' | 'busca-rasa' | 'busca-profunda';

/**
 * Como a dificuldade cresce ao longo da campanha. A primeira IA joga como
 * iniciante e a décima segunda joga em nível muito alto.
 */
export const estiloDoNivel = (nivel: NivelDeIA): EstiloDeDecisao => {
  if (nivel <= 4) return 'heuristico';
  if (nivel <= 8) return 'busca-rasa';
  return 'busca-profunda';
};
