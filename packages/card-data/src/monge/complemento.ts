import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Posturas, Mantras e Ultimates do Monge.
 *
 * As seis Cartas de Classe são três Posturas e três Mantras, e a build escolhe
 * uma de cada.
 */

export const PASSIVAS_DO_MONGE: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('MOP01'),
    classe: 'monge',
    nome: 'Disciplina Perfeita',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele ao completar seu primeiro Kata. Depois disso, a primeira vez em cada próprio turno que completar um Kata, recupere 1 Chi Gasto adicional.',
  },
  {
    id: cardId('MOP02'),
    classe: 'monge',
    nome: 'Primeiro Passo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Abertura produzir pelo menos 3 pontos somados entre Dano e Impacto depois das reduções. Depois disso, sua primeira Abertura de cada turno recebe +1 I.',
  },
  {
    id: cardId('MOP03'),
    classe: 'monge',
    nome: 'Fluxo Contínuo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Ação de Fluxo recuperar Chi pelo Fluxo Interior. Depois disso, a primeira Ação de Fluxo de cada turno que vier depois de Abertura recebe +1 D ou +1 I.',
  },
  {
    id: cardId('MOP04'),
    classe: 'monge',
    nome: 'Golpe Derradeiro',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Finalização provocar Ruptura. Depois disso, a primeira Finalização de cada turno jogada depois de Fluxo recebe +1 D.',
  },
  {
    id: cardId('MOP05'),
    classe: 'monge',
    nome: 'Mente Imóvel',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno com 2 de Reserva. Depois disso, sua primeira Reação de cada turno inimigo que custe Chi custa 1 Chi a menos, mínimo 0.',
  },
  {
    id: cardId('MOP06'),
    classe: 'monge',
    nome: 'Dor como Mestre',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando perder 4 ou mais de Vida de um Ataque. Recupere até 2 Chi Gastos. Depois disso, na primeira vez por turno inimigo que perder 4 ou mais, recupere 1 Chi Gasto.',
  },
  {
    id: cardId('MOP07'),
    classe: 'monge',
    nome: 'Respiração Profunda',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando começar um turno com as 3 pedras de Chi Gastas. Recupere 2. Depois disso, sempre que começar um turno sem Chi Pronto, recupere 1.',
  },
  {
    id: cardId('MOP08'),
    classe: 'monge',
    nome: 'Forma Adaptável',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Postura do Rio modificar uma sequência pela primeira vez. Depois disso, uma vez por próprio turno, gaste 1 Chi para considerar uma Ação que quebraria a sequência como a etapa correta apenas para recuperar Chi do Fluxo Interior. Isso não completa Kata sozinho.',
  },
  {
    id: cardId('MOP09'),
    classe: 'monge',
    nome: 'Corpo e Espírito',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Reação impedir Ruptura e reduzir o Dano final a 0 ao mesmo tempo. Depois disso, na primeira vez em cada turno inimigo que isso ocorrer, recupere 1 Chi Gasto e restaure 1 Guarda.',
  },
  {
    id: cardId('MOP10'),
    classe: 'monge',
    nome: 'Último Mestre',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 10 de Vida ou menos. Recupere até 2 Chi Gastos. Depois disso, sua primeira Finalização de cada turno custa 1 Chi a menos, mínimo 0.',
  },
];

export const CARTAS_DE_CLASSE_DO_MONGE: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('MOC01'),
    classe: 'monge',
    nome: 'Postura do Tigre',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Postura do Tigre',
    textoAtivar:
      'Quando uma Finalização for jogada imediatamente depois de Fluxo, se for Ataque, recebe +1 D.',
    textoExaurir: 'Nas mesmas condições, o Ataque recebe +3 D e +1 I.',
  },
  {
    id: cardId('MOC02'),
    classe: 'monge',
    nome: 'Postura da Garça',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Postura da Garça',
    textoAtivar: 'Quando uma Reação reduzir o Dano final a 0, recupere 1 Chi Gasto.',
    textoExaurir: 'Quando usar uma Reação, ela reduz +3 D e +2 I.',
  },
  {
    id: cardId('MOC03'),
    classe: 'monge',
    nome: 'Postura do Rio',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Postura do Rio',
    textoAtivar:
      'Quando uma Ação quebraria sua sequência, trate-a como a etapa necessária naquele momento apenas para determinar a sequência do Kata. O texto e os valores não mudam.',
    textoExaurir:
      'Antes de jogar uma Ação, escolha Abertura, Fluxo ou Finalização. Aquela Ação conta como a etapa escolhida e, se for Ataque, recebe +1 D e +1 I.',
  },
  {
    id: cardId('MOC04'),
    classe: 'monge',
    nome: 'Mantra do Fôlego',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Mantra do Fôlego',
    textoAtivar: 'Quando recuperar Chi por Fluxo Interior, recupere 1 Chi Gasto adicional.',
    textoExaurir: 'Deixe as 3 pedras de Chi Prontas.',
  },
  {
    id: cardId('MOC05'),
    classe: 'monge',
    nome: 'Mantra do Vazio',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Mantra do Vazio',
    textoAtivar: 'Quando gastar Chi em uma Reação, ela reduz +1 D ou +1 I.',
    textoExaurir: 'Quando usar uma Reação, ela reduz +2 D e +2 I.',
  },
  {
    id: cardId('MOC06'),
    classe: 'monge',
    nome: 'Mantra do Retorno',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Mantra do Retorno',
    textoAtivar:
      'Depois de completar um Kata, escolha 1 das 3 cartas usadas. Quando entrar em cooldown, coloque-a uma etapa mais próxima da mão.',
    textoExaurir:
      'Depois de completar um Kata, escolha 1 das cartas usadas e devolva-a diretamente à mão em vez de colocá-la em cooldown.',
  },
];

export const ULTIMATES_DO_MONGE: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('MOU01'),
    classe: 'monge',
    nome: 'Punho dos Cem Ecos',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    kata: 'finalizacao',
    custo: { moeda: 'ap', valor: 3, recurso: { recurso: 'chi', quantidade: 3 } },
    valores: { dano: 6, impacto: 2 },
    texto:
      'Finalização/Ataque. 3 AP + 3 Chi. 6 D / 2 I. Se as 2 Ações imediatamente anteriores foram Abertura seguida de Fluxo, recebe +3 D e +2 I.',
  },
  {
    id: cardId('MOU02'),
    classe: 'monge',
    nome: 'Mente Vazia',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2, recurso: { recurso: 'chi', quantidade: 3 } },
    texto:
      'Reação. 2 R + 3 Chi. O Dano e o Impacto finais do Ataque se tornam 0. Depois da resolução, recupere 1 Chi Gasto.',
  },
  {
    id: cardId('MOU03'),
    classe: 'monge',
    nome: 'Três Portões',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    kata: 'abertura',
    custo: { moeda: 'ap', valor: 1, recurso: { recurso: 'chi', quantidade: 3 } },
    texto:
      'Abertura/Técnica. 1 AP + 3 Chi. Durante o restante do turno, a primeira Ação de Fluxo e a primeira Finalização custam 1 AP a menos, mínimo 1. Se completar Kata, as 3 cartas entram no cooldown uma etapa mais próxima da mão.',
  },
];
