import type {
  AnotacaoDeEfeito,
  CardId,
  EscolhaPendente,
  EscopoDaAnotacao,
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  PlayerId,
  SlotDeAcao,
} from '@arcane-duel/shared-types';
import { valorDaAnotacao } from '@arcane-duel/shared-types';
import type { ErroDeDominio, EventoUniversal, RespostaDeComando } from '@arcane-duel/rules-engine';
import { anotar } from '@arcane-duel/rules-engine';

/*
 * Contexto de execução de um efeito.
 *
 * O contexto é um acumulador local: ele troca a referência de `partida` por um
 * estado novo a cada passo e junta os eventos na ordem em que aconteceram.
 * Nenhum estado de domínio é modificado no lugar — cada comando do motor
 * devolve um estado novo, e o que o contexto faz é segurar o mais recente. A
 * fronteira pública devolve `{ partida, eventos }` e nunca o acumulador.
 */

export interface Contexto {
  partida: EstadoDaPartida;
  readonly eventos: EventoUniversal[];
}

export const criarContexto = (partida: EstadoDaPartida): Contexto => ({ partida, eventos: [] });

export const jogadorDo = (ctx: Contexto, id: PlayerId): EstadoDeJogador => {
  const encontrado = ctx.partida.jogadores.find((jogador) => jogador.id === id);
  if (encontrado === undefined) throw new Error(`jogador fora da partida: ${id}`);
  return encontrado;
};

export const adversarioDo = (ctx: Contexto, id: PlayerId): EstadoDeJogador => {
  const encontrado = ctx.partida.jogadores.find((jogador) => jogador.id !== id);
  if (encontrado === undefined) throw new Error(`partida sem adversário para ${id}`);
  return encontrado;
};

export const gravarJogador = (ctx: Contexto, jogador: EstadoDeJogador): void => {
  ctx.partida = {
    ...ctx.partida,
    jogadores: [
      ctx.partida.jogadores[0].id === jogador.id ? jogador : ctx.partida.jogadores[0],
      ctx.partida.jogadores[1].id === jogador.id ? jogador : ctx.partida.jogadores[1],
    ],
  };
};

export const emitir = (ctx: Contexto, evento: EventoUniversal): void => {
  ctx.eventos.push(evento);
};

/**
 * Executa um comando do motor dentro do contexto.
 *
 * Um comando que falha devolve o erro para quem chamou e **não** altera o
 * contexto: um efeito que não coube não deixa rastro pela metade.
 */
export const aplicar = (ctx: Contexto, resposta: RespostaDeComando): ErroDeDominio | null => {
  if (!resposta.ok) return resposta.erro;
  ctx.partida = resposta.valor.partida;
  ctx.eventos.push(...resposta.valor.eventos);
  return null;
};

/** Executa um comando que, pela validação já feita, não pode falhar. */
export const aplicarObrigatorio = (ctx: Contexto, resposta: RespostaDeComando): void => {
  const erro = aplicar(ctx, resposta);
  if (erro !== null) {
    throw new Error(`comando obrigatório falhou: ${JSON.stringify(erro)}`);
  }
};

export const slotDe = (jogador: EstadoDeJogador, indice: IndiceDeAcao): SlotDeAcao | undefined =>
  jogador.acoes.find((slot) => slot.indice === indice);

/** Anota um estado temporário e registra o evento correspondente. */
export const registrarAnotacao = (
  ctx: Contexto,
  jogador: PlayerId,
  anotacao: AnotacaoDeEfeito,
): void => {
  gravarJogador(ctx, anotar(jogadorDo(ctx, jogador), anotacao));
  emitir(ctx, {
    tipo: 'anotacao-registrada',
    jogador,
    chave: anotacao.chave,
    origem: anotacao.origem,
    escopo: anotacao.escopo,
    valor: anotacao.valor,
    // A visibilidade viaja junto: o log guarda o que o replay precisa, e quem
    // for entregá-lo a um cliente precisa saber o que filtrar.
    ...(anotacao.visibilidade === undefined ? {} : { visibilidade: anotacao.visibilidade }),
  });
};

/** Marca um limite de "uma vez por turno" e diz se ele ainda estava livre. */
export const consumirLimitePorTurno = (
  ctx: Contexto,
  jogador: PlayerId,
  chave: string,
  origem: CardId,
): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (valorDaAnotacao(atual.anotacoes, chave) > 0) return false;
  registrarAnotacao(ctx, jogador, { chave, origem, escopo: 'turno', valor: 1 });
  return true;
};

/**
 * Registra uma escolha que o dono precisa fazer antes de voltar a agir.
 *
 * Só existe para efeitos que disparam fora da janela de comando de quem
 * escolhe. Escolher por ele seria inventar a decisão.
 */
export const registrarEscolhaPendente = (ctx: Contexto, escolha: EscolhaPendente): void => {
  ctx.partida = {
    ...ctx.partida,
    escolhasPendentes: [...ctx.partida.escolhasPendentes, escolha],
  };
  emitir(ctx, {
    tipo: 'escolha-pendente-registrada',
    jogador: escolha.jogador,
    origem: escolha.origem,
    efeito: escolha.efeito,
    opcoes: escolha.opcoes,
  });
};

export const contador = (ctx: Contexto, jogador: PlayerId, chave: string): number =>
  valorDaAnotacao(jogadorDo(ctx, jogador).anotacoes, chave);

export const somarContador = (
  ctx: Contexto,
  jogador: PlayerId,
  chave: string,
  origem: CardId,
  escopo: EscopoDaAnotacao = 'turno',
  valor = 1,
): void => {
  registrarAnotacao(ctx, jogador, { chave, origem, escopo, valor });
};
