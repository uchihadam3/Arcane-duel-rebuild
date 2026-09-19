import type { IndiceDeAcao, ZonaDeCooldown } from '@arcane-duel/shared-types';

/*
 * A planta definitiva do campo.
 *
 * Três decisões moram aqui, e as três vieram de reprovação medida.
 *
 * **Primeira: a arena é SVG sob transformação 3D do CSS, e não WebGL.**
 *
 * A Etapa 6 foi reprovada por nitidez. Desenhar a carta num canvas e virar
 * textura obriga a escolher uma resolução, e qualquer escolha está errada em
 * algum aparelho. Aqui não existe textura: quem rasteriza é o navegador, no
 * tamanho exato em que a coisa está na tela e na densidade real do aparelho.
 *
 * **Segunda: o tabuleiro físico contém somente cartas.**
 *
 * A composição anterior foi reprovada por misturar as camadas. Personagem,
 * removidas, Resposta permanente, quarta Ação permanente e a mão moravam todos
 * sobre a mesa, competindo com os treze lugares que importam. Aqui a mesa tem
 * **treze zonas por jogador e nada mais** — e isso é conferido por teste, não
 * por disciplina. HUD é informação e mora em coordenadas de tela; mão é da
 * pessoa e mora em coordenadas de tela; mesa é objeto físico.
 *
 * **Terceira: existe uma metade, e a outra é derivada.**
 *
 * A metade da máquina não é escrita: ela é a do jogador girada 180° em torno
 * do centro. Duas listas parecidas escritas à mão divergem — uma margem aqui,
 * dois pixels ali — e é exatamente isso que faz uma composição parecer
 * descuidada. Com a derivação, distância, margem, alinhamento, escala e ângulo
 * são iguais porque **são o mesmo número**.
 *
 * Tudo abaixo está em unidades de tabuleiro. Y cresce para baixo, e para baixo
 * é a direção do jogador humano — literal, e é o coração da perspectiva fixa.
 */

/*
 * O tabuleiro é largo e raso.
 *
 * A proporção não é escolha de gosto: ela sai da tela. A zona da arena em
 * 915×412 é uma faixa de 915×217, quase 4,2 para 1. Um tabuleiro inclinado
 * projeta com proporção `(L · f) / (A · cos θ)` — então, para preencher essa
 * faixa sem inclinar a mesa até ela virar parede, o tabuleiro precisa ser
 * largo. 2600 × 1020, a 47°, projeta ocupando 93 % da largura disponível.
 *
 * A primeira prova saiu com 1700 × 820 e os seis pedestais de Ação colados na
 * linha de centro: o corredor central sumiu, e ele não é decoração — é por
 * onde golpe, projétil e magia atravessam.
 */
export const TABULEIRO = { largura: 2600, altura: 1020 } as const;

/** A linha que separa as duas metades. O brasão do centro mora nela. */
export const LINHA_DE_CENTRO = TABULEIRO.altura / 2;

/**
 * Qual metade do tabuleiro.
 *
 * `jogador` é sempre a metade de baixo e `maquina` sempre a de cima, em toda
 * partida, do começo ao fim. Nenhuma função aceita "de quem é a vez", e
 * nenhuma função inverte o campo.
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

/**
 * A rotação de 180° em torno do centro do tabuleiro.
 *
 * `(x, y) → (L − x, A − y)` para o **centro** da peça, mantendo o tamanho.
 * É a única função que produz o lado da máquina, e é por isso que a simetria
 * é exata: não há um segundo conjunto de números para divergir do primeiro.
 *
 * O tamanho não gira junto porque a carta não gira: uma carta em pé continua
 * em pé nos dois lados da mesa. O que gira é **onde ela está**.
 */
export const girar = (caixa: Retangulo): Retangulo => ({
  x: TABULEIRO.largura - caixa.x - caixa.largura,
  y: TABULEIRO.altura - caixa.y - caixa.altura,
  largura: caixa.largura,
  altura: caixa.altura,
});

/** Aplica a rotação só quando a metade pedida é a de cima. */
const naMetade = (metade: Metade, doJogador: Retangulo): Retangulo =>
  metade === 'jogador' ? doJogador : girar(doJogador);

/*
 * As medidas das peças.
 *
 * A hierarquia é deliberada e é a leitura do campo: Ação é a maior peça da
 * arena porque os três espaços de Ação são o ponto de choque e o olho precisa
 * achá-los primeiro; Ultimate vem logo atrás porque é única; Classe e
 * Cooldown são apoio; Passiva é a menor porque quatro peças numa fileira já
 * pesam por quantidade.
 */
