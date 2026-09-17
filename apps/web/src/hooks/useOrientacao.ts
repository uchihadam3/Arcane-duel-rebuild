import { useEffect, useState } from 'react';

export type Orientacao = 'landscape' | 'portrait';

const lerOrientacao = (): Orientacao =>
  window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';

/**
 * A batalha é desenhada primeiro para landscape. Este hook observa a orientação
 * para que a interface possa pedir a rotação em vez de comprimir o campo.
 */
export const useOrientacao = (): Orientacao => {
  const [orientacao, setOrientacao] = useState<Orientacao>(lerOrientacao);

  useEffect(() => {
    const consulta = window.matchMedia('(orientation: portrait)');
    const aoMudar = (): void => {
      setOrientacao(consulta.matches ? 'portrait' : 'landscape');
    };
    consulta.addEventListener('change', aoMudar);
    return () => {
      consulta.removeEventListener('change', aoMudar);
    };
  }, []);

  return orientacao;
};
