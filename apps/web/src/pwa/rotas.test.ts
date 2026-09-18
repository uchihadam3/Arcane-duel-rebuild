import { describe, expect, it } from 'vitest';

import { CAMINHOS_SO_DE_REDE, comoRegex, excecoesDaNavegacao, rotaDosAssets } from './rotas.js';

/*
 * As rotas do service worker.
 *
 * O que estes testes protegem não é a sintaxe: é a semântica do Workbox. Ele
 * testa `urlPattern` contra a URL **inteira** e só aceita um casamento de
 * outra origem quando ele começa na posição zero. Uma âncora `^` aqui pareceria
 * mais rigorosa e não casaria com nada, porque todo href começa com o esquema.
 */

const PAGES = '/Arcane-duel-rebuild/';
const ORIGEM = 'https://uchihadam3.github.io';

describe('rota dos assets', () => {
  it('casa com um asset servido sob o prefixo do Pages', () => {
    const rota = rotaDosAssets(PAGES);
    expect(rota.test(`${ORIGEM}${PAGES}assets/cards/frames/card_frame_attack_red.png`)).toBe(true);
  });

  it('casa com um asset no desenvolvimento local, servido da raiz', () => {
    const rota = rotaDosAssets('/');
    expect(rota.test('http://localhost:5173/assets/hud/hud_health_bar_red.png')).toBe(true);
  });

  it('não casa com o documento nem com os bundles do aplicativo', () => {
    const rota = rotaDosAssets(PAGES);
    expect(rota.test(`${ORIGEM}${PAGES}`)).toBe(false);
    // Os bundles vão para `app/` justamente para não se misturarem a `assets/`.
    expect(rota.test(`${ORIGEM}${PAGES}app/index-abc123.js`)).toBe(false);
  });

  it('não casa com API, autenticação nem socket', () => {
    const rota = rotaDosAssets(PAGES);
    for (const caminho of CAMINHOS_SO_DE_REDE) {
      expect(rota.test(`${ORIGEM}${caminho}partida`)).toBe(false);
    }
  });

  it('não é ancorada, porque o Workbox testa o href inteiro', () => {
    // Com `^` ela não casaria com nada: todo href começa com "https:".
    expect(rotaDosAssets(PAGES).source.startsWith('^')).toBe(false);
  });

  it('um asset de outra origem só casaria fora da posição zero', () => {
    /*
     * É essa a regra que dispensa a âncora: o Workbox recusa um casamento de
     * outra origem que não comece no início do href, e nenhum href de
     * terceiro começa pelo nosso prefixo.
     */
    const rota = rotaDosAssets(PAGES);
    const alheio = `https://exemplo.invalido${PAGES}assets/x.png`;
    expect(rota.test(alheio)).toBe(true);
    expect(rota.exec(alheio)?.index).toBeGreaterThan(0);
  });

  it('escapa o prefixo em vez de confiar nele como padrão', () => {
    expect(comoRegex('/a.b+c/')).toBe('/a\\.b\\+c/');
    expect(rotaDosAssets('/a.b/').test('https://x.test/aXb/assets/y.png')).toBe(false);
  });
});

describe('exceções da navegação', () => {
  it('são ancoradas, porque são testadas contra o caminho', () => {
    for (const excecao of excecoesDaNavegacao(PAGES)) {
      expect(excecao.source.startsWith('^')).toBe(true);
    }
  });

  it('tiram os assets e os caminhos de rede do fallback de documento', () => {
    const excecoes = excecoesDaNavegacao(PAGES);
    const negada = (caminho: string): boolean => excecoes.some((excecao) => excecao.test(caminho));

    expect(negada(`${PAGES}assets/board/slots/board_action_slot.png`)).toBe(true);
    for (const caminho of CAMINHOS_SO_DE_REDE) expect(negada(`${caminho}x`)).toBe(true);
    // O documento e as rotas do próprio aplicativo continuam caindo no index.
    expect(negada(PAGES)).toBe(false);
  });
});
