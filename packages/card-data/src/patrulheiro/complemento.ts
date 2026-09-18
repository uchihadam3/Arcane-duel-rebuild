import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Estilos de Caça, Armadilhas e Ultimates do Patrulheiro.
 *
 * As seis Cartas de Classe são três Estilos e três Armadilhas, e a build
 * escolhe uma de cada.
 */

export const PASSIVAS_DO_PATRULHEIRO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('RP01'),
    classe: 'patrulheiro',
    nome: 'Predador Paciente',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando passar um turno completo mantendo a Marca sem Explorar. Depois disso, o primeiro Ataque que Explorar uma Marca mantida por pelo menos um turno inteiro recebe +1 D.',
  },
  {
    id: cardId('RP02'),
    classe: 'patrulheiro',
    nome: 'Olho Firme',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando um Ataque preparado por Emboscada acertar a Vida. Depois disso, a próxima vez que usar um Ataque preparado por Emboscada, ele recebe +1 D. Esse bônus ocorre apenas uma vez após a revelação.',
  },
  {
    id: cardId('RP03'),
    classe: 'patrulheiro',
    nome: 'Pista Fresca',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando aplicar a Marca pela segunda vez na partida. Depois disso, sempre que uma nova Marca for aplicada, o próximo Ataque contra aquele alvo recebe +1 I.',
  },
  {
    id: cardId('RP04'),
    classe: 'patrulheiro',
    nome: 'Sem Escapatória',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando começar seu turno com o adversário Marcado e sem Reserva. Seu primeiro Ataque recebe +1 D. Depois disso, Ative uma vez por turno sempre que a mesma condição ocorrer para repetir o bônus.',
  },
  {
    id: cardId('RP05'),
    classe: 'patrulheiro',
    nome: 'Mestre das Armadilhas',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Armadilha for Ativada pela segunda vez. Depois disso, na primeira vez a cada rodada em que uma Armadilha for Ativada, mova uma Técnica sua de CD2 para CD1.',
  },
  {
    id: cardId('RP06'),
    classe: 'patrulheiro',
    nome: 'Respiração Controlada',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando realizar apenas 1 Ataque num turno e terminar com 2 de Reserva. No próximo turno, seu primeiro Ataque recebe +1 D e +1 I.',
  },
  {
    id: cardId('RP07'),
    classe: 'patrulheiro',
    nome: 'Caçador Incansável',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando a Marca for Explorada pela terceira vez. Depois disso, a primeira habilidade de cada turno que aplicar nova Marca custa 1 AP a menos, mínimo 1.',
  },
  {
    id: cardId('RP08'),
    classe: 'patrulheiro',
    nome: 'Flecha Guardada',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma habilidade sua voltar à mão antes do momento normal. Depois disso, a primeira habilidade que retornar dessa forma em cada turno recebe +1 D se for Ataque.',
  },
  {
    id: cardId('RP09'),
    classe: 'patrulheiro',
    nome: 'Sobrevivente do Ermo',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando impedir Ruptura com uma Reação. Depois disso, na primeira vez em cada turno inimigo que impedir Ruptura, seu próximo Ataque recebe +1 I.',
  },
  {
    id: cardId('RP10'),
    classe: 'patrulheiro',
    nome: 'Última Caçada',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 10 de Vida ou menos. Aplique imediatamente a Marca se ela não estiver presente. Depois disso, a primeira vez em cada turno que Explorar uma Marca, o Ataque recebe +1 D.',
  },
];

export const CARTAS_DE_CLASSE_DO_PATRULHEIRO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('RC01'),
    classe: 'patrulheiro',
    nome: 'Estilo do Atirador',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Estilo do Atirador',
    textoAtivar: 'Quando Explorar uma Marca com um Ataque, ele recebe +1 D.',
    textoExaurir: 'Durante uma Exploração de Marca, o Ataque recebe +3 D.',
  },
  {
    id: cardId('RC02'),
    classe: 'patrulheiro',
    nome: 'Estilo do Rastreador',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Estilo do Rastreador',
    textoAtivar:
      'Depois que Explorar uma Marca, no fim daquele turno aplique novamente a Marca da Presa.',
    textoExaurir:
      'Depois que Explorar uma Marca, aplique imediatamente uma nova Marca. Isso permite Explorar de novo no mesmo turno por outro efeito.',
  },
  {
    id: cardId('RC03'),
    classe: 'patrulheiro',
    nome: 'Estilo do Emboscador',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Estilo do Emboscador',
    textoAtivar: 'Quando usar um Ataque colocado por Preparar Emboscada, ele recebe +1 D e +1 I.',
    textoExaurir: 'Aquele Ataque recebe +3 D e +1 I.',
  },
  {
    id: cardId('RC04'),
    classe: 'patrulheiro',
    nome: 'Laço de Caça',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Laço de Caça',
    textoAtivar:
      'Quando o adversário declarar a terceira Ação do turno, se for Ataque, ela recebe -1 D e -2 I. Se for Técnica, ela resolve e depois entra 1 etapa de cooldown mais distante.',
    textoExaurir:
      'Contra a terceira Ação, se for Ataque, recebe -3 D e -3 I. Se for Técnica, resolve e depois vai para CD3.',
  },
  {
    id: cardId('RC05'),
    classe: 'patrulheiro',
    nome: 'Estacas Ocultas',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Estacas Ocultas',
    textoAtivar:
      'Depois que o adversário concluir o segundo Ataque no mesmo turno, ele perde 1 Vida.',
    textoExaurir:
      'Depois do segundo Ataque, ele perde 3 Vida e recebe a Marca da Presa se ainda não estiver Marcado.',
  },
  {
    id: cardId('RC06'),
    classe: 'patrulheiro',
    nome: 'Fio de Tropeço',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Fio de Tropeço',
    textoAtivar: 'Quando um Ataque inimigo com pelo menos 3 I for declarado, reduza 2 I.',
    textoExaurir: 'Reduza 4 I daquele Ataque.',
  },
];

export const ULTIMATES_DO_PATRULHEIRO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('RU01'),
    classe: 'patrulheiro',
    nome: 'Olho do Predador',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 7, impacto: 1 },
    texto:
      'Ataque. 3 AP. 7 D / 1 I. Só contra alvo Marcado. Explora obrigatoriamente a Marca. Se o adversário estiver com Guarda 0, recebe +3 D.',
  },
  {
    id: cardId('RU02'),
    classe: 'patrulheiro',
    nome: 'Chuva de Flechas',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 5, impacto: 4 },
    texto:
      'Ataque. 3 AP. 5 D / 4 I. Se o adversário estiver Marcado, recebe +1 D e +1 I, sem consumir a Marca.',
  },
  {
    id: cardId('RU03'),
    classe: 'patrulheiro',
    nome: 'Caçada sem Saída',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    custo: { moeda: 'ap', valor: 2 },
    texto:
      'Técnica. 2 AP. Se o adversário não estiver Marcado, aplique a Marca. Deixe Pronta sua Armadilha se estiver Ativada. Seu próximo Ataque neste turno custa 1 AP a menos, recebe +1 D e +1 I. O limite normal de 3 Ações permanece.',
  },
];
