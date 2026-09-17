import type { CondicaoId, EstadoDeJogador, Resultado } from '@arcane-duel/shared-types';
import { falha, sucesso } from '@arcane-duel/shared-types';

import { LIMITE_DE_CONDICAO, REGRAS_UNIVERSAIS } from './constants.js';
import type { ErroDeDominio } from './erros.js';
import { semNegativo } from './interno.js';

/*
 * As quatro Condições universais (§15).
 *
 * Dano de Condição não é Ataque e não pode receber uma Reação comum: por isso
 * ele não passa pela resolução de Ação nem abre espaço de Resposta — é uma
 * perda de Vida direta.
 */

export interface PerdaDeVida {
  readonly jogador: EstadoDeJogador;
  readonly vidaPerdida: number;
  readonly restante: number;
}

/** Acrescenta Condição respeitando o teto documentado. */
export const aplicarCondicao = (
  jogador: EstadoDeJogador,
  condicao: CondicaoId,
  quantidade: number,
): Resultado<EstadoDeJogador, ErroDeDominio> => {
  if (quantidade < 0) {
    return falha({ tipo: 'condicao-acima-do-limite', limite: LIMITE_DE_CONDICAO[condicao] });
  }
  const limite = LIMITE_DE_CONDICAO[condicao];
  const total = jogador.condicoes[condicao] + quantidade;
  return sucesso({
    ...jogador,
    // O acúmulo para no teto em vez de recusar: o texto define um máximo, não
    // uma jogada ilegal.
    condicoes: { ...jogador.condicoes, [condicao]: total > limite ? limite : total },
  });
};

/**
 * Queimadura, no final do turno do personagem afetado: perde 1 de Vida e a
 * Queimadura diminui em 1.
 */
export const resolverQueimadura = (jogador: EstadoDeJogador): PerdaDeVida => {
  const atual = jogador.condicoes.queimadura;
  if (atual <= 0) return { jogador, vidaPerdida: 0, restante: 0 };

  const restante = atual - 1;
  return {
    jogador: {
      ...jogador,
      vida: jogador.vida - 1,
      condicoes: { ...jogador.condicoes, queimadura: restante },
    },
    vidaPerdida: 1,
    restante,
  };
};

/**
 * Sangramento, depois que o personagem conclui a **segunda** Ação do turno.
 *
 * A terceira Ação não provoca um segundo tique: o gatilho é concluir a
 * segunda, e isso acontece uma vez só por turno. No turno seguinte a contagem
 * recomeça do zero, então o gatilho volta a existir.
 */
export const resolverSangramento = (jogador: EstadoDeJogador): PerdaDeVida => {
  const atual = jogador.condicoes.sangramento;
  if (atual <= 0) return { jogador, vidaPerdida: 0, restante: 0 };

  const restante = atual - 1;
  return {
    jogador: {
      ...jogador,
      vida: jogador.vida - 1,
      condicoes: { ...jogador.condicoes, sangramento: restante },
    },
    vidaPerdida: 1,
    restante,
  };
};

export interface AplicacaoDeMurchar {
  readonly jogador: EstadoDeJogador;
  readonly reducao: number;
}

/**
 * Murchar, no início do turno: **depois** de a Guarda voltar para seis,
 * reduza a Guarda pela quantidade de Murchar e remova todo o Murchar.
 *
 * Isso não é uma ação inimiga, então não provoca Ruptura mesmo levando a
 * Guarda a zero.
 */
export const aplicarMurchar = (jogador: EstadoDeJogador): AplicacaoDeMurchar => {
  const reducao = jogador.condicoes.murchar;
  if (reducao <= 0) return { jogador, reducao: 0 };

  return {
    jogador: {
      ...jogador,
      guarda: semNegativo(jogador.guarda - reducao),
      condicoes: { ...jogador.condicoes, murchar: 0 },
    },
    reducao,
  };
};

/** Custo adicional de Ação imposto por Lento, enquanto houver acúmulo. */
export const custoAdicionalDeLento = (jogador: EstadoDeJogador): number =>
  jogador.condicoes.lento > 0 ? 1 : 0;

/**
 * Consome um acúmulo de Lento.
 *
 * Só é chamado depois que a Ação realmente pagou o aumento: uma Ação recusada
 * não consome Lento.
 */
export const consumirLento = (jogador: EstadoDeJogador): EstadoDeJogador => ({
  ...jogador,
  condicoes: { ...jogador.condicoes, lento: semNegativo(jogador.condicoes.lento - 1) },
});

/** A segunda Ação do turno é o gatilho do Sangramento. */
export const concluiuASegundaAcao = (acoesRealizadas: number): boolean =>
  acoesRealizadas === REGRAS_UNIVERSAIS.gatilhoDeSangramento;
