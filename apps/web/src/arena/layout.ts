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
 * A arte aprovada manda na proporção do tampo.
 *
 * `arena_board_clean_vertical.png` é retrato — 941 × 1672 — e é uma cena
 * inteira, com muro, tocha, cascata e a rosa dos ventos no centro. Espremê-la
 * para caber num tampo quadrado foi o defeito mais grave da primeira entrega:
 * a arena aprovada e a arena desenhada não eram a mesma.
 *
 * A saída não é esticar, é **recortar**. O jogo usa a faixa central da arte —
 * os dois campos e a rosa que os separa — e o tampo recebe exatamente a
 * proporção dessa faixa. Assim a textura entra com `offset`/`repeat`, que
 * recortam sem deformar, e um pixel da arte continua quadrado no chão.
 */
const ARENA_APROVADA = { largura: 941, altura: 1672 } as const;

/** Onde a rosa dos ventos está na arte, em fração da altura. Não é a metade. */
const CENTRO_DA_ROSA = 0.4127;

/**
 * A faixa da arte que vira superfície de jogo, em fração da altura.
 *
 * Centrada na rosa dos ventos, para que o centro do desenho caia sobre a linha
 * que separa os dois lados. Nas bordas a faixa para dentro dos degraus: o que
 * fica de fora são as escadarias do fundo e da frente.
 */
export const FAIXA_DE_JOGO = {
  topo: CENTRO_DA_ROSA - 0.275,
  base: CENTRO_DA_ROSA + 0.275,
} as const;

/** Proporção largura/profundidade da faixa de jogo. O campo obedece a ela. */
export const PROPORCAO_DO_CAMPO =
  ARENA_APROVADA.largura / (ARENA_APROVADA.altura * (FAIXA_DE_JOGO.base - FAIXA_DE_JOGO.topo));

/**
 * Metade da faixa de jogo. A profundidade **não** é escolhida: ela sai da arte.
 *
 * É este retângulo — e não a arte inteira — que a câmera enquadra, e é dentro
 * dele que todas as zonas moram.
 */
export const MEIA_ARENA = {
  largura: 17.5,
  profundidade: 17.5 / PROPORCAO_DO_CAMPO,
} as const;

/*
 * O tampo é maior que o campo, e isso é a correção de composição.
 *
 * Um plano inclinado nunca cobre uma tela retangular: a borda do fundo projeta
 * estreita e sobra preto nas quinas de cima — foi o que a primeira tentativa de
 * enquadrar mostrou, com a arena parecendo uma mesa flutuando no escuro. A
 * saída não é esticar a arte nem inclinar menos: é **mostrar mais arte**.
 *
 * Então o tampo recebe o arquivo inteiro, na proporção dele, e sai do quadro
 * pelos dois lados. As escadarias do fundo e da frente passam a existir fora
 * da tela, empurrando o preto para longe, e a faixa de jogo continua caindo
 * exatamente sobre o campo.
 */
export const TAMPO = {
  largura: 17.5 * 2,
  profundidade: (17.5 * 2 * ARENA_APROVADA.altura) / ARENA_APROVADA.largura,
} as const;

/** O quanto o tampo recua em Z para a rosa dos ventos cair na linha de centro. */
export const DESLOCAMENTO_DO_TAMPO = (0.5 - CENTRO_DA_ROSA) * TAMPO.profundidade;

/*
 * A planta abaixo é escrita numa grade própria, de 14,6 por 15,0 meias
 * unidades, porque é assim que ela fica legível. O fator que a leva ao tampo é
 * derivado, nunca digitado: se a proporção da arte mudar, a planta acompanha
 * sozinha e nada volta a ser espremido.
 */
