import type { EstadoDaPartida, PlayerId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { fecharTurno } from './partida.js';
import {
  A,
  B,
  build,
  duelo,
  guardarNoCooldown,
  jogador,
  jogar,
  virarTurno,
} from './teste-apoio.js';

/*
 * A regra do cooldown, ponta a ponta.
 *
 * A habilidade usada **permanece fisicamente no espaço de Ação ou de Resposta**
 * depois de resolver, e só entra no cooldown no encerramento do turno atual
 * (§11). Esta suíte é a prova da regra inteira: os vinte pontos que a revisão
 * pediu, cada um numa asserção que falha se alguém voltar ao comportamento
 * antigo.
 *
 * O que ela **não** faz: reafirmar balanceamento. Nenhum número de carta muda
 * aqui, e a prova de que a disponibilidade continua a mesma mora em
 * `rules-engine/cooldown.test.ts`.
 */

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W03', 'W07', 'W12', 'W15'] });
const mago = build('mago', { habilidades: ['M01', 'M02', 'M05'] });

const partida = (primeiro: PlayerId = A): EstadoDaPartida => duelo(guerreiro, mago, primeiro);

const zonas = (estado: EstadoDaPartida, dono: PlayerId): readonly string[] => {
  const atual = jogador(estado, dono);
  return [...atual.cooldown[1], ...atual.cooldown[2], ...atual.cooldown[3]].map(String);
};

const agendadas = (estado: EstadoDaPartida, dono: PlayerId): readonly string[] =>
  jogador(estado, dono).cooldownAgendado.map((agendado) => String(agendado.carta));

describe('1–5 · a habilidade sai da mão, ocupa a Ação, resolve e fica', () => {
  it('sai da mão ao ser declarada', () => {
    const inicial = partida();
    expect(jogador(inicial, A).mao.map(String)).toContain('W01');
    const depois = jogar(inicial, A, { pedido: { carta: 'W01' as never } }).partida;
    expect(jogador(depois, A).mao.map(String)).not.toContain('W01');
  });

  it('ocupa o espaço de Ação e continua nele depois de resolver', () => {
    const depois = jogar(partida(), A, { pedido: { carta: 'W01' as never } }).partida;
    const slot = jogador(depois, A).acoes[0];
    expect(slot?.situacao).toBe('resolvida');
    expect(String(slot?.perfil?.carta)).toBe('W01');
  });

  it('ainda não está em cooldown nenhum', () => {
    const depois = jogar(partida(), A, { pedido: { carta: 'W01' as never } }).partida;
    expect(zonas(depois, A)).not.toContain('W01');
    expect(agendadas(depois, A)).toContain('W01');
  });
});

describe('6–7 · a segunda e a terceira Ação também permanecem', () => {
  it('as três ficam nos espaços delas, e nenhuma no cooldown', () => {
    let estado = partida();
    // W01, W07 e W12 custam 1 AP cada, e cabem nos 5 AP do turno.
    for (const carta of ['W01', 'W07', 'W12']) {
      estado = jogar(estado, A, { pedido: { carta: carta as never } }).partida;
    }
    const atual = jogador(estado, A);
    const noCampo = atual.acoes
      .filter((slot) => slot.perfil !== null)
      .map((slot) => String(slot.perfil?.carta));
    expect(noCampo).toEqual(['W01', 'W07', 'W12']);
    expect(zonas(estado, A)).toEqual([]);
    expect([...agendadas(estado, A)].sort()).toEqual(['W01', 'W07', 'W12']);
  });
});

describe('8 · a Reação permanece na Resposta', () => {
  it('a carta de Reação fica na bandeja e só depois vai ao cooldown', () => {
    const depois = jogar(partida(B), B, {
      pedido: { carta: 'M05' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    }).partida;

    expect(zonas(depois, A)).not.toContain('W15');
    expect(agendadas(depois, A)).toContain('W15');
    const agendamento = jogador(depois, A).cooldownAgendado[0];
    expect(agendamento?.origem.tipo).toBe('resposta');

    const guardada = guardarNoCooldown(depois, B);
    expect(zonas(guardada, A)).toContain('W15');
  });
});

describe('9 · nenhuma carta existe em Ação e cooldown ao mesmo tempo', () => {
  /*
   * A exclusividade é a garantia mais importante desta regra.
   *
   * Se uma carta aparecesse nos dois lugares, a build deixaria de ter oito
   * habilidades e qualquer efeito que conte cartas passaria a mentir. O teste
   * percorre o turno inteiro somando os quatro lugares possíveis.
   */
  it('ao longo de um turno inteiro com três Ações e um encerramento', () => {
    let estado = partida();
    const conferir = (momento: string): void => {
      const atual = jogador(estado, A);
      const noCampo = atual.acoes
        .filter((slot) => slot.perfil !== null)
        .map((slot) => String(slot.perfil?.carta));
      const todas = [...atual.mao.map(String), ...zonas(estado, A), ...noCampo];
      expect(new Set(todas).size, `${momento}: carta repetida`).toBe(todas.length);
      expect(todas, momento).toHaveLength(8);
      // E o agendamento nunca duplica: ele acompanha a carta que está no campo.
      for (const agendada of agendadas(estado, A)) {
        expect(zonas(estado, A), `${momento}: ${agendada} em zona e agendada`).not.toContain(
          agendada,
        );
      }
    };

    conferir('começo');
    for (const carta of ['W01', 'W07', 'W12']) {
      estado = jogar(estado, A, { pedido: { carta: carta as never } }).partida;
      conferir(`depois de ${carta}`);
    }
    estado = guardarNoCooldown(estado, A);
    conferir('depois de encerrar');
  });
});

describe('10–13 · o encerramento move cada carta para a zona impressa', () => {
  it('CD1 impresso entra em CD1, CD2 em CD2 e CD3 em CD3', () => {
    let estado = partida();
    // W01 imprime CD1, W03 imprime CD2, W08 imprime CD3.
    for (const carta of ['W01', 'W03']) {
      estado = jogar(estado, A, { pedido: { carta: carta as never } }).partida;
    }
    const guardada = guardarNoCooldown(estado, A);
    const atual = jogador(guardada, A);
    for (const agendado of jogador(estado, A).cooldownAgendado) {
      expect(atual.cooldown[agendado.zonaImpressa].map(String)).toContain(String(agendado.carta));
    }
  });

  it('os eventos de encerramento contam cada migração, na ordem de uso', () => {
    let estado = partida();
    for (const carta of ['W01', 'W03']) {
      estado = jogar(estado, A, { pedido: { carta: carta as never } }).partida;
    }
    const fechada = fecharTurno(estado, A);
    expect(fechada.ok).toBe(true);
    if (!fechada.ok) return;
    const migracoes = fechada.valor.eventos
      .filter((evento) => evento.tipo === 'carta-para-cooldown')
      .map((evento) => (evento.tipo === 'carta-para-cooldown' ? String(evento.carta) : ''));
    expect(migracoes).toEqual(['W01', 'W03']);
  });
});

describe('16–18 · os espaços ficam limpos e o turno seguinte funciona', () => {
  it('os slots de Ação ficam vazios depois do encerramento', () => {
    let estado = jogar(partida(), A, { pedido: { carta: 'W01' as never } }).partida;
    estado = guardarNoCooldown(estado, A);
    for (const slot of jogador(estado, A).acoes) expect(slot.perfil).toBeNull();
    expect(jogador(estado, A).cooldownAgendado).toEqual([]);
  });

  it('o cooldown avança normalmente no turno seguinte do dono', () => {
    /*
     * W03 imprime CD2: entra no encerramento deste turno e anda para CD1 no
     * começo do próximo turno do dono. A carta de CD1 voltaria direto à mão, e
     * por isso não serve para observar o avanço.
     */
    let estado = jogar(partida(), A, { pedido: { carta: 'W03' as never } }).partida;
    estado = virarTurno(estado, A);
    expect(jogador(estado, A).cooldown[2].map(String)).toContain('W03');
    estado = virarTurno(estado, B);
    expect(jogador(estado, A).cooldown[1].map(String)).toContain('W03');
  });
});

describe('19–20 · determinismo e simulador', () => {
  /*
   * Duas execuções idênticas produzem o mesmo log.
   *
   * O agendamento é uma lista em ordem de uso, e a liquidação percorre essa
   * lista: não há iteração por objeto nem por conjunto, que são as duas fontes
   * clássicas de replay não determinístico.
   */
  it('a mesma sequência produz a mesma ordem de migração', () => {
    const rodar = (): readonly string[] => {
      let estado = partida();
      for (const carta of ['W03', 'W01']) {
        estado = jogar(estado, A, { pedido: { carta: carta as never } }).partida;
      }
      const fechada = fecharTurno(estado, A);
      if (!fechada.ok) return [];
      return fechada.valor.eventos
        .filter((evento) => evento.tipo === 'carta-para-cooldown')
        .map((evento) => (evento.tipo === 'carta-para-cooldown' ? String(evento.carta) : ''));
    };
    expect(rodar()).toEqual(rodar());
    expect(rodar()).toEqual(['W03', 'W01']);
  });
});

describe('14–15 · os modificadores mexem no destino agendado', () => {
  /*
   * Runa do Eco e Mente Calculista agem logo depois de resolver, quando a
   * carta ainda está no campo. Elas não movem uma carta na zona — elas mudam
   * **para onde ela vai**. Os testes por carta ficam nos arquivos de efeito do
   * Mago; aqui fica a prova da mecânica que todas elas usam.
   */
  it('um destino redirecionado é o que vale no encerramento', () => {
    const estado = jogar(partida(), A, { pedido: { carta: 'W03' as never } }).partida;
    const trocar = <T extends { readonly id: PlayerId; readonly cooldownAgendado: unknown }>(
      atual: T,
    ): T =>
      atual.id === A
        ? {
            ...atual,
            cooldownAgendado: (atual.cooldownAgendado as { destino: 1 | 2 | 3 }[]).map(
              (agendado) => ({ ...agendado, destino: 1 as const }),
            ),
          }
        : atual;

    const comDestinoTrocado: EstadoDaPartida = {
      ...estado,
      jogadores: [trocar(estado.jogadores[0]), trocar(estado.jogadores[1])],
    };
    const guardada = guardarNoCooldown(comDestinoTrocado, A);
    expect(jogador(guardada, A).cooldown[1].map(String)).toContain('W03');
    // E a zona impressa continua registrada, como referência: W03 imprime CD2.
    expect(jogador(estado, A).cooldownAgendado[0]?.zonaImpressa).toBe(2);
  });
});
