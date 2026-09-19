import type { Andamento, EspecieDeBeat } from './ritmo.js';
import { duracaoDoBeat, passoDaCascata } from './ritmo.js';

/*
 * A fila serial da apresentação.
 *
 * **Um beat principal por vez.** É a regra inteira deste arquivo, e é a
 * correção que a revisão pediu: o lance chega do motor como um lote único, e a
 * tela o conta em pedaços, um depois do outro. Nenhum evento importante começa
 * antes de o anterior ter terminado de comunicar.
 *
 * A única exceção é a **cascata**, e ela é explícita: quando várias peças
 * fazem literalmente a mesma coisa — as habilidades descendo para o cooldown
 * no encerramento —, elas não esperam umas pelas outras. Saem com um passo
 * curto entre os começos, e o conjunto lê como uma ação só do tabuleiro. Um
 * beat em cascata precisa dizer que é; o padrão é esperar.
 *
 * O arquivo é puro: entra uma lista de pedidos, sai uma lista com começo e
 * fim. É por isso que dá para conferir por teste a **ordem** — que era o outro
 * pedido da revisão: um teste de duração total não distingue "efeito depois do
 * encaixe" de "efeito junto com o encaixe", e foi exatamente essa confusão que
 * apareceu no aparelho.
 */

export interface PedidoDeBeat {
  /** Identidade estável, para a tela saber a que beat um desenho pertence. */
  readonly id: string;
  readonly especie: EspecieDeBeat;
  /**
   * Encadeia com o beat anterior em vez de esperar o fim dele.
   *
   * Só vale quando o anterior é da **mesma espécie**: a cascata existe para
   * repetições do mesmo gesto, e não para atropelar um beat diferente.
   */
  readonly emCascata?: boolean;
}

export interface BeatNaFila {
  readonly id: string;
  readonly especie: EspecieDeBeat;
  readonly inicioMs: number;
  readonly duracaoMs: number;
  readonly fimMs: number;
}

/**
 * Coloca os pedidos no tempo, um depois do outro.
 *
 * O resultado preserva a ordem de entrada: a fila não reordena nada. Quem
 * decide a ordem dos acontecimentos é quem monta o lote, porque a ordem é
 * narrativa — e narrativa não se deduz de uma tabela de prioridade.
 */
export const enfileirar = (
  pedidos: readonly PedidoDeBeat[],
  andamento: Andamento = 'normal',
): readonly BeatNaFila[] => {
  const fila: BeatNaFila[] = [];
  const passo = passoDaCascata(andamento);

  for (const pedido of pedidos) {
    const duracaoMs = duracaoDoBeat(pedido.especie, andamento);
    const anterior = fila.at(-1);
    const inicioMs =
      anterior === undefined
        ? 0
        : pedido.emCascata === true && anterior.especie === pedido.especie
          ? anterior.inicioMs + passo
          : anterior.fimMs;
    fila.push({
      id: pedido.id,
      especie: pedido.especie,
      inicioMs,
      duracaoMs,
      fimMs: inicioMs + duracaoMs,
    });
  }

  return fila;
};

/** Quanto a apresentação inteira leva. */
export const duracaoDaFila = (fila: readonly BeatNaFila[]): number =>
  fila.reduce((maior, beat) => Math.max(maior, beat.fimMs), 0);

/** O primeiro beat de uma espécie, quando ele existe na fila. */
export const primeiroBeat = (
  fila: readonly BeatNaFila[],
  especie: EspecieDeBeat,
): BeatNaFila | null => fila.find((beat) => beat.especie === especie) ?? null;

/** Quando um beat começa. `null` vira zero: quem não está na fila não espera. */
export const inicioDe = (fila: readonly BeatNaFila[], id: string): number =>
  fila.find((beat) => beat.id === id)?.inicioMs ?? 0;

/** Os beats no ar neste instante. */
export const beatsNoAr = (fila: readonly BeatNaFila[], agoraMs: number): readonly BeatNaFila[] =>
  fila.filter((beat) => agoraMs >= beat.inicioMs && agoraMs < beat.fimMs);

/**
 * Os beats que começaram entre dois instantes.
 *
 * É por aqui que o som sai: uma voz nasce **com** o beat dela, e nunca com um
 * cronômetro próprio. Cinco sons empilhados num quadro era o sintoma de ler o
 * log em vez de ler a fila.
 */
export const beatsQueComecaram = (
  fila: readonly BeatNaFila[],
  deMs: number,
  ateMs: number,
): readonly BeatNaFila[] => fila.filter((beat) => beat.inicioMs > deMs && beat.inicioMs <= ateMs);
