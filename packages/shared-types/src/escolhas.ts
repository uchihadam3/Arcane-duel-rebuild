import type { CardId } from './ids.js';

/*
 * Escolhas legais que acompanham uma Ação ou uma Resposta.
 *
 * O cliente nunca informa custo, Dano, Impacto, tipo nem cooldown: esses vêm do
 * catálogo. O que ele informa é a identidade da carta e, quando o texto impresso
 * oferece uma escolha, qual das opções impressas foi escolhida. Tudo aqui é
 * validado contra a carta antes de qualquer custo ser pago.
 */

/** Reforço oferecido por cartas que imprimem "escolha +1 D ou +1 I". */
export type ReforcoEscolhido = 'dano' | 'impacto';

export interface EscolhasDaAcao {
  /**
   * Quantidade da parcela variável do custo ("1 a 3 Mana", "gaste até 2
   * Momentum"). Ausente equivale ao mínimo impresso.
   */
  readonly recursoAdicional?: number;
  /** Opção de "+1 D ou +1 I". */
  readonly reforco?: ReforcoEscolhido;
  /** Carta de Classe que o texto manda escolher — uma Runa, por exemplo. */
  readonly cartaDeClasse?: CardId;
  /** Carta da própria área de cooldown escolhida pelo texto. */
  readonly cartaEmCooldown?: CardId;
  /** Mais de uma carta de cooldown, quando o texto permite ("até duas"). */
  readonly cartasEmCooldown?: readonly CardId[];
}

export const SEM_ESCOLHAS: EscolhasDaAcao = {};
