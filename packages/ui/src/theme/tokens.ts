/**
 * Tokens de layout compartilhados pela interface.
 *
 * Aqui só entram medidas estruturais que vêm dos documentos. Cor, tipografia e
 * ornamento continuam vindo dos assets aprovados: este arquivo não inventa
 * identidade visual.
 */

/** Proporção mestre das molduras de carta (docs/ASSET_CATALOG.md §8). */
export const PROPORCAO_DA_CARTA = 5 / 7;

/** Formato físico recomendado para o protótipo impresso, em milímetros (§26). */
export const CARTA_FISICA_MM = { largura: 63, altura: 88 } as const;

/**
 * Ordem de empilhamento das camadas da interface. A batalha é composta em
 * camadas separadas, nunca em uma imagem única já montada.
 */
export const Z_DAS_CAMADAS = {
  arena: 0,
  slots: 100,
  cartas: 200,
  texto: 300,
  overlays: 400,
  vfx: 500,
} as const;

/** A batalha é desenhada primeiro para landscape (FULL_GAME_SPEC.md §42). */
export const ORIENTACAO_DA_BATALHA = 'landscape' as const;
