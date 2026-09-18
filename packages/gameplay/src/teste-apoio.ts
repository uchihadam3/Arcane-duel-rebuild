import type {
  CardId,
  EstadoDeJuramento,
  FormaDoDruida,
  EstagioDeDevocao,
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  PlayerId,
} from '@arcane-duel/shared-types';
import { cardId, matchId, playerId } from '@arcane-duel/shared-types';
import type { BuildEquipada, ErroDeDominio, EventoUniversal } from '@arcane-duel/rules-engine';
import { PERSONAGEM_DA_CLASSE } from '@arcane-duel/card-data';

import type { PedidoDeAcao, PedidoDeResposta, Resposta } from './partida.js';
import {
  abrirTurno,
  declarar,
  fecharTurno,
  iniciar,
  montarPartida,
  resolver,
  responder,
} from './partida.js';

/*
 * Apoio dos testes de carta.
 *
 * Cada teste monta uma mesa mínima e controlada: a carta que ele quer provar
 * está na mão, o resto do estado é posto à mão para isolar o efeito. Nada aqui
 * contorna o motor — as jogadas passam pela mesma API autoritativa que uma
 * partida de verdade usa.
 */

export const A: PlayerId = playerId('jogador-a');
export const B: PlayerId = playerId('jogador-b');

const HABILIDADES_DE_ENCHIMENTO = {
  guerreiro: ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08'],
  mago: ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08'],
  clerigo: ['C01', 'C02', 'C08', 'C12', 'C17', 'C05', 'C06', 'C09'],
  necromante: ['N01', 'N02', 'N03', 'N04', 'N07', 'N14', 'N16', 'N17'],
  paladino: ['P01', 'P03', 'P05', 'P06', 'P10', 'P11', 'P15', 'P18'],
  ladino: ['L01', 'L02', 'L03', 'L06', 'L07', 'L11', 'L15', 'L16'],
  bardo: ['B01', 'B02', 'B04', 'B08', 'B14', 'B18', 'B10', 'B09'],
  monge: ['MO01', 'MO04', 'MO07', 'MO11', 'MO13', 'MO17', 'MO02', 'MO05'],
  patrulheiro: ['R01', 'R03', 'R06', 'R10', 'R11', 'R12', 'R16', 'R17'],
  barbaro: ['BA01', 'BA04', 'BA07', 'BA08', 'BA11', 'BA16', 'BA05', 'BA06'],
  druida: ['D01', 'D04', 'D09', 'D11', 'D13', 'D16', 'D17', 'D05'],
} as const;

/*
 * Passivas padrão dos testes.
 *
 * São escolhidas de propósito entre as que **não** interferem em combate
 * comum: Instinto de Ferro e Véu Prismático, por exemplo, se revelam sozinhos
 * diante de qualquer Ataque que ameace Ruptura e mudariam o resultado de quase
 * todo teste de Ataque. Cada teste que quer uma Passiva específica pede por ela.
 */
const PADROES = {
  guerreiro: {
    passivas: ['WP02', 'WP05', 'WP09', 'WP10'],
    cartasDeClasse: ['WC01', 'WC02'],
    ultimate: 'WU01',
  },
  mago: {
    passivas: ['MP01', 'MP02', 'MP04', 'MP09'],
    cartasDeClasse: ['MC01', 'MC02'],
    ultimate: 'MU01',
  },
  clerigo: {
    passivas: ['CP03', 'CP06', 'CP07', 'CP10'],
    cartasDeClasse: ['CC01', 'CC04'],
    ultimate: 'CU01',
  },
  necromante: {
    passivas: ['NP07', 'NP08', 'NP09', 'NP10'],
    cartasDeClasse: ['NC01', 'NC06'],
    ultimate: 'NU01',
  },
  paladino: {
    passivas: ['PP07', 'PP08', 'PP09', 'PP10'],
    cartasDeClasse: ['PC01', 'PC04'],
    ultimate: 'PU01',
  },
  ladino: {
    passivas: ['LP04', 'LP08', 'LP09', 'LP10'],
    cartasDeClasse: ['LC03', 'LC06'],
    ultimate: 'LU01',
  },
  bardo: {
    passivas: ['BP05', 'BP07', 'BP08', 'BP10'],
    cartasDeClasse: ['BC03', 'BC05'],
    ultimate: 'BU02',
  },
  monge: {
    passivas: ['MOP05', 'MOP07', 'MOP08', 'MOP10'],
    cartasDeClasse: ['MOC03', 'MOC06'],
    ultimate: 'MOU01',
  },
  patrulheiro: {
    passivas: ['RP05', 'RP06', 'RP07', 'RP08'],
    cartasDeClasse: ['RC02', 'RC05'],
    ultimate: 'RU02',
  },
  barbaro: {
    passivas: ['BAP06', 'BAP08', 'BAP09', 'BAP10'],
    cartasDeClasse: ['BAC02', 'BAC05'],
    ultimate: 'BAU01',
  },
  druida: {
    passivas: ['DP03', 'DP08', 'DP09', 'DP10'],
    cartasDeClasse: ['DC02', 'DC05'],
    ultimate: 'DU01',
  },
} as const;

