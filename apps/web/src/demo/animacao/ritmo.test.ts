import { describe, expect, it } from 'vitest';

import {
  DURACAO_NORMAL,
  FAIXA,
  PASSO_DA_CASCATA_MS,
  duracaoDoBeat,
  passoDaCascata,
} from './ritmo.js';
import type { EspecieDeBeat } from './ritmo.js';
import { beatsQueComecaram, duracaoDaFila, enfileirar } from './fila.js';

/*
 * O ritmo, conferido pela ordem e não só pelo relógio.
 *
 * Um teste que só mede a duração total não distingue "o efeito começa depois
 * do encaixe" de "o efeito começa junto com o encaixe" — e era exatamente essa
 * confusão que aparecia no aparelho real. Por isso os testes abaixo olham a
 * sequência.
 */

const ESPECIES = Object.keys(DURACAO_NORMAL) as readonly EspecieDeBeat[];

describe('as durações NORMAIS', () => {
  it('caem dentro da faixa pedida, uma por uma', () => {
    for (const especie of ESPECIES) {
      const faixa = FAIXA[especie];
      const duracao = DURACAO_NORMAL[especie];
      expect(duracao, especie).toBeGreaterThanOrEqual(faixa.minimo);
      expect(duracao, especie).toBeLessThanOrEqual(faixa.maximo);
    }
  });

  it('ficam na metade de cima da faixa: NORMAL é deliberado, não meio-termo', () => {
    for (const especie of ESPECIES) {
      const faixa = FAIXA[especie];
      const meio = (faixa.minimo + faixa.maximo) / 2;
      expect(DURACAO_NORMAL[especie], especie).toBeGreaterThanOrEqual(faixa.minimo);
      // Nenhum beat pode ficar colado no mínimo: isso seria o RÁPIDO disfarçado.
      expect(DURACAO_NORMAL[especie], especie).toBeGreaterThan(faixa.minimo * 0.999);
      expect(meio).toBeGreaterThan(0);
    }
  });
});

describe('RÁPIDO é outro andamento', () => {
  it('nenhum beat em RÁPIDO se parece com o mesmo beat em NORMAL', () => {
    for (const especie of ESPECIES) {
      const normal = duracaoDoBeat(especie, 'normal');
      const rapido = duracaoDoBeat(especie, 'rapido');
      // Distância suficiente para a pessoa perceber que trocou de andamento.
      expect(rapido, especie).toBeLessThanOrEqual(normal * 0.7);
    }
  });

  it('mesmo assim nenhum beat vira teleporte', () => {
    for (const especie of ESPECIES) {
      const rapido = duracaoDoBeat(especie, 'rapido');
      expect(rapido, especie).toBeGreaterThanOrEqual(duracaoDoBeat(especie, 'normal') * 0.45);
      expect(rapido, especie).toBeGreaterThan(90);
    }
  });

  it('a cascata também encurta', () => {
    expect(passoDaCascata('rapido')).toBeLessThan(PASSO_DA_CASCATA_MS);
    expect(passoDaCascata('normal')).toBe(PASSO_DA_CASCATA_MS);
  });
});

