import type { Zona } from '@arcane-duel/shared-types';

/**
 * Âncoras de campo.
 *
 * O vídeo de referência mostra efeitos que viajam entre dois pontos do
 * tabuleiro e cartas que se movem fisicamente de uma zona para outra. Para que
 * isso seja possível sem que o VFX conheça o layout, cada zona registra um
 * ponto no campo e os efeitos apenas perguntam onde aquela zona está.
 *
 * O ponto é normalizado (0..1 sobre a área útil do campo), então o mesmo
 * registro serve para um campo desenhado em DOM hoje e para um campo
 * tridimensional projetado em tela depois: só muda quem preenche o registro.
 */

export type LadoDoCampo = 'proprio' | 'adversario';

export interface AncoraDeCampo {
  readonly lado: LadoDoCampo;
  readonly zona: Zona;
  /** Distingue zonas repetidas: as três Ações, as quatro Passivas, as duas Cartas de Classe. */
  readonly indice?: number;
}

export interface PontoDeAncora {
  /** 0 na borda esquerda do campo, 1 na direita. */
  readonly x: number;
  /** 0 na borda superior do campo, 1 na inferior. */
  readonly y: number;
}

export const chaveDaAncora = (ancora: AncoraDeCampo): string =>
  `${ancora.lado}:${ancora.zona}:${String(ancora.indice ?? 0)}`;

export interface RegistroDeAncoras {
  /** Registra o ponto de uma zona e devolve a função que cancela o registro. */
  readonly registrar: (ancora: AncoraDeCampo, ponto: PontoDeAncora) => () => void;
  readonly obter: (ancora: AncoraDeCampo) => PontoDeAncora | undefined;
  readonly registradas: () => readonly string[];
}

export const criarRegistroDeAncoras = (): RegistroDeAncoras => {
  const pontos = new Map<string, PontoDeAncora>();

  return {
    registrar: (ancora, ponto) => {
      const chave = chaveDaAncora(ancora);
      pontos.set(chave, ponto);
      return () => {
        pontos.delete(chave);
      };
    },
    obter: (ancora) => pontos.get(chaveDaAncora(ancora)),
    registradas: () => [...pontos.keys()],
  };
};
