import type { EstadoDaPartida, IndiceDeAcao, PlayerId } from '@arcane-duel/shared-types';
import { matchId, playerId } from '@arcane-duel/shared-types';
import type { BuildEquipada, ErroDeDominio, EventoUniversal } from '@arcane-duel/rules-engine';
import { criarAleatorio, projetarParaJogador } from '@arcane-duel/rules-engine';

import type { Resposta } from '../partida.js';
import {
  abrirTurno,
  declarar,
  fecharTurno,
  iniciar,
  montarPartida,
  resolver,
  responder,
} from '../partida.js';
import type { Politica } from './politica.js';
import { POLITICA_DE_BASE } from './politica.js';

/*
 * Simulador headless.
 *
 * Roda uma partida inteira sem interface nenhuma, com as duas políticas
 * decidindo a partir da visão de cada uma. A mesma semente produz a mesma
 * partida.
 */

/** Teto técnico de turnos. Não é regra de jogo: é uma trava do simulador. */
export const LIMITE_TECNICO_DE_TURNOS = 60;

export type DesfechoSimulado =
  | { readonly tipo: 'vitoria'; readonly vencedor: PlayerId }
  | { readonly tipo: 'indefinido' }
  | { readonly tipo: 'limite-tecnico-de-turnos' }
  | { readonly tipo: 'bloqueio-de-regra'; readonly erro: ErroDeDominio };

export interface RelatorioDaPartida {
  readonly desfecho: DesfechoSimulado;
  readonly turnos: number;
  readonly acoes: number;
  readonly respostasComCarta: number;
  readonly respostasComDefesaInata: number;
  readonly rupturas: number;
  readonly ultimatesUsadas: number;
  /** Ações recusadas por Lento + Impulso Inicial, a interação ainda não definida. */
  readonly bloqueiosDeLentoComImpulso: number;
  readonly vidaFinal: Readonly<Record<string, number>>;
  readonly primeiroJogador: PlayerId;
  readonly partida: EstadoDaPartida;
  readonly eventos: readonly EventoUniversal[];
}

export interface ConfiguracaoDaSimulacao {
  readonly semente: string;
  readonly buildA: BuildEquipada;
  readonly buildB: BuildEquipada;
  readonly primeiroJogador: 'a' | 'b';
  readonly politicaA?: Politica;
  readonly politicaB?: Politica;
  readonly limiteDeTurnos?: number;
}

const JOGADOR_A: PlayerId = playerId('jogador-a');
const JOGADOR_B: PlayerId = playerId('jogador-b');

interface Acumulador {
  acoes: number;
  respostasComCarta: number;
  respostasComDefesaInata: number;
  rupturas: number;
  ultimatesUsadas: number;
  bloqueios: number;
}

const contar = (acumulador: Acumulador, eventos: readonly EventoUniversal[]): void => {
  for (const evento of eventos) {
    if (evento.tipo === 'ruptura') acumulador.rupturas += 1;
    else if (evento.tipo === 'ultimate-consumida') acumulador.ultimatesUsadas += 1;
    else if (evento.tipo === 'defesa-inata-usada') acumulador.respostasComDefesaInata += 1;
    else if (evento.tipo === 'resposta-registrada' && evento.resposta.tipo === 'carta-de-reacao') {
      acumulador.respostasComCarta += 1;
    }
  }
};

const exigir = (
  resposta: Resposta,
): { partida: EstadoDaPartida; eventos: readonly EventoUniversal[] } => {
  if (!resposta.ok) throw new ErroDeSimulacao(resposta.erro);
  return { partida: resposta.valor.partida, eventos: resposta.valor.eventos };
};

/** Falha de comando que a simulação não sabe contornar. */
export class ErroDeSimulacao extends Error {
  public readonly erro: ErroDeDominio;

  public constructor(erro: ErroDeDominio) {
    super(`comando recusado: ${JSON.stringify(erro)}`);
    this.name = 'ErroDeSimulacao';
    this.erro = erro;
  }
}

/**
 * Roda uma partida do começo ao fim.
 *
 * Uma recusa de `interacao-nao-definida` **não** vira vitória, derrota nem
 * empate: ela encerra a partida como bloqueio de regra e é contada à parte, do
 * jeito que uma lacuna do documento merece ser tratada.
 */
