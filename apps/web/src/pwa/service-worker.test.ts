import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/*
 * Guardas da configuração do service worker.
 *
 * Um erro aqui só apareceria depois do deploy, com o aplicativo instalado
 * preso em uma build velha — exatamente o problema que esta configuração
 * existe para resolver. Por isso ela é verificada como código.
 */
const config = readFileSync(
  fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
  'utf8',
);

describe('configuração do service worker', () => {
  it('mantém o worker novo em espera até o coordenador mandar trocar', () => {
    // 'prompt' + skipWaiting falso é o par que deixa a decisão com a política,
    // em vez de recarregar sempre, sem passar por ela.
    expect(config).toContain("registerType: 'prompt'");
    expect(config).toContain('skipWaiting: false');
  });

  it('faz o worker recém-ativado assumir as páginas já abertas', () => {
    expect(config).toContain('clientsClaim: true');
  });

  it('apaga o precache das versões anteriores', () => {
    expect(config).toContain('cleanupOutdatedCaches: true');
  });

  it('mantém NetworkOnly para API, autenticação e socket', () => {
    expect(config).toContain("handler: 'NetworkOnly'");
    expect(config).toContain("url.pathname.startsWith('/api/')");
    expect(config).toContain("url.pathname.startsWith('/auth/')");
    expect(config).toContain("url.pathname.startsWith('/socket')");
  });

  it('mantém o cache dos assets aprovados', () => {
    expect(config).toContain("handler: 'StaleWhileRevalidate'");
    expect(config).toContain("cacheName: 'arcane-duel-assets'");
  });

  it('mantém o prefixo de publicação vindo de BASE_PATH', () => {
    expect(config).toContain('process.env.BASE_PATH');
  });

  it('injeta commit e identificador de build no cliente', () => {
    expect(config).toContain('__COMMIT_DO_CLIENTE__');
    expect(config).toContain('__BUILD_DO_CLIENTE__');
  });

  it('deriva o identificador de build do workflow, sem carimbo de tempo', () => {
    expect(config).toContain('GITHUB_RUN_NUMBER');
    expect(config).not.toContain('Date.now()');
    expect(config).not.toContain('new Date(');
  });
});
