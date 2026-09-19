// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  cartasJogaveisNaTela,
  focarPrimeiraJogavel,
  montarPartida,
  passarOAparelho,
  textoDaTela,
} from './apoio-de-teste.js';

/*
 * A partida local, operada pela interface.
 *
 * Nenhum teste aqui conhece CardId nem chama o motor por baixo: tudo acontece
 * tocando nos mesmos botões que uma pessoa tocaria.
 */

describe('abertura da partida', () => {
  it('abre com o campo montado e o turno 1 do Jogador 1', () => {
    montarPartida();
    expect(screen.getByTestId('campo')).toBeDefined();
    expect(screen.getByTestId('turno').textContent).toContain('Turno 1');
    expect(screen.getByTestId('turno').textContent).toContain('Jogador 1');
  });

  it('mostra Vida, Guarda, AP, Reserva e Ações dos dois lados', () => {
    montarPartida();
    for (const lado of ['proprio', 'adversario']) {
      const hud = screen.getByTestId(`hud-${lado}`);
      expect(hud.textContent).toContain('Vida');
      expect(hud.textContent).toContain('Guarda');
      expect(hud.textContent).toContain('AP');
      expect(hud.textContent).toContain('Reserva');
      expect(screen.getByTestId(`acoes-usadas-${lado}`).textContent).toContain('0/3');
    }
  });

  it('mostra cooldown, Condições, Passivas, Cartas de Classe e Ultimate', () => {
    montarPartida();
    expect(screen.getAllByTestId('cooldown')).toHaveLength(2);
    expect(screen.getAllByTestId('condicoes').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('passivas-proprio')).toBeDefined();
    expect(screen.getByTestId('classe-proprio')).toBeDefined();
    expect(screen.getByTestId('acoes-proprio')).toBeDefined();
  });

  it('mostra a mão com oito cartas e nenhuma identificada por código', () => {
    montarPartida();
    const mao = screen.getByTestId('mao');
    expect(mao.querySelectorAll('.carta')).toHaveLength(8);
    // Nome humano, nunca "W02".
    expect(mao.textContent).not.toMatch(/\bW\d{2}\b/);
  });
});

describe('privacidade hot-seat', () => {
  it('a mão do adversário não aparece na tela', () => {
    montarPartida();
    const adversario = screen.getByTestId('hud-adversario');
    expect(adversario.textContent).not.toContain('Dardo Arcano');
    // A mão do Mago não existe em lugar nenhum da página.
    expect(textoDaTela()).not.toContain('Bola de Fogo');
  });

  it('a troca cobre o aparelho antes de revelar o outro jogador', () => {
    montarPartida();
    fireEvent.click(screen.getByTestId('encerrar-turno'));

    // Agora é a vez do Jogador 2, e a tela de troca está no ar.
    expect(screen.getByTestId('handoff')).toBeDefined();
    // O campo não está renderizado: não é opacidade, é ausência.
    expect(screen.queryByTestId('campo')).toBeNull();
    expect(screen.queryByTestId('mao')).toBeNull();
  });

  it('só depois de confirmar a mão do outro jogador aparece', () => {
    montarPartida();
    fireEvent.click(screen.getByTestId('encerrar-turno'));
    expect(screen.queryByTestId('mao')).toBeNull();

    passarOAparelho();
    expect(screen.getByTestId('mao')).toBeDefined();
    // E agora é a mão do Mago que está na tela, não a do Guerreiro.
    expect(screen.getByTestId('mao').textContent).toContain('Dardo Arcano');
  });

  it('a mão de quem saiu do aparelho some da página', () => {
    montarPartida();
    const antes = screen.getByTestId('mao').textContent ?? '';
    expect(antes).toContain('Ombro de Guerra');

    fireEvent.click(screen.getByTestId('encerrar-turno'));
    passarOAparelho();

    expect(textoDaTela()).not.toContain('Ombro de Guerra');
  });

  it('as Passivas ocultas do adversário aparecem como verso', () => {
    montarPartida();
    const passivas = screen.getByTestId('passivas-adversario');
    expect(passivas.querySelectorAll('.carta--virada').length).toBeGreaterThan(0);
    expect(passivas.textContent).toContain('oculta');
  });
});

