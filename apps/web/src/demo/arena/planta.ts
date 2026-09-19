import type { IndiceDeAcao, ZonaDeCooldown } from '@arcane-duel/shared-types';

/*
 * A planta da arena V2.
 *
 * Duas decisões de arquitetura moram aqui, e as duas vêm de erro medido na
 * Etapa 6.
 *
 * **Primeira: a arena é SVG sob transformação 3D do CSS, e não WebGL.**
 *
 * A Etapa 6 foi reprovada por nitidez e por deformação. O caminho de lá —
 * desenhar a carta num canvas, virar textura, mapear num plano — obriga a
 * escolher uma resolução de textura, e qualquer escolha está errada em algum
 * aparelho. Aqui não existe textura: a carta é SVG, o tabuleiro é SVG, e quem
 * rasteriza é o navegador, no tamanho exato em que a coisa está na tela e na
 * densidade real do aparelho. Não há número de resolução a calibrar porque não
 * há resolução.
 *
 * **Segunda: as peças moram dentro do tabuleiro transformado.**
 *
 * A Etapa 6 projetava coordenadas de mundo para a tela por conta própria, e foi
 * daí que veio o desencontro entre o que o WebGL desenhava e onde o dedo
 * tocava. Aqui a carta é filha do elemento que recebeu a transformação: ela
 * herda a perspectiva do pai, pelo navegador. O alinhamento deixa de ser uma
 * conta que pode estar errada e passa a ser uma propriedade da árvore.
 *
 * Tudo abaixo está em **unidades de tabuleiro** — o sistema do SVG, 1300 × 900.
 * Y cresce para baixo, e para baixo é a direção do jogador humano. Isto é
 * literal e é o coração da perspectiva fixa: não existe função que espelhe o
 * campo, porque não existe o conceito de "o outro lado da mesa".
 */

/*
 * O tabuleiro é largo e raso.
 *
 * A primeira prova saiu com 1300 × 900 e um ângulo de 54°: o campo lia como
 * parede, e sobrava pedra vazia nos dois lados da fileira de choque. Mais largo
 * e mais baixo, com as colunas de Ação mais abertas, ele volta a ler como mesa.
 */
export const TABULEIRO = { largura: 1240, altura: 820 } as const;

/** A linha que separa os dois lados. A rosa dos ventos mora nela. */
export const LINHA_DE_CENTRO = TABULEIRO.altura / 2;

/**
 * Qual metade do tabuleiro.
 *
 * `jogador` é sempre a metade de baixo e `maquina` sempre a de cima, em toda
 * partida, do começo ao fim. Nenhum código troca as duas.
 */
export type Metade = 'jogador' | 'maquina';

