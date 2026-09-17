import type {
  CardId,
  ClassId,
  EstadoDaPartida,
  EstadoDeCondicoes,
  EstadoDeCooldown,
  EstadoDeJogador,
  MatchId,
  PlayerId,
  SlotDeAcao,
  SlotsDeAcao,
} from '@arcane-duel/shared-types';
import { INDICES_DE_ACAO } from '@arcane-duel/shared-types';

import { REGRAS_UNIVERSAIS } from './constants.js';
import { recursoInicialDaClasse } from './recursos-iniciais.js';
import { RULES_VERSION } from './version.js';

/*
 * Montagem do estado inicial.
 *
 * Estas funções apenas colocam a mesa: elas não iniciam turno, não distribuem
 * pontos de Ação e não decidem quem começa. Tudo isso é regra, e regra é a
 * etapa dois do roadmap.
 */

/** A build equipada para a batalha (FULL_GAME_SPEC.md §3). */
export interface BuildEquipada {
  readonly classe: ClassId;
  readonly personagem: CardId;
  readonly habilidades: readonly CardId[];
  readonly passivas: readonly CardId[];
  readonly cartasDeClasse: readonly CardId[];
  readonly ultimate: CardId;
}

export interface ConfiguracaoDeJogador {
  readonly id: PlayerId;
  readonly build: BuildEquipada;
  /**
   * Reserva com que o jogador entra na partida. O segundo jogador começa com
   * duas (§7), mas **quem é o segundo** não é decidido aqui: o documento não
   * define quem começa, então isso vem de fora.
   */
  readonly reservaInicial?: number;
  /** Marcador de Impulso Inicial, também do segundo jogador. */
  readonly impulsoInicial?: boolean;
}

const cooldownVazio = (): EstadoDeCooldown => ({ 1: [], 2: [], 3: [] });

const semCondicoes = (): EstadoDeCondicoes => ({
  queimadura: 0,
  lento: 0,
  murchar: 0,
  sangramento: 0,
});

const slotDeAcaoVazio = (indice: SlotDeAcao['indice']): SlotDeAcao => ({
  indice,
  carta: null,
  resposta: { voluntaria: null },
});

/** Os três espaços centrais de Ação, todos vazios. */
export const criarSlotsDeAcao = (): SlotsDeAcao => [
  slotDeAcaoVazio(INDICES_DE_ACAO[0] ?? 0),
  slotDeAcaoVazio(INDICES_DE_ACAO[1] ?? 1),
  slotDeAcaoVazio(INDICES_DE_ACAO[2] ?? 2),
];

/**
 * Estado inicial de um jogador.
 *
 * Vida e Guarda partem dos valores universais de playtest. Pontos de Ação
 * começam em zero de propósito: os cinco pontos chegam no início do próprio
 * turno, e iniciar turno é etapa dois.
 */
export const criarEstadoDeJogador = (configuracao: ConfiguracaoDeJogador): EstadoDeJogador => {
  const { build } = configuracao;

  return {
    id: configuracao.id,
    classe: build.classe,
    personagem: build.personagem,

    vida: REGRAS_UNIVERSAIS.vidaInicial,
    guarda: REGRAS_UNIVERSAIS.guardaInicial,
    pontosDeAcao: 0,
    reserva: configuracao.reservaInicial ?? 0,
    impulsoInicial: configuracao.impulsoInicial ?? false,
    acoesRealizadasNoTurno: 0,

    // A build inteira começa disponível: não há baralho, compra nem descarte.
    mao: [...build.habilidades],
    cooldown: cooldownVazio(),

    passivas: build.passivas.map((carta) => ({ carta, estado: 'oculta' as const })),
    cartasDeClasse: build.cartasDeClasse.map((carta) => ({ carta, estado: 'pronta' as const })),
    ultimate: { carta: build.ultimate, estado: 'disponivel' },

    acoes: criarSlotsDeAcao(),
    condicoes: semCondicoes(),
    recurso: recursoInicialDaClasse(build.classe),
    removidas: [],
  };
};

export interface ConfiguracaoDaPartida {
  readonly id: MatchId;
  readonly semente: string;
  /**
   * Versão do catálogo usado nesta partida. O motor conhece a própria versão
   * de regras, mas não conhece o catálogo — quem monta a partida informa.
   */
  readonly cardDataVersion: string;
  /**
   * A ordem da tupla é a ordem dos jogadores. Quem começa continua sendo uma
   * decisão de fora: o documento não define o critério.
   */
  readonly jogadores: readonly [ConfiguracaoDeJogador, ConfiguracaoDeJogador];
}

/**
 * Estado inicial da partida, ainda sem turno.
 *
 * O carimbo de versão é gravado aqui porque um replay só é interpretável à luz
 * das versões que o produziram (§23 e §31).
 */
export const criarPartida = (configuracao: ConfiguracaoDaPartida): EstadoDaPartida => ({
  id: configuracao.id,
  versoes: { rulesVersion: RULES_VERSION, cardDataVersion: configuracao.cardDataVersion },
  semente: configuracao.semente,
  situacao: 'aguardando-inicio',
  jogadores: [
    criarEstadoDeJogador(configuracao.jogadores[0]),
    criarEstadoDeJogador(configuracao.jogadores[1]),
  ],
  turno: null,
  desfecho: null,
});

/** Localiza um jogador pelo identificador. */
export const obterJogador = (partida: EstadoDaPartida, id: PlayerId): EstadoDeJogador | undefined =>
  partida.jogadores.find((jogador) => jogador.id === id);

/** O adversário de um jogador. */
export const obterAdversario = (
  partida: EstadoDaPartida,
  id: PlayerId,
): EstadoDeJogador | undefined => partida.jogadores.find((jogador) => jogador.id !== id);
