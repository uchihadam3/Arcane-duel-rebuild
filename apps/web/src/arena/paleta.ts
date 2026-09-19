import type { ClassId, TipoDeCarta } from '@arcane-duel/shared-types';
import type { FamiliaDeVfx } from '@arcane-duel/vfx';

/*
 * A paleta da arena.
 *
 * Duas classes precisam ser reconhecíveis **antes** de qualquer texto: o
 * Guerreiro por massa, metal e calor; o Mago por geometria, energia e o
 * elemento que a carta declara. É o que faz o jogador saber de quem é o efeito
 * olhando só a cor da luz — a descoberta que o vídeo de referência registra
 * como "ênfase de lado".
 *
 * As outras dez classes usam a paleta neutra. Elas continuam jogáveis e
 * legíveis; o acabamento final delas é escopo de outra etapa, e fingir que já
 * existe seria pior do que assumir que não.
 */

export interface PaletaDeClasse {
  /** A luz que banha o lado do campo durante um efeito daquele jogador. */
  readonly luz: number;
  /** A cor do contorno e dos realces de peça. */
  readonly realce: number;
  /** A cor do material das partículas e do rastro. */
  readonly energia: number;
  /** Cor de apoio, para a segunda camada de um efeito. */
  readonly apoio: number;
  /** A mesma luz em CSS, para o HUD e os overlays em DOM. */
  readonly cssLuz: string;
  readonly cssRealce: string;
}

const NEUTRA: PaletaDeClasse = {
  luz: 0xc9a227,
  realce: 0xe8cf86,
  energia: 0xf0dda6,
  apoio: 0x6f5a2a,
  cssLuz: '#c9a227',
  cssRealce: '#e8cf86',
};

const PALETAS: Readonly<Partial<Record<ClassId, PaletaDeClasse>>> = {
  guerreiro: {
    luz: 0xff6a2a,
    realce: 0xffb27a,
    energia: 0xffd3a1,
    apoio: 0xb0b7c2,
    cssLuz: '#ff6a2a',
    cssRealce: '#ffb27a',
  },
  mago: {
    luz: 0x7a6bff,
    realce: 0xb7a8ff,
    energia: 0xd9ccff,
    apoio: 0x53e0ff,
    cssLuz: '#7a6bff',
    cssRealce: '#b7a8ff',
  },
};

export const paletaDaClasse = (classe: ClassId): PaletaDeClasse => PALETAS[classe] ?? NEUTRA;

/** A cor de cada família visual, quando o efeito não herda a da classe. */
export const COR_DA_FAMILIA: Readonly<Record<FamiliaDeVfx, number>> = {
  'golpe-pesado': 0xffb27a,
  pressao: 0xff8a45,
  fragmentos: 0xd8d2c6,
  'guarda-marcial': 0xffd48a,
  momentum: 0xff7a2f,
  'dardo-arcano': 0xb7a8ff,
  fogo: 0xff8a36,
  gelo: 0x7fd8ff,
  runa: 0xffcf6b,
  prisma: 0xff7ad9,
  'barreira-arcana': 0x8ea8ff,
  mana: 0x6f8cff,
  neutro: 0xe8cf86,
};

/** A arena em si. Ornamento rico na borda, miolo escuro e liso. */
export const ARENA = {
  tampo: 0x2a2520,
  tampoCentro: 0x1a1713,
  borda: 0x0d0b09,
  ornamento: 0x8a6a30,
  fundo: 0x0a0908,
  neblina: 0x0a0908,
} as const;

/** A cor da faixa de turno por dono, que o asset aprovado não traz. */
export const COR_DO_BANNER = {
  proprio: '#3f7ad6',
  adversario: '#c9482f',
} as const;

/** A cor de cada tipo de carta, para o sigilo procedural e o realce do slot. */
export const COR_DO_TIPO: Readonly<Record<TipoDeCarta, string>> = {
  ataque: '#c9452f',
  tecnica: '#2f6fc9',
  reacao: '#2f9c5c',
  passiva: '#c9a227',
  'carta-de-classe': '#7a4fc9',
  ultimate: '#e07a1f',
  personagem: '#7a4fc9',
};
