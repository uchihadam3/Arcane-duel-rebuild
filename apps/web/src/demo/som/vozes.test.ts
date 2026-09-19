import { describe, expect, it } from 'vitest';

import { EVENTOS_DA_DEMO, agendaDasVozes } from './vozes.js';

/*
 * As vozes de um lote, conferidas pelo espaçamento.
 *
 * O log do motor chega inteiro num quadro: um lance com Ruptura, Dano e
 * quebra de Guarda produz três vozes no mesmo instante. Tocadas juntas, elas
 * viram um estouro só e nenhuma das três informações chega. O que se prova
 * aqui é que elas saem **em fila**, e que a primeira espera o beat que a
 * apresentação reservou.
 */

describe('as vozes de um lote não se empilham', () => {
  it('cada voz sai depois da anterior, e nunca no mesmo instante', () => {
    const agenda = agendaDasVozes(['metal', 'impacto-pesado', 'detrito'], {
      aPartirDeMs: null,
      passoMs: 210,
      agoraMs: 1000,
    });
    expect(agenda.map((item) => item.atrasoMs)).toEqual([0, 210, 420]);
  });

  it('a primeira espera o beat reservado pela fila', () => {
    const agenda = agendaDasVozes(['metal', 'detrito'], {
      aPartirDeMs: 2600,
      passoMs: 210,
      agoraMs: 1000,
    });
    expect(agenda[0]?.atrasoMs).toBe(1600);
    expect(agenda[1]?.atrasoMs).toBe(1810);
  });

  it('um beat já passado não atrasa nada: o som não fica devendo', () => {
    const agenda = agendaDasVozes(['metal'], {
      aPartirDeMs: 500,
      passoMs: 210,
      agoraMs: 1000,
    });
    expect(agenda[0]?.atrasoMs).toBe(0);
  });

  it('um lote sem vozes não agenda nada', () => {
    expect(agendaDasVozes([], { aPartirDeMs: 100, passoMs: 210, agoraMs: 0 })).toEqual([]);
  });

  it('o vocabulário de vozes continua completo', () => {
    expect(EVENTOS_DA_DEMO.length).toBeGreaterThan(0);
  });
});
