import type { Zona } from '@arcane-duel/shared-types';
import type { LadoDoCampo } from '@arcane-duel/ui';
import { chaveDaAncora } from '@arcane-duel/ui';

/*
 * A planta da arena, em unidades de mundo.
 *
 * Este arquivo é a única fonte de "onde fica cada coisa". Ele é puro: não
 * conhece Three.js, não toca no DOM e não depende de resolução de tela. A cena
 * tridimensional posiciona os objetos a partir daqui, a camada de interação
 * projeta estes mesmos pontos para a tela, e os VFX perguntam por chave de
 * âncora. Um único lugar para mexer quando a composição mudar.
 *
 * Eixos: X para a direita, Y para cima, Z na direção do jogador. O tampo fica
 * em Y = 0. O lado `proprio` ocupa Z positivo; o `adversario` é o espelho em
 * Z, com o mesmo X — espelhar também o X giraria o campo 180° e desalinharia
 * as colunas de Ação, que é justamente o que precisa ficar alinhado numa tela
 * de telefone.
 *
 * A linguagem espacial vem de VIDEO_VISUAL_TARGET.md: os três espaços de Ação
 * como pontos de choque no centro, Cartas de Classe em pedestais laterais,
 * quatro Passivas em encaixes menores, cooldown numa trilha física, Personagem
 * e Ultimate com espaço próprio. O ornamento é da borda; o miolo é liso.
 */

export interface Ponto3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Que tipo de peça ocupa a zona — decide o asset e a geometria. */
export type FormaDaPeca =
  | 'acao'
  | 'resposta'
  | 'carta-de-classe'
  | 'passiva'
  | 'ultimate'
  | 'cooldown'
  | 'condicoes'
  | 'personagem'
  | 'removidas'
  | 'mao';

export interface PecaDaArena {
  /** A chave de âncora: é assim que VFX e interação se referem a esta zona. */
  readonly chave: string;
  readonly lado: LadoDoCampo;
  readonly zona: Zona;
  readonly indice: number;
  readonly forma: FormaDaPeca;
  readonly centro: Ponto3D;
  /** Largura (X) e profundidade (Z) da laje, em unidades de mundo. */
  readonly largura: number;
  readonly profundidade: number;
}

/*
 * O tabuleiro é largo e raso, e não quadrado.
 *
 * A arena é vista numa tela de telefone deitado — perto de 2,2 por 1. Um tampo
 * quadrado, projetado obliquamente, enche a altura e sobra metade da largura
 * em preto: foi exatamente o que a primeira captura em 844×390 mostrou. A
 * proporção do mundo precisa acompanhar a proporção da tela.
 *
 * Em vez de reescrever cada assento, os dois eixos recebem um fator. Assim a
 * planta continua legível na tabela abaixo e o ajuste fino é de dois números.
 */
const ESCALA = { x: 1.2, z: 0.86 } as const;

/** Metade da largura e da profundidade do tampo. O ornamento vive além disto. */
export const MEIA_ARENA = {
  largura: 14.6 * ESCALA.x,
  profundidade: 15.0 * ESCALA.z,
} as const;

interface Assento {
  readonly zona: Zona;
  readonly indice: number;
  readonly forma: FormaDaPeca;
  readonly x: number;
  readonly z: number;
  readonly y?: number;
  readonly largura: number;
  readonly profundidade: number;
}

/**
 * Os assentos do lado próprio, em Z positivo.
 *
 * As três colunas de Ação ficam no centro e são as maiores lajes do campo: são
 * elas que precisam ganhar o olho antes de qualquer outra zona. A quarta
 * coluna existe só quando uma carta a libera, e por isso fica deslocada para a
 * direita, fora do trio.
 */