export interface OpcoesDeBuild {
  readonly habilidades?: readonly string[];
  readonly passivas?: readonly string[];
  readonly cartasDeClasse?: readonly string[];
  readonly ultimate?: string;
}

/**
 * Monta uma build válida a partir de códigos de carta.
 *
 * As habilidades informadas entram primeiro; o resto é completado com cartas da
 * própria classe até as oito exigidas pela composição (§3).
 */
export type ClasseDeTeste = keyof typeof HABILIDADES_DE_ENCHIMENTO;

export const build = (classe: ClasseDeTeste, opcoes: OpcoesDeBuild = {}): BuildEquipada => {
  const pedidas = opcoes.habilidades ?? [];
  const enchimento = HABILIDADES_DE_ENCHIMENTO[classe].filter(
    (codigo) => !pedidas.includes(codigo),
  );
  const habilidades = [...pedidas, ...enchimento].slice(0, 8);

  const padrao = PADROES[classe];
  const passivas = opcoes.passivas ?? padrao.passivas;
  const cartasDeClasse = opcoes.cartasDeClasse ?? padrao.cartasDeClasse;

  return {
    classe,
    personagem: PERSONAGEM_DA_CLASSE[classe],
    habilidades: habilidades.map((codigo) => cardId(codigo)),
    passivas: passivas.map((codigo) => cardId(codigo)),
    cartasDeClasse: cartasDeClasse.map((codigo) => cardId(codigo)),
    ultimate: cardId(opcoes.ultimate ?? padrao.ultimate),
  };
};

export const exigir = (resposta: Resposta): EstadoDaPartida => {
  if (!resposta.ok) throw new Error(`comando recusado: ${JSON.stringify(resposta.erro)}`);
  return resposta.valor.partida;
};

export const eventosDe = (resposta: Resposta): readonly EventoUniversal[] => {
  if (!resposta.ok) throw new Error(`comando recusado: ${JSON.stringify(resposta.erro)}`);
  return resposta.valor.eventos;
};

export const erroDe = (resposta: Resposta): ErroDeDominio => {
  if (resposta.ok) throw new Error('o comando deveria ter sido recusado');
  return resposta.erro;
};

/** Mesa montada com o turno de A já aberto. */
export const duelo = (
  buildA: BuildEquipada,
  buildB: BuildEquipada,
  primeiro: PlayerId = A,
): EstadoDaPartida => {
  const montada = montarPartida({
    id: matchId('partida-de-teste'),
    semente: 'teste',
    jogadores: [
      { id: A, build: buildA },
      { id: B, build: buildB },
    ],
  });
  if (!montada.ok) throw new Error(`build inválida: ${JSON.stringify(montada.erro)}`);

  return exigir(abrirTurno(exigir(iniciar(montada.valor, primeiro)), primeiro));
};

export const jogador = (partida: EstadoDaPartida, id: PlayerId): EstadoDeJogador => {
  const encontrado = partida.jogadores.find((atual) => atual.id === id);
  if (encontrado === undefined) throw new Error(`jogador ${id} fora da partida`);
  return encontrado;
};

