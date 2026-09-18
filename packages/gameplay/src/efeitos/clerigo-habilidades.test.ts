import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comDevocao,
  devocaoDe,
  duelo,
  erroDe,
  jogador,
  jogar,
  virarTurno,
} from '../teste-apoio.js';
import { declarar, responder } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Clérigo.
 *
 * "Requer Graça ou mais" é condição de uso e não custo: os testes colocam a
 * Devoção no estágio necessário e conferem que, um degrau abaixo, a jogada é
 * recusada com erro tipado em vez de resolver de qualquer jeito.
 */

const clerigo = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('clerigo', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W11', 'W15', 'W19', 'W02'] });

describe('Clérigo — habilidades', () => {
  it('C01 Golpe Consagrado recebe +1 I contra Guarda 3 ou menos', () => {
    const cheio = duelo(clerigo(['C01']), guerreiro, A);
    const semBonus = jogar(cheio, A, { pedido: { carta: 'C01' as never } });
    expect(jogador(semBonus.partida, B).guarda).toBe(6 - 1);

    const baixa = com(duelo(clerigo(['C01']), guerreiro, A), B, { guarda: 3 });
    const comBonus = jogar(baixa, A, { pedido: { carta: 'C01' as never } });
    expect(jogador(comBonus.partida, B).guarda).toBe(3 - 2);
  });

  it('C02 Martelo do Julgamento avança a Devoção quando o inimigo reage e ainda perde Vida', () => {
    const partida = duelo(clerigo(['C02']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, {
      pedido: { carta: 'C02' as never },
      // W19 Interposição reduz 1 D e 2 I: sobra Dano à Vida, que é o que o
      // texto do Martelo exige.
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    });
    // Sem Reação a Devoção ficaria em Vigília: aqui ela sobe por causa do texto.
    expect(devocaoDe(depois, A)).toBe('graca');
  });

  it('C02 não avança a Devoção quando o inimigo não usa carta de Reação', () => {
    const partida = duelo(clerigo(['C02']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'C02' as never } });
    expect(devocaoDe(depois, A)).toBe('vigilia');
  });

  it('C03 Luz Punitiva exige Graça e restaura 1 Vida contra Guarda já em 0', () => {
    const emVigilia = duelo(clerigo(['C03']), guerreiro, A);
    expect(erroDe(declarar(emVigilia, A, { carta: 'C03' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const pronto = com(comDevocao(duelo(clerigo(['C03']), guerreiro, A), A, 'graca'), B, {
      guarda: 0,
    });
    const ferido = com(pronto, A, { vida: 20 });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'C03' as never } });
    expect(jogador(depois, A).vida).toBe(21);
  });

  it('C04 Veredito Solar restaura 1 Vida ao causar Ruptura', () => {
    const base = comDevocao(duelo(clerigo(['C04']), guerreiro, A), A, 'graca');
    const partida = com(com(base, B, { guarda: 3 }), A, { vida: 20 });
    const { partida: depois, eventos } = jogar(partida, A, { pedido: { carta: 'C04' as never } });
    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(true);
    expect(jogador(depois, A).vida).toBe(21);
  });

  it('C05 Lança da Aurora recebe +2 D se você restaurou Vida neste turno', () => {
    const base = comDevocao(duelo(clerigo(['C09', 'C05']), guerreiro, A), A, 'graca');
    const ferido = com(base, A, { vida: 20 });
    const curou = jogar(ferido, A, { pedido: { carta: 'C09' as never } }).partida;
    const antes = jogador(curou, B).vida;
    const { partida: depois } = jogar(curou, A, { pedido: { carta: 'C05' as never } });
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('C05 sem cura no turno causa só o Dano impresso', () => {
    const base = comDevocao(duelo(clerigo(['C05']), guerreiro, A), A, 'graca');
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'C05' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('C06 Julgamento Maior exige Fervor, ganha +2 D na terceira Ação e desce um estágio', () => {
    const emGraca = comDevocao(duelo(clerigo(['C06']), guerreiro, A), A, 'graca');
    expect(erroDe(declarar(emGraca, A, { carta: 'C06' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const base = comDevocao(duelo(clerigo(['C01', 'C08', 'C06']), guerreiro, A), A, 'fervor');
    const comGuardaZero = com(base, B, { guarda: 0 });
    const uma = jogar(comGuardaZero, A, { pedido: { carta: 'C01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'C08' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'C06' as never } });
    // 5 D impressos + 2 D da terceira Ação contra Guarda 0.
    expect(antes - jogador(depois, B).vida).toBe(7);
    expect(devocaoDe(depois, A)).not.toBe('vigilia');
  });

  it('C06 desce um estágio de Devoção depois de resolver', () => {
    const base = comDevocao(duelo(clerigo(['C06']), guerreiro, A), A, 'fervor');
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'C06' as never } });
    // Guarda 6 contra 2 de Impacto não rompe, então não há avanço da mecânica:
    // sobra só a descida impressa no texto.
    expect(devocaoDe(depois, A)).toBe('graca');
  });

  it('C07 Cinzas do Pecado remove a Condição escolhida quando causa Dano', () => {
    const base = comDevocao(duelo(clerigo(['C07']), guerreiro, A), A, 'graca');
    const comQueimadura = com(base, A, {
      condicoes: { queimadura: 2, lento: 0, murchar: 0, sangramento: 0 },
    });
    const { partida: depois } = jogar(comQueimadura, A, {
      pedido: { carta: 'C07' as never, escolhas: { condicao: 'queimadura' } },
    });
    expect(jogador(depois, A).condicoes.queimadura).toBe(1);
  });

  it('C07 recusa a jogada quando há Condição e a escolha não veio', () => {
    const base = comDevocao(duelo(clerigo(['C07']), guerreiro, A), A, 'graca');
    const comQueimadura = com(base, A, {
      condicoes: { queimadura: 2, lento: 0, murchar: 0, sangramento: 0 },
    });
    expect(erroDe(declarar(comQueimadura, A, { carta: 'C07' as never })).tipo).toBe(
      'escolha-obrigatoria',
    );
  });

  it('C08 Oração Silenciosa avança 1 estágio de Devoção', () => {
    const partida = duelo(clerigo(['C08']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'C08' as never } });
    expect(devocaoDe(depois, A)).toBe('graca');
  });

  it('C09 Prece Restauradora restaura 3 Vida e exige Graça', () => {
    const emVigilia = duelo(clerigo(['C09']), guerreiro, A);
    expect(erroDe(declarar(emVigilia, A, { carta: 'C09' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const base = comDevocao(duelo(clerigo(['C09']), guerreiro, A), A, 'graca');
    const ferido = com(base, A, { vida: 20 });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'C09' as never } });
    expect(jogador(depois, A).vida).toBe(23);
  });

  it('C09 não restaura acima da Vida máxima', () => {
    const base = comDevocao(duelo(clerigo(['C09']), guerreiro, A), A, 'graca');
    const quaseCheio = com(base, A, { vida: 29 });
    const { partida: depois } = jogar(quaseCheio, A, { pedido: { carta: 'C09' as never } });
    expect(jogador(depois, A).vida).toBe(30);
  });

  it('C10 Imposição das Mãos só sai com 15 de Vida ou menos e restaura 5', () => {
    const base = comDevocao(duelo(clerigo(['C10']), guerreiro, A), A, 'fervor');
    expect(erroDe(declarar(base, A, { carta: 'C10' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const ferido = com(base, A, { vida: 12 });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'C10' as never } });
    expect(jogador(depois, A).vida).toBe(17);
    // Sobe pela cura e desce pelo texto: volta ao mesmo Fervor.
    expect(devocaoDe(depois, A)).toBe('fervor');
  });

  it('C11 Bênção da Coragem dá +1 D e +1 I ao próximo Ataque do turno', () => {
    const base = comDevocao(duelo(clerigo(['C11', 'C01']), guerreiro, A), A, 'graca');
    const abencoado = jogar(base, A, { pedido: { carta: 'C11' as never } }).partida;
    const { partida: depois } = jogar(abencoado, A, { pedido: { carta: 'C01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
    expect(jogador(depois, B).guarda).toBe(6 - 2);
  });

  it('C12 Vigília dá +1 Reserva no fim do turno e avança a Devoção com Reserva 2', () => {
    const partida = duelo(clerigo(['C12']), guerreiro, A);
    const usada = jogar(partida, A, { pedido: { carta: 'C12' as never } }).partida;
    const virada = virarTurno(usada, A);
    expect(jogador(virada, A).reserva).toBe(2);
    expect(devocaoDe(virada, A)).toBe('graca');
  });

  it('C13 Purificação restaura 2 Vida quando não há Condição alguma', () => {
    const base = comDevocao(duelo(clerigo(['C13']), guerreiro, A), A, 'graca');
    const ferido = com(base, A, { vida: 20 });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'C13' as never } });
    expect(jogador(depois, A).vida).toBe(22);
  });

  it('C13 remove a Condição escolhida quando há uma', () => {
    const base = comDevocao(duelo(clerigo(['C13']), guerreiro, A), A, 'graca');
    // Murchar em vez de Lento: Lento é consumido ao pagar o custo da Ação, e o
    // teste quer provar a remoção pelo texto da carta, não pelo custo.
    const comMurchar = com(com(base, A, { vida: 20 }), A, {
      condicoes: { queimadura: 0, lento: 0, murchar: 2, sangramento: 0 },
    });
    const { partida: depois } = jogar(comMurchar, A, {
      pedido: { carta: 'C13' as never, escolhas: { condicao: 'murchar' } },
    });
    expect(jogador(depois, A).condicoes.murchar).toBe(1);
    expect(jogador(depois, A).vida).toBe(20);
  });

  it('C14 Escudo da Fé reduz 2 D e 2 I e exige Graça', () => {
    const emVigilia = duelo(guerreiro, clerigo(['C14']), A);
    const declarada = declarar(emVigilia, A, { carta: 'W01' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const recusa = responder(declarada.valor.partida, B, 0, {
      tipo: 'carta-de-reacao',
      carta: 'C14' as never,
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const emGraca = comDevocao(duelo(guerreiro, clerigo(['C14']), A), B, 'graca');
    const { partida: depois } = jogar(emGraca, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C14' as never },
    });
    // W01 imprime 2 D / 1 I: o Escudo zera os dois.
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('C15 Âncora Sagrada reduz 3 I', () => {
    const emGraca = comDevocao(duelo(guerreiro, clerigo(['C15']), A), B, 'graca');
    const { partida: depois } = jogar(emGraca, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C15' as never },
    });
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('C16 Intercessão reduz 4 D, exige Fervor e desce um estágio', () => {
    const emFervor = comDevocao(duelo(guerreiro, clerigo(['C16']), A), B, 'fervor');
    const { partida: depois } = jogar(emFervor, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C16' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    // A mecânica sobe um estágio pela Resposta forte e o texto desce um.
    expect(devocaoDe(depois, B)).toBe('fervor');
  });

  it('C17 Martírio cobra 1 de Vida e avança a Devoção quando impede a Ruptura', () => {
    const base = duelo(guerreiro, clerigo(['C17']), A);
    const quaseRompido = com(base, B, { guarda: 2 });
    const { partida: depois } = jogar(quaseRompido, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C17' as never },
    });
    expect(jogador(depois, B).guarda).toBeGreaterThan(0);
    // O Martírio reduz Impacto, não Dano: os 3 D de W02 entram, e mais 1 de
    // Vida sai como preço impresso por ter impedido a Ruptura.
    expect(jogador(depois, B).vida).toBe(30 - 3 - 1);
    expect(devocaoDe(depois, B)).not.toBe('vigilia');
  });

  it('C18 Luz Refletida tira 2 de Vida do adversário quando zera o Dano', () => {
    const emFervor = comDevocao(duelo(guerreiro, clerigo(['C18']), A), B, 'fervor');
    const { partida: depois } = jogar(emFervor, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C18' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, A).vida).toBe(30 - 2);
  });

  it('C19 Absolvição impede as Condições que aquela ação aplicaria', () => {
    const magoComCondicao = build('mago', { habilidades: ['M03'] });
    const emGraca = comDevocao(duelo(magoComCondicao, clerigo(['C19']), A), B, 'graca');
    const { partida: depois } = jogar(emGraca, A, {
      pedido: { carta: 'M03' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C19' as never },
    });
    // M03 aplicaria Queimadura 2 ao causar Dano à Vida.
    expect(jogador(depois, B).condicoes.queimadura).toBe(0);
  });

  it('C20 Última Prece só sai com 10 de Vida ou menos, reduz 5 D e cura 1', () => {
    const emFervor = comDevocao(duelo(guerreiro, clerigo(['C20']), A), B, 'fervor');
    const declarada = declarar(emFervor, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    expect(
      erroDe(
        responder(declarada.valor.partida, B, 0, {
          tipo: 'carta-de-reacao',
          carta: 'C20' as never,
        }),
      ).tipo,
    ).toBe('condicao-de-uso-nao-satisfeita');

    const morrendo = com(emFervor, B, { vida: 8 });
    const { partida: depois } = jogar(morrendo, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C20' as never },
    });
    expect(jogador(depois, B).vida).toBe(9);
  });
});
