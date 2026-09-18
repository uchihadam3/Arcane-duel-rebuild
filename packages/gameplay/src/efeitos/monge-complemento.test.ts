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
import { ativarPassivaNaAcao, declarar, resolver } from '../partida.js';

/*
 * As dez Passivas, as três Posturas, os três Mantras e as três Ultimates do
 * Monge.
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

describe('Monge — Passivas', () => {
  it('MOP01 Disciplina Perfeita recupera 1 Chi adicional ao completar o Kata', () => {
    const base = comChi(
      revelar(
        duelo(
          monge(['MO01', 'MO04', 'MO08'], { passivas: ['MOP01', 'MOP05', 'MOP08', 'MOP09'] }),
          guerreiro,
          A,
        ),
        A,
        'MOP01',
      ),
      A,
      0,
    );
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const { partida: tres } = jogar(duas, A, { pedido: { carta: 'MO08' as never } });
    expect(kataDe(tres, A)).toEqual(['abertura', 'fluxo', 'finalizacao']);
    // Fluxo Interior (1) + Kata (1) + Disciplina Perfeita (1).
    expect(chiDe(tres, A)).toBe(3);
  });

  it('MOP02 Primeiro Passo dá +1 I à primeira Abertura do turno', () => {
    const base = revelar(
      duelo(monge(['MO01'], { passivas: ['MOP02', 'MOP05', 'MOP08', 'MOP09'] }), guerreiro, A),
      A,
      'MOP02',
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'MO01' as never } });
    // 1 I impresso + 1 I da primeira Ação + 1 I do Primeiro Passo.
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });

  it('MOP03 Fluxo Contínuo exige o reforço no primeiro Fluxo depois de Abertura', () => {
    const base = comChi(
      revelar(
        duelo(
          monge(['MO01', 'MO04'], { passivas: ['MOP03', 'MOP05', 'MOP08', 'MOP09'] }),
          guerreiro,
          A,
        ),
        A,
        'MOP03',
      ),
      A,
      3,
    );
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    expect(erroDe(declarar(uma, A, { carta: 'MO04' as never })).tipo).toBe('escolha-obrigatoria');

    const antes = jogador(uma, B).vida;
    const { partida: depois } = jogar(uma, A, {
      pedido: { carta: 'MO04' as never, escolhas: { reforco: 'dano' } },
    });
    // 2 D impressos + 1 D depois de Abertura + 1 D do Fluxo Contínuo.
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('MOP04 Golpe Derradeiro dá +1 D à primeira Finalização depois de Fluxo', () => {
    const base = comChi(
      revelar(
        duelo(
          monge(['MO01', 'MO04', 'MO08'], { passivas: ['MOP04', 'MOP05', 'MOP08', 'MOP09'] }),
          guerreiro,
          A,
        ),
        A,
        'MOP04',
      ),
      A,
      3,
    );
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'MO08' as never } });
    // 5 D impressos + 1 D do Golpe Derradeiro.
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('MOP05 Mente Imóvel barateia em 1 Chi a primeira Reação do turno inimigo', () => {
    const base = comChi(
      revelar(
        duelo(guerreiro, monge(['MO18'], { passivas: ['MOP05', 'MOP08', 'MOP09', 'MOP10'] }), A),
        B,
        'MOP05',
      ),
      B,
      0,
    );
    const preparado = com(base, B, { reserva: 2 });
    const declarada = declarar(preparado, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    // Sem Chi Pronto, a Redirecionar Força só sai por causa do desconto.
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'MO18' as never },
    });
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('MOP06 Dor como Mestre recupera até 2 Chi ao levar 4 ou mais de Vida', () => {
    const base = comChi(
      duelo(guerreiro, monge(['MO01'], { passivas: ['MOP06', 'MOP05', 'MOP08', 'MOP09'] }), A),
      B,
      0,
    );
    // Ombro de Guerra rompendo a Guarda: 3 D impressos mais 2 do bônus de
    // Ruptura passam dos 4 que a Passiva pede.
    const ameacado = com(base, B, { guarda: 2 });
    const { partida: depois } = jogar(ameacado, A, { pedido: { carta: 'W02' as never } });
    expect(estadoDaPassiva(depois, B, 'MOP06')).not.toBe('oculta');
    expect(chiDe(depois, B)).toBeGreaterThan(0);
  });

  it('MOP07 Respiração Profunda devolve Chi ao começar o turno sem nenhuma pedra', () => {
    const base = comChi(
      duelo(monge(['MO01'], { passivas: ['MOP07', 'MOP05', 'MOP08', 'MOP09'] }), guerreiro, A),
      A,
      0,
    );
    const virada = virarTurno(virarTurno(base, A), B);
    expect(estadoDaPassiva(virada, A, 'MOP07')).not.toBe('oculta');
    expect(chiDe(virada, A)).toBeGreaterThan(0);
  });

  it('MOP08 Forma Adaptável Ativa gastando o limite de uma vez por turno', () => {
    const base = comChi(
      revelar(
        duelo(monge(['MO01'], { passivas: ['MOP08', 'MOP05', 'MOP09', 'MOP10'] }), guerreiro, A),
        A,
        'MOP08',
      ),
      A,
      3,
    );
    const declarada = declarar(base, A, { carta: 'MO01' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const ativada = ativarPassivaNaAcao(declarada.valor.partida, A, 0, 'MOP08' as never);
    expect(ativada.ok).toBe(true);
    if (!ativada.ok) return;
    expect(resolver(ativada.valor.partida, A, 0).ok).toBe(true);
  });

  it('MOP09 Corpo e Espírito recupera Chi e Guarda quando a Reação zera tudo', () => {
    const base = comChi(
      revelar(
        duelo(guerreiro, monge(['MO16'], { passivas: ['MOP09', 'MOP05', 'MOP08', 'MOP10'] }), A),
        B,
        'MOP09',
      ),
      B,
      0,
    );
    const preparado = com(base, B, { guarda: 1, reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'MO16' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(chiDe(depois, B)).toBeGreaterThan(0);
  });

  it('MOP10 Último Mestre barateia em 1 Chi a primeira Finalização do turno', () => {
    const base = comChi(
      duelo(monge(['MO07'], { passivas: ['MOP10', 'MOP05', 'MOP08', 'MOP09'] }), guerreiro, A),
      A,
      0,
    );
    const ferido = com(base, A, { vida: 9 });
    const virada = virarTurno(virarTurno(ferido, A), B);
    expect(estadoDaPassiva(virada, A, 'MOP10')).not.toBe('oculta');

    const semChi = comChi(virada, A, 0);
    // Punho do Dragão custa 1 Chi; com o desconto, sai sem nenhum.
    expect(declarar(semChi, A, { carta: 'MO07' as never }).ok).toBe(true);
  });
});

describe('Monge — Posturas e Mantras', () => {
  it('MOC01 Postura do Tigre Ativada dá +1 D à Finalização depois de Fluxo', () => {
    const base = comChi(
      duelo(monge(['MO01', 'MO04', 'MO08'], { cartasDeClasse: ['MOC01', 'MOC04'] }), guerreiro, A),
      A,
      3,
    );
    const recusa = declarar(base, A, {
      carta: 'MO01' as never,
      cartasDeClasse: [{ carta: 'MOC01' as never, modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: {
        carta: 'MO08' as never,
        cartasDeClasse: [{ carta: 'MOC01' as never, modo: 'ativar' }],
      },
    });
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('MOC01 Exaurida dá +3 D e +1 I nas mesmas condições', () => {
    const base = comChi(
      duelo(monge(['MO01', 'MO04', 'MO08'], { cartasDeClasse: ['MOC01', 'MOC04'] }), guerreiro, A),
      A,
      3,
    );
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: {
        carta: 'MO08' as never,
        cartasDeClasse: [{ carta: 'MOC01' as never, modo: 'exaurir' }],
      },
    });
    expect(antes - jogador(depois, B).vida).toBeGreaterThanOrEqual(8);
  });

  it('MOC02 Postura da Garça Ativada recupera Chi quando a Reação zera o Dano', () => {
    const base = comChi(
      duelo(guerreiro, monge(['MO17'], { cartasDeClasse: ['MOC02', 'MOC04'] }), A),
      B,
      0,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'MO17' as never,
        cartasDeClasse: [{ carta: 'MOC02' as never, modo: 'ativar' }],
      },
    });
    expect(chiDe(depois, B)).toBe(1);
  });

  it('MOC02 Exaurida reduz +3 D e +2 I', () => {
    const base = comChi(
      duelo(guerreiro, monge(['MO17'], { cartasDeClasse: ['MOC02', 'MOC04'] }), A),
      B,
      0,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'MO17' as never,
        cartasDeClasse: [{ carta: 'MOC02' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
    // Ombro de Guerra chega com 3 de Impacto na primeira Ação; a Postura
    // reduz 2 e sobra 1.
    expect(jogador(depois, B).guarda).toBe(5);
  });

  it('MOC03 Postura do Rio Exaurida escolhe a etapa e dá +1 D e +1 I', () => {
    const base = comChi(
      duelo(monge(['MO01', 'MO04'], { cartasDeClasse: ['MOC03', 'MOC04'] }), guerreiro, A),
      A,
      3,
    );
    const recusa = declarar(base, A, {
      carta: 'MO01' as never,
      cartasDeClasse: [{ carta: 'MOC03' as never, modo: 'exaurir' }],
    });
    expect(erroDe(recusa).tipo).toBe('escolha-obrigatoria');

    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'MO01' as never,
        escolhas: { passoDeKata: 'fluxo' },
        cartasDeClasse: [{ carta: 'MOC03' as never, modo: 'exaurir' }],
      },
    });
    expect(kataDe(depois, A)).toEqual(['fluxo']);
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('MOC03 Ativada registra que a Postura do Rio já corrigiu uma sequência', () => {
    const base = comChi(
      duelo(monge(['MO01'], { cartasDeClasse: ['MOC03', 'MOC04'] }), guerreiro, A),
      A,
      3,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'MO01' as never,
        cartasDeClasse: [{ carta: 'MOC03' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, A).cartasDeClasse.some((item) => item.estado === 'ativada')).toBe(true);
  });

  it('MOC04 Mantra do Fôlego Ativado recupera 1 Chi adicional no Fluxo Interior', () => {
    const base = comChi(
      duelo(monge(['MO01', 'MO04'], { cartasDeClasse: ['MOC04', 'MOC01'] }), guerreiro, A),
      A,
      0,
    );
    const uma = jogar(base, A, {
      pedido: {
        carta: 'MO01' as never,
        cartasDeClasse: [{ carta: 'MOC04' as never, modo: 'ativar' }],
      },
    }).partida;
    const { partida: depois } = jogar(uma, A, { pedido: { carta: 'MO04' as never } });
    // Fluxo Interior devolve 1 e o Mantra devolve outra.
    expect(chiDe(depois, A)).toBe(2);
  });

  it('MOC04 Exaurido deixa as 3 pedras Prontas', () => {
    const base = comChi(
      duelo(monge(['MO01'], { cartasDeClasse: ['MOC04', 'MOC01'] }), guerreiro, A),
      A,
      0,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'MO01' as never,
        cartasDeClasse: [{ carta: 'MOC04' as never, modo: 'exaurir' }],
      },
    });
    expect(chiDe(depois, A)).toBe(3);
  });

  it('MOC05 Mantra do Vazio Ativado exige o reforço e pede Reação com Chi', () => {
    const base = comChi(
      duelo(guerreiro, monge(['MO17', 'MO18'], { cartasDeClasse: ['MOC05', 'MOC01'] }), A),
      B,
      3,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'MO18' as never,
        escolhas: { reforco: 'impacto' },
        cartasDeClasse: [{ carta: 'MOC05' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('MOC05 Exaurido reduz +2 D e +2 I', () => {
    const base = comChi(
      duelo(guerreiro, monge(['MO17'], { cartasDeClasse: ['MOC05', 'MOC01'] }), A),
      B,
      3,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'MO17' as never,
        cartasDeClasse: [{ carta: 'MOC05' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(5);
  });

  it('MOC06 Mantra do Retorno Ativado aproxima da mão a carta que fechou o Kata', () => {
    const base = comChi(
      duelo(monge(['MO01', 'MO04', 'MO08'], { cartasDeClasse: ['MOC06', 'MOC01'] }), guerreiro, A),
      A,
      3,
    );
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const { partida: depois } = jogar(duas, A, {
      pedido: {
        carta: 'MO08' as never,
        cartasDeClasse: [{ carta: 'MOC06' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, A).cooldown[1]).toContain('MO08');
  });

  it('MOC06 Exaurido devolve direto à mão a carta que fechou o Kata', () => {
    const base = comChi(
      duelo(monge(['MO01', 'MO04', 'MO08'], { cartasDeClasse: ['MOC06', 'MOC01'] }), guerreiro, A),
      A,
      3,
    );
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const { partida: depois } = jogar(duas, A, {
      pedido: {
        carta: 'MO08' as never,
        cartasDeClasse: [{ carta: 'MOC06' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).mao).toContain('MO08');
  });
});

describe('Monge — Ultimates', () => {
  it('MOU01 Punho dos Cem Ecos recebe +3 D e +2 I depois de Abertura e Fluxo', () => {
    const base = comChi(duelo(monge(['MO01', 'MO04'], { ultimate: 'MOU01' }), guerreiro, A), A, 3);
    const uma = jogar(base, A, { pedido: { carta: 'MO01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'MO04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'MOU01' as never } });
    // 6 D impressos + 3 D pela sequência.
    expect(antes - jogador(depois, B).vida).toBeGreaterThanOrEqual(9);
  });

  it('MOU02 Mente Vazia zera a ação e recupera 1 Chi', () => {
    const base = comChi(duelo(guerreiro, monge(['MO01'], { ultimate: 'MOU02' }), A), B, 3);
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'MOU02' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(6);
    expect(chiDe(depois, B)).toBe(1);
  });

  it('MOU03 Três Portões barateia o primeiro Fluxo e a primeira Finalização', () => {
    const base = comChi(duelo(monge(['MO05', 'MO01'], { ultimate: 'MOU03' }), guerreiro, A), A, 3);
    const portoes = jogar(base, A, { pedido: { carta: 'MOU03' as never } }).partida;
    const apAntes = jogador(portoes, A).pontosDeAcao;
    const { partida: depois } = jogar(portoes, A, { pedido: { carta: 'MO05' as never } });
    // Joelhada Ascendente custa 2 AP; com o desconto, sai por 1.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });
});
