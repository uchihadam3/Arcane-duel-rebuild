import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (relativePath: string): string =>
  fileURLToPath(new URL(relativePath, import.meta.url));

/**
 * Testes rodam a partir do código-fonte dos pacotes (não do `dist`), para que
 * `npm test` funcione sem um build prévio. Arquivos que precisam de DOM
 * declaram `// @vitest-environment jsdom` no topo do próprio arquivo.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@arcane-duel/shared-types': fromRoot('./packages/shared-types/src/index.ts'),
      '@arcane-duel/rules-engine': fromRoot('./packages/rules-engine/src/index.ts'),
      '@arcane-duel/card-data': fromRoot('./packages/card-data/src/index.ts'),
      // O caminho direto existe para o cliente ler as Receitas sem arrastar o
      // registro de efeitos inteiro para dentro do bundle.
      '@arcane-duel/gameplay/receitas': fromRoot('./packages/gameplay/src/receitas.ts'),
      // A superfície da batalha, sem o simulador junto.
      '@arcane-duel/gameplay/jogo': fromRoot('./packages/gameplay/src/jogo.ts'),
      '@arcane-duel/gameplay': fromRoot('./packages/gameplay/src/index.ts'),
      '@arcane-duel/ai': fromRoot('./packages/ai/src/index.ts'),
      '@arcane-duel/audio': fromRoot('./packages/audio/src/index.ts'),
      '@arcane-duel/vfx': fromRoot('./packages/vfx/src/index.ts'),
      '@arcane-duel/ui': fromRoot('./packages/ui/src/index.ts'),
      'virtual:pwa-register/react': fromRoot('./apps/web/src/test/pwa-register-stub.ts'),
    },
  },
  define: {
    __VERSAO_DO_CLIENTE__: JSON.stringify('0.1.0-test'),
    __COMMIT_DO_CLIENTE__: JSON.stringify('0000000000000000000000000000000000000000'),
    __BUILD_DO_CLIENTE__: JSON.stringify('teste'),
  },
  test: {
    environment: 'node',
    setupFiles: [fromRoot('./vitest.setup.ts')],
    include: ['packages/*/src/**/*.test.{ts,tsx}', 'apps/*/src/**/*.test.{ts,tsx}'],
    globals: false,
    restoreMocks: true,
  },
});
