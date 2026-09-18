import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CAMINHOS_SO_DE_REDE } from './rotas.js';

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
  it('deixa a decisão de recarregar com o coordenador, e não com o plugin', () => {
    // 'autoUpdate' recarregaria sempre, sem passar pela política — inclusive
    // no meio de uma partida.
    expect(config).toContain("registerType: 'prompt'");
  });

  it('ativa o worker novo sem depender do cliente antigo cooperar', () => {
    /*
     * Com `skipWaiting: false`, um cliente instalado antes de o coordenador
     * existir nunca mandava a mensagem que tira o worker novo da espera, e o
     * aplicativo ficava preso na build antiga para sempre. Ativar sozinho não
     * recarrega ninguém: quem recarrega continua sendo o coordenador.
     */
    expect(config).toContain('skipWaiting: true');
    expect(config).not.toContain('skipWaiting: false');
  });

  it('faz o worker recém-ativado assumir as páginas já abertas', () => {
    expect(config).toContain('clientsClaim: true');
  });

  it('apaga o precache das versões anteriores', () => {
    expect(config).toContain('cleanupOutdatedCaches: true');
  });

  it('mantém NetworkOnly para API, autenticação e socket', () => {
    expect(config).toContain("handler: 'NetworkOnly'");
    for (const caminho of CAMINHOS_SO_DE_REDE) {
      expect(config).toContain(`url.pathname.startsWith('${caminho}')`);
    }
  });

  it('mantém o cache dos assets aprovados', () => {
    expect(config).toContain("handler: 'StaleWhileRevalidate'");
    expect(config).toContain("cacheName: 'arcane-duel-assets'");
  });

  /*
   * A guarda do defeito que foi ao ar.
   *
   * O Workbox serializa `urlPattern` quando ele é função, e serializa só o
   * corpo: o fechamento léxico fica para trás. Uma função que lia `base` daqui
   * chegou ao `sw.js` publicado com o identificador livre, lançando
   * ReferenceError em todo pedido que chegasse à rota.
   *
   * Esta é a guarda barata, que roda em `npm test`. A cara — que constrói o
   * artefato e **executa** cada rota dele — é `npm run verify:sw`.
   */
  it('não passa função nenhuma que dependa do prefixo de publicação', () => {
    expect(config).not.toMatch(/urlPattern:\s*\(\{ url \}\)[^\n]*\$\{base\}/);
    expect(config).not.toMatch(/urlPattern:[^\n]*`[^`]*\$\{base\}/);
  });

  it('constrói a rota dos assets como expressão regular, com o valor embutido', () => {
    expect(config).toContain('urlPattern: rotaDosAssets(base)');
  });

  it('monta as exceções da navegação a partir do mesmo módulo', () => {
    expect(config).toContain('excecoesDaNavegacao(base)');
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
