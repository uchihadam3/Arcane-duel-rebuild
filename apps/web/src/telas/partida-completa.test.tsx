// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { montarPartida } from './apoio-de-teste.js';

/*
 * Uma partida inteira, do começo ao fim, pela interface.
 *
 * O laço abaixo é um jogador teimoso: ele só sabe olhar a tela e tocar no que
 * está disponível — passar o aparelho, escolher quando perguntado, responder,
 * jogar a próxima carta, encerrar o turno. Nenhuma linha dele chama o motor.
 *
 * É esse o critério da Etapa 5: uma pessoa consegue jogar a partida inteira
 * pela interface, sem terminal, sem editar estado e sem conhecer CardId.
 */

interface Placar {
  readonly passos: number;
  readonly turnos: number;
  readonly terminou: boolean;
}

/** Toca no que estiver disponível, e devolve `true` se tocou em algo. */
const darUmPasso = (): boolean => {
  // 1. A tela de troca de jogador vem antes de tudo.
  const pronto = screen.queryByTestId('estou-pronto');
  if (pronto !== null) {
    fireEvent.click(pronto);
    return true;
  }

  // 2. Uma carta perguntou alguma coisa: responde com a primeira opção legal.
  const escolha = screen.queryByTestId('painel-de-escolha');
  if (escolha !== null) {
    const opcao = escolha.querySelector('[data-teste^="escolha-"]');
    if (opcao !== null) {
      fireEvent.click(opcao);
      return true;
    }
    fireEvent.click(screen.getByTestId('cancelar-escolha'));
    return true;
  }

  // 3. Um efeito deixou uma escolha pendente: ela trava tudo até ser resolvida.
  const pendente = screen.queryByTestId('escolha-pendente');
  if (pendente !== null) {
    const opcao = pendente.querySelector('[data-teste^="pendente-"]');
    if (opcao !== null) {
      fireEvent.click(opcao);
      return true;
    }
  }

  // 4. Uma Ação chegou: o defensor decide, e a janela não é pulada sozinha.
  const semResposta = screen.queryByTestId('sem-resposta');
  if (semResposta !== null) {
    fireEvent.click(semResposta);
    return true;
  }

  // 5. A Ação declarada espera ser enviada.
  const enviar = screen.queryByTestId('enviar-acao');
  if (enviar !== null) {
    fireEvent.click(enviar);
    return true;
  }

  // 6. É a minha vez: jogo a primeira carta que a interface marca como jogável.
  const mao = screen.queryByTestId('mao');
  const jogavel = mao?.querySelector('.carta--selecionavel') ?? null;
  if (jogavel !== null) {
    fireEvent.click(jogavel);
    const usar = screen.queryByText('Usar');
    if (usar !== null && !(usar as HTMLButtonElement).disabled) {
      fireEvent.click(usar);
      return true;
    }
  }

  // 7. Nada mais a fazer neste turno.
  const encerrar = screen.queryByTestId('encerrar-turno');
  if (encerrar !== null) {
    fireEvent.click(encerrar);
    return true;
  }

  return false;
};

const jogarAteOFim = (maximoDePassos = 4000): Placar => {
  let passos = 0;
  while (passos < maximoDePassos) {
    if (screen.queryByTestId('resultado') !== null) break;
    if (!darUmPasso()) break;
    passos += 1;
  }
  const turno = screen.queryByTestId('turno')?.textContent ?? '';
  const numero = Number(/Turno (\d+)/.exec(turno)?.[1] ?? '0');
  return { passos, turnos: numero, terminou: screen.queryByTestId('resultado') !== null };
};

describe('partida completa pela interface', () => {
  it('vai da primeira Ação até a tela de vitória', () => {
    montarPartida({ classeDoJogador1: 'guerreiro', classeDoJogador2: 'mago' });

    const placar = jogarAteOFim();

    expect(placar.terminou).toBe(true);
    expect(placar.passos).toBeGreaterThan(20);

    const resultado = screen.getByTestId('resultado');
    expect(resultado.textContent).toContain('Vitória');
    expect(resultado.textContent).toContain('Turnos');
    expect(resultado.textContent).toContain('Vida restante');
    expect(resultado.textContent).toContain('Adversário');
  });

  it('oferece revanche e menu ao terminar', () => {
    montarPartida({ classeDoJogador1: 'ladino', classeDoJogador2: 'clerigo' });
    jogarAteOFim();

    expect(screen.getByTestId('revanche')).toBeDefined();
    expect(screen.getByTestId('voltar-ao-menu')).toBeDefined();
  });

  it('atravessa vários turnos, com Ações, Respostas e cooldown', () => {
    montarPartida({ classeDoJogador1: 'barbaro', classeDoJogador2: 'druida' });
    const placar = jogarAteOFim();

    expect(placar.terminou).toBe(true);
    // Mais de um turno de cada lado, e não uma corrida de uma jogada só.
    expect(placar.turnos).toBeGreaterThan(3);
  });

  it('nenhuma identidade secreta vaza no HTML durante a partida inteira', () => {
    montarPartida({ classeDoJogador1: 'monge', classeDoJogador2: 'patrulheiro' });

    for (let passo = 0; passo < 400; passo += 1) {
      if (screen.queryByTestId('resultado') !== null) break;
      // Enquanto a tela de troca está no ar, o campo inteiro está fora do DOM.
      if (screen.queryByTestId('handoff') !== null) {
        expect(screen.queryByTestId('campo')).toBeNull();
        expect(screen.queryByTestId('mao')).toBeNull();
      }
      // E em nenhum momento um CardId aparece no HTML entregue.
      expect(document.body.innerHTML).not.toMatch(
        /(?<![A-Za-z0-9_-])(?:W|M|C|N|P|L|B|K|R|BB|D|X)\d{2}(?![A-Za-z0-9_-])/,
      );
      if (!darUmPasso()) break;
    }
  });
});
