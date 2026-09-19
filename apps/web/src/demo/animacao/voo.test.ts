import { describe, expect, it } from 'vitest';

import {
  type Caixa,
  type DescricaoDoVoo,
  DURACAO_DO_DESLIZE_MS,
  FASES,
  MARCOS,
  RITMO_REDUZIDO,
  estadoDoDeslize,
  estadoDoVoo,
  fasesDoVoo,
} from './voo.js';

/*
 * O voo, conferido.
 *
 * O que se prova aqui não é que está bonito — isso é do avaliador. É que a
 * carta **passa por todos os estados**: sai da origem real, sobe, endireita,
 * atravessa, freia, encaixa com recuo e assenta exatamente no destino. Uma
 * animação que pula do começo ao fim passaria num teste de "chegou"; este
 * procura o meio.
 */

const MAO: Caixa = { x: 300, y: 330, largura: 110, altura: 154 };
const PEDESTAL: Caixa = { x: 620, y: 150, largura: 58, altura: 52 };

const voo = (extra: Partial<DescricaoDoVoo> = {}): DescricaoDoVoo => ({
  origem: MAO,
  destino: PEDESTAL,
  giroDeOrigem: -6,
  giroDeDestino: 0,
  inclinacaoDoCampo: 47,
  inicioMs: 1000,
  ...extra,
});

const centro = (caixa: Caixa) => ({
  x: caixa.x + caixa.largura / 2,
  y: caixa.y + caixa.altura / 2,
});

describe('a carta sai da origem real e chega ao destino real', () => {
  /*
   * "A origem da animação precisa corresponder exatamente à carta tocada."
   *
   * É literal: no instante zero a pose é o centro do retângulo de origem, sem
   * deslocamento nenhum. Se houvesse offset, o clone nasceria deslocado da
   * carta que o dedo tocou e o voo começaria com um salto.
   */
  it('no instante zero está exatamente sobre a origem', () => {
    const pose = estadoDoVoo(voo(), 1000);
    expect(pose.x).toBe(centro(MAO).x);
    expect(pose.y).toBe(centro(MAO).y);
    expect(pose.escala).toBe(1);
    expect(pose.fase).toBe('na-origem');
  });

  /*
   * "Não deve haver salto de 10–20 pixels na troca."
   *
   * No fim do voo o clone precisa estar exatamente sobre o slot, para que a
   * peça real assuma sem que nada se mexa.
   */
  it('no fim está exatamente sobre o destino, sem sobra', () => {
    const pose = estadoDoVoo(voo(), 1000 + MARCOS.assenta);
    expect(pose.x).toBe(centro(PEDESTAL).x);
    expect(pose.y).toBe(centro(PEDESTAL).y);
    expect(pose.escala).toBeCloseTo(PEDESTAL.largura / MAO.largura, 10);
    expect(pose.inclinacao).toBe(47);
    expect(pose.elevacao).toBe(0);
    expect(pose.terminou).toBe(true);
  });

  it('um quadro antes do fim ainda não chegou', () => {
    const pose = estadoDoVoo(voo(), 1000 + MARCOS.assenta - 16);
    expect(pose.terminou).toBe(false);
    expect(Math.hypot(pose.x - centro(PEDESTAL).x, pose.y - centro(PEDESTAL).y)).toBeGreaterThan(0);
  });
});

describe('a carta passa por todas as fases, na ordem', () => {
  it('nenhuma fase é pulada', () => {
    expect(fasesDoVoo(voo())).toEqual(FASES);
  });

  it('também em movimento reduzido: encurta, mas não vira teleporte', () => {
    const fases = fasesDoVoo(voo({ ritmo: RITMO_REDUZIDO }), 8);
    expect(fases).toEqual(FASES);
  });

  it('o movimento reduzido é mais curto que o normal', () => {
    const meio = 1000 + MARCOS.viaja;
    const normal = estadoDoVoo(voo(), meio).progresso;
    const reduzido = estadoDoVoo(voo({ ritmo: RITMO_REDUZIDO }), meio).progresso;
    expect(reduzido).toBeGreaterThan(normal);
  });
});

