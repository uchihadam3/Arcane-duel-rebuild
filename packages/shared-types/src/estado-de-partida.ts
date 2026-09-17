import type { CardId, ClassId, MatchId, PlayerId } from './ids.js';
import type { PerfilDeHabilidade, ZonaDeCooldown } from './cards.js';
import type { IndiceDeAcao } from './zones.js';
import type { CondicaoId } from './conditions.js';
import type { EstadoDeCartaDeClasse, EstadoDePassiva, EstadoDeUltimate } from './card-state.js';
import type { RecursoDa } from './recursos-de-classe.js';
import type { CarimboDeVersao } from './versions.js';

/*
 * Estado canônico de uma partida.
 *
 * Só estrutura: nenhuma função deste arquivo resolve combate, paga custo,
 * avança cooldown ou decide quem começa. Onde o documento não define a regra,
 * o tipo é largo o bastante para representar a situação sem escolher por ele.
 */

/** Uma Passiva equipada. Começa oculta e nunca pode ser Exaurida. */
export interface PassivaEquipada {
  readonly carta: CardId;
  readonly estado: EstadoDePassiva;
}

/** Uma Carta de Classe equipada. Começa face-up e Pronta no campo. */
export interface CartaDeClasseEquipada {
  readonly carta: CardId;
  readonly estado: EstadoDeCartaDeClasse;
}

/** A Ultimate equipada. Começa face-up: o adversário sabe qual foi escolhida. */
export interface UltimateEquipada {
  readonly carta: CardId;
  readonly estado: EstadoDeUltimate;
}

/**
 * Resposta voluntária a uma Ação inimiga.
 *
 * É a Defesa Inata da classe ou uma carta de Reação — nunca as duas como
 * Respostas separadas contra a mesma Ação (FULL_GAME_SPEC.md §8).
 */
export type RespostaVoluntaria =
  { readonly tipo: 'carta-de-reacao'; readonly carta: CardId } | { readonly tipo: 'defesa-inata' };

/**
 * Espaço de Resposta sob uma Ação.
 *
 * O campo é um só e admite no máximo um valor, então duas Respostas
 * voluntárias simultâneas não são representáveis. Passivas automáticas e
 * ativações de Carta de Classe modificam a Resposta sem ocupar este espaço.
 */
export interface SlotDeResposta {
  readonly voluntaria: RespostaVoluntaria | null;
}

/** Em que ponto da resolução o espaço de Ação está. */
export type SituacaoDaAcao = 'vazio' | 'declarada' | 'resolvida';

/**
 * Modificadores acumulados sobre uma Ação antes de ela resolver.
 *
 * É aqui que Passivas e Cartas de Classe futuras somam ou subtraem Dano e
 * Impacto. O motor universal só acumula e aplica; quem decide o valor é o
 * texto da carta, que entra nas etapas seguintes.
 */
export interface ModificadoresDaAcao {
  readonly dano: number;
  readonly impacto: number;
}

/** Um dos três espaços centrais de Ação, com a sua Resposta correspondente. */
export interface SlotDeAcao {
  readonly indice: IndiceDeAcao;
  readonly situacao: SituacaoDaAcao;
  /** A carta declarada, com os valores impressos dela. */
  readonly perfil: PerfilDeHabilidade | null;
  readonly resposta: SlotDeResposta;
  readonly modificadores: ModificadoresDaAcao;
  /**
   * Cartas de Classe já usadas nesta Ação. Uma Carta de Classe só pode ser
   * usada uma vez na mesma Ação, seja por Ativação ou por Exaustão (§8).
   */
  readonly cartasDeClasseUsadas: readonly CardId[];
}

/** Os três espaços de Ação de um jogador, na ordem em que são ocupados. */
export type SlotsDeAcao = readonly [SlotDeAcao, SlotDeAcao, SlotDeAcao];

/**
 * As três zonas de cooldown.
 *
 * A zona física É o cooldown: não existe contador adicional
 * (FULL_GAME_SPEC.md §11). Várias cartas podem estar na mesma zona.
 */
export type EstadoDeCooldown = Readonly<Record<ZonaDeCooldown, readonly CardId[]>>;

