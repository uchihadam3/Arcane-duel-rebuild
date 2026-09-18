import { useEffect, useRef } from 'react';

import type { AncoraDeCampo, RegistroDeAncoras } from '../composicao/ancoras.js';

/*
 * Registra a posição de uma zona no campo.
 *
 * O VFX da Etapa 6 precisa saber de onde para onde um efeito viaja, e não pode
 * descobrir isso lendo o layout: quem sabe onde a zona está é a própria zona.
 * O ponto é normalizado sobre a área útil do campo, então o mesmo registro
 * serve para o campo em DOM de hoje e para a arena tridimensional de depois.
 */

export interface OpcoesDaAncora {
  readonly registro: RegistroDeAncoras | null;
  readonly ancora: AncoraDeCampo;
  /** O elemento que delimita a área útil do campo. */
  readonly campo: HTMLElement | null;
}

export const useAncora = <T extends HTMLElement>({
  registro,
  ancora,
  campo,
}: OpcoesDaAncora): React.RefObject<T | null> => {
  const referencia = useRef<T | null>(null);
  const chave = `${ancora.lado}:${ancora.zona}:${String(ancora.indice ?? 0)}`;

  useEffect(() => {
    const elemento = referencia.current;
    if (registro === null || elemento === null || campo === null) return;

    const area = campo.getBoundingClientRect();
    const zona = elemento.getBoundingClientRect();
    if (area.width === 0 || area.height === 0) return;

    return registro.registrar(ancora, {
      x: (zona.left + zona.width / 2 - area.left) / area.width,
      y: (zona.top + zona.height / 2 - area.top) / area.height,
    });
    // `chave` resume a âncora: registrar de novo só faz sentido quando a zona
    // que este elemento representa muda.
  }, [registro, campo, chave]); // eslint-disable-line react-hooks/exhaustive-deps

  return referencia;
};
