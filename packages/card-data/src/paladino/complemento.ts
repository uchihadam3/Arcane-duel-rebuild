import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Juramentos, Auras e Ultimates do Paladino.
 *
 * As seis Cartas de Classe são três Juramentos e três Auras, e a build escolhe
 * uma de cada. O Juramento tem uma terceira metade além de Ativar e Exaurir: o
 * Cumprimento, que vale por estar equipado e é o que define como a Convicção
 * sobe. Ele está transcrito no texto da carta, junto do nome.
 */

export const PASSIVAS_DO_PALADINO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('PP01'),
    classe: 'paladino',
    nome: 'Muralha Viva',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando impedir sua primeira Ruptura. Depois disso, na primeira vez de cada turno inimigo em que impedir Ruptura, se estiver Vacilante, suba para Resoluto.',
  },
  {
    id: cardId('PP02'),
    classe: 'paladino',
    nome: 'Fé no Aço',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno com Guarda 6 e Reserva 2. Depois disso, enquanto começar o turno com Guarda 6, seu primeiro Ataque recebe +1 I.',
  },
  {
    id: cardId('PP03'),
    classe: 'paladino',
    nome: 'Justiça Imediata',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando perder 4 ou mais de Vida de um Ataque. Depois disso, seu primeiro Ataque no próximo turno pode ser usado como se seu estado estivesse 1 nível acima para verificar requisito.',
  },
  {
    id: cardId('PP04'),
    classe: 'paladino',
    nome: 'Escudo do Justo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Reação reduzir Dano e Impacto ao mesmo tempo. Depois disso, na primeira vez de cada turno inimigo que isso acontecer, se estiver Vacilante, suba para Resoluto.',
  },
  {
    id: cardId('PP05'),
    classe: 'paladino',
    nome: 'Convicção Ardente',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele ao alcançar Inabalável pela primeira vez. Depois disso, o primeiro Ataque de cada turno usado enquanto estiver Inabalável recebe +1 D.',
  },
  {
    id: cardId('PP06'),
    classe: 'paladino',
    nome: 'Avanço Sagrado',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando provocar sua primeira Ruptura. Depois disso, o primeiro Ataque de cada turno contra Guarda 0 recebe +1 D.',
  },
  {
    id: cardId('PP07'),
    classe: 'paladino',
    nome: 'Sem Recuo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno sem Reserva depois de realizar 3 Ações. Depois disso, quando repetir essa situação, seu primeiro Ataque no próximo turno recebe +1 D.',
  },
  {
    id: cardId('PP08'),
    classe: 'paladino',
    nome: 'Voto Cumprido',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando cumprir o requisito de avanço do seu Juramento pela segunda vez. Depois disso, a primeira vez em cada rodada que cumprir esse requisito, sua próxima ação recebe +1 D ou +1 I se for ofensiva.',
  },
  {
    id: cardId('PP09'),
    classe: 'paladino',
    nome: 'Guardião da Luz',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele ao chegar a 10 de Vida ou menos. Depois disso, sua Defesa Inata usa o valor de Resoluto mesmo se você estiver Vacilante.',
  },
  {
    id: cardId('PP10'),
    classe: 'paladino',
    nome: 'Peso da Sentença',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando descer voluntariamente um estado para fortalecer uma habilidade ofensiva. Depois disso, a primeira vez em cada turno que fizer isso, a habilidade recebe +1 D ou +1 I.',
  },
];

export const CARTAS_DE_CLASSE_DO_PALADINO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('PC01'),
    classe: 'paladino',
    nome: 'Juramento da Proteção',
    tipo: 'carta-de-classe',
    tags: [],
    texto:
      'Cumprimento: a primeira vez em cada rodada que impedir Ruptura com uma Resposta, suba 1 estado.',
    textoAtivar: 'Quando usar uma Reação, ela reduz +1 D e +1 I.',
    textoExaurir: 'Quando um Ataque causaria Ruptura, o Impacto final se torna 0 e reduza +2 D.',
  },
  {
    id: cardId('PC02'),
    classe: 'paladino',
    nome: 'Juramento da Retribuição',
    tipo: 'carta-de-classe',
    tags: [],
    texto:
      'Cumprimento: a primeira vez em cada próprio turno que um Ataque seu causar Dano à Vida depois de você ter perdido Vida de um Ataque desde o fim do seu último turno, suba 1 estado.',
    textoAtivar: 'Depois que perder Vida de um Ataque, seu próximo Ataque recebe +1 D.',
    textoExaurir:
      'Depois que perder Vida de um Ataque, o adversário perde 3 de Vida e você sobe 1 estado.',
  },
  {
    id: cardId('PC03'),
    classe: 'paladino',
    nome: 'Juramento da Conquista',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Cumprimento: a primeira vez em cada próprio turno que provocar Ruptura, suba 1 estado.',
    textoAtivar:
      'Ao declarar um Ataque contra um adversário com 3 ou menos de Guarda, ele recebe +1 I.',
    textoExaurir: 'Ao declarar um Ataque, ele recebe +2 D e +3 I.',
  },
  {
    id: cardId('PC04'),
    classe: 'paladino',
    nome: 'Aura do Santuário',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Aura do Santuário',
    textoAtivar: 'Quando terminar seu turno com 2 de Reserva, suba 1 estado se estiver Vacilante.',
    textoExaurir:
      'Durante o turno adversário, antes de jogar uma Reação, ajuste sua Reserva para 2.',
  },
  {
    id: cardId('PC05'),
    classe: 'paladino',
    nome: 'Aura da Coragem',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Aura da Coragem',
    textoAtivar: 'Quando declarar seu primeiro Ataque do turno, ele recebe +1 D.',
    textoExaurir: 'Seu próximo Ataque neste turno custa 1 AP a menos, mínimo 1, e recebe +2 D.',
  },
  {
    id: cardId('PC06'),
    classe: 'paladino',
    nome: 'Aura do Julgamento',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Aura do Julgamento',
    textoAtivar:
      'Quando declarar uma habilidade ofensiva enquanto estiver Resoluto ou Inabalável, ela recebe +1 I.',
    textoExaurir:
      'Ao declarar um Ataque, desça 1 estado. Ele recebe +3 D. Se a descida foi de Inabalável para Resoluto, recebe também +1 I.',
  },
];

export const ULTIMATES_DO_PALADINO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('PU01'),
    classe: 'paladino',
    nome: 'Veredito do Sol',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 7, impacto: 3 },
    texto:
      'Ataque. 3 AP. Requer Inabalável. 7 D / 3 I. Depois da resolução, desça para Resoluto. Se causar Ruptura, permaneça Inabalável em vez disso.',
  },
  {
    id: cardId('PU02'),
    classe: 'paladino',
    nome: 'Fortaleza Inquebrável',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2 },
    texto:
      'Reação. 2 R. Requer Inabalável. Dano e Impacto finais da ação se tornam 0. Depois da resolução, ajuste sua Guarda para 6 e desça para Resoluto.',
  },
  {
    id: cardId('PU03'),
    classe: 'paladino',
    nome: 'Cruzada Final',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    custo: { moeda: 'ap', valor: 2 },
    texto:
      'Técnica. 2 AP. Requer Resoluto ou Inabalável. Durante o restante do turno, depois que até 2 Ataques seus resolverem, recupere 1 AP. O limite normal de 3 Ações continua valendo. Depois do turno, desça 1 estado.',
  },
];
