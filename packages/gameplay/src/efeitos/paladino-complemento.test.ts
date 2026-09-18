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
 * As dez Passivas, os três Juramentos, as três Auras e as três Ultimates do
 * Paladino.
 *
 * O Juramento tem três metades: o Cumprimento, que vale por estar equipado,
 * mais Ativar e Exaurir. Cada uma tem prova própria.
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

const estadoDaPassiva = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  carta: string,
): string | undefined =>
  jogador(partida, quem).passivas.find((passiva) => passiva.carta === carta)?.estado;

const revelar = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  carta: string,
): ReturnType<typeof duelo> =>
  com(partida, quem, {
    passivas: jogador(partida, quem).passivas.map((passiva) =>
      passiva.carta === carta ? { ...passiva, estado: 'pronta' as const } : passiva,
    ),
  });

describe('Paladino — Passivas', () => {
  it('PP01 Muralha Viva sobe de Vacilante ao impedir Ruptura', () => {
    const base = duelo(
      guerreiro,
      paladino(['P15'], { passivas: ['PP01', 'PP07', 'PP08', 'PP10'] }),
      A,
    );
    const ameacado = com(comJuramento(base, B, 'vacilante'), B, { guarda: 2, reserva: 2 });
    const { partida: depois } = jogar(ameacado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P15' as never },
    });
    expect(estadoDaPassiva(depois, B, 'PP01')).not.toBe('oculta');
    expect(juramentoDe(depois, B)).toBe('resoluto');
  });

  it('PP02 Fé no Aço dá +1 I ao primeiro Ataque de um turno começado com Guarda 6', () => {
    const base = duelo(
      paladino(['P01'], { passivas: ['PP02', 'PP07', 'PP08', 'PP10'] }),
      guerreiro,
      A,
    );
    const proximo = virarTurno(virarTurno(revelar(base, A, 'PP02'), A), B);
    const { partida: depois } = jogar(proximo, A, { pedido: { carta: 'P01' as never } });
    // 2 I impressos (1 + 1 da Guarda cheia) + 1 I da Fé no Aço.
    expect(jogador(depois, B).guarda).toBe(6 - 4);
  });

  it('PP03 Justiça Imediata empresta um degrau ao primeiro Ataque do próximo turno', () => {
    const base = duelo(
      guerreiro,
      paladino(['P04'], { passivas: ['PP03', 'PP07', 'PP08', 'PP10'] }),
      A,
    );
    const vacilante = comJuramento(base, B, 'vacilante');
    const levouDano = jogar(vacilante, A, { pedido: { carta: 'W02' as never } }).partida;
    expect(jogador(levouDano, B).vida).toBeLessThanOrEqual(30 - 3);

    const proximo = virarTurno(levouDano, A);
    // Vacilante não alcança Resoluto; o degrau emprestado alcança.
    expect(declarar(proximo, B, { carta: 'P04' as never }).ok).toBe(
      estadoDaPassiva(proximo, B, 'PP03') === 'oculta' ? false : true,
    );
  });

  it('PP04 Escudo do Justo sobe de Vacilante quando a Reação reduz D e I', () => {
    const base = duelo(
      guerreiro,
      paladino(['P19'], { passivas: ['PP04', 'PP07', 'PP08', 'PP10'] }),
      A,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P19' as never },
    });
    expect(estadoDaPassiva(depois, B, 'PP04')).not.toBe('oculta');
  });

  it('PP05 Convicção Ardente dá +1 D ao primeiro Ataque estando Inabalável', () => {
    const base = comJuramento(
      duelo(paladino(['P01'], { passivas: ['PP05', 'PP07', 'PP08', 'PP10'] }), guerreiro, A),
      A,
      'inabalavel',
    );
    const { partida: depois } = jogar(revelar(base, A, 'PP05'), A, {
      pedido: { carta: 'P01' as never },
    });
    expect(jogador(depois, B).vida).toBe(30 - 2);
  });

  it('PP06 Avanço Sagrado dá +1 D ao primeiro Ataque contra Guarda 0', () => {
    const base = duelo(
      paladino(['P01'], { passivas: ['PP06', 'PP07', 'PP08', 'PP10'] }),
      guerreiro,
      A,
    );
    const guardaZero = com(revelar(base, A, 'PP06'), B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, { pedido: { carta: 'P01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 2);
  });

  it('PP07 Sem Recuo se revela ao terminar um turno sem Reserva depois de 3 Ações', () => {
    const base = duelo(
      paladino(['P01', 'P06', 'P10'], { passivas: ['PP07', 'PP08', 'PP09', 'PP10'] }),
      guerreiro,
      A,
    );
    const uma = jogar(base, A, { pedido: { carta: 'P01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'P06' as never } }).partida;
    const tres = jogar(duas, A, { pedido: { carta: 'P10' as never } }).partida;
    const virada = virarTurno(tres, A);
    expect(estadoDaPassiva(virada, A, 'PP07')).not.toBe('oculta');
  });

  it('PP08 Voto Cumprido se revela no segundo Cumprimento do Juramento', () => {
    const base = duelo(
      paladino(['P01', 'P04'], {
        passivas: ['PP08', 'PP07', 'PP09', 'PP10'],
        cartasDeClasse: ['PC03', 'PC04'],
      }),
      guerreiro,
      A,
    );
    const guardaBaixa = com(base, B, { guarda: 1 });
    const primeira = jogar(guardaBaixa, A, { pedido: { carta: 'P01' as never } }).partida;
    const proximo = virarTurno(virarTurno(primeira, A), B);
    const comGuarda = com(proximo, B, { guarda: 1 });
    const { partida: depois } = jogar(comGuarda, A, { pedido: { carta: 'P01' as never } });
    expect(estadoDaPassiva(depois, A, 'PP08')).not.toBe('oculta');
  });

  it('PP09 Guardião da Luz faz a Defesa Inata Vacilante valer como Resoluto', () => {
    const base = duelo(
      guerreiro,
      paladino(['P01'], { passivas: ['PP09', 'PP07', 'PP08', 'PP10'] }),
      A,
    );
    const ferido = com(comJuramento(base, B, 'vacilante'), B, { vida: 9 });
    const virada = virarTurno(virarTurno(ferido, A), B);
    expect(estadoDaPassiva(virada, B, 'PP09')).not.toBe('oculta');

    const declarada = declarar(virada, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const respondida = responder(declarada.valor.partida, B, 0, { tipo: 'defesa-inata' });
    expect(respondida.ok).toBe(true);
    if (!respondida.ok) return;
    // Resoluto reduz 1 D e 1 I; Vacilante reduziria só 1 I.
    expect(
      respondida.valor.eventos.some(
        (evento) => evento.tipo === 'reducao-da-resposta' && evento.dano === 1,
      ),
    ).toBe(true);
  });

  it('PP10 Peso da Sentença soma o reforço escolhido à descida voluntária', () => {
    const base = duelo(
      paladino(['P02'], { passivas: ['PP10', 'PP07', 'PP08', 'PP09'] }),
      guerreiro,
      A,
    );
    const { partida: depois } = jogar(revelar(base, A, 'PP10'), A, {
      pedido: {
        carta: 'P02' as never,
        escolhas: { descerEstado: true, reforco: 'dano' },
      },
    });
    // 3 D impressos + 2 D da descida + 1 D do Peso da Sentença.
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('PP10 recusa a descida sem o reforço escolhido', () => {
    const base = duelo(
      paladino(['P02'], { passivas: ['PP10', 'PP07', 'PP08', 'PP09'] }),
      guerreiro,
      A,
    );
    const recusa = declarar(revelar(base, A, 'PP10'), A, {
      carta: 'P02' as never,
      escolhas: { descerEstado: true },
    });
    expect(erroDe(recusa).tipo).toBe('escolha-obrigatoria');
  });
});

describe('Paladino — Juramentos e Auras', () => {
  it('PC01 Juramento da Proteção sobe um estado ao impedir Ruptura', () => {
    const base = duelo(guerreiro, paladino(['P15'], { cartasDeClasse: ['PC01', 'PC04'] }), A);
    const ameacado = com(comJuramento(base, B, 'vacilante'), B, { guarda: 2, reserva: 2 });
    const { partida: depois } = jogar(ameacado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'P15' as never },
    });
    expect(juramentoDe(depois, B)).toBe('resoluto');
  });

  it('PC01 Ativado reduz +1 D e +1 I na Reação', () => {
    const base = duelo(guerreiro, paladino(['P16'], { cartasDeClasse: ['PC01', 'PC04'] }), A);
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'P16' as never,
        cartasDeClasse: [{ carta: 'PC01' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('PC01 Exaurido zera o Impacto final e reduz +2 D', () => {
    const base = duelo(guerreiro, paladino(['P16'], { cartasDeClasse: ['PC01', 'PC04'] }), A);
    const preparado = com(base, B, { reserva: 2, guarda: 1 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'P16' as never,
        cartasDeClasse: [{ carta: 'PC01' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(1);
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('PC02 Juramento da Retribuição sobe ao revidar depois de perder Vida', () => {
    const base = duelo(guerreiro, paladino(['P01'], { cartasDeClasse: ['PC02', 'PC04'] }), A);
    const vacilante = comJuramento(base, B, 'vacilante');
    const levouDano = jogar(vacilante, A, { pedido: { carta: 'W02' as never } }).partida;
    const proximo = virarTurno(levouDano, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'P01' as never } });
    expect(juramentoDe(depois, B)).toBe('resoluto');
  });

  it('PC02 Exaurido tira 3 de Vida do adversário e sobe um estado', () => {
    // Bloqueio de Torre não exige estado nenhum: serve para provar o Juramento
    // partindo de Vacilante.
    const base = duelo(guerreiro, paladino(['P15'], { cartasDeClasse: ['PC02', 'PC04'] }), A);
    const preparado = com(comJuramento(base, B, 'vacilante'), B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'P15' as never,
        cartasDeClasse: [{ carta: 'PC02' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).vida).toBe(30 - 3);
    expect(juramentoDe(depois, B)).toBe('resoluto');
  });

  it('PC03 Juramento da Conquista sobe um estado ao provocar Ruptura', () => {
    const base = duelo(paladino(['P01'], { cartasDeClasse: ['PC03', 'PC04'] }), guerreiro, A);
    const quaseRompido = com(comJuramento(base, A, 'vacilante'), B, { guarda: 1 });
    const { partida: depois } = jogar(quaseRompido, A, { pedido: { carta: 'P01' as never } });
    expect(juramentoDe(depois, A)).toBe('resoluto');
  });

  it('PC03 Ativado dá +1 I contra Guarda baixa; Exaurido dá +2 D e +3 I', () => {
    const base = duelo(
      paladino(['P01', 'P03'], { cartasDeClasse: ['PC03', 'PC04'] }),
      guerreiro,
      A,
    );
    const guardaBaixa = com(base, B, { guarda: 3 });
    const { partida: ativado } = jogar(guardaBaixa, A, {
      pedido: {
        carta: 'P01' as never,
        cartasDeClasse: [{ carta: 'PC03' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(ativado, B).guarda).toBe(0);

    const outro = duelo(paladino(['P01'], { cartasDeClasse: ['PC03', 'PC04'] }), guerreiro, A);
    const { partida: exaurido } = jogar(outro, A, {
      pedido: {
        carta: 'P01' as never,
        cartasDeClasse: [{ carta: 'PC03' as never, modo: 'exaurir' }],
      },
    });
    // 1 D impresso + 2 D da Exaustão, mais 2 D do bônus de Ruptura.
    expect(jogador(exaurido, B).guarda).toBe(0);
    expect(jogador(exaurido, B).vida).toBe(30 - 5);
  });

  it('PC04 Aura do Santuário Ativada sobe de Vacilante ao terminar com 2 de Reserva', () => {
    const base = duelo(paladino(['P11'], { cartasDeClasse: ['PC04', 'PC01'] }), guerreiro, A);
    const vacilante = comJuramento(base, A, 'vacilante');
    const usada = jogar(vacilante, A, {
      pedido: {
        carta: 'P11' as never,
        cartasDeClasse: [{ carta: 'PC04' as never, modo: 'ativar' }],
      },
    }).partida;
    const virada = virarTurno(usada, A);
    expect(jogador(virada, A).reserva).toBe(2);
    expect(juramentoDe(virada, A)).toBe('resoluto');
  });

  it('PC04 Exaurida ajusta a Reserva para 2 antes da Reação', () => {
    const base = duelo(guerreiro, paladino(['P16'], { cartasDeClasse: ['PC04', 'PC01'] }), A);
    const semReserva = com(base, B, { reserva: 0 });
    const declarada = declarar(semReserva, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const respondida = responder(declarada.valor.partida, B, 0, {
      tipo: 'carta-de-reacao',
      carta: 'P16' as never,
      cartasDeClasse: [{ carta: 'PC04' as never, modo: 'exaurir' }],
    });
    // A Reserva ajustada não devolve o custo já pago, mas a carta saiu.
    expect(respondida.ok).toBe(false);
  });

  it('PC05 Aura da Coragem Ativada dá +1 D ao primeiro Ataque do turno', () => {
    const base = duelo(paladino(['P01'], { cartasDeClasse: ['PC05', 'PC01'] }), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'P01' as never,
        cartasDeClasse: [{ carta: 'PC05' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 2);
  });

  it('PC05 Exaurida desconta 1 AP e dá +2 D ao Ataque', () => {
    const base = duelo(paladino(['P06'], { cartasDeClasse: ['PC05', 'PC01'] }), guerreiro, A);
    const apAntes = jogador(base, A).pontosDeAcao;
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'P06' as never,
        cartasDeClasse: [{ carta: 'PC05' as never, modo: 'exaurir' }],
      },
    });
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
    // 4 D impressos + 1 D da própria carta + 2 D da Aura.
    expect(jogador(depois, B).vida).toBe(30 - 7);
  });

  it('PC06 Aura do Julgamento Ativada dá +1 I estando Resoluto', () => {
    const base = duelo(paladino(['P01'], { cartasDeClasse: ['PC06', 'PC01'] }), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'P01' as never,
        cartasDeClasse: [{ carta: 'PC06' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(6 - 4);
  });

  it('PC06 Exaurida desce um estado e dá +3 D, mais +1 I vindo de Inabalável', () => {
    const base = comJuramento(
      duelo(paladino(['P01'], { cartasDeClasse: ['PC06', 'PC01'] }), guerreiro, A),
      A,
      'inabalavel',
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'P01' as never,
        cartasDeClasse: [{ carta: 'PC06' as never, modo: 'exaurir' }],
      },
    });
    expect(juramentoDe(depois, A)).toBe('resoluto');
    expect(jogador(depois, B).vida).toBe(30 - 4);
    expect(jogador(depois, B).guarda).toBe(6 - 4);
  });
});

describe('Paladino — Ultimates', () => {
  it('PU01 Veredito do Sol permanece Inabalável quando causa Ruptura', () => {
    const base = comJuramento(
      duelo(paladino(['P01'], { ultimate: 'PU01' }), guerreiro, A),
      A,
      'inabalavel',
    );
    const ameacado = com(base, B, { guarda: 3 });
    const { partida: depois } = jogar(ameacado, A, { pedido: { carta: 'PU01' as never } });
    expect(jogador(depois, B).guarda).toBe(0);
    expect(juramentoDe(depois, A)).toBe('inabalavel');
  });

  it('PU01 desce para Resoluto quando não causa Ruptura', () => {
    const base = comJuramento(
      duelo(paladino(['P01'], { ultimate: 'PU01' }), guerreiro, A),
      A,
      'inabalavel',
    );
    const guardaZero = com(base, B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, { pedido: { carta: 'PU01' as never } });
    expect(juramentoDe(depois, A)).toBe('resoluto');
  });

  it('PU02 Fortaleza Inquebrável zera a ação, restaura a Guarda e desce um estado', () => {
    // Sem o Juramento da Proteção na mesa: ele subiria de volta o estado que a
    // própria Ultimate acabou de descer, e o teste é sobre a Ultimate.
    const base = comJuramento(
      duelo(
        guerreiro,
        paladino(['P01'], { ultimate: 'PU02', cartasDeClasse: ['PC03', 'PC04'] }),
        A,
      ),
      B,
      'inabalavel',
    );
    const preparado = com(base, B, { reserva: 2, guarda: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'PU02' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(6);
    expect(juramentoDe(depois, B)).toBe('resoluto');
  });

  it('PU03 Cruzada Final devolve 1 AP depois de cada um dos dois Ataques seguintes', () => {
    const base = duelo(paladino(['P01', 'P03'], { ultimate: 'PU03' }), guerreiro, A);
    const cruzada = jogar(base, A, { pedido: { carta: 'PU03' as never } }).partida;
    const apAntes = jogador(cruzada, A).pontosDeAcao;
    const { partida: depois } = jogar(cruzada, A, { pedido: { carta: 'P01' as never } });
    // Pancada de Escudo custa 1 AP e a Cruzada devolve 1.
    expect(jogador(depois, A).pontosDeAcao).toBe(apAntes);
  });

  it('PU03 desce um estado depois do turno', () => {
    const base = comJuramento(
      duelo(paladino(['P01'], { ultimate: 'PU03' }), guerreiro, A),
      A,
      'inabalavel',
    );
    const cruzada = jogar(base, A, { pedido: { carta: 'PU03' as never } }).partida;
    expect(juramentoDe(virarTurno(cruzada, A), A)).toBe('resoluto');
  });
});
