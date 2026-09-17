import type { ClassId, PlayerId } from '@arcane-duel/shared-types';
import { cardId, playerId } from '@arcane-duel/shared-types';

import type { BuildEquipada, ConfiguracaoDeJogador } from './criacao.js';

/**
 * Builds de apoio para os testes.
 *
 * As cartas são identificadores sintéticos: o catálogo real entra junto com as
 * regras de cada carta, nas etapas três e quatro. O que importa aqui é a
 * composição — oito, quatro, duas e uma.
 */
export const buildDeApoio = (classe: ClassId, prefixo: string): BuildEquipada => ({
  classe,
  personagem: cardId(`${prefixo}-personagem`),
  habilidades: Array.from({ length: 8 }, (_, i) => cardId(`${prefixo}-hab-${String(i + 1)}`)),
  passivas: Array.from({ length: 4 }, (_, i) => cardId(`${prefixo}-pas-${String(i + 1)}`)),
  cartasDeClasse: Array.from({ length: 2 }, (_, i) => cardId(`${prefixo}-cls-${String(i + 1)}`)),
  ultimate: cardId(`${prefixo}-ult`),
});

export const jogadorDeApoio = (
  id: string,
  classe: ClassId,
  prefixo = id,
): ConfiguracaoDeJogador => ({
  id: playerId(id),
  build: buildDeApoio(classe, prefixo),
});

export const ID_A: PlayerId = playerId('jogador-a');
export const ID_B: PlayerId = playerId('jogador-b');
