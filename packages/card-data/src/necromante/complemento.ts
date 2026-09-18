import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Servos e Ultimates do Necromante.
 *
 * As seis Cartas de Classe do Necromante são os Servos, e a build escolhe dois
 * diferentes. Todo Servo Ativado pode receber uma Alma anexada, e o lado
 * Ativar de cada um oferece um efeito adicional a quem devolver essa Alma ao
 * Cemitério.
 */

export const PASSIVAS_DO_NECROMANTE: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('NP01'),
    classe: 'necromante',
    nome: 'Colecionador de Almas',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando controlar as 4 Almas. Depois disso, a primeira vez em cada turno que colher uma Alma estando com 1 ou menos controlada, colha 1 adicional se houver no Cemitério.',
  },
  {
    id: cardId('NP02'),
    classe: 'necromante',
    nome: 'Mestre do Murchar',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele na primeira vez que aplicar Murchar. Depois disso, o primeiro Ataque de cada turno contra um inimigo com Murchar recebe +1 I.',
  },
  {
    id: cardId('NP03'),
    classe: 'necromante',
    nome: 'Memória dos Mortos',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando mover voluntariamente uma carta própria para uma zona de cooldown mais distante da mão. Colha 1 Alma. Depois disso, a primeira vez em cada próprio turno que fizer isso, colha 1 Alma.',
  },
  {
    id: cardId('NP04'),
    classe: 'necromante',
    nome: 'Senhor dos Servos',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Ativar os 2 Servos dentro da mesma rodada completa. Depois disso, a primeira vez em cada próprio turno que deixar um Servo Pronto novamente, colha 1 Alma.',
  },
  {
    id: cardId('NP05'),
    classe: 'necromante',
    nome: 'Fome da Cripta',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando restaurar Vida por habilidade ou Servo. Depois disso, a primeira vez em cada próprio turno que restaurar Vida dessa forma, restaure +1.',
  },
  {
    id: cardId('NP06'),
    classe: 'necromante',
    nome: 'Guardião do Túmulo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Reação impedir Ruptura. Colha 1 Alma. Depois disso, na primeira vez em cada turno inimigo que uma Reação impedir Ruptura, colha 1 Alma.',
  },
  {
    id: cardId('NP07'),
    classe: 'necromante',
    nome: 'Último Suspiro',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 5 de Vida ou menos. Colha até 2 Almas. Depois disso, enquanto estiver com 5 ou menos, a primeira habilidade de cada turno que gaste Almas custa 1 Alma a menos, mínimo 0.',
  },
  {
    id: cardId('NP08'),
    classe: 'necromante',
    nome: 'Sacrifício Calculado',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando Exaurir seu primeiro Servo. Depois que o efeito resolver, colha até 2 Almas. Quando Exaurir o segundo Servo, colha 1 Alma.',
  },
  {
    id: cardId('NP09'),
    classe: 'necromante',
    nome: 'Paciência Sepulcral',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno com 2 de Reserva. Depois disso, sua primeira Reação de cada turno inimigo custa 1 Alma a menos, mínimo 0.',
  },
  {
    id: cardId('NP10'),
    classe: 'necromante',
    nome: 'Eco do Cemitério',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando possuir cartas em pelo menos 2 zonas diferentes de cooldown. Depois disso, uma vez por próprio turno, quando uma carta voltar normalmente de CD1 para sua mão, colha 1 Alma.',
  },
];