export interface Retangulo {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

export const centroDe = (caixa: Retangulo): { readonly x: number; readonly y: number } => ({
  x: caixa.x + caixa.largura / 2,
  y: caixa.y + caixa.altura / 2,
});

/*
 * As medidas das peças.
 *
 * A carta guarda a proporção 5:7 do catálogo em qualquer lugar do campo; o que
 * muda é a escala. O pedestal de Ação é a maior peça da arena de propósito: os
 * três espaços de Ação são o ponto de choque, e o olho precisa achá-los antes
 * de qualquer outra coisa.
 */
export const CARTA = { largura: 120, altura: 168 } as const;
export const PEDESTAL_DE_ACAO = { largura: 150, altura: 196 } as const;
/**
 * A quarta Ação é menor porque é condicional.
 *
 * Ela precisa existir no campo sem competir com o trio: do mesmo tamanho, as
 * quatro colunas leem como quatro Ações iguais e o jogador perde a referência
 * que decorou.
 */
export const PEDESTAL_DE_ACAO_EXTRA = { largura: 120, altura: 158 } as const;
/**
 * A Resposta é claramente subordinada ao Ataque que ela apara.
 *
 * Na primeira prova ela tinha quase o tamanho do pedestal de Ação, e o centro
 * do campo virou oito retângulos parecidos. Menor e encostada, ela lê como
 * bandeja acoplada — que é o que ela é.
 */
export const PEDESTAL_DE_RESPOSTA = { largura: 96, altura: 112 } as const;

/**
 * O quanto a Resposta invade o pedestal que ela responde.
 *
 * Ela **encosta** no Ataque, cobrindo a quina de baixo dele — que é o que um
 * aparo parece. Posta abaixo, sem tocar, ela vira uma segunda fileira de
 * pedestais e o centro do campo passa a ter oito retângulos parecidos, que foi
 * o erro da primeira prova.
 */
export const INVASAO_DA_RESPOSTA = 48;
/** E o quanto ela sai para o lado, para não cobrir o nome da carta atacante. */
export const DESVIO_DA_RESPOSTA = 38;
export const ENCAIXE_DE_PASSIVA = { largura: 62, altura: 84 } as const;
export const PEDESTAL_DE_CLASSE = { largura: 82, altura: 112 } as const;
export const SLOT_DE_ULTIMATE = { largura: 100, altura: 132 } as const;
export const GAVETA_DE_COOLDOWN = { largura: 86, altura: 116 } as const;

/*
 * As alturas de cada fileira, medidas do topo.
 *
 * A leitura de cima para baixo é a da tarefa: apoio da máquina, choque no
 * meio, apoio do jogador. As fileiras de Resposta ficam **entre** as de Ação e
 * a linha de centro, encostadas no pedestal que elas respondem — é isso que
 * faz o par Ação/Resposta ler como uma peça só.
 */
/*
 * As alturas, medidas e conferidas.
 *
 * A primeira prova tinha as fileiras se atravessando: a Resposta do jogador
 * começava em 284 e o Ataque da máquina só terminava em 384, então o rótulo R1
 * aparecia dentro do pedestal de Ação. Os números abaixo têm as sobreposições
 * **escolhidas** — 48 unidades entre a Resposta e o Ataque que ela apara — e
 * nenhuma outra.
 *
 *   máquina   apoio     20 ..136
 *             Ação     152 ..348
 *   jogador   Resposta 300 ..412     invade o Ataque da máquina
 *   ---------------- linha de centro em 410 ----------------
 *   máquina   Resposta 408 ..520     invade o Ataque do jogador
 *   jogador   Ação     468 ..664
 *             apoio    680 ..796
 */
const FILEIRA = {
  apoioDaMaquina: 20,
  acaoDaMaquina: 152,
  respostaDaMaquina: 408,
  respostaDoJogador: 300,
  acaoDoJogador: 468,
  apoioDoJogador: 680,
} as const;

/** As três colunas de Ação. O centro do campo, em X. */
const COLUNAS_DE_ACAO: readonly number[] = [
  TABULEIRO.largura / 2 - 232,
  TABULEIRO.largura / 2,
  TABULEIRO.largura / 2 + 232,
];

/** A quarta coluna, fora do trio e à direita: ela anuncia que é exceção. */
const COLUNA_EXTRA = TABULEIRO.largura / 2 + 452;

const caixaCentrada = (
  centroX: number,
  topo: number,
  tamanho: { readonly largura: number; readonly altura: number },
): Retangulo => ({
  x: centroX - tamanho.largura / 2,
  y: topo,
  largura: tamanho.largura,
  altura: tamanho.altura,
});

/** O pedestal de Ação de índice `indice`, na metade pedida. */
export const ehAcaoExtra = (indice: IndiceDeAcao): boolean => indice >= 3;

export const pedestalDeAcao = (metade: Metade, indice: IndiceDeAcao): Retangulo => {
  /*
   * A quarta Ação existe, e fica fora do trio.
   *
   * Ela é condicional: só uma carta a libera. Encaixá-la no meio das três
   * desalinharia as colunas que o jogador decorou, então ela mora à direita,
   * menor, anunciando por posição e por tamanho que é exceção.
   */
  const extra = ehAcaoExtra(indice);
  const centroX = extra ? COLUNA_EXTRA : (COLUNAS_DE_ACAO[indice] ?? TABULEIRO.largura / 2);
  const tamanho = extra ? PEDESTAL_DE_ACAO_EXTRA : PEDESTAL_DE_ACAO;
  const base = metade === 'maquina' ? FILEIRA.acaoDaMaquina : FILEIRA.acaoDoJogador;
  // A extra desce um pouco: alinhada pelo topo ela pareceria só um recorte.
  const topo = base + (extra ? (PEDESTAL_DE_ACAO.altura - tamanho.altura) / 2 : 0);
  return caixaCentrada(centroX, topo, tamanho);
};

/**
 * O espaço de Resposta acoplado a um pedestal de Ação.
 *
 * Ele pertence ao **defensor**: a Resposta de quem apanha entra aqui, colada
 * ao Ataque que ela apara. Por isso a Resposta de um Ataque da máquina fica na
 * metade do jogador, e vice-versa.
 */
export const pedestalDeResposta = (metadeDoAtacante: Metade, indice: IndiceDeAcao): Retangulo => {
  const base = ehAcaoExtra(indice)
    ? COLUNA_EXTRA
    : (COLUNAS_DE_ACAO[indice] ?? TABULEIRO.largura / 2);
  const topo =
    metadeDoAtacante === 'maquina' ? FILEIRA.respostaDoJogador : FILEIRA.respostaDaMaquina;
  return caixaCentrada(base + DESVIO_DA_RESPOSTA, topo, PEDESTAL_DE_RESPOSTA);
};

/** Os quatro encaixes de Passiva, à esquerda da fileira de apoio. */
export const encaixeDePassiva = (metade: Metade, indice: number): Retangulo => {
  const topo = metade === 'maquina' ? FILEIRA.apoioDaMaquina : FILEIRA.apoioDoJogador;
  return caixaCentrada(126 + indice * 70, topo + 20, ENCAIXE_DE_PASSIVA);
};

/** Os dois pedestais de Carta de Classe, ao centro da fileira de apoio. */
export const pedestalDeClasse = (metade: Metade, indice: number): Retangulo => {
  const topo = metade === 'maquina' ? FILEIRA.apoioDaMaquina : FILEIRA.apoioDoJogador;
  return caixaCentrada(TABULEIRO.largura / 2 - 96 + indice * 98, topo + 4, PEDESTAL_DE_CLASSE);
};

/** O slot de Ultimate, logo à direita das Cartas de Classe. */
export const slotDeUltimate = (metade: Metade): Retangulo => {
  const topo = metade === 'maquina' ? FILEIRA.apoioDaMaquina : FILEIRA.apoioDoJogador;
  return caixaCentrada(TABULEIRO.largura / 2 + 78, topo - 6, SLOT_DE_ULTIMATE);
};

/** O Personagem, à esquerda das Cartas de Classe. */
export const pedestalDePersonagem = (metade: Metade): Retangulo => {
  const topo = metade === 'maquina' ? FILEIRA.apoioDaMaquina : FILEIRA.apoioDoJogador;
  return caixaCentrada(TABULEIRO.largura / 2 - 232, topo + 4, PEDESTAL_DE_CLASSE);
};

export const ZONAS_DE_COOLDOWN: readonly ZonaDeCooldown[] = [1, 2, 3];

/**
 * As três gavetas de cooldown, à direita da fileira de apoio.
 *
 * Gavetas, e não marcadores: a carta que resolve **entra** numa delas e, no
 * começo do turno, a de CD1 sai e volta para a mão enquanto as outras deslizam
 * uma casa. O jogador precisa entender isso sem ler texto nenhum, e para isso
 * os três compartimentos precisam ser objetos com lugar fixo.
 */
export const gavetaDeCooldown = (metade: Metade, zona: ZonaDeCooldown): Retangulo => {
  const topo = metade === 'maquina' ? FILEIRA.apoioDaMaquina : FILEIRA.apoioDoJogador;
  return caixaCentrada(TABULEIRO.largura - 322 + (zona - 1) * 98, topo + 2, GAVETA_DE_COOLDOWN);
};

/** Onde a pilha de cartas removidas descansa. Informação, sem toque. */
export const pilhaDeRemovidas = (metade: Metade): Retangulo => {
  const topo = metade === 'maquina' ? FILEIRA.apoioDaMaquina : FILEIRA.apoioDoJogador;
  return caixaCentrada(TABULEIRO.largura - 82, topo + 6, GAVETA_DE_COOLDOWN);
};

/*
 * O leque da mão.
 *
 * A mão **não** é uma zona do tabuleiro: ela está na mão de quem joga, e não
 * sobre a mesa. Por isso ela vive fora da transformação 3D, em coordenadas de
 * tela — é o que a faz ficar de frente para o jogador enquanto o campo está
 * inclinado, exatamente como na referência.
 */
export interface PosicaoNoLeque {
  /** Deslocamento horizontal a partir do centro, em fração da largura útil. */
  readonly deslocamento: number;
  /** Quanto esta carta desce por estar longe do centro. */
  readonly queda: number;
  readonly giro: number;
  readonly ordem: number;
}

export const LEQUE = {
  /** Ângulo da carta mais afastada do centro, em graus. Discreto por decisão. */
  giroMaximo: 11,
  /** Quanto a carta da ponta desce, em fração da altura dela. */
  quedaMaxima: 0.13,
} as const;

export const posicaoNoLeque = (indice: number, total: number): PosicaoNoLeque => {
  if (total <= 1) return { deslocamento: 0, queda: 0, giro: 0, ordem: indice };
  // −1 na ponta esquerda, +1 na direita.
  const desvio = (indice / (total - 1)) * 2 - 1;
  return {
    deslocamento: desvio,
    queda: Math.abs(desvio) ** 1.7 * LEQUE.quedaMaxima,
    giro: desvio * LEQUE.giroMaximo,
    ordem: indice,
  };
};

/*
 * A câmera.
 *
 * Fixa, e literalmente: é uma transformação CSS constante. Não existe função
 * que a mova, não existe estado que a gire, e o turno da máquina usa
 * exatamente o mesmo valor que o turno do jogador.
 *
 * A inclinação é o que decide quanto a profundidade encolhe. 54° deixa a
 * fileira do fundo curta o bastante para caber num telefone deitado e longa o
 * bastante para a carta lá continuar legível.
 */
export const CAMERA = {
  /*
   * 46°, e não 54°.
   *
   * A primeira prova, mais inclinada, lia como parede: a fileira do fundo
   * encolhia demais e a arena perdia a leitura de mesa. 46° mantém a
   * profundidade e devolve a superfície.
   */
  inclinacaoEmGraus: 46,
  /** Distância da perspectiva, em pixels de tela. Maior = lente mais longa. */
  perspectiva: 2400,
  /** Onde o ponto de fuga fica na altura da tela. */
  origemVertical: 0.42,
} as const;

/**
 * O enquadramento do tabuleiro numa área de tela.
 *
 * A primeira versão desta conta usava só o cosseno da inclinação, e errava: em
 * perspectiva a borda da frente vem **na direção de quem olha** e fica maior
 * que o cálculo ortográfico previa. O resultado foi o campo estourando pela
 * base e pelos lados na primeira prova.
 *
 * Agora a conta é a da própria transformação CSS, na mesma ordem em que o
 * navegador a aplica — escala, rotação, divisão por perspectiva:
 *
 *   z  = y · sen θ                    quanto o ponto avança na direção do olho
 *   f  = p / (p − z)                  o aumento que a perspectiva dá a ele
 *   x' = x · f      y' = y · cos θ · f
 *
 * Com isso a borda da frente e a do fundo são medidas separadamente, e o
 * deslocamento vertical recentraliza o que sobrou — sem ele o campo fica
 * pendurado para baixo, porque a metade da frente projeta mais alta que a do
 * fundo.
 */
export interface Enquadramento {
  readonly escala: number;
  /** Quanto subir o tabuleiro, em pixels de tela, para centrar o projetado. */
  readonly deslocamentoY: number;
}

/**
 * O alcance vertical que precisa caber na tela, em coordenadas locais.
 *
 * Não é o tabuleiro: é o tabuleiro **mais as duas mãos**. A mão da máquina
 * paira acima da borda do fundo e a do jogador abaixo da borda da frente, e
 * enquadrar só o campo deixava as duas fora da tela — a do jogador inteira,
 * que é onde ele lê o que pode jogar.
 *
 * A base para em 540 de propósito: o pé das cartas da mão fica **fora** do
 * quadro. É assim na referência, e é o que permite que elas sejam grandes o
 * bastante para o nome ser legível num telefone.
 */
export const ALCANCE_VISIVEL = { topo: -556, base: 520 } as const;

const projetar = (
  yLocal: number,
  escala: number,
): { readonly fator: number; readonly y: number } => {
  const radianos = (CAMERA.inclinacaoEmGraus * Math.PI) / 180;
  const yEscalado = yLocal * escala;
  const z = yEscalado * Math.sin(radianos);
  const fator = CAMERA.perspectiva / (CAMERA.perspectiva - z);
  return { fator, y: yEscalado * Math.cos(radianos) * fator };
};

/**
 * O enquadramento do tabuleiro numa área de tela.
 *
 * A primeira versão desta conta usava só o cosseno da inclinação, e errava: em
 * perspectiva a borda da frente vem **na direção de quem olha** e fica maior
 * que o cálculo ortográfico previa. O resultado foi o campo estourando pela
 * base e pelos lados.
 *
 * Agora a conta é a da própria transformação CSS, na mesma ordem em que o
 * navegador a aplica — escala, rotação, divisão por perspectiva:
 *
 *   z  = y · sen θ                    quanto o ponto avança na direção do olho
 *   f  = p / (p − z)                  o aumento que a perspectiva dá a ele
 *   x' = x · f      y' = y · cos θ · f
 *
 * A largura é medida no ponto mais próximo, que é o mais largo. O deslocamento
 * recentraliza o resultado: sem ele o campo fica pendurado para baixo, porque a
 * metade da frente projeta mais alta que a do fundo.
 */
export const enquadrarTabuleiro = (
  largura: number,
  altura: number,
  alcance: { readonly topo: number; readonly base: number } = ALCANCE_VISIVEL,
): Enquadramento => {
  if (largura <= 0 || altura <= 0) return { escala: 1, deslocamentoY: 0 };
  const meiaLargura = TABULEIRO.largura / 2;

  /*
   * A escala sai de uma busca curta, e não de uma fórmula fechada.
   *
   * O fator de perspectiva depende da escala, que é o que se está procurando:
   * a relação não se inverte de forma limpa. Multiplicar a escala pela razão
   * entre o que se quer e o que se mediu é uma contração, e uma dúzia de
   * passadas chega a menos de um milésimo.
   */
  let escala = Math.min(largura / TABULEIRO.largura, altura / (alcance.base - alcance.topo));
  for (let passo = 0; passo < 16; passo += 1) {
    const frente = projetar(alcance.base, escala);
    const fundo = projetar(alcance.topo, escala);
    const larguraProjetada = 2 * meiaLargura * escala * frente.fator;
    const alturaProjetada = frente.y - fundo.y;
    if (larguraProjetada <= 0 || alturaProjetada <= 0) break;
    const folga = Math.min(largura / larguraProjetada, altura / alturaProjetada);
    if (Math.abs(folga - 1) < 0.001) break;
    escala *= folga;
  }

  const frente = projetar(alcance.base, escala);
  const fundo = projetar(alcance.topo, escala);
  // O meio do que aparece na tela, que não é o meio do tabuleiro.
  return { escala, deslocamentoY: -(frente.y + fundo.y) / 2 };
};

/** A escala sozinha, para quem só precisa dela. */
export const escalaDoTabuleiro = (largura: number, altura: number): number =>
  enquadrarTabuleiro(largura, altura).escala;
