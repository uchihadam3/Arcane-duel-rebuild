/**
 * Estrutura reservada para efeitos visuais.
 *
 * Duas regras do documento moldam este pacote desde já: a lógica da partida
 * nunca depende da velocidade da animação, e o jogador precisa poder acelerar
 * ou reduzir os efeitos dentro de limites definidos (VIDEO_VISUAL_TARGET.md e
 * FULL_GAME_SPEC.md §24, §41).
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
