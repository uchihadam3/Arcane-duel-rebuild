import { useEffect, useState } from 'react';

export type ModoDeExibicao = 'standalone' | 'navegador';

const lerModo = (): ModoDeExibicao =>
  window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'navegador';

/** Distingue a PWA instalada (standalone) de uma aba comum do navegador. */
export const useModoDeExibicao = (): ModoDeExibicao => {
  const [modo, setModo] = useState<ModoDeExibicao>(lerModo);

  useEffect(() => {
    const consulta = window.matchMedia('(display-mode: standalone)');
    const aoMudar = (): void => {
      setModo(consulta.matches ? 'standalone' : 'navegador');
    };
    consulta.addEventListener('change', aoMudar);
    return () => {
      consulta.removeEventListener('change', aoMudar);
    };
  }, []);

  return modo;
};
