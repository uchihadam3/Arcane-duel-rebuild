import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Pactos, Maldições e Ultimates do Bruxo.
 *
 * "O Bruxo escolhe 1 Pacto e 1 Maldição": as seis Cartas de Classe vêm em dois
 * trios, e a composição da build é conferida por card-data/classes.ts.
 */

export const PASSIVAS_DO_BRUXO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BRP01'),
    classe: 'bruxo',
    nome: 'Sangue por Poder',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele na primeira vez que usar Preço Proibido. Depois disso, a primeira habilidade ofensiva de cada turno jogada por Preço Proibido recebe +1 I.',
  },
  {
    id: cardId('BRP02'),
    classe: 'bruxo',
    nome: 'Dor Familiar',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando perder pelo menos 3 Vida por efeitos próprios no mesmo turno. Depois disso, a primeira vez por turno que chegar a 3 ou mais perdidos dessa forma, seu próximo Ataque recebe +1 D.',
  },
  {
    id: cardId('BRP03'),
    classe: 'bruxo',
    nome: 'Pacto Profundo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Ativar o Pacto pela terceira vez. Depois disso, na primeira Ativação do Pacto em cada rodada, restaure 1 Vida depois do efeito, se ainda estiver vivo.',
  },
  {
    id: cardId('BRP04'),
    classe: 'bruxo',
    nome: 'Maldição Persistente',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Ativar a Maldição pela terceira vez. Depois disso, na primeira Ativação da Maldição em cada rodada, sua próxima habilidade ofensiva recebe +1 I.',
  },
  {
    id: cardId('BRP05'),
    classe: 'bruxo',
    nome: 'Tudo Tem um Preço',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno tendo usado Preço Proibido e ainda possuir 2 de Reserva. Depois disso, quando repetir a situação, restaure 1 Vida.',
  },
  {
    id: cardId('BRP06'),
    classe: 'bruxo',
    nome: 'Cicatriz do Abismo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 15 de Vida ou menos devido a custo próprio. Depois disso, enquanto estiver com 15 ou menos, a primeira habilidade de cada turno que fizer você perder Vida como custo recebe +1 D ou +1 I.',
  },
  {
    id: cardId('BRP07'),
    classe: 'bruxo',
    nome: 'Não Há Retorno',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 10 de Vida ou menos. Depois disso, uma vez por turno, pode perder 1 Vida adicional ao declarar um Ataque para receber +1 D.',
  },
  {
    id: cardId('BRP08'),
    classe: 'bruxo',
    nome: 'Dor Compartilhada',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Transferir a Dor fizer ambos os personagens perderem Vida. Depois disso, na primeira vez em cada turno inimigo que perder Vida por uma Reação própria, o adversário também perde 1 Vida.',
  },
  {
    id: cardId('BRP09'),
    classe: 'bruxo',
    nome: 'Mestre das Barganhas',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando usar 2 custos diferentes de Vida no mesmo turno. Depois disso, na primeira vez em cada próprio turno que fizer isso, deixe Pronta 1 Carta de Classe sua Ativada.',
  },
  {
    id: cardId('BRP10'),
    classe: 'bruxo',
    nome: 'Último Contrato',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando começar o turno com 5 de Vida ou menos. Na primeira revelação, restaure 2 Vida. Depois disso, enquanto começar nessa faixa, seu primeiro Ataque jogado por Preço Proibido recebe +2 D.',
  },
];

export const CARTAS_DE_CLASSE_DO_BRUXO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BRC01'),
    classe: 'bruxo',
    nome: 'Pacto de Sangue',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Pacto de Sangue',
    textoAtivar:
      'Quando perder Vida por efeito próprio durante uma ação ofensiva, aquela ação recebe +1 D.',
    textoExaurir: 'Ao declarar um Ataque, perca 3 Vida e o Ataque recebe +4 D.',
  },
  {
    id: cardId('BRC02'),
    classe: 'bruxo',
    nome: 'Pacto das Sombras',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Pacto das Sombras',
    textoAtivar: 'Quando usar uma Reação, pode perder 1 Vida para ela reduzir +1 D e +1 I.',
    textoExaurir: 'Durante uma Reação, ela reduz +4 D e +2 I.',
  },
  {
    id: cardId('BRC03'),
    classe: 'bruxo',
    nome: 'Pacto do Abismo',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Pacto do Abismo',
    textoAtivar: 'Quando provocar Ruptura, depois da resolução restaure 1 Vida.',
    textoExaurir:
      'Ao declarar um Ataque, ele recebe +3 I. Se provocar Ruptura, restaure 3 Vida depois da resolução.',
  },
  {
    id: cardId('BRC04'),
    classe: 'bruxo',
    nome: 'Maldição da Fragilidade',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Maldição da Fragilidade',
    textoAtivar:
      'Quando o adversário estiver com 3 ou menos de Guarda e receber um Ataque seu, o Ataque recebe +1 I.',
    textoExaurir:
      'Ao declarar um Ataque contra um adversário com 3 ou menos de Guarda, ele recebe +2 D e +3 I.',
  },
  {
    id: cardId('BRC05'),
    classe: 'bruxo',
    nome: 'Maldição da Fome',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Maldição da Fome',
    textoAtivar: 'Quando o adversário restaurar Vida, reduza a restauração em 1.',
    textoExaurir:
      'Quando o adversário fosse restaurar Vida, reduza aquela restauração em 4, mínimo 0, e ele perde 1 Vida.',
  },
  {
    id: cardId('BRC06'),
    classe: 'bruxo',
    nome: 'Maldição da Agonia',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Maldição da Agonia',
    textoAtivar:
      'Quando o adversário concluir sua segunda Ação no mesmo turno, se aquela Ação causou Dano a você ou consumiu uma Reação sua, ele perde 1 Vida.',
    textoExaurir:
      'Depois que o adversário concluir a segunda Ação, ele perde 2 Vida. Se ainda realizar uma terceira Ação neste turno, perde mais 2 depois que ela resolver.',
  },
];

export const ULTIMATES_DO_BRUXO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('BRU01'),
    classe: 'bruxo',
    nome: 'Condenação',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 7, impacto: 2 },
    texto:
      'Ataque. 3 AP. 7 D / 2 I. Antes da resolução, pode perder até 4 Vida. Para cada 2 Vida perdidos dessa forma, recebe +2 D.',
  },
  {
    id: cardId('BRU02'),
    classe: 'bruxo',
    nome: 'Contrato Final',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    custo: { moeda: 'ap', valor: 2 },
    texto:
      'Técnica. 2 AP. Até o fim do turno, pode usar Preço Proibido em até 2 habilidades diferentes, mesmo que já tenha usado. Na primeira vez que perder Vida por efeito próprio neste turno, deixe Pronta uma Carta de Classe sua Ativada.',
  },
  {
    id: cardId('BRU03'),
    classe: 'bruxo',
    nome: 'O Preço Não é Meu',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2 },
    texto:
      'Reação. 2 R. Dano e Impacto finais daquele Ataque se tornam 0. Depois da resolução, perca 3 Vida que não podem ser reduzidos. Se essa perda fosse derrotá-lo, a Ultimate não pode ser usada.',
  },
];
