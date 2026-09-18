import type {
  CardId,
  CondicaoId,
  IndiceDeAcao,
  PlayerId,
  RecursoDeCusto,
} from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';
import type { AjusteDeResolucao } from '@arcane-duel/rules-engine';
import {
  LIMITE_DE_CONDICAO,
  ajustarResolucao,
  aplicarCondicao,
  condicoesAtivas,
  ganharReserva,
  liberarAcaoExtra,
  perderVida,
  perderVidaComoCusto,
  recuperarPontosDeAcao,
  removerCondicao,
  restaurarVida,
  reduzirGuardaComoCusto,
  registrarModificador,
  restaurarGuarda,
  somarRecurso,
  valorDoRecurso,
} from '@arcane-duel/rules-engine';

import { CHAVE } from './chaves.js';
import type { Contexto } from './contexto.js';
import {
  adversarioDo,
  aplicarObrigatorio,
  contador,
  emitir,
  gravarJogador,
  jogadorDo,
  registrarAnotacao,
} from './contexto.js';

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
  // "Condições que esta ação aplicaria a você não são aplicadas": a imunidade
  // vale só pela Ação em curso, e por isso a anotação é de escopo `acao`.
  if (contador(ctx, alvo, CHAVE.imunidadeACondicoes) > 0) return;
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
  // "Você não pode restaurar Guarda por efeitos próprios neste turno."
  if (contador(ctx, jogador, CHAVE.proibidoRestaurarGuarda) > 0) return;
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

/*
 * Vida e Guarda: quatro operações que não são a mesma coisa.
 *
 * Cada uma tem evento próprio para que nenhuma carta precise comparar texto
 * para saber se o que aconteceu foi Dano, perda direta, preço pago ou cura.
 */

/**
 * "Restaure N Vida." Devolve quanto entrou **de fato**.
 *
 * O valor efetivo é o que os gatilhos leem: quem está com 29 e restaura 3
 * restaurou 1, e "quando restaurar Vida" precisa ver 1.
 */
const MALDICAO_DA_FOME = cardId('BRC05');

/**
 * "Maldição da Fome: quando o adversário restaurar Vida, reduza a restauração."
 *
 * A Maldição é a única carta do catálogo que mexe na cura **alheia**, venha ela
 * de qual classe vier, então ela é lida aqui — no único funil por onde toda
 * restauração de Vida passa — e não dentro do módulo do Bruxo.
 */
const fomeDoAdversario = (
  ctx: Contexto,
  jogador: PlayerId,
): { readonly reducao: number; readonly cobra: boolean } => {
  const inimigo = adversarioDo(ctx, jogador);
  if (inimigo.removidas.includes(MALDICAO_DA_FOME)) return { reducao: 4, cobra: true };
  const ativada = inimigo.cartasDeClasse.some(
    (item) => item.carta === MALDICAO_DA_FOME && item.estado === 'ativada',
  );
  return ativada ? { reducao: 1, cobra: false } : { reducao: 0, cobra: false };
};

export const restaurarVidaEm = (
  ctx: Contexto,
  jogador: PlayerId,
  quantidade: number,
  origem: CardId,
): number => {
  const fome = fomeDoAdversario(ctx, jogador);
  if (fome.cobra) perderVidaDireta(ctx, jogador, 1, MALDICAO_DA_FOME);
  const pedida = Math.max(0, quantidade - fome.reducao);
  if (pedida === 0) return 0;

  const resultado = restaurarVida(jogadorDo(ctx, jogador), pedida);
  if (resultado.restaurado === 0) return 0;

  gravarJogador(ctx, resultado.jogador);
  // "Se você restaurou Vida neste turno" é pergunta de várias cartas: a marca
  // fica aqui para que nenhuma delas precise varrer o log de eventos.
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.restaurouVidaNoTurno,
    origem,
    escopo: 'turno',
    valor: 1,
  });
  emitir(ctx, {
    tipo: 'vida-restaurada',
    alvo: jogador,
    pedido: resultado.pedido,
    restaurado: resultado.restaurado,
    vidaDepois: resultado.jogador.vida,
    origem,
  });
  return resultado.restaurado;
};

