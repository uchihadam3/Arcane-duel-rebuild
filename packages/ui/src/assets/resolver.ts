import { MANIFESTO_DE_ASSETS, obterAsset } from './manifest.js';
import { gerarPlaceholder } from './placeholder.js';

/**
 * Resolve o id semântico de um asset para uma URL carregável.
 *
 * A camada de UI nunca escreve caminho de arquivo à mão: ela pede o asset pelo
 * id e o resolver decide de onde ele vem. Isso permite trocar o arquivo, mudar
 * a base de publicação ou servir de uma CDN sem tocar em componente nenhum.
 */
export interface ResolvedorDeAssets {
  readonly url: (id: string) => string;
  readonly placeholder: (id: string) => string;
}

export interface OpcoesDoResolvedor {
  /** Prefixo de publicação. Em uma PWA servida de subdiretório, vem do bundler. */
  readonly base?: string;
}

/**
 * Resolve para os arquivos estáticos servidos em `<base>assets/...`, espelhados
 * a partir da pasta `/assets` na raiz do repositório por `npm run assets:sync`.
 */
export const criarResolvedorEstatico = (opcoes: OpcoesDoResolvedor = {}): ResolvedorDeAssets => {
  const base = normalizarBase(opcoes.base ?? '/');

  return {
    url: (id) => {
      const entrada = obterAsset(id);
      if (entrada === undefined) {
        return gerarPlaceholder(id, 'ASSET DESCONHECIDO');
      }
      return `${base}assets/${entrada.caminho}`;
    },
    placeholder: (id) => gerarPlaceholder(id),
  };
};

const normalizarBase = (base: string): string => (base.endsWith('/') ? base : `${base}/`);

/** Ids declarados no manifesto, úteis para verificações e para telas de diagnóstico. */
export const IDS_DE_ASSETS: readonly string[] = MANIFESTO_DE_ASSETS.map((entrada) => entrada.id);