export const CARTA = { largura: 120, altura: 168 } as const;
export const PEDESTAL_DE_ACAO = { largura: 176, altura: 200 } as const;
export const SLOT_DE_ULTIMATE = { largura: 128, altura: 150 } as const;
export const PEDESTAL_DE_CLASSE = { largura: 106, altura: 140 } as const;
export const COMPARTIMENTO_DE_COOLDOWN = { largura: 98, altura: 130 } as const;
export const ENCAIXE_DE_PASSIVA = { largura: 84, altura: 110 } as const;

/**
 * A quarta Ação é menor porque é exceção.
 *
 * Ela não tem lugar permanente: o pedestal **surge** quando uma regra concede
 * a Ação extra e some quando a concessão acaba. Do mesmo tamanho das três, ela
 * desfaria a referência de "são três" que o jogador decorou no primeiro turno.
 */
export const PEDESTAL_DE_ACAO_EXTRA = { largura: 132, altura: 170 } as const;

/**
 * A bandeja de Resposta é temporária e claramente subordinada.
 *
 * Ela não existe no campo vazio. Quando uma Ação recebe Resposta, a bandeja
 * abre encostada nela — cobrindo a quina de baixo, que é o que um aparo
 * parece — e fecha depois da resolução.
 */
export const BANDEJA_DE_RESPOSTA = { largura: 104, altura: 124 } as const;
/** O quanto a bandeja invade o pedestal que ela responde. */
export const INVASAO_DA_RESPOSTA = 54;
/** E o quanto ela sai para o lado, para não cobrir o nome da carta atacante. */
export const DESVIO_DA_RESPOSTA = 46;

/*
 * As duas fileiras de cada metade, medidas do topo do tabuleiro.
 *
 * Só existem duas, e é isso que mantém o centro livre:
 *
 *   máquina   retaguarda   64 ..214    Ultimate · Passivas
 *             frente      248 ..448    Cooldown · Ações · Classe
 *   ------ corredor livre, 448 .. 572, centro em 510 ------
 *   jogador   frente      572 ..772    Classe · Ações · Cooldown
 *             retaguarda  806 ..956    Ultimate · Passivas
 *
 * O corredor de 124 unidades no meio é **funcional**: nada pode ocupá-lo,
 * porque é por ele que os efeitos atravessam. Um teste confere que nenhuma
 * zona cruza a linha de centro, e outro que nenhuma chega perto demais dela.
 *
 * A margem de 64 na borda de trás existe porque a moldura tem 52 de espessura
 * mais ornamento de canto: com menos que isso, a Ultimate fica **debaixo** da
 * moldura — foi o que aconteceu na primeira prova.
 */
const MARGEM_DA_MOLDURA = 64;
/** A folga entre a linha de centro e o pedestal de Ação, de cada lado. */
const CORREDOR_CENTRAL = 62;
const FILEIRA_DA_FRENTE = TABULEIRO.altura / 2 + CORREDOR_CENTRAL;
const FILEIRA_DE_RETAGUARDA = TABULEIRO.altura - MARGEM_DA_MOLDURA - SLOT_DE_ULTIMATE.altura;

/*
 * O eixo X, da esquerda do jogador para a direita.
 *
 * As três Ações mandam: elas são o centro visual, então nascem centradas e
 * igualmente espaçadas, e todo o resto se organiza em volta delas. Classe à
 * esquerda, Cooldown à direita — como a planta congelada pede.
 */
const PASSO_ENTRE_ACOES = 300;
const COLUNAS_DE_ACAO: readonly number[] = [
  TABULEIRO.largura / 2 - PASSO_ENTRE_ACOES,
  TABULEIRO.largura / 2,
  TABULEIRO.largura / 2 + PASSO_ENTRE_ACOES,
];

/** A coluna da Ação extra: fora do trio, à direita, anunciando que é exceção. */
const COLUNA_DA_ACAO_EXTRA = TABULEIRO.largura / 2 + PASSO_ENTRE_ACOES + 226;

/** O passo entre os dois pedestais de Classe e entre os três compartimentos. */
const PASSO_ENTRE_CLASSES = 130;
const PASSO_ENTRE_COMPARTIMENTOS = 106;

/** O centro do bloco de Classe e o do bloco de Cooldown, no eixo X. */
const CENTRO_DAS_CLASSES = 320;
const CENTRO_DO_COOLDOWN = TABULEIRO.largura - CENTRO_DAS_CLASSES;

