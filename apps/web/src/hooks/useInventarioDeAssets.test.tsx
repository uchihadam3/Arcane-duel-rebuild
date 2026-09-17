// @vitest-environment jsdom
import { MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useInventarioDeAssets } from './useInventarioDeAssets.js';

describe('inventário de assets', () => {
  it('começa com tudo pendente', () => {
    const { result } = renderHook(() => useInventarioDeAssets());
    expect(result.current.declarados).toBe(MANIFESTO_DE_ASSETS.length);
    expect(result.current.carregados).toBe(0);
    expect(result.current.pendentes).toBe(MANIFESTO_DE_ASSETS.length);
  });

  it('conta carregados e ausentes separadamente', () => {
    const { result } = renderHook(() => useInventarioDeAssets());
    act(() => {
      result.current.registrar('arena', 'carregado');
      result.current.registrar('slot-passiva', 'ausente');
    });
    expect(result.current.carregados).toBe(1);
    expect(result.current.ausentes).toBe(1);
    expect(result.current.pendentes).toBe(MANIFESTO_DE_ASSETS.length - 2);
  });

  it('não conta o mesmo asset duas vezes', () => {
    const { result } = renderHook(() => useInventarioDeAssets());
    act(() => {
      result.current.registrar('arena', 'carregado');
      result.current.registrar('arena', 'carregado');
    });
    expect(result.current.carregados).toBe(1);
  });
});
