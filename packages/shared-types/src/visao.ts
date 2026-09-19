import type { CardId, ClassId, MatchId, PlayerId } from './ids.js';
import type { PerfilDeHabilidade, ZonaDeCooldown } from './cards.js';
import type { CooldownAgendado } from './estado-de-partida.js';
import type { IndiceDeAcao } from './zones.js';
import type { Anotacoes } from './anotacoes.js';
import type { EstadoDePassiva } from './card-state.js';
import type { EscolhasDaAcao } from './escolhas.js';
import type {
  EstadoDaEmboscada,
  RecursoDeClasse,
  RecursoDoPatrulheiro,
} from './recursos-de-classe.js';
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

/**
 * A Emboscada como um observador a enxerga.
 *
 * Que existe uma carta face-down é público — o adversário vê o terceiro espaço
 * comprometido, e precisa ver, porque isso muda o que ele pode esperar. Qual
 * carta é continua sendo só do dono.
 */
export interface EmboscadaProjetada {
  readonly estado: EstadoDaEmboscada;
  readonly carta: CartaProjetada;
}

/**
 * O componente de classe do Patrulheiro, com a Emboscada filtrada.
 *
 * É o único recurso de classe com parte secreta, e por isso o único que ganha
 * forma projetada própria. Os outros onze são fichas e trilhas na mesa (§16) e
 * atravessam como estão.
 */
export interface RecursoDoPatrulheiroProjetado {
  readonly classe: 'patrulheiro';
  readonly marcaDaPresa: boolean;
  readonly emboscada: EmboscadaProjetada | null;
}

export type RecursoProjetado =
  Exclude<RecursoDeClasse, RecursoDoPatrulheiro> | RecursoDoPatrulheiroProjetado;

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
  /**
   * As habilidades usadas neste turno que ainda estão no campo.
   *
   * Elas entram no cooldown no encerramento (§11). A informação é pública: a
   * carta está face-up no espaço de Ação ou de Resposta, e qualquer um vê para
   * onde ela vai. Projetar isso não vaza nada — deixar de projetar é que
   * obrigaria a interface a adivinhar.
   */
  readonly cooldownAgendado: readonly CooldownAgendado[];

  readonly passivas: readonly PassivaProjetada[];
  readonly cartasDeClasse: readonly CartaDeClasseEquipada[];
  readonly ultimate: UltimateEquipada;

  readonly acoes: SlotsDeAcaoProjetados;
  readonly acoesPermitidasNoTurno: number;
  readonly condicoes: EstadoDeCondicoes;
  readonly recurso: RecursoProjetado;
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
