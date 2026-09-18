import type { CardId, ClassId, MatchId, PlayerId } from './ids.js';
import type { PerfilDeHabilidade, ZonaDeCooldown } from './cards.js';
import type { IndiceDeAcao } from './zones.js';
import type { Anotacoes } from './anotacoes.js';
import type { EstadoDePassiva } from './card-state.js';
import type { EscolhasDaAcao } from './escolhas.js';
import type { RecursoDeClasse } from './recursos-de-classe.js';
import type { CarimboDeVersao } from './versions.js';
import type {
  CartaDeClasseEquipada,
  DesfechoDaPartida,
  EstadoDeCondicoes,
  EstadoDoTurno,
  ModificadoresDaAcao,
  RespostaVoluntaria,
  SituacaoDaAcao,
  SituacaoDaPartida,
  UltimateEquipada,
  UsoDeCartaDeClasseNaAcao,
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

/*
 * Os espaços de Ação como um observador os enxerga.
 *
 * Eles são declarados campo a campo, de propósito, em vez de reaproveitarem o
 * `SlotDeAcao` canônico. Reaproveitar era cômodo e foi exatamente o que deixou
 * `escolhas.cartaDaMao` — o Ataque que Preparar Emboscada guardou face-down —
 * atravessar para o adversário. Com a lista explícita, um campo novo no estado
 * canônico **não** aparece na visão até alguém decidir que pode.
 */

/**
 * As escolhas de uma Ação ou de uma Resposta, já filtradas.
 *
 * Tem o formato do canônico porque toda escolha é opcional, mas o conteúdo é
 * outro: o que aponta para zona secreta simplesmente não está aqui, e não está
 * mascarado — a chave não existe no objeto.
 */
export type EscolhasProjetadas = EscolhasDaAcao;

export interface SlotDeRespostaProjetado {
  readonly voluntaria: RespostaVoluntaria | null;
  /** As escolhas de quem respondeu, filtradas para este observador. */
  readonly escolhas: EscolhasProjetadas;
}

export interface SlotDeAcaoProjetado {
  readonly indice: IndiceDeAcao;
  readonly situacao: SituacaoDaAcao;
  readonly perfil: PerfilDeHabilidade | null;
  /** As escolhas de quem declarou, filtradas para este observador. */
  readonly escolhas: EscolhasProjetadas;
  readonly resposta: SlotDeRespostaProjetado;
  readonly modificadores: ModificadoresDaAcao;
  readonly reducaoDaResposta: ModificadoresDaAcao;
  readonly danoFinalDefinido: number | null;
  readonly impactoFinalDefinido: number | null;
  readonly impedirRuptura: boolean;
  readonly bonusDeRupturaSubstituto: number | null;
  readonly bonusAposReducao: number;
  readonly textoCancelado: boolean;
  readonly recursoGasto: number;
  readonly cartasDeClasseUsadas: readonly UsoDeCartaDeClasseNaAcao[];
}

export type SlotsDeAcaoProjetados = readonly [
  SlotDeAcaoProjetado,
  SlotDeAcaoProjetado,
  SlotDeAcaoProjetado,
  SlotDeAcaoProjetado,
];

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

  readonly acoes: SlotsDeAcaoProjetados;
  readonly acoesPermitidasNoTurno: number;
  readonly condicoes: EstadoDeCondicoes;
  readonly recurso: RecursoDeClasse;
  /** Só as anotações que este observador pode conhecer. */
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
