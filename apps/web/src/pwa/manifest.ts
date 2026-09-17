/**
 * Web App Manifest do cliente.
 *
 * Fica separado da configuração do Vite para poder ser verificado por teste:
 * um erro aqui só apareceria depois da publicação, quando o celular se
 * recusasse a instalar o jogo.
 */
export interface IconeDoManifesto {
  readonly src: string;
  readonly sizes: string;
  readonly type: string;
  readonly purpose?: 'any' | 'maskable' | 'monochrome';
}

export interface ManifestoDaAplicacao {
  readonly name: string;
  readonly short_name: string;
  readonly description: string;
  readonly lang: string;
  readonly display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  readonly orientation: 'landscape' | 'portrait' | 'any';
  readonly start_url: string;
  readonly scope: string;
  readonly background_color: string;
  readonly theme_color: string;
  readonly categories: readonly string[];
  readonly icons: readonly IconeDoManifesto[];
}

/**
 * Normaliza o prefixo de publicação: sempre começa e termina com barra.
 *
 * Na Vercel o cliente é servido na raiz; no GitHub Pages ele fica em
 * `/Arcane-duel-rebuild/`. `start_url` e `scope` precisam seguir o prefixo,
 * senão o navegador se recusa a instalar ou instala apontando para o lugar
 * errado.
 */
export const normalizarBase = (base: string): string => {
  const comInicio = base.startsWith('/') ? base : `/${base}`;
  return comInicio.endsWith('/') ? comInicio : `${comInicio}/`;
};

export const criarManifesto = (base = '/'): ManifestoDaAplicacao => {
  const prefixo = normalizarBase(base);
  return {
    name: 'Arcane Duel',
    short_name: 'Arcane Duel',
    description: 'Card battler de classes um contra um.',
    lang: 'pt-BR',
    display: 'standalone',
    orientation: 'landscape',
    start_url: prefixo,
    scope: prefixo,
    background_color: '#0b0d13',
    theme_color: '#0b0d13',
    categories: ['games'],
    // Caminhos relativos: o navegador os resolve a partir da URL do próprio
    // manifesto, então eles acompanham o prefixo sozinhos.
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
};

/** Manifesto servido na raiz do domínio. */
export const MANIFESTO = criarManifesto('/');
