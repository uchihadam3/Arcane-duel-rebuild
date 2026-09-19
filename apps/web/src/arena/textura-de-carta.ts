import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import type { Texture } from 'three';

import type { CartaVisivel } from '../partida/apresentacao.js';
import { MOLDURA_DO_TIPO, NOME_DO_TIPO } from '../partida/apresentacao.js';
import { desenharSigilo, sigiloDaCarta } from './sigilo.js';

/*
 * A carta como textura.
 *
 * A carta na arena é um objeto do mundo: recebe luz, projeta sombra e gira.
 * Para isso ela precisa de uma textura — e a textura é montada aqui, com a
 * moldura aprovada por baixo e **todo** o resto desenhado por código.
 *
 * Nada é assado na imagem: nome, custo, tipo, Dano, Impacto e cooldown são
 * texto, como no campo em DOM. A regra do ASSET_CATALOG vale igual dos dois
 * lados; o que muda é só quem desenha.
 *
 * As regiões abaixo são as mesmas percentagens que `jogo.css` usa. Elas vêm da
 * moldura aprovada, e ter duas cópias divergindo seria o começo de duas cartas
 * diferentes — por isso os números estão nomeados, num lugar só.
 */

/*
 * Uma resolução por uso, e não uma para tudo.
 *
 * A primeira entrega tinha um número só — 512 × 717 — servindo à mão, ao
 * campo e à carta em foco. A moldura aprovada tem 1060 × 1484: era 48 % da
 * resolução linear e **23 % da área**, e ainda por cima ampliada na hora de
 * inspecionar. Nome e texto de regra ficavam borrados justamente quando o
 * jogador precisava lê-los.
 *
 * Agora a textura é escolhida pelo tamanho que a carta tem na tela. Nenhum dos
 * níveis amplia a arte: `foco` é exatamente o tamanho do arquivo aprovado.
 * Todos mantêm a proporção mestre 5:7 do catálogo.
 */
export const NIVEIS_DE_TEXTURA = {
  /** Carta assentada numa laje: pequena, e sempre acompanhada do HUD. */
  campo: { largura: 512, altura: 717 },
  /** A mão é a maior coisa da tela, e é onde se lê antes de decidir. */
  mao: { largura: 768, altura: 1075 },
  /** Foco e inspeção: a moldura aprovada, em tamanho nativo. */
  foco: { largura: 1060, altura: 1484 },
} as const;

export type NivelDeTextura = keyof typeof NIVEIS_DE_TEXTURA;

/** O nível de campo, que é o menor. Serve de padrão a quem não escolhe. */
export const TAMANHO_DA_TEXTURA = NIVEIS_DE_TEXTURA.campo;

const REGIOES = {
  arte: { esquerda: 0.13, direita: 0.87, topo: 0.18, base: 0.55 },
  custo: { x: 0.055, y: 0.045, largura: 0.21, altura: 0.15 },
  cooldown: { x: 0.735, y: 0.045, largura: 0.21, altura: 0.15 },
  nome: { esquerda: 0.25, direita: 0.75, y: 0.07, altura: 0.1 },
  tipo: { esquerda: 0.25, direita: 0.75, y: 0.56, altura: 0.07 },
  texto: { esquerda: 0.14, direita: 0.86, y: 0.645, altura: 0.18 },
  dano: { x: 0.09, y: 0.845, largura: 0.29, altura: 0.09 },
  impacto: { direita: 0.91, y: 0.845, largura: 0.29, altura: 0.09 },
} as const;

const FAMILIA =
  '"Segoe UI", "Noto Sans", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

export interface ContextoDeTextura {
  /** Resolve o id semântico de um asset para uma URL carregável. */
  readonly url: (assetId: string) => string;
}

