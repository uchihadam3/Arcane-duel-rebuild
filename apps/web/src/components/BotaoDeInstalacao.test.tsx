// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BotaoDeInstalacao } from './BotaoDeInstalacao.js';
import type { EventoDeInstalacao } from '../hooks/useInstalacao.js';

interface EventoFalso extends EventoDeInstalacao {
  readonly prompt: ReturnType<typeof vi.fn>;
}

const criarEvento = (escolha: 'accepted' | 'dismissed'): EventoFalso => {
  const evento = new Event('beforeinstallprompt', { cancelable: true }) as unknown as {
    platforms: readonly string[];
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt: ReturnType<typeof vi.fn>;
  };
  evento.platforms = ['web'];
  evento.userChoice = Promise.resolve({ outcome: escolha, platform: 'web' });
  evento.prompt = vi.fn(() => Promise.resolve());
  return evento as unknown as EventoFalso;
};

const anunciarQuePodeInstalar = (evento: EventoDeInstalacao): void => {
  act(() => {
    window.dispatchEvent(evento);
  });
};

const agenteOriginal = navigator.userAgent;

const fingirAgente = (valor: string): void => {
  Object.defineProperty(navigator, 'userAgent', { value: valor, configurable: true });
};

afterEach(() => {
  fingirAgente(agenteOriginal);
});

describe('botão de instalação', () => {
  it('não aparece antes de o navegador dizer que dá para instalar', () => {
    render(<BotaoDeInstalacao />);
    expect(screen.queryByRole('button', { name: 'Instalar Arcane Duel' })).toBeNull();
  });

  it('não abre o prompt sozinho: apenas captura o evento e mostra o botão', () => {
    render(<BotaoDeInstalacao />);
    const evento = criarEvento('accepted');
    anunciarQuePodeInstalar(evento);

    expect(screen.getByRole('button', { name: 'Instalar Arcane Duel' })).toBeDefined();
    expect(evento.prompt).not.toHaveBeenCalled();
  });

  it('impede o navegador de abrir o prompt por conta própria', () => {
    render(<BotaoDeInstalacao />);
    const evento = criarEvento('accepted');
    anunciarQuePodeInstalar(evento);
    expect(evento.defaultPrevented).toBe(true);
  });

  it('chama o prompt do navegador quando o jogador aperta o botão', async () => {
    render(<BotaoDeInstalacao />);
    const evento = criarEvento('accepted');
    anunciarQuePodeInstalar(evento);

    await act(async () => {
      screen.getByRole('button', { name: 'Instalar Arcane Duel' }).click();
      // Deixa o ciclo de microtarefas do prompt começar dentro do act.
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(evento.prompt).toHaveBeenCalledTimes(1);
    });
  });

  it('esconde o botão depois da instalação aceita', async () => {
    render(<BotaoDeInstalacao />);
    anunciarQuePodeInstalar(criarEvento('accepted'));

    await act(async () => {
      screen.getByRole('button', { name: 'Instalar Arcane Duel' }).click();
      // Deixa o ciclo de microtarefas do prompt começar dentro do act.
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Instalar Arcane Duel' })).toBeNull();
    });
    expect(screen.queryByText(/Instalação recusada/)).toBeNull();
  });

  it('avisa sem insistir quando o jogador recusa', async () => {
    render(<BotaoDeInstalacao />);
    anunciarQuePodeInstalar(criarEvento('dismissed'));

    await act(async () => {
      screen.getByRole('button', { name: 'Instalar Arcane Duel' }).click();
      // Deixa o ciclo de microtarefas do prompt começar dentro do act.
      await Promise.resolve();
    });

    expect(await screen.findByText(/Instalação recusada/)).toBeDefined();
  });

  it('some de vez quando o sistema avisa que o app foi instalado', () => {
    render(<BotaoDeInstalacao />);
    anunciarQuePodeInstalar(criarEvento('accepted'));
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.queryByRole('button', { name: 'Instalar Arcane Duel' })).toBeNull();
  });

  it('no iPhone mostra o caminho manual, não um instalador falso', () => {
    fingirAgente(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
    );
    render(<BotaoDeInstalacao />);
    expect(
      screen.getByText('Para instalar: Compartilhar → Adicionar à Tela de Início.'),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Instalar Arcane Duel' })).toBeNull();
  });

  it('não oferece nada em navegador que não instala', () => {
    fingirAgente('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Firefox/128.0');
    const { container } = render(<BotaoDeInstalacao />);
    expect(container.textContent).toBe('');
  });
});
