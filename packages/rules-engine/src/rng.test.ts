import { describe, expect, it } from 'vitest';

import { criarAleatorio } from './rng.js';

describe('gerador determinístico', () => {
  it('produz a mesma sequência para a mesma semente', () => {
    const a = criarAleatorio('campanha-1');
    const b = criarAleatorio('campanha-1');
    const sequenciaA = [a.proximo(), a.proximo(), a.proximo()];
    const sequenciaB = [b.proximo(), b.proximo(), b.proximo()];
    expect(sequenciaA).toEqual(sequenciaB);
  });

  it('produz sequências diferentes para sementes diferentes', () => {
    const a = criarAleatorio('campanha-1');
    const b = criarAleatorio('campanha-2');
    expect(a.proximo()).not.toBe(b.proximo());
  });

  it('mantém os valores dentro de [0, 1)', () => {
    const rng = criarAleatorio('limites');
    for (let i = 0; i < 500; i += 1) {
      const valor = rng.proximo();
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });

  it('gera inteiros dentro do limite pedido', () => {
    const rng = criarAleatorio('inteiros');
    for (let i = 0; i < 500; i += 1) {
      const valor = rng.inteiro(12);
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(12);
      expect(Number.isInteger(valor)).toBe(true);
    }
  });

  it('rejeita limite inválido', () => {
    const rng = criarAleatorio('invalido');
    expect(() => rng.inteiro(0)).toThrow(RangeError);
    expect(() => rng.inteiro(2.5)).toThrow(RangeError);
  });

  it('embaralha sem perder nem duplicar itens e sem mutar a entrada', () => {
    const original = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const embaralhado = criarAleatorio('ordem').embaralhar(original);
    expect(embaralhado).toHaveLength(original.length);
    expect([...embaralhado].sort((x, y) => x - y)).toEqual([...original]);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('embaralha de forma reproduzível', () => {
    const itens = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(criarAleatorio('s').embaralhar(itens)).toEqual(criarAleatorio('s').embaralhar(itens));
  });
});
