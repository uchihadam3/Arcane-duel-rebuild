import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Canções, Instrumentos e Ultimates do Bardo.
 *
 * As seis Cartas de Classe são três Canções e três Instrumentos, e a build
 * escolhe uma de cada.
 */

export const PASSIVAS_DO_BARDO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BP01'),
    classe: 'bardo',
    nome: 'Ouvido Absoluto',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando produzir 2 Cadências no mesmo turno. Depois disso, na primeira vez em cada turno que produzir a segunda Cadência, sua terceira Ação recebe +1 D ou +1 I se for Ataque.',
  },
  {
    id: cardId('BP02'),
    classe: 'bardo',
    nome: 'Crescendo Natural',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando realizar 3 Ações com 3 Notas diferentes. Depois disso, a terceira Ação de cada turno, se for Ataque e completar 3 Notas diferentes, recebe +1 D.',
  },
  {
    id: cardId('BP03'),
    classe: 'bardo',
    nome: 'Público Cativo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o adversário usar cartas de Reação contra 2 Ataques diferentes seus na mesma rodada. Depois disso, a primeira vez em cada próprio turno que o adversário usar uma Reação e o Ataque ainda causar Dano à Vida, sua próxima Ação recebe +1 D se for Ataque.',
  },
  {
    id: cardId('BP04'),
    classe: 'bardo',
    nome: 'Harmonia Defensiva',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Reação sua reduzir Dano e Impacto ao mesmo tempo. Depois disso, na primeira vez em cada turno inimigo que isso ocorrer, a Reação reduz +1 D ou +1 I.',
  },
  {
    id: cardId('BP05'),
    classe: 'bardo',
    nome: 'Memória Musical',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma habilidade sua voltar à mão antes do momento normal. Depois disso, a primeira habilidade de cada próprio turno que retornar dessa forma custa 1 AP a menos se usada no mesmo turno, mínimo 1.',
  },
  {
    id: cardId('BP06'),
    classe: 'bardo',
    nome: 'Ritmo Sustentado',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno com 2 de Reserva. Depois disso, na primeira vez em cada turno que produzir Cadência tendo começado aquele turno com 2 de Reserva, sua próxima Ação recebe +1 D ou +1 I se for Ataque.',
  },
  {
    id: cardId('BP07'),
    classe: 'bardo',
    nome: 'Virtuose',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Ativar seu Instrumento pela terceira vez. Depois disso, a primeira vez em cada rodada que Ativar o Instrumento, sua próxima Ação recebe +1 D ou +1 I se for Ataque.',
  },
  {
    id: cardId('BP08'),
    classe: 'bardo',
    nome: 'Canção Inesquecível',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Ativar sua Canção pela terceira vez. Depois disso, a primeira Ativação da Canção a cada rodada aumenta em 1 um valor numérico adequado do efeito.',
  },
  {
    id: cardId('BP09'),
    classe: 'bardo',
    nome: 'Último Refrão',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 10 de Vida ou menos. Depois disso, sua terceira Ação de cada turno custa 1 AP a menos se você já produziu 2 Cadências naquele turno, mínimo 1.',
  },
  {
    id: cardId('BP10'),
    classe: 'bardo',
    nome: 'Silêncio Antes do Aplauso',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando realizar apenas 1 Ação num turno e terminar com 2 de Reserva. No próximo turno, seu primeiro Ataque recebe +2 D. Depois disso, quando repetir a preparação, recebe +1 D em vez de +2.',
  },
];

export const CARTAS_DE_CLASSE_DO_BARDO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BC01'),
    classe: 'bardo',
    nome: 'Canção da Marcha',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Canção da Marcha',
    textoAtivar: 'Quando produzir Cadência, seu próximo Ataque neste turno recebe +1 I.',
    textoExaurir:
      'Ao declarar sua terceira Ação depois de ter produzido 2 Cadências neste turno, se ela for Ataque, recebe +2 D e +2 I.',
  },
  {
    id: cardId('BC02'),
    classe: 'bardo',
    nome: 'Canção do Lamento',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Canção do Lamento',
    textoAtivar:
      'Quando um Ataque inimigo for causar pelo menos 3 D antes das reduções, reduza 1 D.',
    textoExaurir: 'Nas mesmas condições, reduza 4 D.',
  },
  {
    id: cardId('BC03'),
    classe: 'bardo',
    nome: 'Canção da Discórdia',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Canção da Discórdia',
    textoAtivar:
      'Quando o adversário usar uma carta de Reação contra seu Ataque, depois da resolução, se o Ataque ainda causar Dano à Vida, sua próxima Ação neste turno recebe +1 D ou +1 I se for Ataque.',
    textoExaurir:
      'Quando uma Reação for declarada contra seu Ataque, depois de aplicar a redução da Reação, o Ataque recebe +3 D.',
  },
  {
    id: cardId('BC04'),
    classe: 'bardo',
    nome: 'Tambor de Guerra',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Tambor de Guerra',
    textoAtivar: 'Quando jogar um Ataque de Pulso, ele recebe +1 I.',
    textoExaurir:
      'O Ataque de Pulso recebe +3 I. Se causar Ruptura, sua próxima Ação neste turno custa 1 AP a menos, mínimo 1.',
  },
  {
    id: cardId('BC05'),
    classe: 'bardo',
    nome: 'Alaúde de Cristal',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Alaúde de Cristal',
    textoAtivar:
      'Depois que uma Ação de Melodia resolver, mova uma habilidade sua de CD2 para CD1.',
    textoExaurir:
      'Depois que uma Ação de Melodia resolver, devolva qualquer habilidade sua em cooldown para a mão. Se usar neste turno, custa +1 AP.',
  },
  {
    id: cardId('BC06'),
    classe: 'bardo',
    nome: 'Flauta de Prata',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Flauta de Prata',
    textoAtivar:
      'Depois que uma Ação de Harmonia resolver no seu turno, no fim daquele turno ganhe +1 Reserva além da conversão normal, máximo 2.',
    textoExaurir:
      'Durante o turno adversário, antes de responder a uma Ação, ajuste sua Reserva para 2.',
  },
];

export const ULTIMATES_DO_BARDO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BU01'),
    classe: 'bardo',
    nome: 'Grande Finale',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 5, impacto: 2 },
    texto:
      'Ataque. 3 AP. 5 D / 2 I. Só pode ser declarado como terceira Ação se as 2 Ações anteriores tiverem Notas diferentes. Recebe +2 D para cada uma dessas Notas que ainda não se repetiu no turno, máximo +4 D.',
  },
  {
    id: cardId('BU02'),
    classe: 'bardo',
    nome: 'Bis',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    custo: { moeda: 'ap', valor: 2 },
    texto:
      'Técnica. 2 AP. Deixe Prontas sua Canção e seu Instrumento. Devolva 1 habilidade sua de CD1 para a mão e recupere 1 AP. O limite normal de 3 Ações permanece.',
  },
  {
    id: cardId('BU03'),
    classe: 'bardo',
    nome: 'Silêncio da Plateia',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2 },
    texto:
      'Reação. 2 R. O Dano e o Impacto finais da ação se tornam 0. Depois, deixe Prontas sua Canção e seu Instrumento.',
  },
];