/** Quantidade acumulada de cada Condição, na área de Condições do Personagem. */
export type EstadoDeCondicoes = Readonly<Record<CondicaoId, number>>;

/**
 * Estado de um jogador.
 *
 * O parâmetro de classe amarra o recurso à classe: `EstadoDeJogador<'mago'>`
 * só aceita o recurso do Mago. Na forma genérica a checagem é feita em tempo
 * de execução pela validação estrutural do motor de regras.
 */
export interface EstadoDeJogador<TClasse extends ClassId = ClassId> {
  readonly id: PlayerId;
  readonly classe: TClasse;
  /** A carta de Personagem da classe. */
  readonly personagem: CardId;

  readonly vida: number;
  readonly guarda: number;
  readonly pontosDeAcao: number;
  readonly reserva: number;
  /**
   * Marcador de Impulso Inicial do segundo jogador (§7). Ele vale exatamente
   * um ponto de Ação, nunca vira Reserva e some se não for usado.
   */
  readonly impulsoInicial: boolean;
  readonly acoesRealizadasNoTurno: number;

  /**
   * As oito habilidades disponíveis.
   *
   * Não existe baralho embaralhado, compra, monte de compra nem descarte: a
   * build inteira começa na mão e o que sai dela vai para o cooldown.
   */
  readonly mao: readonly CardId[];
  readonly cooldown: EstadoDeCooldown;

  readonly passivas: readonly PassivaEquipada[];
  readonly cartasDeClasse: readonly CartaDeClasseEquipada[];
  readonly ultimate: UltimateEquipada;

  readonly acoes: SlotsDeAcao;
  readonly condicoes: EstadoDeCondicoes;
  readonly recurso: RecursoDa<TClasse>;

  /** Cartas de Classe Exauridas, removidas da partida em definitivo. */
  readonly removidas: readonly CardId[];
}

/** Situação geral da partida. */
export type SituacaoDaPartida = 'aguardando-inicio' | 'em-andamento' | 'encerrada';

export interface EstadoDoTurno {
  /** Começa em 1 no primeiro turno da partida. */
  readonly numero: number;
  readonly jogadorAtivo: PlayerId;
  /**
   * A rotina de início de turno já rodou neste turno?
   *
   * Guarda contra rodar duas vezes — o que duplicaria pontos de Ação e faria
   * o cooldown pular um estágio.
   */
  readonly iniciado: boolean;
}

/**
 * Motivo do fim da partida.
 *
 * `indefinido` existe porque o documento não resolve morte simultânea nem
 * critério de desempate; a estrutura precisa conseguir representar o caso sem
 * que o tipo escolha um vencedor.
 */
export type MotivoDeFim = 'vida-zerada' | 'desistencia' | 'indefinido';

export interface DesfechoDaPartida {
  /** `null` quando não há vencedor único definido. */
  readonly vencedor: PlayerId | null;
  readonly motivo: MotivoDeFim;
}

/**
 * Estado canônico da partida.
 *
 * Exatamente dois jogadores, garantido pela tupla. A ordem da tupla registra
 * quem é o primeiro e quem é o segundo jogador; **quem começa** é decisão de
 * quem cria a partida, porque o documento não define o critério.
 */
export interface EstadoDaPartida {
  readonly id: MatchId;
  readonly versoes: CarimboDeVersao;
  /**
   * Semente do replay. Não entra em nenhuma projeção: o combate não tem
   * aleatoriedade, e o que ela semeia fica fora da partida.
   */
  readonly semente: string;
  readonly situacao: SituacaoDaPartida;
  /**
   * Quem começou a partida. `null` antes do início: o documento não define o
   * critério, então quem inicia a partida informa explicitamente.
   */
  readonly primeiroJogador: PlayerId | null;
  readonly jogadores: readonly [EstadoDeJogador, EstadoDeJogador];
  /** `null` enquanto a partida não começou. */
  readonly turno: EstadoDoTurno | null;
  /** `null` enquanto a partida não terminou. */
  readonly desfecho: DesfechoDaPartida | null;
}