const ASSENTOS: readonly Assento[] = [
  /* Choque: as três Ações e a quarta condicional, cada uma com sua Resposta. */
  { zona: 'acao', indice: 0, forma: 'acao', x: -5.5, z: 2.7, largura: 4.1, profundidade: 4.1 },
  { zona: 'acao', indice: 1, forma: 'acao', x: 0, z: 2.7, largura: 4.1, profundidade: 4.1 },
  { zona: 'acao', indice: 2, forma: 'acao', x: 5.5, z: 2.7, largura: 4.1, profundidade: 4.1 },
  { zona: 'acao', indice: 3, forma: 'acao', x: 11.0, z: 2.7, largura: 4.1, profundidade: 4.1 },
  {
    zona: 'resposta',
    indice: 0,
    forma: 'resposta',
    x: -5.5,
    z: 6.3,
    largura: 3.4,
    profundidade: 2.6,
  },
  { zona: 'resposta', indice: 1, forma: 'resposta', x: 0, z: 6.3, largura: 3.4, profundidade: 2.6 },
  {
    zona: 'resposta',
    indice: 2,
    forma: 'resposta',
    x: 5.5,
    z: 6.3,
    largura: 3.4,
    profundidade: 2.6,
  },
  {
    zona: 'resposta',
    indice: 3,
    forma: 'resposta',
    x: 11.0,
    z: 6.3,
    largura: 3.4,
    profundidade: 2.6,
  },

  /* Apoio: pedestais das Cartas de Classe e a trilha de cooldown entre eles. */
  {
    zona: 'carta-de-classe',
    indice: 0,
    forma: 'carta-de-classe',
    x: -8.2,
    z: 9.6,
    largura: 3.0,
    profundidade: 3.6,
  },
  {
    zona: 'carta-de-classe',
    indice: 1,
    forma: 'carta-de-classe',
    x: 8.2,
    z: 9.6,
    largura: 3.0,
    profundidade: 3.6,
  },
  { zona: 'cd1', indice: 0, forma: 'cooldown', x: -3.0, z: 9.6, largura: 2.6, profundidade: 3.0 },
  { zona: 'cd2', indice: 0, forma: 'cooldown', x: 0, z: 9.6, largura: 2.6, profundidade: 3.0 },
  { zona: 'cd3', indice: 0, forma: 'cooldown', x: 3.0, z: 9.6, largura: 2.6, profundidade: 3.0 },

  /* Identidade: Personagem ao centro, Passivas flanqueando, Ultimate à direita. */
  {
    zona: 'passiva',
    indice: 0,
    forma: 'passiva',
    x: -5.4,
    z: 12.8,
    largura: 2.1,
    profundidade: 2.5,
  },
  {
    zona: 'passiva',
    indice: 1,
    forma: 'passiva',
    x: -3.0,
    z: 12.8,
    largura: 2.1,
    profundidade: 2.5,
  },
  {
    zona: 'passiva',
    indice: 2,
    forma: 'passiva',
    x: 3.0,
    z: 12.8,
    largura: 2.1,
    profundidade: 2.5,
  },
  {
    zona: 'passiva',
    indice: 3,
    forma: 'passiva',
    x: 5.4,
    z: 12.8,
    largura: 2.1,
    profundidade: 2.5,
  },
  {
    zona: 'personagem',
    indice: 0,
    forma: 'personagem',
    x: 0,
    z: 12.8,
    largura: 3.0,
    profundidade: 2.5,
  },
  {
    zona: 'ultimate',
    indice: 0,
    forma: 'ultimate',
    x: 8.6,
    z: 12.9,
    largura: 3.6,
    profundidade: 3.0,
  },
  {
    zona: 'condicoes',
    indice: 0,
    forma: 'condicoes',
    x: -9.0,
    z: 13.0,
    largura: 4.6,
    profundidade: 2.2,
  },
  {
    zona: 'removidas',
    indice: 0,
    forma: 'removidas',
    x: 12.6,
    z: 9.6,
    largura: 2.4,
    profundidade: 3.0,
  },

  /*
   * A mão fica fora do tampo e acima dele, inclinada para a câmera. É assim
   * que ela parece apoiada na mesa em vez de colada no vidro — e é a razão de
   * ela ter Y próprio.
   */
  {
    zona: 'mao',
    indice: 0,
    forma: 'mao',
    x: 0.6,
    z: 17.4,
    y: 3.0,
    largura: 15.0,
    profundidade: 5.6,
  },
];

