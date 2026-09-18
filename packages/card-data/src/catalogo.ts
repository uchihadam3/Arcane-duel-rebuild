import type { CardId, ClassId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from './card-definition.js';
import { criarCatalogo, perfilDaDefinicao } from './card-definition.js';
import { HABILIDADES_DO_GUERREIRO } from './guerreiro/habilidades.js';
import {
  CARTAS_DE_CLASSE_DO_GUERREIRO,
  PASSIVAS_DO_GUERREIRO,
  ULTIMATES_DO_GUERREIRO,
} from './guerreiro/complemento.js';
import { HABILIDADES_DO_MAGO } from './mago/habilidades.js';
import {
  CARTAS_DE_CLASSE_DO_MAGO,
  PASSIVAS_DO_MAGO,
  ULTIMATES_DO_MAGO,
} from './mago/complemento.js';
import { HABILIDADES_DO_CLERIGO } from './clerigo/habilidades.js';
import {
  CARTAS_DE_CLASSE_DO_CLERIGO,
  PASSIVAS_DO_CLERIGO,
  ULTIMATES_DO_CLERIGO,
} from './clerigo/complemento.js';

/*
 * O catálogo oficial.
 *
 * Cada classe entra com 39 cartas — 20 habilidades, 10 Passivas, 6 Cartas de
 * Classe e 3 Ultimates — e só entra acompanhada dos testes de comportamento
 * dela: não há dado sem comportamento verificado neste arquivo.
 *
 * Cartas de Personagem **não** entram aqui. O CARD_CATALOG.md não fornece os
 * dados delas, e inventar custo, valores ou texto para preencher a lacuna seria
 * criar carta. A identidade técnica do Personagem vive em `classes.ts`, como
 * identificador e nada mais.
 */

export const CARTAS_DO_GUERREIRO: readonly DefinicaoDeCarta[] = [
  ...HABILIDADES_DO_GUERREIRO,
  ...PASSIVAS_DO_GUERREIRO,
  ...CARTAS_DE_CLASSE_DO_GUERREIRO,
  ...ULTIMATES_DO_GUERREIRO,
];

export const CARTAS_DO_MAGO: readonly DefinicaoDeCarta[] = [
  ...HABILIDADES_DO_MAGO,
  ...PASSIVAS_DO_MAGO,
  ...CARTAS_DE_CLASSE_DO_MAGO,
  ...ULTIMATES_DO_MAGO,
];

export const CARTAS_DO_CLERIGO: readonly DefinicaoDeCarta[] = [
  ...HABILIDADES_DO_CLERIGO,
  ...PASSIVAS_DO_CLERIGO,
  ...CARTAS_DE_CLASSE_DO_CLERIGO,
  ...ULTIMATES_DO_CLERIGO,
];

export const CATALOGO = criarCatalogo([
  ...CARTAS_DO_GUERREIRO,
  ...CARTAS_DO_MAGO,
  ...CARTAS_DO_CLERIGO,
]);

/** Classes cujo catálogo já está implementado por inteiro, com testes. */
export const CLASSES_IMPLEMENTADAS: readonly ClassId[] = ['guerreiro', 'mago', 'clerigo'];

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
  HABILIDADES_DO_GUERREIRO,
  PASSIVAS_DO_GUERREIRO,
  CARTAS_DE_CLASSE_DO_GUERREIRO,
  ULTIMATES_DO_GUERREIRO,
  HABILIDADES_DO_MAGO,
  PASSIVAS_DO_MAGO,
  CARTAS_DE_CLASSE_DO_MAGO,
  ULTIMATES_DO_MAGO,
  HABILIDADES_DO_CLERIGO,
  PASSIVAS_DO_CLERIGO,
  CARTAS_DE_CLASSE_DO_CLERIGO,
  ULTIMATES_DO_CLERIGO,
};
