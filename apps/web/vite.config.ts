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
 * Prefixo de publicação. No GitHub Pages o cliente fica sob o nome do
 * repositório, informado pelo workflow em `BASE_PATH`. Sem a variável, o
 * build sai servido na raiz — que é o caso do desenvolvimento local.
 */
const base = normalizarBase(process.env.BASE_PATH ?? '/');

/**
 * Commit que originou este build. No GitHub Actions vem de `GITHUB_SHA`; no
 * desenvolvimento local vem do próprio git. Serve para conferir, olhando a
 * página publicada, se ela corresponde à `main`.
 */
const descobrirCommit = (): string => {
  const doWorkflow = process.env.GITHUB_SHA;
  if (doWorkflow !== undefined && doWorkflow !== '') return doWorkflow;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'desconhecido';
  }
};

/**
 * Identificador determinístico deste build.
 *
 * No GitHub Actions é o número da execução do workflow, que sobe a cada
 * publicação e é fácil de comparar de cabeça. Fora dele, o commit curto.
 * Nada de carimbo de tempo: dois builds do mesmo commit precisam ter o mesmo
 * identificador, senão ele deixa de servir para conferir o que está no ar.
 */
const descobrirBuild = (commit: string): string => {
  const execucao = process.env.GITHUB_RUN_NUMBER;
  if (execucao !== undefined && execucao !== '') return `actions-${execucao}`;
  return commit === 'desconhecido' ? 'local' : `local-${commit.slice(0, 7)}`;
};

const comoRegex = (valor: string): string => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const commit = descobrirCommit();

export default defineConfig({
  base,
  define: {
    __VERSAO_DO_CLIENTE__: JSON.stringify(version),
    __COMMIT_DO_CLIENTE__: JSON.stringify(commit),
    __BUILD_DO_CLIENTE__: JSON.stringify(descobrirBuild(commit)),
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
      /*
       * 'prompt' deixa a decisão de **recarregar** com o coordenador em
       * `src/pwa/atualizacao.ts`, e não com o plugin: 'autoUpdate' recarrega
       * sempre, sem passar por política nenhuma, e não deixaria como adiar a
       * troca durante uma partida.
       *
       * Recarregar é decisão nossa. **Ativar** não pode ser — veja
       * `skipWaiting` abaixo.
       */
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
        /*
         * A troca de versão, do lado do worker.
         *
         * `skipWaiting: true` conserta um impasse real, visto em campo: um
         * cliente instalado antes de o coordenador existir **nunca** manda a
         * mensagem que tira o worker novo da espera. O navegador baixava a
         * versão nova a cada abertura, o worker novo ficava esperando para
         * sempre, e o aplicativo continuou servindo o primeiro deploy por dias.
         *
         * Ativar sozinho não recarrega ninguém: a página aberta continua com o
         * JavaScript que já carregou, e quem decide recarregar continua sendo o
         * coordenador — que não recarrega durante uma partida. O que muda é que
         * a ativação deixa de depender de o cliente antigo cooperar.
         *
         * `clientsClaim: true` faz o worker recém-ativado assumir as páginas já
         * abertas em vez de esperar a próxima navegação — é isso que impede o
         * cliente de continuar servido pelo worker antigo depois da troca.
         *
         * `cleanupOutdatedCaches: true` apaga os precaches das versões
         * anteriores. Sem ele, shell e bundles velhos ficariam ocupando espaço
         * e podendo ressuscitar em uma navegação offline.
         */
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
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
