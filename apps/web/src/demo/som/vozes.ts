import type { Destino } from './sintese.js';
import { ruido, tom } from './sintese.js';

/*
 * O vocabulário sonoro da Demo V2.
 *
 * Cada evento é uma **receita de camadas**, e não um som. A regra que guiou
 * todas elas: transiente curto e brilhante, corpo com altura, cauda no
 * ambiente. Quando um evento tem consequência de regra — Ruptura, Ultimate —
 * ele ganha uma camada grave que os outros não têm, para o jogador aprender a
 * diferença sem olhar.
 *
 * As classes soam diferentes de propósito. O Guerreiro é metal e massa: ruído
 * de banda larga, corpo baixo, cauda curta. O Mago é vidro e energia: FM com
 * razão não inteira, corpo agudo, cauda longa.
 */

export type EventoDaDemo =
  /* Interface */
  | 'passar'
  | 'pegar'
  | 'soltar'
  /* Carta */
  | 'levantar'
  | 'deslizar'
  | 'encaixar'
  /* Guerreiro */
  | 'metal'
  | 'investida'
  | 'impacto-pesado'
  | 'detrito'
  /* Mago */
  | 'zumbido-arcano'
  | 'carregar-runa'
  | 'lancar-fogo'
  | 'impacto-de-fogo'
  /* Momentos */
  | 'ruptura'
  | 'ultimate-preparar'
  | 'ultimate-queda'
  | 'ultimate-explosao'
  | 'virar-turno'
  | 'vitoria'
  | 'derrota';

export type Barramento = 'interface' | 'efeitos';

export const BARRAMENTO_DO_EVENTO: Readonly<Record<EventoDaDemo, Barramento>> = {
  passar: 'interface',
  pegar: 'interface',
  soltar: 'interface',
  levantar: 'interface',
  deslizar: 'interface',
  encaixar: 'interface',
  metal: 'efeitos',
  investida: 'efeitos',
  'impacto-pesado': 'efeitos',
  detrito: 'efeitos',
  'zumbido-arcano': 'efeitos',
  'carregar-runa': 'efeitos',
  'lancar-fogo': 'efeitos',
  'impacto-de-fogo': 'efeitos',
  ruptura: 'efeitos',
  'ultimate-preparar': 'efeitos',
  'ultimate-queda': 'efeitos',
  'ultimate-explosao': 'efeitos',
  'virar-turno': 'interface',
  vitoria: 'efeitos',
  derrota: 'efeitos',
};

/** Quanto cada evento abaixa a música enquanto acontece, de 0 a 1. */
export const DUCKING_DO_EVENTO: Readonly<Partial<Record<EventoDaDemo, number>>> = {
  ruptura: 0.45,
  'ultimate-preparar': 0.6,
  'ultimate-queda': 0.75,
  'ultimate-explosao': 0.85,
  vitoria: 0.5,
  derrota: 0.5,
};

type Receita = (destino: Destino) => void;

