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
  virarTurno,
} from '../teste-apoio.js';
import { declarar, responder } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Mago.
 *
 * Todas são Feitiços: o traço está no catálogo e é ele que as cartas de Runa
 * consultam. Nenhum teste informa custo nem valores — só a identidade da carta.
 */

const mago = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('mago', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W11', 'W15', 'W02'] });

describe('Mago — habilidades', () => {
  it('M01 Dardo Arcano recebe +1 D com uma Runa Ativada', () => {
    const partida = duelo(mago(['M01']), guerreiro, A);
    const semRuna = jogar(partida, A, { pedido: { carta: 'M01' as never } });
    expect(jogador(semRuna.partida, B).vida).toBe(30 - 2);

    const outro = duelo(mago(['M01', 'M02']), guerreiro, A);
    const comRuna = jogar(outro, A, {
      pedido: {
        carta: 'M01' as never,
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(comRuna.partida, B).vida).toBe(30 - 3);
  });

  it('M02 Bola de Fogo recebe +1 D contra inimigo com Queimadura', () => {
    const inicial = duelo(mago(['M02']), guerreiro, A);
    const partida = com(inicial, B, {
      condicoes: { queimadura: 1, lento: 0, murchar: 0, sangramento: 0 },
    });
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M02' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 5);
  });

  it('M03 Chama Persistente aplica Queimadura 2 quando causa Dano à Vida', () => {
    const partida = duelo(mago(['M03']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M03' as never } });
    expect(jogador(depois, B).condicoes.queimadura).toBe(2);
  });

  it('M04 Pulso Cinético recupera 1 Mana ao causar Ruptura', () => {
    const inicial = duelo(mago(['M04']), guerreiro, A);
    const partida = com(inicial, B, { guarda: 3 });
    const manaAntes = manaDe(partida, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M04' as never } });
    // Paga 1 de Mana e recupera 1.
    expect(manaDe(depois, A)).toBe(manaAntes);
  });

  it('M05 Lança Arcana recebe +1 D na terceira Ação', () => {
    const partida = duelo(mago(['M01', 'M11', 'M05']), guerreiro, A);
    const primeira = jogar(partida, A, { pedido: { carta: 'M01' as never } }).partida;
    const segunda = jogar(primeira, A, { pedido: { carta: 'M11' as never } }).partida;
    const antes = jogador(segunda, B).vida;
    const { partida: depois } = jogar(segunda, A, { pedido: { carta: 'M05' as never } });
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('M06 Estilhaço de Gelo aplica Lento 1 quando causa Dano à Vida', () => {
    const partida = duelo(mago(['M06']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M06' as never } });
    expect(jogador(depois, B).condicoes.lento).toBe(1);
  });

  it('M07 Onda Glacial aplica Lento 1 ao causar Ruptura', () => {
    const inicial = duelo(mago(['M07']), guerreiro, A);
    const partida = com(inicial, B, { guarda: 3 });
    const { partida: depois, eventos } = jogar(partida, A, { pedido: { carta: 'M07' as never } });
    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(true);
    expect(jogador(depois, B).condicoes.lento).toBe(1);
  });

  it('M08 Rajada Prismática dá o reforço escolhido quando Ativa uma Runa', () => {
    const partida = duelo(mago(['M08']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'M08' as never,
        escolhas: { reforco: 'dano' },
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('M08 sem Ativar Runa nenhuma não ganha reforço', () => {
    const partida = duelo(mago(['M08']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M08' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('M09 Orbe Instável dá o reforço escolhido na segunda Ação', () => {
    const partida = duelo(mago(['M01', 'M09']), guerreiro, A);
    const primeira = jogar(partida, A, { pedido: { carta: 'M01' as never } }).partida;
    const { eventos } = jogar(primeira, A, {
      pedido: { carta: 'M09' as never, escolhas: { reforco: 'impacto' } },
    });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(3);
  });

  it('M10 Explosão de Mana recebe +1 D por Mana adicional', () => {
    const partida = comRecurso(duelo(mago(['M10']), guerreiro, A), A, 5);
    const { partida: depois } = jogar(partida, A, {
      pedido: { carta: 'M10' as never, escolhas: { recursoAdicional: 2 } },
    });
    expect(jogador(depois, B).vida).toBe(30 - 4);
    expect(manaDe(depois, A)).toBe(2);
  });

  it('M10 recusa uma parcela variável fora do intervalo impresso', () => {
    const partida = comRecurso(duelo(mago(['M10']), guerreiro, A), A, 6);
    expect(
      erroDe(declarar(partida, A, { carta: 'M10' as never, escolhas: { recursoAdicional: 3 } }))
        .tipo,
    ).toBe('escolha-invalida');
  });

  it('M11 Canalizar dá 2 Mana até o máximo', () => {
    const partida = comRecurso(duelo(mago(['M11']), guerreiro, A), A, 2);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'M11' as never } });
    expect(manaDe(depois, A)).toBe(4);
  });

  it('M12 Concentração Prismática dá +1 D e +1 I ao próximo Feitiço', () => {
    const partida = duelo(mago(['M12', 'M01']), guerreiro, A);
    const comTecnica = jogar(partida, A, { pedido: { carta: 'M12' as never } }).partida;
    const { partida: depois, eventos } = jogar(comTecnica, A, {
      pedido: { carta: 'M01' as never },
    });
    expect(jogador(depois, B).vida).toBe(30 - 3);
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(2);
  });

  it('M13 Distorção Temporal devolve uma carta de CD1 para a mão', () => {
    const partida = duelo(mago(['M01', 'M13']), guerreiro, A);
    const primeira = jogar(partida, A, { pedido: { carta: 'M01' as never } }).partida;
    expect(jogador(primeira, A).cooldown[1]).toContain('M01');

    const { partida: depois } = jogar(primeira, A, {
      pedido: { carta: 'M13' as never, escolhas: { cartaEmCooldown: 'M01' as never } },
    });
    expect(jogador(depois, A).mao).toContain('M01');
    expect(jogador(depois, A).cooldown[1]).not.toContain('M01');
  });

  it('M13 é recusada quando não há carta em CD1', () => {
    const partida = duelo(mago(['M13']), guerreiro, A);
    expect(erroDe(declarar(partida, A, { carta: 'M13' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );
  });

  it('M14 Recalibrar Runa deixa Pronta uma Runa Ativada', () => {
    const partida = duelo(mago(['M01', 'M14']), guerreiro, A);
    const comRuna = jogar(partida, A, {
      pedido: {
        carta: 'M01' as never,
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    }).partida;
    expect(jogador(comRuna, A).cartasDeClasse.find((item) => item.carta === 'MC01')?.estado).toBe(
      'ativada',
    );

    const { partida: depois } = jogar(comRuna, A, {
      pedido: { carta: 'M14' as never, escolhas: { cartaDeClasse: 'MC01' as never } },
    });
    expect(jogador(depois, A).cartasDeClasse.find((item) => item.carta === 'MC01')?.estado).toBe(
      'pronta',
    );
  });

  it('M15 Barreira de Mana reduz 3 D', () => {
    const partida = duelo(mago(['M15']), guerreiro, B);
    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M15' as never },
    });
    expect(jogador(depois, A).vida).toBe(30);
  });

  it('M16 Imagem Espelhada zera o Dano final sem mexer no Impacto', () => {
    const partida = duelo(mago(['M16']), guerreiro, B);
    const { partida: depois, eventos } = jogar(partida, B, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M16' as never },
    });
    expect(jogador(depois, A).vida).toBe(30);
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    // Ombro de Guerra é a primeira Ação do turno: 2 I impressos mais 1.
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(3);
    expect(jogador(depois, A).guarda).toBe(3);
  });

  it('M17 Égide Cinética reduz 3 I', () => {
    const partida = duelo(mago(['M17']), guerreiro, B);
    const { eventos } = jogar(partida, B, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M17' as never },
    });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(0);
  });

  it('M18 Armadura de Gelo aplica Lento ao atacante quando zera o Dano', () => {
    const partida = duelo(mago(['M18']), guerreiro, B);
    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M18' as never },
    });
    expect(jogador(depois, A).vida).toBe(30);
    expect(jogador(depois, B).condicoes.lento).toBe(1);
  });

  it('M19 Contrafeitiço cancela o texto da Técnica sem devolver o custo', () => {
    const partida = duelo(mago(['M19', 'M01']), guerreiro, B);
    const comTecnica = jogar(partida, B, {
      pedido: { carta: 'W11' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M19' as never },
    }).partida;

    // A Técnica saiu da mão, custou AP e foi para o cooldown; o texto não valeu.
    expect(jogador(comTecnica, B).cooldown[2]).toContain('W11');
    expect(jogador(comTecnica, B).pontosDeAcao).toBe(4);

    const { eventos } = jogar(comTecnica, B, { pedido: { carta: 'W01' as never } });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(1);
  });

  it('M19 só responde a uma Técnica', () => {
    const partida = duelo(mago(['M19']), guerreiro, B);
    const declarada = declarar(partida, B, { carta: 'W01' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    expect(
      erroDe(responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'M19' as never })).tipo,
    ).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('M20 Barreira Prismática reduz 2 D e 2 I e deixa uma Runa Pronta', () => {
    // O Mago Ativa uma Runa no próprio turno; ela continua Ativada durante o
    // turno inimigo, que é quando a Barreira Prismática entra.
    const inicial = duelo(mago(['M01', 'M20']), guerreiro, A);
    const comRuna = jogar(inicial, A, {
      pedido: {
        carta: 'M01' as never,
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    }).partida;
    const noTurnoDoGuerreiro = virarTurno(comRuna, A);
    expect(
      jogador(noTurnoDoGuerreiro, A).cartasDeClasse.find((item) => item.carta === 'MC01')?.estado,
    ).toBe('ativada');

    const { partida: depois, eventos } = jogar(noTurnoDoGuerreiro, B, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M20' as never },
    });

    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    // Ombro de Guerra na primeira Ação: 3 I, menos os 2 reduzidos.
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(1);
    expect(jogador(depois, A).vida).toBe(30 - 1);
    expect(jogador(depois, A).cartasDeClasse.find((item) => item.carta === 'MC01')?.estado).toBe(
      'pronta',
    );
  });
});
