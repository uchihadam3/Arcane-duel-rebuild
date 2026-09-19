/*
 * O voo da carta.
 *
 * Uma carta nunca teleporta. Ela levanta da mão, endireita, atravessa o campo
 * num arco curto, desacelera e **encaixa** no pedestal — e é a mesma gramática
 * para a mão de baixo e para a de cima. Se a carta da máquina simplesmente
 * aparecesse no centro, o jogador não teria como entender de onde ela veio, e
 * a metade superior da arena deixaria de ser um adversário para virar um
 * gerador de eventos.
 *
 * Este arquivo é **puro**: uma função do tempo para uma pose. Ele não conhece
 * DOM, não conhece React e não decide regra nenhuma — quando ele roda, o motor
 * já resolveu tudo. É isso que permite testar a sequência inteira sem navegador
 * e garantir que ela passa por todos os estados em vez de pular do começo ao
 * fim.
 *
 * Todas as coordenadas estão em unidades de tabuleiro, o mesmo sistema da
 * planta. A altura é o quanto a carta sobe **acima** do plano do campo, e é ela
 * que produz a sombra que se afasta.
 */

export type FaseDoVoo =
  /** Ainda parada onde estava. */
  | 'na-origem'
  /** Subiu e cresceu, ainda sobre a origem. */
  | 'levantada'
  /** Atravessando o campo. */
  | 'em-transito'
  /** Chegou, com o pequeno recuo do encaixe. */
  | 'encaixada'
  /** Assentada no destino, com o efeito dela acontecendo. */
  | 'resolvendo'
  /** Guardada numa gaveta de cooldown. */
  | 'no-cooldown'
  /** Saiu da partida. */
  | 'consumida';

export interface Pose {
  readonly x: number;
  readonly y: number;
  /** Altura acima do plano do campo. Zero é assentada. */
  readonly altura: number;
  /** Giro no plano do campo, em graus. */
  readonly giro: number;
  /**
   * Inclinação em relação ao campo, em graus.
   *
   * `-inclinação da câmera` deixa a carta de frente para quem olha — é a pose
   * da mão. Zero a deita no campo. A transição entre as duas é o beat em que a
   * carta "endireita", e sai de graça porque a carta é filha do tabuleiro
   * inclinado.
   */
  readonly inclinacao: number;
  readonly escala: number;
  readonly fase: FaseDoVoo;
  /** 0 a 1 ao longo do voo inteiro, para quem quiser encadear efeito. */
  readonly progresso: number;
}

export interface Ponto {
  readonly x: number;
  readonly y: number;
}

export interface DescricaoDoVoo {
  readonly origem: Ponto;
  readonly destino: Ponto;
  readonly giroDeOrigem: number;
  readonly giroDeDestino: number;
  readonly inclinacaoDeOrigem: number;
  readonly inclinacaoDeDestino: number;
  readonly escalaDeOrigem: number;
  readonly escalaDeDestino: number;
  /** Quando o voo começou, no mesmo relógio que `estadoDoVoo` recebe. */
  readonly inicioMs: number;
  /** Multiplicador de duração, para o modo Rápido e o movimento reduzido. */
  readonly ritmo?: number;
}

/*
 * Os marcos, em milissegundos a partir do início.
 *
 * São os da tarefa, e cada um tem uma razão de leitura:
 *
 *   100  a carta se descola da mão — sem isso ela parece arrastada;
 *   200  endireita e cresce, anunciando que virou o assunto da tela;
 *   350  acelera: é aqui que o peso aparece;
 *   550  desacelera, para o encaixe não ser uma batida seca;
 *   650  encaixa, com um recuo curto;
 *   780  assentou, e o efeito pode começar.
 */
export const MARCOS = {
  levanta: 100,
  endireita: 200,
  acelera: 350,
  desacelera: 550,
  encaixa: 650,
  assenta: 780,
} as const;

export const DURACAO_DO_VOO_MS = MARCOS.assenta;

const limitar = (valor: number, minimo = 0, maximo = 1): number =>
  Math.min(maximo, Math.max(minimo, valor));

const interpolar = (de: number, para: number, t: number): number => de + (para - de) * t;

/** Saída suave: rápido no começo, parando no fim. */
const suaveNoFim = (t: number): number => 1 - (1 - t) ** 3;

/** Entrada e saída suaves, com o miolo rápido. É a curva do deslocamento. */
const suaveNosDois = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * O recuo do encaixe.
 *
 * Um único quique curto, amortecido. Dois quiques leem como brinquedo; nenhum
 * lê como imagem colada.
 */
const quique = (t: number): number => {
  if (t >= 1) return 0;
  return Math.sin(t * Math.PI * 1.5) * (1 - t) ** 2;
};

/**
 * A pose da carta neste instante.
 *
 * Determinística: o mesmo voo e o mesmo tempo dão sempre a mesma pose, em
 * qualquer aparelho. Nada aqui lê relógio por conta própria.
 */