/** Reescreve campos de um jogador para isolar o que o teste quer provar. */
export const com = (
  partida: EstadoDaPartida,
  id: PlayerId,
  mudanca: Partial<EstadoDeJogador>,
): EstadoDaPartida => {
  const atual = { ...jogador(partida, id), ...mudanca };
  return {
    ...partida,
    jogadores: [
      partida.jogadores[0].id === id ? atual : partida.jogadores[0],
      partida.jogadores[1].id === id ? atual : partida.jogadores[1],
    ],
  };
};

/** Põe um recurso de classe em um valor exato. */
export const comRecurso = (
  partida: EstadoDaPartida,
  id: PlayerId,
  valor: number,
): EstadoDaPartida => {
  const atual = jogador(partida, id);
  if (atual.recurso.classe === 'guerreiro') {
    return com(partida, id, { recurso: { classe: 'guerreiro', momentum: valor } });
  }
  if (atual.recurso.classe === 'mago') {
    return com(partida, id, { recurso: { classe: 'mago', mana: valor } });
  }
  return partida;
};

/** Põe a Devoção do Clérigo em um estágio exato. */
export const comDevocao = (
  partida: EstadoDaPartida,
  id: PlayerId,
  devocao: EstagioDeDevocao,
): EstadoDaPartida =>
  jogador(partida, id).recurso.classe === 'clerigo'
    ? com(partida, id, { recurso: { classe: 'clerigo', devocao } })
    : partida;

export const devocaoDe = (partida: EstadoDaPartida, id: PlayerId): EstagioDeDevocao | null => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'clerigo' ? recurso.devocao : null;
};

/** Põe as Almas do Necromante em uma repartição exata. */
export const comAlmas = (
  partida: EstadoDaPartida,
  id: PlayerId,
  controladas: number,
  anexadas: readonly CardId[] = [],
): EstadoDaPartida =>
  jogador(partida, id).recurso.classe === 'necromante'
    ? com(partida, id, {
        recurso: {
          classe: 'necromante',
          almasControladas: controladas,
          almasNoCemiterio: 4 - controladas - anexadas.length,
          almasAnexadas: anexadas,
        },
      })
    : partida;

export const almasDe = (partida: EstadoDaPartida, id: PlayerId): number => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'necromante' ? recurso.almasControladas : -1;
};

export const almasNoCemiterio = (partida: EstadoDaPartida, id: PlayerId): number => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'necromante' ? recurso.almasNoCemiterio : -1;
};

/** Põe a Convicção do Paladino em um estado exato. */
export const comJuramento = (
  partida: EstadoDaPartida,
  id: PlayerId,
  juramento: EstadoDeJuramento,
): EstadoDaPartida =>
  jogador(partida, id).recurso.classe === 'paladino'
    ? com(partida, id, { recurso: { classe: 'paladino', juramento } })
    : partida;

export const juramentoDe = (partida: EstadoDaPartida, id: PlayerId): EstadoDeJuramento | null => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'paladino' ? recurso.juramento : null;
};

/** Põe as Brechas do Ladino em um valor exato. */
export const comBrechas = (
  partida: EstadoDaPartida,
  id: PlayerId,
  brechas: number,
): EstadoDaPartida =>
  jogador(partida, id).recurso.classe === 'ladino'
    ? com(partida, id, { recurso: { classe: 'ladino', brechasNoAdversario: brechas } })
    : partida;

export const brechasDe = (partida: EstadoDaPartida, id: PlayerId): number => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'ladino' ? recurso.brechasNoAdversario : -1;
};

/** As Notas já executadas pelo Bardo neste turno. */
export const notasDe = (partida: EstadoDaPartida, id: PlayerId): readonly string[] => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'bardo' ? recurso.sequenciaDeNotas : [];
};

export const cadenciasDe = (partida: EstadoDaPartida, id: PlayerId): number => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'bardo' ? recurso.cadenciasNoTurno : -1;
};

