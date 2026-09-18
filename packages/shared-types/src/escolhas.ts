import type { CardId } from './ids.js';
import type { CondicaoId } from './conditions.js';
import type { FormaDoDruida, Nota, PassoDeKata } from './recursos-de-classe.js';

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
  /**
   * Forma escolhida por uma Metamorfose.
   *
   * Ausente quer dizer "não quero mudar": várias cartas do Druida dizem "você
   * **pode** mudar de forma", e mudar é decisão de quem joga.
   */
  readonly forma?: FormaDoDruida;
  /**
   * O Bruxo escolhe pagar o Preço Proibido nesta Ação.
   *
   * O texto diz "**pode** perder 1 Vida para reduzir o custo": é decisão dele,
   * e o motor não a toma por conta própria.
   */
  readonly precoProibido?: boolean;
  /**
   * Quanta Vida o Bruxo oferece ao preço **opcional** impresso na carta.
   *
   * "Pode perder 1 Vida para receber +2 D", "pode perder até 3 Vida": o teto é
   * da carta, e oferecer zero — ou não informar nada — é jogar sem o preço.
   * Este campo nunca cobre o Preço Proibido, que tem escolha própria.
   */
  readonly vidaOferecida?: number;
  /**
   * O Bruxo aceita o preço em Vida que uma **Passiva** oferece nesta jogada.
   *
   * "Não Há Retorno" deixa perder 1 Vida adicional ao declarar um Ataque; como
   * a carta jogada pode ter um preço próprio, a decisão da Passiva é separada.
   */
  readonly precoDaPassiva?: boolean;
  /**
   * Qual metade do "ou" da Boca do Abismo o Bruxo escolhe na Ruptura.
   *
   * O texto imprime "restaure 1 Vida **ou** deixe Pronta sua Maldição
   * Ativada": a lista é fechada e quem escolhe é quem joga.
   */
  readonly escolhaDoAbismo?: 'vida' | 'maldicao';
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
  /** Quantas Almas colher, quando o texto imprime "colha **até** N Almas". */
  readonly almasColhidas?: number;
  /**
   * Devolver ao Cemitério a Alma anexada ao Servo usado nesta jogada.
   *
   * Todo lado Ativar de Servo imprime "você **pode** devolvê-la": é decisão de
   * quem joga, e sem a decisão a Alma fica onde está.
   */
  readonly usarAlmaAnexada?: boolean;
  /** Repartição de pontos entre Dano e Impacto, quando o texto manda dividir. */
  readonly divisao?: { readonly dano: number; readonly impacto: number };
  /** Quanto do custo em recurso de classe abater, quando o texto diz "em até N". */
  readonly descontoDeRecurso?: number;
  /** Carta do adversário escolhida por um texto que mexe no cooldown dele. */
  readonly cartaAdversariaEmCooldown?: CardId;
  /** Outra carta da própria mão, escolhida por um texto que a manda para o cooldown. */
  readonly cartaDaMao?: CardId;
  /**
   * O Paladino escolhe descer um estado de Convicção nesta jogada.
   *
   * O texto diz "você **pode** descer 1 estado para receber +2 D": é troca, e
   * quem decide fazê-la é o jogador.
   */
  readonly descerEstado?: boolean;
  /**
   * A Nota escolhida quando a carta manda escolher uma.
   *
   * Só duas cartas do Bardo pedem isso: o Improviso, que não imprime Nota, e o
   * Afinar, que troca a Nota da próxima Ação para efeito de Cadência.
   */
  readonly nota?: Nota;
  /** Passiva própria escolhida por um texto que mexe no estado dela. */
  readonly passiva?: CardId;
  /**
   * O Monge gasta 1 Chi para ignorar 1 ponto de aumento de custo em AP.
   *
   * "Disciplina do Passo" é escolha dele: sem o pedido explícito, o Chi fica
   * onde está e o aumento vale por inteiro.
   */
  readonly disciplinaDoPasso?: boolean;
  /** Etapa de Kata escolhida por um texto que manda escolher uma. */
  readonly passoDeKata?: PassoDeKata;
  /**
   * O Patrulheiro escolhe Explorar a Marca da Presa nesta jogada.
   *
   * Várias cartas dizem "**pode** Explorar a Marca para receber +2 D": a Marca
   * é uma só, e gastá-la é decisão de quem joga.
   */
  readonly explorarMarca?: boolean;
}

export const SEM_ESCOLHAS: EscolhasDaAcao = {};
