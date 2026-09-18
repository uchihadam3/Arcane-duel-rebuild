import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  almasDe,
  almasNoCemiterio,
  build,
  com,
  comAlmas,
  duelo,
  erroDe,
  jogador,
  jogar,
} from '../teste-apoio.js';
import { declarar, responder } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Necromante.
 *
 * A Alma é moeda e é conservada: os testes olham as duas pilhas, controladas e
 * Cemitério, porque nenhuma ficha pode sumir nem nascer no meio do caminho.
 */

const necromante = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('necromante', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

describe('Necromante — habilidades', () => {
  it('N01 Flecha Óssea causa os valores impressos sem gastar Alma', () => {
    const partida = duelo(necromante(['N01']), guerreiro, A);
    const antes = almasDe(partida, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'N01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 2);
    // A carta não cobra Alma nenhuma; a que entra é a colheita automática do
    // primeiro Ataque do turno que causa Dano à Vida.
    expect(almasDe(depois, A)).toBe(antes + 1);
  });

  it('N02 Lança de Ossos gasta 1 Alma e a manda para o Cemitério', () => {
    const partida = duelo(necromante(['N02']), guerreiro, A);
    expect(almasDe(partida, A)).toBe(2);
    expect(almasNoCemiterio(partida, A)).toBe(2);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'N02' as never } });
    // Gasta 1 e a mecânica colhe 1 de volta ao causar Dano à Vida: sobra 2.
    expect(almasDe(depois, A) + almasNoCemiterio(depois, A)).toBe(4);
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('N02 é recusada sem Alma nenhuma controlada', () => {
    const partida = comAlmas(duelo(necromante(['N02']), guerreiro, A), A, 0);
    expect(erroDe(declarar(partida, A, { carta: 'N02' as never })).tipo).toBe(
      'recurso-insuficiente',
    );
  });

  it('N03 Toque Murchante aplica Murchar 1 ao causar Dano à Vida', () => {
    const partida = duelo(necromante(['N03']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'N03' as never } });
    expect(jogador(depois, B).condicoes.murchar).toBe(1);
  });

  it('N04 Drenar Vitalidade restaura 1 Vida ao causar Dano à Vida', () => {
    const partida = com(duelo(necromante(['N04']), guerreiro, A), A, { vida: 20 });
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'N04' as never } });
    expect(jogador(depois, A).vida).toBe(21);
  });

  it('N05 Onda dos Mortos recebe +1 I com os dois Servos Prontos', () => {
    const partida = comAlmas(duelo(necromante(['N05']), guerreiro, A), A, 2);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'N05' as never } });
    // 3 I impressos + 1 I pelos dois Servos Prontos.
    expect(jogador(depois, B).guarda).toBe(6 - 4);
  });

  it('N06 Ceifa Funesta ganha +2 D ao remover 1 Murchar do adversário', () => {
    const base = duelo(necromante(['N06']), guerreiro, A);
    const comMurchar = com(base, B, {
      condicoes: { queimadura: 0, lento: 0, murchar: 2, sangramento: 0 },
    });
    const { partida: depois } = jogar(comMurchar, A, {
      pedido: { carta: 'N06' as never, escolhas: { condicao: 'murchar' } },
    });
    expect(jogador(depois, B).condicoes.murchar).toBe(1);
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('N06 sem a escolha não remove Murchar e não ganha o bônus', () => {
    const base = duelo(necromante(['N06']), guerreiro, A);
    const comMurchar = com(base, B, {
      condicoes: { queimadura: 0, lento: 0, murchar: 2, sangramento: 0 },
    });
    const { partida: depois } = jogar(comMurchar, A, { pedido: { carta: 'N06' as never } });
    expect(jogador(depois, B).condicoes.murchar).toBe(2);
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('N07 Mão do Túmulo colhe 1 Alma contra Guarda 3 ou menos', () => {
    const base = comAlmas(duelo(necromante(['N07']), guerreiro, A), A, 0);
    const guardaBaixa = com(base, B, { guarda: 3 });
    const { partida: depois } = jogar(guardaBaixa, A, { pedido: { carta: 'N07' as never } });
    // Uma Alma pelo texto e outra pela colheita automática do próprio turno.
    expect(almasDe(depois, A)).toBe(2);
  });

  it('N07 contra Guarda alta não colhe pelo texto', () => {
    const base = comAlmas(duelo(necromante(['N07']), guerreiro, A), A, 0);
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'N07' as never } });
    expect(almasDe(depois, A)).toBe(1);
  });

  it('N08 Roubo de Memória empurra uma carta adversária de CD1 para CD2', () => {
    const base = comAlmas(duelo(necromante(['N08']), guerreiro, A), A, 2);
    const comCd1 = com(base, B, { cooldown: { 1: ['W03' as never], 2: [], 3: [] } });
    const { partida: depois } = jogar(comCd1, A, {
      pedido: { carta: 'N08' as never, escolhas: { cartaAdversariaEmCooldown: 'W03' as never } },
    });
    expect(jogador(depois, B).cooldown[2]).toContain('W03');
  });

  it('N09 Ruína Sepulcral colhe as Almas escolhidas ao causar Ruptura', () => {
    const base = comAlmas(duelo(necromante(['N09']), guerreiro, A), A, 1);
    const quaseRompido = com(base, B, { guarda: 2 });
    const { partida: depois } = jogar(quaseRompido, A, {
      pedido: { carta: 'N09' as never, escolhas: { almasColhidas: 2 } },
    });
    // Gasta 1, colhe 2 pelo texto e mais 1 pela mecânica do turno.
    expect(almasDe(depois, A)).toBe(3);
  });

  it('N09 recusa a jogada sem a escolha de quantas Almas colher', () => {
    const base = comAlmas(duelo(necromante(['N09']), guerreiro, A), A, 1);
    expect(erroDe(declarar(base, A, { carta: 'N09' as never })).tipo).toBe('escolha-obrigatoria');
  });

  it('N10 Colheita Profana empurra a própria carta de CD1 e colhe', () => {
    const base = comAlmas(duelo(necromante(['N10']), guerreiro, A), A, 0);
    const comCd1 = com(base, A, { cooldown: { 1: ['N01' as never], 2: [], 3: [] } });
    const { partida: depois } = jogar(comCd1, A, {
      pedido: {
        carta: 'N10' as never,
        escolhas: { cartaEmCooldown: 'N01' as never, almasColhidas: 2 },
      },
    });
    expect(jogador(depois, A).cooldown[2]).toContain('N01');
    expect(almasDe(depois, A)).toBe(2);
  });

  it('N11 Oferenda ao Túmulo manda outra carta da mão para CD2', () => {
    const base = comAlmas(duelo(necromante(['N11', 'N01']), guerreiro, A), A, 0);
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N11' as never,
        escolhas: { cartaDaMao: 'N01' as never, almasColhidas: 3 },
      },
    });
    expect(jogador(depois, A).cooldown[2]).toContain('N01');
    expect(jogador(depois, A).mao).not.toContain('N01');
    expect(almasDe(depois, A)).toBe(3);
  });

  it('N12 Desenterrar traz uma carta de CD3 para CD2', () => {
    const base = comAlmas(duelo(necromante(['N12']), guerreiro, A), A, 2);
    const comCd3 = com(base, A, { cooldown: { 1: [], 2: [], 3: ['N01' as never] } });
    const { partida: depois } = jogar(comCd3, A, {
      pedido: { carta: 'N12' as never, escolhas: { cartaEmCooldown: 'N01' as never } },
    });
    expect(jogador(depois, A).cooldown[2]).toContain('N01');
  });

  it('N13 Comandar os Mortos deixa Pronto um Servo Ativado', () => {
    const base = comAlmas(duelo(necromante(['N13', 'N01']), guerreiro, A), A, 2);
    const comServoAtivado = com(base, A, {
      cartasDeClasse: jogador(base, A).cartasDeClasse.map((item, indice) =>
        indice === 0 ? { ...item, estado: 'ativada' as const } : item,
      ),
    });
    const servo = jogador(comServoAtivado, A).cartasDeClasse[0]?.carta;
    if (servo === undefined) throw new Error('build sem Servo');
    const { partida: depois } = jogar(comServoAtivado, A, {
      pedido: { carta: 'N13' as never, escolhas: { cartaDeClasse: servo } },
    });
    expect(jogador(depois, A).cartasDeClasse[0]?.estado).toBe('pronta');
  });

  it('N14 Selo Fúnebre aplica Murchar 1 ao adversário', () => {
    const partida = comAlmas(duelo(necromante(['N14']), guerreiro, A), A, 2);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'N14' as never } });
    expect(jogador(depois, B).condicoes.murchar).toBe(1);
  });

  it('N15 Rito de Ossos dá +2 I ao próximo Ataque do turno', () => {
    const base = comAlmas(duelo(necromante(['N15', 'N01']), guerreiro, A), A, 2);
    const preparado = jogar(base, A, { pedido: { carta: 'N15' as never } }).partida;
    const { partida: depois } = jogar(preparado, A, { pedido: { carta: 'N01' as never } });
    // 1 I impresso + 2 I do Rito.
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });

  it('N15 prontifica o Servo Ativado quando o Ataque beneficiado rompe', () => {
    const base = comAlmas(duelo(necromante(['N15', 'N01']), guerreiro, A), A, 2);
    const comUmServoAtivado = com(com(base, B, { guarda: 3 }), A, {
      cartasDeClasse: jogador(base, A).cartasDeClasse.map((item, indice) =>
        indice === 0 ? { ...item, estado: 'ativada' as const } : item,
      ),
    });
    const preparado = jogar(comUmServoAtivado, A, { pedido: { carta: 'N15' as never } }).partida;
    const { partida: depois } = jogar(preparado, A, { pedido: { carta: 'N01' as never } });
    expect(jogador(depois, A).cartasDeClasse[0]?.estado).toBe('pronta');
  });

  it('N16 Muralha de Ossos reduz 3 I', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N16']), A), B, 2);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'N16' as never },
    });
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('N17 Véu dos Mortos reduz 3 D', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N17']), A), B, 2);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'N17' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('N18 Retorno Sepulcral devolve uma carta de CD1 à mão', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N18']), A), B, 2);
    const comCd1 = com(base, B, {
      reserva: 2,
      cooldown: { 1: ['N01' as never], 2: [], 3: [] },
    });
    const { partida: depois } = jogar(comCd1, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'N18' as never,
        escolhas: { cartaEmCooldown: 'N01' as never },
      },
    });
    expect(jogador(depois, B).mao).toContain('N01');
  });

  it('N19 Recusar a Morte só sai contra Ataque letal e deixa a Vida em 1', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N19']), A), B, 3);
    const saudavel = com(base, B, { reserva: 2 });
    const declarada = declarar(saudavel, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    expect(
      erroDe(
        responder(declarada.valor.partida, B, 0, {
          tipo: 'carta-de-reacao',
          carta: 'N19' as never,
        }),
      ).tipo,
    ).toBe('condicao-de-uso-nao-satisfeita');

    const morrendo = com(saudavel, B, { vida: 3, reserva: 2 });
    const { partida: depois } = jogar(morrendo, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'N19' as never },
    });
    expect(jogador(depois, B).vida).toBe(1);
    expect(depois.desfecho).toBeNull();
  });

  it('N20 Maldição Reflexa aplica Murchar ao adversário se ainda perder Vida', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N20']), A), B, 2);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'N20' as never },
    });
    expect(jogador(depois, B).vida).toBeLessThan(30);
    expect(jogador(depois, A).condicoes.murchar).toBe(1);
  });
});
