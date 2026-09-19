import { describe, expect, it } from 'vitest';

import {
  ROTEIROS_MODELO,
  ROTEIRO_NEUTRO,
  beatsNoAr,
  beatsQueComecaram,
  duracaoDoRoteiro,
  roteiroDaCarta,
} from './roteiros.js';

/*
 * Os efeitos das quatro cartas-modelo.
 *
 * O que dá para conferir por máquina é a **forma** do efeito: que ele tem
 * começo, meio e fim; que o Meteoro dura o que a tarefa pediu; que as quatro
 * sequências são distintas; e que o som nasce junto do beat, e não de um
 * cronômetro paralelo. Se está bonito é outra conversa, e é do avaliador.
 */

describe('cada carta-modelo tem efeito próprio', () => {
  it('cobre exatamente as quatro cartas da tarefa', () => {
    expect(ROTEIROS_MODELO.map((roteiro) => roteiro.carta).sort()).toEqual([
      'M02',
      'MU01',
      'W08',
      'W15',
    ]);
  });

  it('as quatro sequências são diferentes entre si', () => {
    const assinaturas = ROTEIROS_MODELO.map((roteiro) =>
      roteiro.beats.map((beat) => beat.forma).join('>'),
    );
    expect(new Set(assinaturas).size).toBe(4);
  });

  it('cada uma tem pelo menos três beats: sem antecipação não há peso', () => {
    for (const roteiro of ROTEIROS_MODELO) {
      expect(roteiro.beats.length, roteiro.nome).toBeGreaterThanOrEqual(3);
    }
  });

  it('nenhuma carta fora das quatro recebe efeito de modelo', () => {
    expect(roteiroDaCarta('W09')).toBe(ROTEIRO_NEUTRO);
    expect(roteiroDaCarta('M03')).toBe(ROTEIRO_NEUTRO);
  });
});

describe('Meteoro é um momento', () => {
  /*
   * A tarefa deu a faixa: 2,5 a 4 segundos. Abaixo disso não lê como
   * acontecimento; acima, atrapalha o ritmo competitivo.
   */
  it('dura entre 2,5 e 4 segundos', () => {
    const meteoro = ROTEIROS_MODELO.find((roteiro) => roteiro.carta === 'MU01');
    expect(meteoro).toBeDefined();
    if (meteoro === undefined) return;
    const duracao = duracaoDoRoteiro(meteoro);
    expect(duracao).toBeGreaterThanOrEqual(2500);
    expect(duracao).toBeLessThanOrEqual(4000);
  });

  it('escurece antes de brilhar, e devolve a luz depois', () => {
    const meteoro = ROTEIROS_MODELO.find((roteiro) => roteiro.carta === 'MU01');
    if (meteoro === undefined) throw new Error('sem Meteoro');
    const formas = meteoro.beats.map((beat) => beat.forma);
    expect(formas[0]).toBe('escurecer');
    expect(formas[formas.length - 1]).toBe('restaurar');
    // A explosão vem entre os dois: se ela viesse antes de escurecer, o
    // escurecimento apagaria justamente o clarão.
    expect(formas.indexOf('explosao')).toBeGreaterThan(formas.indexOf('escurecer'));
    expect(formas.indexOf('explosao')).toBeLessThan(formas.indexOf('restaurar'));
  });

  /*
   * A câmera não entra no roteiro.
   *
   * A exigência da tarefa é explícita: durante o Meteoro da máquina, quem olha
   * continua do lado do jogador. Nenhum beat pode mover câmera — e a forma de
   * garantir isso é não existir beat de câmera nenhum no vocabulário.
   */
  it('nenhum beat de nenhum roteiro mexe na câmera', () => {
    for (const roteiro of [...ROTEIROS_MODELO, ROTEIRO_NEUTRO]) {
      for (const beat of roteiro.beats) {
        expect(beat.forma).not.toMatch(/camera|zoom|orbit/i);
      }
    }
  });
});

describe('os outros três efeitos leem o que deveriam ler', () => {
  it('Golpe de Cerco tem pressão antes do golpe e fragmentos depois do impacto', () => {
    const golpe = ROTEIROS_MODELO.find((roteiro) => roteiro.carta === 'W08');
    if (golpe === undefined) throw new Error('sem Golpe de Cerco');
    const emMs = new Map(golpe.beats.map((beat) => [beat.forma, beat.emMs]));
    expect(emMs.get('pressao')).toBeLessThan(emMs.get('golpe') ?? 0);
    expect(emMs.get('impacto')).toBeGreaterThan(emMs.get('golpe') ?? 0);
    expect(emMs.get('fragmentos')).toBeGreaterThanOrEqual(emMs.get('impacto') ?? 0);
  });

  it('Aparar é curto e defensivo: guarda antes das faíscas, sem golpe', () => {
    const aparar = ROTEIROS_MODELO.find((roteiro) => roteiro.carta === 'W15');
    if (aparar === undefined) throw new Error('sem Aparar');
    const formas = aparar.beats.map((beat) => beat.forma);
    expect(formas).toContain('guarda');
    expect(formas).toContain('faiscas');
    expect(formas).not.toContain('golpe');
    expect(duracaoDoRoteiro(aparar)).toBeLessThan(700);
  });

  it('Bola de Fogo abre runa, viaja e explode, nesta ordem', () => {
    const bola = ROTEIROS_MODELO.find((roteiro) => roteiro.carta === 'M02');
    if (bola === undefined) throw new Error('sem Bola de Fogo');
    const emMs = new Map(bola.beats.map((beat) => [beat.forma, beat.emMs]));
    expect(emMs.get('runa')).toBeLessThan(emMs.get('projetil') ?? 0);
    expect(emMs.get('projetil')).toBeLessThan(emMs.get('explosao') ?? 0);
    expect(emMs.get('dissipar')).toBeGreaterThan(emMs.get('explosao') ?? 0);
  });
});

describe('som e imagem saem do mesmo relógio', () => {
  it('um beat com som é o mesmo beat que entra em cena', () => {
    for (const roteiro of ROTEIROS_MODELO) {
      for (const beat of roteiro.beats) {
        if (beat.som === undefined) continue;
        const noAr = beatsNoAr(roteiro, beat.emMs + 1);
        expect(noAr.some((atual) => atual.forma === beat.forma)).toBe(true);
      }
    }
  });

  it('cada beat dispara uma vez só quando o tempo avança', () => {
    const meteoro = ROTEIROS_MODELO.find((roteiro) => roteiro.carta === 'MU01');
    if (meteoro === undefined) throw new Error('sem Meteoro');

    const disparados: string[] = [];
    let anterior = -1;
    for (let tempo = 0; tempo <= duracaoDoRoteiro(meteoro); tempo += 16) {
      for (const beat of beatsQueComecaram(meteoro, anterior, tempo)) {
        disparados.push(`${beat.forma}@${String(beat.emMs)}`);
      }
      anterior = tempo;
    }
    expect(new Set(disparados).size).toBe(disparados.length);
    expect(disparados.length).toBe(meteoro.beats.length);
  });

  it('nenhum beat está no ar antes de começar nem depois de acabar', () => {
    for (const roteiro of ROTEIROS_MODELO) {
      for (const beat of roteiro.beats) {
        expect(
          beatsNoAr(roteiro, beat.emMs - 1).some(
            (a) => a.forma === beat.forma && a.emMs === beat.emMs,
          ),
        ).toBe(false);
        expect(
          beatsNoAr(roteiro, beat.emMs + beat.duracaoMs).some(
            (a) => a.forma === beat.forma && a.emMs === beat.emMs,
          ),
        ).toBe(false);
      }
    }
  });
});
