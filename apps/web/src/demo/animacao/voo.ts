/*
 * O voo da carta, em coordenadas de tela.
 *
 * Uma carta nunca teleporta. Ela levanta da mão, endireita, atravessa num arco
 * curto, desacelera e **encaixa** no pedestal — e é a mesma gramática para a
 * mão de baixo e para a de cima.
 *
 * O voo acontece em **pixels de tela**, e isso é arquitetura, não conveniência.
 * A mão vive em coordenadas de tela e o pedestal vive dentro do tabuleiro
 * transformado em 3D; calcular a ponte entre os dois por conta própria é
 * exatamente o tipo de projeção caseira que deformou a Etapa 6. Aqui a origem
 * e o destino chegam como retângulos já medidos pelo navegador, e o voo
 * interpola entre eles. O navegador já fez a projeção; nós só perguntamos o
 * resultado.
 *
 * Este arquivo é **puro**: uma função do tempo para uma pose. Não conhece DOM,
 * não conhece React e não decide regra nenhuma — quando ele roda, o motor já
 * resolveu tudo. É isso que permite conferir a sequência inteira sem navegador
 * e garantir que ela passa por todos os estados em vez de pular do começo ao
 * fim.
 */

export type FaseDoVoo =
  /** Ainda parada onde estava. */
  | 'na-origem'
  /** Destacada onde está: cresceu um fio, e nada mais se mexe na tela. */
  | 'focada'
  /** Descolou da mão: subiu, ainda sobre a origem. */
  | 'levantada'
  /** Endireitou e cresceu, anunciando que virou o assunto da tela. */
  | 'apresentada'
  /** Atravessando. */
  | 'em-transito'
  /** Chegando, freando. */
  | 'desacelerando'
  /** No destino, com o recuo curto do encaixe. */
  | 'encaixada'
  /** Assentada, e o efeito pode começar. */
  | 'assentada';

/** As fases, na ordem em que acontecem. */
export const FASES: readonly FaseDoVoo[] = [
  'na-origem',
  'focada',
  'levantada',
  'apresentada',
  'em-transito',
  'desacelerando',
  'encaixada',
  'assentada',
];