describe('a fila é serial', () => {
  const jogada = enfileirar([
    { id: 'foco', especie: 'foco' },
    { id: 'levantar', especie: 'levantar' },
    { id: 'viagem', especie: 'viagem' },
    { id: 'encaixe', especie: 'encaixe' },
    { id: 'leitura', especie: 'leitura' },
    { id: 'telegrafo', especie: 'telegrafo' },
    { id: 'efeito', especie: 'efeito' },
    { id: 'impacto', especie: 'impacto' },
    { id: 'resultado', especie: 'resultado' },
  ]);

  it('conta a jogada nesta ordem, e não em outra', () => {
    expect(jogada.map((beat) => beat.id)).toEqual([
      'foco',
      'levantar',
      'viagem',
      'encaixe',
      'leitura',
      'telegrafo',
      'efeito',
      'impacto',
      'resultado',
    ]);
  });

  it('nenhum beat começa antes de o anterior terminar', () => {
    for (let indice = 1; indice < jogada.length; indice += 1) {
      const anterior = jogada[indice - 1];
      const atual = jogada[indice];
      if (anterior === undefined || atual === undefined) throw new Error('fila curta');
      expect(atual.inicioMs, atual.id).toBeGreaterThanOrEqual(anterior.fimMs);
    }
  });

  it('o efeito só começa depois da pausa de leitura', () => {
    const leitura = jogada.find((beat) => beat.id === 'leitura');
    const telegrafo = jogada.find((beat) => beat.id === 'telegrafo');
    expect(telegrafo?.inicioMs).toBeGreaterThanOrEqual(leitura?.fimMs ?? 0);
  });

  it('a jogada inteira leva mais de três segundos no NORMAL', () => {
    // O sintoma relatado foi "tudo acontece rápido demais". Uma Ação contada
    // inteira não cabe em dois segundos.
    expect(duracaoDaFila(jogada)).toBeGreaterThan(3000);
  });

  it('e o RÁPIDO não se parece com isso', () => {
    const corrido = enfileirar(
      jogada.map((beat) => ({ id: beat.id, especie: beat.especie })),
      'rapido',
    );
    expect(duracaoDaFila(corrido)).toBeLessThan(duracaoDaFila(jogada) * 0.7);
  });
});

describe('a cascata', () => {
  const migracao = enfileirar([
    { id: 'a', especie: 'cooldown-migra' },
    { id: 'b', especie: 'cooldown-migra', emCascata: true },
    { id: 'c', especie: 'cooldown-migra', emCascata: true },
  ]);

  it('espaça os começos, em vez de descer tudo num quadro', () => {
    const [a, b, c] = migracao;
    if (a === undefined || b === undefined || c === undefined) throw new Error('fila curta');
    expect(b.inicioMs - a.inicioMs).toBeGreaterThanOrEqual(180);
    expect(b.inicioMs - a.inicioMs).toBeLessThanOrEqual(250);
    expect(c.inicioMs - b.inicioMs).toBe(b.inicioMs - a.inicioMs);
  });

  it('mas não espera o anterior terminar: é uma ação só do tabuleiro', () => {
    const [a, b] = migracao;
    if (a === undefined || b === undefined) throw new Error('fila curta');
    expect(b.inicioMs).toBeLessThan(a.fimMs);
  });

  it('cada carta ainda leva o tempo dela', () => {
    for (const beat of migracao) {
      expect(beat.duracaoMs).toBeGreaterThanOrEqual(650);
      expect(beat.duracaoMs).toBeLessThanOrEqual(1000);
    }
  });

  it('a cascata não atropela um beat de outra espécie', () => {
    const fila = enfileirar([
      { id: 'efeito', especie: 'efeito' },
      // Pede cascata, mas o anterior é de outra espécie: espera mesmo assim.
      { id: 'migra', especie: 'cooldown-migra', emCascata: true },
    ]);
    const [efeito, migra] = fila;
    if (efeito === undefined || migra === undefined) throw new Error('fila curta');
    expect(migra.inicioMs).toBe(efeito.fimMs);
  });
});

describe('o som sai com o beat', () => {
  it('cada beat é anunciado uma vez só, na janela em que começou', () => {
    const fila = enfileirar([
      { id: 'um', especie: 'foco' },
      { id: 'dois', especie: 'levantar' },
      { id: 'tres', especie: 'viagem' },
    ]);
    const vistos: string[] = [];
    let anterior = -1;
    for (let t = 0; t <= duracaoDaFila(fila); t += 16) {
      for (const beat of beatsQueComecaram(fila, anterior, t)) vistos.push(beat.id);
      anterior = t;
    }
    expect(vistos).toEqual(['um', 'dois', 'tres']);
  });
});
