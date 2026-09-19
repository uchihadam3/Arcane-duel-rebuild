import { describe, expect, it } from 'vitest';

import type { Caixa, NomeDaZona } from './zonas.js';
import {
  PARES_PROIBIDOS,
  VIEWPORTS_ALVO,
  VIEWPORT_DE_CALIBRACAO,
  colisoesProibidas,
  ehDeitado,
  seCruzam,
  zonasDaTela,
} from './zonas.js';

/*
 * O teste de colisão de UI.
 *
 * Ele é o motivo de este módulo existir. A revisão reprovou a composição
 * anterior por misturar HUD, campo e mão, e pediu que a correção fosse
 * estrutural. "Estrutural" quer dizer que a regra **falha o build** quando
 * alguém a quebra, e não que ela está escrita num comentário.
 */

describe('nenhuma zona invade outra, em nenhum viewport alvo', () => {
  it('não há colisão proibida em 720×360, 800×360, 844×390, 915×412, 1280×720 e 1560×720', () => {
    const colisoes = colisoesProibidas().map(
      (c) =>
        `${String(c.viewport.largura)}×${String(c.viewport.altura)}: ${c.a} × ${c.b} — ${c.porque}`,
    );
    expect(colisoes).toEqual([]);
  });

  it('cobre exatamente os seis viewports da tarefa', () => {
    expect(VIEWPORTS_ALVO.map((v) => `${String(v.largura)}×${String(v.altura)}`).sort()).toEqual([
      '1280×720',
      '1560×720',
      '720×360',
      '800×360',
      '844×390',
      '915×412',
    ]);
  });

  /*
   * O teste precisa ser capaz de falhar.
   *
   * Um teste de colisão que nunca acusa nada é indistinguível de um teste
   * quebrado. Este confere que a conferência **acusa** quando há sobreposição
   * de verdade, usando um caso montado à mão.
   */
  it('a conferência acusa quando dois retângulos realmente se cruzam', () => {
    expect(
      seCruzam({ x: 0, y: 0, largura: 10, altura: 10 }, { x: 9, y: 9, largura: 5, altura: 5 }),
    ).toBe(true);
    expect(
      seCruzam({ x: 0, y: 0, largura: 10, altura: 10 }, { x: 10, y: 0, largura: 5, altura: 5 }),
    ).toBe(false);
  });

  it('a lista de pares proibidos cobre as três regras da tarefa', () => {
    const pares = PARES_PROIBIDOS.map((p) => [p.a, p.b].sort().join('|'));
    // HUD não tapa a mão, HUD não tapa o campo, campo não tapa a mão.
    expect(pares).toContain(['hudDoJogador', 'maoDoJogador'].sort().join('|'));
    expect(pares).toContain(['hudDoJogador', 'arena'].sort().join('|'));
    expect(pares).toContain(['arena', 'maoDoJogador'].sort().join('|'));
    expect(pares).toContain(['controlesDeTurno', 'maoDoJogador'].sort().join('|'));
  });
});

/** As seis zonas de um viewport, com o nome de cada uma. */
const cadaZona = (viewport: {
  readonly largura: number;
  readonly altura: number;
}): readonly (readonly [NomeDaZona, Caixa])[] => {
  const zonas = zonasDaTela(viewport);
  return (Object.keys(zonas) as NomeDaZona[]).map((nome) => [nome, zonas[nome]] as const);
};

describe('a composição sobrevive à mudança de tela', () => {
  it('toda zona tem área positiva em todo viewport alvo', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      for (const [nome, caixa] of cadaZona(viewport)) {
        const rotulo = `${String(viewport.largura)}×${String(viewport.altura)} ${nome}`;
        expect(caixa.largura, rotulo).toBeGreaterThan(0);
        expect(caixa.altura, rotulo).toBeGreaterThan(0);
      }
    }
  });

  it('toda zona cabe dentro da tela', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      for (const [nome, caixa] of cadaZona(viewport)) {
        const rotulo = `${String(viewport.largura)}×${String(viewport.altura)} ${nome}`;
        expect(caixa.x, rotulo).toBeGreaterThanOrEqual(0);
        expect(caixa.y, rotulo).toBeGreaterThanOrEqual(0);
        expect(caixa.x + caixa.largura, rotulo).toBeLessThanOrEqual(viewport.largura);
        // A mão é a única que pode passar da borda de baixo, e passa de propósito.
        if (nome !== 'maoDoJogador') {
          expect(caixa.y + caixa.altura, rotulo).toBeLessThanOrEqual(viewport.altura);
        }
      }
    }
  });

  /*
   * A mão precisa de largura para oito cartas legíveis.
   *
   * Sem um piso aqui, apertar as colunas de apoio para resolver uma colisão
   * resolveria o teste e estragaria a mão — que é justamente o que a revisão
   * mandou não fazer.
   */
  it('sobra largura de mão para oito cartas em todo viewport alvo', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zonas = zonasDaTela(viewport);
      const rotulo = `${String(viewport.largura)}×${String(viewport.altura)}`;
      expect(zonas.maoDoJogador.largura, rotulo).toBeGreaterThanOrEqual(viewport.largura * 0.33);
    }
  });

  it('a arena fica entre as duas faixas, e ocupa a maior parte da altura', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zonas = zonasDaTela(viewport);
      const rotulo = `${String(viewport.largura)}×${String(viewport.altura)}`;
      expect(zonas.arena.y, rotulo).toBeGreaterThan(zonas.hudDaMaquina.y);
      expect(zonas.arena.y + zonas.arena.altura, rotulo).toBeLessThanOrEqual(zonas.maoDoJogador.y);
      expect(zonas.arena.altura / viewport.altura, rotulo).toBeGreaterThan(0.4);
    }
  });
});

describe('orientação', () => {
  it('o viewport de calibração é 915×412 e é deitado', () => {
    expect(VIEWPORT_DE_CALIBRACAO).toEqual({ largura: 915, altura: 412 });
    expect(ehDeitado(VIEWPORT_DE_CALIBRACAO)).toBe(true);
  });

  it('retrato não é considerado deitado: a tela vai pedir para girar', () => {
    expect(ehDeitado({ largura: 412, altura: 915 })).toBe(false);
    expect(ehDeitado({ largura: 768, altura: 1024 })).toBe(false);
  });

  it('todo viewport alvo é deitado', () => {
    for (const viewport of VIEWPORTS_ALVO) expect(ehDeitado(viewport)).toBe(true);
  });
});
