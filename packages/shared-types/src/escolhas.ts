import type { CardId } from './ids.js';
import type { CondicaoId } from './conditions.js';
import type { FormaDoDruida } from './recursos-de-classe.js';

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
  /** Condição escolhida por um texto que manda remover ou aplicar uma. */
  readonly condicao?: CondicaoId;
  /** Forma escolhida por uma Metamorfose. */
  readonly forma?: FormaDoDruida;
  /**
   * O Bruxo escolhe pagar o Preço Proibido nesta Ação.
   *
   * O texto diz "**pode** perder 1 Vida para reduzir o custo": é decisão dele,
   * e o motor não a toma por conta própria.
   */
  readonly precoProibido?: boolean;
  /**
   * Quanto da própria Guarda o Bárbaro reduz voluntariamente nesta Ação.
   *
   * Reduzir a própria Guarda como custo nunca provoca Ruptura (regra congelada
   * na Etapa 2).
   */
  readonly guardaReduzida?: number;
  /** Servo que recebe a Alma que o Necromante está anexando. */
  readonly servo?: CardId;
  /**
   * Qual dos três bônus do Milagre Guardado o Clérigo quer nesta jogada.
   *
   * O texto imprime "+1 D, +1 I ou +1 de cura, conforme o que fizer": a lista
   * é fechada, o que a carta faz restringe as opções válidas, e dentro do que
   * sobra quem escolhe é o jogador.
   */
  readonly bonusDoMilagre?: 'dano' | 'impacto' | 'cura';
}

export const SEM_ESCOLHAS: EscolhasDaAcao = {};
