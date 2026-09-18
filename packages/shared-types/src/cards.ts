import type { CardId } from './ids.js';
import type { Nota, PassoDeKata } from './recursos-de-classe.js';

/** Tipos visuais e mecânicos de carta (FULL_GAME_SPEC.md §27). */
export type TipoDeCarta =
  'ataque' | 'tecnica' | 'reacao' | 'passiva' | 'carta-de-classe' | 'ultimate' | 'personagem';

/** Habilidades que ficam na mão e entram em cooldown depois de usadas. */
export type TipoDeHabilidade = Extract<TipoDeCarta, 'ataque' | 'tecnica' | 'reacao'>;

/**
 * Traços impressos ao lado do tipo.
 *
 * `feitico` é um traço, **não** um quarto tipo universal: "Ataque/Feitiço" é um
 * Ataque que também é Feitiço, e continua ocupando espaço de Ação, pagando com
 * pontos de Ação e indo para o cooldown como qualquer Ataque. O traço só existe
 * porque outras cartas perguntam por ele ("seu próximo Ataque/Feitiço…").
 */
export type TagDeCarta = 'feitico';

/** Moeda usada para pagar a carta: Ação no próprio turno, Reserva no turno inimigo. */
export type MoedaDeCusto = 'ap' | 'reserva';

/**
 * Recursos de classe que aparecem dentro do custo impresso de uma carta.
 *
 * Só entram aqui os recursos que o texto das cartas cobra como custo — "2 AP +
 * 1 Mana", "1 AP + 1 Alma". Devoção, Juramento e Forma, por exemplo, são
 * estados que o texto exige, não moedas que o custo consome, e por isso não
 * aparecem nesta lista.
 */
export type RecursoDeCusto = 'mana' | 'momentum' | 'alma';

/** Parcela fixa do custo paga com o recurso da classe. */
export interface ParcelaDeRecurso {
  readonly recurso: RecursoDeCusto;
  readonly quantidade: number;
}

/**
 * Parcela variável do custo, escolhida na declaração.
 *
 * Cobre tanto "1 a 3 Mana" (mínimo obrigatório acima de zero) quanto
 * "gaste até 2 Momentum" (mínimo zero). O intervalo é impresso: o cliente
 * escolhe um valor dentro dele e nada mais.
 */
export interface ParcelaVariavelDeRecurso {
  readonly recurso: RecursoDeCusto;
  readonly minimo: number;
  readonly maximo: number;
}

/**
 * Custo impresso de uma carta.
 *
 * O custo é **atômico**: ou todas as parcelas são pagas, ou nenhuma é. Um
 * Ataque de "2 AP + 1 Mana" com pontos de Ação sobrando mas sem Mana não gasta
 * os pontos de Ação.
 */
export interface CustoDeCarta {
  readonly moeda: MoedaDeCusto;
  readonly valor: number;
  readonly recurso?: ParcelaDeRecurso;
  readonly variavel?: ParcelaVariavelDeRecurso;
}

/** Zonas de cooldown CD1, CD2 e CD3 (FULL_GAME_SPEC.md §11). */
export type ZonaDeCooldown = 1 | 2 | 3;

export const ZONAS_DE_COOLDOWN: readonly ZonaDeCooldown[] = [1, 2, 3];

/** Valores de combate impressos na carta. */
export interface ValoresDeAtaque {
  readonly dano: number;
  readonly impacto: number;
}

/**
 * O que está impresso em uma habilidade.
 *
 * O motor universal não conhece o catálogo: ele recebe o perfil impresso e
 * resolve. Quem produz o perfil é o catálogo — nunca o cliente, que informa
 * apenas a identidade da carta e as escolhas legais dela.
 */
export interface PerfilDeHabilidade {
  readonly carta: CardId;
  readonly tipo: TipoDeHabilidade;
  readonly tags: readonly TagDeCarta[];
  /**
   * A Nota impressa na carta, quando a classe usa Notas.
   *
   * É dado impresso como qualquer outro: o Bardo verifica a Nota da Ação
   * anterior, e quem responde por ela é o catálogo, não quem joga.
   */
  readonly nota?: Nota;
  /** O passo de Kata impresso na carta, quando a classe usa Kata. */
  readonly kata?: PassoDeKata;
  readonly custo: CustoDeCarta;
  /**
   * Zona para onde a carta vai depois de usada, ou `null` quando ela não vai
   * para cooldown nenhum. A Ultimate é o caso de `null`: ela é consumida e sai
   * da partida, e não volta por cooldown (§14).
   */
  readonly cooldown: ZonaDeCooldown | null;
  /** `null` quando a carta não imprime Dano nem Impacto — uma Técnica, por exemplo. */
  readonly valores: ValoresDeAtaque | null;
}

/** A carta tem o traço procurado? */
export const temTag = (perfil: PerfilDeHabilidade, tag: TagDeCarta): boolean =>
  perfil.tags.includes(tag);
