import type {
  EstadoDaPartida,
  EstadoDeJogador,
  PlayerId,
  Resultado,
} from '@arcane-duel/shared-types';
import { falha, sucesso } from '@arcane-duel/shared-types';

import type { ErroDeDominio } from './erros.js';
import type { EventoUniversal } from './eventos.js';

/*
 * Forma de um comando do motor.
 *
 * Todo comando é puro: recebe o estado e devolve um estado novo mais os
 * eventos que aquele comando produziu, na ordem canônica. O estado de entrada
 * nunca é modificado.
 */

export interface ResultadoDoComando {
  readonly partida: EstadoDaPartida;
  readonly eventos: readonly EventoUniversal[];
}

export type RespostaDeComando = Resultado<ResultadoDoComando, ErroDeDominio>;

/** Garante que a partida está em andamento e que o jogador pertence a ela. */
export const exigirJogadorDaPartida = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
): Resultado<EstadoDeJogador, ErroDeDominio> => {
  const encontrado = partida.jogadores.find((atual) => atual.id === jogador);
  return encontrado === undefined
    ? falha({ tipo: 'jogador-desconhecido', jogador })
    : sucesso(encontrado);
};

/** Garante que a partida está em andamento, com turno aberto e já iniciado. */
export const exigirTurnoEmAndamento = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
): Resultado<EstadoDeJogador, ErroDeDominio> => {
  if (partida.situacao === 'aguardando-inicio') return falha({ tipo: 'partida-nao-iniciada' });
  if (partida.situacao === 'encerrada') return falha({ tipo: 'partida-encerrada' });
  if (partida.turno === null) return falha({ tipo: 'partida-nao-iniciada' });
  if (!partida.turno.iniciado) return falha({ tipo: 'turno-nao-iniciado' });

  const doJogador = exigirJogadorDaPartida(partida, jogador);
  if (!doJogador.ok) return doJogador;

  return partida.turno.jogadorAtivo === jogador
    ? doJogador
    : falha({ tipo: 'fora-do-turno', jogador });
};

/**
 * Detecta o fim da partida por Vida.
 *
 * Quando só um jogador chega a zero ou menos, o outro venceu. Quando os dois
 * chegam na mesma resolução, o documento não define o resultado: a partida é
 * encerrada com vencedor `null` e motivo `indefinido`, deixando a decisão
 * explicitamente pendente em vez de inventada.
 */
export const encerrarSeVidaZerou = (partida: EstadoDaPartida): ResultadoDoComando => {
  if (partida.situacao === 'encerrada') return { partida, eventos: [] };

  const derrotados = partida.jogadores.filter((jogador) => jogador.vida <= 0);
  if (derrotados.length === 0) return { partida, eventos: [] };

  const sobrevivente = partida.jogadores.find((jogador) => jogador.vida > 0);
  const vencedor = derrotados.length === 1 ? (sobrevivente?.id ?? null) : null;
  const motivo = vencedor === null ? ('indefinido' as const) : ('vida-zerada' as const);

  return {
    partida: { ...partida, situacao: 'encerrada', desfecho: { vencedor, motivo } },
    eventos: [{ tipo: 'partida-encerrada', vencedor, motivo }],
  };
};
