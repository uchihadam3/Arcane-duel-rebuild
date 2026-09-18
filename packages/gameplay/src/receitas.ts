import type { BuildEquipada } from '@arcane-duel/rules-engine';
import { PERSONAGEM_DA_CLASSE } from '@arcane-duel/card-data';
import type { ClassId } from '@arcane-duel/shared-types';
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

/** Ladino, Receita 1 — Assassino. */
export const ASSASSINO: BuildEquipada = {
  classe: 'ladino',
  personagem: PERSONAGEM_DA_CLASSE.ladino,
  habilidades: [
    cardId('L01'), // Corte Rápido
    cardId('L02'), // Finta
    cardId('L05'), // Estocada Sombria
    cardId('L06'), // Punhalada Oportunista
    cardId('L11'), // Preparar a Brecha
    cardId('L14'), // Passo Falso
    cardId('L15'), // Esquiva
    cardId('L17'), // Bomba de Fumaça
  ],
  passivas: [
    cardId('LP01'), // Primeiro Sangue
    cardId('LP03'), // Predador da Brecha
    cardId('LP02'), // Passos Invisíveis
    cardId('LP05'), // Sangue Frio
  ],
  cartasDeClasse: [
    cardId('LC01'), // Método do Assassino
    cardId('LC06'), // Fio Oculto
  ],
  ultimate: cardId('LU01'), // Golpe Perfeito
};

/** Bardo, Receita 1 — Crescendo. */
export const CRESCENDO: BuildEquipada = {
  classe: 'bardo',
  personagem: PERSONAGEM_DA_CLASSE.bardo,
  habilidades: [
    cardId('B01'), // Batida Marcial
    cardId('B02'), // Corda Cortante
    cardId('B03'), // Acorde Estridente
    cardId('B04'), // Crescendo
    cardId('B11'), // Improviso
    cardId('B12'), // Preparar o Refrão
    cardId('B16'), // Contracanto
    cardId('B17'), // Quebra de Ritmo
  ],
  passivas: [
    cardId('BP01'), // Ouvido Absoluto
    cardId('BP02'), // Crescendo Natural
    cardId('BP06'), // Ritmo Sustentado
    cardId('BP09'), // Último Refrão
  ],
  cartasDeClasse: [
    cardId('BC01'), // Canção da Marcha
    cardId('BC04'), // Tambor de Guerra
  ],
  ultimate: cardId('BU01'), // Grande Finale
};

/** Monge, Receita 1 — Kata do Tigre. */
export const KATA_DO_TIGRE: BuildEquipada = {
  classe: 'monge',
  personagem: PERSONAGEM_DA_CLASSE.monge,
  habilidades: [
    cardId('MO01'), // Palma de Ferro
    cardId('MO04'), // Passo do Vento
    cardId('MO07'), // Punho do Dragão
    cardId('MO02'), // Chute do Calcanhar
    cardId('MO05'), // Joelhada Ascendente
    cardId('MO11'), // Respiração Centrada
    cardId('MO16'), // Antebraço de Pedra
    cardId('MO17'), // Desvio Lateral
  ],
  passivas: [
    cardId('MOP01'), // Disciplina Perfeita
    cardId('MOP02'), // Primeiro Passo
    cardId('MOP03'), // Fluxo Contínuo
    cardId('MOP04'), // Golpe Derradeiro
  ],
  cartasDeClasse: [
    cardId('MOC01'), // Postura do Tigre
    cardId('MOC04'), // Mantra do Fôlego
  ],
  ultimate: cardId('MOU01'), // Punho dos Cem Ecos
};

/** Patrulheiro, Receita 1 — Atirador. */
export const ATIRADOR: BuildEquipada = {
  classe: 'patrulheiro',
  personagem: PERSONAGEM_DA_CLASSE.patrulheiro,
  habilidades: [
    cardId('R01'), // Flecha de Sondagem
    cardId('R02'), // Tiro Preciso
    cardId('R03'), // Flecha de Caça
    cardId('R04'), // Tiro Rompe-Guarda
    cardId('R11'), // Marcar a Presa
    cardId('R12'), // Ajustar a Mira
    cardId('R16'), // Esquiva Lateral
    cardId('R17'), // Aparar com o Arco
  ],
  passivas: [
    cardId('RP01'), // Predador Paciente
    cardId('RP03'), // Pista Fresca
    cardId('RP04'), // Sem Escapatória
    cardId('RP10'), // Última Caçada
  ],
  cartasDeClasse: [
    cardId('RC01'), // Estilo do Atirador
    cardId('RC06'), // Fio de Tropeço
  ],
  ultimate: cardId('RU01'), // Olho do Predador
};