const linhasQueCabem = (
  contexto: CanvasRenderingContext2D,
  texto: string,
  largura: number,
  maximo: number,
): readonly string[] => {
  const palavras = texto.split(/\s+/).filter((palavra) => palavra !== '');
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of palavras) {
    const tentativa = atual === '' ? palavra : `${atual} ${palavra}`;
    if (contexto.measureText(tentativa).width <= largura || atual === '') {
      atual = tentativa;
    } else {
      linhas.push(atual);
      atual = palavra;
      if (linhas.length === maximo) return linhas;
    }
  }
  if (atual !== '' && linhas.length < maximo) linhas.push(atual);
  return linhas;
};

const escreverCentrado = (
  contexto: CanvasRenderingContext2D,
  linhas: readonly string[],
  centroX: number,
  topo: number,
  alturaDaLinha: number,
): void => {
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';
  linhas.forEach((linha, indice) => {
    contexto.fillText(linha, centroX, topo + alturaDaLinha * (indice + 0.5));
  });
};

const desenharDisco = (
  contexto: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  largura: number,
  altura: number,
  cor: string,
): void => {
  contexto.save();
  contexto.font = `800 ${String(Math.round(altura * 0.56))}px ${FAMILIA}`;
  contexto.fillStyle = 'rgba(0, 0, 0, 0.55)';
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';
  contexto.fillText(texto, x + largura / 2, y + altura / 2 + 2);
  contexto.fillStyle = cor;
  contexto.fillText(texto, x + largura / 2, y + altura / 2);
  contexto.restore();
};

export interface OpcoesDaCarta {
  /** Mostra o texto completo de regras. A mão não comporta, a inspeção sim. */
  readonly comTexto?: boolean;
  /** Fase da animação do sigilo, 0 quando o movimento está reduzido. */
  readonly fase?: number;
}

/**
 * Desenha a carta inteira no canvas recebido.
 *
 * A moldura é desenhada primeiro e só quando já carregou: enquanto o PNG não
 * chega, o fundo fica neutro e o texto continua legível. Uma carta sem moldura
 * é feia; uma carta sem nome é injogável.
 */