export const simularPartida = (configuracao: ConfiguracaoDaSimulacao): RelatorioDaPartida => {
  const rng = criarAleatorio(configuracao.semente);
  const politicas: Readonly<Record<string, Politica>> = {
    [JOGADOR_A]: configuracao.politicaA ?? POLITICA_DE_BASE,
    [JOGADOR_B]: configuracao.politicaB ?? POLITICA_DE_BASE,
  };

  const montada = montarPartida({
    id: matchId(`sim:${configuracao.semente}`),
    semente: configuracao.semente,
    jogadores: [
      { id: JOGADOR_A, build: configuracao.buildA },
      { id: JOGADOR_B, build: configuracao.buildB },
    ],
  });
  if (!montada.ok) throw new ErroDeSimulacao(montada.erro[0] ?? { tipo: 'partida-nao-iniciada' });

  const primeiro = configuracao.primeiroJogador === 'a' ? JOGADOR_A : JOGADOR_B;
  const acumulador: Acumulador = {
    acoes: 0,
    respostasComCarta: 0,
    respostasComDefesaInata: 0,
    rupturas: 0,
    ultimatesUsadas: 0,
    bloqueios: 0,
  };

  const eventos: EventoUniversal[] = [];
  const registrar = (resultado: {
    partida: EstadoDaPartida;
    eventos: readonly EventoUniversal[];
  }): EstadoDaPartida => {
    eventos.push(...resultado.eventos);
    contar(acumulador, resultado.eventos);
    return resultado.partida;
  };

  let partida = registrar(exigir(iniciar(montada.valor, primeiro)));
  const limite = configuracao.limiteDeTurnos ?? LIMITE_TECNICO_DE_TURNOS;
  let desfecho: DesfechoSimulado | null = null;
  let turnos = 0;

  while (partida.situacao === 'em-andamento' && desfecho === null) {
    const turno = partida.turno;
    if (turno === null) break;
    if (turno.numero > limite) {
      desfecho = { tipo: 'limite-tecnico-de-turnos' };
      break;
    }

    const ativo = turno.jogadorAtivo;
    const passivo = partida.jogadores.find((jogador) => jogador.id !== ativo)?.id ?? JOGADOR_B;
    partida = registrar(exigir(abrirTurno(partida, ativo)));
    turnos = turno.numero;

    let seguir = true;
    while (seguir && partida.situacao === 'em-andamento') {
      const eu = partida.jogadores.find((jogador) => jogador.id === ativo);
      if (eu === undefined || eu.acoesRealizadasNoTurno >= eu.acoesPermitidasNoTurno) break;

      const pedido = politicas[ativo]?.escolherAcao(
        projetarParaJogador(partida, ativo),
        ativo,
        rng,
      );
      if (pedido === null || pedido === undefined) break;

      const indice = eu.acoesRealizadasNoTurno as IndiceDeAcao;
      const declarada = declarar(partida, ativo, pedido);
      if (!declarada.ok) {
        if (declarada.erro.tipo === 'interacao-nao-definida') {
          acumulador.bloqueios += 1;
          desfecho = { tipo: 'bloqueio-de-regra', erro: declarada.erro };
          seguir = false;
          break;
        }
        // Qualquer outra recusa significa que a política ofereceu uma jogada
        // ilegal: ela para de agir neste turno em vez de insistir.
        seguir = false;
        break;
      }
      partida = registrar({ partida: declarada.valor.partida, eventos: declarada.valor.eventos });
      acumulador.acoes += 1;

      const escolhaDeResposta = politicas[passivo]?.escolherResposta(
        projetarParaJogador(partida, passivo),
        passivo,
        indice,
        rng,
      );
      if (escolhaDeResposta !== undefined && escolhaDeResposta.tipo !== 'sem-resposta') {
        const respondida = responder(partida, passivo, indice, escolhaDeResposta);
        if (respondida.ok) {
          partida = registrar({
            partida: respondida.valor.partida,
            eventos: respondida.valor.eventos,
          });
        }
      }

      const resolvida = resolver(partida, ativo, indice);
      if (!resolvida.ok) {
        seguir = false;
        break;
      }
      partida = registrar({ partida: resolvida.valor.partida, eventos: resolvida.valor.eventos });
    }

    if (desfecho !== null) break;
    if (partida.situacao !== 'em-andamento') break;

    partida = registrar(exigir(fecharTurno(partida, ativo)));
  }

  if (desfecho === null) {
    const vencedor = partida.desfecho?.vencedor ?? null;
    if (vencedor !== null) {
      desfecho = { tipo: 'vitoria', vencedor };
    } else if (partida.situacao === 'encerrada') {
      desfecho = { tipo: 'indefinido' };
    } else {
      desfecho = { tipo: 'limite-tecnico-de-turnos' };
    }
  }

  return {
    desfecho,
    turnos,
    acoes: acumulador.acoes,
    respostasComCarta: acumulador.respostasComCarta,
    respostasComDefesaInata: acumulador.respostasComDefesaInata,
    rupturas: acumulador.rupturas,
    ultimatesUsadas: acumulador.ultimatesUsadas,
    bloqueiosDeLentoComImpulso: acumulador.bloqueios,
    vidaFinal: {
      [partida.jogadores[0].id]: partida.jogadores[0].vida,
      [partida.jogadores[1].id]: partida.jogadores[1].vida,
    },
    primeiroJogador: primeiro,
    partida,
    eventos,
  };
};

export { JOGADOR_A, JOGADOR_B };
