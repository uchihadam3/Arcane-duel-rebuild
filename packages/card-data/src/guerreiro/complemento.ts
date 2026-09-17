import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Cartas de Classe e Ultimates do Guerreiro.
 *
 * O CARD_CATALOG.md lista essas cartas por nome, sem código. Os códigos abaixo
 * foram atribuídos uma única vez e estão registrados em docs/CARD_IDS.md: eles
 * são a identidade da carta, não a posição dela na lista. Reordenar este
 * arquivo não pode mudar nenhum deles, e um teste prende cada código ao nome
 * exato para que a troca silenciosa seja impossível.
 */

/** A carta de Personagem da classe (FULL_GAME_SPEC.md §3). */
export const PERSONAGEM_DO_GUERREIRO: DefinicaoDeCarta = {
  id: cardId('W00'),
  classe: 'guerreiro',
  nome: 'Guerreiro',
  tipo: 'personagem',
  tags: [],
  texto:
    'Momentum possui no máximo 3 fichas. Defesa Inata — Guarda Marcial: uma vez por turno inimigo, reduza 1 D ou 1 I.',
};

export const PASSIVAS_DO_GUERREIRO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('WP01'),
    classe: 'guerreiro',
    nome: 'Instinto de Ferro',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando um Ataque causaria Ruptura. Reduza 2 I. Depois de revelada, uma vez por turno inimigo, Ative e gaste 1 Momentum para reduzir 1 I de um Ataque que causaria Ruptura.',
  },
  {
    id: cardId('WP02'),
    classe: 'guerreiro',
    nome: 'Sangue Aceso',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele ao chegar a 15 de Vida ou menos. Depois disso, o primeiro Ataque de cada turno em que gastar Momentum recebe +1 D.',
  },
  {
    id: cardId('WP03'),
    classe: 'guerreiro',
    nome: 'Leitura de Combate',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o adversário declarar a terceira Ação do turno. Depois disso, a primeira Reação contra a terceira Ação de cada turno inimigo custa 1 R a menos, mínimo 0.',
  },
  {
    id: cardId('WP04'),
    classe: 'guerreiro',
    nome: 'Predador de Ruptura',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele na primeira Ruptura causada. Depois disso, o primeiro Ataque de cada turno jogado enquanto a Guarda inimiga está 0 recebe +1 D.',
  },
  {
    id: cardId('WP05'),
    classe: 'guerreiro',
    nome: 'Dor em Força',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele ao perder 4 ou mais de Vida de um Ataque e ganhe 2 Momentum. Depois disso, na primeira vez por turno inimigo que isso ocorrer, ganhe 1 Momentum.',
  },
  {
    id: cardId('WP06'),
    classe: 'guerreiro',
    nome: 'Mestre da Defesa',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Reação reduzir o Dano final a 0. Depois disso, na primeira vez por turno inimigo que isso ocorrer, restaure 1 Guarda.',
  },
  {
    id: cardId('WP07'),
    classe: 'guerreiro',
    nome: 'Pressão de Veterano',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele no início do seu turno se o inimigo estiver com Reserva 0. Depois disso, enquanto ele estiver com Reserva 0, seu primeiro Ataque do turno recebe +1 I.',
  },
  {
    id: cardId('WP08'),
    classe: 'guerreiro',
    nome: 'Mão Pesada',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando jogar um Ataque de 3 AP. Depois disso, seu primeiro Ataque de 3 AP de cada turno recebe +1 I.',
  },
  {
    id: cardId('WP09'),
    classe: 'guerreiro',
    nome: 'Olho na Abertura',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o inimigo usar sua segunda carta de Reação no mesmo turno. Depois disso, sempre que isso ocorrer, recupere 1 AP.',
  },
  {
    id: cardId('WP10'),
    classe: 'guerreiro',
    nome: 'Guarda de Veterano',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar seu turno com Reserva 2. Depois disso, sua primeira carta de Reação de cada turno inimigo reduz +1 D ou +1 I.',
  },
];

export const CARTAS_DE_CLASSE_DO_GUERREIRO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('WC01'),
    classe: 'guerreiro',
    nome: 'Postura da Fortaleza',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Postura da Fortaleza',
    textoAtivar: 'Quando estiver recebendo um Ataque, Guarda Marcial reduz 1 D e 1 I nesta ação.',
    textoExaurir:
      'Quando um Ataque causaria Ruptura, impeça a Ruptura. Depois da resolução, ajuste sua Guarda para 3.',
  },
  {
    id: cardId('WC02'),
    classe: 'guerreiro',
    nome: 'Postura da Vanguarda',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Postura da Vanguarda',
    textoAtivar: 'Ao declarar um Ataque, ele recebe +1 D e +1 I.',
    textoExaurir: 'Ao declarar um Ataque, ele recebe +3 I. Se causar Ruptura, ganhe 2 Momentum.',
  },
  {
    id: cardId('WC03'),
    classe: 'guerreiro',
    nome: 'Postura do Duelista',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Postura do Duelista',
    textoAtivar:
      'Depois que o adversário usar uma carta de Reação contra seu Ataque, ganhe 1 Momentum.',
    textoExaurir:
      'Depois que o adversário usar uma carta de Reação, seu Ataque recebe +3 D depois que a redução da Reação for aplicada.',
  },
  {
    id: cardId('WC04'),
    classe: 'guerreiro',
    nome: 'Cerco Metódico',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Cerco Metódico',
    textoAtivar: 'Quando causar Ruptura, recupere 1 AP.',
    textoExaurir: 'Quando causar Ruptura, seu próximo Ataque neste turno recebe +3 D.',
  },
  {
    id: cardId('WC05'),
    classe: 'guerreiro',
    nome: 'Contraofensiva',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Contraofensiva',
    textoAtivar: 'Depois que sua carta de Reação resolver, ganhe 1 Momentum.',
    textoExaurir:
      'Quando jogar uma Reação, ela reduz +2 D e +2 I. Depois da resolução, ganhe 2 Momentum.',
  },
  {
    id: cardId('WC06'),
    classe: 'guerreiro',
    nome: 'Ritmo de Batalha',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Ritmo de Batalha',
    textoAtivar:
      'Quando jogar um Ataque imediatamente depois de outro Ataque, o segundo recebe +1 D e +1 I.',
    textoExaurir:
      'Quando jogar um Ataque imediatamente depois de outro Ataque, ele custa 1 AP a menos, mínimo 1, e recebe +2 D e +1 I.',
  },
];

export const ULTIMATES_DO_GUERREIRO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('WU01'),
    classe: 'guerreiro',
    nome: 'Quebra-Reinos',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3, recurso: { recurso: 'momentum', quantidade: 3 } },
    valores: { dano: 7, impacto: 3 },
    texto: 'Ataque. 3 AP e 3 Momentum. 7 D / 3 I.',
  },
  {
    id: cardId('WU02'),
    classe: 'guerreiro',
    nome: 'Última Palavra',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2, recurso: { recurso: 'momentum', quantidade: 3 } },
    texto:
      'Reação. 2 R e 3 Momentum. O Dano final daquele Ataque se torna 0 e reduza 2 I. Depois da resolução, o adversário perde 4 de Vida.',
  },
  {
    id: cardId('WU03'),
    classe: 'guerreiro',
    nome: 'Sequência do Campeão',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3, recurso: { recurso: 'momentum', quantidade: 2 } },
    valores: { dano: 4, impacto: 2 },
    texto:
      'Ataque. 3 AP e 2 Momentum. 4 D / 2 I. Recebe +2 D por Ataque que você já realizou neste turno, máximo +4 D.',
  },
];
