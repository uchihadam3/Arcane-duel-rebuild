import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Métodos, Ferramentas e Ultimates do Ladino.
 *
 * As seis Cartas de Classe são três Métodos e três Ferramentas, e a build
 * escolhe uma de cada.
 */

export const PASSIVAS_DO_LADINO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('LP01'),
    classe: 'ladino',
    nome: 'Primeiro Sangue',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando causar o primeiro Dano à Vida da partida. Crie 1 Brecha. Depois disso, o primeiro Ataque de cada turno que atingir Vida sem receber Reação recebe +1 D.',
  },
  {
    id: cardId('LP02'),
    classe: 'ladino',
    nome: 'Passos Invisíveis',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o adversário terminar um turno sem causar Dano à sua Vida. No início do seu próximo turno, seu primeiro Ataque custa 1 AP a menos, mínimo 1. Depois disso, esse efeito pode ocorrer novamente uma vez por rodada.',
  },
  {
    id: cardId('LP03'),
    classe: 'ladino',
    nome: 'Predador da Brecha',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o adversário sofrer sua primeira Ruptura. Depois disso, o primeiro Ataque de cada turno contra Guarda 0 recebe +1 D.',
  },
  {
    id: cardId('LP04'),
    classe: 'ladino',
    nome: 'Mãos Rápidas',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando realizar 3 Ações pela primeira vez. Depois disso, quando sua terceira Ação custar originalmente 1 AP e for Ataque, ela recebe +1 D ou +1 I.',
  },
  {
    id: cardId('LP05'),
    classe: 'ladino',
    nome: 'Sangue Frio',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 10 de Vida ou menos. Crie 2 Brechas. Depois disso, enquanto permanecer nessa faixa, sua primeira habilidade de cada turno que consuma Brecha consome 1 a menos, mínimo 0.',
  },
  {
    id: cardId('LP06'),
    classe: 'ladino',
    nome: 'Olho para Reações',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o adversário usar sua segunda carta de Reação na mesma rodada. Depois disso, a primeira vez em cada turno que o adversário usar uma carta de Reação contra seu Ataque, crie 1 Brecha depois da resolução.',
  },
  {
    id: cardId('LP07'),
    classe: 'ladino',
    nome: 'Ferida Aberta',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o adversário alcançar Sangramento 2. Depois disso, seu primeiro Ataque de cada turno contra alguém com Sangramento recebe +1 D.',
  },
  {
    id: cardId('LP08'),
    classe: 'ladino',
    nome: 'Improvisador',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma habilidade sua voltar da recarga para a mão antes do momento normal. Depois disso, a primeira habilidade que retornar dessa forma em cada turno custa 1 AP a menos se usada no mesmo turno, mínimo 1.',
  },
  {
    id: cardId('LP09'),
    classe: 'ladino',
    nome: 'Sem Testemunhas',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o adversário estiver com Guarda 0 e Sangramento ao mesmo tempo. Depois disso, o primeiro Ataque de cada turno nessa situação recebe +1 D.',
  },
  {
    id: cardId('LP10'),
    classe: 'ladino',
    nome: 'Plano de Fuga',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno com 2 de Reserva. Depois disso, a primeira Reação de cada turno inimigo que criaria Brecha cria 1 Brecha adicional, respeitando o máximo de 3.',
  },
];

export const CARTAS_DE_CLASSE_DO_LADINO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('LC01'),
    classe: 'ladino',
    nome: 'Método do Assassino',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Método do Assassino',
    textoAtivar: 'Ao atacar um adversário com Guarda 0, o Ataque recebe +1 D.',
    textoExaurir: 'Um Ataque contra Guarda 0 recebe +4 D.',
  },
  {
    id: cardId('LC02'),
    classe: 'ladino',
    nome: 'Método do Duelista',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Método do Duelista',
    textoAtivar: 'Quando uma Reação sua reduzir Dano a 0, crie 1 Brecha.',
    textoExaurir:
      'Quando responder a um Ataque, reduza +3 D. Se o Dano final for 0, o adversário perde 3 Vida e crie 1 Brecha.',
  },
  {
    id: cardId('LC03'),
    classe: 'ladino',
    nome: 'Método do Sabotador',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Método do Sabotador',
    textoAtivar:
      'Quando uma habilidade sua mover uma carta adversária para um cooldown mais distante ou deixar uma Carta de Classe inimiga Ativada por Sabotagem, crie 1 Brecha.',
    textoExaurir:
      'Escolha até 2 habilidades adversárias atualmente em cooldown e mova cada uma 1 etapa para mais longe da mão.',
  },
  {
    id: cardId('LC04'),
    classe: 'ladino',
    nome: 'Lâminas Serrilhadas',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Lâminas Serrilhadas',
    textoAtivar: 'Quando um Ataque causar Dano à Vida, aplique Sangramento 1.',
    textoExaurir: 'O Ataque recebe +1 D e, se causar Dano à Vida, aplique Sangramento 2.',
  },
  {
    id: cardId('LC05'),
    classe: 'ladino',
    nome: 'Frasco de Fumaça',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Frasco de Fumaça',
    textoAtivar: 'Quando usar uma Reação, ela reduz +1 D ou +1 I.',
    textoExaurir: 'Quando usar uma Reação, ela reduz +2 D e +2 I.',
  },
  {
    id: cardId('LC06'),
    classe: 'ladino',
    nome: 'Fio Oculto',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Fio Oculto',
    textoAtivar: 'Quando sua segunda ou terceira Ação for um Ataque, ele recebe +1 I.',
    textoExaurir: 'Aquele Ataque recebe +2 D e +2 I. Se causar Ruptura, crie 2 Brechas.',
  },
];

export const ULTIMATES_DO_LADINO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('LU01'),
    classe: 'ladino',
    nome: 'Golpe Perfeito',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    // "Consuma até 3 Brechas... Exige ao menos 2 Brechas para ser declarado":
    // o intervalo impresso é de 2 a 3, e quem escolhe dentro dele é o jogador.
    custo: { moeda: 'ap', valor: 3, variavel: { recurso: 'brecha', minimo: 2, maximo: 3 } },
    valores: { dano: 8, impacto: 0 },
    texto:
      'Ataque. 3 AP. Consuma até 3 Brechas. 8 D / 0 I. Se o adversário estiver com Guarda 0, recebe +2 D. Exige ao menos 2 Brechas para ser declarado.',
  },
  {
    id: cardId('LU02'),
    classe: 'ladino',
    nome: 'Mil Cortes',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3, recurso: { recurso: 'brecha', quantidade: 2 } },
    valores: { dano: 4, impacto: 2 },
    texto:
      'Ataque. 3 AP. Consuma 2 Brechas. 4 D / 2 I. Depois da resolução, recebe +2 D por Ação anterior realizada neste turno, até +4 D.',
  },
  {
    id: cardId('LU03'),
    classe: 'ladino',
    nome: 'Desaparecer',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2, recurso: { recurso: 'brecha', quantidade: 3 } },
    texto:
      'Reação. 2 R. Consuma 3 Brechas. O Dano final se torna 0. Depois da resolução, devolva imediatamente até 2 habilidades suas de CD1 para a mão.',
  },
];