describe('o movimento tem peso', () => {
  /*
   * Primeiro a carta é **apontada**, e só depois se move.
   *
   * Durante o beat de foco ela cresce um fio sem sair do lugar: é o aviso de
   * que a próxima coisa a acontecer parte dali. A revisão do aparelho real
   * cobrou exatamente isso — a carta partia sem anúncio e o jogador só
   * descobria qual tinha sido jogada quando ela já estava no pedestal.
   */
  it('destaca a carta no lugar antes de tirá-la de lá', () => {
    const noFoco = estadoDoVoo(voo(), 1000 + MARCOS.foco / 2);
    expect(noFoco.fase).toBe('focada');
    expect(noFoco.x).toBeCloseTo(centro(MAO).x, 6);
    expect(noFoco.y).toBeCloseTo(centro(MAO).y, 6);
    expect(noFoco.escala).toBeGreaterThan(1);
    expect(noFoco.elevacao).toBe(0);
  });

  /*
   * A carta se descola da mão **antes** de viajar.
   *
   * Até o marco de apresentação ela não anda no eixo da travessia — ela
   * levanta. Sem essa pausa a carta parece arrastada pela mesa, e foi
   * exatamente isso que a tarefa pediu para evitar.
   */
  it('levanta antes de andar', () => {
    const levantando = estadoDoVoo(voo(), 1000 + MARCOS.foco + 60);
    expect(levantando.x).toBeCloseTo(centro(MAO).x, 6);
    expect(levantando.y).toBeLessThan(centro(MAO).y);
    expect(levantando.elevacao).toBeGreaterThan(0);
  });

  it('cresce e endireita na apresentação, ainda sobre a mão', () => {
    const pose = estadoDoVoo(voo(), 1000 + MARCOS.apresenta - 4);
    expect(pose.escala).toBeGreaterThan(1.1);
    expect(Math.abs(pose.giro)).toBeLessThan(1);
    expect(Math.abs(pose.x - centro(MAO).x)).toBeLessThan(2);
  });

  /*
   * Não é interpolação linear.
   *
   * Numa reta, o ponto no meio do tempo está no meio do caminho. Aqui o pico
   * de velocidade fica antes do meio, então no meio do tempo a carta já andou
   * bem mais da metade — e é isso que produz a leitura de massa lançada em vez
   * de slide de apresentação.
   */
  it('a travessia não é linear: no meio do tempo já andou mais da metade', () => {
    const meio = MARCOS.apresenta + (MARCOS.desacelera - MARCOS.apresenta) / 2;
    const pose = estadoDoVoo(voo(), 1000 + meio);
    const andado = (pose.x - centro(MAO).x) / (centro(PEDESTAL).x - centro(MAO).x);
    expect(andado).toBeGreaterThan(0.6);
    expect(andado).toBeLessThan(0.95);
  });

  it('atravessa num arco: passa acima da reta entre origem e destino', () => {
    const meio = MARCOS.apresenta + (MARCOS.desacelera - MARCOS.apresenta) / 2;
    const pose = estadoDoVoo(voo(), 1000 + meio);
    const fracao = (pose.x - centro(MAO).x) / (centro(PEDESTAL).x - centro(MAO).x);
    const naReta = centro(MAO).y + (centro(PEDESTAL).y - centro(MAO).y) * fracao;
    expect(pose.y).toBeLessThan(naReta);
  });

  /*
   * O recuo do encaixe.
   *
   * Entre a desaceleração e o assentamento a carta passa **além** do destino e
   * volta. É um quique só: dois leem como brinquedo, nenhum lê como ímã.
   */
  it('encaixa com um recuo curto, passando além do destino', () => {
    let passouAlem = false;
    for (let t = MARCOS.desacelera; t < MARCOS.assenta; t += 4) {
      const pose = estadoDoVoo(voo(), 1000 + t);
      const fracao = (pose.x - centro(MAO).x) / (centro(PEDESTAL).x - centro(MAO).x);
      if (fracao > 1.005) passouAlem = true;
    }
    expect(passouAlem).toBe(true);
  });

  it('o recuo é um quique só', () => {
    const fracoes: number[] = [];
    for (let t = MARCOS.desacelera; t <= MARCOS.assenta; t += 4) {
      const pose = estadoDoVoo(voo(), 1000 + t);
      fracoes.push((pose.x - centro(MAO).x) / (centro(PEDESTAL).x - centro(MAO).x));
    }
    let viradas = 0;
    for (let i = 1; i < fracoes.length - 1; i += 1) {
      const antes = (fracoes[i] ?? 0) - (fracoes[i - 1] ?? 0);
      const depois = (fracoes[i + 1] ?? 0) - (fracoes[i] ?? 0);
      if (antes > 0 !== depois > 0) viradas += 1;
    }
    expect(viradas).toBeLessThanOrEqual(1);
  });

  /*
   * A carta deita **no fim**.
   *
   * Ela atravessa quase toda de frente para quem olha. Deitar cedo esconde a
   * arte durante a travessia, que é o momento em que o jogador quer ver o que
   * foi jogado.
   */
  it('só vira a rotação do campo perto do fim', () => {
    const noMeio = estadoDoVoo(voo(), 1000 + MARCOS.viaja);
    expect(noMeio.inclinacao).toBeLessThan(47 * 0.6);
    const quaseLa = estadoDoVoo(voo(), 1000 + MARCOS.assenta - 20);
    expect(quaseLa.inclinacao).toBeGreaterThan(47 * 0.8);
  });

  it('a elevação sobe e volta a zero: a sombra acompanha', () => {
    const noAlto = estadoDoVoo(voo(), 1000 + MARCOS.viaja * 0.7);
    expect(noAlto.elevacao).toBeGreaterThan(0.5);
    expect(estadoDoVoo(voo(), 1000 + MARCOS.assenta).elevacao).toBe(0);
  });

  it('nenhuma pose sai com número inválido', () => {
    for (let t = -50; t <= MARCOS.assenta + 50; t += 7) {
      const pose = estadoDoVoo(voo(), 1000 + t);
      for (const valor of [
        pose.x,
        pose.y,
        pose.escala,
        pose.giro,
        pose.inclinacao,
        pose.elevacao,
      ]) {
        expect(Number.isFinite(valor), `t=${String(t)}`).toBe(true);
      }
      expect(pose.elevacao).toBeGreaterThanOrEqual(0);
      expect(pose.elevacao).toBeLessThanOrEqual(1);
    }
  });
});

