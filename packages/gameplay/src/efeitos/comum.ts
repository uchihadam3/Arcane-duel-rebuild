import type { CardId, EscopoDaAnotacao, PlayerId } from '@arcane-duel/shared-types';
import { semAnotacoesDaChave, temTag, valorDaAnotacao } from '@arcane-duel/shared-types';

import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { emitir, gravarJogador, jogadorDo, registrarAnotacao } from '../contexto.js';
import type { AlvoDoEfeito } from '../ganchos.js';
import { somarAoAtaque } from '../apoio.js';

/*
 * Peças compartilhadas pelas duas classes.
 *
 * "Seu próximo Ataque neste turno recebe +X" aparece no Guerreiro e no Mago com
 * a mesma mecânica: uma promessa guardada que o próximo Ataque consome. Guardar
 * isso uma vez só evita duas implementações que podem divergir.
 */

/** Guarda um bônus para o próximo Ataque do turno. */
export const prometerAoProximoAtaque = (
  ctx: Contexto,
  jogador: PlayerId,
  origem: CardId,
  chave: string,
  valor: number,
  escopo: EscopoDaAnotacao = 'turno',
): void => {
  registrarAnotacao(ctx, jogador, { chave, origem, escopo, valor });
};

/** Lê e apaga uma promessa guardada, devolvendo quanto ela valia. */
export const consumirPromessa = (ctx: Contexto, jogador: PlayerId, chave: string): number => {
  const atual = jogadorDo(ctx, jogador);
  const valor = valorDaAnotacao(atual.anotacoes, chave);
  if (valor === 0) return 0;
  gravarJogador(ctx, { ...atual, anotacoes: semAnotacoesDaChave(atual.anotacoes, chave) });
  return valor;
};

export const lerPromessa = (ctx: Contexto, jogador: PlayerId, chave: string): number =>
  valorDaAnotacao(jogadorDo(ctx, jogador).anotacoes, chave);

/** Substitui o valor de uma anotação em vez de somar a ele. */
export const definirPromessa = (
  ctx: Contexto,
  jogador: PlayerId,
  origem: CardId,
  chave: string,
  valor: number,
  escopo: EscopoDaAnotacao = 'turno',
): void => {
  consumirPromessa(ctx, jogador, chave);
  if (valor !== 0) registrarAnotacao(ctx, jogador, { chave, origem, escopo, valor });
};

/**
 * Aplica, antes da resolução, os bônus que estavam guardados para o próximo
 * Ataque.
 *
 * Os bônus condicionais de Finta Calculada são decididos aqui porque é aqui que
 * já se sabe se o Ataque enfrentou ou não uma carta de Reação.
 */
export interface PromessasAplicadas {
  /** Momentum a ganhar se este Ataque causar Ruptura (Pressão Implacável). */
  readonly momentumNaRuptura: number;
}

export const aplicarPromessasDoAtaque = (ctx: Contexto, alvo: AlvoDoEfeito): PromessasAplicadas => {
  if (alvo.perfil.valores === null) return { momentumNaRuptura: 0 };

  const dano = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoAtaqueDano);
  const impacto = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoAtaqueImpacto);

  const enfrentouReacao = alvo.reacao !== null;
  const seReacao = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoAtaqueSeReacaoDano);
  const semReacao = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoAtaqueSemReacaoImpacto);

  const feiticoDano = temTag(alvo.perfil, 'feitico')
    ? consumirPromessa(ctx, alvo.atacante, CHAVE.proximoFeiticoDano)
    : 0;
  const feiticoImpacto = temTag(alvo.perfil, 'feitico')
    ? consumirPromessa(ctx, alvo.atacante, CHAVE.proximoFeiticoImpacto)
    : 0;

  const totalDano = dano + feiticoDano + (enfrentouReacao ? seReacao : 0);
  const totalImpacto = impacto + feiticoImpacto + (enfrentouReacao ? 0 : semReacao);

  if (totalDano !== 0 || totalImpacto !== 0) {
    somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: totalDano, impacto: totalImpacto });
  }

  return {
    momentumNaRuptura: consumirPromessa(ctx, alvo.atacante, CHAVE.proximoAtaqueMomentumNaRuptura),
  };
};

/** Marca que uma Passiva com limite próprio já foi usada neste turno. */
export const chaveDaPassiva = (carta: CardId): string => `${CHAVE.passivaUsada}:${carta}`;

/** Registra no log uma Carta de Classe que voltou a ficar Pronta por efeito. */
export const emitirProntificacao = (
  ctx: Contexto,
  jogador: PlayerId,
  carta: CardId,
  origem: CardId,
): void => {
  emitir(ctx, { tipo: 'carta-de-classe-prontificada-por-efeito', jogador, carta, origem });
};
