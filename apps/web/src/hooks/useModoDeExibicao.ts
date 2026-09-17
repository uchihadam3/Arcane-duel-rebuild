import { useEffect, useState } from 'react';

export type ModoDeExibicao = 'standalone' | 'navegador';

const CONSULTA = '(display-mode: standalone)';

const lerModo = (): ModoDeExibicao => {
  // Safari no iOS não implementa `display-mode: standalone`; ele marca a
  // aplicação instalada em `navigator.standalone`.
  if (navigator.standalone === true) return 'standalone';
  return window.matchMedia(CONSULTA).matches ? 'standalone' : 'navegador';
};

/** Distingue a PWA instalada (standalone) de uma aba comum do navegador. */
export const useModoDeExibicao = (): ModoDeExibicao => {
  const [modo, setModo] = useState<ModoDeExibicao>(lerModo);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA);
    const aoMudar = (): void => {
      setModo(lerModo());
    };
    consulta.addEventListener('change', aoMudar);
    return () => {
      consulta.removeEventListener('change', aoMudar);
    };
  }, []);

  return modo;
};
