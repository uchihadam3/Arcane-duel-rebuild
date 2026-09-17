import type { EstadoDaPartida } from '@arcane-duel/shared-types';
import { ZONAS_DE_COOLDOWN, cardId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { avancarCooldown } from './cooldown.js';
import { declararAcao, resolverAcao } from './comandos.js';
import { encerrarTurno, iniciarTurno } from './turno.js';
import { validarPartida } from './validacao.js';
import {
  CARTA_A1,
  CARTA_A2,
  CARTA_A3,
  ID_A,
  ID_B,
  exigirSucesso,
  jogadorDe,
  partidaEmAndamento,
  perfil,
} from './teste-partida.js';

const zonas = (cd1: string[], cd2: string[], cd3: string[]) => ({
  1: cd1.map(cardId),
  2: cd2.map(cardId),
  3: cd3.map(cardId),
});

describe('avanço das zonas', () => {
  it('CD1 volta para a mão', () => {
    const avanco = avancarCooldown(zonas(['a'], [], []));
    expect(avanco.paraAMao).toEqual([cardId('a')]);
    expect(avanco.cooldown[1]).toEqual([]);
  });

  it('CD2 passa para CD1', () => {
    expect(avancarCooldown(zonas([], ['b'], [])).cooldown[1]).toEqual([cardId('b')]);
  });

  it('CD3 passa para CD2', () => {
    expect(avancarCooldown(zonas([], [], ['c'])).cooldown[2]).toEqual([cardId('c')]);
  });

  it('nenhuma carta pula um estágio', () => {
    const avanco = avancarCooldown(zonas([], [], ['c']));
    expect(avanco.paraAMao).toEqual([]);
    expect(avanco.cooldown[1]).toEqual([]);
    expect(avanco.cooldown[2]).toEqual([cardId('c')]);
  });

  it('várias cartas na mesma zona avançam juntas e na ordem', () => {
    const avanco = avancarCooldown(zonas(['a', 'b'], ['c', 'd'], ['e']));
    expect(avanco.paraAMao).toEqual([cardId('a'), cardId('b')]);
    expect(avanco.cooldown[1]).toEqual([cardId('c'), cardId('d')]);
    expect(avanco.cooldown[2]).toEqual([cardId('e')]);
    expect(avanco.cooldown[3]).toEqual([]);
  });

  it('não muta o estado de entrada', () => {
    const anterior = zonas(['a'], ['b'], ['c']);
    const antes = JSON.stringify(anterior);
    avancarCooldown(anterior);
    expect(JSON.stringify(anterior)).toBe(antes);
  });
});

describe('cooldown dentro do ciclo de turno', () => {
  /** Joga uma carta com o cooldown pedido e encerra o turno de A. */
  const jogarEPassar = (
    partida: EstadoDaPartida,
    carta: string,
    cd: 1 | 2 | 3,
    indice: 0 | 1 | 2,
  ) => {
    const declarada = exigirSucesso(
      declararAcao(partida, ID_A, perfil(cardId(carta), { cooldown: cd })),
    ).partida;
    return exigirSucesso(resolverAcao(declarada, ID_A, indice)).partida;
  };

  /** Fecha o turno de A, passa por B inteiro e devolve o turno a A. */
  const darAVolta = (partida: EstadoDaPartida): EstadoDaPartida => {
    let atual = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    atual = exigirSucesso(iniciarTurno(atual, ID_B)).partida;
    atual = exigirSucesso(encerrarTurno(atual, ID_B)).partida;
    return exigirSucesso(iniciarTurno(atual, ID_A)).partida;
  };

  it('uma carta em CD1 volta à mão no próximo turno do dono', () => {
    let partida = jogarEPassar(partidaEmAndamento(), CARTA_A1, 1, 0);
    expect(jogadorDe(partida, ID_A).cooldown[1]).toContain(CARTA_A1);

    partida = darAVolta(partida);
    expect(jogadorDe(partida, ID_A).mao).toContain(CARTA_A1);
    expect(jogadorDe(partida, ID_A).cooldown[1]).not.toContain(CARTA_A1);
  });

  it('uma carta em CD3 leva três turnos próprios para voltar', () => {
    let partida = jogarEPassar(partidaEmAndamento(), CARTA_A1, 3, 0);
    expect(jogadorDe(partida, ID_A).cooldown[3]).toContain(CARTA_A1);

    partida = darAVolta(partida);
    expect(jogadorDe(partida, ID_A).cooldown[2]).toContain(CARTA_A1);
    expect(jogadorDe(partida, ID_A).mao).not.toContain(CARTA_A1);

    partida = darAVolta(partida);
    expect(jogadorDe(partida, ID_A).cooldown[1]).toContain(CARTA_A1);

    partida = darAVolta(partida);
    expect(jogadorDe(partida, ID_A).mao).toContain(CARTA_A1);
  });

  it('o avanço acontece uma única vez por turno', () => {
    let partida = jogarEPassar(partidaEmAndamento(), CARTA_A1, 2, 0);
    partida = darAVolta(partida);
    expect(jogadorDe(partida, ID_A).cooldown[1]).toContain(CARTA_A1);

    // Uma segunda chamada no mesmo turno é recusada, então o cooldown não
    // avança duas vezes e a carta não pula direto para a mão.
    const repetida = iniciarTurno(partida, ID_A);
    expect(!repetida.ok && repetida.erro.tipo).toBe('turno-ja-iniciado');
    expect(jogadorDe(partida, ID_A).mao).not.toContain(CARTA_A1);
  });

  it('nunca deixa a mesma carta na mão e no cooldown ao mesmo tempo', () => {
    let partida = partidaEmAndamento();
    partida = jogarEPassar(partida, CARTA_A1, 1, 0);
    partida = jogarEPassar(partida, CARTA_A2, 2, 1);
    partida = jogarEPassar(partida, CARTA_A3, 3, 2);

    for (let volta = 0; volta < 4; volta += 1) {
      partida = darAVolta(partida);
      const jogador = jogadorDe(partida, ID_A);
      const todas = [
        ...jogador.mao,
        ...ZONAS_DE_COOLDOWN.flatMap((zona) => jogador.cooldown[zona]),
      ];
      expect(new Set(todas).size).toBe(todas.length);
      expect(todas).toHaveLength(8);
      expect(validarPartida(partida).ok).toBe(true);
    }

    // Depois de três voltas as três já voltaram para a mão.
    const jogador = jogadorDe(partida, ID_A);
    expect(jogador.mao).toContain(CARTA_A1);
    expect(jogador.mao).toContain(CARTA_A2);
    expect(jogador.mao).toContain(CARTA_A3);
  });
});
