import { useCallback, useMemo, useState } from 'react';

import type { EstadoDoAsset } from '@arcane-duel/ui';
import { MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';

export interface InventarioDeAssets {
  readonly declarados: number;
  readonly carregados: number;
  readonly ausentes: number;
  readonly pendentes: number;
  readonly registrar: (id: string, estado: EstadoDoAsset) => void;
}

/**
 * Conta quantos assets do manifesto o navegador realmente conseguiu carregar.
 *
 * A contagem vem dos eventos reais de carregamento das imagens, não de uma
 * lista fixa: é essa a prova de que os arquivos aprovados estão publicados e
 * acessíveis pelo cliente.
 */
export const useInventarioDeAssets = (): InventarioDeAssets => {
  const [estados, setEstados] = useState<ReadonlyMap<string, EstadoDoAsset>>(new Map());

  const registrar = useCallback((id: string, estado: EstadoDoAsset) => {
    setEstados((anterior) => {
      if (anterior.get(id) === estado) return anterior;
      const proximo = new Map(anterior);
      proximo.set(id, estado);
      return proximo;
    });
  }, []);

  return useMemo(() => {
    const valores = [...estados.values()];
    const carregados = valores.filter((estado) => estado === 'carregado').length;
    const ausentes = valores.filter((estado) => estado === 'ausente').length;
    return {
      declarados: MANIFESTO_DE_ASSETS.length,
      carregados,
      ausentes,
      pendentes: MANIFESTO_DE_ASSETS.length - carregados - ausentes,
      registrar,
    };
  }, [estados, registrar]);
};
