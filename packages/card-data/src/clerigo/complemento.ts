import { cardId } from '@arcane-duel/shared-types';

import type { DefinicaoDeCarta } from '../card-definition.js';

/*
 * Passivas, Doutrinas, Relíquias e Ultimates do Clérigo.
 *
 * As seis Cartas de Classe do Clérigo são três Doutrinas e três Relíquias, e
 * a build escolhe uma de cada. Os códigos CP, CC e CU foram atribuídos uma
 * única vez e estão registrados em docs/CARD_IDS.md.
 */

export const PASSIVAS_DO_CLERIGO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('CP01'),
    classe: 'clerigo',
    nome: 'Coração Misericordioso',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando restaurar Vida enquanto estiver com 15 de Vida ou menos. Depois disso, a primeira habilidade que restaurar Vida em cada próprio turno restaura +1.',
  },
  {
    id: cardId('CP02'),
    classe: 'clerigo',
    nome: 'Olho do Julgamento',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando causar sua primeira Ruptura. Depois disso, o primeiro Ataque de cada turno jogado enquanto o adversário estiver com Guarda 0 recebe +1 D.',
  },
  {
    id: cardId('CP03'),
    classe: 'clerigo',
    nome: 'Devoção Imóvel',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando terminar um turno com 2 de Reserva. Depois disso, a primeira Reação de cada turno inimigo que exigir Graça pode ser usada mesmo se você estiver em Vigília.',
  },
  {
    id: cardId('CP04'),
    classe: 'clerigo',
    nome: 'Mártir Voluntário',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando perder Vida por um efeito próprio. Avance 1 estágio de Devoção. Depois disso, na primeira vez em cada turno que perder Vida por um efeito próprio, avance 1 estágio.',
  },
  {
    id: cardId('CP05'),
    classe: 'clerigo',
    nome: 'Pureza Interior',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Condição negativa for aplicada a você. Remova aquela Condição. Depois disso, na primeira vez em cada turno que uma Condição negativa for aplicada, reduza sua quantidade ou duração em 1.',
  },
  {
    id: cardId('CP06'),
    classe: 'clerigo',
    nome: 'Milagre Guardado',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele ao alcançar Milagre. Depois disso, uma vez por turno, Ative quando jogar uma habilidade que exija Fervor ou Milagre para ela receber +1 D, +1 I ou +1 de cura, conforme o que fizer.',
  },
  {
    id: cardId('CP07'),
    classe: 'clerigo',
    nome: 'Liturgia Contínua',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando realizar 3 Ações num mesmo turno. Depois disso, sempre que sua terceira Ação for uma Técnica, ela entra em uma zona de cooldown mais próxima da mão.',
  },
  {
    id: cardId('CP08'),
    classe: 'clerigo',
    nome: 'Escudo dos Fiéis',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando uma Reação reduzir o Dano final de um Ataque a 0. Depois disso, na primeira vez em cada turno inimigo que isso acontecer, restaure 1 Vida.',
  },
  {
    id: cardId('CP09'),
    classe: 'clerigo',
    nome: 'Justiça Restauradora',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando provocar Ruptura estando abaixo da Vida máxima. Restaure 1 Vida. Depois disso, a primeira Ruptura causada em cada próprio turno restaura 1 Vida.',
  },
  {
    id: cardId('CP10'),
    classe: 'clerigo',
    nome: 'Segunda Luz',
    tipo: 'passiva',
    tags: [],
    texto:
      'Revele quando chegar a 5 de Vida ou menos. Avance imediatamente 1 estágio de Devoção. Depois disso, enquanto permanecer com 5 de Vida ou menos, sua primeira habilidade de cada próprio turno pode ser tratada como se sua Devoção estivesse 1 estágio acima para verificar requisitos.',
  },
];

