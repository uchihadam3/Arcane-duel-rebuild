// @vitest-environment jsdom
import { CLASSES_IMPLEMENTADAS } from '@arcane-duel/card-data';
import { NOME_DA_RECEITA_INICIAL } from '@arcane-duel/gameplay/jogo';
import { AssetProvider } from '@arcane-duel/ui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ConfiguracaoLocal as Configuracao } from '../partida/controlador.js';
import { JOGADOR_1, JOGADOR_2, montarPartidaLocal } from '../partida/controlador.js';
import { ConfiguracaoLocal } from './ConfiguracaoLocal.js';

/*
 * A configuração da partida local.
 *
 * O que ela precisa garantir: as doze classes estão lá, a Receita 1 de cada
 * uma é a oficial, escolher a mesma classe dos dois lados é permitido, e quem
 * começa é pergunta explícita — a interface não sorteia.
 */

const montar = (aoComecar: (configuracao: Configuracao) => void = () => undefined) => {
  render(
    <AssetProvider base="/">
      <ConfiguracaoLocal aoComecar={aoComecar} aoVoltar={() => undefined} />
    </AssetProvider>,
  );
};

describe('configuração da partida local', () => {
  it('oferece as doze classes para cada jogador', () => {
    montar();
    for (const painel of ['classes-jogador-1', 'classes-jogador-2']) {
      const secao = screen.getByTestId(painel);
      expect(within(secao).getAllByRole('button')).toHaveLength(CLASSES_IMPLEMENTADAS.length);
      expect(CLASSES_IMPLEMENTADAS).toHaveLength(12);
    }
  });

  it('mostra a Receita 1 oficial de cada classe', () => {
    montar();
    const secao = screen.getByTestId('classes-jogador-1');
    for (const classe of CLASSES_IMPLEMENTADAS) {
      const botao = secao.querySelector(`[data-classe="${classe}"]`);
      expect(botao?.textContent).toContain(`Receita 1 — ${NOME_DA_RECEITA_INICIAL[classe]}`);
    }
  });

  it('não mostra as 39 cartas da build', () => {
    montar();
    // O Construtor de Build é a Etapa 7; aqui a Receita é escolhida inteira.
    expect(screen.queryByText('Habilidades')).toBeNull();
    expect(screen.queryByText('Passivas')).toBeNull();
  });

  it('exige escolher quem começa antes de iniciar', () => {
    montar();
    expect(screen.getByTestId('iniciar-partida')).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByTestId('comeca-jogador-2'));
    expect(screen.getByTestId('iniciar-partida')).toHaveProperty('disabled', false);
  });

  it('avisa que a escolha de quem começa é só da partida local', () => {
    montar();
    expect(
      screen.getByText(
        'Escolha usada apenas para partida local; a regra competitiva ainda não foi definida.',
      ),
    ).toBeDefined();
  });

  it('entrega a configuração escolhida ao iniciar', () => {
    const aoComecar = vi.fn();
    montar(aoComecar);

    const jogador1 = screen.getByTestId('classes-jogador-1');
    fireEvent.click(jogador1.querySelector('[data-classe="patrulheiro"]')!);
    const jogador2 = screen.getByTestId('classes-jogador-2');
    fireEvent.click(jogador2.querySelector('[data-classe="druida"]')!);
    fireEvent.click(screen.getByTestId('comeca-jogador-2'));
    fireEvent.click(screen.getByTestId('iniciar-partida'));

    expect(aoComecar).toHaveBeenCalledWith({
      classeDoJogador1: 'patrulheiro',
      classeDoJogador2: 'druida',
      comeca: JOGADOR_2,
    });
  });

  it('permite as duas metades com a mesma classe', () => {
    const aoComecar = vi.fn();
    montar(aoComecar);

    for (const painel of ['classes-jogador-1', 'classes-jogador-2']) {
      const secao = screen.getByTestId(painel);
      fireEvent.click(secao.querySelector('[data-classe="monge"]')!);
    }
    fireEvent.click(screen.getByTestId('comeca-jogador-1'));
    fireEvent.click(screen.getByTestId('iniciar-partida'));

    expect(aoComecar).toHaveBeenCalledWith({
      classeDoJogador1: 'monge',
      classeDoJogador2: 'monge',
      comeca: JOGADOR_1,
    });
  });

  it('a configuração escolhida monta uma partida válida', () => {
    const partida = montarPartidaLocal({
      classeDoJogador1: 'bardo',
      classeDoJogador2: 'bardo',
      comeca: JOGADOR_1,
    });
    expect(partida.jogadores).toHaveLength(2);
    expect(partida.jogadores[0].mao).toHaveLength(8);
    expect(partida.jogadores[1].passivas).toHaveLength(4);
  });
});
