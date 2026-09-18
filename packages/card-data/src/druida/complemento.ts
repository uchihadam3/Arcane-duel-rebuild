import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Formas Selvagens, Círculos Naturais e Ultimates do Druida.
 *
 * As três Cartas de Forma têm uma terceira metade além de Ativar e Exaurir:
 * um efeito permanente que vale enquanto o Druida estiver Selvagem. Ele está
 * transcrito no texto da carta, junto do nome.
 */

export const PASSIVAS_DO_DRUIDA: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('DP01'),
    classe: 'druida',
    nome: 'Duas Naturezas',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele na primeira vez que realizar uma Ação em Forma Humana e outra em Forma Selvagem no mesmo turno. Depois disso, na primeira vez em cada próprio turno que fizer isso, sua próxima Ação ofensiva recebe +1 D ou +1 I.',
  },
  {
    id: cardId('DP02'),
    classe: 'druida',
    nome: 'Sangue da Fera',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando um Ataque Selvagem provocar sua primeira Ruptura. Depois disso, o primeiro Ataque Selvagem de cada turno contra Guarda 0 recebe +1 D.',
  },
  {
    id: cardId('DP03'),
    classe: 'druida',
    nome: 'Sabedoria Ancestral',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Técnica em Forma Humana preparar diretamente uma ação posterior. Depois disso, a primeira Técnica de cada turno em Forma Humana que alterar valor numérico da ação seguinte aumenta esse valor em 1.',
  },
  {
    id: cardId('DP04'),
    classe: 'druida',
    nome: 'Pele Renovada',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando mudar de Forma Selvagem para Humana com 15 de Vida ou menos. Restaure 2 Vida. Depois disso, a próxima vez na partida que repetir essa transformação abaixo de 15, restaure 1 Vida.',
  },
  {
    id: cardId('DP05'),
    classe: 'druida',
    nome: 'Instinto Predatório',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando o segundo Ataque do mesmo turno causar Dano à Vida. Depois disso, o segundo Ataque de cada turno em Forma Selvagem recebe +1 D.',
  },
  {
    id: cardId('DP06'),
    classe: 'druida',
    nome: 'Raízes Profundas',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Reação impedir Ruptura em Forma Humana. Depois disso, na primeira vez em cada turno inimigo que isso ocorrer, restaure 1 Guarda.',
  },
  {
    id: cardId('DP07'),
    classe: 'druida',
    nome: 'Olho da Tempestade',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando um Ataque causar pelo menos 3 I depois das reduções. Depois disso, na primeira vez em cada turno que isso ocorrer, seu próximo Ataque recebe +1 D.',
  },
  {
    id: cardId('DP08'),
    classe: 'druida',
    nome: 'Metamorfose Perfeita',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando mudar de forma 2 vezes no mesmo turno. Depois disso, na primeira vez em cada próprio turno que usar Metamorfose Instintiva, sua próxima ação ofensiva recebe +1 D ou +1 I.',
  },
  {
    id: cardId('DP09'),
    classe: 'druida',
    nome: 'Sobrevivência Selvagem',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 10 de Vida ou menos em Forma Selvagem. Depois disso, sua Defesa Inata na Forma Selvagem reduz 1 ponto adicional do tipo escolhido.',
  },
  {
    id: cardId('DP10'),
    classe: 'druida',
    nome: 'Equilíbrio Natural',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno tendo realizado pelo menos 1 Ação em cada forma e ainda possuir Reserva. Depois disso, sempre que repetir essa situação, restaure 1 Vida.',
  },
];