export interface Caixa {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

export interface Pose {
  /** Centro da carta, em pixels de tela. */
  readonly x: number;
  readonly y: number;
  /** Tamanho relativo à carta na origem. */
  readonly escala: number;
  /** Giro no plano da tela, em graus. */
  readonly giro: number;
  /**
   * Inclinação em torno do eixo horizontal, em graus.
   *
   * Zero é de frente para quem olha, que é a pose da mão. O ângulo da câmera
   * deita a carta no campo. A transição entre as duas é o beat em que a carta
   * "vira a rotação do campo", e é o que faz o encaixe parecer pouso e não
   * colagem.
   */
  readonly inclinacao: number;
  /**
   * Quanto a carta está **no ar**, de 0 a 1.
   *
   * É o que move a sombra: no chão ela é curta e escura, no alto é longa e
   * difusa. Sem isso o voo lê como recorte deslizando.
   */
  readonly elevacao: number;
  readonly fase: FaseDoVoo;
  /** 0 a 1 ao longo do voo inteiro. */
  readonly progresso: number;
  readonly terminou: boolean;
}

/*
 * Os marcos, em milissegundos a partir do início.
 *
 * Eles são a soma dos beats de `ritmo.ts`, e cada intervalo entre dois marcos
 * é um beat inteiro daquela tabela:
 *
 *    340  `foco` — a carta se destaca onde está, e **nada mais se move**;
 *    220  `levantar` — ela se descola da mão;
 *    730  `viagem` — o grosso da travessia, onde o peso aparece;
 *    230  `encaixe` — desacelera e encaixa, com o recuo curto.
 *
 * O voo antigo cabia em 780 ms inteiros. No aparelho real isso lia como um
 * corte: a carta estava na mão e já estava no pedestal. A revisão pediu que
 * cada um desses quatro momentos tivesse tempo próprio, e é o que os números
 * abaixo fazem — o teste de `ritmo.ts` confere que cada intervalo cai dentro
 * da faixa pedida, então encurtar um deles por engano quebra o build.
 */
export const MARCOS = {
  foco: 340,
  levanta: 560,
  apresenta: 700,
  viaja: 1290,
  desacelera: 1430,
  assenta: 1660,
} as const;

export const DURACAO_DO_VOO_MS = MARCOS.assenta;

const limitar = (valor: number, minimo = 0, maximo = 1): number =>
  Math.min(maximo, Math.max(minimo, valor));

const interpolar = (de: number, para: number, t: number): number => de + (para - de) * t;

/** Saída suave: sai rápido e para devagar. */
const suaveNoFim = (t: number): number => 1 - (1 - t) ** 3;

/** Entrada suave: começa parado e ganha velocidade. */
const suaveNoComeco = (t: number): number => t * t * t;

/**
 * A curva da travessia.
 *
 * Não é interpolação linear, e não é um `ease-in-out` simétrico. O pico de
 * velocidade fica **antes** do meio: a carta arranca, corre, e gasta a metade
 * final do tempo freando. Simétrico lê como slide de apresentação; com o pico
 * adiantado lê como objeto com massa sendo lançado.
 */
const curvaDaTravessia = (t: number): number => {
  const u = limitar(t);
  // Bézier cúbica de controle (0.22, 0.86) e (0.34, 1) — arranque forte,
  // chegada longa. Resolvida por aproximação de Newton sobre o parâmetro.
  const p1 = 0.22;
  const p2 = 0.34;
  let s = u;
  for (let passo = 0; passo < 5; passo += 1) {
    const x = 3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s * s * p2 + s ** 3;
    const dx = 3 * (1 - s) ** 2 * p1 + 6 * (1 - s) * s * (p2 - p1) + 3 * s * s * (1 - p2);
    if (Math.abs(dx) < 1e-6) break;
    s -= (x - u) / dx;
    s = limitar(s);
  }
  return 3 * (1 - s) ** 2 * s * 0.86 + 3 * (1 - s) * s * s + s ** 3;
};

/**
 * O recuo do encaixe.
 *
 * Um único quique curto, amortecido. Dois quiques leem como brinquedo; nenhum
 * lê como ímã. A carta passa 3,5 % além do destino e volta.
 */
const RECUO = 0.035;
const recuoDoEncaixe = (t: number): number => {
  const u = limitar(t);
  return 1 + RECUO * Math.sin(Math.PI * u) * (1 - u) * 2.4;
};

export interface DescricaoDoVoo {
  /** Onde a carta está agora, medido na tela. */
  readonly origem: Caixa;
  /** Onde ela vai parar, medido na tela. */
  readonly destino: Caixa;
  readonly giroDeOrigem: number;
  readonly giroDeDestino: number;
  /** A inclinação do campo: para onde a carta gira ao pousar. */
  readonly inclinacaoDoCampo: number;
  /** Quando o voo começou, no mesmo relógio que `estadoDoVoo` recebe. */
  readonly inicioMs: number;
  /**
   * Multiplicador de duração.
   *
   * Menor que 1 encurta. Com `prefers-reduced-motion` ele cai para 0,45 — o
   * voo fica curto, mas **continua existindo**: a tarefa foi explícita em que
   * movimento reduzido não pode virar teleporte incompreensível, porque aí o
   * jogador perde a informação de origem e destino.
   */
  readonly ritmo?: number;
}

export const RITMO_REDUZIDO = 0.45;

/** A altura do arco, em fração da distância percorrida. */
const ALTURA_DO_ARCO = 0.14;
/** Quanto a carta sobe ao se descolar da mão, em fração da própria altura. */
const LEVANTADA = 0.18;
/** Quanto ela cresce ao ser apresentada, antes de viajar. */
const AMPLIACAO_DA_APRESENTACAO = 1.16;
/** Quando a carta começa a deitar para virar a rotação do campo. */
const MARCOS_DO_GIRO = 1240;

/** Quanto ela cresce durante o beat de foco, ainda parada na origem. */
const AMPLIACAO_DO_FOCO = 1.07;

const faseEm = (decorrido: number): FaseDoVoo => {
  if (decorrido <= 0) return 'na-origem';
  if (decorrido < MARCOS.foco) return 'focada';
  if (decorrido < MARCOS.levanta) return 'levantada';
  if (decorrido < MARCOS.apresenta) return 'apresentada';
  if (decorrido < MARCOS.viaja) return 'em-transito';
  if (decorrido < MARCOS.desacelera) return 'desacelerando';
  if (decorrido < MARCOS.assenta) return 'encaixada';
  return 'assentada';
};

const centro = (caixa: Caixa): { readonly x: number; readonly y: number } => ({
  x: caixa.x + caixa.largura / 2,
  y: caixa.y + caixa.altura / 2,
});

/**
 * A pose da carta neste instante.
 *
 * A conta é uma só, em três eixos independentes: **onde** (a travessia, com
 * arco), **como** (giro, inclinação e escala) e **quanto no ar** (a elevação,
 * que move a sombra). Separar os três é o que permite que a carta continue
 * girando enquanto já está freando, que é o que um objeto real faz.
 */
export const estadoDoVoo = (voo: DescricaoDoVoo, agoraMs: number): Pose => {
  const ritmo = voo.ritmo === undefined || voo.ritmo <= 0 ? 1 : voo.ritmo;
  const decorrido = (agoraMs - voo.inicioMs) / ritmo;
  const fase = faseEm(decorrido);
  const de = centro(voo.origem);
  const para = centro(voo.destino);
  const escalaDoDestino = voo.origem.largura > 0 ? voo.destino.largura / voo.origem.largura : 1;

  if (decorrido <= 0) {
    return {
      x: de.x,
      y: de.y,
      escala: 1,
      giro: voo.giroDeOrigem,
      inclinacao: 0,
      elevacao: 0,
      fase: 'na-origem',
      progresso: 0,
      terminou: false,
    };
  }

  if (decorrido >= MARCOS.assenta) {
    return {
      x: para.x,
      y: para.y,
      escala: escalaDoDestino,
      giro: voo.giroDeDestino,
      inclinacao: voo.inclinacaoDoCampo,
      elevacao: 0,
      fase: 'assentada',
      progresso: 1,
      terminou: true,
    };
  }

  /* Onde: a travessia começa em `apresenta` e o recuo mora depois de `desacelera`. */
  const andamento =
    decorrido < MARCOS.apresenta
      ? 0
      : decorrido < MARCOS.desacelera
        ? curvaDaTravessia((decorrido - MARCOS.apresenta) / (MARCOS.desacelera - MARCOS.apresenta))
        : recuoDoEncaixe((decorrido - MARCOS.desacelera) / (MARCOS.assenta - MARCOS.desacelera));

  /*
   * A subida da mão, que acontece **antes** e **junto** da travessia.
   *
   * Ela some ao longo do primeiro terço do percurso: sem isso a carta
   * chegaria ao pedestal ainda erguida e o encaixe pareceria um salto.
   */
  const subida =
    decorrido < MARCOS.foco
      ? 0
      : decorrido < MARCOS.levanta
        ? suaveNoFim((decorrido - MARCOS.foco) / (MARCOS.levanta - MARCOS.foco))
        : Math.max(0, 1 - limitar(andamento / 0.34));

  /*
   * O arco.
   *
   * Curto, e sempre para cima na tela. Um arco alto lê como arremesso de
   * basquete; o que se quer é o gesto de pousar uma carta na mesa.
   */
  const distancia = Math.hypot(para.x - de.x, para.y - de.y);
  const arco = Math.sin(Math.PI * limitar(andamento)) * distancia * ALTURA_DO_ARCO;

  const x = interpolar(de.x, para.x, andamento);
  const y = interpolar(de.y, para.y, andamento) - arco - subida * voo.origem.altura * LEVANTADA;

  /* Como: a apresentação cresce e endireita antes de a travessia começar. */
  const apresentacao =
    decorrido < MARCOS.levanta
      ? 0
      : suaveNoFim(limitar((decorrido - MARCOS.levanta) / (MARCOS.apresenta - MARCOS.levanta)));

  /*
   * O destaque do beat de foco.
   *
   * A carta cresce 7 % **sem sair do lugar**. É pouco de propósito: o que esse
   * beat comunica não é movimento, é atenção — "olhe para esta carta, o que
   * vem a seguir parte daqui". Sem ele o voo começava sem aviso, e o jogador
   * descobria qual carta tinha sido jogada só quando ela já estava no campo.
   */
  const destaque = interpolar(1, AMPLIACAO_DO_FOCO, suaveNoFim(limitar(decorrido / MARCOS.foco)));

  const escalaApresentada = interpolar(destaque, AMPLIACAO_DA_APRESENTACAO, apresentacao);
  const escala = interpolar(escalaApresentada, escalaDoDestino, suaveNoComeco(limitar(andamento)));

  const giro = interpolar(
    interpolar(voo.giroDeOrigem, 0, apresentacao),
    voo.giroDeDestino,
    limitar(andamento),
  );

  /*
   * A inclinação vira no fim, e é contada pelo **relógio**, não pelo percurso.
   *
   * A curva da travessia é adiantada de propósito, então a carta já percorreu
   * quase tudo quando ainda falta um terço do tempo. Amarrar o giro ao
   * percurso fazia a carta deitar quase de imediato e esconder a arte durante
   * toda a viagem — que é justamente o momento em que o jogador quer ver o
   * que foi jogado. Pelo relógio, ela atravessa de frente e deita enquanto
   * freia e encaixa.
   */
  const deitando = limitar((decorrido - MARCOS_DO_GIRO) / (MARCOS.assenta - MARCOS_DO_GIRO));
  const inclinacao = voo.inclinacaoDoCampo * suaveNoFim(deitando);

  const elevacao = Math.max(
    subida * 0.35,
    Math.sin(Math.PI * limitar(andamento)) * 0.85 + (andamento > 0 && andamento < 1 ? 0.15 : 0),
  );

  return {
    x,
    y,
    escala,
    giro,
    inclinacao,
    elevacao: limitar(elevacao),
    fase,
    progresso: limitar(decorrido / MARCOS.assenta),
    terminou: false,
  };
};

/** As fases pelas quais o voo passa, amostrado a cada quadro. */
export const fasesDoVoo = (voo: DescricaoDoVoo, passoMs = 16): readonly FaseDoVoo[] => {
  const vistas: FaseDoVoo[] = [];
  const ritmo = voo.ritmo === undefined || voo.ritmo <= 0 ? 1 : voo.ritmo;
  for (let t = 0; t <= MARCOS.assenta * ritmo + passoMs; t += passoMs) {
    const fase = estadoDoVoo(voo, voo.inicioMs + t).fase;
    if (vistas.at(-1) !== fase) vistas.push(fase);
  }
  return vistas;
};

/* ---------------------------------------------------------------------------
 * O deslize: o movimento curto de uma casa para a vizinha.
 * ------------------------------------------------------------------------- */

/**
 * O avanço do cooldown, e a volta para a mão.
 *
 * Mais curto que o voo e sem arco: é uma peça deslizando dentro de uma gaveta,
 * não uma carta sendo lançada. Ela levanta um fio para sair do compartimento,
 * anda, e assenta — e é esse levantar que comunica que ela **saiu** de um
 * lugar, em vez de ter sido redesenhada em outro.
 */
export const DURACAO_DO_DESLIZE_MS = 420;

export interface DescricaoDoDeslize {
  readonly origem: Caixa;
  readonly destino: Caixa;
  readonly inicioMs: number;
  readonly ritmo?: number;
}

export interface PoseDoDeslize {
  readonly x: number;
  readonly y: number;
  readonly escala: number;
  readonly elevacao: number;
  readonly progresso: number;
  readonly terminou: boolean;
}

export const estadoDoDeslize = (deslize: DescricaoDoDeslize, agoraMs: number): PoseDoDeslize => {
  const ritmo = deslize.ritmo === undefined || deslize.ritmo <= 0 ? 1 : deslize.ritmo;
  const decorrido = limitar((agoraMs - deslize.inicioMs) / ritmo / DURACAO_DO_DESLIZE_MS);
  const de = centro(deslize.origem);
  const para = centro(deslize.destino);
  const andamento = curvaDaTravessia(decorrido);
  const escalaDoDestino =
    deslize.origem.largura > 0 ? deslize.destino.largura / deslize.origem.largura : 1;
  return {
    x: interpolar(de.x, para.x, andamento),
    y: interpolar(de.y, para.y, andamento),
    escala: interpolar(1, escalaDoDestino, andamento),
    // Sobe no começo, desce no fim: sair do compartimento e entrar no outro.
    elevacao: Math.sin(Math.PI * decorrido) * 0.5,
    progresso: decorrido,
    terminou: decorrido >= 1,
  };
};
