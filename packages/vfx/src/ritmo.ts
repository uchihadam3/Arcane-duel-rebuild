/*
 * O ritmo da apresentação.
 *
 * Duas regras do documento moldam este arquivo: a lógica da partida nunca
 * depende da velocidade da animação, e o jogador precisa poder acelerar ou
 * reduzir os efeitos dentro de limites definidos (VIDEO_VISUAL_TARGET.md e
 * FULL_GAME_SPEC.md §24, §41).
 *
 * Aqui moram só duração, orçamento e preferência. O que cada beat **é** está
 * em `momentos.ts`; quando cada beat toca está em `fila.ts`.
 */

export type QualidadeDeVfx = 'baixa' | 'media' | 'alta';

/** Multiplicador aplicado à duração das animações. */
export type VelocidadeDeAnimacao = 'reduzida' | 'normal' | 'rapida' | 'instantanea';

export const MULTIPLICADOR_DE_DURACAO: Readonly<Record<VelocidadeDeAnimacao, number>> = {
  reduzida: 1.5,
  normal: 1,
  rapida: 0.6,
  instantanea: 0,
};

export interface PreferenciasDeApresentacao {
  readonly qualidade: QualidadeDeVfx;
  readonly velocidade: VelocidadeDeAnimacao;
  /** Reduz movimento de câmera, exigido pela seção de acessibilidade. */
  readonly reduzirMovimentoDeCamera: boolean;
}

export const PREFERENCIAS_PADRAO: PreferenciasDeApresentacao = {
  qualidade: 'alta',
  velocidade: 'normal',
  reduzirMovimentoDeCamera: false,
};

/** Duração efetiva de uma animação, em milissegundos. */
export const duracaoEfetiva = (duracaoBaseMs: number, velocidade: VelocidadeDeAnimacao): number =>
  Math.round(duracaoBaseMs * MULTIPLICADOR_DE_DURACAO[velocidade]);

/**
 * Orçamento de apresentação.
 *
 * Medido no vídeo de referência: as faixas de transição de turno e de fase
 * duram entre 0,9 s e 1,3 s; a apresentação de uma carta em tamanho grande
 * fica cerca de 1 s no centro antes de ir para o seu lugar; a sequência mais
 * longa observada é um ataque completo, com o efeito viajando pelo campo por
 * cerca de 2,6 s até o impacto, totalizando cerca de 3,2 s.
 *
 * Esses números viram teto, não meta. O documento é explícito: nenhum efeito
 * pode demorar tanto que atrapalhe o ritmo competitivo. Um momento isolado
 * fica abaixo de `momento`; só uma sequência inteira, e só nos momentos
 * grandes (Ruptura, Ultimate), pode chegar perto de `sequencia`.
 *
 * O teto de momento é 1,2 s **de propósito**, abaixo da faixa de troca de
 * turno de ~1,3 s que o vídeo mostra. A escolha não é um arredondamento: a
 * referência tem cinco a seis cartas na mão e o Arcane Duel tem oito, mais os
 * três espaços de Ação com Resposta, quatro Passivas, duas Cartas de Classe,
 * Ultimate, trilha de cooldown e bandeja de Condições. Sendo mais denso, ele
 * precisa ser mais rápido por beat, não mais generoso. Só mude este valor com
 * medição de playtest que justifique.
 */
export const ORCAMENTO_DE_APRESENTACAO_MS = {
  momento: 1200,
  sequencia: 3200,
} as const;

/**
 * Um momento de apresentação.
 *
 * O motor de regras já resolveu tudo quando isto toca: o estado canônico não
 * espera a animação. `bloqueiaEntrada` diz apenas se a interface deve segurar
 * o clique do jogador enquanto o momento acontece, para ele não agir sobre um
 * campo que ainda está se rearranjando na tela.
 */
export interface MomentoDeApresentacao {
  readonly id: string;
  readonly duracaoBaseMs: number;
  readonly bloqueiaEntrada: boolean;
}

/** Duração total de uma sequência, já ajustada pela preferência de velocidade. */
export const duracaoDaSequencia = (
  momentos: readonly MomentoDeApresentacao[],
  velocidade: VelocidadeDeAnimacao,
): number =>
  momentos.reduce((total, momento) => total + duracaoEfetiva(momento.duracaoBaseMs, velocidade), 0);