export const CARTAS_DE_CLASSE_DO_DRUIDA: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('DC01'),
    classe: 'druida',
    nome: 'Forma do Urso',
    tipo: 'carta-de-classe',
    tags: [],
    texto:
      'Forma do Urso. Enquanto Selvagem, o primeiro Ataque de cada turno com pelo menos 2 I recebe +1 I.',
    textoAtivar: 'Enquanto Selvagem e ao receber um Ataque, reduza +1 D e +1 I.',
    textoExaurir:
      'Durante uma Resposta enquanto Selvagem, reduza +4 D e +2 I. Depois, volte para Forma Humana e não poderá mais entrar em Forma Selvagem pelo restante da partida.',
  },
  {
    id: cardId('DC02'),
    classe: 'druida',
    nome: 'Forma do Lobo',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Forma do Lobo. Enquanto Selvagem, o segundo Ataque do mesmo turno recebe +1 D.',
    textoAtivar: 'Quando declarar esse segundo Ataque, ele recebe +1 I.',
    textoExaurir:
      'Ao declarar seu segundo ou terceiro Ataque do turno, ele recebe +3 D e +1 I. Depois, volte para Forma Humana e não poderá mais entrar em Forma Selvagem.',
  },
  {
    id: cardId('DC03'),
    classe: 'druida',
    nome: 'Forma do Corvo',
    tipo: 'carta-de-classe',
    tags: [],
    texto:
      'Forma do Corvo. Enquanto Selvagem, a primeira Técnica de cada turno pode mover uma habilidade sua de CD2 para CD1 depois da resolução.',
    textoAtivar:
      'Enquanto Selvagem, a primeira Técnica de cada turno pode mover uma habilidade sua de CD2 para CD1 depois da resolução.',
    textoExaurir:
      'Depois que uma Técnica resolver, devolva 1 habilidade sua de CD1 para a mão. Depois, volte para Forma Humana e não poderá mais entrar em Forma Selvagem.',
  },
  {
    id: cardId('DC04'),
    classe: 'druida',
    nome: 'Círculo do Bosque',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Círculo do Bosque',
    textoAtivar: 'Quando uma habilidade restaurar Vida ou Guarda, aumente a restauração em 1.',
    textoExaurir: 'Quando uma habilidade restaurar Vida ou Guarda, restaure +3 do mesmo tipo.',
  },
  {
    id: cardId('DC05'),
    classe: 'druida',
    nome: 'Círculo da Tempestade',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Círculo da Tempestade',
    textoAtivar: 'Quando um Ataque possuir pelo menos 3 I antes das reduções, ele recebe +1 D.',
    textoExaurir: 'Ao declarar um Ataque, ele recebe +2 D e +2 I.',
  },
  {
    id: cardId('DC06'),
    classe: 'druida',
    nome: 'Círculo da Lua',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Círculo da Lua',
    textoAtivar:
      'Quando mudar de forma, sua primeira ação depois da transformação recebe +1 D se for Ataque ou reduz +1 D se for Reação.',
    textoExaurir:
      'Quando mudar de forma, deixe Pronta sua Carta de Forma se estiver Ativada. Sua próxima ação ofensiva neste turno recebe +2 D e +1 I.',
  },
];

export const ULTIMATES_DO_DRUIDA: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('DU01'),
    classe: 'druida',
    nome: 'Avatar Selvagem',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 6, impacto: 3 },
    texto:
      'Ataque. 3 AP. 6 D / 3 I. Se estiver em Forma Selvagem, recebe +2 D. Se mudou de Humana para Selvagem neste turno, recebe também +1 I.',
  },
  {
    id: cardId('DU02'),
    classe: 'druida',
    nome: 'Fúria da Natureza',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 5, impacto: 4 },
    texto:
      'Ataque. 3 AP. 5 D / 4 I. Antes da resolução, pode mudar de forma gratuitamente mesmo que já tenha usado Metamorfose. Depois da transformação, se estiver Humano recebe +2 I; se estiver Selvagem recebe +2 D.',
  },
  {
    id: cardId('DU03'),
    classe: 'druida',
    nome: 'Renascimento Primal',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    custo: { moeda: 'ap', valor: 2 },
    texto:
      'Técnica. 2 AP. Restaure 4 Vida e 2 Guarda. Depois, pode mudar de forma. Se uma Carta de Classe estiver Ativada, deixe-a Pronta. Não recupera Carta de Classe Exaurida.',
  },
];
