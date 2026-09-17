import type { CondicaoId, EstadoDaPartida, EstadoDeJogador } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { LIMITE_DE_CONDICAO } from './constants.js';
import { aplicarCondicao, aplicarMurchar, custoAdicionalDeLento } from './condicoes.js';
import { declararAcao, resolverAcao } from './comandos.js';
import { encerrarTurno, iniciarTurno } from './turno.js';
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

const comCondicao = (
  partida: EstadoDaPartida,
  condicao: CondicaoId,
  quantidade: number,
): EstadoDaPartida => ({
  ...partida,
  jogadores: [
    {
      ...partida.jogadores[0],
      condicoes: { ...partida.jogadores[0].condicoes, [condicao]: quantidade },
    },
    partida.jogadores[1],
  ],
});

const umaAcao = (
  partida: EstadoDaPartida,
  carta = CARTA_A1,
  indice: 0 | 1 | 2 = 0,
): EstadoDaPartida =>
  exigirSucesso(
    resolverAcao(exigirSucesso(declararAcao(partida, ID_A, perfil(carta))).partida, ID_A, indice),
  ).partida;

describe('limites de acúmulo', () => {
  const casos: readonly (readonly [CondicaoId, number])[] = [
    ['queimadura', 3],
    ['lento', 2],
    ['murchar', 2],
    ['sangramento', 3],
  ];

  it.each(casos)('%s acumula no máximo %i', (condicao, limite) => {
    expect(LIMITE_DE_CONDICAO[condicao]).toBe(limite);

    const jogador = jogadorDe(partidaEmAndamento(), ID_A);
    const aplicada = aplicarCondicao(jogador, condicao, limite + 5);
    expect(aplicada.ok && aplicada.valor.condicoes[condicao]).toBe(limite);
  });

  it('acumula somando ao que já existe, sem passar do teto', () => {
    const jogador = jogadorDe(partidaEmAndamento(), ID_A);
    const uma = aplicarCondicao(jogador, 'queimadura', 2);
    const duas = uma.ok ? aplicarCondicao(uma.valor, 'queimadura', 2) : uma;
    expect(duas.ok && duas.valor.condicoes.queimadura).toBe(3);
  });

  it('recusa quantidade negativa', () => {
    const jogador = jogadorDe(partidaEmAndamento(), ID_A);
    const resposta = aplicarCondicao(jogador, 'queimadura', -1);
    expect(!resposta.ok && resposta.erro.tipo).toBe('condicao-acima-do-limite');
  });
});

describe('Queimadura', () => {
  it('tica no fim do turno do afetado: perde 1 de Vida e diminui 1', () => {
    const partida = comCondicao(partidaEmAndamento(), 'queimadura', 3);
    const encerrado = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    const jogador = jogadorDe(encerrado, ID_A);
    expect(jogador.vida).toBe(29);
    expect(jogador.condicoes.queimadura).toBe(2);
  });

  it('tica uma vez por fim de turno, não uma por acúmulo', () => {
    const partida = comCondicao(partidaEmAndamento(), 'queimadura', 3);
    const encerrado = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    expect(jogadorDe(encerrado, ID_A).vida).toBe(29);
  });

  it('não faz nada quando não há acúmulo', () => {
    const encerrado = exigirSucesso(encerrarTurno(partidaEmAndamento(), ID_A)).partida;
    expect(jogadorDe(encerrado, ID_A).vida).toBe(30);
  });

  it('não é Ataque: não abre espaço de Resposta nem ocupa Ação', () => {
    const partida = comCondicao(partidaEmAndamento(), 'queimadura', 1);
    const resultado = exigirSucesso(encerrarTurno(partida, ID_A));
    const daQueimadura = resultado.eventos.filter(
      (evento) => evento.tipo === 'condicao-resolvida' && evento.condicao === 'queimadura',
    );
    expect(daQueimadura).toHaveLength(1);
    expect(resultado.eventos.some((evento) => evento.tipo === 'resposta-registrada')).toBe(false);
    for (const slot of jogadorDe(resultado.partida, ID_A).acoes) {
      expect(slot.situacao).toBe('vazio');
    }
  });
});