const GRADE = { x: 14.6, z: 15.0 } as const;
const ESCALA = {
  x: MEIA_ARENA.largura / GRADE.x,
  z: MEIA_ARENA.profundidade / GRADE.z,
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
 *
 * O campo é **simétrico em X**, e isso é requisito de enquadramento e não
 * gosto: a quarta coluna de Ação chega a +13,05 na grade, e a bandeja de
 * Condições foi levada a −13,05 para responder por ela. Antes, a pilha de
 * removidas ficava sozinha na direita e empurrava a arena inteira para um
 * lado da tela — o campo terminava descentralizado sem ninguém ter pedido.
 */
const ASSENTOS: readonly Assento[] = [
  /* Choque: as três Ações e a quarta condicional, cada uma com sua Resposta. */
  { zona: 'acao', indice: 0, forma: 'acao', x: -5.5, z: 2.0, largura: 4.1, profundidade: 3.6 },
  { zona: 'acao', indice: 1, forma: 'acao', x: 0, z: 2.0, largura: 4.1, profundidade: 3.6 },
  { zona: 'acao', indice: 2, forma: 'acao', x: 5.5, z: 2.0, largura: 4.1, profundidade: 3.6 },
  { zona: 'acao', indice: 3, forma: 'acao', x: 11.0, z: 2.0, largura: 4.1, profundidade: 3.6 },
  {
    zona: 'resposta',
    indice: 0,
    forma: 'resposta',
    x: -5.5,
    z: 5.0,
    largura: 3.4,
    profundidade: 2.2,
  },
  { zona: 'resposta', indice: 1, forma: 'resposta', x: 0, z: 5.0, largura: 3.4, profundidade: 2.2 },
  {
    zona: 'resposta',
    indice: 2,
    forma: 'resposta',
    x: 5.5,
    z: 5.0,
    largura: 3.4,
    profundidade: 2.2,
  },
  {
    zona: 'resposta',
    indice: 3,
    forma: 'resposta',
    x: 11.0,
    z: 5.0,
    largura: 3.4,
    profundidade: 2.2,
  },

  /* Apoio: pedestais das Cartas de Classe e a trilha de cooldown entre eles. */
  {
    zona: 'carta-de-classe',
    indice: 0,
    forma: 'carta-de-classe',
    x: -8.2,
    z: 7.7,
    largura: 3.0,
    profundidade: 3.0,
  },
  {
    zona: 'carta-de-classe',
    indice: 1,
    forma: 'carta-de-classe',
    x: 8.2,
    z: 7.7,
    largura: 3.0,
    profundidade: 3.0,
  },
  { zona: 'cd1', indice: 0, forma: 'cooldown', x: -3.0, z: 7.7, largura: 2.6, profundidade: 2.6 },
  { zona: 'cd2', indice: 0, forma: 'cooldown', x: 0, z: 7.7, largura: 2.6, profundidade: 2.6 },
  { zona: 'cd3', indice: 0, forma: 'cooldown', x: 3.0, z: 7.7, largura: 2.6, profundidade: 2.6 },

  /* Identidade: Personagem ao centro, Passivas flanqueando, Ultimate à direita. */
  {
    zona: 'passiva',
    indice: 0,
    forma: 'passiva',
    x: -5.4,
    z: 10.6,
    largura: 2.1,
    profundidade: 2.2,
  },
  {
    zona: 'passiva',
    indice: 1,
    forma: 'passiva',
    x: -3.0,
    z: 10.6,
    largura: 2.1,
    profundidade: 2.2,
  },
  {
    zona: 'passiva',
    indice: 2,
    forma: 'passiva',
    x: 3.0,
    z: 10.6,
    largura: 2.1,
    profundidade: 2.2,
  },
  {
    zona: 'passiva',
    indice: 3,
    forma: 'passiva',
    x: 5.4,
    z: 10.6,
    largura: 2.1,
    profundidade: 2.2,
  },
  {
    zona: 'personagem',
    indice: 0,
    forma: 'personagem',
    x: 0,
    z: 10.6,
    largura: 3.0,
    profundidade: 2.2,
  },
  {
    zona: 'ultimate',
    indice: 0,
    forma: 'ultimate',
    x: 8.6,
    z: 10.6,
    largura: 3.6,
    profundidade: 2.6,
  },
  {
    zona: 'condicoes',
    indice: 0,
    forma: 'condicoes',
    x: -10.75,
    z: 10.6,
    largura: 4.6,
    profundidade: 2.0,
  },
  {
    zona: 'removidas',
    indice: 0,
    forma: 'removidas',
    x: -11.2,
    z: 7.7,
    largura: 2.4,
    profundidade: 2.6,
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
    x: 0,
    z: 15.0,
    y: 2.6,
    /*
     * O leque usa toda a largura do campo, e não uma faixa central.
     *
     * Com 15 unidades de grade, oito cartas ficavam a 2,1 de passo para 3,9 de
     * largura: cada carta cobria mais da metade da vizinha e o nome sumia
     * debaixo da carta seguinte — justamente o dado que decide a jogada. A
     * largura aqui é a mesma do campo, então o enquadramento não muda e o
     * passo sobe para 3,0.
     */
    largura: 26.0,
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
  const centro = base?.centro ?? { x: 0, y: 3.2, z: 16.3 };
  if (total <= 0) return { ...centro, giro: 0, ordem: 0 };

  // −1 na ponta esquerda, +1 na direita, 0 com uma carta só.
  const desvio = total === 1 ? 0 : (indice / (total - 1)) * 2 - 1;
  /*
   * O passo encolhe quando a mão está cheia, para o leque não sair da tela.
   *
   * O limite vem da própria zona da mão, e não de um número solto: se o tampo
   * mudar de proporção, a mão acompanha em vez de vazar pelas laterais.
   */
  const larguraUtil = (base?.largura ?? 18) * 0.94;
  const passo = Math.min(ABERTURA_DO_LEQUE.passo, larguraUtil / Math.max(1, total));

  return {
    x: centro.x + desvio * passo * ((total - 1) / 2),
    y: centro.y - Math.abs(desvio) * ABERTURA_DO_LEQUE.quedaMaxima,
    z: centro.z - Math.abs(desvio) * 0.34,
    giro: -desvio * ABERTURA_DO_LEQUE.giroMaximo,
    ordem: indice,
  };
};
