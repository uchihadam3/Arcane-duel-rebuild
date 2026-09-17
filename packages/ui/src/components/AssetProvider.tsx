import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { criarResolvedorEstatico } from '../assets/resolver.js';
import type { ResolvedorDeAssets } from '../assets/resolver.js';

const ContextoDeAssets = createContext<ResolvedorDeAssets | null>(null);

export interface AssetProviderProps {
  readonly children: ReactNode;
  /** Prefixo de publicação da aplicação, normalmente `import.meta.env.BASE_URL`. */
  readonly base?: string;
  /** Resolvedor alternativo, usado em testes ou para servir de uma CDN. */
  readonly resolvedor?: ResolvedorDeAssets;
}

export const AssetProvider = ({
  children,
  base,
  resolvedor,
}: AssetProviderProps): React.JSX.Element => {
  const valor = useMemo(
    () => resolvedor ?? criarResolvedorEstatico(base === undefined ? {} : { base }),
    [resolvedor, base],
  );

  return <ContextoDeAssets.Provider value={valor}>{children}</ContextoDeAssets.Provider>;
};

export const useResolvedorDeAssets = (): ResolvedorDeAssets => {
  const resolvedor = useContext(ContextoDeAssets);
  if (resolvedor === null) {
    throw new Error('useResolvedorDeAssets precisa ser usado dentro de <AssetProvider>.');
  }
  return resolvedor;
};