describe('Lento', () => {
  it('soma um ponto ao custo enquanto houver acúmulo', () => {
    const jogador = jogadorDe(comCondicao(partidaEmAndamento(), 'lento', 2), ID_A);
    expect(custoAdicionalDeLento(jogador)).toBe(1);
    expect(
      custoAdicionalDeLento({ ...jogador, condicoes: { ...jogador.condicoes, lento: 0 } }),
    ).toBe(0);
  });

  it('é consumido quando a Ação paga o aumento', () => {
    const partida = comCondicao(partidaEmAndamento(), 'lento', 2);
    const declarada = exigirSucesso(
      declararAcao(partida, ID_A, perfil(CARTA_A1, { custo: 1 })),
    ).partida;
    const jogador = jogadorDe(declarada, ID_A);
    expect(jogador.pontosDeAcao).toBe(3);
    expect(jogador.condicoes.lento).toBe(1);
  });

  it('não é consumido quando a Ação é recusada', () => {
    const partida = comCondicao(partidaEmAndamento(), 'lento', 2);
    const recusada = declararAcao(partida, ID_A, perfil(CARTA_A1, { custo: 5 }));
    expect(recusada.ok).toBe(false);
    expect(jogadorDe(partida, ID_A).condicoes.lento).toBe(2);
  });

  it('para de aumentar o custo depois que o acúmulo acaba', () => {
    let partida = comCondicao(partidaEmAndamento(), 'lento', 1);
    partida = exigirSucesso(declararAcao(partida, ID_A, perfil(CARTA_A1, { custo: 1 }))).partida;
    expect(jogadorDe(partida, ID_A).condicoes.lento).toBe(0);
    partida = exigirSucesso(resolverAcao(partida, ID_A, 0)).partida;
    partida = exigirSucesso(declararAcao(partida, ID_A, perfil(CARTA_A2, { custo: 1 }))).partida;
    expect(jogadorDe(partida, ID_A).pontosDeAcao).toBe(2);
  });
});

describe('Lento com Impulso Inicial', () => {
  it('é recusado em vez de ter a interação inventada', () => {
    const base = partidaEmAndamento();
    const semAPComImpulsoELento: EstadoDaPartida = {
      ...base,
      jogadores: [
        {
          ...base.jogadores[0],
          pontosDeAcao: 0,
          impulsoInicial: true,
          condicoes: { ...base.jogadores[0].condicoes, lento: 1 },
        },
        base.jogadores[1],
      ],
    };
    const resposta = declararAcao(semAPComImpulsoELento, ID_A, perfil(CARTA_A1, { custo: 1 }));
    expect(resposta.ok).toBe(false);
    expect(!resposta.ok && resposta.erro.tipo).toBe('interacao-nao-definida');
    expect(
      !resposta.ok && resposta.erro.tipo === 'interacao-nao-definida' && resposta.erro.detalhe,
    ).toBe('lento-com-impulso-inicial');
  });

  it('o Impulso funciona normalmente quando não há Lento', () => {
    const base = partidaEmAndamento();
    const semAPComImpulso: EstadoDaPartida = {
      ...base,
      jogadores: [
        { ...base.jogadores[0], pontosDeAcao: 0, impulsoInicial: true },
        base.jogadores[1],
      ],
    };
    const partida = exigirSucesso(
      declararAcao(semAPComImpulso, ID_A, perfil(CARTA_A1, { custo: 1 })),
    ).partida;
    expect(jogadorDe(partida, ID_A).impulsoInicial).toBe(false);
    expect(jogadorDe(partida, ID_A).pontosDeAcao).toBe(0);
  });
});

