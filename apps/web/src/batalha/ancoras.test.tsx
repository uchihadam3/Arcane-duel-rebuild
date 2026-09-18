// @vitest-environment jsdom
import { criarRegistroDeAncoras } from '@arcane-duel/ui';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { montarPartida } from '../telas/apoio-de-teste.js';
import { atributoDaAncora } from './ancoras.js';

/*
 * As âncoras de campo.
 *
 * A Etapa 6 vai mover efeitos entre zonas. Para que isso não vire coordenada
 * mágica por modelo de telefone, cada zona se declara no DOM e o campo as mede
 * em coordenadas normalizadas. Aqui se prova que as zonas **se declaram**; a
 * medição depende de layout, que o jsdom não faz.
 */

const ancorasNaTela = (): readonly string[] =>
  [...screen.getByTestId('campo').querySelectorAll('[data-ancora]')].map(
    (elemento) => elemento.getAttribute('data-ancora') ?? '',
  );

describe('as zonas do campo se declaram', () => {
  it('monta a chave no formato que o registro entende', () => {
    expect(atributoDaAncora('proprio', 'acao', 2)).toEqual({ 'data-ancora': 'proprio:acao:2' });
    expect(atributoDaAncora('adversario', 'ultimate')).toEqual({
      'data-ancora': 'adversario:ultimate:0',
    });
  });

  it('declara os três espaços de Ação e as três Respostas dos dois lados', () => {
    montarPartida();
    const ancoras = ancorasNaTela();
    for (const lado of ['proprio', 'adversario']) {
      for (const indice of [0, 1, 2]) {
        expect(ancoras).toContain(`${lado}:acao:${String(indice)}`);
        expect(ancoras).toContain(`${lado}:resposta:${String(indice)}`);
      }
    }
  });

  it('declara Passivas, Cartas de Classe, Ultimate e cooldown', () => {
    montarPartida();
    const ancoras = ancorasNaTela();
    for (const lado of ['proprio', 'adversario']) {
      for (const indice of [0, 1, 2, 3]) {
        expect(ancoras).toContain(`${lado}:passiva:${String(indice)}`);
      }
      for (const indice of [0, 1]) {
        expect(ancoras).toContain(`${lado}:carta-de-classe:${String(indice)}`);
      }
      expect(ancoras).toContain(`${lado}:ultimate:0`);
      for (const zona of ['cd1', 'cd2', 'cd3']) {
        expect(ancoras).toContain(`${lado}:${zona}:0`);
      }
    }
  });

  it('declara a mão como zona própria', () => {
    montarPartida();
    expect(ancorasNaTela()).toContain('proprio:mao:0');
  });

  it('o registro guarda e devolve o ponto de uma zona', () => {
    const registro = criarRegistroDeAncoras();
    const cancelar = registro.registrar(
      { lado: 'proprio', zona: 'acao', indice: 1 },
      {
        x: 0.5,
        y: 0.7,
      },
    );
    expect(registro.obter({ lado: 'proprio', zona: 'acao', indice: 1 })).toEqual({
      x: 0.5,
      y: 0.7,
    });
    cancelar();
    expect(registro.obter({ lado: 'proprio', zona: 'acao', indice: 1 })).toBeUndefined();
  });
});
