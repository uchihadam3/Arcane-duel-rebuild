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

/** Clérigo, Receita 1 — Julgamento. */
export const JULGAMENTO: BuildEquipada = {
  classe: 'clerigo',
  personagem: PERSONAGEM_DA_CLASSE.clerigo,
  habilidades: [
    cardId('C01'), // Golpe Consagrado
    cardId('C02'), // Martelo do Julgamento
    cardId('C04'), // Veredito Solar
    cardId('C03'), // Luz Punitiva
    cardId('C11'), // Bênção da Coragem
    cardId('C14'), // Escudo da Fé
    cardId('C15'), // Âncora Sagrada
    cardId('C13'), // Purificação
  ],
  passivas: [
    cardId('CP02'), // Olho do Julgamento
    cardId('CP09'), // Justiça Restauradora
    cardId('CP06'), // Milagre Guardado
    cardId('CP07'), // Liturgia Contínua
  ],
  cartasDeClasse: [
    cardId('CC02'), // Doutrina do Julgamento
    cardId('CC04'), // Incensário da Aurora
  ],
  ultimate: cardId('CU01'), // Julgamento Celeste
};

/** Necromante, Receita 1 — Ossomante. */
export const OSSOMANTE: BuildEquipada = {
  classe: 'necromante',
  personagem: PERSONAGEM_DA_CLASSE.necromante,
  habilidades: [
    cardId('N01'), // Flecha Óssea
    cardId('N02'), // Lança de Ossos
    cardId('N07'), // Mão do Túmulo
    cardId('N09'), // Ruína Sepulcral
    cardId('N15'), // Rito de Ossos
    cardId('N16'), // Muralha de Ossos
    cardId('N17'), // Véu dos Mortos
    cardId('N12'), // Desenterrar
  ],
  passivas: [
    cardId('NP02'), // Mestre do Murchar
    cardId('NP03'), // Memória dos Mortos
    cardId('NP06'), // Guardião do Túmulo
    cardId('NP10'), // Eco do Cemitério
  ],
  cartasDeClasse: [
    cardId('NC01'), // Guardião Esquelético
    cardId('NC06'), // Abominação Costurada
  ],
  ultimate: cardId('NU01'), // Ceifador de Almas
};

/** Paladino, Receita 1 — Bastião. */
export const BASTIAO: BuildEquipada = {
  classe: 'paladino',
  personagem: PERSONAGEM_DA_CLASSE.paladino,
  habilidades: [
    cardId('P01'), // Pancada de Escudo
    cardId('P03'), // Martelo do Juramento
    cardId('P06'), // Investida do Bastião
    cardId('P11'), // Preparar o Bastião
    cardId('P15'), // Bloqueio de Torre
    cardId('P16'), // Égide Sagrada
    cardId('P18'), // Permanecer de Pé
    cardId('P19'), // Escudo e Espada
  ],
  passivas: [
    cardId('PP01'), // Muralha Viva
    cardId('PP02'), // Fé no Aço
    cardId('PP04'), // Escudo do Justo
    cardId('PP09'), // Guardião da Luz
  ],
  cartasDeClasse: [
    cardId('PC01'), // Juramento da Proteção
    cardId('PC04'), // Aura do Santuário
  ],
  ultimate: cardId('PU02'), // Fortaleza Inquebrável
};

export const RECEITAS_INICIAIS = {
  guerreiro: QUEBRA_MURALHAS,
  mago: PIROMANTE,
  clerigo: JULGAMENTO,
  necromante: OSSOMANTE,
  paladino: BASTIAO,
} as const;
