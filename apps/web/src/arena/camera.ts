import { PerspectiveCamera, Vector3 } from 'three';

import type { Ponto3D } from './layout.js';
import { MEIA_ARENA, PECAS_DA_ARENA } from './layout.js';

/*
 * A câmera.
 *
 * Perspectiva oblíqua e **fixa**. O vídeo de referência passa vinte e quatro
 * segundos sem orbitar, sem dolly e sem trocar de ângulo: toda a profundidade
 * vem da geometria e da luz. Isso não é limitação, é vantagem competitiva — o
 * jogador decora onde cada zona fica e nunca precisa reencontrá-la. Nenhum
 * gesto do jogador mexe nesta câmera.
 *
 * O que muda com a tela é só o enquadramento: em 720×360 o campo é muito mais
 * largo do que em 1280×720. `enquadrar` resolve isso medindo — ela projeta os
 * pontos que **não podem** ficar de fora e ajusta a lente até que o mais
 * extremo deles encoste na margem. É o que transforma a regra "nada
 * competitivo cortado, e a arena ocupa a tela" numa conta, em vez de numa
 * esperança.
 */

export const CAMERA = {
  /*
   * Oblíqua, e não quase de cima.
   *
   * O ângulo é o que decide quanto a profundidade encolhe na tela. Muito em
   * cima, o tabuleiro projeta quase quadrado e sobra preto nas laterais de um
   * telefone deitado; muito de lado, o campo do adversário fica curto demais
   * para ser lido. Este par foi medido nas seis resoluções alvo.
   */
  posicao: { x: 0, y: 17.0, z: 26.0 },
  alvo: { x: 0, y: 0, z: 1.4 },
  perto: 0.8,
  longe: 120,
  /** Abertura de partida, antes do enquadramento medir a tela. */
  aberturaInicial: 36,
  /** Limites da lente. Fora deles a perspectiva deixa de ser legível. */
  aberturaMinima: 16,
  aberturaMaxima: 74,
  /** Margem que sobra entre a peça mais extrema e a borda da tela. */
  folga: 0.965,
} as const;

export interface Viewport {
  readonly largura: number;
  readonly altura: number;
}

export interface PontoNaTela {
  /** Pixels a partir da borda esquerda da área da arena. */
  readonly x: number;
  /** Pixels a partir do topo da área da arena. */
  readonly y: number;
  /** 0..1 na largura, 0..1 na altura — a forma que o registro de âncoras usa. */
  readonly normalX: number;
  readonly normalY: number;
  /**
   * Quanto uma peça daquele ponto aparece maior ou menor que a mesma peça no
   * centro do tampo. É o que dá "o adversário é menor porque está longe".
   */
  readonly escala: number;
  readonly dentroDaTela: boolean;
}

export const criarCamera = (aspecto: number): PerspectiveCamera => {
  const camera = new PerspectiveCamera(CAMERA.aberturaInicial, aspecto, CAMERA.perto, CAMERA.longe);
  camera.position.set(CAMERA.posicao.x, CAMERA.posicao.y, CAMERA.posicao.z);
  camera.lookAt(new Vector3(CAMERA.alvo.x, CAMERA.alvo.y, CAMERA.alvo.z));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
};

/**
 * Os pontos que precisam caber.
 *
 * As quatro quinas do tampo e, de cada zona, os quatro cantos — o centro caber
 * não adianta se a laje sair pela borda.
 *
 * A mão é a exceção, e é uma exceção deliberada. No vídeo de referência as
 * cartas da mão ficam **cortadas pela borda inferior**: aparece a metade de
 * cima de cada uma, que é onde moram nome, custo e tipo. É isso que permite
 * que elas sejam grandes o bastante para serem lidas num telefone. Aqui o
 * enquadramento exige a borda de trás do leque — o topo das cartas —, e deixa
 * a de baixo sair da tela.
 */
const pontosObrigatorios = (): readonly Ponto3D[] => {
  const pontos: Ponto3D[] = [
    { x: -MEIA_ARENA.largura, y: 0, z: -MEIA_ARENA.profundidade },
    { x: MEIA_ARENA.largura, y: 0, z: -MEIA_ARENA.profundidade },
    { x: -MEIA_ARENA.largura, y: 0, z: MEIA_ARENA.profundidade },
    { x: MEIA_ARENA.largura, y: 0, z: MEIA_ARENA.profundidade },
  ];
  for (const peca of PECAS_DA_ARENA) {
    const sinaisZ = peca.zona === 'mao' ? [-1] : [-1, 1];
    for (const sinalX of [-1, 1]) {
      for (const sinalZ of sinaisZ) {
        pontos.push({
          x: peca.centro.x + (sinalX * peca.largura) / 2,
          y: peca.centro.y,
          z: peca.centro.z + (sinalZ * peca.profundidade) / 2,
        });
      }
    }
  }
  return pontos;
};

const OBRIGATORIOS = pontosObrigatorios();

