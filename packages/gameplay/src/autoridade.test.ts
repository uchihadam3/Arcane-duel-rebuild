import { describe, expect, it } from 'vitest';

import { CATALOGO, perfilDaCarta } from '@arcane-duel/card-data';

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
} from './teste-apoio.js';
import type { PedidoDeAcao, PedidoDeResposta } from './partida.js';
import { declarar, responder } from './partida.js';
import {
  CARTAS_COM_EFEITO,
  EFEITOS_DE_CARTA_DE_CLASSE,
  EFEITOS_DE_PASSIVA,
  EFEITOS_JOGAVEIS,
} from './registro.js';

/*
 * O catálogo é autoritativo.
 *
 * Um cliente informa identidade de carta e escolhas legais. Custo, tipo, Dano,
 * Impacto e zona de cooldown não viajam na jogada — e por isso não existe
 * caminho para um cliente afirmar que "W03 custa 0 e causa 99".
 */

const guerreiro = build('guerreiro', { habilidades: ['W03', 'W01', 'W15'] });
const mago = build('mago', { habilidades: ['M05', 'M15', 'M01'] });

describe('o pedido do cliente não carrega dados de carta', () => {
  it('não aceita custo informado por quem joga', () => {
    const partida = duelo(guerreiro, mago);
    const pedido: PedidoDeAcao = {
      carta: 'W03' as never,
      // @ts-expect-error o pedido não tem campo de custo: ele não existe no tipo.
      custo: { moeda: 'ap', valor: 0 },
    };
    expect(pedido.carta).toBe('W03');
    expect(declarar(partida, A, { carta: 'W03' as never }).ok).toBe(true);
  });

  it('não aceita Dano nem Impacto informados por quem joga', () => {
    const pedido: PedidoDeAcao = {
      carta: 'W03' as never,
      // @ts-expect-error valores de combate não fazem parte do pedido.
      valores: { dano: 99, impacto: 99 },
    };
    expect(pedido.carta).toBe('W03');
  });

  it('não aceita zona de cooldown nem tipo informados por quem joga', () => {
    const pedido: PedidoDeAcao = {
      carta: 'W03' as never,
      // @ts-expect-error o cooldown é impresso na carta, não escolhido na jogada.
      cooldown: 1,
    };
    const outro: PedidoDeResposta = {
      tipo: 'carta-de-reacao',
      carta: 'W15' as never,
      // @ts-expect-error o custo da Reação também vem do catálogo.
      custoEmReserva: 0,
    };
    expect(pedido.carta).toBe('W03');
    expect(outro.tipo).toBe('carta-de-reacao');
  });

  it('cobra o custo impresso e aplica os valores impressos', () => {
    const partida = duelo(guerreiro, mago);
    const definicao = CATALOGO.porId('W03' as never);
    const apAntes = jogador(partida, A).pontosDeAcao;

    const { partida: depois, eventos } = jogar(partida, A, { pedido: { carta: 'W03' as never } });

    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(definicao?.custo?.valor);
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : -1).toBe(
      definicao?.valores?.impacto,
    );
    expect(jogador(depois, A).cooldown[definicao?.cooldown ?? 1]).toContain('W03');
  });

  it('recusa uma carta que não existe no catálogo', () => {
    const partida = duelo(guerreiro, mago);
    expect(erroDe(declarar(partida, A, { carta: 'W99' as never })).tipo).toBe('carta-desconhecida');
  });

  it('recusa uma carta de outra classe', () => {
    const partida = duelo(guerreiro, mago);
    expect(erroDe(declarar(partida, A, { carta: 'M01' as never })).tipo).toBe(
      'carta-de-outra-classe',
    );
  });

  it('recusa jogar uma Reação como Ação', () => {
    const partida = duelo(guerreiro, mago);
    expect(erroDe(declarar(partida, A, { carta: 'W15' as never })).tipo).toBe(
      'tipo-de-carta-invalido',
    );
  });

  it('recusa responder com uma carta que não é Reação', () => {
    const partida = duelo(guerreiro, mago, B);
    const declarada = declarar(partida, B, { carta: 'M01' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    expect(
      erroDe(responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'W01' as never })).tipo,
    ).toBe('tipo-de-carta-invalido');
  });

  it('cobra a Reação pelo custo impresso nela, não pelo da Ação a que responde', () => {
    const partida = duelo(guerreiro, mago, B);
    const declarada = declarar(partida, B, { carta: 'M05' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const reservaAntes = jogador(base, A).reserva;

    const respondida = responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'W15' as never });
    const depois = respondida.ok ? respondida.valor.partida : base;

    // Aparar custa 1 R; a Lança Arcana custa 3 AP e 2 Mana, e nada disso
    // encosta na conta do defensor.
    expect(reservaAntes - jogador(depois, A).reserva).toBe(
      perfilDaCarta('W15' as never)?.custo.valor,
    );

    // A Reação vai para a zona impressa **nela**, e não na Ação a que respondeu:
    // Aparar é CD1, a Lança Arcana é CD2.
    const { partida: fim } = jogar(partida, B, {
      pedido: { carta: 'M05' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    expect(jogador(fim, A).cooldown[1]).toContain('W15');
    expect(jogador(fim, B).cooldown[2]).toContain('M05');
  });
});

describe('custo multi-recurso é atômico', () => {
  it('não gasta pontos de Ação quando falta Mana', () => {
    const partida = comRecurso(duelo(mago, guerreiro, A), A, 1);
    const antes = jogador(partida, A);

    const recusada = declarar(partida, A, { carta: 'M05' as never });
    expect(erroDe(recusada).tipo).toBe('recurso-insuficiente');

    // O estado recusado é o mesmo estado de antes: nada foi debitado.
    expect(jogador(partida, A).pontosDeAcao).toBe(antes.pontosDeAcao);
    expect(manaDe(partida, A)).toBe(1);
    expect(jogador(partida, A).mao).toContain('M05');
  });

  it('não gasta Mana quando faltam pontos de Ação', () => {
    const partida = com(comRecurso(duelo(mago, guerreiro, A), A, 6), A, { pontosDeAcao: 1 });
    expect(erroDe(declarar(partida, A, { carta: 'M05' as never })).tipo).toBe('ap-insuficiente');
    expect(manaDe(partida, A)).toBe(6);
  });

  it('recusa um recurso que a classe não possui', () => {
    const partida = duelo(guerreiro, mago);
    // O Guerreiro não tem Mana: uma carta com custo de Mana não teria como ser
    // paga por ele, e o catálogo já impede que ele a equipe.
    expect(CATALOGO.porId('M02' as never)?.classe).toBe('mago');
    expect(erroDe(declarar(partida, A, { carta: 'M02' as never })).tipo).toBe(
      'carta-de-outra-classe',
    );
  });
});

describe('catálogo e comportamento andam juntos', () => {
  it('toda carta jogável do catálogo tem comportamento registrado', () => {
    for (const carta of CATALOGO.todas) {
      if (carta.tipo === 'passiva') {
        expect(EFEITOS_DE_PASSIVA.has(carta.id), carta.id).toBe(true);
      } else if (carta.tipo === 'carta-de-classe') {
        expect(EFEITOS_DE_CARTA_DE_CLASSE.has(carta.id), carta.id).toBe(true);
      } else {
        expect(EFEITOS_JOGAVEIS.has(carta.id), carta.id).toBe(true);
      }
    }
  });

  it('não existe comportamento sem carta no catálogo', () => {
    for (const carta of CARTAS_COM_EFEITO) {
      expect(CATALOGO.porId(carta), carta).toBeDefined();
    }
  });
});
