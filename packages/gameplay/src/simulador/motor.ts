import type {
  CardId,
  EscolhaPendente,
  EstadoDaPartida,
  IndiceDeAcao,
  PlayerId,
} from '@arcane-duel/shared-types';
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
  resolverEscolhaPendente,
  responder,
} from '../partida.js';
import type { Politica } from './politica.js';
import { POLITICA_DE_BASE } from './politica.js';

/*
 * Simulador headless.
 *
 * Roda uma partida inteira sem interface, com as duas políticas decidindo a
 * partir da visão de cada uma. A mesma semente produz a mesma partida.
 *
 * Uma política de simulação só pode produzir comandos **legais**. Se o motor
 * recusar um comando dela, isso é bug do simulador — nunca comportamento normal
 * de partida — e a partida é encerrada e marcada como inválida. Duas exceções
 * conhecidas continuam sendo exceções: a recusa por `interacao-nao-definida`,
 * que é lacuna do documento, e o teto técnico de turnos, que é trava do
 * simulador.
 */

/** Teto técnico de turnos. Não é regra de jogo. */
export const LIMITE_TECNICO_DE_TURNOS = 60;

/** Um comando que a política produziu e o motor recusou. */
export interface ComandoIlegal {
  readonly comando: 'declarar' | 'responder' | 'resolver' | 'escolha-pendente';
  readonly jogador: PlayerId;
  readonly turno: number;
  readonly erro: ErroDeDominio;
}

export type DesfechoSimulado =
  | { readonly tipo: 'vitoria'; readonly vencedor: PlayerId }
  | { readonly tipo: 'indefinido' }
  | { readonly tipo: 'limite-tecnico-de-turnos' }
  | { readonly tipo: 'bloqueio-de-regra'; readonly erro: ErroDeDominio }
  | { readonly tipo: 'comando-ilegal'; readonly primeiro: ComandoIlegal };

export interface RelatorioDaPartida {
  readonly desfecho: DesfechoSimulado;
  readonly turnos: number;
  readonly acoes: number;
  readonly respostasComCarta: number;
  readonly respostasComDefesaInata: number;
  readonly rupturas: number;
  readonly ultimatesUsadas: number;
  readonly passivasReveladas: number;
  readonly passivasAtivadas: number;
  readonly cartasDeClassePorAtivar: number;
  readonly cartasDeClassePorExaurir: number;
  /** Quantas vezes cada carta foi jogada, por identificador. */
  readonly usoPorCarta: Readonly<Record<string, number>>;
  /** Vida que sobrou para quem venceu, ou `null` quando não houve vencedor. */
  readonly vidaDoVencedor: number | null;
  /** Ações recusadas por Lento + Impulso Inicial, a interação ainda não definida. */
  readonly bloqueiosDeLentoComImpulso: number;
  /** Comandos que a política produziu e o motor recusou. Precisa ser vazio. */
  readonly comandosIlegais: readonly ComandoIlegal[];
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
  passivasReveladas: number;
  passivasAtivadas: number;
  cartasDeClassePorAtivar: number;
  cartasDeClassePorExaurir: number;
  bloqueios: number;
  readonly usoPorCarta: Map<string, number>;
}

const somarUso = (usoPorCarta: Map<string, number>, carta: CardId): void => {
  usoPorCarta.set(carta, (usoPorCarta.get(carta) ?? 0) + 1);
};

/*
 * Regra única da frequência por carta.
 *
 * Cada utilização real incrementa a frequência **exatamente uma vez**. Os
 * eventos abaixo são os seis que representam uma carta sendo posta em uso, e
 * cada um deles vale um:
 *
 *   acao-declarada .............. a carta ocupou um espaço de Ação
 *   resposta-registrada ......... a carta de Reação ocupou o espaço de Resposta
 *   carta-de-classe-ativada ..... a Carta de Classe foi Ativada
 *   carta-de-classe-exaurida .... a Carta de Classe foi Exaurida
 *   passiva-revelada ............ a Passiva entrou em jogo
 *   passiva-ativada ............. a Passiva foi Ativada
 *
 * `ultimate-consumida` **não** entra nessa conta: a Ultimate já foi contada
 * quando ocupou o espaço de Ação ou de Resposta, e somá-la de novo aqui era o
 * que dobrava a frequência dela. Ela continua alimentando o contador próprio
 * `ultimatesUsadas`, que é outra métrica e mede outra coisa.
 *
 * Os contadores específicos — Ultimates, Passivas reveladas, Passivas
 * Ativadas, Cartas de Classe por Ativar e por Exaurir — seguem separados e
 * nenhum deles duplica a frequência geral.
 */
