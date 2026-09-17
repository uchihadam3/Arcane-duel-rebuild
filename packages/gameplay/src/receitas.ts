import type { BuildEquipada } from '@arcane-duel/rules-engine';
import { PERSONAGEM_DA_CLASSE } from '@arcane-duel/card-data';
import { cardId } from '@arcane-duel/shared-types';

/*
 * As Receitas iniciais oficiais do Guerreiro e do Mago.
 *
 * São exatamente as listas de docs/PRESET_BUILDS.md — a Receita 1 de cada
 * classe, a única que já começa desbloqueada. As Receitas 2 a 8 só devem ser
 * congeladas depois do primeiro ciclo de playtest humano, então não estão aqui.
 */

/** Guerreiro, Receita 1 — Quebra-Muralhas. */
export const QUEBRA_MURALHAS: BuildEquipada = {
  classe: 'guerreiro',
  personagem: PERSONAGEM_DA_CLASSE.guerreiro,
  habilidades: [
    cardId('W02'), // Ombro de Guerra
    cardId('W03'), // Quebra-Escudo
    cardId('W08'), // Golpe de Cerco
    cardId('W10'), // Ataque de Oportunidade
    cardId('W11'), // Pressão Implacável
    cardId('W15'), // Aparar
    cardId('W16'), // Base Firme
    cardId('W19'), // Interposição
  ],
  passivas: [
    cardId('WP04'), // Predador de Ruptura
    cardId('WP08'), // Mão Pesada
    cardId('WP07'), // Pressão de Veterano
    cardId('WP01'), // Instinto de Ferro
  ],
  cartasDeClasse: [
    cardId('WC02'), // Postura da Vanguarda
    cardId('WC04'), // Cerco Metódico
  ],
  ultimate: cardId('WU01'), // Quebra-Reinos
};

/** Mago, Receita 1 — Piromante. */
export const PIROMANTE: BuildEquipada = {
  classe: 'mago',
  personagem: PERSONAGEM_DA_CLASSE.mago,
  habilidades: [
    cardId('M01'), // Dardo Arcano
    cardId('M02'), // Bola de Fogo
    cardId('M03'), // Chama Persistente
    cardId('M04'), // Pulso Cinético
    cardId('M11'), // Canalizar
    cardId('M12'), // Concentração Prismática
    cardId('M15'), // Barreira de Mana
    cardId('M17'), // Égide Cinética
  ],
  passivas: [
    cardId('MP01'), // Reserva Arcana
    cardId('MP06'), // Combustão Controlada
    cardId('MP08'), // Geometria Rúnica
    cardId('MP10'), // Núcleo Sobrecarregado
  ],
  cartasDeClasse: [
    cardId('MC01'), // Runa de Cinzas
    cardId('MC05'), // Runa do Conduíte
  ],
  ultimate: cardId('MU01'), // Meteoro
};

export const RECEITAS_INICIAIS = {
  guerreiro: QUEBRA_MURALHAS,
  mago: PIROMANTE,
} as const;
