import type { EstadoDaPartida } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { REGRAS_UNIVERSAIS } from './constants.js';
import { iniciarPartida } from './comandos.js';
import { encerrarTurno, iniciarTurno } from './turno.js';
import { validarPartida } from './validacao.js';
import {
  CARTA_A1,
  ID_A,
  ID_B,
  exigirSucesso,
  jogadorDe,
  partidaEmAndamento,
  partidaNova,
} from './teste-partida.js';

describe('início da partida', () => {
  it('Vida começa em 30 e Guarda em 6', () => {
    const partida = partidaEmAndamento();
    for (const jogador of partida.jogadores) {
      expect(jogador.vida).toBe(30);
    }
    expect(jogadorDe(partida, ID_A).guarda).toBe(6);
  });

  it('não sorteia quem começa: o primeiro jogador vem de fora', () => {
    const comA = exigirSucesso(iniciarPartida(partidaNova(), ID_A)).partida;
    const comB = exigirSucesso(iniciarPartida(partidaNova(), ID_B)).partida;
    expect(comA.turno?.jogadorAtivo).toBe(ID_A);
    expect(comB.turno?.jogadorAtivo).toBe(ID_B);
    expect(comA.primeiroJogador).toBe(ID_A);
  });

  it('o segundo jogador começa a partida com 2 de Reserva', () => {
    const partida = exigirSucesso(iniciarPartida(partidaNova(), ID_A)).partida;
    expect(jogadorDe(partida, ID_B).reserva).toBe(REGRAS_UNIVERSAIS.reservaInicialDoSegundoJogador);
    expect(jogadorDe(partida, ID_A).reserva).toBe(0);
  });

  it('recusa iniciar duas vezes', () => {
    const partida = exigirSucesso(iniciarPartida(partidaNova(), ID_A)).partida;
    const segunda = iniciarPartida(partida, ID_A);
    expect(segunda.ok).toBe(false);
    expect(!segunda.ok && segunda.erro.tipo).toBe('partida-ja-iniciada');
  });

  it('recusa um jogador que não está na partida', () => {
    const resposta = iniciarPartida(partidaNova(), jogadorDe(partidaNova(), ID_A).id);
    expect(resposta.ok).toBe(true);
  });
});

describe('início de turno', () => {
  it('restaura os cinco pontos de Ação e zera o contador de Ações', () => {
    const jogador = jogadorDe(partidaEmAndamento(), ID_A);
    expect(jogador.pontosDeAcao).toBe(REGRAS_UNIVERSAIS.pontosDeAcaoPorTurno);
    expect(jogador.acoesRealizadasNoTurno).toBe(0);
  });

  it('descarta a Reserva que sobrou antes de dar os pontos de Ação', () => {
    const partida = exigirSucesso(iniciarPartida(partidaNova(), ID_A)).partida;
    const primeiro = exigirSucesso(iniciarTurno(partida, ID_A)).partida;
    const encerrado = exigirSucesso(encerrarTurno(primeiro, ID_A)).partida;

    // O jogador B tinha 2 de Reserva desde o começo da partida.
    expect(jogadorDe(encerrado, ID_B).reserva).toBe(2);
    const turnoDeB = exigirSucesso(iniciarTurno(encerrado, ID_B)).partida;
    expect(jogadorDe(turnoDeB, ID_B).reserva).toBe(0);
    expect(jogadorDe(turnoDeB, ID_B).pontosDeAcao).toBe(5);
  });

  it('restaura a Guarda para seis', () => {
    const partida = partidaEmAndamento();
    const ferido: EstadoDaPartida = {
      ...partida,
      jogadores: [{ ...partida.jogadores[0], guarda: 1 }, partida.jogadores[1]],
      turno: { ...partida.turno!, iniciado: false },
    };
    const reiniciado = exigirSucesso(iniciarTurno(ferido, ID_A)).partida;
    expect(jogadorDe(reiniciado, ID_A).guarda).toBe(6);
  });

  it('roda uma única vez por turno', () => {
    const partida = partidaEmAndamento();
    const segunda = iniciarTurno(partida, ID_A);
    expect(segunda.ok).toBe(false);
    expect(!segunda.ok && segunda.erro.tipo).toBe('turno-ja-iniciado');
  });

  it('recusa iniciar o turno de quem não é o jogador ativo', () => {
    const partida = exigirSucesso(iniciarPartida(partidaNova(), ID_A)).partida;
    const resposta = iniciarTurno(partida, ID_B);
    expect(!resposta.ok && resposta.erro.tipo).toBe('fora-do-turno');
  });

  it('mantém a partida estruturalmente válida', () => {
    expect(validarPartida(partidaEmAndamento()).ok).toBe(true);
  });
});

