import type { CardId } from '@arcane-duel/shared-types';

import type { EfeitoDeCarta, EfeitoDeCartaDeClasse, EfeitoDePassiva } from './ganchos.js';
import * as guerreiro from './efeitos/guerreiro.js';
import * as mago from './efeitos/mago.js';
import * as clerigo from './efeitos/clerigo.js';

/*
 * Onde mora o comportamento de cada carta.
 *
 * O catálogo diz o que está impresso; este registro diz o que aquilo faz. As
 * duas metades são procuradas pelo mesmo identificador, e um teste garante que
 * nenhuma carta do catálogo fica sem comportamento nem sobra comportamento sem
 * carta.
 */

const juntar = <T>(...mapas: readonly ReadonlyMap<CardId, T>[]): ReadonlyMap<CardId, T> => {
  const total = new Map<CardId, T>();
  for (const mapa of mapas) {
    for (const [chave, valor] of mapa) {
      if (total.has(chave)) throw new Error(`efeito duplicado para a carta ${chave}`);
      total.set(chave, valor);
    }
  }
  return total;
};

/** Habilidades e Ultimates: tudo que é jogado de um espaço de Ação ou Resposta. */
export const EFEITOS_JOGAVEIS: ReadonlyMap<CardId, EfeitoDeCarta> = juntar(
  guerreiro.HABILIDADES,
  guerreiro.ULTIMATES,
  mago.HABILIDADES,
  mago.ULTIMATES,
  clerigo.HABILIDADES,
  clerigo.ULTIMATES,
);

export const EFEITOS_DE_PASSIVA: ReadonlyMap<CardId, EfeitoDePassiva> = juntar(
  guerreiro.PASSIVAS,
  mago.PASSIVAS,
  clerigo.PASSIVAS,
);

export const EFEITOS_DE_CARTA_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = juntar(
  guerreiro.CARTAS_DE_CLASSE,
  mago.CARTAS_DE_CLASSE,
  clerigo.CARTAS_DE_CLASSE,
);

export const efeitoJogavel = (carta: CardId): EfeitoDeCarta => EFEITOS_JOGAVEIS.get(carta) ?? {};

export const efeitoDePassiva = (carta: CardId): EfeitoDePassiva | undefined =>
  EFEITOS_DE_PASSIVA.get(carta);

export const efeitoDeCartaDeClasse = (carta: CardId): EfeitoDeCartaDeClasse | undefined =>
  EFEITOS_DE_CARTA_DE_CLASSE.get(carta);

/** Todas as cartas que têm comportamento registrado. */
export const CARTAS_COM_EFEITO: readonly CardId[] = [
  ...EFEITOS_JOGAVEIS.keys(),
  ...EFEITOS_DE_PASSIVA.keys(),
  ...EFEITOS_DE_CARTA_DE_CLASSE.keys(),
];