export const CARTAS_DE_CLASSE_DO_NECROMANTE: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('NC01'),
    classe: 'necromante',
    nome: 'Guardião Esquelético',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Guardião Esquelético',
    textoAtivar:
      'Quando usar uma Reação, ela reduz +1 I. Se houver uma Alma anexada, você pode devolvê-la ao Cemitério para a Reação reduzir também +1 D e +1 I.',
    textoExaurir: 'Quando responder a um Ataque, o Impacto final daquela ação se torna 0.',
  },
  {
    id: cardId('NC02'),
    classe: 'necromante',
    nome: 'Cão Tumular',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Cão Tumular',
    textoAtivar:
      'Depois que um Ataque seu causar Dano à Vida, o adversário perde 1 Vida. Se houver Alma anexada, você pode devolvê-la ao Cemitério para ele perder +1 Vida.',
    textoExaurir: 'Depois que um Ataque seu causar Dano à Vida, o adversário perde 3 Vida.',
  },
  {
    id: cardId('NC03'),
    classe: 'necromante',
    nome: 'Espectro Faminto',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Espectro Faminto',
    textoAtivar:
      'Quando o adversário usar uma carta de Reação contra seu Ataque, ignore 1 ponto de redução de Dano ou Impacto daquela Reação. Se houver Alma anexada, você pode devolvê-la ao Cemitério para ignorar 1 ponto adicional.',
    textoExaurir:
      'Quando o adversário declarar uma Reação, ignore até 3 pontos de redução produzidos por ela, divididos entre Dano e Impacto.',
  },
  {
    id: cardId('NC04'),
    classe: 'necromante',
    nome: 'Mago Ósseo',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Mago Ósseo',
    textoAtivar:
      'Quando jogar uma habilidade que custe Almas, reduza o custo em 1 Alma, mínimo 0. Se houver Alma anexada, você pode devolvê-la ao Cemitério para reduzir o custo em mais 1.',
    textoExaurir:
      'Reduza o custo em Almas de uma habilidade em até 3. Se for um Ataque, ele recebe +1 D e +1 I.',
  },
  {
    id: cardId('NC05'),
    classe: 'necromante',
    nome: 'Ghoul Devorador',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Ghoul Devorador',
    textoAtivar:
      'Quando colher uma Alma, restaure 1 Vida. Se houver Alma anexada, você pode devolvê-la ao Cemitério para restaurar +1.',
    textoExaurir:
      'Quando colher uma Alma, restaure 3 Vida e colha 1 Alma adicional se houver no Cemitério.',
  },
  {
    id: cardId('NC06'),
    classe: 'necromante',
    nome: 'Abominação Costurada',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Abominação Costurada',
    textoAtivar:
      'Quando declarar um Ataque de 3 AP, ele recebe +1 D e +1 I. Se houver Alma anexada, você pode devolvê-la ao Cemitério para receber +1 D adicional.',
    textoExaurir: 'Quando declarar qualquer Ataque, ele recebe +3 D e +2 I.',
  },
];

export const ULTIMATES_DO_NECROMANTE: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('NU01'),
    classe: 'necromante',
    nome: 'Ceifador de Almas',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3, recurso: { recurso: 'alma', quantidade: 4 } },
    valores: { dano: 7, impacto: 2 },
    texto:
      'Ataque. 3 AP + 4 Almas. 7 D / 2 I. Ao declarar, você pode remover todo o Murchar do adversário. Para cada ponto removido, recebe +1 D e +1 I.',
  },
  {
    id: cardId('NU02'),
    classe: 'necromante',
    nome: 'Rito da Segunda Morte',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    custo: { moeda: 'ap', valor: 2, recurso: { recurso: 'alma', quantidade: 3 } },
    texto:
      'Técnica. 2 AP + 3 Almas. Exaura 1 Servo Pronto e resolva seu efeito de Exaurir. Depois, devolva até 2 habilidades suas em cooldown para a mão. Cada uma custa +1 AP se for usada neste turno.',
  },
  {
    id: cardId('NU03'),
    classe: 'necromante',
    nome: 'Morte Negada',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2, recurso: { recurso: 'alma', quantidade: 4 } },
    texto:
      'Reação. 2 R + 4 Almas. Só contra um Ataque que derrotaria você. Depois de toda a resolução, sua Vida fica em 1. Em seguida, mova uma carta sua de qualquer zona de cooldown uma etapa em direção à mão.',
  },
];
