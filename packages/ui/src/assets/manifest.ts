import dados from './manifest.json' with { type: 'json' };

/** Categorias do catálogo oficial de assets (docs/ASSET_CATALOG.md). */
export type CategoriaDeAsset =
  | 'card-frame'
  | 'card-back'
  | 'arena'
  | 'board-slot'
  | 'board-tray'
  | 'hud'
  | 'overlay'
  | 'icone';

/**
 * Camadas de composição da interface (docs/CODEX_START_HERE.md).
 * A ordem do array é a ordem de desenho, da mais ao fundo para a mais à frente.
 */
export const CAMADAS = ['arena', 'slots', 'cartas', 'texto', 'overlays', 'vfx'] as const;

export type CamadaVisual = (typeof CAMADAS)[number];

export interface EntradaDeAsset {
  /** Identificador semântico estável. Não muda quando o arquivo é substituído. */
  readonly id: string;
  /** Nome canônico do arquivo, exatamente como no ASSET_CATALOG.md. */
  readonly arquivo: string;
  /** Caminho relativo à pasta `/assets` na raiz do repositório. */
  readonly caminho: string;
  readonly categoria: CategoriaDeAsset;
  readonly camada: CamadaVisual;
  readonly papel: string;
}

export const MANIFESTO_DE_ASSETS: readonly EntradaDeAsset[] = dados.assets as EntradaDeAsset[];

const POR_ID = new Map<string, EntradaDeAsset>(
  MANIFESTO_DE_ASSETS.map((entrada) => [entrada.id, entrada]),
);

export const obterAsset = (id: string): EntradaDeAsset | undefined => POR_ID.get(id);

export const assetsPorCategoria = (categoria: CategoriaDeAsset): readonly EntradaDeAsset[] =>
  MANIFESTO_DE_ASSETS.filter((entrada) => entrada.categoria === categoria);

export const assetsPorCamada = (camada: CamadaVisual): readonly EntradaDeAsset[] =>
  MANIFESTO_DE_ASSETS.filter((entrada) => entrada.camada === camada);

/**
 * O módulo Ação + Resposta é montado em código, não por uma imagem composta:
 * o slot de Ação em cima e o slot de Resposta menor logo abaixo, repetido três
 * vezes (docs/ASSET_CATALOG.md §3).
 */
export const MODULO_ACAO_RESPOSTA = {
  acao: 'slot-acao',
  resposta: 'slot-resposta',
  repeticoes: 3,
} as const;

/**
 * Ordem visual dos dez ícones universais. Se no handoff eles vierem como uma
 * única faixa, ela pode entrar temporariamente como sprite atlas usando esta
 * ordem, e depois ser trocada pelas versões individuais sem mudar os ids.
 */
export const ORDEM_DO_ATLAS_DE_ICONES = [
  'icone-vida',
  'icone-guarda',
  'icone-pontos-de-acao',
  'icone-reserva',
  'icone-dano',
  'icone-impacto',
  'icone-cooldown',
  'icone-ruptura',
  'icone-ativar',
  'icone-exaurir',
] as const;
