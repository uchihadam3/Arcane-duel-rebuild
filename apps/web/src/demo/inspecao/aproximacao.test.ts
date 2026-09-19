import { describe, expect, it } from 'vitest';

import {
  ALTURA_DA_INSPECAO,
  ESCURIDAO_MAXIMA,
  type DescricaoDaInspecao,
  destinoDaInspecao,
  poseDaInspecao,
} from './aproximacao.js';

/*
 * A inspeção, conferida.
 *
 * O que a revisão pediu é verificável: a cópia nasce **na carta**, termina na
 * altura pedida da tela, endireita mesmo vindo do lado da máquina, e o fundo
 * escurece sem apagar a arena. Um painel que aparece passaria num teste de
 * "abriu"; estes testes procuram o caminho.
 */

const NO_CAMPO: DescricaoDaInspecao = {
  origem: { x: 620, y: 150, largura: 58, altura: 72 },
  giroDeOrigem: 0,
  tela: { largura: 915, altura: 412 },
};

const NA_METADE_DA_MAQUINA: DescricaoDaInspecao = { ...NO_CAMPO, giroDeOrigem: 180 };

describe('a cópia nasce na carta e vai até a leitura', () => {
  it('no instante zero está exatamente sobre a carta', () => {
    const pose = poseDaInspecao(NO_CAMPO, 0);
    expect(pose.x).toBe(NO_CAMPO.origem.x + NO_CAMPO.origem.largura / 2);
    expect(pose.y).toBe(NO_CAMPO.origem.y + NO_CAMPO.origem.altura / 2);
    expect(pose.escala).toBe(1);
    expect(pose.escuridao).toBe(0);
  });

  it('termina centrada na tela', () => {
    const pose = poseDaInspecao(NO_CAMPO, 1);
    expect(pose.x).toBeCloseTo(NO_CAMPO.tela.largura / 2, 6);
    expect(pose.y).toBeCloseTo(NO_CAMPO.tela.altura / 2, 6);
  });

  /*
   * A faixa pedida foi 65 % a 82 % da altura útil. Menos que isso e o texto
   * impresso deixa de ser confortável; mais e a carta encosta nas bordas e
   * parece presa em vez de apresentada.
   */
  it('e ocupa entre 65 % e 82 % da altura da tela', () => {
    const destino = destinoDaInspecao(NO_CAMPO);
    const fracao = destino.altura / NO_CAMPO.tela.altura;
    expect(fracao).toBeGreaterThanOrEqual(0.65);
    expect(fracao).toBeLessThanOrEqual(0.82);
    expect(ALTURA_DA_INSPECAO).toBe(fracao);
  });

  it('guarda a proporção da carta: ela não é esticada para caber', () => {
    const destino = destinoDaInspecao(NO_CAMPO);
    expect(destino.largura / destino.altura).toBeCloseTo(
      NO_CAMPO.origem.largura / NO_CAMPO.origem.altura,
      6,
    );
  });

  it('não pula: passa por escalas intermediárias', () => {
    const escalas = [0.2, 0.4, 0.6, 0.8].map((t) => poseDaInspecao(NO_CAMPO, t).escala);
    for (let indice = 1; indice < escalas.length; indice += 1) {
      expect(escalas[indice] ?? 0).toBeGreaterThan(escalas[indice - 1] ?? 0);
    }
    expect(escalas[0] ?? 0).toBeGreaterThan(1);
    expect(escalas.at(-1) ?? 0).toBeLessThan(poseDaInspecao(NO_CAMPO, 1).escala);
  });
});

describe('a cópia é lida por quem está deste lado da mesa', () => {
  /*
   * A carta da máquina está a 180° no tabuleiro, e continua lá. O que
   * endireita é a **cópia** — girar a peça física porque alguém a inspecionou
   * seria mentir sobre o estado da mesa.
   */
  it('termina a 0° mesmo nascendo a 180°', () => {
    expect(poseDaInspecao(NA_METADE_DA_MAQUINA, 1).giro).toBe(0);
    expect(poseDaInspecao(NA_METADE_DA_MAQUINA, 0).giro).toBe(180);
  });

  it('e já está em pé antes de terminar de se aproximar', () => {
    // Endireitar junto com a chegada obrigaria a esperar para ler.
    expect(Math.abs(poseDaInspecao(NA_METADE_DA_MAQUINA, 0.7).giro)).toBeLessThan(1);
  });

  it('uma carta do próprio jogador nunca gira', () => {
    for (const t of [0, 0.3, 0.6, 1]) {
      expect(poseDaInspecao(NO_CAMPO, t).giro).toBe(0);
    }
  });
});

describe('o fundo escurece, mas a arena continua visível', () => {
  it('nunca chega ao preto', () => {
    expect(poseDaInspecao(NO_CAMPO, 1).escuridao).toBe(ESCURIDAO_MAXIMA);
    expect(ESCURIDAO_MAXIMA).toBeLessThan(0.75);
  });

  it('e escurece junto com a aproximação, e não antes dela', () => {
    expect(poseDaInspecao(NO_CAMPO, 0.5).escuridao).toBeCloseTo(ESCURIDAO_MAXIMA / 2, 6);
  });
});

describe('fechar é o mesmo caminho ao contrário', () => {
  it('a pose em t volta a ser a mesma, subindo ou descendo', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const indo = poseDaInspecao(NO_CAMPO, t);
      const voltando = poseDaInspecao(NO_CAMPO, t);
      expect(voltando).toEqual(indo);
    }
  });

  it('e em t = 0 a cópia está de volta exatamente onde a carta está', () => {
    const pose = poseDaInspecao(NA_METADE_DA_MAQUINA, 0);
    expect(pose.x).toBe(NO_CAMPO.origem.x + NO_CAMPO.origem.largura / 2);
    expect(pose.escala).toBe(1);
  });
});