export const desenharCarta = (
  contexto: CanvasRenderingContext2D,
  carta: CartaVisivel,
  moldura: CanvasImageSource | null,
  opcoes: OpcoesDaCarta = {},
): void => {
  /*
   * O tamanho vem do canvas, não de uma constante.
   *
   * Todas as regiões abaixo são fração, e todo corpo de letra é proporção da
   * altura — então a mesma função desenha os três níveis sem um único número
   * duplicado. É isso que garante que a carta da mão e a carta em foco sejam a
   * mesma carta, e não duas artes que podem divergir.
   */
  const largura = contexto.canvas.width;
  const altura = contexto.canvas.height;
  contexto.clearRect(0, 0, largura, altura);

  /* A janela de arte vai por baixo da moldura, que tem recorte próprio. */
  const arte = {
    x: REGIOES.arte.esquerda * largura,
    y: REGIOES.arte.topo * altura,
    largura: (REGIOES.arte.direita - REGIOES.arte.esquerda) * largura,
    altura: (REGIOES.arte.base - REGIOES.arte.topo) * altura,
  };
  desenharSigilo(
    contexto,
    sigiloDaCarta(String(carta.id), carta.tipo, carta.classe),
    arte,
    opcoes.fase ?? 0,
  );

  if (moldura !== null) {
    contexto.drawImage(moldura, 0, 0, largura, altura);
  }

  if (carta.custo !== null) {
    const rotulo =
      carta.custo.recurso === null ? String(carta.custo.valor) : `${String(carta.custo.valor)}+`;
    desenharDisco(
      contexto,
      rotulo,
      REGIOES.custo.x * largura,
      REGIOES.custo.y * altura,
      REGIOES.custo.largura * largura,
      REGIOES.custo.altura * altura,
      '#ffe9b0',
    );
  }

  if (carta.cooldown !== null) {
    desenharDisco(
      contexto,
      String(carta.cooldown),
      REGIOES.cooldown.x * largura,
      REGIOES.cooldown.y * altura,
      REGIOES.cooldown.largura * largura,
      REGIOES.cooldown.altura * altura,
      '#ffd9a0',
    );
  }

  /* Nome: duas linhas no máximo, encolhendo antes de estourar a faixa. */
  const larguraDoNome = (REGIOES.nome.direita - REGIOES.nome.esquerda) * largura;
  contexto.fillStyle = '#2a1a12';
  let corpoDoNome = Math.round(altura * 0.056);
  const menorCorpo = Math.round(altura * 0.026);
  contexto.font = `800 ${String(corpoDoNome)}px ${FAMILIA}`;
  let linhasDoNome = linhasQueCabem(contexto, carta.nome, larguraDoNome, 2);
  while (linhasDoNome.length > 2 && corpoDoNome > menorCorpo) {
    corpoDoNome -= Math.max(1, Math.round(altura * 0.003));
    contexto.font = `800 ${String(corpoDoNome)}px ${FAMILIA}`;
    linhasDoNome = linhasQueCabem(contexto, carta.nome, larguraDoNome, 2);
  }
  escreverCentrado(
    contexto,
    linhasDoNome,
    ((REGIOES.nome.esquerda + REGIOES.nome.direita) / 2) * largura,
    REGIOES.nome.y * altura,
    (REGIOES.nome.altura * altura) / Math.max(1, linhasDoNome.length),
  );

  contexto.fillStyle = '#ffe6d8';
  contexto.font = `700 ${String(Math.round(altura * 0.046))}px ${FAMILIA}`;
  escreverCentrado(
    contexto,
    [NOME_DO_TIPO[carta.tipo].toUpperCase()],
    ((REGIOES.tipo.esquerda + REGIOES.tipo.direita) / 2) * largura,
    REGIOES.tipo.y * altura,
    REGIOES.tipo.altura * altura,
  );

  if (opcoes.comTexto === true && carta.texto !== '') {
    contexto.fillStyle = '#2a1a12';
    contexto.font = `${String(Math.round(altura * 0.036))}px ${FAMILIA}`;
    const larguraDoTexto = (REGIOES.texto.direita - REGIOES.texto.esquerda) * largura;
    const linhas = linhasQueCabem(contexto, carta.texto, larguraDoTexto, 5);
    escreverCentrado(
      contexto,
      linhas,
      ((REGIOES.texto.esquerda + REGIOES.texto.direita) / 2) * largura,
      REGIOES.texto.y * altura,
      Math.round(altura * 0.044),
    );
  }

  if (carta.dano !== null) {
    desenharDisco(
      contexto,
      `${String(carta.dano)} D`,
      REGIOES.dano.x * largura,
      REGIOES.dano.y * altura,
      REGIOES.dano.largura * largura,
      REGIOES.dano.altura * altura,
      '#ffb2a6',
    );
  }

  if (carta.impacto !== null) {
    desenharDisco(
      contexto,
      `${String(carta.impacto)} I`,
      (REGIOES.impacto.direita - REGIOES.impacto.largura) * largura,
      REGIOES.impacto.y * altura,
      REGIOES.impacto.largura * largura,
      REGIOES.impacto.altura * altura,
      '#cbb6ff',
    );
  }
};

/** Desenha o verso aprovado: nenhuma informação da carta chega a esta função. */
export const desenharVerso = (
  contexto: CanvasRenderingContext2D,
  verso: CanvasImageSource | null,
): void => {
  const largura = contexto.canvas.width;
  const altura = contexto.canvas.height;
  contexto.clearRect(0, 0, largura, altura);
  if (verso === null) {
    contexto.fillStyle = '#1b1712';
    contexto.fillRect(0, 0, largura, altura);
    return;
  }
  contexto.drawImage(verso, 0, 0, largura, altura);
};

/**
 * O caché de texturas.
 *
 * Uma partida do vertical slice tem trinta cartas distintas. Redesenhar a
 * textura a cada quadro seria desperdício puro; redesenhá-la quando o conteúdo
 * muda é o suficiente, porque o conteúdo impresso de uma carta não muda.
 */