const caixaCentrada = (
  centroX: number,
  centroY: number,
  tamanho: { readonly largura: number; readonly altura: number },
): Retangulo => ({
  x: centroX - tamanho.largura / 2,
  y: centroY - tamanho.altura / 2,
  largura: tamanho.largura,
  altura: tamanho.altura,
});

/* ---------------------------------------------------------------------------
 * As treze zonas permanentes, escritas uma vez, para a metade do jogador.
 * ------------------------------------------------------------------------- */

export const ehAcaoExtra = (indice: IndiceDeAcao): boolean => indice >= 3;

/**
 * Os três pedestais de Ação, encostados na linha de centro.
 *
 * Eles nascem com o topo na linha de centro e descem: é isso que faz o choque
 * acontecer no meio da mesa, com os seis pedestais — três de cada lado —
 * formando um bloco só. A quarta Ação, quando concedida, desce um pouco e vai
 * para a direita, menor.
 */
const acaoDoJogador = (indice: IndiceDeAcao): Retangulo => {
  const extra = ehAcaoExtra(indice);
  const centroX = extra ? COLUNA_DA_ACAO_EXTRA : (COLUNAS_DE_ACAO[indice] ?? TABULEIRO.largura / 2);
  const tamanho = extra ? PEDESTAL_DE_ACAO_EXTRA : PEDESTAL_DE_ACAO;
  return caixaCentrada(centroX, FILEIRA_DA_FRENTE + tamanho.altura / 2, tamanho);
};

/** Os dois pedestais de Classe, à esquerda das Ações. */
const classeDoJogador = (indice: number): Retangulo =>
  caixaCentrada(
    CENTRO_DAS_CLASSES + (indice - 0.5) * PASSO_ENTRE_CLASSES,
    FILEIRA_DA_FRENTE + PEDESTAL_DE_ACAO.altura / 2,
    PEDESTAL_DE_CLASSE,
  );

/** Os três compartimentos da peça de cooldown, à direita das Ações. */
const compartimentoDoJogador = (zona: ZonaDeCooldown): Retangulo =>
  caixaCentrada(
    CENTRO_DO_COOLDOWN + (zona - 2) * PASSO_ENTRE_COMPARTIMENTOS,
    FILEIRA_DA_FRENTE + PEDESTAL_DE_ACAO.altura / 2,
    COMPARTIMENTO_DE_COOLDOWN,
  );

/** Os quatro encaixes de Passiva, na retaguarda, centrados sob as Ações. */
const PASSO_ENTRE_PASSIVAS = 180;
const passivaDoJogador = (indice: number): Retangulo =>
  caixaCentrada(
    TABULEIRO.largura / 2 + (indice - 1.5) * PASSO_ENTRE_PASSIVAS,
    FILEIRA_DE_RETAGUARDA + SLOT_DE_ULTIMATE.altura / 2,
    ENCAIXE_DE_PASSIVA,
  );

/** O slot de Ultimate: canto inferior esquerdo, do lado do jogador. */
const ultimateDoJogador = (): Retangulo =>
  caixaCentrada(
    CENTRO_DAS_CLASSES,
    FILEIRA_DE_RETAGUARDA + SLOT_DE_ULTIMATE.altura / 2,
    SLOT_DE_ULTIMATE,
  );

/* ---------------------------------------------------------------------------
 * A superfície pública: a metade pedida, derivada quando é a de cima.
 * ------------------------------------------------------------------------- */

export const pedestalDeAcao = (metade: Metade, indice: IndiceDeAcao): Retangulo =>
  naMetade(metade, acaoDoJogador(indice));

export const pedestalDeClasse = (metade: Metade, indice: number): Retangulo =>
  naMetade(metade, classeDoJogador(indice));

export const encaixeDePassiva = (metade: Metade, indice: number): Retangulo =>
  naMetade(metade, passivaDoJogador(indice));

export const slotDeUltimate = (metade: Metade): Retangulo => naMetade(metade, ultimateDoJogador());

export const ZONAS_DE_COOLDOWN: readonly ZonaDeCooldown[] = [1, 2, 3];

/**
 * Um compartimento da peça de cooldown.
 *
 * Do lado do jogador, CD1 → CD2 → CD3 correm da esquerda para a direita. Do
 * lado da máquina a rotação inverte a leitura na tela, e isso é correto: é a
 * mesma peça vista do outro lado da mesa.
 */
