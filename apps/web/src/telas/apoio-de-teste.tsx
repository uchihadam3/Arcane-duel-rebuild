import type { ClassId, PlayerId } from '@arcane-duel/shared-types';
import { AssetProvider } from '@arcane-duel/ui';
import { fireEvent, render, screen } from '@testing-library/react';

import { JOGADOR_1 } from '../partida/controlador.js';
import { PartidaLocal } from './PartidaLocal.js';

/*
 * Apoio dos testes de interface da partida.
 *
 * Ele monta a tela de verdade e opera os mesmos controles que uma pessoa
 * operaria: nenhum teste aqui chama o motor pelas costas da interface.
 */

export interface OpcoesDaPartidaDeTeste {
  readonly classeDoJogador1?: ClassId;
  readonly classeDoJogador2?: ClassId;
  readonly comeca?: PlayerId;
  readonly semente?: string;
}

export const montarPartida = (opcoes: OpcoesDaPartidaDeTeste = {}): void => {
  render(
    <AssetProvider base="/">
      <PartidaLocal
        configuracao={{
          classeDoJogador1: opcoes.classeDoJogador1 ?? 'guerreiro',
          classeDoJogador2: opcoes.classeDoJogador2 ?? 'mago',
          comeca: opcoes.comeca ?? JOGADOR_1,
        }}
        semente={opcoes.semente ?? 'teste'}
        aoSair={() => undefined}
        aoRevanche={() => undefined}
      />
    </AssetProvider>,
  );
};

/** Confirma a tela de troca de jogador, quando ela estiver no ar. */
export const passarOAparelho = (): void => {
  const botao = screen.queryByTestId('estou-pronto');
  if (botao !== null) fireEvent.click(botao);
};

/** As cartas da mão que a interface marca como jogáveis agora. */
export const cartasJogaveisNaTela = (): readonly HTMLElement[] =>
  [...screen.getByTestId('mao').querySelectorAll('.carta--selecionavel')].filter(
    (elemento): elemento is HTMLElement => elemento instanceof HTMLElement,
  );

/** Foca a primeira carta jogável e devolve o nome dela. */
export const focarPrimeiraJogavel = (): string => {
  const primeira = cartasJogaveisNaTela()[0];
  if (primeira === undefined) throw new Error('nenhuma carta jogável na mão');
  fireEvent.click(primeira);
  return primeira.getAttribute('data-carta') ?? '';
};

/** O texto inteiro da página, como um observador o receberia. */
export const textoDaTela = (): string => document.body.textContent ?? '';

/** O HTML serializado da página — o que sairia pelo fio até o cliente. */
export const htmlDaTela = (): string => document.body.innerHTML;
