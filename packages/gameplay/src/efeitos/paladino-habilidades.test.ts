import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comJuramento,
  duelo,
  erroDe,
  jogador,
  jogar,
  juramentoDe,
  virarTurno,
} from '../teste-apoio.js';
import { declarar, responder } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Paladino.
 *
 * A Convicção é estado: os testes colocam o Paladino no estado exigido e
 * conferem que, um degrau abaixo, a jogada é recusada com erro tipado. Quando
 * a carta oferece a troca "desça 1 estado para ganhar poder", os testes provam
 * os dois caminhos — com a escolha e sem ela.
 */

const paladino = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('paladino', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

describe('Paladino — habilidades', () => {
  it('P01 Pancada de Escudo recebe +1 I com a Guarda cheia', () => {
    const cheia = duelo(paladino(['P01']), guerreiro, A);
    const { partida: comBonus } = jogar(cheia, A, { pedido: { carta: 'P01' as never } });
    expect(jogador(comBonus, B).guarda).toBe(6 - 3);

    const gasta = com(duelo(paladino(['P01']), guerreiro, A), A, { guarda: 4 });
    const { partida: semBonus } = jogar(gasta, A, { pedido: { carta: 'P01' as never } });
    expect(jogador(semBonus, B).guarda).toBe(6 - 2);
  });

  it('P02 Corte Radiante troca um estado por +2 D quando o jogador escolhe', () => {
    const base = duelo(paladino(['P02']), guerreiro, A);
    const { partida: semTroca } = jogar(base, A, { pedido: { carta: 'P02' as never } });
    expect(jogador(semTroca, B).vida).toBe(30 - 3);
    expect(juramentoDe(semTroca, A)).toBe('resoluto');

    const { partida: comTroca } = jogar(duelo(paladino(['P02']), guerreiro, A), A, {
      pedido: { carta: 'P02' as never, escolhas: { descerEstado: true } },
    });
    expect(jogador(comTroca, B).vida).toBe(30 - 5);
    expect(juramentoDe(comTroca, A)).toBe('vacilante');
  });

  it('P03 Martelo do Juramento recebe +1 D se o turno começou com 2 de Reserva', () => {
    const base = duelo(paladino(['P03', 'P11']), guerreiro, A);
    const semReserva = jogar(base, A, { pedido: { carta: 'P03' as never } });
    expect(jogador(semReserva.partida, B).vida).toBe(30 - 2);

    const comReserva = com(duelo(paladino(['P03']), guerreiro, A), A, { reserva: 2 });
    const proximo = virarTurno(virarTurno(comReserva, A), B);
    const { partida: depois } = jogar(proximo, A, { pedido: { carta: 'P03' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('P04 Golpe Consagrado exige Resoluto e cumpre o Juramento na Ruptura', () => {
    const vacilante = comJuramento(duelo(paladino(['P04']), guerreiro, A), A, 'vacilante');
    expect(erroDe(declarar(vacilante, A, { carta: 'P04' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const base = com(
      duelo(paladino(['P04'], { cartasDeClasse: ['PC03', 'PC04'] }), guerreiro, A),
      B,
      {
        guarda: 2,
      },
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'P04' as never } });
    expect(juramentoDe(depois, A)).toBe('inabalavel');
  });

  it('P05 Reprimenda recebe +2 D se o adversário já reagiu neste turno', () => {
    const base = duelo(paladino(['P01', 'P05']), guerreiro, A);
    const comReacao = com(base, B, { reserva: 2 });
    const primeira = jogar(comReacao, A, {
      pedido: { carta: 'P01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'P05' as never } });
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('P06 Investida do Bastião recebe +1 D com Guarda 4 ou mais', () => {
    const base = duelo(paladino(['P06']), guerreiro, A);
    const { partida: comBonus } = jogar(base, A, { pedido: { carta: 'P06' as never } });
    // 4 D impressos + 1 D pela própria Guarda em 4 ou mais.
    expect(jogador(comBonus, B).vida).toBe(30 - 5);

    const fraco = com(duelo(paladino(['P06']), guerreiro, A), A, { guarda: 3 });
    const { partida: semBonus } = jogar(fraco, A, { pedido: { carta: 'P06' as never } });
    expect(jogador(semBonus, B).vida).toBe(30 - 4);
  });

  it('P07 Sentença Sagrada exige Inabalável e paga um estado por +2 D', () => {
    const base = comJuramento(duelo(paladino(['P07']), guerreiro, A), A, 'inabalavel');
    const guardaZero = com(base, B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, {
      pedido: { carta: 'P07' as never, escolhas: { descerEstado: true } },
    });
    expect(jogador(depois, B).vida).toBe(30 - 7);
    expect(juramentoDe(depois, A)).toBe('resoluto');
  });

  it('P08 Golpe de Retaliação recebe +1 D e +1 I depois de ter reagido', () => {
    const base = duelo(guerreiro, paladino(['P08', 'P16']), A);
    const preparado = com(base, B, { reserva: 2 });
    const reagiu = jogar(preparado, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P16' as never },
    }).partida;
    const proximo = virarTurno(reagiu, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'P08' as never } });
    expect(jogador(depois, A).vida).toBe(30 - 4);
    expect(jogador(depois, A).guarda).toBe(6 - 2);
  });

  it('P09 Romper a Linha troca Inabalável por +1 D', () => {
    const base = comJuramento(duelo(paladino(['P09']), guerreiro, A), A, 'inabalavel');
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'P09' as never, escolhas: { descerEstado: true } },
    });
    // 2 D impressos + 1 D pela descida voluntária.
    expect(jogador(depois, B).vida).toBe(30 - 3);
    expect(juramentoDe(depois, A)).toBe('resoluto');
  });

  it('P10 Lâmina da Aurora recebe +2 D na terceira Ação estando Resoluto', () => {
    const base = duelo(paladino(['P01', 'P11', 'P10']), guerreiro, A);
    const uma = jogar(base, A, { pedido: { carta: 'P01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'P11' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'P10' as never } });
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('P11 Preparar o Bastião dá +1 Reserva no fim do turno', () => {
    const base = duelo(paladino(['P11']), guerreiro, A);
    const usada = jogar(base, A, { pedido: { carta: 'P11' as never } }).partida;
    expect(jogador(virarTurno(usada, A), A).reserva).toBe(2);
  });

  it('P12 Consagrar Arma dá +1 D e +2 I ao próximo Ataque', () => {
    const base = duelo(paladino(['P12', 'P01']), guerreiro, A);
    const preparado = jogar(base, A, { pedido: { carta: 'P12' as never } }).partida;
    const { partida: depois } = jogar(preparado, A, { pedido: { carta: 'P01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 2);
    expect(jogador(depois, B).guarda).toBe(6 - 5);
  });

  it('P13 Renovar o Juramento sobe um estado e tranca as Técnicas do turno', () => {
    const base = comJuramento(duelo(paladino(['P13', 'P11']), guerreiro, A), A, 'resoluto');
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'P13' as never } });
    expect(juramentoDe(depois, A)).toBe('inabalavel');
    expect(erroDe(declarar(depois, A, { carta: 'P11' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );
  });

  it('P14 Marcha Implacável desconta 1 AP do próximo Ataque de 2 AP ou mais', () => {
    const base = duelo(paladino(['P14', 'P06']), guerreiro, A);
    const preparado = jogar(base, A, { pedido: { carta: 'P14' as never } }).partida;
    const apAntes = jogador(preparado, A).pontosDeAcao;
    const { partida: depois } = jogar(preparado, A, { pedido: { carta: 'P06' as never } });
    // Investida do Bastião custa 3 AP; com a Marcha, sai por 2.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });

  it('P15 Bloqueio de Torre cumpre o Juramento da Proteção ao impedir Ruptura', () => {
    const base = duelo(guerreiro, paladino(['P15'], { cartasDeClasse: ['PC01', 'PC04'] }), A);
    const quaseRompido = com(comJuramento(base, B, 'vacilante'), B, { guarda: 2, reserva: 2 });
    const { partida: depois } = jogar(quaseRompido, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P15' as never },
    });
    expect(juramentoDe(depois, B)).not.toBe('vacilante');
  });

  it('P16 Égide Sagrada reduz 2 D e 2 I e exige Resoluto', () => {
    const vacilante = comJuramento(duelo(guerreiro, paladino(['P16']), A), B, 'vacilante');
    const declarada = declarar(vacilante, A, { carta: 'W01' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    expect(
      erroDe(
        responder(declarada.valor.partida, B, 0, {
          tipo: 'carta-de-reacao',
          carta: 'P16' as never,
        }),
      ).tipo,
    ).toBe('condicao-de-uso-nao-satisfeita');

    const base = com(duelo(guerreiro, paladino(['P16']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P16' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('P17 Repreensão Divina tira 2 de Vida do adversário quando zera o Dano', () => {
    const base = com(duelo(guerreiro, paladino(['P17']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P17' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, A).vida).toBe(30 - 2);
  });

  it('P18 Permanecer de Pé só sai contra um Ataque que causaria Ruptura', () => {
    const base = com(duelo(guerreiro, paladino(['P18']), A), B, { reserva: 2 });
    const declarada = declarar(base, A, { carta: 'W01' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    expect(
      erroDe(
        responder(declarada.valor.partida, B, 0, {
          tipo: 'carta-de-reacao',
          carta: 'P18' as never,
        }),
      ).tipo,
    ).toBe('condicao-de-uso-nao-satisfeita');

    const ameacado = com(base, B, { guarda: 2, reserva: 2 });
    const { partida: depois } = jogar(ameacado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P18' as never },
    });
    expect(jogador(depois, B).guarda).toBe(2);
  });

  it('P19 Escudo e Espada guarda +1 D para o primeiro Ataque do próximo turno', () => {
    const base = com(duelo(guerreiro, paladino(['P19', 'P01']), A), B, { reserva: 2 });
    const reagiu = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P19' as never },
    }).partida;
    expect(jogador(reagiu, B).vida).toBeLessThan(30);

    const proximo = virarTurno(reagiu, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'P01' as never } });
    // 1 D impresso + 1 D guardado pelo Escudo e Espada.
    expect(jogador(depois, A).vida).toBe(30 - 2);
  });

  it('P20 Não Passará exige Inabalável, reduz 3 D e 3 I e desce para Resoluto', () => {
    const base = comJuramento(duelo(guerreiro, paladino(['P20']), A), B, 'inabalavel');
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P20' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(6);
    expect(juramentoDe(depois, B)).toBe('resoluto');
  });
});
