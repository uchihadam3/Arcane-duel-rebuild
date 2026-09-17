import { matchId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { criarLogDeEventos, logEstaIntegro, reproduzir } from './event-log.js';
import { RULES_VERSION } from './version.js';

const cabecalho = {
  matchId: matchId('m-1'),
  semente: 'semente-de-teste',
  versoes: { rulesVersion: RULES_VERSION, cardDataVersion: '0.1.0-alpha' },
};

describe('log de eventos', () => {
  it('numera eventos a partir de 1, de forma contígua', () => {
    const log = criarLogDeEventos(cabecalho);
    log.registrar({ tipo: 'a', carga: null });
    log.registrar({ tipo: 'b', carga: null });
    log.registrar({ tipo: 'c', carga: null });

    expect(log.eventos().map((evento) => evento.sequencia)).toEqual([1, 2, 3]);
    expect(logEstaIntegro(log.eventos())).toBe(true);
    expect(log.tamanho()).toBe(3);
  });

  it('devolve o envelope numerado ao registrar', () => {
    const log = criarLogDeEventos(cabecalho);
    expect(log.registrar({ tipo: 'dano', carga: { valor: 3 } })).toEqual({
      tipo: 'dano',
      carga: { valor: 3 },
      sequencia: 1,
    });
  });

  it('não deixa o chamador mutar o log a partir da cópia', () => {
    const log = criarLogDeEventos(cabecalho);
    log.registrar({ tipo: 'a', carga: null });
    const copia = log.eventos() as EventoMutavel[];
    copia.push({ sequencia: 99, tipo: 'falso', carga: null });
    expect(log.tamanho()).toBe(1);
  });

  it('preserva o carimbo de versão para o replay', () => {
    const log = criarLogDeEventos(cabecalho);
    expect(log.cabecalho.versoes.rulesVersion).toBe(RULES_VERSION);
    expect(log.cabecalho.semente).toBe('semente-de-teste');
  });

  it('reproduz o mesmo estado final a partir do mesmo log', () => {
    const log = criarLogDeEventos<EventoDeVida>(cabecalho);
    log.registrar({ tipo: 'perdeu-vida', carga: 3 });
    log.registrar({ tipo: 'perdeu-vida', carga: 5 });
    log.registrar({ tipo: 'perdeu-vida', carga: 2 });

    const aplicar = (vida: number, evento: EventoDeVida): number => vida - evento.carga;
    const primeiro = reproduzir(30, log.eventos(), aplicar);
    const segundo = reproduzir(30, log.eventos(), aplicar);

    expect(primeiro).toBe(20);
    expect(segundo).toBe(primeiro);
  });

  it('detecta um log com sequência quebrada', () => {
    expect(
      logEstaIntegro([
        { sequencia: 1, tipo: 'a', carga: null },
        { sequencia: 3, tipo: 'b', carga: null },
      ]),
    ).toBe(false);
  });
});

interface EventoMutavel {
  sequencia: number;
  tipo: string;
  carga: unknown;
}

interface EventoDeVida {
  readonly sequencia: number;
  readonly tipo: 'perdeu-vida';
  readonly carga: number;
}