/** Bárbaro, Receita 1 — Berserker. */
export const BERSERKER: BuildEquipada = {
  classe: 'barbaro',
  personagem: PERSONAGEM_DA_CLASSE.barbaro,
  habilidades: [
    cardId('BA01'), // Machado Curto
    cardId('BA02'), // Ombro Selvagem
    cardId('BA03'), // Golpe Temerário
    cardId('BA04'), // Investida Bestial
    cardId('BA06'), // Corte em Frenesi
    cardId('BA11'), // Rugido de Guerra
    cardId('BA16'), // Pele Grossa
    cardId('BA17'), // Aparar com o Machado
  ],
  passivas: [
    cardId('BAP01'), // Sangue Quente
    cardId('BAP02'), // Sem Medo
    cardId('BAP03'), // Dor é Combustível
    cardId('BAP08'), // Frenesi Crescente
  ],
  cartasDeClasse: [
    cardId('BAC01'), // Instinto do Berserker
    cardId('BAC05'), // Totem do Lobo
  ],
  ultimate: cardId('BAU02'), // Frenesi sem Freio
};

/** Druida, Receita 1 — Urso do Bosque. */
export const URSO_DO_BOSQUE: BuildEquipada = {
  classe: 'druida',
  personagem: PERSONAGEM_DA_CLASSE.druida,
  habilidades: [
    cardId('D01'), // Chicote de Raízes
    cardId('D04'), // Garra Selvagem
    cardId('D06'), // Investida Bestial
    cardId('D11'), // Crescimento Súbito
    cardId('D13'), // Renovo Natural
    cardId('D16'), // Casca Reflexa
    cardId('D17'), // Instinto Feral
    cardId('D12'), // Metamorfose Instintiva
  ],
  passivas: [
    cardId('DP01'), // Duas Naturezas
    cardId('DP06'), // Raízes Profundas
    cardId('DP04'), // Pele Renovada
    cardId('DP10'), // Equilíbrio Natural
  ],
  cartasDeClasse: [
    cardId('DC01'), // Forma do Urso
    cardId('DC04'), // Círculo do Bosque
  ],
  ultimate: cardId('DU03'), // Renascimento Primal
};

/** Bruxo, Receita 1 — Sangue. */
export const SANGUE: BuildEquipada = {
  classe: 'bruxo',
  personagem: PERSONAGEM_DA_CLASSE.bruxo,
  habilidades: [
    cardId('BR01'), // Seta Sombria
    cardId('BR02'), // Chama Profana
    cardId('BR04'), // Dreno Vital
    cardId('BR05'), // Lança Profana
    cardId('BR11'), // Assinar com Sangue
    cardId('BR14'), // Roubar Fôlego
    cardId('BR16'), // Escudo Sombrio
    cardId('BR17'), // Correntes Defensivas
  ],
  passivas: [
    cardId('BRP01'), // Sangue por Poder
    cardId('BRP02'), // Dor Familiar
    cardId('BRP06'), // Cicatriz do Abismo
    cardId('BRP05'), // Tudo Tem um Preço
  ],
  cartasDeClasse: [
    cardId('BRC01'), // Pacto de Sangue
    cardId('BRC04'), // Maldição da Fragilidade
  ],
  ultimate: cardId('BRU01'), // Condenação
};

/**
 * O nome de cada Receita 1, transcrito de docs/PRESET_BUILDS.md.
 *
 * A interface mostra o nome da Receita ao escolher a classe; ele já estava
 * neste arquivo, em comentário, e aqui só passa a ser legível por código.
 */
export const NOME_DA_RECEITA_INICIAL: Readonly<Record<ClassId, string>> = {
  guerreiro: 'Quebra-Muralhas',
  mago: 'Piromante',
  clerigo: 'Julgamento',
  necromante: 'Ossomante',
  paladino: 'Bastião',
  ladino: 'Assassino',
  bardo: 'Crescendo',
  monge: 'Kata do Tigre',
  patrulheiro: 'Atirador',
  barbaro: 'Berserker',
  druida: 'Urso do Bosque',
  bruxo: 'Sangue',
};

export const RECEITAS_INICIAIS = {
  guerreiro: QUEBRA_MURALHAS,
  mago: PIROMANTE,
  clerigo: JULGAMENTO,
  necromante: OSSOMANTE,
  paladino: BASTIAO,
  ladino: ASSASSINO,
  bardo: CRESCENDO,
  monge: KATA_DO_TIGRE,
  patrulheiro: ATIRADOR,
  barbaro: BERSERKER,
  druida: URSO_DO_BOSQUE,
  bruxo: SANGUE,
} as const;