describe('Murchar', () => {
  it('é aplicado depois de a Guarda voltar para seis, e é limpo por inteiro', () => {
    const partida = comCondicao(partidaEmAndamento(), 'murchar', 2);
    const reiniciado = exigirSucesso(
      iniciarTurno({ ...partida, turno: { ...partida.turno!, iniciado: false } }, ID_A),
    ).partida;
    const jogador = jogadorDe(reiniciado, ID_A);
    expect(jogador.guarda).toBe(4);
    expect(jogador.condicoes.murchar).toBe(0);
  });

  it('não provoca Ruptura mesmo levando a Guarda a zero', () => {
    const jogador: EstadoDeJogador = {
      ...jogadorDe(partidaEmAndamento(), ID_A),
      guarda: 2,
      condicoes: { queimadura: 0, lento: 0, murchar: 2, sangramento: 0 },
    };
    const resultado = aplicarMurchar(jogador);
    expect(resultado.jogador.guarda).toBe(0);
    expect(resultado.jogador.vida).toBe(30);
  });

  it('não faz nada quando não há acúmulo', () => {
    const partida = partidaEmAndamento();
    const reiniciado = exigirSucesso(
      iniciarTurno({ ...partida, turno: { ...partida.turno!, iniciado: false } }, ID_A),
    ).partida;
    expect(jogadorDe(reiniciado, ID_A).guarda).toBe(6);
  });
});

describe('Sangramento', () => {
  it('tica exatamente depois da segunda Ação do turno', () => {
    let partida = comCondicao(partidaEmAndamento(), 'sangramento', 3);
    partida = umaAcao(partida, CARTA_A1, 0);
    expect(jogadorDe(partida, ID_A).vida).toBe(30);

    partida = umaAcao(partida, CARTA_A2, 1);
    expect(jogadorDe(partida, ID_A).vida).toBe(29);
    expect(jogadorDe(partida, ID_A).condicoes.sangramento).toBe(2);
  });

  it('a terceira Ação não provoca um segundo tique no mesmo turno', () => {
    let partida = comCondicao(partidaEmAndamento(), 'sangramento', 3);
    partida = umaAcao(partida, CARTA_A1, 0);
    partida = umaAcao(partida, CARTA_A2, 1);
    partida = umaAcao(partida, CARTA_A3, 2);
    expect(jogadorDe(partida, ID_A).vida).toBe(29);
    expect(jogadorDe(partida, ID_A).condicoes.sangramento).toBe(2);
  });

  it('o turno seguinte recomeça a contagem e volta a ticar', () => {
    let partida = comCondicao(partidaEmAndamento(), 'sangramento', 3);
    partida = umaAcao(partida, CARTA_A1, 0);
    partida = umaAcao(partida, CARTA_A2, 1);
    expect(jogadorDe(partida, ID_A).vida).toBe(29);

    partida = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_A)).partida;
    expect(jogadorDe(partida, ID_A).acoesRealizadasNoTurno).toBe(0);

    partida = umaAcao(partida, CARTA_A3, 0);
    partida = umaAcao(partida, CARTA_A1, 1);
    expect(jogadorDe(partida, ID_A).vida).toBe(28);
    expect(jogadorDe(partida, ID_A).condicoes.sangramento).toBe(1);
  });

  it('não faz nada quando não há acúmulo', () => {
    let partida = partidaEmAndamento();
    partida = umaAcao(partida, CARTA_A1, 0);
    partida = umaAcao(partida, CARTA_A2, 1);
    expect(jogadorDe(partida, ID_A).vida).toBe(30);
  });

  it('não é Ataque: a perda de Vida não abre espaço de Resposta', () => {
    let partida = comCondicao(partidaEmAndamento(), 'sangramento', 1);
    partida = umaAcao(partida, CARTA_A1, 0);
    const resultado = exigirSucesso(
      resolverAcao(exigirSucesso(declararAcao(partida, ID_A, perfil(CARTA_A2))).partida, ID_A, 1),
    );
    const tique = resultado.eventos.find(
      (evento) => evento.tipo === 'condicao-resolvida' && evento.condicao === 'sangramento',
    );
    expect(tique).toBeDefined();
    expect(resultado.partida.jogadores[0].acoes[1].resposta.voluntaria).toBeNull();
  });
});
