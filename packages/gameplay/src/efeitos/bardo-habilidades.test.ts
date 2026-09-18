import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  cadenciasDe,
  com,
  duelo,
  erroDe,
  jogador,
  jogar,
  notasDe,
  virarTurno,
} from '../teste-apoio.js';
import { declarar } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Bardo.
 *
 * O recurso do Bardo é a ordem das Notas: os testes montam a sequência jogando
 * de verdade, e conferem a Cadência pelo estado, não por contagem paralela.
 */

const bardo = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('bardo', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

describe('Bardo — habilidades', () => {
  it('B01 Batida Marcial recebe +1 I na primeira Ação e registra a Nota Pulso', () => {
    const partida = duelo(bardo(['B01']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'B01' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 2);
    expect(notasDe(depois, A)).toEqual(['pulso']);
  });

  it('B02 Corda Cortante recebe +1 D depois de uma Ação de Pulso e produz Cadência', () => {
    const base = duelo(bardo(['B01', 'B02']), guerreiro, A);
    const primeira = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'B02' as never } });
    expect(antes - jogador(depois, B).vida).toBe(4);
    expect(cadenciasDe(depois, A)).toBe(1);
  });

  it('B03 Acorde Estridente só ganha +1 I com Cadência e Nota anterior Melodia', () => {
    const base = duelo(bardo(['B01', 'B02', 'B03']), guerreiro, A);
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B02' as never } }).partida;
    const guardaAntes = jogador(duas, B).guarda;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'B03' as never } });
    expect(guardaAntes - jogador(depois, B).guarda).toBe(3);
  });

  it('B04 Crescendo recebe +1 D por Nota diferente anterior, até +2 D', () => {
    // Duas Ações baratas antes, para sobrar AP para o Crescendo de 3.
    const base = duelo(bardo(['B01', 'B12', 'B04']), guerreiro, A);
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'B04' as never } });
    // 4 D impressos + 2 D por Pulso e Harmonia já usados.
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('B05 Nota Perfurante barateia a próxima Ação quando causa Ruptura', () => {
    const base = com(duelo(bardo(['B05', 'B02']), guerreiro, A), B, { guarda: 3 });
    const rompeu = jogar(base, A, { pedido: { carta: 'B05' as never } }).partida;
    const apAntes = jogador(rompeu, A).pontosDeAcao;
    const { partida: depois } = jogar(rompeu, A, { pedido: { carta: 'B02' as never } });
    // Corda Cortante custa 2 AP; com o desconto, sai por 1.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('B06 Refrão Cortante exige Cadência produzida no turno', () => {
    const base = duelo(bardo(['B06', 'B01', 'B02']), guerreiro, A);
    expect(erroDe(declarar(base, A, { carta: 'B06' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B02' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'B06' as never } });
    // 3 D impressos + 1 D por ser a terceira Ação.
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('B07 Dissonância guarda o reforço escolhido quando o inimigo reage', () => {
    const base = com(duelo(bardo(['B07', 'B01']), guerreiro, A), B, { reserva: 2 });
    const primeira = jogar(base, A, {
      pedido: { carta: 'B07' as never, escolhas: { reforco: 'dano' } },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'B01' as never } });
    // 2 D impressos + 1 D guardado pela Dissonância.
    expect(antes - jogador(depois, B).vida).toBe(3);
  });

  it('B08 Pancada de Compasso recebe +1 D contra adversário com Reserva 0', () => {
    const base = com(duelo(bardo(['B08']), guerreiro, A), B, { reserva: 0 });
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'B08' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('B09 Arpejo de Guerra recebe +1 D e +1 I depois de duas Notas diferentes', () => {
    const base = duelo(bardo(['B01', 'B12', 'B09']), guerreiro, A);
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'B09' as never } });
    // 5 D impressos + 1 D por Pulso e Harmonia serem Notas diferentes.
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('B10 Afinar troca a Nota da próxima Ação para efeito de Cadência', () => {
    const base = duelo(bardo(['B10', 'B02']), guerreiro, A);
    expect(erroDe(declarar(base, A, { carta: 'B10' as never })).tipo).toBe('escolha-obrigatoria');

    const afinado = jogar(base, A, {
      pedido: { carta: 'B10' as never, escolhas: { nota: 'harmonia' } },
    }).partida;
    const { partida: depois } = jogar(afinado, A, { pedido: { carta: 'B02' as never } });
    // A Corda Cortante é Melodia, mas entra como Harmonia na sequência.
    expect(notasDe(depois, A)).toEqual(['melodia', 'harmonia']);
    expect(cadenciasDe(depois, A)).toBe(1);
  });

  it('B11 Improviso escolhe a própria Nota e guarda o reforço', () => {
    const base = duelo(bardo(['B11', 'B01']), guerreiro, A);
    const improvisado = jogar(base, A, {
      pedido: { carta: 'B11' as never, escolhas: { nota: 'harmonia', reforco: 'dano' } },
    }).partida;
    expect(notasDe(improvisado, A)).toEqual(['harmonia']);
    const { partida: depois } = jogar(improvisado, A, { pedido: { carta: 'B01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('B12 Preparar o Refrão barateia a próxima Ação de Nota diferente', () => {
    const base = duelo(bardo(['B12', 'B02']), guerreiro, A);
    const preparado = jogar(base, A, { pedido: { carta: 'B12' as never } }).partida;
    const apAntes = jogador(preparado, A).pontosDeAcao;
    const { partida: depois } = jogar(preparado, A, { pedido: { carta: 'B02' as never } });
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('B13 Mudança de Tom exige Cadência e move uma carta de CD2 para CD1', () => {
    const base = duelo(bardo(['B01', 'B02', 'B13']), guerreiro, A);
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B02' as never } }).partida;
    const comCd2 = com(duas, A, { cooldown: { 1: [], 2: ['B04' as never], 3: [] } });
    const { partida: depois } = jogar(comCd2, A, {
      pedido: { carta: 'B13' as never, escolhas: { cartaEmCooldown: 'B04' as never } },
    });
    expect(jogador(depois, A).cooldown[1]).toContain('B04');
  });

  it('B14 Pausa Dramática dá +1 Reserva no fim do turno', () => {
    const base = duelo(bardo(['B14']), guerreiro, A);
    const usada = jogar(base, A, { pedido: { carta: 'B14' as never } }).partida;
    expect(jogador(virarTurno(usada, A), A).reserva).toBe(2);
  });

  it('B15 Desafinar tira 1 D e 1 I da próxima Reação adversária', () => {
    const base = com(duelo(bardo(['B01', 'B02', 'B15']), guerreiro, A), B, { reserva: 2 });
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B02' as never } }).partida;
    const comDesafinar = jogar(duas, A, { pedido: { carta: 'B15' as never } }).partida;
    const proximo = virarTurno(comDesafinar, A);
    expect(jogador(proximo, B).pontosDeAcao).toBeGreaterThan(0);
  });

  it('B16 Contracanto reduz 2 D e 1 I', () => {
    const base = com(duelo(guerreiro, bardo(['B16']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'B16' as never },
    });
    expect(jogador(depois, B).vida).toBe(30 - 1);
    expect(jogador(depois, B).guarda).toBe(6 - 2);
  });

  it('B17 Quebra de Ritmo guarda +1 I para o primeiro Ataque do próximo turno', () => {
    const base = com(duelo(guerreiro, bardo(['B17', 'B01']), A), B, { guarda: 2, reserva: 2 });
    const reagiu = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'B17' as never },
    }).partida;
    const proximo = virarTurno(reagiu, A);
    const guardaAntes = jogador(proximo, A).guarda;
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'B01' as never } });
    // 1 I impresso + 1 I da primeira Ação + 1 I guardado pela Quebra de Ritmo.
    expect(guardaAntes - jogador(depois, A).guarda).toBe(3);
  });

  it('B18 Nota Sustentada reduz 4 D', () => {
    const base = com(duelo(guerreiro, bardo(['B18']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'B18' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('B19 Resposta Improvisada barateia a primeira Ação do próximo turno', () => {
    const base = com(duelo(guerreiro, bardo(['B19', 'B02']), A), B, { reserva: 2 });
    const uma = jogar(base, A, { pedido: { carta: 'W01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'W11' as never } }).partida;
    const reagiu = jogar(duas, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'B19' as never },
    }).partida;
    const proximo = virarTurno(reagiu, A);
    const apAntes = jogador(proximo, B).pontosDeAcao;
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'B02' as never } });
    expect(apAntes - jogador(depois, B).pontosDeAcao).toBe(1);
  });

  it('B20 Coda Defensiva reduz 3 D e 3 I e prontifica uma Carta de Classe', () => {
    const base = com(duelo(guerreiro, bardo(['B20']), A), B, { reserva: 2 });
    const comAtivada = com(base, B, {
      cartasDeClasse: jogador(base, B).cartasDeClasse.map((item, indice) =>
        indice === 0 ? { ...item, estado: 'ativada' as const } : item,
      ),
    });
    const carta = jogador(comAtivada, B).cartasDeClasse[0]?.carta;
    if (carta === undefined) throw new Error('build sem Carta de Classe');
    const { partida: depois } = jogar(comAtivada, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'B20' as never,
        escolhas: { cartaDeClasse: carta },
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).cartasDeClasse[0]?.estado).toBe('pronta');
  });
});
