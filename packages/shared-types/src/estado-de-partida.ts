import type { CardId, ClassId, MatchId, PlayerId } from './ids.js';
import type { PerfilDeHabilidade, ZonaDeCooldown } from './cards.js';
import type { Anotacoes } from './anotacoes.js';
import type { EscolhasDaAcao } from './escolhas.js';
import type { EscolhaPendente } from './escolha-pendente.js';
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
 *
 * A carta de Reação carrega o **perfil impresso dela**, não só o
 * identificador: o custo em Reserva e a zona de cooldown são da própria
 * Reação, não da Ação a que ela responde. Guardar o perfil aqui é o que
 * garante que a resolução use os valores certos.
 *
 * A Defesa Inata não é carta e não tem perfil: ela é a defesa da classe.
 */
export type RespostaVoluntaria =
  | { readonly tipo: 'carta-de-reacao'; readonly perfil: PerfilDeHabilidade }
  | { readonly tipo: 'defesa-inata' };

/**
 * Espaço de Resposta sob uma Ação.
 *
 * O campo é um só e admite no máximo um valor, então duas Respostas
 * voluntárias simultâneas não são representáveis. Passivas automáticas e
 * ativações de Carta de Classe modificam a Resposta sem ocupar este espaço.
 */
export interface SlotDeResposta {
  readonly voluntaria: RespostaVoluntaria | null;
  /**
   * As escolhas que o defensor mandou junto com a Resposta.
   *
   * Ficam separadas das escolhas da Ação porque são de outro jogador: "deixe
   * Pronta uma Runa Ativada" e "reduza +1 D ou +1 I" são decisões de quem
   * responde, não de quem atacou.
   */
  readonly escolhas: EscolhasDaAcao;
}

/**
 * Em que ponto da resolução o espaço de Ação está.
 *
 * `indisponivel` é o estado do quarto espaço enquanto ele não existe. Ele
 * existe no tipo porque uma carta do catálogo — a Runa Prismática Exaurida —
 * libera explicitamente uma quarta Ação; deixar isso representável é o que
 * impede a exceção de virar um caso escondido fora do estado.
 */
export type SituacaoDaAcao = 'indisponivel' | 'vazio' | 'declarada' | 'resolvida';

/** Como uma Carta de Classe foi usada dentro de uma Ação. */
export type ModoDeUso = 'ativar' | 'exaurir';

export interface UsoDeCartaDeClasseNaAcao {
  readonly carta: CardId;
  readonly modo: ModoDeUso;
}

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

/** Um dos espaços centrais de Ação, com a sua Resposta correspondente. */
export interface SlotDeAcao {
  readonly indice: IndiceDeAcao;
  readonly situacao: SituacaoDaAcao;
  /** A carta declarada, com os valores impressos dela. */
  readonly perfil: PerfilDeHabilidade | null;
  /** As escolhas legais informadas na declaração, já validadas contra a carta. */
  readonly escolhas: EscolhasDaAcao;
  readonly resposta: SlotDeResposta;
  readonly modificadores: ModificadoresDaAcao;
  /**
   * Redução trazida pela Resposta, separada dos demais modificadores.
   *
   * Ela é separada porque várias cartas falam explicitamente do momento dela:
   * "+3 D **depois** que a redução da Reação for aplicada", "se o Dano final
   * for 0". Somar tudo em um número só apagaria essa ordem.
   */
  readonly reducaoDaResposta: ModificadoresDaAcao;
  /**
   * Dano final imposto por carta ("o Dano final deste Ataque se torna 0").
   *
   * É um valor definido, não um modificador enorme de sinal negativo: o texto
   * fixa o resultado, e fixar o resultado é o último passo da conta.
   */
  readonly danoFinalDefinido: number | null;
  /** Impacto final fixado por carta ("o Impacto final daquela ação se torna 0"). */
  readonly impactoFinalDefinido: number | null;
  /** Uma carta impediu a Ruptura desta Ação (Postura da Fortaleza Exaurida). */
  readonly impedirRuptura: boolean;
  /** Bônus de Ruptura desta Ação, quando uma carta substitui o valor universal. */
  readonly bonusDeRupturaSubstituto: number | null;
  /** Dano somado depois da redução da Resposta (Postura do Duelista Exaurida). */
  readonly bonusAposReducao: number;
  /** O texto da carta foi cancelado (Contrafeitiço). Custo e espaço continuam gastos. */
  readonly textoCancelado: boolean;
  /** Recurso de classe efetivamente gasto nesta Ação, incluindo a parcela variável. */
  readonly recursoGasto: number;
  /**
   * Cartas de Classe já usadas nesta Ação. Uma Carta de Classe só pode ser
   * usada uma vez na mesma Ação, seja por Ativação ou por Exaustão (§8).
   *
   * O modo fica registrado junto porque Ativar e Exaurir são efeitos
   * diferentes da mesma carta: sem o modo, a resolução não saberia qual dos
   * dois textos aplicar.
   */
  readonly cartasDeClasseUsadas: readonly UsoDeCartaDeClasseNaAcao[];
}

/**
 * Os espaços de Ação de um jogador, na ordem em que são ocupados.
 *
 * São três espaços (§8). O quarto existe apenas como espaço `indisponivel`,
 * porque uma única carta do catálogo o libera como exceção explícita.
 */
export type SlotsDeAcao = readonly [SlotDeAcao, SlotDeAcao, SlotDeAcao, SlotDeAcao];

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
  /**
   * Quantas Ações este jogador pode realizar no turno atual. São três (§8); só
   * uma exceção impressa aumenta esse número, e ela volta a três no turno
   * seguinte.
   */
  readonly acoesPermitidasNoTurno: number;
  readonly condicoes: EstadoDeCondicoes;
  readonly recurso: RecursoDa<TClasse>;
  /** Estado temporário criado por texto de carta (ver `anotacoes.ts`). */
  readonly anotacoes: Anotacoes;

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
  /**
   * Escolhas que um jogador ainda precisa fazer.
   *
   * Enquanto houver uma pendente, o dono dela não pode declarar Ação nem
   * responder: o motor não escolhe por ninguém, e seguir sem a resposta seria
   * escolher em silêncio.
   */
  readonly escolhasPendentes: readonly EscolhaPendente[];
}