export type EstouroDeOrcamento = 'momento' | 'sequencia';

/**
 * Aponta o que estourou o orçamento, ou `undefined` quando a sequência cabe.
 * A verificação usa a velocidade normal de propósito: acelerar animação não
 * pode ser desculpa para desenhar uma sequência longa demais.
 */
export const estouroDeOrcamento = (
  momentos: readonly MomentoDeApresentacao[],
): EstouroDeOrcamento | undefined => {
  if (momentos.some((momento) => momento.duracaoBaseMs > ORCAMENTO_DE_APRESENTACAO_MS.momento)) {
    return 'momento';
  }
  if (duracaoDaSequencia(momentos, 'normal') > ORCAMENTO_DE_APRESENTACAO_MS.sequencia) {
    return 'sequencia';
  }
  return undefined;
};

/**
 * O que um nível de qualidade pode mexer.
 *
 * Só aparência: partículas, sombras, brilho e resolução dos efeitos. Nada aqui
 * toca informação, regra ou duração — o teto de tempo de um beat é o mesmo nos
 * três níveis, senão baixar a qualidade viraria vantagem competitiva (§56).
 */
export interface OrcamentoVisual {
  readonly particulasPorEfeito: number;
  readonly sombras: boolean;
  readonly luzesDinamicas: number;
  readonly brilho: boolean;
  /**
   * Teto do `devicePixelRatio` com que a cena é desenhada.
   *
   * É **teto**, não escala: o renderizador usa o menor entre este número e a
   * densidade real da tela, então num aparelho de DPR 2 nada muda ao subir
   * para Alta. O que este número evita é o caso oposto — pedir 3× de
   * resolução num telefone que não dá conta.
   */
  readonly tetoDeResolucao: number;
}

/**
 * O que cada nível de qualidade gasta.
 *
 * A primeira entrega errou a ordem do sacrifício: Alta desenhava a 1,75× num
 * aparelho de DPR 3, e cada degrau para baixo tirava resolução junto com
 * sombra. O resultado foi carta e HUD borrados por escolha nossa.
 *
 * A ordem agora é explícita e está nos números: **sombra sai primeiro,
 * partícula depois, luz depois, e resolução por último**. Alta e Média
 * desenham na densidade real da tela; só Baixa — o último recurso, para um
 * aparelho que já perdeu sombra, partícula e luz e ainda não acompanha —
 * encosta em nitidez. Nitidez de carta e de HUD é informação competitiva, não
 * enfeite, e por isso é a última coisa a ceder.
 */
export const ORCAMENTO_VISUAL: Readonly<Record<QualidadeDeVfx, OrcamentoVisual>> = {
  alta: {
    particulasPorEfeito: 90,
    sombras: true,
    luzesDinamicas: 3,
    brilho: true,
    tetoDeResolucao: 3,
  },
  /*
   * Sombra é o item mais caro da cena, e é o primeiro a sair.
   *
   * Sem ela a arena perde profundidade, e não legibilidade: a laje continua
   * com relevo, material e luz. Trocar sombra por quadros é a troca certa num
   * jogo em que o jogador está esperando a vez dele — e note que a resolução
   * não se mexe aqui.
   */
  media: {
    particulasPorEfeito: 42,
    sombras: false,
    luzesDinamicas: 2,
    brilho: false,
    tetoDeResolucao: 3,
  },
  baixa: {
    particulasPorEfeito: 16,
    sombras: false,
    luzesDinamicas: 1,
    brilho: false,
    tetoDeResolucao: 2,
  },
};

/** Os níveis, do mais caro ao mais barato. A queda automática anda por aqui. */
export const ESCADA_DE_QUALIDADE: readonly QualidadeDeVfx[] = ['alta', 'media', 'baixa'];

/**
 * A velocidade que corresponde a cada modo escolhido pelo jogador.
 *
 * "Reduzir movimento" não é um terceiro modo de velocidade: ele continua em
 * ritmo normal e corta deslocamento, zoom e partículas. Acessibilidade nunca
 * pode esconder feedback — só pode movê-lo menos (§57).
 */
export type ModoDeAnimacao = 'normal' | 'rapido';

export const VELOCIDADE_DO_MODO: Readonly<Record<ModoDeAnimacao, VelocidadeDeAnimacao>> = {
  normal: 'normal',
  rapido: 'rapida',
};
