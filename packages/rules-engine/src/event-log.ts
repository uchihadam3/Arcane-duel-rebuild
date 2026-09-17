import type { CarimboDeVersao, MatchId } from '@arcane-duel/shared-types';

/**
 * Envelope de um evento canônico de partida.
 *
 * O log é a fonte de verdade de um replay: ele registra comandos e resultados
 * canônicos, não animações (FULL_GAME_SPEC.md §23).
 *
 * O envelope exige apenas a posição e o tipo. Os dados de cada evento ficam
 * nos campos do próprio evento — os eventos universais do combate são planos,
 * e obrigar uma `carga` genérica só acrescentaria um nível de aninhamento sem
 * ganhar nada.
 */
export interface EventoDePartida<TTipo extends string = string> {
  /** Posição do evento no log, começando em 1 e sempre contígua. */
  readonly sequencia: number;
  readonly tipo: TTipo;
}

export interface CabecalhoDeReplay {
  readonly matchId: MatchId;
  readonly semente: string;
  readonly versoes: CarimboDeVersao;
}

export interface LogDeEventos<TEvento extends EventoDePartida = EventoDePartida> {
  readonly cabecalho: CabecalhoDeReplay;
  /** Registra um evento e devolve o envelope numerado. */
  readonly registrar: <T extends Omit<TEvento, 'sequencia'>>(
    evento: T,
  ) => T & { readonly sequencia: number };
  /** Cópia imutável de tudo que foi registrado até agora. */
  readonly eventos: () => readonly TEvento[];
  readonly tamanho: () => number;
}

export const criarLogDeEventos = <TEvento extends EventoDePartida = EventoDePartida>(
  cabecalho: CabecalhoDeReplay,
): LogDeEventos<TEvento> => {
  const registrados: TEvento[] = [];

  return {
    cabecalho,
    registrar: (evento) => {
      const numerado = { ...evento, sequencia: registrados.length + 1 };
      registrados.push(numerado as unknown as TEvento);
      return numerado;
    },
    eventos: () => [...registrados],
    tamanho: () => registrados.length,
  };
};

/**
 * Reconstrói um estado aplicando os eventos em ordem.
 *
 * Como o motor é determinístico, reproduzir o mesmo log sobre o mesmo estado
 * inicial precisa devolver exatamente o mesmo estado final.
 */
export const reproduzir = <TEstado, TEvento extends EventoDePartida>(
  estadoInicial: TEstado,
  eventos: readonly TEvento[],
  aplicar: (estado: TEstado, evento: TEvento) => TEstado,
): TEstado => eventos.reduce(aplicar, estadoInicial);

/** Verifica que o log está íntegro: sequências contíguas começando em 1. */
export const logEstaIntegro = (eventos: readonly EventoDePartida[]): boolean =>
  eventos.every((evento, indice) => evento.sequencia === indice + 1);