export interface FabricaDeTexturas {
  /** `null` quando não há canvas — fora do navegador, e só lá. */
  readonly daCarta: (
    carta: CartaVisivel,
    nivel: NivelDeTextura,
    opcoes?: OpcoesDaCarta,
  ) => Texture | null;
  readonly doVerso: (nivel: NivelDeTextura) => Texture | null;
  readonly aoCarregarMoldura: (aviso: () => void) => void;
  readonly descartar: () => void;
}

const criarCanvas = (nivel: NivelDeTextura): HTMLCanvasElement | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = NIVEIS_DE_TEXTURA[nivel].largura;
  canvas.height = NIVEIS_DE_TEXTURA[nivel].altura;
  return canvas;
};

export interface OpcoesDaFabrica {
  /** A anisotropia real do aparelho. Carta na mão é vista bem de lado. */
  readonly anisotropiaMaxima: number;
}

export const criarFabricaDeTexturas = (
  contexto: ContextoDeTextura,
  opcoesDaFabrica: OpcoesDaFabrica = { anisotropiaMaxima: 4 },
): FabricaDeTexturas => {
  const molduras = new Map<string, HTMLImageElement>();
  const texturas = new Map<string, CanvasTexture>();
  const avisos = new Set<() => void>();

  const molduraDe = (assetId: string): HTMLImageElement | null => {
    if (typeof Image === 'undefined') return null;
    const existente = molduras.get(assetId);
    if (existente !== undefined) return existente.complete ? existente : null;

    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => {
      // A textura de quem já foi desenhada sem moldura precisa ser refeita.
      for (const aviso of avisos) aviso();
    };
    imagem.src = contexto.url(assetId);
    molduras.set(assetId, imagem);
    return null;
  };

  const desenhar = (
    chave: string,
    nivel: NivelDeTextura,
    pintar: (ctx: CanvasRenderingContext2D) => void,
  ): Texture | null => {
    const existente = texturas.get(chave);
    if (existente !== undefined) return existente;

    const canvas = criarCanvas(nivel);
    const ctx = canvas?.getContext('2d') ?? null;
    // Sem canvas não há textura, e quem chama desenha pela camada em DOM. A
    // cena nunca é montada nesse caso, então isto é defesa, não caminho.
    if (canvas === null || ctx === null) return null;
    pintar(ctx);
    const textura = new CanvasTexture(canvas);
    textura.colorSpace = SRGBColorSpace;
    /*
     * Mipmap e anisotropia, e não filtragem linear crua.
     *
     * Uma carta na mão fica inclinada 66° em relação à câmera: sem mipmap ela
     * cintila a cada quadro, e sem anisotropia o mipmap escolhe o nível pelo
     * eixo mais comprimido e apaga o nome. Os dois juntos são o que torna o
     * texto legível numa carta deitada.
     */
    textura.generateMipmaps = true;
    textura.minFilter = LinearMipmapLinearFilter;
    textura.magFilter = LinearFilter;
    textura.anisotropy = opcoesDaFabrica.anisotropiaMaxima;
    texturas.set(chave, textura);
    return textura;
  };

  return {
    daCarta: (carta, nivel, opcoes = {}) => {
      const assetId = MOLDURA_DO_TIPO[carta.tipo];
      const moldura = molduraDe(assetId);
      const chave = `${String(carta.id)}:${nivel}:${opcoes.comTexto === true ? 'texto' : 'curto'}:${
        moldura === null ? 'sem-moldura' : 'com-moldura'
      }`;
      return desenhar(chave, nivel, (ctx) => {
        desenharCarta(ctx, carta, moldura, opcoes);
      });
    },

    doVerso: (nivel) => {
      const verso = molduraDe('card-back');
      return desenhar(`verso:${nivel}:${verso === null ? 'sem' : 'com'}`, nivel, (ctx) => {
        desenharVerso(ctx, verso);
      });
    },

    aoCarregarMoldura: (aviso) => {
      avisos.add(aviso);
    },

    descartar: () => {
      for (const textura of texturas.values()) textura.dispose();
      texturas.clear();
      molduras.clear();
      avisos.clear();
    },
  };
};
