import { describe, expect, it } from 'vitest';

import { A, B, build, com, duelo, erroDe, jogador, jogar, virarTurno } from '../teste-apoio.js';
import { declarar, responder } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Bárbaro.
 *
 * Reduzir a própria Guarda é sempre escolha: sem `guardaReduzida` na jogada, a
 * Guarda fica onde está e o bônus não entra. E reduzir a própria Guarda nunca
 * provoca Ruptura.
 */

const barbaro = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('barbaro', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

describe('Bárbaro — habilidades', () => {
  it('BA01 Machado Curto recebe +1 D enquanto Enfurecido', () => {
    const contido = duelo(barbaro(['BA01']), guerreiro, A);
    const semBonus = jogar(contido, A, { pedido: { carta: 'BA01' as never } });
    expect(jogador(semBonus.partida, B).vida).toBe(30 - 2);

    const enfurecido = com(duelo(barbaro(['BA01']), guerreiro, A), A, { guarda: 2 });
    const comBonus = jogar(enfurecido, A, { pedido: { carta: 'BA01' as never } });
    expect(jogador(comBonus.partida, B).vida).toBe(30 - 3);
  });

  it('BA02 Ombro Selvagem troca 1 de Guarda por +1 I, e só com a escolha', () => {
    const base = duelo(barbaro(['BA02']), guerreiro, A);
    const semTroca = jogar(base, A, { pedido: { carta: 'BA02' as never } });
    expect(jogador(semTroca.partida, A).guarda).toBe(6);
    expect(jogador(semTroca.partida, B).guarda).toBe(6 - 2);

    const { partida: depois } = jogar(duelo(barbaro(['BA02']), guerreiro, A), A, {
      pedido: { carta: 'BA02' as never, escolhas: { guardaReduzida: 1 } },
    });
    expect(jogador(depois, A).guarda).toBe(5);
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });

  it('BA03 Golpe Temerário troca 2 de Guarda por +2 D', () => {
    const base = duelo(barbaro(['BA03']), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'BA03' as never, escolhas: { guardaReduzida: 2 } },
    });
    expect(jogador(depois, A).guarda).toBe(4);
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('BA04 Investida Bestial recebe +1 I fora de Contido', () => {
    const base = com(duelo(barbaro(['BA04']), guerreiro, A), A, { guarda: 3 });
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'BA04' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 4);
  });

  it('BA05 Quebra-Crânio recebe +2 D enquanto Desencadeado', () => {
    const base = com(duelo(barbaro(['BA05']), guerreiro, A), A, { guarda: 0 });
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'BA05' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 7);
  });

  it('BA06 Corte em Frenesi recebe +2 D depois de um Ataque, fora de Contido', () => {
    const base = com(duelo(barbaro(['BA01', 'BA06']), guerreiro, A), A, { guarda: 2 });
    const primeira = jogar(base, A, { pedido: { carta: 'BA01' as never } }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'BA06' as never } });
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('BA07 Machado Arremessado causa os valores impressos sem tocar na Guarda', () => {
    const base = duelo(barbaro(['BA07']), guerreiro, A);
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'BA07' as never } });
    expect(jogador(depois, A).guarda).toBe(6);
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('BA08 Golpe de Sangue recebe +2 D com 15 de Vida ou menos', () => {
    const base = com(duelo(barbaro(['BA08']), guerreiro, A), A, { vida: 14 });
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'BA08' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 5);
  });

  it('BA09 Martelo da Fera troca 2 de Guarda por +1 D e +1 I', () => {
    const base = duelo(barbaro(['BA09']), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'BA09' as never, escolhas: { guardaReduzida: 2 } },
    });
    expect(jogador(depois, A).guarda).toBe(4);
    // 4 I impressos + 1 I da troca contra Guarda 6.
    expect(jogador(depois, B).guarda).toBe(1);
  });

  it('BA10 Fúria Final só sai Desencadeado e soma +1 D por Ataque anterior', () => {
    const base = duelo(barbaro(['BA10', 'BA01']), guerreiro, A);
    expect(erroDe(declarar(base, A, { carta: 'BA10' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const desencadeado = com(duelo(barbaro(['BA01', 'BA10']), guerreiro, A), A, { guarda: 0 });
    const primeira = jogar(desencadeado, A, { pedido: { carta: 'BA01' as never } }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'BA10' as never } });
    // 6 D impressos + 1 D pelo Ataque anterior.
    expect(antes - jogador(depois, B).vida).toBe(7);
  });

  it('BA11 Rugido de Guerra dá +1 D e +1 I, e +1 D adicional fora de Contido', () => {
    const base = com(duelo(barbaro(['BA11', 'BA07']), guerreiro, A), A, { guarda: 2 });
    const rugiu = jogar(base, A, { pedido: { carta: 'BA11' as never } }).partida;
    const { partida: depois } = jogar(rugiu, A, { pedido: { carta: 'BA07' as never } });
    // 4 D impressos + 2 D do Rugido.
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('BA12 Quebrar Limites reduz 2 de Guarda e barateia o próximo Ataque', () => {
    const base = duelo(barbaro(['BA12', 'BA05']), guerreiro, A);
    const quebrou = jogar(base, A, { pedido: { carta: 'BA12' as never } }).partida;
    expect(jogador(quebrou, A).guarda).toBe(4);
    const apAntes = jogador(quebrou, A).pontosDeAcao;
    const { partida: depois } = jogar(quebrou, A, { pedido: { carta: 'BA05' as never } });
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });

  it('BA13 Frenesi dá +1 D e cobra 1 de Guarda depois de cada Ataque', () => {
    const base = duelo(barbaro(['BA13', 'BA07']), guerreiro, A);
    const frenesi = jogar(base, A, { pedido: { carta: 'BA13' as never } }).partida;
    const { partida: depois } = jogar(frenesi, A, { pedido: { carta: 'BA07' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 5);
    expect(jogador(depois, A).guarda).toBe(5);
  });

  it('BA14 Desafiar a Dor só sai ferido e tranca a restauração de Guarda', () => {
    const saudavel = duelo(barbaro(['BA14']), guerreiro, A);
    expect(erroDe(declarar(saudavel, A, { carta: 'BA14' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const ferido = com(duelo(barbaro(['BA14', 'BA07']), guerreiro, A), A, { vida: 12 });
    const desafiou = jogar(ferido, A, { pedido: { carta: 'BA14' as never } }).partida;
    const { partida: depois } = jogar(desafiou, A, { pedido: { carta: 'BA07' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('BA15 Grito Ameaçador tira 1 D e 1 I da próxima Reação inimiga', () => {
    const base = com(duelo(barbaro(['BA15', 'BA07']), guerreiro, A), B, { reserva: 2 });
    const gritou = jogar(base, A, { pedido: { carta: 'BA15' as never } }).partida;
    const { partida: depois } = jogar(gritou, A, {
      pedido: { carta: 'BA07' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    // Aparar reduz 3 D; o Grito devolve 1, então passa 2 de Dano.
    expect(jogador(depois, B).vida).toBe(30 - 2);
  });

  it('BA16 Pele Grossa reduz 3 D', () => {
    const base = com(duelo(guerreiro, barbaro(['BA16']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'BA16' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('BA17 Aparar com o Machado guarda +1 I para o próximo turno ao impedir Ruptura', () => {
    const base = com(duelo(guerreiro, barbaro(['BA17', 'BA07']), A), B, {
      guarda: 2,
      reserva: 2,
    });
    const impediu = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'BA17' as never },
    }).partida;
    const proximo = virarTurno(impediu, A);
    const guardaAntes = jogador(proximo, A).guarda;
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'BA07' as never } });
    // Machado Arremessado tem 0 I impresso; o +1 I guardado é tudo.
    expect(guardaAntes - jogador(depois, A).guarda).toBe(1);
  });

  it('BA18 Aceitar o Golpe troca Guarda por Dano no próximo turno', () => {
    const base = com(duelo(guerreiro, barbaro(['BA18', 'BA07']), A), B, { reserva: 2 });
    const aceitou = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'BA18' as never,
        escolhas: { guardaReduzida: 2 },
      },
    }).partida;
    const proximo = virarTurno(aceitou, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'BA07' as never } });
    // 4 D impressos + 2 D pelos dois pontos de Guarda entregues.
    expect(jogador(depois, A).vida).toBe(30 - 6);
  });

  it('BA19 Rugido de Retaliação guarda +1 D quando ainda passa Dano', () => {
    const base = com(duelo(guerreiro, barbaro(['BA19', 'BA07']), A), B, { reserva: 2 });
    const reagiu = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'BA19' as never },
    }).partida;
    const proximo = virarTurno(reagiu, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'BA07' as never } });
    expect(jogador(depois, A).vida).toBe(30 - 5);
  });

  it('BA20 Último Fôlego só sai contra Ataque letal e zera a Guarda', () => {
    const base = com(duelo(guerreiro, barbaro(['BA20']), A), B, { reserva: 2 });
    const declarada = declarar(base, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    expect(
      erroDe(
        responder(declarada.valor.partida, B, 0, {
          tipo: 'carta-de-reacao',
          carta: 'BA20' as never,
        }),
      ).tipo,
    ).toBe('condicao-de-uso-nao-satisfeita');

    const morrendo = com(base, B, { vida: 3, reserva: 2 });
    const { partida: depois } = jogar(morrendo, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'BA20' as never },
    });
    expect(jogador(depois, B).vida).toBe(3);
    expect(jogador(depois, B).guarda).toBe(0);
  });
});
