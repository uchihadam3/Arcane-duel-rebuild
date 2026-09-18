// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { focarPrimeiraJogavel, montarPartida, passarOAparelho } from './apoio-de-teste.js';

/*
 * As peças do campo, operadas pela interface.
 *
 * Cartas de Classe, Passivas, Ultimate, cooldown e Condições. O que cada teste
 * confere é o que o jogador precisa conseguir ler e fazer — não como o estado
 * está guardado.
 */

/** Leva a partida até a janela em que complementos são possíveis. */
const declararUmaAcao = (): void => {
  focarPrimeiraJogavel();
  fireEvent.click(screen.getByText('Usar'));
};

describe('Cartas de Classe', () => {
  it('começam face-up e Prontas, nos dois lados', () => {
    montarPartida();
    for (const lado of ['proprio', 'adversario']) {
      const area = screen.getByTestId(`classe-${lado}`);
      expect(area.querySelectorAll('.slot')).toHaveLength(2);
      expect(area.textContent).toContain('Pronta');
    }
  });

  it('oferecem Ativar e Exaurir quando há Ação declarada', () => {
    montarPartida();
    declararUmaAcao();

    const area = screen.getByTestId('classe-proprio');
    fireEvent.click(area.querySelectorAll('.carta')[0] as HTMLElement);

    expect(screen.getByText('Ativar')).toBeDefined();
    expect(screen.getByText('Exaurir')).toBeDefined();
  });

  it('Exaurir pede confirmação, porque é irreversível', () => {
    montarPartida();
    declararUmaAcao();

    const area = screen.getByTestId('classe-proprio');
    fireEvent.click(area.querySelectorAll('.carta')[0] as HTMLElement);
    fireEvent.click(screen.getByText('Exaurir'));

    const confirmacao = screen.getByTestId('confirmacao');
    expect(confirmacao.textContent).toContain('permanentemente');
    expect(confirmacao.textContent).toContain('não volta');
  });

  it('Ativar não pede confirmação, porque é renovável', () => {
    montarPartida();
    declararUmaAcao();

    const area = screen.getByTestId('classe-proprio');
    fireEvent.click(area.querySelectorAll('.carta')[0] as HTMLElement);
    fireEvent.click(screen.getByText('Ativar'));

    expect(screen.queryByTestId('confirmacao')).toBeNull();
  });

  it('Ativada aparece deitada e com o estado escrito', () => {
    montarPartida();
    declararUmaAcao();

    const area = screen.getByTestId('classe-proprio');
    fireEvent.click(area.querySelectorAll('.carta')[0] as HTMLElement);
    fireEvent.click(screen.getByText('Ativar'));

    const depois = screen.getByTestId('classe-proprio');
    expect(depois.textContent).toContain('Ativada');
    expect(depois.querySelectorAll('.carta--deitada').length).toBeGreaterThan(0);
  });

  it('Exaurir ou sai da partida, ou é recusado com um motivo legível', () => {
    montarPartida();
    declararUmaAcao();

    const area = screen.getByTestId('classe-proprio');
    fireEvent.click(area.querySelectorAll('.carta')[0] as HTMLElement);
    fireEvent.click(screen.getByText('Exaurir'));
    fireEvent.click(screen.getByTestId('confirmar'));

    const depois = screen.getByTestId('classe-proprio');
    const erro = screen.queryByTestId('erro');
    if (erro === null) {
      // Saiu do campo em definitivo, e a tela diz isso por escrito: a carta
      // deixa de ocupar o slot e passa a constar como fora da partida.
      expect(depois.textContent).toContain('Saiu da partida');
      expect(depois.querySelectorAll('.carta')).toHaveLength(1);
    } else {
      // Recusado — mas nunca com "Erro." nem com um código.
      expect(erro.textContent).not.toContain('{');
      expect((erro.textContent ?? '').length).toBeGreaterThan(8);
    }
  });
});

describe('Passivas', () => {
  it('as quatro aparecem, e o dono enxerga as próprias mesmo ocultas', () => {
    montarPartida();
    const area = screen.getByTestId('passivas-proprio');
    expect(area.querySelectorAll('.slot')).toHaveLength(4);
    // A Passiva ainda não revelada é secreta **do adversário**, não do dono.
    expect(area.textContent).toContain('oculta');
    expect(area.querySelectorAll('.carta').length).toBe(4);
  });

  it('a Passiva do adversário oculta não vaza o nome', () => {
    montarPartida();
    const area = screen.getByTestId('passivas-adversario');
    expect(area.querySelectorAll('img[data-asset-id="card-back"]').length).toBe(4);
    expect(area.textContent).not.toContain('Reserva Arcana');
  });

  it('nunca oferece Exaurir para uma Passiva', () => {
    montarPartida();
    declararUmaAcao();
    // Passiva não Exaure: a única ação possível é Ativar.
    const area = screen.getByTestId('passivas-proprio');
    expect(within(area).queryByText('Exaurir')).toBeNull();
  });
});

describe('Ultimate', () => {
  it('fica sempre visível e marcada como disponível', () => {
    montarPartida();
    const proprio = screen.getByTestId('campo').querySelector('.ultimate--proprio');
    expect(proprio?.textContent).toContain('Disponível');
  });

  it('pede confirmação antes de consumir', () => {
    // O Bárbaro abre com Guarda alta e AP cheio; a Ultimate dele é alcançável.
    montarPartida({ classeDoJogador1: 'guerreiro', classeDoJogador2: 'mago' });
    const proprio = screen.getByTestId('campo').querySelector('.ultimate--proprio');
    const carta = proprio?.querySelector('.carta');
    if (carta === null || carta === undefined) throw new Error('Ultimate sem carta');
    fireEvent.click(carta);

    const botao = screen.getByText('Usar Ultimate');
    expect(botao).toBeDefined();
    if (!(botao as HTMLButtonElement).disabled) {
      fireEvent.click(botao);
      expect(screen.getByTestId('confirmacao').textContent).toContain('uma vez nesta partida');
    }
  });
});

describe('Condições e cooldown', () => {
  it('as quatro Condições aparecem sempre, mesmo em zero', () => {
    montarPartida();
    const bandeja = screen.getAllByTestId('condicoes')[0];
    for (const condicao of ['queimadura', 'lento', 'murchar', 'sangramento']) {
      expect(bandeja?.querySelector(`[data-condicao="${condicao}"]`)).not.toBeNull();
    }
  });

  it('as três zonas de cooldown aparecem rotuladas', () => {
    montarPartida();
    const cooldown = screen.getAllByTestId('cooldown')[0];
    for (const zona of ['CD1', 'CD2', 'CD3']) {
      expect(cooldown?.querySelector(`[data-zona="${zona}"]`)).not.toBeNull();
    }
  });

  it('o cooldown avança no início do turno, sem esperar animação', () => {
    montarPartida();
    const nome = focarPrimeiraJogavel();
    fireEvent.click(screen.getByText('Usar'));
    fireEvent.click(screen.getByTestId('enviar-acao'));
    passarOAparelho();
    fireEvent.click(screen.getByTestId('sem-resposta'));
    passarOAparelho();

    const meuCooldown = screen.getAllByTestId('cooldown')[1];
    expect(meuCooldown?.textContent).toContain(nome);
  });
});
