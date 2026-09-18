/*
 * A política de atualização do cliente.
 *
 * Ela responde uma pergunta só: encontrei uma versão nova — aplico agora ou
 * guardo para depois? A resposta depende do que o jogador está fazendo, e não
 * do service worker; por isso ela mora aqui, isolada, e é a única parte da
 * atualização que precisa mudar quando a partida jogável existir.
 *
 * Hoje não existe partida na interface, então a situação é sempre
 * `sem-partida` e a atualização é aplicada sozinha. Quando a partida existir,
 * quem a conhece passa a informar `partida-ativa` e a atualização fica
 * pendente até a partida acabar — recarregar no meio de um duelo é perder o
 * duelo.
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
 * A situação enquanto não existe partida na interface.
 *
 * Existe como função — e não como constante — porque é este o ponto que a
 * etapa da partida vai substituir por uma leitura do estado real.
 */
export const situacaoAtualDoCliente = (): SituacaoDoCliente => 'sem-partida';