export const compartimentoDeCooldown = (metade: Metade, zona: ZonaDeCooldown): Retangulo =>
  naMetade(metade, compartimentoDoJogador(zona));

/**
 * A peça inteira de cooldown: os três compartimentos num corpo só.
 *
 * Três caixas soltas leem como três marcadores. Um corpo único com três
 * divisões lê como gaveta — e gaveta é o que ela é, porque a carta **entra**
 * num compartimento e depois anda de um para o outro.
 */
export const PECA_DE_COOLDOWN_FOLGA = 16;
export const pecaDeCooldown = (metade: Metade): Retangulo => {
  const primeiro = compartimentoDoJogador(1);
  const ultimo = compartimentoDoJogador(3);
  const corpo: Retangulo = {
    x: primeiro.x - PECA_DE_COOLDOWN_FOLGA,
    y: primeiro.y - PECA_DE_COOLDOWN_FOLGA,
    largura: ultimo.x + ultimo.largura - primeiro.x + PECA_DE_COOLDOWN_FOLGA * 2,
    altura: primeiro.altura + PECA_DE_COOLDOWN_FOLGA * 2,
  };
  return naMetade(metade, corpo);
};

/**
 * A bandeja de Resposta acoplada a um pedestal de Ação.
 *
 * Ela pertence ao **defensor**: a Resposta de quem apanha entra aqui, colada
 * ao Ataque que ela apara. Por isso a Resposta a um Ataque da máquina abre na
 * metade do jogador, e vice-versa. Nada disto existe no campo vazio.
 */
export const bandejaDeResposta = (metadeDoAtacante: Metade, indice: IndiceDeAcao): Retangulo => {
  const alvo = pedestalDeAcao(metadeDoAtacante, indice);
  const paraBaixo = metadeDoAtacante === 'maquina';
  const centroX =
    alvo.x + alvo.largura / 2 + (paraBaixo ? DESVIO_DA_RESPOSTA : -DESVIO_DA_RESPOSTA);
  const centroY = paraBaixo
    ? alvo.y + alvo.altura - INVASAO_DA_RESPOSTA + BANDEJA_DE_RESPOSTA.altura / 2
    : alvo.y + INVASAO_DA_RESPOSTA - BANDEJA_DE_RESPOSTA.altura / 2;
  return caixaCentrada(centroX, centroY, BANDEJA_DE_RESPOSTA);
};

/* ---------------------------------------------------------------------------
 * O inventário das zonas permanentes, para quem precisa percorrê-las.
 * ------------------------------------------------------------------------- */

export type EspecieDeZona = 'acao' | 'passiva' | 'classe' | 'cooldown' | 'ultimate';

export interface ZonaPermanente {
  readonly especie: EspecieDeZona;
  readonly metade: Metade;
  /** O índice dentro da espécie: 0..2 para Ação, 1..3 para Cooldown, e assim. */
  readonly indice: number;
  readonly caixa: Retangulo;
}

/**
 * As treze zonas permanentes de uma metade.
 *
 * Treze, e é contado por teste: 3 Ações + 4 Passivas + 2 Classe + 3 Cooldown +
 * 1 Ultimate. A Ação extra não entra porque não é permanente, a Resposta não
 * entra porque não é permanente, e Personagem e removidas não entram porque
 * deixaram de existir como peça física.
 */
export const zonasPermanentes = (metade: Metade): readonly ZonaPermanente[] => [
  ...([0, 1, 2] as const).map((indice) => ({
    especie: 'acao' as const,
    metade,
    indice,
    caixa: pedestalDeAcao(metade, indice),
  })),
  ...[0, 1, 2, 3].map((indice) => ({
    especie: 'passiva' as const,
    metade,
    indice,
    caixa: encaixeDePassiva(metade, indice),
  })),
  ...[0, 1].map((indice) => ({
    especie: 'classe' as const,
    metade,
    indice,
    caixa: pedestalDeClasse(metade, indice),
  })),
  ...ZONAS_DE_COOLDOWN.map((zona) => ({
    especie: 'cooldown' as const,
    metade,
    indice: zona,
    caixa: compartimentoDeCooldown(metade, zona),
  })),
  {
    especie: 'ultimate' as const,
    metade,
    indice: 0,
    caixa: slotDeUltimate(metade),
  },
];

export const TODAS_AS_ZONAS: readonly ZonaPermanente[] = [
  ...zonasPermanentes('maquina'),
  ...zonasPermanentes('jogador'),
];
