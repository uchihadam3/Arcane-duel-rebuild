import { describe, expect, it } from 'vitest';

import type { EventoDeApresentacao, TipoDeMomento } from './momentos.js';
import {
  BLOQUEIA_ENTRADA,
  DURACAO_BASE_MS,
  FAMILIAS_DO_GUERREIRO,
  FAMILIAS_DO_MAGO,
  criarFilaDeApresentacao,
  estouroDeOrcamento,
  eventoDeApresentacao,
} from './index.js';

/*
 * A fila de apresentação.
 *
 * O que estes testes prendem é a regra que separa este projeto de um monte de
 * jogos de carta: **o estado não espera a animação**. A fila é um relógio de
 * tela. Ela pode atrasar, engasgar ou ser esvaziada no meio, e a partida
 * continua exatamente a mesma — só fica feia.
 */

const beat = (
  id: string,
  tipo: TipoDeMomento,
  extras: Partial<Parameters<typeof eventoDeApresentacao>[1]> = {},
): EventoDeApresentacao => eventoDeApresentacao(id, { tipo, lado: 'proprio', ...extras });

describe('fila de apresentação', () => {
  it('toca os beats na ordem em que o motor os produziu', () => {
    const fila = criarFilaDeApresentacao('normal');
    fila.enfileirar([beat('a', 'impacto'), beat('b', 'impacto')]);

    expect(fila.avancar(0).map((evento) => evento.id)).toEqual(['a']);
    expect(fila.avancar(100).map((evento) => evento.id)).toEqual([]);
    expect(fila.avancar(1000).map((evento) => evento.id)).toEqual(['b']);
  });

  it('segura a entrada só enquanto um beat que bloqueia está correndo', () => {
    const fila = criarFilaDeApresentacao('normal');
    fila.enfileirar([beat('viagem', 'viagem')]);

    fila.avancar(0);
    expect(fila.bloqueada()).toBe(true);
    fila.avancar(DURACAO_BASE_MS.viagem + 1);
    expect(fila.bloqueada()).toBe(false);
  });

  it('deixa o número flutuante correr por cima do beat seguinte', () => {
    /*
     * É o que o vídeo de referência mostra: o contador cai enquanto a carta
     * ainda está grande no centro. O número não é um beat que espera a vez.
     */
    const fila = criarFilaDeApresentacao('normal');
    fila.enfileirar([beat('numero', 'numero-flutuante'), beat('depois', 'impacto')]);

    const nascidos = fila.avancar(0).map((evento) => evento.id);
    expect(nascidos).toEqual(['numero', 'depois']);
    expect(fila.emCena()).toHaveLength(2);
  });

  it('o progresso vai de zero a um e nunca volta', () => {
    const fila = criarFilaDeApresentacao('normal');
    fila.enfileirar([beat('unico', 'apresentacao-de-carta')]);
    fila.avancar(0);

    const meio = fila.emCena()[0];
    expect(meio?.progresso).toBe(0);
    fila.avancar(DURACAO_BASE_MS['apresentacao-de-carta'] / 2);
    const depois = fila.emCena()[0];
    expect(depois?.progresso).toBeGreaterThan(0.4);
    expect(depois?.progresso).toBeLessThan(0.6);
  });

  it('o modo rápido encurta, e o instantâneo esvazia sem pular nada', () => {
    const fila = criarFilaDeApresentacao('rapida');
    fila.enfileirar([beat('a', 'impacto')]);
    fila.avancar(0);
    // 180 ms de base viram 108 ms: aos 120 o beat já terminou.
    fila.avancar(120);
    expect(fila.bloqueada()).toBe(false);
  });

  it('esvaziar a fila não deixa nada pendente, e é sempre seguro', () => {
    const fila = criarFilaDeApresentacao('normal');
    fila.enfileirar([beat('a', 'ultimate'), beat('b', 'ruptura')]);
    fila.avancar(0);
    fila.limpar();

    expect(fila.vazia()).toBe(true);
    expect(fila.bloqueada()).toBe(false);
    expect(fila.emCena()).toEqual([]);
  });
});

describe('vocabulário de apresentação', () => {
  it('nenhum beat estoura o orçamento de um momento', () => {
    const tipos = Object.keys(DURACAO_BASE_MS) as readonly TipoDeMomento[];
    for (const tipo of tipos) {
      expect(estouroDeOrcamento([beat(tipo, tipo)]), `${tipo} passa do teto`).toBeUndefined();
    }
  });

  it('a sequência de um Ataque completo cabe no orçamento', () => {
    const ataque = [
      beat('declaracao', 'declaracao'),
      beat('viagem', 'viagem'),
      beat('impacto', 'impacto'),
      beat('numero', 'numero-flutuante'),
      beat('ruptura', 'ruptura'),
    ];
    expect(estouroDeOrcamento(ataque)).toBeUndefined();
  });

  it('o número flutuante, o recurso e o tique de condição nunca seguram o dedo', () => {
    for (const tipo of ['numero-flutuante', 'recurso', 'condicao-tick'] as const) {
      expect(BLOQUEIA_ENTRADA[tipo], `${tipo} bloqueia`).toBe(false);
    }
  });

  it('Guerreiro e Mago não compartilham nenhuma família visual', () => {
    /*
     * Duas classes com a mesma linguagem visual são a mesma classe na tela. É
     * a diferença que responde "de quem é esse efeito?" sem uma palavra.
     */
    const guerreiro = new Set<string>(FAMILIAS_DO_GUERREIRO);
    for (const familia of FAMILIAS_DO_MAGO) {
      expect(guerreiro.has(familia), `${familia} aparece nas duas classes`).toBe(false);
    }
  });

  it('um beat nasce com duração, bloqueio e família preenchidos pelo tipo', () => {
    const montado = beat('x', 'ruptura', { familia: 'fragmentos', origem: 'proprio:acao:0' });
    expect(montado.duracaoBaseMs).toBe(DURACAO_BASE_MS.ruptura);
    expect(montado.bloqueiaEntrada).toBe(BLOQUEIA_ENTRADA.ruptura);
    expect(montado.familia).toBe('fragmentos');
    expect(montado.origem).toBe('proprio:acao:0');
    expect(montado.destino).toBeNull();
  });
});
