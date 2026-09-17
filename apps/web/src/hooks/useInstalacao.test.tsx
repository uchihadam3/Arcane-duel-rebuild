// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInstalacao } from './useInstalacao.js';

const criarEvento = (escolha: 'accepted' | 'dismissed'): Event => {
  const evento = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(evento, {
    platforms: ['web'] as readonly string[],
    userChoice: Promise.resolve({ outcome: escolha, platform: 'web' }),
    prompt: vi.fn(() => Promise.resolve()),
  });
};

const standaloneOriginal = Object.getOwnPropertyDescriptor(Navigator.prototype, 'standalone');

afterEach(() => {
  if (standaloneOriginal === undefined) {
    Reflect.deleteProperty(navigator, 'standalone');
  }
});

describe('estado de instalação', () => {
  it('começa indisponível em navegador de desktop comum', () => {
    const { result } = renderHook(() => useInstalacao());
    expect(result.current.forma).toBe('indisponivel');
    expect(result.current.podeOferecer).toBe(false);
  });

  it('passa a oferecer o prompt quando o navegador avisa', () => {
    const { result } = renderHook(() => useInstalacao());
    act(() => {
      window.dispatchEvent(criarEvento('accepted'));
    });
    expect(result.current.forma).toBe('prompt-do-navegador');
    expect(result.current.podeOferecer).toBe(true);
  });

  it('devolve "aceita" e "recusada" conforme a escolha do jogador', async () => {
    const { result } = renderHook(() => useInstalacao());

    act(() => {
      window.dispatchEvent(criarEvento('accepted'));
    });
    await act(async () => {
      await expect(result.current.instalar()).resolves.toBe('aceita');
    });

    act(() => {
      window.dispatchEvent(criarEvento('dismissed'));
    });
    await act(async () => {
      await expect(result.current.instalar()).resolves.toBe('recusada');
    });
  });

  it('não tenta instalar quando não há evento guardado', async () => {
    const { result } = renderHook(() => useInstalacao());
    await act(async () => {
      await expect(result.current.instalar()).resolves.toBe('indisponivel');
    });
  });

  it('reconhece que já está instalado quando o iOS marca standalone', () => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    const { result } = renderHook(() => useInstalacao());
    expect(result.current.forma).toBe('ja-instalado');
    expect(result.current.podeOferecer).toBe(false);
  });
});
