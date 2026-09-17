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

export interface ResolucaoDeAtaque {
  readonly alvo: EstadoDeJogador;
  readonly impacto: number;
  readonly guardaAntes: number;
  readonly guardaDepois: number;
  readonly ruptura: boolean;
  readonly danoAdicionalDeRuptura: number;
  readonly dano: number;
  readonly vidaAntes: number;
  readonly vidaDepois: number;
}

/**
 * Resolve um Ataque na ordem canônica do documento:
 *
 * 1. modificadores são aplicados aos valores impressos;
 * 2. o Impacto é aplicado à Guarda;
 * 3. a Ruptura é detectada — a Guarda saiu de um valor acima de zero e chegou
 *    a zero por causa desta ação inimiga;
 * 4. a Ruptura soma dois pontos de Dano **a este mesmo Ataque**;
 * 5. o Dano é aplicado à Vida.
 *
 * Se a Guarda já estava em zero antes do Ataque, não há Ruptura nova: não há
 * de onde romper.
 */
export const resolverAtaque = (
  alvo: EstadoDeJogador,
  valores: ValoresDeAtaque,
  modificadores: ModificadoresDaAcao,
): ResolucaoDeAtaque => {
  const impacto = semNegativo(valores.impacto + modificadores.impacto);
  const guardaAntes = alvo.guarda;
  const guardaDepois = semNegativo(guardaAntes - impacto);

  const ruptura = guardaAntes > 0 && guardaDepois === 0;
  const danoAdicionalDeRuptura = ruptura ? REGRAS_UNIVERSAIS.danoAdicionalDeRuptura : 0;

  const dano = semNegativo(valores.dano + modificadores.dano + danoAdicionalDeRuptura);
  const vidaAntes = alvo.vida;
  const vidaDepois = vidaAntes - dano;

  return {
    alvo: { ...alvo, guarda: guardaDepois, vida: vidaDepois },
    impacto,
    guardaAntes,
    guardaDepois,
    ruptura,
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
