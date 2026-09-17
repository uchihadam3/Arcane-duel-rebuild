import type { CardId, ClassId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from './card-definition.js';
import { criarCatalogo, perfilDaDefinicao } from './card-definition.js';
import { HABILIDADES_DO_GUERREIRO } from './guerreiro/habilidades.js';
import {
  CARTAS_DE_CLASSE_DO_GUERREIRO,
  PASSIVAS_DO_GUERREIRO,
  PERSONAGEM_DO_GUERREIRO,
  ULTIMATES_DO_GUERREIRO,
} from './guerreiro/complemento.js';
import { HABILIDADES_DO_MAGO } from './mago/habilidades.js';
import {
  CARTAS_DE_CLASSE_DO_MAGO,
  PASSIVAS_DO_MAGO,
  PERSONAGEM_DO_MAGO,
  ULTIMATES_DO_MAGO,
} from './mago/complemento.js';

/*
 * O catálogo oficial.
 *
 * Duas classes completas entram aqui: Guerreiro e Mago. As outras dez são a
 * etapa quatro do roadmap e entram cada uma com os seus testes — não há dado
 * sem comportamento verificado neste arquivo.
 */

export const CARTAS_DO_GUERREIRO: readonly DefinicaoDeCarta[] = [
  PERSONAGEM_DO_GUERREIRO,
  ...HABILIDADES_DO_GUERREIRO,
  ...PASSIVAS_DO_GUERREIRO,
  ...CARTAS_DE_CLASSE_DO_GUERREIRO,
  ...ULTIMATES_DO_GUERREIRO,
];

export const CARTAS_DO_MAGO: readonly DefinicaoDeCarta[] = [
  PERSONAGEM_DO_MAGO,
  ...HABILIDADES_DO_MAGO,
  ...PASSIVAS_DO_MAGO,
  ...CARTAS_DE_CLASSE_DO_MAGO,
  ...ULTIMATES_DO_MAGO,
];

export const CATALOGO = criarCatalogo([...CARTAS_DO_GUERREIRO, ...CARTAS_DO_MAGO]);

/** Classes cujo catálogo já está implementado por inteiro, com testes. */
export const CLASSES_IMPLEMENTADAS: readonly ClassId[] = ['guerreiro', 'mago'];

/** A definição impressa de uma carta, ou `undefined` se ela não existe. */
export const definicaoDe = (id: CardId): DefinicaoDeCarta | undefined => CATALOGO.porId(id);

/**
 * O perfil impresso de uma carta jogável.
 *
 * É por aqui que o sistema descobre custo, tipo, valores e cooldown de uma
 * carta que alguém quer jogar. O cliente informa o identificador; os números
 * vêm daqui.
 */
export const perfilDaCarta = (id: CardId): ReturnType<typeof perfilDaDefinicao> => {
  const definicao = CATALOGO.porId(id);
  return definicao === undefined ? undefined : perfilDaDefinicao(definicao);
};

export {
  PERSONAGEM_DO_GUERREIRO,
  PERSONAGEM_DO_MAGO,
  HABILIDADES_DO_GUERREIRO,
  PASSIVAS_DO_GUERREIRO,
  CARTAS_DE_CLASSE_DO_GUERREIRO,
  ULTIMATES_DO_GUERREIRO,
  HABILIDADES_DO_MAGO,
  PASSIVAS_DO_MAGO,
  CARTAS_DE_CLASSE_DO_MAGO,
  ULTIMATES_DO_MAGO,
};
