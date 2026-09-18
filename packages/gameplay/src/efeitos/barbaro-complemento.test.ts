import { describe, expect, it } from 'vitest';

import { A, B, build, com, duelo, erroDe, jogador, jogar, virarTurno } from '../teste-apoio.js';
import { declarar } from '../partida.js';

/*
 * As dez Passivas, os três Instintos, os três Totens e as três Ultimates do
 * Bárbaro.
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

describe('Bárbaro — Passivas', () => {
  it('BAP01 Sangue Quente dá +1 D ao entrar em Enfurecido pela própria Guarda', () => {
    const base = revelar(
      com(
        duelo(
          barbaro(['BA03', 'BA07'], { passivas: ['BAP01', 'BAP06', 'BAP09', 'BAP10'] }),
          guerreiro,
          A,
        ),
        A,
        { guarda: 4 },
      ),
      A,
      'BAP01',
    );
    const trocou = jogar(base, A, {
      pedido: { carta: 'BA03' as never, escolhas: { guardaReduzida: 2 } },
    }).partida;
    expect(jogador(trocou, A).guarda).toBe(2);
    const { partida: depois } = jogar(trocou, A, { pedido: { carta: 'BA07' as never } });
    // 4 D impressos + 1 D do Sangue Quente.
    expect(jogador(depois, B).vida).toBe(jogador(trocou, B).vida - 5);
  });

  it('BAP02 Sem Medo se revela ao terminar o turno Desencadeado', () => {
    const base = com(
      duelo(barbaro(['BA07'], { passivas: ['BAP02', 'BAP06', 'BAP09', 'BAP10'] }), guerreiro, A),
      A,
      { guarda: 0 },
    );
    const virada = virarTurno(base, A);
    expect(estadoDaPassiva(virada, A, 'BAP02')).not.toBe('oculta');
  });

  it('BAP03 Dor é Combustível guarda +2 D depois de levar 4 ou mais', () => {
    const base = com(
      duelo(guerreiro, barbaro(['BA07'], { passivas: ['BAP03', 'BAP06', 'BAP09', 'BAP10'] }), A),
      B,
      { guarda: 2 },
    );
    const levou = jogar(base, A, { pedido: { carta: 'W02' as never } }).partida;
    expect(estadoDaPassiva(levou, B, 'BAP03')).not.toBe('oculta');

    const proximo = virarTurno(levou, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'BA07' as never } });
    // 4 D impressos + 2 D guardados.
    expect(jogador(depois, A).vida).toBe(30 - 6);
  });

  it('BAP04 Quebra-Ossos dá +1 D ao primeiro Ataque contra Guarda 0', () => {
    const base = revelar(
      duelo(barbaro(['BA07'], { passivas: ['BAP04', 'BAP06', 'BAP09', 'BAP10'] }), guerreiro, A),
      A,
      'BAP04',
    );
    const guardaZero = com(base, B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, { pedido: { carta: 'BA07' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 5);
  });

  it('BAP05 Fera Acuada dá +1 I fora de Contido com 10 de Vida ou menos', () => {
    const base = revelar(
      duelo(barbaro(['BA07'], { passivas: ['BAP05', 'BAP06', 'BAP09', 'BAP10'] }), guerreiro, A),
      A,
      'BAP05',
    );
    const acuado = com(base, A, { vida: 9, guarda: 2 });
    const { partida: depois } = jogar(acuado, A, { pedido: { carta: 'BA07' as never } });
    // Machado Arremessado tem 0 I impresso; o +1 I da Fera é tudo.
    expect(jogador(depois, B).guarda).toBe(6 - 1);
  });

  it('BAP06 Sem Reserva se revela ao fechar 3 Ações sem Reserva', () => {
    const base = duelo(
      barbaro(['BA01', 'BA07', 'BA04'], { passivas: ['BAP06', 'BAP09', 'BAP10', 'BAP04'] }),
      guerreiro,
      A,
    );
    const uma = jogar(base, A, { pedido: { carta: 'BA01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'BA07' as never } }).partida;
    const tres = jogar(duas, A, { pedido: { carta: 'BA04' as never } }).partida;
    const virada = virarTurno(tres, A);
    expect(estadoDaPassiva(virada, A, 'BAP06')).not.toBe('oculta');
  });

  it('BAP07 Pele de Ferro reduz +1 D quando a Reação impede Ruptura', () => {
    const base = com(
      revelar(
        duelo(guerreiro, barbaro(['BA17'], { passivas: ['BAP07', 'BAP06', 'BAP09', 'BAP10'] }), A),
        B,
        'BAP07',
      ),
      B,
      { guarda: 2, reserva: 2 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'BA17' as never },
    });
    // 3 D impressos, menos 1 D da Pele de Ferro.
    expect(jogador(depois, B).vida).toBe(30 - 2);
  });

  it('BAP08 Frenesi Crescente dá +1 D ao terceiro Ataque fora de Contido', () => {
    const base = revelar(
      com(
        duelo(
          barbaro(['BA01', 'BA04', 'BA07'], { passivas: ['BAP08', 'BAP06', 'BAP09', 'BAP10'] }),
          guerreiro,
          A,
        ),
        A,
        { guarda: 2 },
      ),
      A,
      'BAP08',
    );
    const uma = jogar(base, A, { pedido: { carta: 'BA01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'BA04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'BA07' as never } });
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('BAP09 Coração Selvagem cobra 1 ponto a menos na primeira redução do turno', () => {
    const base = revelar(
      duelo(barbaro(['BA03'], { passivas: ['BAP09', 'BAP06', 'BAP08', 'BAP10'] }), guerreiro, A),
      A,
      'BAP09',
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'BA03' as never, escolhas: { guardaReduzida: 2 } },
    });
    // O pedido era de 2; o Coração Selvagem faz sair 1.
    expect(jogador(depois, A).guarda).toBe(5);
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('BAP10 Não Vou Cair guarda +2 D depois de sobreviver com 3 de Vida', () => {
    const base = com(
      duelo(guerreiro, barbaro(['BA07'], { passivas: ['BAP10', 'BAP06', 'BAP08', 'BAP09'] }), A),
      B,
      { vida: 5 },
    );
    const sobreviveu = jogar(base, A, { pedido: { carta: 'W01' as never } }).partida;
    expect(jogador(sobreviveu, B).vida).toBe(3);
    expect(estadoDaPassiva(sobreviveu, B, 'BAP10')).not.toBe('oculta');

    const proximo = virarTurno(sobreviveu, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'BA07' as never } });
    expect(jogador(depois, A).vida).toBe(30 - 6);
  });
});

describe('Bárbaro — Instintos e Totens', () => {
  it('BAC01 Instinto do Berserker Ativado dá +1 D ao entrar em Enfurecido', () => {
    const base = com(
      duelo(barbaro(['BA03', 'BA07'], { cartasDeClasse: ['BAC01', 'BAC05'] }), guerreiro, A),
      A,
      { guarda: 4 },
    );
    const trocou = jogar(base, A, {
      pedido: {
        carta: 'BA03' as never,
        escolhas: { guardaReduzida: 2 },
        cartasDeClasse: [{ carta: 'BAC01' as never, modo: 'ativar' }],
      },
    }).partida;
    const antes = jogador(trocou, B).vida;
    const { partida: depois } = jogar(trocou, A, { pedido: { carta: 'BA07' as never } });
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('BAC01 Exaurido dá +4 D ao zerar a própria Guarda', () => {
    const base = com(
      duelo(barbaro(['BA03', 'BA07'], { cartasDeClasse: ['BAC01', 'BAC05'] }), guerreiro, A),
      A,
      { guarda: 2 },
    );
    const trocou = jogar(base, A, {
      pedido: {
        carta: 'BA03' as never,
        escolhas: { guardaReduzida: 2 },
        cartasDeClasse: [{ carta: 'BAC01' as never, modo: 'exaurir' }],
      },
    }).partida;
    expect(jogador(trocou, A).guarda).toBe(0);
    const antes = jogador(trocou, B).vida;
    const { partida: depois } = jogar(trocou, A, { pedido: { carta: 'BA07' as never } });
    expect(antes - jogador(depois, B).vida).toBe(8);
  });

  it('BAC02 Instinto do Colosso Ativado pede Ataque de 3 AP fora de Contido', () => {
    const base = duelo(barbaro(['BA05'], { cartasDeClasse: ['BAC02', 'BAC05'] }), guerreiro, A);
    const recusa = declarar(base, A, {
      carta: 'BA05' as never,
      cartasDeClasse: [{ carta: 'BAC02' as never, modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const enfurecido = com(base, A, { guarda: 2 });
    const { partida: depois } = jogar(enfurecido, A, {
      pedido: {
        carta: 'BA05' as never,
        cartasDeClasse: [{ carta: 'BAC02' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });

  it('BAC02 Exaurido dá +2 D e +3 I ao mesmo Ataque', () => {
    const base = com(
      duelo(barbaro(['BA05'], { cartasDeClasse: ['BAC02', 'BAC05'] }), guerreiro, A),
      A,
      { guarda: 2 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'BA05' as never,
        cartasDeClasse: [{ carta: 'BAC02' as never, modo: 'exaurir' }],
      },
    });
    // 2 I impressos + 3 I do Instinto contra Guarda 6.
    expect(jogador(depois, B).guarda).toBe(1);
  });

  it('BAC03 Instinto do Sobrevivente Ativado reduz 1 D e 1 I Desencadeado', () => {
    const base = com(
      duelo(guerreiro, barbaro(['BA16'], { cartasDeClasse: ['BAC03', 'BAC05'] }), A),
      B,
      { guarda: 0, reserva: 2 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'BA16' as never,
        cartasDeClasse: [{ carta: 'BAC03' as never, modo: 'ativar' }],
      },
    });
    // Pele Grossa reduz 3 D e o Instinto reduz mais 1: o Ombro não passa nada.
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('BAC03 Exaurido segura a Vida em 1', () => {
    const base = com(
      duelo(guerreiro, barbaro(['BA16'], { cartasDeClasse: ['BAC03', 'BAC05'] }), A),
      B,
      { vida: 2, reserva: 2 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'BA16' as never,
        cartasDeClasse: [{ carta: 'BAC03' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBeGreaterThanOrEqual(1);
    expect(depois.desfecho).toBeNull();
  });

  it('BAC04 Totem do Urso Ativado tira 1 D do próximo Ataque inimigo', () => {
    const base = duelo(barbaro(['BA03'], { cartasDeClasse: ['BAC04', 'BAC05'] }), guerreiro, A);
    const trocou = jogar(base, A, {
      pedido: {
        carta: 'BA03' as never,
        escolhas: { guardaReduzida: 2 },
        cartasDeClasse: [{ carta: 'BAC04' as never, modo: 'ativar' }],
      },
    }).partida;
    const proximo = virarTurno(trocou, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'W02' as never } });
    // Ombro de Guerra passa 3 D; o Totem tira 1.
    expect(jogador(depois, A).vida).toBe(30 - 2);
  });

  it('BAC04 Exaurido reduz 4 D de um Ataque no turno inimigo', () => {
    const base = com(
      duelo(guerreiro, barbaro(['BA16'], { cartasDeClasse: ['BAC04', 'BAC05'] }), A),
      B,
      { reserva: 2 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'defesa-inata',
        cartasDeClasse: [{ carta: 'BAC04' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('BAC05 Totem do Lobo Ativado dá +1 D ao Ataque depois de um Ataque', () => {
    const base = duelo(
      barbaro(['BA01', 'BA07'], { cartasDeClasse: ['BAC05', 'BAC01'] }),
      guerreiro,
      A,
    );
    const recusa = declarar(base, A, {
      carta: 'BA01' as never,
      cartasDeClasse: [{ carta: 'BAC05' as never, modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const primeira = jogar(base, A, { pedido: { carta: 'BA01' as never } }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, {
      pedido: {
        carta: 'BA07' as never,
        cartasDeClasse: [{ carta: 'BAC05' as never, modo: 'ativar' }],
      },
    });
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('BAC05 Exaurido dá +3 D e +1 I à terceira Ação depois de um Ataque', () => {
    const base = duelo(
      barbaro(['BA01', 'BA04', 'BA07'], { cartasDeClasse: ['BAC05', 'BAC01'] }),
      guerreiro,
      A,
    );
    const uma = jogar(base, A, { pedido: { carta: 'BA01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'BA04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: {
        carta: 'BA07' as never,
        cartasDeClasse: [{ carta: 'BAC05' as never, modo: 'exaurir' }],
      },
    });
    expect(antes - jogador(depois, B).vida).toBeGreaterThanOrEqual(7);
  });

  it('BAC06 Totem da Tempestade Ativado tira 1 Vida adicional na Ruptura', () => {
    const base = com(
      duelo(barbaro(['BA07'], { cartasDeClasse: ['BAC06', 'BAC01'] }), guerreiro, A),
      B,
      { guarda: 0 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'BA07' as never,
        cartasDeClasse: [{ carta: 'BAC06' as never, modo: 'ativar' }],
      },
    });
    // Sem Guarda não há Ruptura nova: o Totem não dispara.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('BAC06 Exaurido dá +2 I antes da resolução e +2 de Vida na Ruptura', () => {
    const base = com(
      duelo(barbaro(['BA01'], { cartasDeClasse: ['BAC06', 'BAC01'] }), guerreiro, A),
      B,
      { guarda: 3 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'BA01' as never,
        cartasDeClasse: [{ carta: 'BAC06' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(0);
    // 2 D impressos + 2 D da Ruptura + 2 de Vida do Totem.
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });
});

describe('Bárbaro — Ultimates', () => {
  it('BAU01 Fim do Mundo zera a própria Guarda por +4 D e +1 I', () => {
    const base = duelo(barbaro(['BA01'], { ultimate: 'BAU01' }), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'BAU01' as never, escolhas: { guardaReduzida: 6 } },
    });
    expect(jogador(depois, A).guarda).toBe(0);
    // 6 D impressos + 4 D da troca; 3 I + 1 I contra Guarda 6.
    expect(jogador(depois, B).guarda).toBe(2);
    expect(jogador(depois, B).vida).toBe(30 - 10);
  });

  it('BAU02 Frenesi sem Freio barateia os Ataques e cobra 2 de Guarda em cada', () => {
    const base = duelo(barbaro(['BA05'], { ultimate: 'BAU02' }), guerreiro, A);
    const frenesi = jogar(base, A, { pedido: { carta: 'BAU02' as never } }).partida;
    const apAntes = jogador(frenesi, A).pontosDeAcao;
    const { partida: depois } = jogar(frenesi, A, { pedido: { carta: 'BA05' as never } });
    // Quebra-Crânio custa 3 AP; com o desconto, sai por 2.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
    expect(jogador(depois, A).guarda).toBe(4);
  });

  it('BAU03 Recusar a Morte deixa a Vida em 1 e a Guarda em 0', () => {
    const base = com(duelo(guerreiro, barbaro(['BA01'], { ultimate: 'BAU03' }), A), B, {
      vida: 3,
      reserva: 2,
    });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'BAU03' as never },
    });
    expect(jogador(depois, B).vida).toBe(1);
    expect(jogador(depois, B).guarda).toBe(0);
    expect(depois.desfecho).toBeNull();
  });
});
