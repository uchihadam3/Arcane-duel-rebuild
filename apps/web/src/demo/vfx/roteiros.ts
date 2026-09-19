import type { CardId } from '@arcane-duel/shared-types';

import type { EventoDaDemo } from '../som/vozes.js';

/*
 * Os efeitos das quatro cartas-modelo.
 *
 * Um efeito aqui é um **roteiro**: uma lista de beats com começo, duração e
 * som. Ele não desenha nada — quem desenha é a camada de efeitos, lendo o beat
 * que está no ar. Separar as duas coisas é o que permite conferir por teste que
 * Meteoro dura entre 2,5 e 4 segundos sem precisar de navegador, e o que
 * garante que som e imagem saiam no mesmo quadro: os dois leem o mesmo beat.
 *
 * Nenhum roteiro decide regra. Quando o primeiro beat começa, o motor já
 * resolveu tudo: Dano, Guarda e Ruptura já estão no estado. O roteiro conta o
 * que aconteceu; ele não faz acontecer.
 */

export type FormaDoBeat =
  /** Energia se juntando no pedestal de origem. */
  | 'concentrar'
  /** Deslocamento de ar antes do golpe. */
  | 'pressao'
  /** O golpe atravessando o campo. */
  | 'golpe'
  /** Lascas voando do ponto de impacto. */
  | 'fragmentos'
  /** A pancada no alvo. */
  | 'impacto'
  /** A defesa aparecendo na frente do alvo. */
  | 'guarda'
  /** Faíscas do encontro de duas lâminas. */
  | 'faiscas'
  /** Círculo de runas abrindo. */
  | 'runa'
  /** Um projétil viajando, com rastro. */
  | 'projetil'
  /** Explosão. */
  | 'explosao'
  /** Fumaça e brasas se dissipando. */
  | 'dissipar'
  /** A arena escurecendo antes de um momento grande. */
  | 'escurecer'
  /** Um corpo caindo do alto. */
  | 'queda'
  /** Onda de choque no plano do campo. */
  | 'onda'
  /** A luz residual voltando ao normal. */
  | 'restaurar';

export interface Beat {
  readonly forma: FormaDoBeat;
  /** Quando começa, em ms a partir do início do efeito. */
  readonly emMs: number;
  readonly duracaoMs: number;
  /** Intensidade de 0 a 1: escala o tamanho e o brilho do desenho. */
  readonly forca: number;
  /** O som que nasce com este beat, quando há um. */
  readonly som?: EventoDaDemo;
}

export interface RoteiroDeEfeito {
  readonly carta: string;
  readonly nome: string;
  readonly beats: readonly Beat[];
}

export const duracaoDoRoteiro = (roteiro: RoteiroDeEfeito): number =>
  roteiro.beats.reduce((maior, beat) => Math.max(maior, beat.emMs + beat.duracaoMs), 0);

/*
 * W08 — Golpe de Cerco.
 *
 * A leitura é peso. A energia se junta no pedestal, o ar desloca, o golpe
 * atravessa o centro e a pedra lasca. A pancada vem **depois** da travessia,
 * porque é o intervalo entre as duas que produz a sensação de massa — cortar
 * esse intervalo transforma um golpe pesado num estalo.
 */
const GOLPE_DE_CERCO: RoteiroDeEfeito = {
  carta: 'W08',
  nome: 'Golpe de Cerco',
  beats: [
    { forma: 'concentrar', emMs: 0, duracaoMs: 260, forca: 0.7, som: 'metal' },
    { forma: 'pressao', emMs: 180, duracaoMs: 320, forca: 0.8, som: 'investida' },
    { forma: 'golpe', emMs: 420, duracaoMs: 300, forca: 1 },
    { forma: 'impacto', emMs: 700, duracaoMs: 240, forca: 1, som: 'impacto-pesado' },
    { forma: 'fragmentos', emMs: 740, duracaoMs: 560, forca: 0.85, som: 'detrito' },
    { forma: 'dissipar', emMs: 980, duracaoMs: 420, forca: 0.4 },
  ],
};

/*
 * W15 — Aparar.
 *
 * Ele não é um efeito solto: acontece **no instante do impacto** do Ataque que
 * está sendo aparado. A guarda aparece na frente do alvo, as faíscas nascem do
 * encontro, e parte do golpe é desviada. Curto de propósito — uma defesa longa
 * lê como contra-ataque.
 */
const APARAR: RoteiroDeEfeito = {
  carta: 'W15',
  nome: 'Aparar',
  beats: [
    { forma: 'guarda', emMs: 0, duracaoMs: 220, forca: 0.9, som: 'metal' },
    { forma: 'faiscas', emMs: 90, duracaoMs: 320, forca: 1, som: 'metal' },
    { forma: 'dissipar', emMs: 300, duracaoMs: 260, forca: 0.3 },
  ],
};

/*
 * M02 — Bola de Fogo.
 *
 * A runa abre, o fogo se junta, a esfera nasce e atravessa a arena com rastro.
 * A explosão acende a arena inteira por um instante, e a fumaça leva meio
 * segundo para sumir. É o oposto do Guerreiro: aqui o tempo está na **cauda**,
 * e não na preparação.
 */
