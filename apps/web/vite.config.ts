import { createRequire } from 'node:module';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * A pasta `public/assets` é um espelho gerado de `/assets` na raiz do
 * repositório (veja `scripts/sync-assets.mjs`). A fonte de verdade dos PNGs
 * aprovados continua sendo uma só.
 */
const { version } = createRequire(import.meta.url)('./package.json') as { version: string };

export default defineConfig({
  define: {
    __VERSAO_DO_CLIENTE__: JSON.stringify(version),
  },
  server: { host: true, port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Os bundles ficam em `app/` para não se misturarem com `assets/`, que é o
    // espelho dos PNGs aprovados.
    assetsDir: 'app',
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' em vez de atualização automática: nunca recarregar o cliente
      // no meio de uma partida sem o jogador mandar.
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
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
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // O shell da aplicação é pré-cacheado. Os PNGs aprovados são grandes e
        // ficam em cache sob demanda, para a primeira instalação não baixar
        // dezenas de megabytes de uma vez.
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        navigateFallbackDenylist: [/^\/assets\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'arcane-duel-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