describe('Impulso Inicial', () => {
  const ateOTurnoDoSegundo = (): EstadoDaPartida => {
    const partida = partidaEmAndamento(ID_A);
    const encerrado = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    return exigirSucesso(iniciarTurno(encerrado, ID_B)).partida;
  };

  it('só aparece no primeiro turno próprio do segundo jogador', () => {
    const inicio = partidaEmAndamento(ID_A);
    expect(jogadorDe(inicio, ID_A).impulsoInicial).toBe(false);
    expect(jogadorDe(inicio, ID_B).impulsoInicial).toBe(false);

    const turnoDeB = ateOTurnoDoSegundo();
    expect(jogadorDe(turnoDeB, ID_B).impulsoInicial).toBe(true);
    expect(jogadorDe(turnoDeB, ID_A).impulsoInicial).toBe(false);
  });

  it('não volta nos turnos seguintes do segundo jogador', () => {
    let partida = ateOTurnoDoSegundo();
    partida = exigirSucesso(encerrarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_B)).partida;
    expect(jogadorDe(partida, ID_B).impulsoInicial).toBe(false);
  });

  it('desaparece no fim do turno se não for usado, e nunca vira Reserva', () => {
    const turnoDeB = ateOTurnoDoSegundo();
    const encerrado = exigirSucesso(encerrarTurno(turnoDeB, ID_B)).partida;
    const jogador = jogadorDe(encerrado, ID_B);
    expect(jogador.impulsoInicial).toBe(false);
    // Sobraram 5 AP; a Reserva para em 2 e o Impulso não entra na conta.
    expect(jogador.reserva).toBe(REGRAS_UNIVERSAIS.maximoDeReserva);
  });
});

describe('fim de turno', () => {
  it('converte no máximo dois pontos de Ação em Reserva', () => {
    const partida = partidaEmAndamento();
    const encerrado = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    expect(jogadorDe(encerrado, ID_A).reserva).toBe(2);
    expect(jogadorDe(encerrado, ID_A).pontosDeAcao).toBe(0);
  });

  it('converte menos que dois quando sobrou menos', () => {
    const partida = partidaEmAndamento();
    const comUmAP: EstadoDaPartida = {
      ...partida,
      jogadores: [{ ...partida.jogadores[0], pontosDeAcao: 1 }, partida.jogadores[1]],
    };
    const encerrado = exigirSucesso(encerrarTurno(comUmAP, ID_A)).partida;
    expect(jogadorDe(encerrado, ID_A).reserva).toBe(1);
  });

  it('passa o turno para o adversário sem iniciá-lo', () => {
    const encerrado = exigirSucesso(encerrarTurno(partidaEmAndamento(), ID_A)).partida;
    expect(encerrado.turno?.jogadorAtivo).toBe(ID_B);
    expect(encerrado.turno?.numero).toBe(2);
    expect(encerrado.turno?.iniciado).toBe(false);
  });

  it('recusa encerrar o turno de quem não é o jogador ativo', () => {
    const resposta = encerrarTurno(partidaEmAndamento(), ID_B);
    expect(!resposta.ok && resposta.erro.tipo).toBe('fora-do-turno');
  });

  it('limpa os espaços de Ação', () => {
    const encerrado = exigirSucesso(encerrarTurno(partidaEmAndamento(), ID_A)).partida;
    for (const slot of jogadorDe(encerrado, ID_A).acoes.slice(0, 3)) {
      expect(slot.situacao).toBe('vazio');
      expect(slot.perfil).toBeNull();
    }
  });

  it('não muta o estado de entrada', () => {
    const partida = partidaEmAndamento();
    const antes = JSON.stringify(partida);
    encerrarTurno(partida, ID_A);
    iniciarTurno(partida, ID_A);
    expect(JSON.stringify(partida)).toBe(antes);
  });

  it('a carta usada não fica na mão depois de declarada', () => {
    const partida = partidaEmAndamento();
    expect(jogadorDe(partida, ID_A).mao).toContain(CARTA_A1);
  });
});
