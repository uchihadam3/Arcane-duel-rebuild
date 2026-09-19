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

/**
 * O ponto em torno do qual a carta gira no leque.
 *
 * Abaixo do meio, perto do pé: é o que faz o leque abrir como uma mão que
 * segura as cartas pela base. O CSS usa exatamente este número.
 */
export const PIVO_DO_GIRO = { x: 0.5, y: 0.82 } as const;

/**
 * Meia largura de uma carta **girada**, medida a partir do pivô.
 *
 * Isto não é detalhe. Uma carta de 121 × 170 inclinada 9° ocupa 146 px de
 * largura, e não 121 — e o leque inteiro estoura a faixa da mão por doze
 * pixels de cada lado. Foi assim que a mão encostou no HUD do jogador e no
 * botão de encerrar turno nos seis viewports ao mesmo tempo: a conta tratava
 * a carta como um retângulo sem giro.
 */
export const meiaLarguraGirada = (largura: number, altura: number, giroEmGraus: number): number => {
  const r = (Math.abs(giroEmGraus) * Math.PI) / 180;
  const cos = Math.cos(r);
  const sen = Math.sin(r);
  const px = PIVO_DO_GIRO.x * largura;
  const py = PIVO_DO_GIRO.y * altura;
  const cantos: readonly (readonly [number, number])[] = [
    [-px, -py],
    [largura - px, -py],
    [largura - px, altura - py],
    [-px, altura - py],
  ];
  return Math.max(...cantos.map(([x, y]) => Math.abs(x * cos - y * sen)));
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

  /*
   * O espaço que o leque pode usar já desconta o volume do giro.
   *
   * A carta da ponta é a mais inclinada, então é ela que decide a folga. Sem
   * este desconto, as duas pontas do leque invadem as colunas de apoio.
   */
  const meiaGirada = meiaLarguraGirada(largura, altura, LEQUE.giroMaximo);
  const util = Math.max(0, zona.largura - meiaGirada * 2);
  const passoIdeal = largura * 0.62;
  const passoQueCabe = total > 1 ? util / (total - 1) : 0;
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
    /*
     * Toda carta é presa à faixa da mão, contando o giro e a escala dela.
     *
     * Não só a focada: o empurrão que abre espaço para ela move as vizinhas, e
     * a da ponta sai da faixa. Prendendo todas, o leque nunca encosta no HUD
     * nem nos controles — e a prisão só age em quem chegou à borda, então o
     * miolo do leque continua se movendo livremente.
     */
    const bruto = centroX + desvio * passo * ((total - 1) / 2) + empurrao;
    const giroDesta = estaFocada
      ? desvio * LEQUE.giroMaximo * 0.12
      : desvio * LEQUE.giroMaximo * sentido;
    const escalaDesta = estaFocada ? LEQUE.ampliacaoDoFoco : 1;
    const meia = meiaLarguraGirada(largura, altura, giroDesta) * escalaDesta;
    const x = Math.min(zona.x + zona.largura - meia, Math.max(zona.x + meia, bruto));

    return {
      x,
      y: repousoY + queda - elevacao,
      /*
       * A carta focada endireita, mas não zera o giro.
       *
       * Zerar produz um salto perceptível quando o foco sai; um fio de
       * inclinação residual mantém a continuidade e ainda lê como reta.
       */
      giro: giroDesta,
      escala: escalaDesta,
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
  const { largura, altura } = tamanhoDaCartaNaMao(opcoes.zona, opcoes.invertido ?? false);
  const meia = meiaLarguraGirada(largura, altura, lugar.giro) * lugar.escala;
  const a = altura * lugar.escala;
  return { x: lugar.x - meia, y: lugar.y - a / 2, largura: meia * 2, altura: a };
};

/**
 * A caixa que o leque inteiro ocupa na tela, **com o giro contado**.
 *
 * É esta caixa que o teste de colisão usa, e não a zona: a zona é o espaço
 * reservado, e o que precisa não encostar em nada é o que realmente aparece.
 */
export const caixaDoLeque = (opcoes: OpcoesDoLeque): Caixa | null => {
  const lugares = lugaresDoLeque(opcoes);
  if (lugares.length === 0) return null;
  const { largura, altura } = tamanhoDaCartaNaMao(opcoes.zona, opcoes.invertido ?? false);
  let esquerda = Infinity;
  let direita = -Infinity;
  let topo = Infinity;
  let base = -Infinity;
  for (const lugar of lugares) {
    const meia = meiaLarguraGirada(largura, altura, lugar.giro) * lugar.escala;
    const a = (altura * lugar.escala) / 2;
    esquerda = Math.min(esquerda, lugar.x - meia);
    direita = Math.max(direita, lugar.x + meia);
    topo = Math.min(topo, lugar.y - a);
    base = Math.max(base, lugar.y + a);
  }
  return { x: esquerda, y: topo, largura: direita - esquerda, altura: base - topo };
};
