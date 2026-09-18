import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Instintos, Totens e Ultimates do Bárbaro.
 *
 * As seis Cartas de Classe são três Instintos e três Totens, e a build escolhe
 * uma de cada.
 */

export const PASSIVAS_DO_BARBARO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BAP01'),
    classe: 'barbaro',
    nome: 'Sangue Quente',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele na primeira vez que entrar em Enfurecido por reduzir voluntariamente a própria Guarda. Depois disso, a primeira vez em cada próprio turno que fizer essa transição, seu próximo Ataque recebe +1 D.',
  },
  {
    id: cardId('BAP02'),
    classe: 'barbaro',
    nome: 'Sem Medo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele na primeira vez que terminar o próprio turno com Guarda 0. Depois disso, sempre que terminar Desencadeado, seu primeiro Ataque no próximo turno recebe +1 D.',
  },
  {
    id: cardId('BAP03'),
    classe: 'barbaro',
    nome: 'Dor é Combustível',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando perder pelo menos 4 de Vida de um único Ataque. Seu primeiro Ataque no próximo turno recebe +2 D. Depois disso, o mesmo evento concede +1 D.',
  },
  {
    id: cardId('BAP04'),
    classe: 'barbaro',
    nome: 'Quebra-Ossos',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando provocar sua primeira Ruptura. Depois disso, seu primeiro Ataque de cada turno contra Guarda 0 recebe +1 D.',
  },
  {
    id: cardId('BAP05'),
    classe: 'barbaro',
    nome: 'Fera Acuada',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 10 de Vida ou menos. Depois disso, enquanto permanecer nessa faixa, Ataques usados enquanto Enfurecido ou Desencadeado recebem +1 I.',
  },
  {
    id: cardId('BAP06'),
    classe: 'barbaro',
    nome: 'Sem Reserva',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno depois de realizar 3 Ações e ficar sem Reserva. Depois disso, sempre que repetir a situação, seu primeiro Ataque do próximo turno recebe +1 D.',
  },
  {
    id: cardId('BAP07'),
    classe: 'barbaro',
    nome: 'Pele de Ferro',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Reação impedir Ruptura. Depois disso, na primeira vez em cada turno inimigo que isso acontecer, reduza +1 D daquele Ataque.',
  },
  {
    id: cardId('BAP08'),
    classe: 'barbaro',
    nome: 'Frenesi Crescente',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando realizar 3 Ataques no mesmo turno pela primeira vez. Depois disso, o terceiro Ataque de cada turno recebe +1 D enquanto Enfurecido ou Desencadeado.',
  },
  {
    id: cardId('BAP09'),
    classe: 'barbaro',
    nome: 'Coração Selvagem',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando usar voluntariamente a própria Guarda como custo 3 vezes na partida. Depois disso, a primeira vez em cada próprio turno que reduzir Guarda como custo, reduza 1 ponto a menos, mínimo 1.',
  },
  {
    id: cardId('BAP10'),
    classe: 'barbaro',
    nome: 'Não Vou Cair',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando sobreviver a um Ataque com 3 de Vida ou menos. No próximo turno, seu primeiro Ataque recebe +2 D. Depois disso, quando começar um turno com 3 ou menos de Vida, o primeiro Ataque recebe +1 D.',
  },
];

export const CARTAS_DE_CLASSE_DO_BARBARO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BAC01'),
    classe: 'barbaro',
    nome: 'Instinto do Berserker',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Instinto do Berserker',
    textoAtivar:
      'Quando reduzir voluntariamente a própria Guarda e entrar em Enfurecido, seu próximo Ataque neste turno recebe +1 D.',
    textoExaurir:
      'Quando reduzir voluntariamente a própria Guarda até 0, seu próximo Ataque neste turno recebe +4 D.',
  },
  {
    id: cardId('BAC02'),
    classe: 'barbaro',
    nome: 'Instinto do Colosso',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Instinto do Colosso',
    textoAtivar:
      'Quando jogar um Ataque de pelo menos 3 AP enquanto Enfurecido ou Desencadeado, ele recebe +1 I.',
    textoExaurir: 'Aquele Ataque recebe +2 D e +3 I.',
  },
  {
    id: cardId('BAC03'),
    classe: 'barbaro',
    nome: 'Instinto do Sobrevivente',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Instinto do Sobrevivente',
    textoAtivar:
      'Durante o turno inimigo, se estiver Desencadeado, ao receber um Ataque reduza 1 D e 1 I.',
    textoExaurir:
      'Quando um Ataque fosse reduzir sua Vida a 0, depois de toda a resolução ajuste sua Vida para 1.',
  },
  {
    id: cardId('BAC04'),
    classe: 'barbaro',
    nome: 'Totem do Urso',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Totem do Urso',
    textoAtivar:
      'Quando reduzir voluntariamente a própria Guarda, o próximo Ataque inimigo que causar Dano antes do seu próximo turno causa 1 D a menos.',
    textoExaurir: 'Durante o turno inimigo, reduza 4 D de um único Ataque.',
  },
  {
    id: cardId('BAC05'),
    classe: 'barbaro',
    nome: 'Totem do Lobo',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Totem do Lobo',
    textoAtivar:
      'Quando jogar um Ataque imediatamente depois de outro Ataque, o segundo recebe +1 D.',
    textoExaurir:
      'Um Ataque que seja sua terceira Ação depois de pelo menos 1 Ataque anterior recebe +3 D e +1 I.',
  },
  {
    id: cardId('BAC06'),
    classe: 'barbaro',
    nome: 'Totem da Tempestade',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Totem da Tempestade',
    textoAtivar:
      'Quando provocar Ruptura, aquele Ataque recebe +1 D depois do bônus normal da Ruptura.',
    textoExaurir:
      'Quando um Ataque estiver prestes a provocar Ruptura, recebe +2 I antes da resolução. Se a Ruptura acontecer, recebe +2 D adicionais.',
  },
];

export const ULTIMATES_DO_BARBARO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BAU01'),
    classe: 'barbaro',
    nome: 'Fim do Mundo',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 6, impacto: 3 },
    texto:
      'Ataque. 3 AP. 6 D / 3 I. Antes da resolução, pode reduzir voluntariamente toda a própria Guarda restante a 0. Se fizer isso, recebe +4 D e +1 I.',
  },
  {
    id: cardId('BAU02'),
    classe: 'barbaro',
    nome: 'Frenesi sem Freio',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    custo: { moeda: 'ap', valor: 1 },
    texto:
      'Técnica. 1 AP. Durante o restante do turno, os próximos 2 Ataques custam 1 AP a menos, mínimo 1. Depois que cada um resolver, reduza voluntariamente a Guarda em 2. Este efeito pode ultrapassar o limite normal de sacrifício de Guarda. O limite de 3 Ações permanece.',
  },
  {
    id: cardId('BAU03'),
    classe: 'barbaro',
    nome: 'Recusar a Morte',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2 },
    texto:
      'Reação. 2 R. Só contra um Ataque que derrotaria você. Depois de toda a resolução, sua Vida fica em 1 e sua Guarda em 0.',
  },
];
