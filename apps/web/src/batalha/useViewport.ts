import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

import type { Viewport } from '../arena/camera.js';

/*
 * O tamanho da área da arena, medido.
 *
 * A projeção precisa saber em quantos pixels ela está desenhando, e esse
 * número muda quando o telefone gira, quando a barra do navegador some e
 * quando a janela é redimensionada. Medir é a única forma honesta.
 */

/**
 * A régua usada enquanto não há medida.
 *
 * Em jsdom todo elemento tem tamanho zero, e uma projeção sobre zero não
 * posicionaria nada. Este par não aparece para ninguém: no navegador a medida
 * real chega no primeiro layout.
 */
export const VIEWPORT_DE_REFERENCIA: Viewport = { largura: 844, altura: 390 };

export const useViewport = (alvo: RefObject<HTMLElement | null>): Viewport => {
  const [medida, setMedida] = useState<Viewport>({ largura: 0, altura: 0 });

  useEffect(() => {
    const elemento = alvo.current;
    if (elemento === null) return;

    const medir = (): void => {
      setMedida((atual) => {
        const largura = elemento.clientWidth;
        const altura = elemento.clientHeight;
        return atual.largura === largura && atual.altura === altura ? atual : { largura, altura };
      });
    };
    medir();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => {
        window.removeEventListener('resize', medir);
      };
    }
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => {
      observador.disconnect();
    };
  }, [alvo]);

  return medida.largura > 0 && medida.altura > 0 ? medida : VIEWPORT_DE_REFERENCIA;
};
