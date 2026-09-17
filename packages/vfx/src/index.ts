/**
 * Estrutura reservada para efeitos visuais.
 *
 * Duas regras do documento moldam este pacote desde já: a lógica da partida
 * nunca depende da velocidade da animação, e o jogador precisa poder acelerar
 * ou reduzir os efeitos dentro de limites definidos (VIDEO_VISUAL_TARGET.md e
 * FULL_GAME_SPEC.md §24, §41).
 */

export type QualidadeDeVfx = 'baixa' | 'media' | 'alta';

/** Multiplicador aplicado à duração das animações. */
export type VelocidadeDeAnimacao = 'reduzida' | 'normal' | 'rapida' | 'instantanea';

export const MULTIPLICADOR_DE_DURACAO: Readonly<Record<VelocidadeDeAnimacao, number>> = {
  reduzida: 1.5,
  normal: 1,
  rapida: 0.6,
  instantanea: 0,
};

export interface PreferenciasDeApresentacao {
  readonly qualidade: QualidadeDeVfx;
  readonly velocidade: VelocidadeDeAnimacao;
  /** Reduz movimento de câmera, exigido pela seção de acessibilidade. */
  readonly reduzirMovimentoDeCamera: boolean;
}

export const PREFERENCIAS_PADRAO: PreferenciasDeApresentacao = {
  qualidade: 'alta',
  velocidade: 'normal',
  reduzirMovimentoDeCamera: false,
};

/** Duração efetiva de uma animação, em milissegundos. */
export const duracaoEfetiva = (duracaoBaseMs: number, velocidade: VelocidadeDeAnimacao): number =>
  Math.round(duracaoBaseMs * MULTIPLICADOR_DE_DURACAO[velocidade]);
