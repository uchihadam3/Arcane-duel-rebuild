import { describe, expect, it } from 'vitest';

import type { DescricaoDoVoo } from './voo.js';
import { DURACAO_DO_VOO_MS, MARCOS, estadoDoVoo, fasesDoVoo } from './voo.js';

/*
 * O voo da carta, conferido pelos estados.
 *
 * O que estes testes protegem é a regra que a tarefa escreveu: a carta **não
 * teleporta**. Não é preciso comparar quadro a quadro — basta provar que a
 * sequência existe e está em ordem, e que em nenhum instante do meio a carta já
 * está no destino.
 */

const VOO: DescricaoDoVoo = {
  origem: { x: 200, y: 990 },
  destino: { x: 650, y: 560 },
  giroDeOrigem: -8,
  giroDeDestino: 0,
  inclinacaoDeOrigem: -54,
  inclinacaoDeDestino: 0,
  escalaDeOrigem: 1,
  escalaDeDestino: 0.92,
  inicioMs: 1000,
};

describe('a carta atravessa os estados', () => {
  it('passa por origem, levantada, trânsito, encaixe e resolução, nesta ordem', () => {
    const fases = fasesDoVoo(VOO);
    expect(fases).toEqual(['na-origem', 'levantada', 'em-transito', 'encaixada', 'resolvendo']);
  });

  /*
   * A janela vai até o início da desaceleração, e não até o encaixe.
   *
   * A curva de saída é assintótica: nos últimos milissegundos antes do encaixe
   * a carta já está a menos de uma unidade do destino, e isso é o movimento
   * certo — é a desaceleração. O que não pode acontecer é ela estar lá antes
   * de começar a frear.
   */
  it('não está no destino antes de começar a frear', () => {
    for (let tempo = 1; tempo < MARCOS.desacelera; tempo += 15) {
      const pose = estadoDoVoo(VOO, VOO.inicioMs + tempo);
      const noDestino =
        Math.abs(pose.x - VOO.destino.x) < 1 && Math.abs(pose.y - VOO.destino.y) < 1;
      expect(noDestino, `chegou cedo demais em ${String(tempo)} ms`).toBe(false);
    }
  });

  it('sai da origem depois de levantar, e não antes', () => {
    const naOrigem = estadoDoVoo(VOO, VOO.inicioMs);
    expect(naOrigem.x).toBe(VOO.origem.x);
    expect(naOrigem.altura).toBe(0);

    const levantada = estadoDoVoo(VOO, VOO.inicioMs + MARCOS.levanta);
    expect(levantada.altura).toBeGreaterThan(0);
    // Ainda sobre a mão: levantar não é atravessar.
    expect(levantada.x).toBe(VOO.origem.x);
  });

  it('descreve um arco: sobe no meio e volta ao plano no encaixe', () => {
    const meio = estadoDoVoo(VOO, VOO.inicioMs + (MARCOS.endireita + MARCOS.encaixa) / 2);
    const chegada = estadoDoVoo(VOO, VOO.inicioMs + DURACAO_DO_VOO_MS + 1);
    expect(meio.altura).toBeGreaterThan(120);
    expect(chegada.altura).toBe(0);
  });

  it('endireita: sai da pose da mão e termina deitada no campo', () => {
    const naMao = estadoDoVoo(VOO, VOO.inicioMs);
    const assentada = estadoDoVoo(VOO, VOO.inicioMs + DURACAO_DO_VOO_MS + 1);
    expect(naMao.inclinacao).toBe(-54);
    expect(assentada.inclinacao).toBe(0);
  });

  it('cresce ao levantar e volta ao tamanho do pedestal ao encaixar', () => {
    const levantada = estadoDoVoo(VOO, VOO.inicioMs + MARCOS.endireita - 1);
    const assentada = estadoDoVoo(VOO, VOO.inicioMs + DURACAO_DO_VOO_MS + 1);
    expect(levantada.escala).toBeGreaterThan(VOO.escalaDeOrigem);
    expect(assentada.escala).toBeCloseTo(VOO.escalaDeDestino, 5);
  });

  it('o encaixe tem recuo, e o recuo acaba', () => {
    const encaixando = estadoDoVoo(VOO, VOO.inicioMs + MARCOS.encaixa + 40);
    const assentada = estadoDoVoo(VOO, VOO.inicioMs + DURACAO_DO_VOO_MS + 1);
    expect(encaixando.fase).toBe('encaixada');
    expect(encaixando.altura).toBeGreaterThan(0);
    expect(assentada.altura).toBe(0);
  });
});

describe('a mesma gramática serve aos dois lados', () => {
  /*
   * A carta da máquina sai da mão de cima e desce. Nada no voo sabe de quem é
   * a carta: o que muda é a origem. Se um dia alguém precisar de um caminho
   * diferente para a máquina, este teste quebra — e é para quebrar.
   */
  it('a carta da máquina percorre as mesmas fases, de cima para baixo', () => {
    const daMaquina: DescricaoDoVoo = {
      ...VOO,
      origem: { x: 700, y: -90 },
      destino: { x: 650, y: 300 },
      inclinacaoDeOrigem: -54,
    };
    expect(fasesDoVoo(daMaquina)).toEqual(fasesDoVoo(VOO));

    const meio = estadoDoVoo(daMaquina, daMaquina.inicioMs + 400);
    expect(meio.y).toBeGreaterThan(daMaquina.origem.y);
    expect(meio.y).toBeLessThan(daMaquina.destino.y);
  });
});

describe('o ritmo encurta sem quebrar a sequência', () => {
  it('em ritmo acelerado a carta ainda passa por todas as fases', () => {
    const rapido: DescricaoDoVoo = { ...VOO, ritmo: 0.6 };
    expect(fasesDoVoo(rapido)).toEqual(fasesDoVoo(VOO));
  });

  it('em ritmo acelerado ela chega antes', () => {
    const rapido: DescricaoDoVoo = { ...VOO, ritmo: 0.6 };
    const emMetade = estadoDoVoo(rapido, VOO.inicioMs + DURACAO_DO_VOO_MS * 0.6 + 1);
    expect(emMetade.fase).toBe('resolvendo');
  });
});
