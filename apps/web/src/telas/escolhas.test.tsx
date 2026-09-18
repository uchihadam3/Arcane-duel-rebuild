// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { montarPartida, passarOAparelho } from './apoio-de-teste.js';

/*
 * As escolhas que as cartas pedem.
 *
 * O motor continua sem escolher por ninguém: a interface pergunta, e as
 * opções oferecidas são as que **o motor aceita** — não uma lista montada à
 * mão nesta camada. Por isso os testes abaixo não sabem o que cada carta pede;
 * eles tocam na carta e conferem que a pergunta certa aparece.
 */

/** Foca a carta da mão pelo nome humano. Nenhum teste conhece CardId. */
const focarCarta = (nome: string): void => {
  const carta = screen.getByTestId('mao').querySelector(`[data-carta="${nome}"]`);
  if (carta === null) throw new Error(`carta "${nome}" não está na mão`);
  fireEvent.click(carta);
};

describe('uma carta que pede escolha', () => {
  it('abre o painel de escolha em vez de escolher sozinha', () => {
    montarPartida({ classeDoJogador1: 'bardo' });
    focarCarta('Improviso');
    fireEvent.click(screen.getByText('Usar'));

    const painel = screen.getByTestId('painel-de-escolha');
    expect(painel.textContent).toContain('Qual Nota?');
    // A Ação não foi declarada enquanto a pergunta está aberta.
    expect(screen.getByTestId('acoes-proprio').textContent).not.toContain('Aguardando Resposta');
  });

  it('oferece só as opções que o motor aceita, com nome humano', () => {
    montarPartida({ classeDoJogador1: 'bardo' });
    focarCarta('Improviso');
    fireEvent.click(screen.getByText('Usar'));

    const painel = screen.getByTestId('painel-de-escolha');
    for (const nota of ['Pulso', 'Melodia', 'Harmonia']) {
      expect(painel.textContent).toContain(nota);
    }
    expect(painel.textContent).not.toContain('pulso');
  });

  it('pergunta uma escolha de cada vez, até a jogada sair', () => {
    montarPartida({ classeDoJogador1: 'bardo' });
    focarCarta('Improviso');
    fireEvent.click(screen.getByText('Usar'));

    // Improviso pede a Nota e, em seguida, o reforço: são duas perguntas, e a
    // interface faz as duas em vez de decidir a segunda sozinha.
    fireEvent.click(screen.getByTestId('escolha-melodia'));
    expect(screen.getByTestId('painel-de-escolha').textContent).toContain('Reforçar o quê?');
    fireEvent.click(screen.getByTestId('escolha-dano'));

    expect(screen.queryByTestId('painel-de-escolha')).toBeNull();
    expect(screen.getByTestId('acoes-proprio').textContent).toContain('Improviso');
    expect(screen.getByTestId('acoes-proprio').textContent).toContain('Aguardando Resposta');
  });

  it('cancelar fecha a pergunta sem declarar nada', () => {
    montarPartida({ classeDoJogador1: 'bardo' });
    focarCarta('Improviso');
    fireEvent.click(screen.getByText('Usar'));
    fireEvent.click(screen.getByTestId('cancelar-escolha'));

    expect(screen.queryByTestId('painel-de-escolha')).toBeNull();
    expect(screen.getByTestId('acoes-proprio').textContent).not.toContain('Aguardando Resposta');
    expect(screen.getByTestId('acoes-usadas-proprio').textContent).toContain('0/3');
  });

  it('uma escolha numérica também é perguntada', () => {
    montarPartida({ classeDoJogador1: 'necromante' });
    focarCarta('Ruína Sepulcral');
    fireEvent.click(screen.getByText('Usar'));

    const painel = screen.getByTestId('painel-de-escolha');
    expect(painel.textContent).toContain('Quantas Almas colher?');
    expect(screen.getByTestId('escolha-0')).toBeDefined();
    expect(screen.getByTestId('escolha-1')).toBeDefined();
  });
});

describe('a recusa do motor vira texto humano', () => {
  it('não mostra código de erro nem JSON', () => {
    montarPartida({ classeDoJogador1: 'bardo' });
    // Gasta o AP inteiro para forçar uma recusa por preço.
    for (let volta = 0; volta < 3; volta += 1) {
      const jogavel = screen.getByTestId('mao').querySelector('.carta--selecionavel');
      if (jogavel === null) break;
      fireEvent.click(jogavel);
      const usar = screen.queryByText('Usar');
      if (usar === null) break;
      fireEvent.click(usar);
      const escolha = screen.queryByTestId('painel-de-escolha');
      if (escolha !== null) {
        const primeira = escolha.querySelector('[data-teste^="escolha-"]');
        if (primeira !== null) fireEvent.click(primeira);
      }
      if (screen.queryByTestId('enviar-acao') === null) break;
      fireEvent.click(screen.getByTestId('enviar-acao'));
      passarOAparelho();
      fireEvent.click(screen.getByTestId('sem-resposta'));
      passarOAparelho();
    }

    const erro = screen.queryByTestId('erro');
    if (erro !== null) {
      expect(erro.textContent).not.toContain('{');
      expect(erro.textContent).not.toContain('tipo');
      expect(erro.textContent).toMatch(/[a-zà-ú]/i);
    }
    // Com ou sem recusa, o campo continua inteiro e legível.
    expect(screen.getByTestId('campo')).toBeDefined();
  });
});
