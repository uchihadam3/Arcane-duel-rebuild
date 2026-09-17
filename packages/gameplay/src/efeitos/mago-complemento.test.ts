import type { PlayerId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comRecurso,
  duelo,
  jogador,
  jogar,
  manaDe,
  virarTurno,
} from '../teste-apoio.js';
import { declarar, resolver, responder } from '../partida.js';

/*
 * Uma prova de comportamento para cada Passiva, Runa e Ultimate do Mago.
 *
 * As seis Cartas de Classe do Mago são as Runas: Ativar e Exaurir são testados
 * em separado, porque são efeitos diferentes da mesma carta.
 */

const mago = (
  habilidades: readonly string[],
  extras: {
    readonly passivas?: readonly string[];
    readonly cartasDeClasse?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('mago', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W08', 'W11'] });

const estadoDaPassiva = (partida: ReturnType<typeof duelo>, id: PlayerId, carta: string): string =>
  jogador(partida, id).passivas.find((passiva) => passiva.carta === carta)?.estado ?? 'ausente';

const estadoDaRuna = (partida: ReturnType<typeof duelo>, id: PlayerId, carta: string): string =>
  jogador(partida, id).cartasDeClasse.find((item) => item.carta === carta)?.estado ??
  (jogador(partida, id).removidas.includes(carta as never) ? 'exaurida' : 'ausente');

describe('Mago — Passivas', () => {
  it('MP01 Reserva Arcana se revela com 1 Mana ou menos e dá 2 Mana', () => {
    const inicial = duelo(
      mago(['M01'], { passivas: ['MP01', 'MP02', 'MP04', 'MP09'] }),
      guerreiro,
      A,
    );
    const partida = comRecurso(inicial, A, 1);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M01' as never } });
    expect(estadoDaPassiva(depois, A, 'MP01')).not.toBe('oculta');
    expect(manaDe(depois, A)).toBe(3);
  });

  it('MP02 Mente Calculista se revela ao completar a terceira Ação', () => {
    const partida = duelo(
      mago(['M01', 'M11', 'M02'], { passivas: ['MP02', 'MP04', 'MP09', 'MP07'] }),
      guerreiro,
      A,
    );
    const primeira = jogar(partida, A, { pedido: { carta: 'M01' as never } }).partida;
    const segunda = jogar(primeira, A, { pedido: { carta: 'M11' as never } }).partida;
    expect(estadoDaPassiva(segunda, A, 'MP02')).toBe('oculta');

    const { partida: terceira } = jogar(segunda, A, { pedido: { carta: 'M02' as never } });
    expect(estadoDaPassiva(terceira, A, 'MP02')).not.toBe('oculta');
  });

  it('MP03 Véu Prismático se revela diante de uma Ruptura e reduz 2 I', () => {
    const inicial = duelo(
      mago(['M15'], { passivas: ['MP03', 'MP04', 'MP09', 'MP07'] }),
      guerreiro,
      B,
    );
    const partida = com(inicial, A, { guarda: 3 });
    const { partida: depois, eventos } = jogar(partida, B, { pedido: { carta: 'W02' as never } });
    expect(estadoDaPassiva(depois, A, 'MP03')).not.toBe('oculta');
    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(false);
  });

  it('MP04 Eco Rúnico se revela com as duas Runas Ativadas e dá 1 Mana', () => {
    const partida = duelo(
      mago(['M01', 'M11'], { passivas: ['MP04', 'MP09', 'MP07', 'MP02'] }),
      guerreiro,
      A,
    );
    const primeira = jogar(partida, A, {
      pedido: {
        carta: 'M01' as never,
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    }).partida;
    expect(estadoDaPassiva(primeira, A, 'MP04')).toBe('oculta');

    const { partida: segunda } = jogar(primeira, A, {
      pedido: {
        carta: 'M11' as never,
        cartasDeClasse: [{ carta: 'MC02' as never, modo: 'ativar' }],
      },
    });
    expect(estadoDaPassiva(segunda, A, 'MP04')).not.toBe('oculta');
  });

  it('MP05 Concentração sob Pressão se revela ao perder 4 ou mais de Vida', () => {
    const inicial = duelo(
      mago(['M01'], { passivas: ['MP05', 'MP04', 'MP09', 'MP07'] }),
      guerreiro,
      B,
    );
    const partida = com(inicial, A, { guarda: 0 });
    const { partida: depois } = jogar(partida, B, { pedido: { carta: 'W08' as never } });
    expect(jogador(depois, A).vida).toBe(30 - 3 - 0);
    // O Golpe de Cerco bate 3 D contra Guarda 0, então ainda não revela.
    expect(estadoDaPassiva(depois, A, 'MP05')).toBe('oculta');

    const outro = com(
      duelo(mago(['M01'], { passivas: ['MP05', 'MP04', 'MP09', 'MP07'] }), guerreiro, B),
      A,
      {
        guarda: 4,
      },
    );
    const { partida: comRuptura } = jogar(outro, B, { pedido: { carta: 'W08' as never } });
    expect(estadoDaPassiva(comRuptura, A, 'MP05')).not.toBe('oculta');
  });

  it('MP06 Combustão Controlada se revela quando o inimigo chega a Queimadura 2', () => {
    const partida = duelo(
      mago(['M03'], { passivas: ['MP06', 'MP04', 'MP09', 'MP07'] }),
      guerreiro,
      A,
    );
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M03' as never } });
    expect(jogador(depois, B).condicoes.queimadura).toBe(2);
    expect(estadoDaPassiva(depois, A, 'MP06')).not.toBe('oculta');
  });

  it('MP07 Frio Calculado se revela quando o inimigo paga AP extra por Lento', () => {
    const inicial = duelo(
      mago(['M01'], { passivas: ['MP07', 'MP04', 'MP09', 'MP02'] }),
      guerreiro,
      B,
    );
    const partida = com(inicial, B, {
      condicoes: { queimadura: 0, lento: 1, murchar: 0, sangramento: 0 },
    });
    const { partida: depois } = jogar(partida, B, { pedido: { carta: 'W01' as never } });
    expect(estadoDaPassiva(depois, A, 'MP07')).not.toBe('oculta');
  });

  it('MP08 Geometria Rúnica se revela ao Ativar uma Runa para modificar um Feitiço', () => {
    const partida = duelo(
      mago(['M01'], { passivas: ['MP08', 'MP04', 'MP09', 'MP07'] }),
      guerreiro,
      A,
    );
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'M01' as never,
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    });
    expect(estadoDaPassiva(depois, A, 'MP08')).not.toBe('oculta');
  });

  it('MP09 Reserva de Contramedidas se revela ao fechar o turno com Reserva 2', () => {
    const partida = duelo(
      mago(['M01'], { passivas: ['MP09', 'MP04', 'MP07', 'MP02'] }),
      guerreiro,
      A,
    );
    const depois = virarTurno(partida, A);
    expect(jogador(depois, A).reserva).toBe(2);
    expect(estadoDaPassiva(depois, A, 'MP09')).not.toBe('oculta');
  });

  it('MP10 Núcleo Sobrecarregado se revela numa Ação de 2 Mana ou mais', () => {
    const partida = duelo(
      mago(['M05'], { passivas: ['MP10', 'MP04', 'MP09', 'MP07'] }),
      guerreiro,
      A,
    );
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M05' as never } });
    expect(estadoDaPassiva(depois, A, 'MP10')).not.toBe('oculta');
  });
});

describe('Mago — Runas', () => {
  it('MC01 Ativada aplica Queimadura 1 depois de um Feitiço causar Dano', () => {
    const partida = duelo(mago(['M01'], { cartasDeClasse: ['MC01', 'MC02'] }), guerreiro, A);
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'M01' as never,
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).condicoes.queimadura).toBe(1);
  });

  it('MC01 Exaurida troca o tique de Queimadura por 3 de Dano e limpa a Condição', () => {
    const inicial = duelo(mago(['M03'], { cartasDeClasse: ['MC01', 'MC02'] }), guerreiro, A);
    const comQueimadura = jogar(inicial, A, {
      pedido: {
        carta: 'M03' as never,
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'exaurir' }],
      },
    }).partida;
    expect(jogador(comQueimadura, B).condicoes.queimadura).toBe(2);

    const noTurnoDoGuerreiro = virarTurno(comQueimadura, A);
    const vidaAntes = jogador(noTurnoDoGuerreiro, B).vida;
    const depois = virarTurno(noTurnoDoGuerreiro, B);

    expect(jogador(depois, B).condicoes.queimadura).toBe(0);
    expect(vidaAntes - jogador(depois, B).vida).toBe(3);
  });

  it('MC02 Ativada aplica Lento depois de um Feitiço causar 2 I ou mais', () => {
    const partida = duelo(mago(['M04'], { cartasDeClasse: ['MC02', 'MC01'] }), guerreiro, A);
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'M04' as never,
        cartasDeClasse: [{ carta: 'MC02' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).condicoes.lento).toBe(1);
  });

  it('MC02 Exaurida soma +3 I e aplica Lento 2 na Ruptura', () => {
    const inicial = duelo(mago(['M01'], { cartasDeClasse: ['MC02', 'MC01'] }), guerreiro, A);
    const partida = com(inicial, B, { guarda: 4 });
    const { partida: depois, eventos } = jogar(partida, A, {
      pedido: {
        carta: 'M01' as never,
        cartasDeClasse: [{ carta: 'MC02' as never, modo: 'exaurir' }],
      },
    });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(4);
    expect(jogador(depois, B).condicoes.lento).toBe(2);
    expect(estadoDaRuna(depois, A, 'MC02')).toBe('exaurida');
  });

  it('MC03 Ativada adianta o Feitiço que iria para CD2 ou CD3', () => {
    const partida = duelo(mago(['M02'], { cartasDeClasse: ['MC03', 'MC01'] }), guerreiro, A);
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'M02' as never,
        cartasDeClasse: [{ carta: 'MC03' as never, modo: 'ativar' }],
      },
    });
    // Bola de Fogo é CD2 e termina em CD1.
    expect(jogador(depois, A).cooldown[1]).toContain('M02');
    expect(jogador(depois, A).cooldown[2]).not.toContain('M02');
  });

  it('MC03 Exaurida devolve um Feitiço do cooldown e encarece a volta dele', () => {
    const inicial = duelo(mago(['M01', 'M02'], { cartasDeClasse: ['MC03', 'MC01'] }), guerreiro, A);
    const primeira = jogar(inicial, A, { pedido: { carta: 'M01' as never } }).partida;
    expect(jogador(primeira, A).cooldown[1]).toContain('M01');

    const { partida: depois } = jogar(primeira, A, {
      pedido: {
        carta: 'M02' as never,
        escolhas: { cartaEmCooldown: 'M01' as never },
        cartasDeClasse: [{ carta: 'MC03' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).mao).toContain('M01');

    const apAntes = jogador(depois, A).pontosDeAcao;
    const { partida: revolta } = jogar(depois, A, { pedido: { carta: 'M01' as never } });
    // Dardo Arcano custa 1 AP e volta custando 2.
    expect(apAntes - jogador(revolta, A).pontosDeAcao).toBe(2);
  });

  it('MC04 Ativada reforça a Resposta em mais 1', () => {
    const inicial = duelo(mago(['M15'], { cartasDeClasse: ['MC04', 'MC01'] }), guerreiro, B);
    const declarada = declarar(inicial, B, { carta: 'W02' as never });
    const base = declarada.ok ? declarada.valor.partida : inicial;
    const respondida = responder(base, A, 0, {
      tipo: 'carta-de-reacao',
      carta: 'M15' as never,
      escolhas: { reforco: 'dano' },
      cartasDeClasse: [{ carta: 'MC04' as never, modo: 'ativar' }],
    });
    const comResposta = respondida.ok ? respondida.valor.partida : base;
    const resolvida = resolver(comResposta, B, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comResposta;
    // 3 D impressos, menos 3 da Barreira de Mana e menos 1 da Runa: nada passa.
    expect(jogador(fim, A).vida).toBe(30);
  });

  it('MC04 Exaurida zera o Dano final e reduz 2 I', () => {
    const inicial = duelo(mago(['M15'], { cartasDeClasse: ['MC04', 'MC01'] }), guerreiro, B);
    const declarada = declarar(inicial, B, { carta: 'W08' as never });
    const base = declarada.ok ? declarada.valor.partida : inicial;
    const respondida = responder(base, A, 0, {
      tipo: 'carta-de-reacao',
      carta: 'M15' as never,
      cartasDeClasse: [{ carta: 'MC04' as never, modo: 'exaurir' }],
    });
    const comResposta = respondida.ok ? respondida.valor.partida : base;
    const resolvida = resolver(comResposta, B, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comResposta;

    expect(jogador(fim, A).vida).toBe(30);
    expect(jogador(fim, A).guarda).toBe(4);
    expect(estadoDaRuna(fim, A, 'MC04')).toBe('exaurida');
  });

  it('MC05 Ativada devolve 1 Mana depois de uma Ação que gastou Mana', () => {
    const partida = duelo(mago(['M02'], { cartasDeClasse: ['MC05', 'MC01'] }), guerreiro, A);
    const manaAntes = manaDe(partida, A);
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'M02' as never,
        cartasDeClasse: [{ carta: 'MC05' as never, modo: 'ativar' }],
      },
    });
    expect(manaDe(depois, A)).toBe(manaAntes);
  });

  it('MC05 Exaurida ignora o custo de Mana e devolve 1 AP quando ele era 2 ou mais', () => {
    const partida = duelo(mago(['M05'], { cartasDeClasse: ['MC05', 'MC01'] }), guerreiro, A);
    const manaAntes = manaDe(partida, A);
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'M05' as never,
        cartasDeClasse: [{ carta: 'MC05' as never, modo: 'exaurir' }],
      },
    });
    expect(manaDe(depois, A)).toBe(manaAntes);
    // Lança Arcana custa 3 AP; um deles volta.
    expect(jogador(depois, A).pontosDeAcao).toBe(3);
  });

  it('MC06 Ativada barateia a terceira Ação de Feitiço em 1 AP', () => {
    const partida = duelo(
      mago(['M01', 'M11', 'M02'], { cartasDeClasse: ['MC06', 'MC01'] }),
      guerreiro,
      A,
    );
    const primeira = jogar(partida, A, { pedido: { carta: 'M01' as never } }).partida;
    const segunda = jogar(primeira, A, {
      pedido: {
        carta: 'M11' as never,
        cartasDeClasse: [{ carta: 'MC06' as never, modo: 'ativar' }],
      },
    }).partida;

    const apAntes = jogador(segunda, A).pontosDeAcao;
    const { partida: terceira } = jogar(segunda, A, { pedido: { carta: 'M02' as never } });
    // Bola de Fogo custa 2 AP e sai por 1.
    expect(apAntes - jogador(terceira, A).pontosDeAcao).toBe(1);
  });

  it('MC06 Exaurida abre uma quarta Ação para um Feitiço', () => {
    const partida = duelo(
      mago(['M01', 'M11', 'M09', 'M03'], { cartasDeClasse: ['MC06', 'MC01'] }),
      guerreiro,
      A,
    );
    const primeira = jogar(partida, A, { pedido: { carta: 'M01' as never } }).partida;
    const segunda = jogar(primeira, A, { pedido: { carta: 'M11' as never } }).partida;
    const terceira = jogar(segunda, A, {
      pedido: {
        carta: 'M09' as never,
        cartasDeClasse: [{ carta: 'MC06' as never, modo: 'exaurir' }],
      },
    }).partida;

    expect(jogador(terceira, A).acoesPermitidasNoTurno).toBe(4);
    const { partida: quarta } = jogar(terceira, A, { pedido: { carta: 'M03' as never } });
    expect(jogador(quarta, A).acoesRealizadasNoTurno).toBe(4);
  });
});

