import { PerspectiveCamera, Vector3 } from 'three';

import type { Ponto3D } from './layout.js';
import { MEIA_ARENA, PECAS_DA_ARENA } from './layout.js';

/*
 * A câmera.
 *
 * Perspectiva oblíqua e **fixa**. O vídeo de referência passa vinte e quatro
 * segundos sem orbitar, sem dolly e sem trocar de ângulo: toda a profundidade
 * vem da geometria e da luz. Nenhum gesto do jogador mexe nesta câmera.
 *
 * O que mudou depois da reprovação foi o método. A primeira versão fazia o
 * campo caber **abrindo a lente** — um FOV livre entre 16° e 74°. Isso resolve
 * layout deformando a imagem: em telefone a arena lia como uma cama tombada, e
 * a personalidade da câmera mudava conforme a resolução, porque a lente mudava.
 *
 * Agora a lente é uma só, longa e fixa, e quem se move é a distância. Trocar
 * de aparelho passa a ser trocar de enquadramento, e não de óptica. É o que
 * jogo comercial faz, e é o que mantém a arena reconhecível de um telefone
 * para o outro.
 */

export const CAMERA = {
  /**
   * Declinação em graus, medida a partir do plano do tampo.
   *
   * 27,5° não é gosto: é a conta. A faixa de jogo da arte tem proporção 1,023
   * e um plano deitado projeta com proporção `proporção / sen θ`. Em 27,5°
   * isso dá 2,22 — exatamente um telefone deitado. O ângulo foi escolhido para
   * o campo **preencher** a tela sem ser esticado em nenhuma direção.
   */
  declinacao: 27.5,
  alvo: { x: 0, y: 0, z: 0 },
  /**
   * Lente longa: 10°.
   *
   * É a diferença entre uma arena e uma cama tombada. Com a lente curta que a
   * primeira entrega usava — FOV livre entre 16° e 74° — a borda da frente
   * projetava quase o dobro da borda do fundo, e o campo do adversário lia
   * como um lugar distante e deformado. Com 10° essa razão cai para perto de
   * 1,2: a perspectiva fica discreta, as duas metades ficam comparáveis, e o
   * enquadramento deixa de mudar de personalidade conforme a resolução.
   *
   * Lente longa custa distância — a câmera fica a mais de cem unidades — e é
   * por isso que os planos de corte são derivados dela, logo abaixo.
   */
  abertura: 10,
  /** Margem mínima entre a peça mais extrema e a borda: informação cortada é bug. */
  folgaDasPecas: 0.97,
  /** Limites de segurança da distância, para nenhuma conta degenerar. */
  distanciaMinima: 18,
  distanciaMaxima: 400,
} as const;

/*
 * Por que não existe mais um passo de "cobrir a tela".
 *
 * Um plano inclinado não cobre um retângulo deitado: a borda do fundo projeta
 * estreita e sobram duas cunhas escuras nas quinas de cima. O tampo já mostra
 * a arte inteira e já sai do quadro pela frente e pelo fundo — o que falta é
 * **largura de arte**, e isso nenhum código resolve.
 *
 * Medido em 915 × 412: a arte cobre cerca de 75 % da largura na altura mais
 * alta ainda visível. As cunhas que sobram são onde moram o Menu e o HUD do
 * adversário, e o fundo ali é degradê, não preto chapado. Cobrir de verdade
 * exigiria uma arte de arena mais larga — está registrado como achado de
 * asset, e não maquiado aqui.
 */

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

const RADIANOS = (CAMERA.declinacao * Math.PI) / 180;
/** O versor que vai do alvo até a câmera. Só a distância sobre ele muda. */
const DIRECAO = { x: 0, y: Math.sin(RADIANOS), z: Math.cos(RADIANOS) } as const;

const posicionar = (camera: PerspectiveCamera, distancia: number): void => {
  camera.position.set(
    CAMERA.alvo.x + DIRECAO.x * distancia,
    CAMERA.alvo.y + DIRECAO.y * distancia,
    CAMERA.alvo.z + DIRECAO.z * distancia,
  );
  /*
   * Os planos de corte acompanham a distância.
   *
   * Com lente longa a câmera fica longe, e um `near` de 1 contra um `far` de
   * centenas gasta toda a precisão do buffer de profundidade justamente onde
   * as placas das zonas estão a dois centímetros do tampo — é assim que se
   * ganha cintilação de z-fighting. Amarrados à distância, os dois planos
   * abraçam a cena e nada mais.
   */
  camera.near = Math.max(0.5, distancia * 0.4);
  camera.far = distancia * 2.6;
  camera.lookAt(new Vector3(CAMERA.alvo.x, CAMERA.alvo.y, CAMERA.alvo.z));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
};

const paraNdc = (camera: PerspectiveCamera, ponto: Ponto3D): Vector3 =>
  new Vector3(ponto.x, ponto.y, ponto.z).project(camera);