describe('uma Ação, do toque à resolução', () => {
  it('tocar numa carta abre a inspeção com o texto dela', () => {
    montarPartida();
    const nome = focarPrimeiraJogavel();
    const inspetor = screen.getByTestId('inspetor');
    expect(inspetor.textContent).toContain(nome);
    expect(inspetor.textContent).toContain('Custo');
  });

  it('marca as cartas que dá para jogar agora', () => {
    montarPartida();
    expect(cartasJogaveisNaTela().length).toBeGreaterThan(0);
  });

  it('usar a carta a coloca no espaço de Ação', () => {
    montarPartida();
    const nome = focarPrimeiraJogavel();
    fireEvent.click(screen.getByText('Usar'));

    expect(screen.getByTestId('acoes-proprio').textContent).toContain(nome);
    expect(screen.getByTestId('acoes-proprio').textContent).toContain('Aguardando Resposta');
  });

  it('a janela de Resposta não é pulada em silêncio', () => {
    montarPartida();
    focarPrimeiraJogavel();
    fireEvent.click(screen.getByText('Usar'));
    fireEvent.click(screen.getByTestId('enviar-acao'));
    passarOAparelho();

    const painel = screen.getByTestId('painel-de-resposta');
    expect(painel.textContent).toContain('Ação recebida');
    expect(screen.getByTestId('sem-resposta')).toBeDefined();
  });

  it('Sem Resposta resolve a Ação, e a carta fica no espaço até o fim do turno', () => {
    montarPartida();
    const nome = focarPrimeiraJogavel();
    fireEvent.click(screen.getByText('Usar'));
    fireEvent.click(screen.getByTestId('enviar-acao'));
    passarOAparelho();
    fireEvent.click(screen.getByTestId('sem-resposta'));
    passarOAparelho();

    // O efeito já aconteceu, e a carta **continua** no espaço de Ação dela.
    const acoes = screen.getByTestId('acoes-proprio');
    expect(acoes.textContent).toContain('Resolvida');
    expect(acoes.textContent).toContain(nome);

    // E ela ainda não desceu para o cooldown: isso só acontece no encerramento.
    expect(screen.getAllByTestId('cooldown')[1]?.textContent).not.toContain(nome);
  });

  it('a carta usada só entra no cooldown quando o turno encerra', () => {
    montarPartida();
    const nome = focarPrimeiraJogavel();
    fireEvent.click(screen.getByText('Usar'));
    fireEvent.click(screen.getByTestId('enviar-acao'));
    passarOAparelho();
    fireEvent.click(screen.getByTestId('sem-resposta'));
    passarOAparelho();

    fireEvent.click(screen.getByTestId('encerrar-turno'));
    passarOAparelho();

    // O aparelho é do outro jogador agora: a carta aparece no cooldown dele,
    // e o espaço de Ação do turno que passou está limpo.
    expect(screen.getAllByTestId('cooldown')[0]?.textContent).toContain(nome);
    expect(screen.getByTestId('acoes-adversario').textContent).not.toContain(nome);
  });

  it('a Defesa Inata aparece como opção, e não como carta', () => {
    montarPartida();
    focarPrimeiraJogavel();
    fireEvent.click(screen.getByText('Usar'));
    fireEvent.click(screen.getByTestId('enviar-acao'));
    passarOAparelho();

    const defesa = screen.getByTestId('defesa-inata');
    expect(defesa.textContent).toContain('Defesa Inata');
    expect(defesa.closest('.carta')).toBeNull();
  });
});

describe('turnos', () => {
  it('a contagem de Ações sobe depois de resolver', () => {
    montarPartida();
    expect(screen.getByTestId('acoes-usadas-proprio').textContent).toContain('0/3');

    focarPrimeiraJogavel();
    fireEvent.click(screen.getByText('Usar'));
    fireEvent.click(screen.getByTestId('enviar-acao'));
    passarOAparelho();
    fireEvent.click(screen.getByTestId('sem-resposta'));
    passarOAparelho();

    expect(screen.getByTestId('acoes-usadas-proprio').textContent).toContain('1/3');
  });

  it('encerrar o turno passa a vez e anuncia o novo turno', () => {
    montarPartida();
    fireEvent.click(screen.getByTestId('encerrar-turno'));
    expect(screen.getByTestId('handoff').textContent).toContain('Jogador 2');

    passarOAparelho();
    expect(screen.getByTestId('turno').textContent).toContain('Turno 2');
    expect(screen.getByTestId('banner-de-turno').textContent).toContain('Jogador 2');
  });

  it('quem não é da vez não vê o botão de encerrar turno', () => {
    montarPartida();
    focarPrimeiraJogavel();
    fireEvent.click(screen.getByText('Usar'));
    fireEvent.click(screen.getByTestId('enviar-acao'));
    passarOAparelho();

    expect(screen.queryByTestId('encerrar-turno')).toBeNull();
  });
});

describe('menu e abandono', () => {
  it('o menu pergunta antes de abandonar', () => {
    montarPartida();
    fireEvent.click(screen.getByTestId('menu-da-partida'));
    expect(screen.getByTestId('menu-aberto').textContent).toContain('Abandonar esta partida?');
    expect(screen.getByTestId('abandonar')).toBeDefined();
  });

  it('cancelar fecha o menu e a partida continua', () => {
    montarPartida();
    fireEvent.click(screen.getByTestId('menu-da-partida'));
    fireEvent.click(screen.getAllByText('Cancelar')[0]!);
    expect(screen.queryByTestId('menu-aberto')).toBeNull();
    expect(screen.getByTestId('campo')).toBeDefined();
  });
});

describe('a tela não mostra estado cru', () => {
  it('nenhum JSON, versão de regras ou nome de função na batalha', () => {
    montarPartida();
    const texto = textoDaTela();
    expect(texto).not.toContain('rulesVersion');
    expect(texto).not.toContain('{"');
    expect(texto).not.toContain('EstadoDaPartida');
    expect(texto).not.toMatch(/\btipo:\s/);
  });
});