describe('Mago — Ultimates', () => {
  it('MU01 Meteoro bate 7 D / 2 I e aplica Queimadura 2', () => {
    const partida = comRecurso(duelo(mago(['M01'], { ultimate: 'MU01' }), guerreiro, A), A, 4);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'MU01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 7);
    expect(jogador(depois, B).condicoes.queimadura).toBe(2);
    expect(jogador(depois, A).ultimate.estado).toBe('consumida');
  });

  it('MU02 Zero Absoluto aplica Lento 2 quando causa Ruptura', () => {
    const inicial = duelo(mago(['M01'], { ultimate: 'MU02' }), guerreiro, A);
    const partida = comRecurso(com(inicial, B, { guarda: 4 }), A, 4);
    const { partida: depois, eventos } = jogar(partida, A, { pedido: { carta: 'MU02' as never } });
    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(true);
    expect(jogador(depois, B).condicoes.lento).toBe(2);
  });

  it('MU03 Sobrecarga Temporal deixa as Runas Prontas, devolve CD1 e dá 1 AP', () => {
    const inicial = duelo(
      mago(['M01', 'M11'], { ultimate: 'MU03', cartasDeClasse: ['MC01', 'MC02'] }),
      guerreiro,
      A,
    );
    const comRunas = jogar(inicial, A, {
      pedido: {
        carta: 'M01' as never,
        cartasDeClasse: [
          { carta: 'MC01' as never, modo: 'ativar' },
          { carta: 'MC02' as never, modo: 'ativar' },
        ],
      },
    }).partida;
    expect(estadoDaRuna(comRunas, A, 'MC01')).toBe('ativada');
    expect(estadoDaRuna(comRunas, A, 'MC02')).toBe('ativada');

    const comMana = comRecurso(comRunas, A, 3);
    const { partida: depois } = jogar(comMana, A, {
      pedido: { carta: 'MU03' as never, escolhas: { cartasEmCooldown: ['M01' as never] } },
    });

    expect(estadoDaRuna(depois, A, 'MC01')).toBe('pronta');
    expect(estadoDaRuna(depois, A, 'MC02')).toBe('pronta');
    expect(jogador(depois, A).mao).toContain('M01');
    // Custou 2 AP e devolveu 1.
    expect(jogador(depois, A).pontosDeAcao).toBe(3);
  });
});
