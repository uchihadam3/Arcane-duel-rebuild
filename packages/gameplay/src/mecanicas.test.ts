import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comRecurso,
  duelo,
  erroDe,
  jogador,
  jogar,
  manaDe,
  momentumDe,
  virarTurno,
} from './teste-apoio.js';
import { declarar, responder } from './partida.js';

/*
 * As mecânicas de classe, separadas das cartas.
 *
 * Momentum e Mana têm regras próprias no CARD_CATALOG.md, e as duas Defesas
 * Inatas têm limites e custos diferentes. Nada disso depende de carta nenhuma.
 */

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W03', 'W08'] });
const mago = build('mago', { habilidades: ['M01', 'M02', 'M11', 'M15'] });

describe('Momentum', () => {
  it('não passa de três fichas', () => {
    const partida = comRecurso(duelo(guerreiro, mago), A, 3);
    const comRuptura = com(partida, B, { guarda: 3 });
    const { partida: depois } = jogar(comRuptura, A, { pedido: { carta: 'W03' as never } });
    expect(momentumDe(depois, A)).toBe(3);
  });

  it('não desce abaixo de zero', () => {
    const partida = duelo(guerreiro, mago);
    expect(momentumDe(partida, A)).toBe(0);
    const depois = virarTurno(partida, A);
    expect(momentumDe(depois, A)).toBe(0);
  });

  it('dá uma ficha na primeira vez do turno em que um Ataque remove 2 de Guarda', () => {
    const partida = duelo(guerreiro, mago);
    const primeira = jogar(partida, A, { pedido: { carta: 'W02' as never } }).partida;
    expect(momentumDe(primeira, A)).toBe(1);

    // O Golpe de Cerco também tira mais de 2 de Guarda, mas o ganho é uma vez
    // por turno: a segunda vez não repete.
    const segunda = jogar(primeira, A, { pedido: { carta: 'W08' as never } }).partida;
    expect(momentumDe(segunda, A)).toBe(1);
  });

  it('não conta Impacto que a Guarda não tinha para perder', () => {
    const partida = com(duelo(guerreiro, mago), B, { guarda: 1 });
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'W01' as never } });
    expect(momentumDe(depois, A)).toBe(0);
  });

  it('perde uma ficha no fim do turno sem Dano à Vida nem Ruptura', () => {
    const partida = comRecurso(duelo(guerreiro, mago), A, 2);
    const depois = virarTurno(partida, A);
    expect(momentumDe(depois, A)).toBe(1);
  });

  it('não perde ficha no fim de um turno que causou Dano', () => {
    const partida = comRecurso(duelo(guerreiro, mago), A, 2);
    const comAtaque = jogar(partida, A, { pedido: { carta: 'W01' as never } }).partida;
    const depois = virarTurno(comAtaque, A);
    // O Corte de Sondagem tira só 1 de Guarda, então não ganha ficha nenhuma —
    // mas causou Dano à Vida, e por isso o turno fecha sem a perda.
    expect(momentumDe(depois, A)).toBe(2);
  });

  it('dá uma ficha na primeira Reação do turno inimigo que zera o Dano', () => {
    const defensor = build('guerreiro', { habilidades: ['W15', 'W19', 'W01'] });
    const partida = duelo(defensor, mago, B);
    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'M01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    // 1 pela mecânica e 1 pelo texto de Aparar.
    expect(momentumDe(depois, A)).toBe(2);
  });
});

