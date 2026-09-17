import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

interface ConfiguracaoDaVercel {
  readonly buildCommand: string;
  readonly outputDirectory: string;
  readonly rewrites: readonly { readonly source: string; readonly destination: string }[];
  readonly headers: readonly {
    readonly source: string;
    readonly headers: readonly { readonly key: string; readonly value: string }[];
  }[];
}

const configuracao = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../vercel.json', import.meta.url)), 'utf8'),
) as ConfiguracaoDaVercel;

const regraDeFallback = configuracao.rewrites[0];
const fallback = new RegExp(`^${regraDeFallback?.source ?? ''}$`);

describe('configuração de publicação', () => {
  it('constrói a partir da raiz do monorepo e publica apps/web/dist', () => {
    expect(configuracao.buildCommand).toBe('npm run build');
    expect(configuracao.outputDirectory).toBe('apps/web/dist');
  });

  it('manda as rotas do cliente para o index.html', () => {
    for (const rota of ['/login', '/builds', '/match', '/profile', '/builds/guerreiro/1']) {
      expect(fallback.test(rota), `${rota} deveria cair no index.html`).toBe(true);
    }
    expect(regraDeFallback?.destination).toBe('/index.html');
  });

  it('não devolve index.html no lugar de um asset que falta', () => {
    for (const caminho of [
      '/assets/cards/frames/card_frame_attack_red.png',
      '/assets/board/slots/board_passive_slot_purple.png',
      '/assets/icons/icon_health.png',
    ]) {
      expect(fallback.test(caminho), `${caminho} não pode cair no index.html`).toBe(false);
    }
  });

  it('não engole os arquivos da própria PWA', () => {
    for (const caminho of [
      '/sw.js',
      '/registerSW.js',
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/app/index-abc123.js',
      '/workbox-35e397ac.js',
    ]) {
      expect(fallback.test(caminho), `${caminho} não pode cair no index.html`).toBe(false);
    }
  });

  it('serve o service worker sempre revalidado, para a atualização chegar', () => {
    const regra = configuracao.headers.find((item) => item.source === '/sw.js');
    const cache = regra?.headers.find((cabecalho) => cabecalho.key === 'Cache-Control');
    expect(cache?.value).toContain('max-age=0');
    expect(cache?.value).toContain('must-revalidate');
  });

  it('serve o manifesto com o content-type que o navegador espera', () => {
    const regra = configuracao.headers.find((item) => item.source === '/manifest.webmanifest');
    const tipo = regra?.headers.find((cabecalho) => cabecalho.key === 'Content-Type');
    expect(tipo?.value).toContain('application/manifest+json');
  });

  it('deixa os bundles com hash em cache longo', () => {
    const regra = configuracao.headers.find((item) => item.source === '/app/(.*)');
    const cache = regra?.headers.find((cabecalho) => cabecalho.key === 'Cache-Control');
    expect(cache?.value).toContain('immutable');
  });
});
