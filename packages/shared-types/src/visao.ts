import type { CardId, ClassId, MatchId, PlayerId } from './ids.js';
import type { ZonaDeCooldown } from './cards.js';
import type { Anotacoes } from './anotacoes.js';
import type { EstadoDePassiva } from './card-state.js';
import type { RecursoDeClasse } from './recursos-de-classe.js';
import type { CarimboDeVersao } from './versions.js';
import type {
  CartaDeClasseEquipada,
  DesfechoDaPartida,
  EstadoDeCondicoes,
  EstadoDoTurno,
  SituacaoDaPartida,
  SlotsDeAcao,
  UltimateEquipada,
} from './estado-de-partida.js';

/*
 * Visões da partida.
 *
 * O estado canônico contém informação que nem todo mundo pode ver. Uma visão é
 * uma projeção dele para um observador: o que aquele observador tem direito de
 * conhecer, e nada além. O servidor autoritativo envia visões, nunca o estado
 * canônico (FULL_GAME_SPEC.md §20 e §32).
 */

/**
 * Uma carta como um observador a enxerga.
 *
 * Quando `visivel` é falso não existe campo `carta` nenhum: a identidade não
 * está escondida atrás de uma flag, ela simplesmente não faz parte do dado.
 */
export type CartaProjetada =
  { readonly visivel: true; readonly carta: CardId } | { readonly visivel: false };

export interface PassivaProjetada {
  readonly estado: EstadoDePassiva;
  /** Oculta para o adversário enquanto a Passiva não é revelada. */
  readonly carta: CartaProjetada;
}

export interface VisaoDeJogador {
  readonly id: PlayerId;
  readonly classe: ClassId;
  readonly personagem: CardId;

  readonly vida: number;
  readonly guarda: number;
  readonly pontosDeAcao: number;
  readonly reserva: number;
  readonly impulsoInicial: boolean;
  readonly acoesRealizadasNoTurno: number;

  /** Identidade visível só para o dono; para os demais, apenas a quantidade. */
  readonly mao: readonly CartaProjetada[];
  /** Cartas em cooldown já foram jogadas publicamente, então ficam visíveis. */
  readonly cooldown: Readonly<Record<ZonaDeCooldown, readonly CardId[]>>;

  readonly passivas: readonly PassivaProjetada[];
  readonly cartasDeClasse: readonly CartaDeClasseEquipada[];
  readonly ultimate: UltimateEquipada;

  readonly acoes: SlotsDeAcao;
  readonly acoesPermitidasNoTurno: number;
  readonly condicoes: EstadoDeCondicoes;
  readonly recurso: RecursoDeClasse;
  readonly anotacoes: Anotacoes;
  readonly removidas: readonly CardId[];
}

export interface VisaoDaPartida {
  readonly id: MatchId;
  readonly versoes: CarimboDeVersao;
  readonly situacao: SituacaoDaPartida;
  readonly turno: EstadoDoTurno | null;
  readonly desfecho: DesfechoDaPartida | null;
  readonly jogadores: readonly [VisaoDeJogador, VisaoDeJogador];
  /** De quem é esta visão. `null` quando é a visão de um espectador. */
  readonly perspectiva: PlayerId | null;
}