/**
 * Os cantos de cada peça de jogo.
 *
 * A mão é a exceção, e é deliberada. No vídeo de referência as cartas da mão
 * ficam **cortadas pela borda inferior**: aparece a metade de cima de cada uma,
 * que é onde moram nome, custo e tipo. Aqui o enquadramento exige a borda de
 * trás do leque — o topo das cartas — e deixa a de baixo sair da tela.
 */
const CANTOS_DAS_PECAS: readonly Ponto3D[] = PECAS_DA_ARENA.flatMap((peca) => {
  const sinaisZ = peca.zona === 'mao' ? [-1] : [-1, 1];
  return [-1, 1].flatMap((sinalX) =>
    sinaisZ.map((sinalZ) => ({
      x: peca.centro.x + (sinalX * peca.largura) / 2,
      y: peca.centro.y,
      z: peca.centro.z + (sinalZ * peca.profundidade) / 2,
    })),
  );
});

/** O maior |x| e o maior |y| em NDC, por eixo, de um conjunto de pontos. */
const extremos = (
  camera: PerspectiveCamera,
  pontos: readonly Ponto3D[],
): { readonly x: number; readonly y: number } => {
  let maiorX = 0;
  let maiorY = 0;
  for (const ponto of pontos) {
    const ndc = paraNdc(camera, ponto);
    maiorX = Math.max(maiorX, Math.abs(ndc.x));
    maiorY = Math.max(maiorY, Math.abs(ndc.y));
  }
  return { x: maiorX, y: maiorY };
};

const limitar = (distancia: number): number =>
  Math.min(CAMERA.distanciaMaxima, Math.max(CAMERA.distanciaMinima, distancia));

/**
 * Procura a distância em que uma medida do quadro chega ao valor pedido.
 *
 * Em NDC a coordenada cai aproximadamente com o inverso da distância, então
 * multiplicar a distância pela razão entre o que se mediu e o que se quer é
 * uma contração: meia dúzia de passadas chega a menos de um milésimo. É a
 * mesma conta do enquadramento anterior, aplicada à distância em vez de à
 * lente — e é essa troca que mantém a óptica igual em toda tela.
 */
const procurarDistancia = (
  camera: PerspectiveCamera,
  inicial: number,
  medir: (camera: PerspectiveCamera) => number,
  desejado: number,
): number => {
  let distancia = limitar(inicial);
  for (let passo = 0; passo < 12; passo += 1) {
    posicionar(camera, distancia);
    const medida = medir(camera);
    if (medida <= 0) return distancia;
    const proxima = limitar(distancia * (medida / desejado));
    if (Math.abs(proxima - distancia) < 0.004) return proxima;
    distancia = proxima;
  }
  return distancia;
};

/**
 * A câmera pronta para uma tela: lente fixa, distância medida.
 *
 * Uma exigência só, e ela é sobre informação: nenhuma peça de jogo encosta na
 * borda. A câmera recua até que o canto mais extremo do campo caiba com
 * folga. O tampo se vira — ele é maior que o campo e sai do quadro sozinho.
 */
export const cameraParaViewport = (viewport: Viewport): PerspectiveCamera => {
  const aspecto = viewport.altura === 0 ? 1 : viewport.largura / viewport.altura;
  const camera = new PerspectiveCamera(CAMERA.abertura, aspecto, 1, 400);

  const distancia = procurarDistancia(
    camera,
    MEIA_ARENA.profundidade * 6,
    (atual) => {
      const pecas = extremos(atual, CANTOS_DAS_PECAS);
      return Math.max(pecas.x, pecas.y);
    },
    CAMERA.folgaDasPecas,
  );

  posicionar(camera, distancia);
  return camera;
};

export const projetar = (
  camera: PerspectiveCamera,
  ponto: Ponto3D,
  viewport: Viewport,
): PontoNaTela => {
  const ndc = paraNdc(camera, ponto);
  const normalX = (ndc.x + 1) / 2;
  const normalY = (1 - ndc.y) / 2;
  /*
   * A escala de referência acompanha a câmera.
   *
   * Ela é a distância da câmera ao alvo — que agora muda com a tela —, e não
   * uma constante: fixá-la faria a camada em DOM desalinhar do WebGL
   * exatamente nos aparelhos em que a câmera recuou.
   */
  const referencia = camera.position.distanceTo(
    new Vector3(CAMERA.alvo.x, CAMERA.alvo.y, CAMERA.alvo.z),
  );
  const distancia = Math.hypot(
    camera.position.x - ponto.x,
    camera.position.y - ponto.y,
    camera.position.z - ponto.z,
  );

  return {
    x: normalX * viewport.largura,
    y: normalY * viewport.altura,
    normalX,
    normalY,
    escala: distancia === 0 ? 1 : referencia / distancia,
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
