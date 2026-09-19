/*
 * O leque da mão.
 *
 * A mão **não** é uma zona do tabuleiro. Ela está na mão de quem joga, não
 * sobre a mesa, e por isso vive em coordenadas de tela, fora da transformação
 * 3D — é o que a faz ficar de frente para o jogador enquanto o campo está
 * inclinado. Na composição anterior ela morava dentro do tabuleiro e desfazia
 * a inclinação carta por carta; era truque, e aparecia como truque.
 *
 * Tudo aqui é conta pura, sem DOM: é o que permite conferir por teste que o
 * leque não abre demais, que o foco sobe o suficiente, e que focar uma carta
 * não desmancha a mão.
 */

export interface Caixa {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

export interface LugarNoLeque {
  /** Centro da carta, em pixels de tela. */
  readonly x: number;
  readonly y: number;
  readonly giro: number;
  readonly escala: number;
  /** Quanto esta carta escurece por não ser a focada, de 0 a 1. */
  readonly recuo: number;
  /** Ordem de empilhamento: a focada vem na frente de todas. */
  readonly ordem: number;
  readonly focada: boolean;
}

export const LEQUE = {
  /**
   * O ângulo da carta mais afastada do centro.
   *
   * Discreto por decisão. Um leque muito aberto é bonito parado e péssimo de
   * usar: o nome da carta da ponta fica de lado e o alvo de toque encolhe.
   */
  giroMaximo: 9,
  /** Quanto a carta da ponta desce, em fração da altura dela. */
  quedaMaxima: 0.1,
  /**
   * Quanto a carta em repouso fica **abaixo** da borda de baixo da tela.
   *
   * Isto é deliberado: o pé da carta sai do quadro para que o topo — onde
   * moram nome, custo e o alto da arte — possa ser grande o bastante para ser
   * lido num telefone.
   */
  fracaoSubmersa: 0.3,
  /** O quanto a mão da máquina afunda pela borda de cima. Bem menos. */
  fracaoSubmersaDaMaquina: 0.14,
  /**
   * Quanto a carta sobe ao focar, em fração da altura dela.
   *
   * Grande de propósito. A tarefa pediu elevação claramente perceptível, e
   * pediu que no foco a carta apareça quase inteira: com a carta em repouso
   * 30 % submersa, subir 0,62 da altura tira o pé do corte e ainda sobra
   * deslocamento visível.
   */
  elevacaoDoFoco: 0.62,
  /** Quanto a carta focada cresce. */
  ampliacaoDoFoco: 1.42,
  /**
   * Quanto as vizinhas se afastam da focada.
   *
   * Pouquíssimo, e é regra da referência: focar uma carta **não** abre um
   * buraco no leque. Ela sobe por cima das vizinhas; elas apenas cedem um
   * fio de espaço e escurecem.
   */
  afastamentoDasVizinhas: 0.16,
  /** Quanto as vizinhas escurecem. */
  recuoDasVizinhas: 0.42,
} as const;

/**
 * A largura de uma carta da mão, dada a zona que a mão recebeu.
 *
 * A conta parte da altura: a carta precisa caber na faixa com a fração
 * submersa combinada, e a proporção 5:7 decide a largura. Depois disso, se
 * oito cartas nessa largura não couberem no espaço, elas se sobrepõem mais —
 * mas a carta **não** encolhe, porque encolher é o que torna o nome ilegível.
 */
export const LARGURA_DA_CARTA = (zona: Caixa, invertido = false): number => {
  /*
   * A mão da máquina afunda menos.
   *
   * A do jogador pode esconder o pé porque o que importa nela é o topo — nome,
   * custo, alto da arte. A da máquina são versos: não há nada para ler, e
   * esconder a maior parte deles faz a contagem de cartas do adversário
   * sumir, que é informação pública e útil.
   */
  const submersa = invertido ? LEQUE.fracaoSubmersaDaMaquina : LEQUE.fracaoSubmersa;
  const alturaUtil = zona.altura / (1 - submersa);
  const porAltura = (alturaUtil * 5) / 7;
  // Um teto pela largura, para que numa tela larga a carta não fique enorme.
  return Math.min(porAltura, zona.largura * (invertido ? 0.16 : 0.28));
};

export interface OpcoesDoLeque {
  readonly zona: Caixa;
  readonly total: number;
  /** Qual carta está focada, ou `null`. */
  readonly focada: number | null;
  /** Vira o leque de cabeça para baixo: é a mão da máquina, no topo. */
  readonly invertido?: boolean;
}

/**
 * Onde cada carta da mão fica, em pixels de tela.
 *
 * O passo entre cartas sai do espaço disponível, e é limitado dos dois lados:
 * nunca mais que 62 % da largura da carta — acima disso o leque deixa de ler
 * como mão e vira fileira — e nunca menos que 26 %, que é o ponto em que o
 * nome da carta de baixo começa a sumir sob a de cima.
 */
export const lugaresDoLeque = (opcoes: OpcoesDoLeque): readonly LugarNoLeque[] => {
  const { zona, total, focada, invertido = false } = opcoes;
  if (total <= 0) return [];

  const largura = LARGURA_DA_CARTA(zona, invertido);
  const altura = (largura * 7) / 5;
  const sentido = invertido ? -1 : 1;

  const passoIdeal = largura * 0.62;
  const passoQueCabe = total > 1 ? (zona.largura - largura) / (total - 1) : 0;
  const passo = Math.max(largura * 0.26, Math.min(passoIdeal, passoQueCabe));

  const centroX = zona.x + zona.largura / 2;
  /*
   * A linha de repouso.
   *
   * O **topo** da carta encosta na borda de cima da zona, e o pé transborda
   * pela de baixo: é daí que vem a fração submersa. A primeira versão desta
   * conta punha o topo *acima* da zona, e a mão subia por cima do campo —
   * exatamente a sobreposição que a revisão mandou eliminar.
   *
   * Na mão da máquina é o contrário: o pé encosta na borda de baixo da zona
   * dela e o topo transborda pela de cima, fora da tela.
   */
  const repousoY = invertido ? zona.y + zona.altura - altura / 2 : zona.y + altura / 2;

  return Array.from({ length: total }, (_, indice) => {
    // −1 na ponta esquerda, +1 na direita; 0 quando só há uma carta.
    const desvio = total > 1 ? (indice / (total - 1)) * 2 - 1 : 0;
    const estaFocada = focada === indice;

    const empurrao =
      focada === null || estaFocada
        ? 0
        : Math.sign(indice - focada) * largura * LEQUE.afastamentoDasVizinhas;

    const queda = Math.abs(desvio) ** 1.7 * LEQUE.quedaMaxima * altura * sentido;
    const elevacao = estaFocada ? altura * LEQUE.elevacaoDoFoco * sentido : 0;

    /*
     * A carta focada é maior, e por isso ela é presa à faixa da mão.
     *
     * Sem isto, focar a carta da ponta esquerda faz a carta ampliada entrar
     * no HUD do jogador — o teste geométrico pega exatamente esse caso. O
     * limite empurra a focada de volta para dentro da faixa, o que também lê
     * bem: a carta vem para a frente e se acomoda, em vez de escapar pela
     * borda.
     */
    const bruto = centroX + desvio * passo * ((total - 1) / 2) + empurrao;
    const meiaFocada = (largura * LEQUE.ampliacaoDoFoco) / 2;
    const x = estaFocada
      ? Math.min(zona.x + zona.largura - meiaFocada, Math.max(zona.x + meiaFocada, bruto))
      : bruto;

    return {
      x,
      y: repousoY + queda - elevacao,
      /*
       * A carta focada endireita, mas não zera o giro.
       *
       * Zerar produz um salto perceptível quando o foco sai; um fio de
       * inclinação residual mantém a continuidade e ainda lê como reta.
       */
      giro: estaFocada ? desvio * LEQUE.giroMaximo * 0.12 : desvio * LEQUE.giroMaximo * sentido,
      escala: estaFocada ? LEQUE.ampliacaoDoFoco : 1,
      recuo: focada === null || estaFocada ? 0 : LEQUE.recuoDasVizinhas,
      // A focada vem na frente de todas; o resto empilha da esquerda para a direita.
      ordem: estaFocada ? total + 10 : indice,
      focada: estaFocada,
    };
  });
};

/** O tamanho da carta da mão, para quem precisa desenhar a peça. */
export const tamanhoDaCartaNaMao = (
  zona: Caixa,
  invertido = false,
): { readonly largura: number; readonly altura: number } => {
  const largura = LARGURA_DA_CARTA(zona, invertido);
  return { largura, altura: (largura * 7) / 5 };
};

/**
 * A caixa da carta focada, em pixels de tela.
 *
 * Serve para conferir que a carta levantada não invade HUD nem controles, que
 * é uma das regras de não sobreposição da tarefa.
 */
export const caixaDaCartaFocada = (opcoes: OpcoesDoLeque): Caixa | null => {
  const lugares = lugaresDoLeque(opcoes);
  const lugar = lugares.find((item) => item.focada);
  if (lugar === undefined) return null;
  const { largura, altura } = tamanhoDaCartaNaMao(opcoes.zona);
  const l = largura * lugar.escala;
  const a = altura * lugar.escala;
  return { x: lugar.x - l / 2, y: lugar.y - a / 2, largura: l, altura: a };
};
