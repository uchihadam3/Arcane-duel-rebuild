import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { criarManifesto, normalizarBase } from './src/pwa/manifest';

/**
 * A pasta `public/assets` é um espelho gerado de `/assets` na raiz do
 * repositório (veja `scripts/sync-assets.mjs`). A fonte de verdade dos PNGs
 * aprovados continua sendo uma só.
 */
const { version } = createRequire(import.meta.url)('./package.json') as { version: string };

/**
 * Prefixo de publicação. Na Vercel o cliente é servido na raiz; no GitHub
 * Pages ele fica sob o nome do repositório, informado por `BASE_PATH`.
 */
const base = normalizarBase(process.env.BASE_PATH ?? '/');

/**
 * Commit que originou este build. Nos serviços de publicação vem da variável
 * de ambiente; no desenvolvimento local vem do próprio git. Serve para
 * conferir, olhando a página publicada, se ela corresponde à `main`.
 */
const descobrirCommit = (): string => {
  const doServico = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (doServico !== undefined && doServico !== '') return doServico;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'desconhecido';
  }
};

const comoRegex = (valor: string): string => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default defineConfig({
  base,
  define: {
    __VERSAO_DO_CLIENTE__: JSON.stringify(version),
    __COMMIT_DO_CLIENTE__: JSON.stringify(descobrirCommit()),
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
      manifest: (() => {
        const manifesto = criarManifesto(base);
        return {
          ...manifesto,
          categories: [...manifesto.categories],
          icons: [...manifesto.icons],
        };
      })(),
      workbox: {
        // O shell da aplicação é pré-cacheado. Os PNGs aprovados são grandes e
        // ficam em cache sob demanda, para a primeira instalação não baixar
        // dezenas de megabytes de uma vez.
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        // Nada que não seja navegação pode cair no index.html, e nada
        // autenticado ou de partida pode ser servido do cache de navegação.
        navigateFallbackDenylist: [
          new RegExp(`^${comoRegex(base)}assets/`),
          /^\/api\//,
          /^\/auth\//,
          /^\/socket/,
        ],
        runtimeCaching: [
          {
            // Rede e só rede: sessão, partida, matchmaking e dados privados
            // nunca viram conteúdo estático.
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/') ||
              url.pathname.startsWith('/auth/') ||
              url.pathname.startsWith('/socket'),
            handler: 'NetworkOnly',
          },
          {
            // Os PNGs aprovados aparecem na hora, vindos do cache, e a versão
            // nova é buscada em segundo plano — trocar um asset não exige
            // esperar a expiração do cache.
            urlPattern: ({ url }) => url.pathname.startsWith(`${base}assets/`),
            handler: 'StaleWhileRevalidate',
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
