import { useEffect, useRef, useState } from 'react';

/*
 * Um valor que espera o beat dele.
 *
 * O motor resolve o lance inteiro de uma vez: quando o log chega, a Vida já
 * caiu, a Guarda já quebrou e o AP já foi gasto. Se o HUD lesse esse estado
 * direto, o número se mexeria **enquanto a carta ainda está no ar** — o
 * jogador via o resultado antes de ver a causa, que é contar o fim da
 * história durante a primeira frase.
 *
 * Este gancho segura o valor anterior até o instante que a fila reservou para
 * o beat de resultado, e então o solta. Ele não atrasa a regra: o estado
 * canônico já mudou, e o que espera é só o desenho.
 *
 * O `lote` é o que torna isso confiável. O valor novo e os marcos novos
 * chegam em commits diferentes — os marcos nascem numa medição de layout —,
 * então comparar só o relógio deixaria uma janela em que o valor novo é
 * liberado contra um marco velho. Com o lote, o valor só é solto quando os
 * dois falam do mesmo lance.
 */

const agora = (): number => (typeof performance === 'undefined' ? 0 : performance.now());

export interface BeatDeLiberacao {
  /** O lote a que este instante pertence. */
  readonly lote: number;
  /** Quando o valor pode aparecer. `null` é "agora": não há beat a esperar. */
  readonly emMs: number | null;
}

export const useValorNoBeat = <T>(valor: T, lote: number, beat: BeatDeLiberacao): T => {
  const mostrado = useRef<{ lote: number; valor: T }>({ lote, valor });
  const [, redesenhar] = useState(0);

  const doMesmoLance = beat.lote === lote;
  const naHora = beat.emMs === null || agora() >= beat.emMs;

  if (mostrado.current.lote !== lote && doMesmoLance && naHora) {
    mostrado.current = { lote, valor };
  } else if (mostrado.current.lote === lote) {
    // Mesmo lance: o valor pode ter sido recalculado, e isso não é um lance novo.
    mostrado.current = { lote, valor };
  }

  useEffect(() => {
    if (!doMesmoLance || beat.emMs === null) return;
    const espera = beat.emMs - agora();
    if (espera <= 0) return;
    const bilhete = setTimeout(() => {
      redesenhar((contador) => contador + 1);
    }, espera);
    return () => {
      clearTimeout(bilhete);
    };
  }, [beat.emMs, doMesmoLance, lote]);

  return mostrado.current.valor;
};