describe('o deslize do cooldown', () => {
  const COMPARTIMENTO_A: Caixa = { x: 700, y: 200, largura: 40, altura: 54 };
  const COMPARTIMENTO_B: Caixa = { x: 760, y: 200, largura: 40, altura: 54 };
  const deslize = { origem: COMPARTIMENTO_A, destino: COMPARTIMENTO_B, inicioMs: 0 };

  it('sai de um compartimento e chega exatamente no outro', () => {
    expect(estadoDoDeslize(deslize, 0).x).toBeCloseTo(centro(COMPARTIMENTO_A).x, 6);
    const fim = estadoDoDeslize(deslize, DURACAO_DO_DESLIZE_MS);
    expect(fim.x).toBeCloseTo(centro(COMPARTIMENTO_B).x, 6);
    expect(fim.terminou).toBe(true);
  });

  /*
   * Ela levanta para sair da gaveta.
   *
   * Sem esse levantar, a carta atravessa a parede do compartimento e o
   * movimento deixa de comunicar que ela saiu de um lugar — que é justamente
   * o que o avanço do cooldown precisa dizer sozinho, sem texto.
   */
  it('levanta no meio do caminho e assenta no fim', () => {
    expect(estadoDoDeslize(deslize, DURACAO_DO_DESLIZE_MS / 2).elevacao).toBeGreaterThan(0.3);
    expect(estadoDoDeslize(deslize, DURACAO_DO_DESLIZE_MS).elevacao).toBeCloseTo(0, 5);
  });

  it('é mais curto que o voo: é peça deslizando, não carta lançada', () => {
    expect(DURACAO_DO_DESLIZE_MS).toBeLessThan(MARCOS.assenta);
  });
});
