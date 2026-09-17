import type { AncoraDeCampo } from './ancoras.js';

/**
 * Ênfase visual.
 *
 * O vídeo de referência destaca o campo em escalas diferentes: uma carta
 * levantada, um slot contornado, e — o caso que os overlays aprovados não
 * cobrem — um lado inteiro do tabuleiro banhado de luz enquanto o efeito
 * daquele jogador resolve. Tratar tudo como "overlay em cima de uma carta"
 * deixaria essa leitura de fora, então o escopo é explícito desde já.
 */

export type EscopoDeEnfase = 'carta' | 'slot' | 'grupo-de-slots' | 'lado' | 'campo';

export type TipoDeEnfase = 'selecionavel' | 'selecionado' | 'alvo-valido' | 'area-afetada';

export interface Enfase {
  readonly tipo: TipoDeEnfase;
  readonly escopo: EscopoDeEnfase;
  readonly alvos: readonly AncoraDeCampo[];
}

/**
 * Ênfases que usam um overlay PNG aprovado. `area-afetada` não aparece aqui de
 * propósito: não existe asset para ela no catálogo e ela é resolvida por luz
 * em código, não por uma imagem esticada.
 */
export const OVERLAY_DA_ENFASE: Readonly<Partial<Record<TipoDeEnfase, string>>> = {
  selecionavel: 'overlay-selecionavel',
  selecionado: 'overlay-selecionado',
  'alvo-valido': 'overlay-alvo-valido',
};

export const usaOverlay = (tipo: TipoDeEnfase): boolean => tipo in OVERLAY_DA_ENFASE;
