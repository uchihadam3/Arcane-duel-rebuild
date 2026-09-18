// @vitest-environment jsdom
import type { ClassId } from '@arcane-duel/shared-types';
import { CLASSES_IMPLEMENTADAS } from '@arcane-duel/card-data';
import { NOME_DA_RECEITA_INICIAL } from '@arcane-duel/gameplay/jogo';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { classeVisivel } from '../partida/apresentacao.js';
import { cartasJogaveisNaTela, montarPartida, passarOAparelho } from './apoio-de-teste.js';

/*
 * As doze classes, jogáveis pela interface.
 *
 * Não é uma partida completa por classe: é a prova de que cada Receita 1 monta,
 * renderiza o componente próprio daquela classe, mostra a mão, declara uma
 * habilidade e fecha o turno sem quebrar.
 */

describe('as doze classes abrem e jogam pela interface', () => {
  for (const classe of CLASSES_IMPLEMENTADAS) {
    it(`${classe} monta com a Receita 1 e joga uma Ação`, () => {
      montarPartida({ classeDoJogador1: classe, classeDoJogador2: 'guerreiro' });

      // A classe e o componente próprio dela estão na tela.
      const hud = screen.getByTestId('hud-proprio');
      expect(hud.textContent).toContain(classeVisivel(classe).nome);
      expect(NOME_DA_RECEITA_INICIAL[classe]).not.toBe('');

      // A mão tem as oito habilidades da Receita.
      expect(screen.getByTestId('mao').querySelectorAll('.carta')).toHaveLength(8);

      // Ao menos uma delas pode ser declarada no primeiro turno.
      const jogaveis = cartasJogaveisNaTela();
      expect(jogaveis.length).toBeGreaterThan(0);

      fireEvent.click(jogaveis[0]!);
      fireEvent.click(screen.getByText('Usar'));
      // Ou a Ação entrou no espaço, ou a carta pediu uma escolha — nunca nada.
      const entrou = screen.getByTestId('acoes-proprio').textContent ?? '';
      const pediuEscolha = screen.queryByTestId('painel-de-escolha') !== null;
      expect(entrou.includes('Aguardando Resposta') || pediuEscolha).toBe(true);

      cleanup();

      // E o turno fecha sem quebrar.
      montarPartida({ classeDoJogador1: classe, classeDoJogador2: 'guerreiro' });
      fireEvent.click(screen.getByTestId('encerrar-turno'));
      passarOAparelho();
      expect(screen.getByTestId('turno').textContent).toContain('Turno 2');
    });
  }

  it('cobre exatamente as doze classes do lançamento', () => {
    const cobertas: readonly ClassId[] = CLASSES_IMPLEMENTADAS;
    expect(cobertas).toHaveLength(12);
  });
});

describe('o componente próprio de cada classe aparece', () => {
  const ESPERADO: Readonly<Record<ClassId, string>> = {
    guerreiro: 'Momentum',
    mago: 'Mana',
    clerigo: 'Devoção',
    necromante: 'Almas',
    paladino: 'Juramento',
    ladino: 'Brechas',
    bardo: 'Notas',
    monge: 'Chi',
    patrulheiro: 'Marca da Presa',
    barbaro: 'Guarda',
    druida: 'Forma',
    bruxo: 'Preço Proibido',
  };

  for (const classe of CLASSES_IMPLEMENTADAS) {
    it(`${classe} mostra ${ESPERADO[classe]}`, () => {
      montarPartida({ classeDoJogador1: classe, classeDoJogador2: 'guerreiro' });
      expect(screen.getByTestId('hud-proprio').textContent).toContain(ESPERADO[classe]);
    });
  }
});
