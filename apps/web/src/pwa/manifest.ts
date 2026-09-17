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

export const MANIFESTO: ManifestoDaAplicacao = {
  name: 'Arcane Duel',
  short_name: 'Arcane Duel',
  description: 'Card battler de classes um contra um.',
  lang: 'pt-BR',
  display: 'standalone',
  orientation: 'landscape',
  start_url: '/',
  scope: '/',
  background_color: '#0b0d13',
  theme_color: '#0b0d13',
  categories: ['games'],
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