/** Põe as pedras de Chi do Monge em um número exato de Prontas. */
export const comChi = (
  partida: EstadoDaPartida,
  id: PlayerId,
  prontas: number,
): EstadoDaPartida => {
  const atual = jogador(partida, id);
  if (atual.recurso.classe !== 'monge') return partida;
  const lado = (indice: number): 'pronta' | 'gasta' => (indice < prontas ? 'pronta' : 'gasta');
  return com(partida, id, {
    recurso: { ...atual.recurso, chi: [lado(0), lado(1), lado(2)] },
  });
};

export const chiDe = (partida: EstadoDaPartida, id: PlayerId): number => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'monge' ? recurso.chi.filter((pedra) => pedra === 'pronta').length : -1;
};

export const kataDe = (partida: EstadoDaPartida, id: PlayerId): readonly string[] => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'monge' ? recurso.sequenciaDeKata : [];
};

/** Põe (ou tira) a Marca da Presa do Patrulheiro. */
export const comMarca = (
  partida: EstadoDaPartida,
  id: PlayerId,
  marcada: boolean,
): EstadoDaPartida =>
  jogador(partida, id).recurso.classe === 'patrulheiro'
    ? com(partida, id, { recurso: { classe: 'patrulheiro', marcaDaPresa: marcada } })
    : partida;

export const marcaDe = (partida: EstadoDaPartida, id: PlayerId): boolean => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'patrulheiro' ? recurso.marcaDaPresa : false;
};

/** Põe o Druida em uma Forma exata. */
export const comForma = (
  partida: EstadoDaPartida,
  id: PlayerId,
  forma: FormaDoDruida,
): EstadoDaPartida => {
  const atual = jogador(partida, id);
  return atual.recurso.classe === 'druida'
    ? com(partida, id, { recurso: { ...atual.recurso, forma } })
    : partida;
};

export const formaDe = (partida: EstadoDaPartida, id: PlayerId): FormaDoDruida | null => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'druida' ? recurso.forma : null;
};

export const momentumDe = (partida: EstadoDaPartida, id: PlayerId): number => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'guerreiro' ? recurso.momentum : -1;
};

export const manaDe = (partida: EstadoDaPartida, id: PlayerId): number => {
  const recurso = jogador(partida, id).recurso;
  return recurso.classe === 'mago' ? recurso.mana : -1;
};

/** Declara, responde e resolve uma Ação em um passo só. */
export interface Jogada {
  readonly pedido: PedidoDeAcao;
  readonly resposta?: PedidoDeResposta;
  readonly indice?: IndiceDeAcao;
}

export interface ResultadoDaJogada {
  readonly partida: EstadoDaPartida;
  readonly eventos: readonly EventoUniversal[];
}

export const jogar = (
  partida: EstadoDaPartida,
  atacante: PlayerId,
  jogada: Jogada,
): ResultadoDaJogada => {
  const defensor = atacante === A ? B : A;
  const indice =
    jogada.indice ?? (jogador(partida, atacante).acoesRealizadasNoTurno as IndiceDeAcao);

  const eventos: EventoUniversal[] = [];
  const declarada = declarar(partida, atacante, jogada.pedido);
  eventos.push(...eventosDe(declarada));
  let atual = exigir(declarada);

  if (jogada.resposta !== undefined && jogada.resposta.tipo !== 'sem-resposta') {
    const respondida = responder(atual, defensor, indice, jogada.resposta);
    eventos.push(...eventosDe(respondida));
    atual = exigir(respondida);
  }

  const resolvida = resolver(atual, atacante, indice);
  eventos.push(...eventosDe(resolvida));
  return { partida: exigir(resolvida), eventos };
};

export const virarTurno = (partida: EstadoDaPartida, deQuem: PlayerId): EstadoDaPartida => {
  const fechada = exigir(fecharTurno(partida, deQuem));
  const proximo = fechada.turno?.jogadorAtivo;
  if (proximo === undefined) throw new Error('partida sem próximo turno');
  return exigir(abrirTurno(fechada, proximo));
};

export const carta = (codigo: string): CardId => cardId(codigo);