const paraNdc = (camera: PerspectiveCamera, ponto: Ponto3D): Vector3 =>
  new Vector3(ponto.x, ponto.y, ponto.z).project(camera);

/**
 * Ajusta a lente para que a arena **preencha** a tela, e devolve a câmera.
 *
 * Nos dois sentidos, de propósito. Só abrir garantiria que nada fica de fora e
 * deixaria a arena pequena no meio de uma tela vazia — foi exatamente o que a
 * primeira verificação em navegador mostrou, com o tabuleiro ocupando pouco
 * mais de um terço da largura. Caber não basta: em telefone, a arena precisa
 * ocupar o espaço que tem.
 *
 * Uma passada resolve. Em NDC a coordenada escala com o inverso da tangente da
 * meia-abertura, então `tan(nova/2) = tan(atual/2) · extremo / folga` leva o
 * ponto mais extremo exatamente até a margem escolhida.
 */
export const enquadrar = (camera: PerspectiveCamera): PerspectiveCamera => {
  let extremo = 0;
  for (const ponto of OBRIGATORIOS) {
    const ndc = paraNdc(camera, ponto);
    extremo = Math.max(extremo, Math.abs(ndc.x), Math.abs(ndc.y));
  }
  if (extremo <= 0) return camera;

  const meia = (camera.fov * Math.PI) / 360;
  const desejada = (2 * Math.atan((Math.tan(meia) * extremo) / CAMERA.folga) * 180) / Math.PI;
  camera.fov = Math.min(CAMERA.aberturaMaxima, Math.max(CAMERA.aberturaMinima, desejada));
  camera.updateProjectionMatrix();
  return camera;
};

/** A câmera pronta para uma tela: criada, enquadrada e com a matriz atual. */
export const cameraParaViewport = (viewport: Viewport): PerspectiveCamera => {
  const aspecto = viewport.altura === 0 ? 1 : viewport.largura / viewport.altura;
  return enquadrar(criarCamera(aspecto));
};

/**
 * A distância da câmera ao alvo, usada como referência de escala 1.
 *
 * Uma peça no centro do tampo tem escala 1; mais perto da câmera cresce, mais
 * longe encolhe. É a mesma perspectiva que a cena aplica, calculada aqui para
 * a camada em DOM ficar exatamente em cima do que o WebGL desenhou.
 */
const DISTANCIA_DE_REFERENCIA = Math.hypot(
  CAMERA.posicao.x - CAMERA.alvo.x,
  CAMERA.posicao.y - CAMERA.alvo.y,
  CAMERA.posicao.z - CAMERA.alvo.z,
);

export const projetar = (
  camera: PerspectiveCamera,
  ponto: Ponto3D,
  viewport: Viewport,
): PontoNaTela => {
  const ndc = paraNdc(camera, ponto);
  const normalX = (ndc.x + 1) / 2;
  const normalY = (1 - ndc.y) / 2;
  const distancia = Math.hypot(
    CAMERA.posicao.x - ponto.x,
    CAMERA.posicao.y - ponto.y,
    CAMERA.posicao.z - ponto.z,
  );

  return {
    x: normalX * viewport.largura,
    y: normalY * viewport.altura,
    normalX,
    normalY,
    escala: distancia === 0 ? 1 : DISTANCIA_DE_REFERENCIA / distancia,
    dentroDaTela: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z <= 1,
  };
};

export interface CaixaNaTela extends PontoNaTela {
  /** Largura da peça em pixels de tela, já com a perspectiva aplicada. */
  readonly largura: number;
  readonly altura: number;
}

/**
 * A caixa de uma peça na tela.
 *
 * Largura e altura saem da projeção das bordas, e não de uma multiplicação por
 * escala: a laje mais distante é um trapézio, e o retângulo que a cobre
 * precisa ser o retângulo que ela realmente ocupa.
 */
export const projetarCaixa = (
  camera: PerspectiveCamera,
  centro: Ponto3D,
  largura: number,
  profundidade: number,
  viewport: Viewport,
): CaixaNaTela => {
  const meio = projetar(camera, centro, viewport);
  let minimoX = Number.POSITIVE_INFINITY;
  let maximoX = Number.NEGATIVE_INFINITY;
  let minimoY = Number.POSITIVE_INFINITY;
  let maximoY = Number.NEGATIVE_INFINITY;

  for (const sinalX of [-1, 1]) {
    for (const sinalZ of [-1, 1]) {
      const quina = projetar(
        camera,
        {
          x: centro.x + (sinalX * largura) / 2,
          y: centro.y,
          z: centro.z + (sinalZ * profundidade) / 2,
        },
        viewport,
      );
      minimoX = Math.min(minimoX, quina.x);
      maximoX = Math.max(maximoX, quina.x);
      minimoY = Math.min(minimoY, quina.y);
      maximoY = Math.max(maximoY, quina.y);
    }
  }

  return { ...meio, largura: maximoX - minimoX, altura: maximoY - minimoY };
};
