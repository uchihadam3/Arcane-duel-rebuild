import type { CardId } from './ids.js';

/** Tipos visuais e mecânicos de carta (FULL_GAME_SPEC.md §27). */
export type TipoDeCarta =
  'ataque' | 'tecnica' | 'reacao' | 'passiva' | 'carta-de-classe' | 'ultimate' | 'personagem';

/** Habilidades que ficam na mão e entram em cooldown depois de usadas. */
export type TipoDeHabilidade = Extract<TipoDeCarta, 'ataque' | 'tecnica' | 'reacao'>;

/** Moeda usada para pagar a carta: Ação no próprio turno, Reserva no turno inimigo. */
export type MoedaDeCusto = 'ap' | 'reserva';

/** Zonas de cooldown CD1, CD2 e CD3 (FULL_GAME_SPEC.md §11). */
export type ZonaDeCooldown = 1 | 2 | 3;

export const ZONAS_DE_COOLDOWN: readonly ZonaDeCooldown[] = [1, 2, 3];

export interface CustoDeCarta {
  readonly moeda: MoedaDeCusto;
  readonly valor: number;
}

/** Valores de combate impressos na carta. */
export interface ValoresDeAtaque {
  readonly dano: number;
  readonly impacto: number;
}

/**
 * O que está impresso em uma habilidade.
 *
 * O motor universal não conhece o catálogo: quem declara uma Ação informa o
 * perfil impresso da carta. Assim as regras universais são testáveis antes de
 * existir uma única carta real, e o catálogo entra depois sem tocar no motor.
 */
export interface PerfilDeHabilidade {
  readonly carta: CardId;
  readonly tipo: TipoDeHabilidade;
  readonly custo: CustoDeCarta;
  readonly cooldown: ZonaDeCooldown;
  /** `null` quando a carta não imprime Dano nem Impacto — uma Técnica, por exemplo. */
  readonly valores: ValoresDeAtaque | null;
}