const BOLA_DE_FOGO: RoteiroDeEfeito = {
  carta: 'M02',
  nome: 'Bola de Fogo',
  beats: [
    { forma: 'runa', emMs: 0, duracaoMs: 340, forca: 0.75, som: 'carregar-runa' },
    { forma: 'concentrar', emMs: 220, duracaoMs: 260, forca: 0.9, som: 'zumbido-arcano' },
    { forma: 'projetil', emMs: 440, duracaoMs: 420, forca: 1, som: 'lancar-fogo' },
    { forma: 'explosao', emMs: 840, duracaoMs: 300, forca: 1, som: 'impacto-de-fogo' },
    { forma: 'dissipar', emMs: 1040, duracaoMs: 620, forca: 0.6 },
  ],
};

/*
 * MU01 — Meteoro.
 *
 * Este é o teste de Ultimate, e a tarefa deu a faixa: **2,5 a 4 segundos**.
 * Ele precisa ler como acontecimento, e por isso começa tirando luz da arena —
 * escurecer antes é o que faz o brilho seguinte parecer grande. O círculo abre
 * no alto, o brilho cresce, a coisa entra no quadro com rastro, bate, a onda
 * atravessa o campo, o fogo fica, e a luz volta devagar.
 *
 * A câmera não se mexe em nenhum beat. Durante o Meteoro da máquina, o jogador
 * continua vendo a arena do lado dele — é exatamente essa a exigência da
 * tarefa, e é por isso que não existe beat de câmera aqui.
 */
const METEORO: RoteiroDeEfeito = {
  carta: 'MU01',
  nome: 'Meteoro',
  beats: [
    { forma: 'escurecer', emMs: 0, duracaoMs: 620, forca: 0.85, som: 'ultimate-preparar' },
    { forma: 'runa', emMs: 320, duracaoMs: 900, forca: 1 },
    { forma: 'concentrar', emMs: 900, duracaoMs: 620, forca: 1 },
    { forma: 'queda', emMs: 1420, duracaoMs: 640, forca: 1, som: 'ultimate-queda' },
    { forma: 'explosao', emMs: 2020, duracaoMs: 420, forca: 1, som: 'ultimate-explosao' },
    { forma: 'onda', emMs: 2100, duracaoMs: 560, forca: 1 },
    { forma: 'fragmentos', emMs: 2140, duracaoMs: 700, forca: 0.9, som: 'detrito' },
    { forma: 'dissipar', emMs: 2440, duracaoMs: 700, forca: 0.7 },
    { forma: 'restaurar', emMs: 2860, duracaoMs: 560, forca: 1 },
  ],
};

/**
 * O roteiro genérico.
 *
 * As outras vinte e seis cartas do slice usam este. Ele é curto, neutro e
 * **honesto**: um impacto e nada mais. Se ele fosse rico, ninguém distinguiria
 * o que já foi desenhado do que ainda não foi — que é justamente o que esta
 * tarefa precisa deixar claro.
 */
export const ROTEIRO_NEUTRO: RoteiroDeEfeito = {
  carta: '',
  nome: 'Efeito neutro',
  beats: [
    { forma: 'impacto', emMs: 0, duracaoMs: 240, forca: 0.55, som: 'metal' },
    { forma: 'dissipar', emMs: 180, duracaoMs: 260, forca: 0.3 },
  ],
};

const POR_CARTA: Readonly<Record<string, RoteiroDeEfeito>> = {
  W08: GOLPE_DE_CERCO,
  W15: APARAR,
  M02: BOLA_DE_FOGO,
  MU01: METEORO,
};

export const ROTEIROS_MODELO: readonly RoteiroDeEfeito[] = [
  GOLPE_DE_CERCO,
  APARAR,
  BOLA_DE_FOGO,
  METEORO,
];

export const roteiroDaCarta = (carta: CardId | string): RoteiroDeEfeito =>
  POR_CARTA[String(carta)] ?? ROTEIRO_NEUTRO;

/** Os beats no ar neste instante, com o progresso de cada um. */
export interface BeatEmCena extends Beat {
  /** 0 a 1 dentro deste beat. */
  readonly progresso: number;
}

export const beatsNoAr = (roteiro: RoteiroDeEfeito, decorridoMs: number): readonly BeatEmCena[] =>
  roteiro.beats
    .filter((beat) => decorridoMs >= beat.emMs && decorridoMs < beat.emMs + beat.duracaoMs)
    .map((beat) => ({
      ...beat,
      progresso: (decorridoMs - beat.emMs) / beat.duracaoMs,
    }));

/** Os beats que começaram exatamente neste passo, para disparar o som. */
export const beatsQueComecaram = (
  roteiro: RoteiroDeEfeito,
  anteriorMs: number,
  agoraMs: number,
): readonly Beat[] =>
  roteiro.beats.filter((beat) => beat.emMs > anteriorMs && beat.emMs <= agoraMs);