const pecaDoAssento = (assento: Assento, lado: LadoDoCampo): PecaDaArena => {
  const espelho = lado === 'proprio' ? 1 : -1;
  return {
    chave: chaveDaAncora({ lado, zona: assento.zona, indice: assento.indice }),
    lado,
    zona: assento.zona,
    indice: assento.indice,
    forma: assento.forma,
    centro: {
      x: assento.x * ESCALA.x,
      y: assento.y ?? 0,
      z: assento.z * ESCALA.z * espelho,
    },
    // A laje acompanha o eixo que a esticou; senão as peças se sobreporiam
    // justamente onde o campo ficou mais apertado.
    largura: assento.largura * ESCALA.x,
    profundidade: assento.profundidade * ESCALA.z,
  };
};

/**
 * Todas as peças dos dois lados.
 *
 * A mão do adversário não entra: ela não é uma zona da arena para quem está
 * olhando, e não existe projeção dela para este observador. Zona que o
 * observador não pode conhecer simplesmente não tem lugar no mundo.
 */
export const PECAS_DA_ARENA: readonly PecaDaArena[] = [
  ...ASSENTOS.map((assento) => pecaDoAssento(assento, 'proprio')),
  ...ASSENTOS.filter((assento) => assento.zona !== 'mao').map((assento) =>
    pecaDoAssento(assento, 'adversario'),
  ),
];

const INDICE_DAS_PECAS: ReadonlyMap<string, PecaDaArena> = new Map(
  PECAS_DA_ARENA.map((peca) => [peca.chave, peca]),
);

export const pecaPorChave = (chave: string): PecaDaArena | undefined => INDICE_DAS_PECAS.get(chave);

export const pecaDaZona = (lado: LadoDoCampo, zona: Zona, indice = 0): PecaDaArena | undefined =>
  INDICE_DAS_PECAS.get(chaveDaAncora({ lado, zona, indice }));

/**
 * O leque da mão.
 *
 * Discreto de propósito: o vídeo mostra que o ângulo entre cartas vizinhas é
 * pequeno, e com oito cartas — contra as cinco ou seis da referência — ele
 * precisa ser ainda menor, senão nome e custo deixam de ficar alinhados. O que
 * sempre precisa permanecer visível é o topo da carta.
 */
export interface PosicaoNoLeque {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Rotação em torno de Z, em radianos. Pequena, por definição. */
  readonly giro: number;
  /** Profundidade de empilhamento: maior fica na frente. */
  readonly ordem: number;
}

export const ABERTURA_DO_LEQUE = {
  /** Distância horizontal entre cartas vizinhas, no mundo. */
  passo: 3.0,
  /** Ângulo máximo, em radianos, da carta mais afastada do centro. */
  giroMaximo: 0.14,
  /** Quanto a carta mais afastada do centro desce, dando a curvatura. */
  quedaMaxima: 0.44,
} as const;

export const posicaoNoLeque = (indice: number, total: number): PosicaoNoLeque => {
  const base = pecaDaZona('proprio', 'mao');
  const centro = base?.centro ?? { x: 0, y: 2.6, z: 17.4 };
  if (total <= 0) return { ...centro, giro: 0, ordem: 0 };

  // −1 na ponta esquerda, +1 na direita, 0 com uma carta só.
  const desvio = total === 1 ? 0 : (indice / (total - 1)) * 2 - 1;
  // O passo encolhe quando a mão está cheia, para o leque não sair da tela.
  const passo = Math.min(ABERTURA_DO_LEQUE.passo, 15.6 / Math.max(1, total));

  return {
    x: centro.x + desvio * passo * ((total - 1) / 2),
    y: centro.y - Math.abs(desvio) * ABERTURA_DO_LEQUE.quedaMaxima,
    z: centro.z - Math.abs(desvio) * 0.34,
    giro: -desvio * ABERTURA_DO_LEQUE.giroMaximo,
    ordem: indice,
  };
};