const RECEITAS: Readonly<Record<EventoDaDemo, Receita>> = {
  /* ---- Interface: curtas, secas, discretas -------------------------- */
  passar: (d) => {
    ruido(d, { duracaoMs: 42, ganho: 0.05, frequenciaInicial: 3800, ressonancia: 1.4 });
  },
  pegar: (d) => {
    // O atrito do papelão saindo do monte, e uma nota curta confirmando.
    ruido(d, {
      duracaoMs: 90,
      ganho: 0.12,
      frequenciaInicial: 2400,
      frequenciaFinal: 5200,
      ressonancia: 0.8,
    });
    tom(d, { duracaoMs: 110, ganho: 0.07, onda: 'triangle', de: 520, para: 760, corte: 4200 });
  },
  soltar: (d) => {
    ruido(d, { duracaoMs: 70, ganho: 0.1, frequenciaInicial: 5200, frequenciaFinal: 1800 });
    tom(d, { duracaoMs: 90, ganho: 0.06, onda: 'triangle', de: 700, para: 420, corte: 3600 });
  },

  /* ---- Carta: o corpo físico do movimento ---------------------------- */
  levantar: (d) => {
    ruido(d, {
      duracaoMs: 150,
      ganho: 0.1,
      frequenciaInicial: 1400,
      frequenciaFinal: 3600,
      ressonancia: 0.7,
    });
    tom(d, { duracaoMs: 180, ganho: 0.05, onda: 'sine', de: 260, para: 430, corte: 2600 });
  },
  deslizar: (d) => {
    ruido(d, {
      duracaoMs: 260,
      ganho: 0.09,
      tipoDeFiltro: 'bandpass',
      frequenciaInicial: 900,
      frequenciaFinal: 2600,
      ressonancia: 0.6,
      ataqueMs: 60,
      enviarAoAmbiente: 0.12,
    });
  },
  encaixar: (d) => {
    /*
     * O travamento no pedestal.
     *
     * Três camadas: o estalo do contato, o corpo de madeira e pedra, e um
     * pinguinho metálico do fio de ouro do encaixe. É esse terceiro que faz o
     * som pertencer a **esta** arena e não a qualquer mesa.
     */
    ruido(d, {
      duracaoMs: 55,
      ganho: 0.3,
      frequenciaInicial: 2600,
      frequenciaFinal: 700,
      ressonancia: 1.2,
    });
    tom(d, {
      duracaoMs: 190,
      ganho: 0.2,
      onda: 'sine',
      de: 150,
      para: 86,
      corte: 1200,
      enviarAoAmbiente: 0.2,
    });
    tom(d, {
      atrasoMs: 12,
      duracaoMs: 340,
      ganho: 0.07,
      onda: 'sine',
      de: 2100,
      moduladora: { razao: 2.41, profundidade: 0.6 },
      corte: 6500,
      enviarAoAmbiente: 0.45,
    });
  },

  /* ---- Guerreiro: metal e massa -------------------------------------- */
  metal: (d) => {
    ruido(d, {
      duracaoMs: 70,
      ganho: 0.24,
      frequenciaInicial: 4200,
      frequenciaFinal: 1500,
      ressonancia: 1.1,
    });
    tom(d, {
      duracaoMs: 520,
      ganho: 0.13,
      onda: 'sine',
      de: 880,
      moduladora: { razao: 1.73, profundidade: 1.4 },
      corte: 7000,
      enviarAoAmbiente: 0.5,
    });
  },
  investida: (d) => {
    // O deslocamento de ar antes do golpe: sobe e é cortado pelo impacto.
    ruido(d, {
      duracaoMs: 420,
      ganho: 0.22,
      tipoDeFiltro: 'bandpass',
      frequenciaInicial: 260,
      frequenciaFinal: 1900,
      ressonancia: 0.5,
      ataqueMs: 180,
      enviarAoAmbiente: 0.25,
    });
    tom(d, { duracaoMs: 400, ganho: 0.08, onda: 'sawtooth', de: 70, para: 130, corte: 500 });
  },
  'impacto-pesado': (d) => {
    ruido(d, {
      duracaoMs: 90,
      ganho: 0.42,
      frequenciaInicial: 1800,
      frequenciaFinal: 260,
      ressonancia: 0.9,
    });
    tom(d, {
      duracaoMs: 420,
      ganho: 0.34,
      onda: 'sine',
      de: 118,
      para: 44,
      corte: 900,
      enviarAoAmbiente: 0.35,
    });
    tom(d, {
      atrasoMs: 8,
      duracaoMs: 260,
      ganho: 0.12,
      onda: 'square',
      de: 320,
      para: 150,
      corte: 1400,
    });
  },
  detrito: (d) => {
    // Pedra caindo: três estalos irregulares, cada um menor que o anterior.
    for (const [atraso, ganho, corte] of [
      [0, 0.12, 3200],
      [90, 0.08, 2400],
      [210, 0.05, 1800],
    ]) {
      ruido(d, {
        atrasoMs: atraso ?? 0,
        duracaoMs: 70,
        ganho: ganho ?? 0.1,
        frequenciaInicial: corte ?? 2400,
        frequenciaFinal: 600,
        ressonancia: 1.6,
        enviarAoAmbiente: 0.3,
      });
    }
  },

  /* ---- Mago: vidro e energia ------------------------------------------ */
  'zumbido-arcano': (d) => {
    tom(d, {
      duracaoMs: 620,
      ganho: 0.1,
      onda: 'sine',
      de: 196,
      moduladora: { razao: 3.51, profundidade: 0.35 },
      largura: 9,
      ataqueMs: 160,
      corte: 3200,
      enviarAoAmbiente: 0.6,
    });
  },
  'carregar-runa': (d) => {
    // Sobe em altura e em brilho: a energia se acumulando antes de sair.
    tom(d, {
      duracaoMs: 700,
      ganho: 0.16,
      onda: 'sawtooth',
      de: 180,
      para: 720,
      largura: 12,
      ataqueMs: 240,
      corte: 5200,
      enviarAoAmbiente: 0.45,
    });
    ruido(d, {
      duracaoMs: 700,
      ganho: 0.08,
      frequenciaInicial: 700,
      frequenciaFinal: 6400,
      ressonancia: 2.4,
      ataqueMs: 300,
    });
  },
  'lancar-fogo': (d) => {
    ruido(d, {
      duracaoMs: 340,
      ganho: 0.3,
      tipoDeFiltro: 'bandpass',
      frequenciaInicial: 3200,
      frequenciaFinal: 900,
      ressonancia: 0.55,
      enviarAoAmbiente: 0.3,
    });
    tom(d, { duracaoMs: 300, ganho: 0.12, onda: 'sawtooth', de: 420, para: 140, corte: 2400 });
  },
  'impacto-de-fogo': (d) => {
    ruido(d, {
      duracaoMs: 130,
      ganho: 0.4,
      frequenciaInicial: 2600,
      frequenciaFinal: 200,
      ressonancia: 0.6,
    });
    tom(d, {
      duracaoMs: 520,
      ganho: 0.28,
      onda: 'sine',
      de: 96,
      para: 38,
      corte: 700,
      enviarAoAmbiente: 0.4,
    });
    ruido(d, {
      atrasoMs: 70,
      duracaoMs: 680,
      ganho: 0.1,
      tipoDeFiltro: 'lowpass',
      frequenciaInicial: 1600,
      frequenciaFinal: 320,
      ataqueMs: 120,
      enviarAoAmbiente: 0.55,
    });
  },

  /* ---- Momentos: eles têm grave, e os outros não ---------------------- */
  ruptura: (d) => {
    ruido(d, {
      duracaoMs: 120,
      ganho: 0.4,
      frequenciaInicial: 5200,
      frequenciaFinal: 700,
      ressonancia: 1.4,
    });
    tom(d, {
      duracaoMs: 700,
      ganho: 0.3,
      onda: 'sine',
      de: 150,
      para: 46,
      corte: 1100,
      enviarAoAmbiente: 0.5,
    });
    tom(d, {
      atrasoMs: 20,
      duracaoMs: 900,
      ganho: 0.14,
      onda: 'triangle',
      de: 1400,
      moduladora: { razao: 1.41, profundidade: 1.1 },
      corte: 7200,
      enviarAoAmbiente: 0.7,
    });
  },
  'ultimate-preparar': (d) => {
    tom(d, {
      duracaoMs: 1400,
      ganho: 0.22,
      onda: 'sawtooth',
      de: 58,
      para: 220,
      largura: 16,
      ataqueMs: 700,
      corte: 2600,
      enviarAoAmbiente: 0.5,
    });
    ruido(d, {
      duracaoMs: 1400,
      ganho: 0.12,
      frequenciaInicial: 300,
      frequenciaFinal: 4200,
      ressonancia: 1.8,
      ataqueMs: 900,
    });
  },
  'ultimate-queda': (d) => {
    ruido(d, {
      duracaoMs: 900,
      ganho: 0.3,
      tipoDeFiltro: 'bandpass',
      frequenciaInicial: 5200,
      frequenciaFinal: 380,
      ressonancia: 0.5,
      ataqueMs: 120,
      enviarAoAmbiente: 0.4,
    });
    tom(d, { duracaoMs: 900, ganho: 0.18, onda: 'sawtooth', de: 300, para: 70, corte: 1400 });
  },
  'ultimate-explosao': (d) => {
    ruido(d, {
      duracaoMs: 200,
      ganho: 0.5,
      frequenciaInicial: 6000,
      frequenciaFinal: 160,
      ressonancia: 0.5,
    });
    tom(d, {
      duracaoMs: 1500,
      ganho: 0.42,
      onda: 'sine',
      de: 88,
      para: 28,
      corte: 600,
      enviarAoAmbiente: 0.6,
    });
    tom(d, {
      atrasoMs: 10,
      duracaoMs: 700,
      ganho: 0.2,
      onda: 'square',
      de: 240,
      para: 60,
      corte: 1100,
    });
    ruido(d, {
      atrasoMs: 160,
      duracaoMs: 1800,
      ganho: 0.14,
      tipoDeFiltro: 'lowpass',
      frequenciaInicial: 1400,
      frequenciaFinal: 200,
      ataqueMs: 260,
      enviarAoAmbiente: 0.8,
    });
  },
  'virar-turno': (d) => {
    tom(d, {
      duracaoMs: 620,
      ganho: 0.12,
      onda: 'sine',
      de: 294,
      moduladora: { razao: 2.02, profundidade: 0.5 },
      ataqueMs: 24,
      corte: 5200,
      enviarAoAmbiente: 0.5,
    });
    tom(d, {
      atrasoMs: 90,
      duracaoMs: 520,
      ganho: 0.08,
      onda: 'sine',
      de: 392,
      corte: 4200,
      enviarAoAmbiente: 0.5,
    });
  },
  vitoria: (d) => {
    // Tríade maior ascendente sobre a tônica da trilha: D, F#, A.
    [
      [293.66, 0],
      [369.99, 120],
      [440.0, 240],
      [587.33, 380],
    ].forEach(([frequencia, atraso]) => {
      tom(d, {
        atrasoMs: atraso ?? 0,
        duracaoMs: 1200,
        ganho: 0.14,
        onda: 'triangle',
        de: frequencia ?? 440,
        largura: 7,
        ataqueMs: 30,
        corte: 6200,
        enviarAoAmbiente: 0.65,
      });
    });
  },
  derrota: (d) => {
    // A mesma tríade, menor e descendente. O jogo sabe o que aconteceu.
    [
      [440.0, 0],
      [349.23, 160],
      [293.66, 320],
      [146.83, 480],
    ].forEach(([frequencia, atraso]) => {
      tom(d, {
        atrasoMs: atraso ?? 0,
        duracaoMs: 1500,
        ganho: 0.13,
        onda: 'sine',
        de: frequencia ?? 220,
        largura: 5,
        ataqueMs: 60,
        corte: 2600,
        enviarAoAmbiente: 0.7,
      });
    });
  },
};

export const tocarVoz = (destino: Destino, evento: EventoDaDemo): void => {
  RECEITAS[evento](destino);
};

/** Quantas camadas cada evento usa. Exposto para o teste medir a densidade. */
export const EVENTOS_DA_DEMO = Object.keys(RECEITAS) as readonly EventoDaDemo[];
