import { TABULEIRO } from '../arena/planta.js';

/*
 * A câmera.
 *
 * Fixa, e literalmente: é uma transformação CSS constante. Não existe função
 * que a mova, não existe estado que a gire, e o turno da máquina usa
 * exatamente o mesmo valor que o turno do jogador. Durante Resposta, durante
 * Ultimate, durante o turno inteiro da IA: o mesmo número.
 */
export const CAMERA = {
  /**
   * A inclinação da mesa.
   *
   * 47°, e o número sai de uma conta, não de gosto.
   *
   * A zona da arena em 915×412 é uma faixa de quase 4,2 para 1. Um tabuleiro
   * de 2400 × 920 projeta com proporção `(L · f) / (A · cos θ)`; igualando
   * isso a 4,2 sai cos θ ≈ 0,68, ou seja 47°. Mais inclinado do que isso a
   * mesa vira parede e a fileira do fundo encolhe até a carta lá deixar de
   * ser identificável; menos, e o campo não preenche a faixa.
   */
  inclinacaoEmGraus: 47,
  /** Distância da perspectiva, em pixels de tela. Maior = lente mais longa. */
  perspectiva: 2600,
  /**
   * Onde o ponto de fuga fica na altura da área da arena.
   *
   * Acima do meio, porque quem olha está do lado de baixo da mesa: o horizonte
   * de uma mesa vista por alguém sentado nela fica alto.
   */
  origemVertical: 0.4,
} as const;

const RADIANOS = (CAMERA.inclinacaoEmGraus * Math.PI) / 180;

/**
 * Onde um ponto do tabuleiro cai, medido do centro do tabuleiro, em pixels.
 *
 * Esta conta existe só para **enquadrar**: para saber que escala faz o campo
 * caber na área que ele recebeu. Ela não é usada para posicionar peça nenhuma,
 * e é de propósito — peça é filha do elemento transformado e herda a
 * perspectiva do navegador. Uma projeção nossa usada para posicionar é
 * exatamente o que deformou a Etapa 6.
 */
const projetar = (
  yLocal: number,
  escala: number,
): { readonly fator: number; readonly y: number } => {
  const yEscalado = yLocal * escala;
  const z = yEscalado * Math.sin(RADIANOS);
  const fator = CAMERA.perspectiva / (CAMERA.perspectiva - z);
  return { fator, y: yEscalado * Math.cos(RADIANOS) * fator };
};

export interface Enquadramento {
  readonly escala: number;
  /** Quanto subir o tabuleiro, em pixels de tela, para centrar o projetado. */
  readonly deslocamentoY: number;
}

/**
 * A escala que faz o tabuleiro caber na área que ele recebeu.
 *
 * A escala sai de uma busca curta, e não de uma fórmula fechada: o fator de
 * perspectiva depende da escala, que é o que se está procurando, e a relação
 * não se inverte de forma limpa. Multiplicar a escala pela razão entre o que
 * se quer e o que se mediu é uma contração, e uma dúzia de passadas chega a
 * menos de um milésimo.
 *
 * O deslocamento recentraliza o que sobrou: sem ele o campo fica pendurado
 * para baixo, porque a metade da frente projeta mais alta que a do fundo.
 */
export const enquadrarTabuleiro = (largura: number, altura: number): Enquadramento => {
  if (largura <= 0 || altura <= 0) return { escala: 1, deslocamentoY: 0 };
  const meiaAltura = TABULEIRO.altura / 2;
  const meiaLargura = TABULEIRO.largura / 2;

  let escala = Math.min(largura / TABULEIRO.largura, altura / TABULEIRO.altura);
  for (let passo = 0; passo < 16; passo += 1) {
    const frente = projetar(meiaAltura, escala);
    const fundo = projetar(-meiaAltura, escala);
    // A largura é medida na borda da frente, que é a mais próxima e a maior.
    const larguraProjetada = 2 * meiaLargura * escala * frente.fator;
    const alturaProjetada = frente.y - fundo.y;
    if (larguraProjetada <= 0 || alturaProjetada <= 0) break;
    const folga = Math.min(largura / larguraProjetada, altura / alturaProjetada);
    if (Math.abs(folga - 1) < 0.001) break;
    escala *= folga;
  }

  const frente = projetar(meiaAltura, escala);
  const fundo = projetar(-meiaAltura, escala);
  return { escala, deslocamentoY: -(frente.y + fundo.y) / 2 };
};
