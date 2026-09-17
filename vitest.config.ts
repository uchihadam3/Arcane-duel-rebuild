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
      '@arcane-duel/ai': fromRoot('./packages/ai/src/index.ts'),
      '@arcane-duel/audio': fromRoot('./packages/audio/src/index.ts'),
      '@arcane-duel/vfx': fromRoot('./packages/vfx/src/index.ts'),
      '@arcane-duel/ui': fromRoot('./packages/ui/src/index.ts'),
      'virtual:pwa-register/react': fromRoot('./apps/web/src/test/pwa-register-stub.ts'),
    },
  },
  define: {
    __VERSAO_DO_CLIENTE__: JSON.stringify('0.1.0-test'),
  },
  test: {
    environment: 'node',
    setupFiles: [fromRoot('./vitest.setup.ts')],
    include: ['packages/*/src/**/*.test.{ts,tsx}', 'apps/*/src/**/*.test.{ts,tsx}'],
    globals: false,
    restoreMocks: true,
  },
});
