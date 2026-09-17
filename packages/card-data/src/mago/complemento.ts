import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Runas e Ultimates do Mago.
 *
 * As seis Cartas de Classe do Mago são as Runas. Os códigos MP, MC e MU foram
 * atribuídos uma única vez e estão registrados em docs/CARD_IDS.md; eles são a
 * identidade da carta, não a posição dela nesta lista.
 */

export const PASSIVAS_DO_MAGO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('MP01'),
    classe: 'mago',
    nome: 'Reserva Arcana',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando sua Mana chegar a 1 ou menos e ganhe 2 Mana. Depois, se começar seu turno com 1 Mana ou menos, recupere 3 em vez de 2.',
  },
  {
    id: cardId('MP02'),
    classe: 'mago',
    nome: 'Mente Calculista',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele ao completar sua terceira Ação. Depois disso, quando sua terceira Ação for um Feitiço, coloque a carta uma zona de cooldown mais próxima da mão após resolver.',
  },
  {
    id: cardId('MP03'),
    classe: 'mago',
    nome: 'Véu Prismático',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando um Ataque causaria Ruptura e reduza 2 I. Depois disso, uma vez por turno inimigo, Ative e gaste 1 Mana para reduzir 1 I de um Ataque que causaria Ruptura.',
  },
  {
    id: cardId('MP04'),
    classe: 'mago',
    nome: 'Eco Rúnico',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Ativar suas duas Runas no mesmo turno e ganhe 1 Mana. Depois disso, na primeira vez por turno que as duas ficarem Ativadas, ganhe 1 Mana.',
  },
  {
    id: cardId('MP05'),
    classe: 'mago',
    nome: 'Concentração sob Pressão',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele ao perder 4 ou mais de Vida de um Ataque e devolva uma carta de CD1 à mão. Depois disso, na primeira vez por turno inimigo que perder 4 ou mais, mova uma carta de CD2 para CD1.',
  },
  {
    id: cardId('MP06'),
    classe: 'mago',
    nome: 'Combustão Controlada',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando um inimigo alcançar Queimadura 2. Depois disso, seu primeiro Ataque/Feitiço de cada turno contra inimigo com Queimadura recebe +1 I.',
  },
  {
    id: cardId('MP07'),
    classe: 'mago',
    nome: 'Frio Calculado',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o inimigo pagar AP adicional por Lento e ganhe 1 Mana. Depois disso, na primeira vez por turno que isso ocorrer, ganhe 1 Mana.',
  },
  {
    id: cardId('MP08'),
    classe: 'mago',
    nome: 'Geometria Rúnica',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele na primeira vez que Ativar uma Runa para modificar um Feitiço. Depois disso, uma vez por turno, o Feitiço que fizer a primeira Runa ser Ativada recebe +1 D ou +1 I.',
  },
  {
    id: cardId('MP09'),
    classe: 'mago',
    nome: 'Reserva de Contramedidas',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar seu turno com Reserva 2. Depois disso, sua primeira Reação de cada turno inimigo custa 1 Mana a menos, mínimo 0.',
  },
  {
    id: cardId('MP10'),
    classe: 'mago',
    nome: 'Núcleo Sobrecarregado',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando jogar uma Ação que custe pelo menos 2 Mana. Depois disso, seu primeiro Ataque/Feitiço de cada turno que custe 2 ou mais Mana recebe +1 D ou +1 I.',
  },
];

export const CARTAS_DE_CLASSE_DO_MAGO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('MC01'),
    classe: 'mago',
    nome: 'Runa de Cinzas',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Runa de Cinzas',
    textoAtivar: 'Depois que um Feitiço causar Dano à Vida, aplique Queimadura 1.',
    textoExaurir:
      'Quando a Queimadura do adversário fosse causar Dano, remova toda a Queimadura e faça esse evento causar 3 de Dano em vez do valor normal.',
  },
  {
    id: cardId('MC02'),
    classe: 'mago',
    nome: 'Runa da Geada',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Runa da Geada',
    textoAtivar: 'Depois que um Feitiço causar pelo menos 2 I, aplique Lento 1.',
    textoExaurir:
      'Antes de resolver um Feitiço, ele recebe +3 I. Se causar Ruptura, aplique Lento 2.',
  },
  {
    id: cardId('MC03'),
    classe: 'mago',
    nome: 'Runa do Eco',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Runa do Eco',
    textoAtivar:
      'Quando um Feitiço seu iria entrar em CD2 ou CD3, coloque-o uma zona de cooldown mais próxima da mão.',
    textoExaurir:
      'Escolha um Feitiço seu em qualquer zona de cooldown e devolva-o à mão. Se for utilizado novamente neste turno, custa +1 AP.',
  },
  {
    id: cardId('MC04'),
    classe: 'mago',
    nome: 'Runa da Égide',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Runa da Égide',
    textoAtivar: 'Quando usar uma Resposta, reduza mais 1 D ou 1 I daquela ação.',
    textoExaurir: 'Quando responder a um Ataque, o Dano final se torna 0 e reduza 2 I.',
  },
  {
    id: cardId('MC05'),
    classe: 'mago',
    nome: 'Runa do Conduíte',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Runa do Conduíte',
    textoAtivar: 'Depois de pagar Mana por uma Ação, recupere 1 Mana depois da resolução.',
    textoExaurir:
      'Antes de conjurar um Feitiço, ignore todo o custo de Mana dele. Se o custo impresso de Mana for 2 ou mais, recupere 1 AP depois da resolução.',
  },
  {
    id: cardId('MC06'),
    classe: 'mago',
    nome: 'Runa Prismática',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Runa Prismática',
    textoAtivar:
      'Depois que sua segunda Ação de Feitiço do turno resolver, sua terceira Ação, se também for um Feitiço, custa 1 AP a menos, mínimo 1.',
    textoExaurir:
      'Depois que sua terceira Ação resolver, você pode realizar uma quarta Ação naquele turno. Ela deve ser um Feitiço e todos os custos ainda precisam ser pagos.',
  },
];

export const ULTIMATES_DO_MAGO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('MU01'),
    classe: 'mago',
    nome: 'Meteoro',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: ['feitico'],
    custo: { moeda: 'ap', valor: 3, recurso: { recurso: 'mana', quantidade: 4 } },
    valores: { dano: 7, impacto: 2 },
    texto: 'Ataque/Feitiço. 3 AP + 4 Mana. 7 D / 2 I. Se causar Dano à Vida, aplique Queimadura 2.',
  },
  {
    id: cardId('MU02'),
    classe: 'mago',
    nome: 'Zero Absoluto',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: ['feitico'],
    custo: { moeda: 'ap', valor: 3, recurso: { recurso: 'mana', quantidade: 4 } },
    valores: { dano: 4, impacto: 4 },
    texto: 'Ataque/Feitiço. 3 AP + 4 Mana. 4 D / 4 I. Se causar Ruptura, aplique Lento 2.',
  },
  {
    id: cardId('MU03'),
    classe: 'mago',
    nome: 'Sobrecarga Temporal',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: ['feitico'],
    custo: { moeda: 'ap', valor: 2, recurso: { recurso: 'mana', quantidade: 3 } },
    texto:
      'Técnica/Feitiço. 2 AP + 3 Mana. Deixe suas duas Runas Prontas, devolva até duas cartas de CD1 à mão e recupere 1 AP.',
  },
];
