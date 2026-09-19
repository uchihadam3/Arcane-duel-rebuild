import { describe, expect, it } from 'vitest';
import type { EventoUniversal } from '@arcane-duel/rules-engine';
import { cardId } from '@arcane-duel/shared-types';

import { JOGADOR_1, JOGADOR_2 } from './controlador.js';
import type { ContextoDoRoteiro } from './roteiro.js';
import { roteirizar } from './roteiro.js';
import {
  CARTAS_DO_VERTICAL_SLICE,
  familiaDaCarta,
  familiaDaDefesaInata,
} from './familia-visual.js';

/*
 * Do evento do motor ao beat da tela.
 *
 * Três coisas são conferidas aqui, e só três, porque só três importam:
 *
 * 1. o roteiro **lê** o que o motor produziu e não inventa nada;
 * 2. ele não deixa vazar identidade de carta que o observador não pode ver;
 * 3. um Ataque vira telegrafia, viagem, impacto e consequência — nessa ordem.
 */

const CONTEXTO: ContextoDoRoteiro = {
  observador: JOGADOR_1,
  classeDoObservador: 'guerreiro',
  classeDoAdversario: 'mago',
  cartasVisiveis: new Set(['W02', 'M02']),
};

const ataqueCompleto: readonly EventoUniversal[] = [
  { tipo: 'acao-declarada', jogador: JOGADOR_1, indice: 0, carta: cardId('W02') },
  { tipo: 'impacto-aplicado', alvo: JOGADOR_2, valor: 2, guardaAntes: 6, guardaDepois: 4 },
  { tipo: 'dano-aplicado', alvo: JOGADOR_2, valor: 3, vidaAntes: 30, vidaDepois: 27 },
  { tipo: 'carta-para-cooldown', jogador: JOGADOR_1, carta: cardId('W02'), zona: 1 },
];

describe('roteiro de um Ataque', () => {
  it('conta os três tempos: telegrafia, viagem e impacto', () => {
    const beats = roteirizar(ataqueCompleto, CONTEXTO, 'lote-1');
    const tipos = beats.map((beat) => beat.tipo);

    expect(tipos[0]).toBe('declaracao');
    expect(tipos).toContain('viagem');
    expect(tipos.indexOf('viagem')).toBeLessThan(tipos.indexOf('impacto'));
    expect(tipos).toContain('numero-flutuante');
  });

  it('só faz o efeito viajar uma vez, mesmo com Impacto e Dano no mesmo Ataque', () => {
    // Dois eventos de consequência, um trajeto só: o olho segue uma linha.
    const beats = roteirizar(ataqueCompleto, CONTEXTO, 'lote-1');
    expect(beats.filter((beat) => beat.tipo === 'viagem')).toHaveLength(1);
  });

  it('diz o valor no ponto do impacto, além das barras', () => {
    const beats = roteirizar(ataqueCompleto, CONTEXTO, 'lote-1');
    const numeros = beats.filter((beat) => beat.tipo === 'numero-flutuante');
    const rotulos = numeros.flatMap((beat) => beat.valores.map((valor) => valor.rotulo));

    expect(rotulos).toContain('GUARDA');
    expect(rotulos).toContain('VIDA');
    for (const beat of numeros) {
      expect(beat.destino, 'o número precisa de um ponto de âncora').not.toBeNull();
    }
  });

  it('põe origem e destino como chave de âncora, nunca como coordenada', () => {
    const beats = roteirizar(ataqueCompleto, CONTEXTO, 'lote-1');
    for (const beat of beats) {
      for (const ponto of [beat.origem, beat.destino]) {
        if (ponto === null) continue;
        expect(ponto, `${ponto} não é chave de âncora`).toMatch(
          /^(proprio|adversario):[a-z-]+[0-9]*:\d+$/,
        );
      }
    }
  });

  it('distingue dois lotes iguais em turnos diferentes', () => {
    const primeiro = roteirizar(ataqueCompleto, CONTEXTO, 'lote-1').map((beat) => beat.id);
    const segundo = roteirizar(ataqueCompleto, CONTEXTO, 'lote-2').map((beat) => beat.id);
    expect(new Set([...primeiro, ...segundo]).size).toBe(primeiro.length + segundo.length);
  });

  it('marca o lado certo: o alvo do dano é quem acende', () => {
    const beats = roteirizar(ataqueCompleto, CONTEXTO, 'lote-1');
    const impacto = beats.find((beat) => beat.tipo === 'impacto');
    expect(impacto?.lado).toBe('adversario');
  });
});

describe('a apresentação obedece a projeção', () => {
  it('não nomeia uma carta que este observador não pode conhecer', () => {
    const eventos: readonly EventoUniversal[] = [
      { tipo: 'passiva-revelada', jogador: JOGADOR_2, carta: cardId('MP06') },
      { tipo: 'emboscada-armada', jogador: JOGADOR_2, carta: cardId('R13') },
    ];
    const beats = roteirizar(eventos, CONTEXTO, 'lote-1');

    for (const beat of beats) {
      expect(beat.carta, 'identidade vazou para a apresentação').toBeNull();
      expect(beat.rotulo, 'o nome da carta vazou no rótulo').toBeNull();
    }
    // E o identificador também não aparece em lugar nenhum do beat.
    expect(JSON.stringify(beats)).not.toContain('R13');
    expect(JSON.stringify(beats)).not.toContain('MP06');
  });

  it('não deixa a cor do efeito entregar a carta oculta', () => {
    /*
     * Um efeito que usasse a família da carta secreta contaria por cor o que o
     * texto não conta. Sem direito de ver, o efeito usa a linguagem da classe,
     * que já é pública.
     */
    const beats = roteirizar(
      [{ tipo: 'passiva-revelada', jogador: JOGADOR_2, carta: cardId('MP06') }],
      CONTEXTO,
      'lote-1',
    );
    expect(beats[0]?.familia).toBe(familiaDaDefesaInata('mago'));
    expect(beats[0]?.familia).not.toBe(familiaDaCarta(cardId('MP06')));
  });

  it('nomeia normalmente o que o observador tem direito de ver', () => {
    const beats = roteirizar(
      [{ tipo: 'acao-declarada', jogador: JOGADOR_1, indice: 1, carta: cardId('W02') }],
      CONTEXTO,
      'lote-1',
    );
    expect(beats[0]?.carta).toBe('W02');
    expect(beats[0]?.rotulo).toBe('Ombro de Guerra');
  });
});

describe('famílias visuais do vertical slice', () => {
  it('cobre as trinta cartas das Receitas 1 de Guerreiro e Mago', () => {
    expect(CARTAS_DO_VERTICAL_SLICE).toHaveLength(30);
  });

  it('dá a cada uma delas uma família, e nunca a neutra', () => {
    for (const carta of CARTAS_DO_VERTICAL_SLICE) {
      expect(familiaDaCarta(cardId(carta)), `${carta} ficou sem tratamento`).not.toBe('neutro');
    }
  });

  it('separa a Defesa Inata das duas classes', () => {
    expect(familiaDaDefesaInata('guerreiro')).toBe('guarda-marcial');
    expect(familiaDaDefesaInata('mago')).toBe('barreira-arcana');
  });

  it('deixa as outras dez classes na linguagem genérica, sem fingir acabamento', () => {
    // Clérigo não está no vertical slice: a honestidade aqui é não inventar
    // uma identidade visual que ainda não foi desenhada.
    expect(familiaDaCarta(cardId('C01'))).toBe('neutro');
  });
});
