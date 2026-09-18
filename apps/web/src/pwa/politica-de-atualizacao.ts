/*
 * A política de atualização do cliente.
 *
 * Ela responde uma pergunta só: encontrei uma versão nova — aplico agora ou
 * guardo para depois? A resposta depende do que o jogador está fazendo, e não
 * do service worker; por isso ela mora aqui, isolada, e é a única parte da
 * atualização que precisa mudar quando a partida jogável existir.
 *
 * Quem conhece a partida informa `partida-ativa`, e a atualização fica
 * pendente até ela acabar — recarregar no meio de um duelo é perder o duelo.
 * Fora da partida, a troca acontece sozinha.
 */

/** O que o cliente está fazendo agora, do ponto de vista da atualização. */
export type SituacaoDoCliente = 'sem-partida' | 'partida-ativa';

/** O que fazer com uma versão nova que acabou de ficar pronta. */
export type DecisaoDeAtualizacao = 'aplicar' | 'adiar';

/**
 * Decide o destino de uma atualização recém-encontrada.
 *
 * É de propósito uma função pura de um argumento: a decisão é sobre o estado
 * do jogo, não sobre rede, cache ou navegador.
 */
export const decidirAtualizacao = (situacao: SituacaoDoCliente): DecisaoDeAtualizacao =>
  situacao === 'partida-ativa' ? 'adiar' : 'aplicar';

/** É seguro aplicar agora uma atualização que ficou pendente? */
export const podeAplicarPendente = (situacao: SituacaoDoCliente): boolean =>
  decidirAtualizacao(situacao) === 'aplicar';

/**
 * A situação de um cliente que não tem partida nenhuma no ar.
 *
 * Continua existindo para quem não conhece o fluxo de telas — o coordenador
 * fora da árvore do React, por exemplo. Dentro do aplicativo quem responde é
 * a tela: `App` informa `partida-ativa` enquanto a batalha está montada.
 */
export const situacaoAtualDoCliente = (): SituacaoDoCliente => 'sem-partida';
