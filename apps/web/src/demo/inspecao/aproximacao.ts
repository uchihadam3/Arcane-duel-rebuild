import type { Caixa } from '../animacao/voo.js';

/*
 * A aproximação da carta inspecionada.
 *
 * Inspecionar não pode ser um painel que aparece. Um painel não diz **qual**
 * carta ele está mostrando: ele nasce no meio da tela, sem relação com o dedo
 * que o abriu, e o jogador precisa reconstruir a ligação sozinho. A revisão
 * pediu o oposto — a cópia nasce exatamente onde a carta está, se aproxima,
 * cresce e endireita. Quem olha vê **aquela** carta vindo.
 *
 * Duas consequências que este arquivo garante:
 *
 *   1. A cópia termina **sempre a 0°**, mesmo nascendo a 180° na metade da
 *      máquina. Ela está sendo lida por quem está deste lado da mesa.
 *   2. A carta física do tabuleiro **não se mexe**. O que viaja é uma cópia
 *      de apresentação; girar a peça real porque alguém a inspecionou seria
 *      mentir sobre o estado da mesa.
 *
 * O arquivo é puro: uma função do progresso para uma pose. É por isso que dá
 * para conferir por teste que a carta termina na altura pedida da tela e que
 * o fundo escurece sem apagar a arena.
 */

export interface Pose {
  /** Centro da cópia, em pixels de tela. */
  readonly x: number;
  readonly y: number;
  /** Tamanho relativo ao da carta na origem. */
  readonly escala: number;
  readonly giro: number;
  /** O quanto o fundo está escuro, de 0 a 1. */
  readonly escuridao: number;
}

export interface Tela {
  readonly largura: number;
  readonly altura: number;
}

/**
 * A altura final da cópia, em fração da altura útil.
 *
 * A faixa pedida foi 65 % a 82 %. 74 % fica no meio dela: grande o bastante
 * para o texto impresso ser lido sem esforço, e ainda com margem em cima e
 * embaixo — uma carta encostando nas duas bordas parece presa, não
 * apresentada.
 */
export const ALTURA_DA_INSPECAO = 0.74;

/**
 * O quanto o fundo escurece.
 *
 * Nunca até o preto. A revisão foi explícita: a arena continua visível por
 * trás. Escurecer tudo transformaria a inspeção numa tela separada, e a
 * pessoa perderia de vista o campo que estava lendo.
 */
export const ESCURIDAO_MAXIMA = 0.62;

export const DURACAO_DA_ABERTURA_MS = 380;
export const DURACAO_DO_FECHAMENTO_MS = 300;

const limitar = (valor: number, minimo = 0, maximo = 1): number =>
  Math.min(maximo, Math.max(minimo, valor));

const interpolar = (de: number, para: number, t: number): number => de + (para - de) * t;

/** Sai rápido e para devagar: a carta chega, não bate. */
const suaveNoFim = (t: number): number => 1 - (1 - t) ** 3;

export interface DescricaoDaInspecao {
  /** Onde a carta está na tela, medida pelo navegador. */
  readonly origem: Caixa;
  /** O giro em que a peça física está. 180 na metade da máquina. */
  readonly giroDeOrigem: number;
  readonly tela: Tela;
}

/** Onde a cópia termina: centrada, em pé, na altura pedida. */
export const destinoDaInspecao = (descricao: DescricaoDaInspecao): Caixa => {
  const altura = descricao.tela.altura * ALTURA_DA_INSPECAO;
  const proporcao =
    descricao.origem.altura > 0 ? descricao.origem.largura / descricao.origem.altura : 0.71;
  const largura = altura * proporcao;
  return {
    x: descricao.tela.largura / 2 - largura / 2,
    y: descricao.tela.altura / 2 - altura / 2,
    largura,
    altura,
  };
};

/**
 * A pose da cópia num instante da aproximação.
 *
 * `t` é 0 na carta e 1 na leitura. O fechamento usa a mesma função com `t`
 * descendo: a animação inversa não é um segundo caminho escrito à parte, é
 * **o mesmo caminho ao contrário** — e por isso a carta volta para onde saiu.
 */
export const poseDaInspecao = (descricao: DescricaoDaInspecao, t: number): Pose => {
  const andamento = suaveNoFim(limitar(t));
  const destino = destinoDaInspecao(descricao);
  const centroDaOrigem = {
    x: descricao.origem.x + descricao.origem.largura / 2,
    y: descricao.origem.y + descricao.origem.altura / 2,
  };
  const centroDoDestino = { x: destino.x + destino.largura / 2, y: destino.y + destino.altura / 2 };
  const escalaFinal = descricao.origem.altura > 0 ? destino.altura / descricao.origem.altura : 1;

  /*
   * O giro some **antes** do fim.
   *
   * Uma carta que ainda está girando quando já chegou ao tamanho de leitura
   * obriga a pessoa a esperar para ler. Ela endireita na primeira metade do
   * caminho, e a segunda metade é só aproximação.
   */
  const endireitando = suaveNoFim(limitar(t / 0.55));

  return {
    x: interpolar(centroDaOrigem.x, centroDoDestino.x, andamento),
    y: interpolar(centroDaOrigem.y, centroDoDestino.y, andamento),
    escala: interpolar(1, escalaFinal, andamento),
    giro: interpolar(descricao.giroDeOrigem, 0, endireitando),
    escuridao: ESCURIDAO_MAXIMA * limitar(t),
  };
};