export const estadoDoVoo = (voo: DescricaoDoVoo, agoraMs: number): Pose => {
  const ritmo = voo.ritmo ?? 1;
  const decorrido = (agoraMs - voo.inicioMs) / (ritmo <= 0 ? 1 : ritmo);

  const pose = (
    fase: FaseDoVoo,
    x: number,
    y: number,
    altura: number,
    giro: number,
    inclinacao: number,
    escala: number,
    progresso: number,
  ): Pose => ({ x, y, altura, giro, inclinacao, escala, fase, progresso });

  if (decorrido <= 0) {
    return pose(
      'na-origem',
      voo.origem.x,
      voo.origem.y,
      0,
      voo.giroDeOrigem,
      voo.inclinacaoDeOrigem,
      voo.escalaDeOrigem,
      0,
    );
  }

  /* --- 0 a 200 ms: levanta e endireita, ainda sobre a origem ---------- */
  if (decorrido < MARCOS.endireita) {
    const t = limitar(decorrido / MARCOS.endireita);
    const subida = suaveNoFim(t);
    return pose(
      'levantada',
      voo.origem.x,
      voo.origem.y - 18 * subida,
      70 * subida,
      interpolar(voo.giroDeOrigem, voo.giroDeOrigem * 0.35, subida),
      interpolar(voo.inclinacaoDeOrigem, voo.inclinacaoDeOrigem * 0.55, subida),
      interpolar(voo.escalaDeOrigem, voo.escalaDeOrigem * 1.16, subida),
      t * 0.25,
    );
  }

  /* --- 200 a 650 ms: a travessia -------------------------------------- */
  if (decorrido < MARCOS.encaixa) {
    const t = limitar((decorrido - MARCOS.endireita) / (MARCOS.encaixa - MARCOS.endireita));
    const caminho = suaveNosDois(t);
    /*
     * O arco.
     *
     * Um seno sobre a travessia: a carta sobe até o meio do caminho e desce
     * para encaixar. É curto de propósito — um arco alto lê como arremesso, e
     * a carta está sendo **posta**, não jogada.
     */
    const arco = Math.sin(caminho * Math.PI);
    return pose(
      'em-transito',
      interpolar(voo.origem.x, voo.destino.x, caminho),
      interpolar(voo.origem.y - 18, voo.destino.y, caminho),
      70 + arco * 110,
      interpolar(voo.giroDeOrigem * 0.35, voo.giroDeDestino, caminho),
      interpolar(voo.inclinacaoDeOrigem * 0.55, voo.inclinacaoDeDestino, suaveNoFim(t)),
      interpolar(voo.escalaDeOrigem * 1.16, voo.escalaDeDestino, caminho),
      0.25 + t * 0.55,
    );
  }

  /* --- 650 a 780 ms: o encaixe ---------------------------------------- */
  if (decorrido < MARCOS.assenta) {
    const t = limitar((decorrido - MARCOS.encaixa) / (MARCOS.assenta - MARCOS.encaixa));
    const recuo = quique(t);
    return pose(
      'encaixada',
      voo.destino.x,
      voo.destino.y,
      recuo * 26,
      voo.giroDeDestino,
      voo.inclinacaoDeDestino,
      voo.escalaDeDestino * (1 + recuo * 0.06),
      0.8 + t * 0.2,
    );
  }

  return pose(
    'resolvendo',
    voo.destino.x,
    voo.destino.y,
    0,
    voo.giroDeDestino,
    voo.inclinacaoDeDestino,
    voo.escalaDeDestino,
    1,
  );
};

/**
 * A sequência de fases pela qual um voo passa, amostrada.
 *
 * Existe para o teste: ele confere que a carta **atravessa** os estados em vez
 * de pular da origem ao destino. Amostrar é o suficiente — o documento pede
 * que a sequência exista, não um quadro a quadro.
 */
export const fasesDoVoo = (voo: DescricaoDoVoo, amostras = 40): readonly FaseDoVoo[] => {
  const fases: FaseDoVoo[] = [];
  for (let indice = 0; indice <= amostras; indice += 1) {
    const tempo = voo.inicioMs + (DURACAO_DO_VOO_MS * indice) / amostras;
    const fase = estadoDoVoo(voo, tempo).fase;
    if (fases[fases.length - 1] !== fase) fases.push(fase);
  }
  return fases;
};

/*
 * O deslizar do cooldown.
 *
 * Quando o turno abre, a carta de CD1 sai fisicamente da gaveta e volta para a
 * mão, e as outras deslizam uma casa. É um movimento mais curto e mais seco que
 * o voo: ele não é o assunto da tela, é a arrumação da mesa antes da jogada.
 */
export const DURACAO_DO_DESLIZE_MS = 340;

export const estadoDoDeslize = (
  origem: Ponto,
  destino: Ponto,
  inicioMs: number,
  agoraMs: number,
  ritmo = 1,
): {
  readonly x: number;
  readonly y: number;
  readonly altura: number;
  readonly pronto: boolean;
} => {
  const decorrido = (agoraMs - inicioMs) / (ritmo <= 0 ? 1 : ritmo);
  const t = limitar(decorrido / DURACAO_DO_DESLIZE_MS);
  const caminho = suaveNosDois(t);
  return {
    x: interpolar(origem.x, destino.x, caminho),
    y: interpolar(origem.y, destino.y, caminho),
    // Um levantar mínimo: a carta raspa a mesa em vez de flutuar sobre ela.
    altura: Math.sin(caminho * Math.PI) * 16,
    pronto: t >= 1,
  };
};
