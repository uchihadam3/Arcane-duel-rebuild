import type {
  EstadoDeJogador,
  ModificadoresDaAcao,
  ValoresDeAtaque,
} from '@arcane-duel/shared-types';

import { REGRAS_UNIVERSAIS } from './constants.js';
import { semNegativo } from './interno.js';

/*
 * Guarda, Impacto, Dano e Ruptura (§9 e §10).
 *
 * Impacto reduz apenas Guarda. Dano reduz apenas Vida. A Guarda nunca
 * funciona como escudo de Vida: ela não absorve Dano em momento nenhum.
 */

/**
 * O que o texto de uma carta pode mudar na conta, além de somar Dano e Impacto.
 *
 * Tudo aqui tem um nome próprio porque o texto das cartas fala desses momentos
 * de forma explícita: "depois que a redução da Reação for aplicada", "o Dano
 * final se torna 0", "impeça a Ruptura", "o bônus de Ruptura é +3 em vez de +2".
 */
export interface OpcoesDeResolucao {
  /** Redução trazida pela Resposta do defensor. */
  readonly reducaoDaResposta?: ModificadoresDaAcao;
  /** Dano somado depois de a redução da Resposta ser aplicada. */
  readonly bonusAposReducao?: number;
  /** Uma carta impediu a Ruptura desta Ação. */
  readonly impedirRuptura?: boolean;
  /** Bônus de Ruptura próprio desta Ação, no lugar do universal. */
  readonly bonusDeRupturaSubstituto?: number | null;
  /** Dano final fixado por carta. É a última palavra da conta. */
  readonly danoFinalDefinido?: number | null;
}

export interface ResolucaoDeAtaque {
  readonly alvo: EstadoDeJogador;
  readonly impacto: number;
  readonly guardaAntes: number;
  readonly guardaDepois: number;
  readonly ruptura: boolean;
  /** A Guarda chegaria a zero, mas uma carta impediu a Ruptura. */
  readonly rupturaImpedida: boolean;
  readonly danoAdicionalDeRuptura: number;
  readonly dano: number;
  readonly vidaAntes: number;
  readonly vidaDepois: number;
}

const SEM_REDUCAO: ModificadoresDaAcao = { dano: 0, impacto: 0 };

/**
 * A Ruptura aconteceria?
 *
 * Várias cartas perguntam isso **antes** de a Ação resolver — "quando um Ataque
 * causaria Ruptura", "só contra um Ataque que causaria Ruptura". A pergunta é
 * respondida por previsão, e não aplicando a Ação para desfazer depois: desfazer
 * deixaria rastro em log, em contadores e em qualquer gatilho intermediário.
 */
export const preverRuptura = (
  guardaAtual: number,
  valores: ValoresDeAtaque,
  modificadores: ModificadoresDaAcao,
  reducaoDaResposta: ModificadoresDaAcao = SEM_REDUCAO,
): boolean => {
  const impacto = impactoFinal(valores, modificadores, reducaoDaResposta);
  return guardaAtual > 0 && semNegativo(guardaAtual - impacto) === 0;
};

const impactoFinal = (
  valores: ValoresDeAtaque,
  modificadores: ModificadoresDaAcao,
  reducaoDaResposta: ModificadoresDaAcao,
): number =>
  semNegativo(semNegativo(valores.impacto + modificadores.impacto) - reducaoDaResposta.impacto);

/**
 * Resolve um Ataque na ordem canônica do documento:
 *
 * 1. modificadores são aplicados aos valores impressos;
 * 2. a redução da Resposta é subtraída;
 * 3. o Impacto é aplicado à Guarda;
 * 4. a Ruptura é detectada — a Guarda saiu de um valor acima de zero e chegou
 *    a zero por causa desta ação inimiga — salvo se uma carta a impediu;
 * 5. o Dano recebe o que o texto manda somar depois da redução da Resposta;
 * 6. a Ruptura soma o bônus dela **a este mesmo Ataque**;
 * 7. um Dano final fixado por carta substitui o resultado, se houver;
 * 8. o Dano é aplicado à Vida.
 *
 * Se a Guarda já estava em zero antes do Ataque, não há Ruptura nova: não há
 * de onde romper.
 */
export const resolverAtaque = (
  alvo: EstadoDeJogador,
  valores: ValoresDeAtaque,
  modificadores: ModificadoresDaAcao,
  opcoes: OpcoesDeResolucao = {},
): ResolucaoDeAtaque => {
  const reducao = opcoes.reducaoDaResposta ?? SEM_REDUCAO;
  const impacto = impactoFinal(valores, modificadores, reducao);
  const guardaAntes = alvo.guarda;
  const guardaDepois = semNegativo(guardaAntes - impacto);

  const chegouAZero = guardaAntes > 0 && guardaDepois === 0;
  const impedida = chegouAZero && opcoes.impedirRuptura === true;
  const ruptura = chegouAZero && !impedida;
  const danoAdicionalDeRuptura = ruptura
    ? (opcoes.bonusDeRupturaSubstituto ?? REGRAS_UNIVERSAIS.danoAdicionalDeRuptura)
    : 0;

  const danoBase = semNegativo(valores.dano + modificadores.dano);
  const aposReacao = semNegativo(danoBase - reducao.dano);
  const comBonusPosReducao = aposReacao + (opcoes.bonusAposReducao ?? 0);
  const calculado = semNegativo(comBonusPosReducao + danoAdicionalDeRuptura);
  const fixado = opcoes.danoFinalDefinido;
  const dano = fixado === null || fixado === undefined ? calculado : semNegativo(fixado);

  const vidaAntes = alvo.vida;
  const vidaDepois = vidaAntes - dano;

  return {
    alvo: { ...alvo, guarda: guardaDepois, vida: vidaDepois },
    impacto,
    guardaAntes,
    guardaDepois,
    ruptura,
    rupturaImpedida: impedida,
    danoAdicionalDeRuptura,
    dano,
    vidaAntes,
    vidaDepois,
  };
};

/**
 * Reduz a própria Guarda como custo.
 *
 * Nunca provoca Ruptura: a Ruptura só acontece quando uma ação inimiga leva a
 * Guarda de acima de zero para zero (§9). O que a redução voluntária faz é
 * deixar a Guarda mais baixa — e um Ataque inimigo posterior que leve o que
 * sobrou a zero provoca Ruptura normalmente.
 */
export const reduzirPropriaGuarda = (
  jogador: EstadoDeJogador,
  quantidade: number,
): EstadoDeJogador => ({
  ...jogador,
  guarda: semNegativo(jogador.guarda - quantidade),
});

/** Ajusta a Guarda para um valor exato, sem passar por Impacto nem por Ruptura. */
export const ajustarGuardaPara = (jogador: EstadoDeJogador, valor: number): EstadoDeJogador => ({
  ...jogador,
  guarda: semNegativo(valor),
});
