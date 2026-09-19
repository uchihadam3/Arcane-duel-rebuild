/*
 * A janela de arte.
 *
 * Todas as ilustrações desenham dentro deste retângulo, no mesmo sistema de
 * coordenadas da carta. Elas podem transbordar à vontade: o recorte da janela
 * é aplicado por quem as monta, e desenhar até a borda é o que evita a moldura
 * branca que denuncia arte encaixada.
 */
export const JANELA = { x: 34, y: 116, largura: 432, altura: 262 } as const;

export const JANELA_FIM = {
  x: JANELA.x + JANELA.largura,
  y: JANELA.y + JANELA.altura,
} as const;

export const CENTRO = {
  x: JANELA.x + JANELA.largura / 2,
  y: JANELA.y + JANELA.altura / 2,
} as const;

export interface ArteProps {
  /** Sufixo único desta carta no documento, para os ids de gradiente. */
  readonly chave: string;
}
