import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  chiDe,
  com,
  comChi,
  duelo,
  erroDe,
  jogador,
  jogar,
  kataDe,
  virarTurno,
} from '../teste-apoio.js';
import { declarar } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Monge.
 *
 * As três pedras de Chi só viram de lado: nenhum teste vê pedra nascer ou
 * sumir. A etapa de Kata é impressa, e a sequência é montada jogando.
 */

const monge = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('monge', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

describe('Monge — habilidades', () => {
  it('MO01 Palma de Ferro recebe +1 I na primeira Ação e registra a Abertura', () => {
    const partida = duelo(monge(['MO01']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'MO01' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 2);
    expect(kataDe(depois, A)).toEqual(['abertura']);
  });

  it('MO02 Chute do Calcanhar recebe +1 I contra Guarda cheia', () => {
    const partida = duelo(monge(['MO02']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'MO02' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });

  it('MO03 Toque dos Nervos gasta 1 Chi e dá +1 D ao próximo Fluxo', () => {
    const base = duelo(monge(['MO03', 'MO04']), guerreiro, A);
    const abertura = jogar(base, A, { pedido: { carta: 'MO03' as never } }).partida;
    const antes = jogador(abertura, B).vida;
    const { partida: depois } = jogar(abertura, A, { pedido: { carta: 'MO04' as never } });
    // 2 D impressos + 1 D por vir depois de Abertura + 1 D do Toque.
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('MO04 Passo do Vento recebe +1 D depois de Abertura e dispara o Fluxo Interior', () => {
    const base = comChi(duelo(monge(['MO01', 'MO04']), guerreiro, A), A, 1);
    const abertura = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const antes = jogador(abertura, B).vida;
    const { partida: depois } = jogar(abertura, A, { pedido: { carta: 'MO04' as never } });
    expect(antes - jogador(depois, B).vida).toBe(3);
    // O Fluxo Interior devolve uma pedra Gasta.
    expect(chiDe(depois, A)).toBe(2);
  });

  it('MO05 Joelhada Ascendente recebe +1 I depois de Abertura', () => {
    const base = duelo(monge(['MO01', 'MO05']), guerreiro, A);
    const abertura = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const guardaAntes = jogador(abertura, B).guarda;
    const { partida: depois } = jogar(abertura, A, { pedido: { carta: 'MO05' as never } });
    expect(guardaAntes - jogador(depois, B).guarda).toBe(3);
  });

  it('MO06 Cotovelo Giratório recupera 1 Chi quando o inimigo reage', () => {
    const base = com(comChi(duelo(monge(['MO06']), guerreiro, A), A, 1), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'MO06' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    });
    // Gasta 1 Chi no custo e recupera 1 pelo texto.
    expect(chiDe(depois, A)).toBe(1);
  });

  it('MO07 Punho do Dragão recebe +1 D depois de Fluxo', () => {
    const base = comChi(duelo(monge(['MO01', 'MO04', 'MO07']), guerreiro, A), A, 3);
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'MO07' as never } });
    // 4 D impressos + 1 D por vir depois de Fluxo.
    expect(antes - jogador(depois, B).vida).toBeGreaterThanOrEqual(5);
  });

  it('MO08 Martelo Descendente recupera 1 Chi ao romper depois de Fluxo', () => {
    const base = comChi(duelo(monge(['MO01', 'MO04', 'MO08']), guerreiro, A), A, 0);
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const guardaBaixa = com(duas, B, { guarda: 1 });
    const chiAntes = chiDe(guardaBaixa, A);
    const { partida: depois } = jogar(guardaBaixa, A, { pedido: { carta: 'MO08' as never } });
    expect(chiDe(depois, A)).toBeGreaterThan(chiAntes);
  });

  it('MO09 Punho do Vazio recebe +2 D quando fecha o Kata', () => {
    const base = comChi(duelo(monge(['MO01', 'MO04', 'MO09']), guerreiro, A), A, 3);
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'MO09' as never } });
    // 4 D impressos + 2 D por completar o Kata.
    expect(antes - jogador(depois, B).vida).toBe(6);
    expect(kataDe(depois, A)).toEqual(['abertura', 'fluxo', 'finalizacao']);
  });

  it('MO10 Varredura Final guarda +1 D para o próximo turno ao fechar Kata com Ruptura', () => {
    const base = comChi(duelo(monge(['MO01', 'MO04', 'MO10']), guerreiro, A), A, 3);
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const guardaBaixa = com(duas, B, { guarda: 2 });
    const tres = jogar(guardaBaixa, A, { pedido: { carta: 'MO10' as never } }).partida;
    const proximo = virarTurno(virarTurno(tres, A), B);
    const antes = jogador(proximo, B).vida;
    const { partida: depois } = jogar(proximo, A, { pedido: { carta: 'MO01' as never } });
    // 2 D impressos + 1 D guardado pela Varredura Final.
    expect(antes - jogador(depois, B).vida).toBe(3);
  });

  it('MO11 Respiração Centrada recupera até 2 Chi Gastos', () => {
    const base = comChi(duelo(monge(['MO11']), guerreiro, A), A, 0);
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'MO11' as never } });
    expect(chiDe(depois, A)).toBe(2);
  });

  it('MO12 Passo sem Sombra barateia a próxima Finalização depois de Abertura', () => {
    const base = comChi(duelo(monge(['MO01', 'MO12', 'MO08']), guerreiro, A), A, 3);
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO12' as never } }).partida;
    const apAntes = jogador(duas, A).pontosDeAcao;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'MO08' as never } });
    // Martelo Descendente custa 3 AP; com o desconto, sai por 2.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });

  it('MO13 Quebrar o Ritmo dá +2 I ao próximo Ataque de Fluxo', () => {
    const base = duelo(monge(['MO13', 'MO04']), guerreiro, A);
    const uma = jogar(base, A, { pedido: { carta: 'MO13' as never } }).partida;
    const guardaAntes = jogador(uma, B).guarda;
    const { partida: depois } = jogar(uma, A, { pedido: { carta: 'MO04' as never } });
    // 1 I impresso + 2 I do Quebrar o Ritmo.
    expect(guardaAntes - jogador(depois, B).guarda).toBe(3);
  });

  it('MO14 Circular Energia dá +1 D e +1 I à próxima Finalização', () => {
    const base = comChi(duelo(monge(['MO14', 'MO08']), guerreiro, A), A, 3);
    const uma = jogar(base, A, { pedido: { carta: 'MO14' as never } }).partida;
    const antes = jogador(uma, B).vida;
    const { partida: depois } = jogar(uma, A, { pedido: { carta: 'MO08' as never } });
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('MO15 Selar o Kata só sai depois de Fluxo e devolve uma carta de CD1', () => {
    const base = comChi(duelo(monge(['MO01', 'MO04', 'MO15']), guerreiro, A), A, 3);
    expect(erroDe(declarar(base, A, { carta: 'MO15' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const { partida: depois } = jogar(duas, A, {
      pedido: { carta: 'MO15' as never, escolhas: { cartaEmCooldown: 'MO01' as never } },
    });
    expect(jogador(depois, A).mao).toContain('MO01');
  });

  it('MO16 Antebraço de Pedra recupera 1 Chi ao impedir Ruptura', () => {
    const base = com(comChi(duelo(guerreiro, monge(['MO16']), A), B, 0), B, {
      guarda: 2,
      reserva: 2,
    });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'MO16' as never },
    });
    expect(chiDe(depois, B)).toBe(1);
  });

  it('MO17 Desvio Lateral reduz 3 D', () => {
    const base = com(duelo(guerreiro, monge(['MO17']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'MO17' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('MO18 Redirecionar Força guarda +1 I para a próxima Abertura', () => {
    const base = com(comChi(duelo(guerreiro, monge(['MO18', 'MO01']), A), B, 3), B, {
      reserva: 2,
    });
    const reagiu = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'MO18' as never },
    }).partida;
    expect(jogador(reagiu, B).guarda).toBe(6);

    const proximo = virarTurno(reagiu, A);
    const guardaAntes = jogador(proximo, A).guarda;
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'MO01' as never } });
    // 1 I impresso + 1 I da primeira Ação + 1 I guardado.
    expect(guardaAntes - jogador(depois, A).guarda).toBe(3);
  });

  it('MO19 Contra-Golpe tira 2 de Vida do adversário quando zera o Dano', () => {
    const base = com(comChi(duelo(guerreiro, monge(['MO19']), A), B, 3), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'MO19' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, A).vida).toBe(30 - 2);
  });

  it('MO20 Corpo Vazio gasta 2 Chi e reduz 3 D e 3 I', () => {
    const base = com(comChi(duelo(guerreiro, monge(['MO20']), A), B, 3), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'MO20' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(6);
    expect(chiDe(depois, B)).toBe(1);
  });
});