/** "Perca N Vida" como preço de uma jogada. Não é Dano e não pode ser reduzida. */
export const pagarComVida = (
  ctx: Contexto,
  jogador: PlayerId,
  quantidade: number,
  origem: CardId,
): number => {
  const resultado = perderVidaComoCusto(jogadorDo(ctx, jogador), quantidade);
  if (resultado.perdido === 0) return 0;

  gravarJogador(ctx, resultado.jogador);
  // "quando perder Vida por um efeito próprio" é gatilho de carta: a marca
  // nasce aqui porque é aqui que o preço em Vida é efetivamente pago.
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.perdeuVidaPorEfeitoProprio,
    origem,
    escopo: 'turno',
    valor: 1,
  });
  // "Se já perdeu pelo menos 2 Vida por efeitos próprios neste turno" pergunta
  // por pontos, não por vezes: o total do turno mora em chave própria.
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.vidaPerdidaComoCusto,
    origem,
    escopo: 'turno',
    valor: resultado.perdido,
  });
  // "Quando usar 2 custos diferentes de Vida no mesmo turno": uma marca por
  // origem, para que o mesmo preço pago duas vezes continue sendo um só custo.
  registrarAnotacao(ctx, jogador, {
    chave: `${CHAVE.custoDeVidaPorCarta}:${origem}`,
    origem,
    escopo: 'turno',
    valor: 1,
  });
  // "Quando perder Vida por efeito próprio **durante** uma ação ofensiva": o
  // Pacto de Sangue precisa saber que o preço saiu dentro desta Ação.
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.vidaPagaNaAcao,
    origem,
    escopo: 'acao',
    valor: resultado.perdido,
  });
  emitir(ctx, {
    tipo: 'vida-paga-como-custo',
    jogador,
    valor: resultado.perdido,
    vidaDepois: resultado.jogador.vida,
    origem,
  });
  return resultado.perdido;
};

/** "Reduza voluntariamente sua Guarda em N." Nunca provoca Ruptura. */
export const pagarComGuarda = (
  ctx: Contexto,
  jogador: PlayerId,
  quantidade: number,
  origem: CardId,
): number => {
  const resultado = reduzirGuardaComoCusto(jogadorDo(ctx, jogador), quantidade);
  if (resultado.reduzido === 0) return 0;

  gravarJogador(ctx, resultado.jogador);
  emitir(ctx, {
    tipo: 'guarda-reduzida-como-custo',
    jogador,
    valor: resultado.reduzido,
    guardaDepois: resultado.jogador.guarda,
    origem,
  });
  return resultado.reduzido;
};

/** "Remova 1 Condição negativa." A Condição vem escolhida por quem joga. */
export const removerCondicaoEm = (
  ctx: Contexto,
  jogador: PlayerId,
  condicao: CondicaoId,
  quantidade = 1,
): number => {
  const atual = jogadorDo(ctx, jogador);
  const tinha = atual.condicoes[condicao];
  if (tinha <= 0) return 0;

  const removido = Math.min(tinha, quantidade);
  gravarJogador(ctx, removerCondicao(atual, condicao, removido));
  emitir(ctx, { tipo: 'condicao-removida', alvo: jogador, condicao, quantidade: removido });
  return removido;
};

/** "Remova todas as Condições negativas." */
export const limparCondicoesNegativas = (ctx: Contexto, jogador: PlayerId): number => {
  let total = 0;
  for (const condicao of condicoesAtivas(jogadorDo(ctx, jogador))) {
    total += removerCondicaoEm(ctx, jogador, condicao, LIMITE_DE_CONDICAO[condicao]);
  }
  return total;
};