export const CARTAS_DE_CLASSE_DO_CLERIGO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('CC01'),
    classe: 'clerigo',
    nome: 'Doutrina da Misericórdia',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Doutrina da Misericórdia',
    textoAtivar: 'Quando uma habilidade restaurar Vida, restaure +1.',
    textoExaurir: 'Quando uma habilidade restaurar Vida, restaure +3 adicionais.',
  },
  {
    id: cardId('CC02'),
    classe: 'clerigo',
    nome: 'Doutrina do Julgamento',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Doutrina do Julgamento',
    textoAtivar:
      'Ao declarar um Ataque contra um adversário com 3 ou menos de Guarda, ele recebe +1 D e +1 I.',
    textoExaurir:
      'Ao declarar um Ataque, ele recebe +3 D. Se causar Ruptura, avance 1 estágio de Devoção depois da resolução.',
  },
  {
    id: cardId('CC03'),
    classe: 'clerigo',
    nome: 'Doutrina do Martírio',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Doutrina do Martírio',
    textoAtivar:
      'Depois que perder pelo menos 3 de Vida de um único Ataque, avance 1 estágio de Devoção.',
    textoExaurir:
      'Quando um Ataque fosse reduzir sua Vida a 0, deixe a ação resolver normalmente e depois ajuste sua Vida para 1.',
  },
  {
    id: cardId('CC04'),
    classe: 'clerigo',
    nome: 'Incensário da Aurora',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Incensário da Aurora',
    textoAtivar: 'Depois que uma Técnica resolver, seu próximo Ataque neste turno recebe +1 D.',
    textoExaurir:
      'Depois que uma Técnica resolver, seu próximo Ataque neste turno recebe +2 D e +2 I.',
  },
  {
    id: cardId('CC05'),
    classe: 'clerigo',
    nome: 'Sino do Santuário',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Sino do Santuário',
    textoAtivar: 'Quando usar uma Reação, ela reduz +1 I.',
    textoExaurir:
      'Quando usar uma Reação, o Impacto final da ação se torna 0 e a Reação reduz +2 D.',
  },
  {
    id: cardId('CC06'),
    classe: 'clerigo',
    nome: 'Relicário dos Santos',
    tipo: 'carta-de-classe',
    tags: [],
    texto: 'Relicário dos Santos',
    textoAtivar:
      'Quando jogar uma habilidade que exija Fervor ou Milagre, escolha uma carta sua em CD2 e mova para CD1.',
    textoExaurir:
      'Devolva imediatamente uma carta sua de qualquer zona de cooldown para a mão. Se usá-la neste turno, ela custa +1 AP.',
  },
];

export const ULTIMATES_DO_CLERIGO: readonly DefinicaoDeCarta[] = [
  {
    id: cardId('CU01'),
    classe: 'clerigo',
    nome: 'Julgamento Celeste',
    tipo: 'ultimate',
    comportaComo: 'ataque',
    tags: [],
    custo: { moeda: 'ap', valor: 3 },
    valores: { dano: 7, impacto: 3 },
    texto:
      'Ataque. 3 AP. Requer Milagre e consome Milagre, retornando a Vigília. 7 D / 3 I. Se causar Ruptura, restaure 3 Vida.',
  },
  {
    id: cardId('CU02'),
    classe: 'clerigo',
    nome: 'Milagre da Aurora',
    tipo: 'ultimate',
    comportaComo: 'tecnica',
    tags: [],
    custo: { moeda: 'ap', valor: 2 },
    texto:
      'Técnica. 2 AP. Requer Milagre e consome Milagre. Restaure 6 Vida e remova todas as Condições negativas.',
  },
  {
    id: cardId('CU03'),
    classe: 'clerigo',
    nome: 'Intercessão Divina',
    tipo: 'ultimate',
    comportaComo: 'reacao',
    tags: [],
    custo: { moeda: 'reserva', valor: 2 },
    texto:
      'Reação. 2 R. Requer Milagre e consome Milagre. O Dano e o Impacto finais daquela ação se tornam 0. Depois, restaure 2 Vida.',
  },
];