const contar = (acumulador: Acumulador, eventos: readonly EventoUniversal[]): void => {
  for (const evento of eventos) {
    if (evento.tipo === 'ruptura') acumulador.rupturas += 1;
    else if (evento.tipo === 'ultimate-consumida') acumulador.ultimatesUsadas += 1;
    else if (evento.tipo === 'defesa-inata-usada') acumulador.respostasComDefesaInata += 1;
    else if (evento.tipo === 'passiva-revelada') {
      acumulador.passivasReveladas += 1;
      somarUso(acumulador.usoPorCarta, evento.carta);
    } else if (evento.tipo === 'passiva-ativada') {
      acumulador.passivasAtivadas += 1;
      somarUso(acumulador.usoPorCarta, evento.carta);
    } else if (evento.tipo === 'carta-de-classe-ativada') {
      acumulador.cartasDeClassePorAtivar += 1;
      somarUso(acumulador.usoPorCarta, evento.carta);
    } else if (evento.tipo === 'carta-de-classe-exaurida') {
      acumulador.cartasDeClassePorExaurir += 1;
      somarUso(acumulador.usoPorCarta, evento.carta);
    } else if (evento.tipo === 'acao-declarada') {
      somarUso(acumulador.usoPorCarta, evento.carta);
    } else if (evento.tipo === 'resposta-registrada') {
      if (evento.resposta.tipo === 'carta-de-reacao') {
        acumulador.respostasComCarta += 1;
        somarUso(acumulador.usoPorCarta, evento.resposta.perfil.carta);
      }
    }
  }
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

const exigir = (
  resposta: Resposta,
): { partida: EstadoDaPartida; eventos: readonly EventoUniversal[] } => {
  if (!resposta.ok) throw new ErroDeSimulacao(resposta.erro);
  return { partida: resposta.valor.partida, eventos: resposta.valor.eventos };
};

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
    passivasReveladas: 0,
    passivasAtivadas: 0,
    cartasDeClassePorAtivar: 0,
    cartasDeClassePorExaurir: 0,
    bloqueios: 0,
    usoPorCarta: new Map<string, number>(),
  };

  const eventos: EventoUniversal[] = [];
  const ilegais: ComandoIlegal[] = [];
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

  /** Registra um comando ilegal e encerra a partida como inválida. */
  const acusarIlegal = (
    comando: ComandoIlegal['comando'],
    jogador: PlayerId,
    erro: ErroDeDominio,
  ): void => {
    const ocorrencia: ComandoIlegal = {
      comando,
      jogador,
      turno: partida.turno?.numero ?? 0,
      erro,
    };
    ilegais.push(ocorrencia);
    desfecho ??= { tipo: 'comando-ilegal', primeiro: ocorrencia };
  };

  /**
   * Responde as escolhas pendentes de um jogador.
   *
   * Uma pendência trava quem a deve, então ela é resolvida assim que aparece —
   * é o que um cliente faria ao mostrar a pergunta na tela.
   */
  const resolverPendencias = (jogador: PlayerId): boolean => {
    let restantes = partida.escolhasPendentes.filter((escolha) => escolha.jogador === jogador);
    while (restantes.length > 0) {
      const pendente: EscolhaPendente | undefined = restantes[0];
      if (pendente === undefined) break;

      const escolhida = politicas[jogador]?.escolherPendencia(
        projetarParaJogador(partida, jogador),
        jogador,
        pendente,
        rng,
      );
      if (escolhida === undefined) {
        acusarIlegal('escolha-pendente', jogador, { tipo: 'sem-escolha-pendente', jogador });
        return false;
      }

      const resultado = resolverEscolhaPendente(partida, jogador, escolhida);
      if (!resultado.ok) {
        acusarIlegal('escolha-pendente', jogador, resultado.erro);
        return false;
      }
      partida = registrar({
        partida: resultado.valor.partida,
        eventos: resultado.valor.eventos,
      });
      restantes = partida.escolhasPendentes.filter((escolha) => escolha.jogador === jogador);
    }
    return true;
  };

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

    if (!resolverPendencias(ativo) || !resolverPendencias(passivo)) break;

    let seguir = true;
    while (seguir && partida.situacao === 'em-andamento' && desfecho === null) {
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
          // Lacuna conhecida do documento, contada à parte: não é bug e não é
          // vitória, derrota nem empate.
          acumulador.bloqueios += 1;
          desfecho = { tipo: 'bloqueio-de-regra', erro: declarada.erro };
        } else {
          acusarIlegal('declarar', ativo, declarada.erro);
        }
        seguir = false;
        break;
      }
      partida = registrar({ partida: declarada.valor.partida, eventos: declarada.valor.eventos });
      acumulador.acoes += 1;

      if (!resolverPendencias(passivo)) {
        seguir = false;
        break;
      }

      const escolhaDeResposta = politicas[passivo]?.escolherResposta(
        projetarParaJogador(partida, passivo),
        passivo,
        indice,
        rng,
      );
      if (escolhaDeResposta !== undefined && escolhaDeResposta.tipo !== 'sem-resposta') {
        const respondida = responder(partida, passivo, indice, escolhaDeResposta);
        if (!respondida.ok) {
          acusarIlegal('responder', passivo, respondida.erro);
          seguir = false;
          break;
        }
        partida = registrar({
          partida: respondida.valor.partida,
          eventos: respondida.valor.eventos,
        });
      }

      const resolvida = resolver(partida, ativo, indice);
      if (!resolvida.ok) {
        acusarIlegal('resolver', ativo, resolvida.erro);
        seguir = false;
        break;
      }
      partida = registrar({ partida: resolvida.valor.partida, eventos: resolvida.valor.eventos });

      if (!resolverPendencias(ativo) || !resolverPendencias(passivo)) {
        seguir = false;
        break;
      }
    }

    if (desfecho !== null) break;
    if (partida.situacao !== 'em-andamento') break;

    partida = registrar(exigir(fecharTurno(partida, ativo)));
  }

  if (desfecho === null) {
    const vencedor = partida.desfecho?.vencedor ?? null;
    if (vencedor !== null) desfecho = { tipo: 'vitoria', vencedor };
    else if (partida.situacao === 'encerrada') desfecho = { tipo: 'indefinido' };
    else desfecho = { tipo: 'limite-tecnico-de-turnos' };
  }

  const vencedorFinal = desfecho.tipo === 'vitoria' ? desfecho.vencedor : null;
  const vidaDoVencedor =
    vencedorFinal === null
      ? null
      : (partida.jogadores.find((jogador) => jogador.id === vencedorFinal)?.vida ?? null);

  return {
    desfecho,
    turnos,
    acoes: acumulador.acoes,
    respostasComCarta: acumulador.respostasComCarta,
    respostasComDefesaInata: acumulador.respostasComDefesaInata,
    rupturas: acumulador.rupturas,
    ultimatesUsadas: acumulador.ultimatesUsadas,
    passivasReveladas: acumulador.passivasReveladas,
    passivasAtivadas: acumulador.passivasAtivadas,
    cartasDeClassePorAtivar: acumulador.cartasDeClassePorAtivar,
    cartasDeClassePorExaurir: acumulador.cartasDeClassePorExaurir,
    usoPorCarta: Object.fromEntries(acumulador.usoPorCarta),
    vidaDoVencedor,
    bloqueiosDeLentoComImpulso: acumulador.bloqueios,
    comandosIlegais: ilegais,
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
