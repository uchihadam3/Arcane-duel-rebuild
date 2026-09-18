import { useEffect, useRef } from 'react';
import type { LadoDoCampo, RegistroDeAncoras } from '@arcane-duel/ui';
import { criarRegistroDeAncoras } from '@arcane-duel/ui';
import type { Zona } from '@arcane-duel/shared-types';

/*
 * O registro das zonas do campo.
 *
 * A Etapa 6 vai fazer efeitos viajarem entre zonas, e o VFX não pode descobrir
 * onde elas estão lendo o layout — nem depender de coordenadas escolhidas à
 * mão para um modelo de telefone. Cada zona se declara no DOM com um atributo,
 * e o campo mede todas de uma vez, em coordenadas normalizadas sobre a própria
 * área útil.
 *
 * Isso vale tanto para o campo em DOM de hoje quanto para a arena
 * tridimensional de depois: só muda quem preenche o registro.
 */

/** O atributo que uma zona usa para se declarar mensurável. */
export const atributoDaAncora = (
  lado: LadoDoCampo,
  zona: Zona,
  indice = 0,
): { readonly 'data-ancora': string } => ({
  'data-ancora': `${lado}:${zona}:${String(indice)}`,
});

const interpretar = (
  valor: string,
): { readonly lado: LadoDoCampo; readonly zona: Zona; readonly indice: number } | null => {
  const [lado, zona, indice] = valor.split(':');
  if (lado !== 'proprio' && lado !== 'adversario') return null;
  if (zona === undefined || indice === undefined) return null;
  return { lado, zona: zona as Zona, indice: Number(indice) };
};

export interface AncorasDoCampo {
  readonly campo: React.RefObject<HTMLDivElement | null>;
  readonly registro: RegistroDeAncoras;
}

/**
 * Mede e registra todas as zonas declaradas dentro do campo.
 *
 * A medição roda depois de cada layout relevante; o registro é substituído por
 * inteiro, então uma zona que sai do campo também sai do registro.
 */
export const useAncorasDoCampo = (dependencia: unknown): AncorasDoCampo => {
  const campo = useRef<HTMLDivElement | null>(null);
  const registro = useRef<RegistroDeAncoras>(criarRegistroDeAncoras());

  useEffect(() => {
    const area = campo.current;
    if (area === null) return;

    const medir = (): (() => void) => {
      const limites = area.getBoundingClientRect();
      if (limites.width === 0 || limites.height === 0) return () => undefined;

      const cancelamentos = [...area.querySelectorAll('[data-ancora]')].map((elemento) => {
        const ancora = interpretar(elemento.getAttribute('data-ancora') ?? '');
        if (ancora === null) return () => undefined;
        const caixa = elemento.getBoundingClientRect();
        return registro.current.registrar(ancora, {
          x: (caixa.left + caixa.width / 2 - limites.left) / limites.width,
          y: (caixa.top + caixa.height / 2 - limites.top) / limites.height,
        });
      });
      return () => {
        for (const cancelar of cancelamentos) cancelar();
      };
    };

    return medir();
  }, [dependencia]);

  return { campo, registro: registro.current };
};
