import type {
  CardId,
  CondicaoId,
  IndiceDeAcao,
  PlayerId,
  RecursoDeCusto,
} from '@arcane-duel/shared-types';
import type { AjusteDeResolucao } from '@arcane-duel/rules-engine';
import {
  ajustarResolucao,
  aplicarCondicao,
  ganharReserva,
  liberarAcaoExtra,
  perderVida,
  recuperarPontosDeAcao,
  registrarModificador,
  restaurarGuarda,
  somarRecurso,
  valorDoRecurso,
} from '@arcane-duel/rules-engine';

import type { Contexto } from './contexto.js';
import { aplicarObrigatorio, emitir, gravarJogador, jogadorDo } from './contexto.js';

/*
 * Pequenas operações que o texto das cartas usa o tempo todo.
 *
 * Cada uma é só a ponte entre uma frase impressa — "ganhe 1 Momentum", "reduza
 * 3 D", "aplique Queimadura 2" — e o comando correspondente do motor, sempre
 * com o evento certo no log.
 */

/** "Recebe +X D e +Y I": modificador sobre a Ação do atacante. */
export const somarAoAtaque = (
  ctx: Contexto,
  atacante: PlayerId,
  indice: IndiceDeAcao,
  modificador: { readonly dano?: number; readonly impacto?: number },
): void => {
  aplicarObrigatorio(ctx, registrarModificador(ctx.partida, atacante, indice, modificador));
};

/** "Reduza X D e Y I": redução trazida pela Resposta. */
export const reduzirNaResposta = (
  ctx: Contexto,
  atacante: PlayerId,
  indice: IndiceDeAcao,
  reducao: { readonly dano?: number; readonly impacto?: number },
): void => {
  aplicarObrigatorio(
    ctx,
    ajustarResolucao(ctx.partida, atacante, indice, {
      reducaoDeDano: reducao.dano ?? 0,
      reducaoDeImpacto: reducao.impacto ?? 0,
    }),
  );
};

/** Ajuste de resolução qualquer: Dano final, Ruptura impedida, texto cancelado. */
export const ajustar = (
  ctx: Contexto,
  atacante: PlayerId,
  indice: IndiceDeAcao,
  ajuste: AjusteDeResolucao,
): void => {
  aplicarObrigatorio(ctx, ajustarResolucao(ctx.partida, atacante, indice, ajuste));
};

/** "Ganhe N Momentum" / "recupere N Mana", respeitando o teto da classe. */
export const ganharRecurso = (
  ctx: Contexto,
  jogador: PlayerId,
  recurso: RecursoDeCusto,
  quantidade: number,
): void => {
  const antes = jogadorDo(ctx, jogador);
  const anterior = valorDoRecurso(antes, recurso);
  if (anterior === null) return;

  const depois = somarRecurso(antes, recurso, quantidade);
  const novo = valorDoRecurso(depois, recurso) ?? anterior;
  if (novo === anterior) return;

  gravarJogador(ctx, depois);
  emitir(ctx, { tipo: 'recurso-alterado', jogador, recurso, delta: novo - anterior, valor: novo });
};

/** "Aplique Queimadura 2", "aplique Lento 1": Condição sobre um personagem. */
export const aplicarCondicaoEm = (
  ctx: Contexto,
  alvo: PlayerId,
  condicao: CondicaoId,
  quantidade: number,
): void => {
  const atual = jogadorDo(ctx, alvo);
  const resultado = aplicarCondicao(atual, condicao, quantidade);
  if (!resultado.ok) return;
  gravarJogador(ctx, resultado.valor);
  emitir(ctx, {
    tipo: 'condicao-aplicada',
    alvo,
    condicao,
    quantidade,
    total: resultado.valor.condicoes[condicao],
  });
};

/** "Recupere 1 AP". */
export const recuperarAp = (ctx: Contexto, jogador: PlayerId, quantidade: number): void => {
  const antes = jogadorDo(ctx, jogador);
  const depois = recuperarPontosDeAcao(antes, quantidade);
  if (depois.pontosDeAcao === antes.pontosDeAcao) return;
  gravarJogador(ctx, depois);
  emitir(ctx, {
    tipo: 'ap-recuperado',
    jogador,
    valor: depois.pontosDeAcao - antes.pontosDeAcao,
  });
};

/** "Ganhe +1 Reserva", respeitando o máximo de dois. */
export const ganharReservaExtra = (ctx: Contexto, jogador: PlayerId, quantidade: number): void => {
  const antes = jogadorDo(ctx, jogador);
  const depois = ganharReserva(antes, quantidade);
  if (depois.reserva === antes.reserva) return;
  gravarJogador(ctx, depois);
  emitir(ctx, { tipo: 'reserva-ganha', jogador, valor: depois.reserva - antes.reserva });
};

/** "Restaure 1 Guarda", sem passar do valor inicial. */
export const restaurarGuardaEm = (ctx: Contexto, jogador: PlayerId, quantidade: number): void => {
  const antes = jogadorDo(ctx, jogador);
  const depois = restaurarGuarda(antes, quantidade);
  if (depois.guarda === antes.guarda) return;
  gravarJogador(ctx, depois);
  emitir(ctx, { tipo: 'guarda-ajustada', jogador, valor: depois.guarda });
};

/** "Ajuste sua Guarda para 3": valor exato, sem Impacto e sem Ruptura. */
export const definirGuarda = (ctx: Contexto, jogador: PlayerId, valor: number): void => {
  gravarJogador(ctx, { ...jogadorDo(ctx, jogador), guarda: valor < 0 ? 0 : valor });
  emitir(ctx, { tipo: 'guarda-ajustada', jogador, valor });
};

/** "O adversário perde N de Vida": perda direta, que não é Dano de Ataque. */
export const perderVidaDireta = (
  ctx: Contexto,
  alvo: PlayerId,
  quantidade: number,
  origem: CardId,
): void => {
  const depois = perderVida(jogadorDo(ctx, alvo), quantidade);
  gravarJogador(ctx, depois);
  emitir(ctx, { tipo: 'vida-perdida', alvo, valor: quantidade, vidaDepois: depois.vida, origem });
};

/** "Você pode realizar uma quarta Ação naquele turno." */
export const abrirAcaoExtra = (ctx: Contexto, jogador: PlayerId, origem: CardId): void => {
  gravarJogador(ctx, liberarAcaoExtra(jogadorDo(ctx, jogador)));
  emitir(ctx, { tipo: 'acao-extra-liberada', jogador, origem });
};