describe('Mana', () => {
  it('começa em quatro', () => {
    const partida = duelo(guerreiro, mago);
    expect(manaDe(partida, B)).toBe(4);
  });

  it('recupera duas no início do próprio turno, sem passar de seis', () => {
    const partida = duelo(guerreiro, mago);
    const noTurnoDoMago = virarTurno(partida, A);
    expect(manaDe(noTurnoDoMago, B)).toBe(6);

    const deVolta = virarTurno(virarTurno(noTurnoDoMago, B), A);
    expect(manaDe(deVolta, B)).toBe(6);
  });

  it('recupera três quando Reserva Arcana está revelada e o turno começa com 1 ou menos', () => {
    const comReservaArcana = build('mago', {
      habilidades: ['M01', 'M11', 'M15'],
      passivas: ['MP01', 'MP04', 'MP09', 'MP07'],
    });
    const partida = comRecurso(duelo(comReservaArcana, guerreiro, A), A, 1);
    // A Passiva se revela na primeira verificação e já dá duas de Mana.
    const revelada = jogar(partida, A, { pedido: { carta: 'M01' as never } }).partida;
    expect(manaDe(revelada, A)).toBe(3);

    const zerada = comRecurso(revelada, A, 1);
    const proximoTurnoDoMago = virarTurno(virarTurno(zerada, A), B);
    expect(manaDe(proximoTurnoDoMago, A)).toBe(4);
  });
});

describe('Defesa Inata', () => {
  it('Guarda Marcial reduz 1 D ou 1 I e vale uma vez por turno inimigo', () => {
    const defensor = build('guerreiro', { habilidades: ['W01', 'W02', 'W03'] });
    const partida = duelo(defensor, mago, B);

    const primeira = jogar(partida, B, {
      pedido: { carta: 'M02' as never },
      resposta: { tipo: 'defesa-inata' },
    }).partida;
    expect(jogador(primeira, A).vida).toBe(30 - 3);

    const declarada = declarar(primeira, B, { carta: 'M01' as never });
    const base = declarada.ok ? declarada.valor.partida : primeira;
    expect(erroDe(responder(base, A, 1, { tipo: 'defesa-inata' })).tipo).toBe(
      'defesa-inata-ja-usada',
    );
  });

  it('Barreira Arcana gasta 1 Mana e reduz 1 D e 1 I', () => {
    const partida = duelo(mago, guerreiro, B);
    const manaAntes = manaDe(partida, A);
    const { partida: depois, eventos } = jogar(partida, B, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'defesa-inata' },
    });

    expect(manaDe(depois, A)).toBe(manaAntes - 1);
    expect(jogador(depois, A).vida).toBe(30 - 2);
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(2);
  });

  it('Barreira Arcana é recusada sem Mana', () => {
    // Sem Reserva Arcana na build: ela se revelaria com 1 Mana ou menos e
    // devolveria justamente a Mana que este teste precisa que falte.
    const semReservaArcana = build('mago', {
      habilidades: ['M01', 'M02', 'M11', 'M15'],
      passivas: ['MP04', 'MP07', 'MP09', 'MP02'],
    });
    const partida = comRecurso(duelo(semReservaArcana, guerreiro, B), A, 0);
    const declarada = declarar(partida, B, { carta: 'W02' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    expect(erroDe(responder(base, A, 0, { tipo: 'defesa-inata' })).tipo).toBe(
      'recurso-insuficiente',
    );
  });

  it('volta a estar disponível no turno inimigo seguinte', () => {
    const defensor = build('guerreiro', { habilidades: ['W01', 'W02', 'W03'] });
    const partida = duelo(defensor, mago, B);
    const usada = jogar(partida, B, {
      pedido: { carta: 'M01' as never },
      resposta: { tipo: 'defesa-inata' },
    }).partida;

    const proximoTurnoInimigo = virarTurno(virarTurno(usada, B), A);
    const declarada = declarar(proximoTurnoInimigo, B, { carta: 'M02' as never });
    const base = declarada.ok ? declarada.valor.partida : proximoTurnoInimigo;
    expect(responder(base, A, 0, { tipo: 'defesa-inata' }).ok).toBe(true);
  });
});

describe('Resposta', () => {
  it('só admite uma Resposta voluntária por Ação', () => {
    const defensor = build('guerreiro', { habilidades: ['W15', 'W19', 'W01'] });
    const partida = duelo(defensor, mago, B);
    const declarada = declarar(partida, B, { carta: 'M01' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;

    const primeira = responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'W15' as never });
    const comResposta = primeira.ok ? primeira.valor.partida : base;
    expect(erroDe(responder(comResposta, A, 0, { tipo: 'defesa-inata' })).tipo).toBe(
      'segunda-resposta-voluntaria',
    );
  });
});
