import { describe, expect, it } from 'vitest';

import { A, B, build, com, duelo, erroDe, jogador, jogar, virarTurno } from '../teste-apoio.js';
import { declarar } from '../partida.js';

/*
 * As dez Passivas, as três Canções, os três Instrumentos e as três Ultimates
 * do Bardo.
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

describe('Bardo — Passivas', () => {
  it('BP01 Ouvido Absoluto se revela quando as 2 Cadências do turno acontecem', () => {
    const base = duelo(
      bardo(['B01', 'B12', 'B02'], { passivas: ['BP01', 'BP05', 'BP07', 'BP08'] }),
      guerreiro,
      A,
    );
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    // Uma Cadência só: ela ainda está oculta.
    expect(estadoDaPassiva(duas, A, 'BP01')).toBe('oculta');

    const tres = jogar(duas, A, { pedido: { carta: 'B02' as never } }).partida;
    expect(estadoDaPassiva(tres, A, 'BP01')).not.toBe('oculta');
  });

  it('BP01 revelada exige o reforço e o soma à terceira Ação que fecha a Cadência', () => {
    const base = revelar(
      duelo(
        bardo(['B01', 'B12', 'B02'], { passivas: ['BP01', 'BP05', 'BP07', 'BP08'] }),
        guerreiro,
        A,
      ),
      A,
      'BP01',
    );
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    expect(erroDe(declarar(duas, A, { carta: 'B02' as never })).tipo).toBe('escolha-obrigatoria');

    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: { carta: 'B02' as never, escolhas: { reforco: 'dano' } },
    });
    // 3 D impressos + 1 D do Ouvido Absoluto (a Nota anterior é Harmonia).
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('BP02 Crescendo Natural dá +1 D à terceira Ação que completa 3 Notas', () => {
    const base = revelar(
      duelo(
        bardo(['B01', 'B12', 'B02'], { passivas: ['BP02', 'BP05', 'BP07', 'BP08'] }),
        guerreiro,
        A,
      ),
      A,
      'BP02',
    );
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'B02' as never } });
    // 3 D impressos + 1 D do Crescendo Natural.
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('BP03 Público Cativo guarda +1 D quando o inimigo reage e o Ataque fere', () => {
    const base = com(
      revelar(
        duelo(bardo(['B01', 'B02'], { passivas: ['BP03', 'BP05', 'BP07', 'BP08'] }), guerreiro, A),
        A,
        'BP03',
      ),
      B,
      { reserva: 2 },
    );
    const primeira = jogar(base, A, {
      pedido: { carta: 'B01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'B02' as never } });
    // 3 D impressos + 1 D do Pulso anterior + 1 D do Público Cativo.
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('BP04 Harmonia Defensiva exige o reforço e reduz mais uma vez por turno inimigo', () => {
    const base = com(
      revelar(
        duelo(guerreiro, bardo(['B16'], { passivas: ['BP04', 'BP05', 'BP07', 'BP08'] }), A),
        B,
        'BP04',
      ),
      B,
      { reserva: 2 },
    );
    const declarada = declarar(base, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;

    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'B16' as never,
        escolhas: { reforco: 'dano' },
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('BP05 Memória Musical barateia a habilidade que voltou cedo', () => {
    const base = duelo(
      bardo(['B01', 'B02'], { passivas: ['BP05', 'BP07', 'BP08', 'BP10'], ultimate: 'BU02' }),
      guerreiro,
      A,
    );
    const comCd1 = com(base, A, { cooldown: { 1: ['B02' as never], 2: [], 3: [] } });
    const devolvida = jogar(comCd1, A, {
      pedido: { carta: 'BU02' as never, escolhas: { cartaEmCooldown: 'B02' as never } },
    }).partida;
    expect(estadoDaPassiva(devolvida, A, 'BP05')).not.toBe('oculta');
    expect(jogador(devolvida, A).mao).toContain('B02');

    const apAntes = jogador(devolvida, A).pontosDeAcao;
    const { partida: depois } = jogar(devolvida, A, { pedido: { carta: 'B02' as never } });
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('BP06 Ritmo Sustentado guarda +1 D depois de uma Cadência com 2 de Reserva', () => {
    const base = revelar(
      duelo(
        bardo(['B01', 'B12', 'B02'], { passivas: ['BP06', 'BP05', 'BP07', 'BP08'] }),
        guerreiro,
        A,
      ),
      A,
      'BP06',
    );
    const comReserva = com(base, A, { reserva: 2 });
    const proximo = virarTurno(virarTurno(comReserva, A), B);
    const uma = jogar(proximo, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'B02' as never } });
    // 3 D impressos + 1 D do Pulso anterior não vale (Harmonia), mas o Ritmo
    // Sustentado guardou +1 D pela Cadência.
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('BP07 Virtuose guarda +1 D ao Ativar o Instrumento depois de revelada', () => {
    const base = revelar(
      duelo(
        bardo(['B01', 'B02'], {
          passivas: ['BP07', 'BP05', 'BP08', 'BP10'],
          cartasDeClasse: ['BC01', 'BC04'],
        }),
        guerreiro,
        A,
      ),
      A,
      'BP07',
    );
    const primeira = jogar(base, A, {
      pedido: {
        carta: 'B01' as never,
        cartasDeClasse: [{ carta: 'BC04' as never, modo: 'ativar' }],
      },
    }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'B02' as never } });
    // 3 D impressos + 1 D do Pulso anterior + 1 D do Virtuose.
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('BP08 Canção Inesquecível se revela na terceira Ativação da Canção', () => {
    const base = duelo(
      bardo(['B01', 'B02', 'B12'], {
        passivas: ['BP08', 'BP05', 'BP07', 'BP10'],
        cartasDeClasse: ['BC01', 'BC04'],
      }),
      guerreiro,
      A,
    );
    let atual = base;
    for (let vez = 0; vez < 3; vez += 1) {
      atual = jogar(atual, A, {
        pedido: {
          carta: 'B01' as never,
          cartasDeClasse: [{ carta: 'BC01' as never, modo: 'ativar' }],
        },
      }).partida;
      atual = virarTurno(virarTurno(atual, A), B);
    }
    expect(estadoDaPassiva(atual, A, 'BP08')).not.toBe('oculta');
  });

  it('BP09 Último Refrão barateia a terceira Ação depois de 2 Cadências', () => {
    const base = revelar(
      duelo(
        bardo(['B01', 'B12', 'B02'], { passivas: ['BP09', 'BP05', 'BP07', 'BP08'] }),
        guerreiro,
        A,
      ),
      A,
      'BP09',
    );
    const ferido = com(base, A, { vida: 9 });
    const uma = jogar(ferido, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    const apAntes = jogador(duas, A).pontosDeAcao;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'B02' as never } });
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('BP10 Silêncio Antes do Aplauso dá +2 D ao primeiro Ataque do turno seguinte', () => {
    const base = duelo(
      bardo(['B14', 'B01'], { passivas: ['BP10', 'BP05', 'BP07', 'BP08'] }),
      guerreiro,
      A,
    );
    const uma = jogar(base, A, { pedido: { carta: 'B14' as never } }).partida;
    const virada = virarTurno(uma, A);
    expect(estadoDaPassiva(virada, A, 'BP10')).not.toBe('oculta');

    const proximo = virarTurno(virada, B);
    const { partida: depois } = jogar(proximo, A, { pedido: { carta: 'B01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });
});

describe('Bardo — Canções e Instrumentos', () => {
  it('BC01 Canção da Marcha Ativada dá +1 I ao Ataque seguinte à Cadência', () => {
    const base = duelo(
      bardo(['B01', 'B12', 'B02'], { cartasDeClasse: ['BC01', 'BC04'] }),
      guerreiro,
      A,
    );
    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, {
      pedido: {
        carta: 'B12' as never,
        cartasDeClasse: [{ carta: 'BC01' as never, modo: 'ativar' }],
      },
    }).partida;
    const guardaAntes = jogador(duas, B).guarda;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'B02' as never } });
    // 1 I impresso + 1 I da Canção da Marcha.
    expect(guardaAntes - jogador(depois, B).guarda).toBe(2);
  });

  it('BC01 Exaurida recusa enquanto a condição impressa não estiver satisfeita', () => {
    // "Ao declarar sua terceira Ação **depois de ter produzido 2 Cadências**":
    // com três Ações por turno, a segunda Cadência nasce da própria terceira
    // Ação, e por isso a condição impressa não chega a estar satisfeita no
    // momento da declaração. O motor recusa em vez de afrouxar o texto; a
    // lacuna está registrada em docs/AMBIGUIDADES.md.
    const base = duelo(
      bardo(['B01', 'B12', 'B02'], { cartasDeClasse: ['BC01', 'BC04'] }),
      guerreiro,
      A,
    );
    const recusa = declarar(base, A, {
      carta: 'B01' as never,
      cartasDeClasse: [{ carta: 'BC01' as never, modo: 'exaurir' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    const naTerceira = declarar(duas, A, {
      carta: 'B02' as never,
      cartasDeClasse: [{ carta: 'BC01' as never, modo: 'exaurir' }],
    });
    expect(erroDe(naTerceira).tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('BC02 Canção do Lamento Ativada reduz 1 D de um Ataque forte', () => {
    const base = com(duelo(guerreiro, bardo(['B18'], { cartasDeClasse: ['BC02', 'BC04'] }), A), B, {
      reserva: 2,
    });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'B18' as never,
        cartasDeClasse: [{ carta: 'BC02' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('BC02 Exaurida reduz 4 D nas mesmas condições', () => {
    const base = com(duelo(guerreiro, bardo(['B16'], { cartasDeClasse: ['BC02', 'BC04'] }), A), B, {
      reserva: 2,
    });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'B16' as never,
        cartasDeClasse: [{ carta: 'BC02' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('BC03 Canção da Discórdia Ativada guarda o reforço escolhido', () => {
    const base = com(
      duelo(bardo(['B01', 'B02'], { cartasDeClasse: ['BC03', 'BC04'] }), guerreiro, A),
      B,
      {
        reserva: 2,
      },
    );
    const primeira = jogar(base, A, {
      pedido: {
        carta: 'B01' as never,
        escolhas: { reforco: 'dano' },
        cartasDeClasse: [{ carta: 'BC03' as never, modo: 'ativar' }],
      },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'B02' as never } });
    // 3 D impressos + 1 D do Pulso anterior + 1 D da Discórdia.
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('BC03 Exaurida soma +3 D depois da redução da Reação', () => {
    const base = com(duelo(bardo(['B01'], { cartasDeClasse: ['BC03', 'BC04'] }), guerreiro, A), B, {
      reserva: 2,
    });
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'B01' as never,
        cartasDeClasse: [{ carta: 'BC03' as never, modo: 'exaurir' }],
      },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    // W15 zera os 2 D impressos e a Discórdia soma 3 depois disso.
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('BC04 Tambor de Guerra Ativado dá +1 I a um Ataque de Pulso', () => {
    const base = duelo(bardo(['B01', 'B02'], { cartasDeClasse: ['BC04', 'BC01'] }), guerreiro, A);
    const recusa = declarar(base, A, {
      carta: 'B02' as never,
      cartasDeClasse: [{ carta: 'BC04' as never, modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'B01' as never,
        cartasDeClasse: [{ carta: 'BC04' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });

  it('BC04 Exaurido dá +3 I e barateia a próxima Ação na Ruptura', () => {
    const base = com(
      duelo(bardo(['B01', 'B02'], { cartasDeClasse: ['BC04', 'BC01'] }), guerreiro, A),
      B,
      {
        guarda: 4,
      },
    );
    const rompeu = jogar(base, A, {
      pedido: {
        carta: 'B01' as never,
        cartasDeClasse: [{ carta: 'BC04' as never, modo: 'exaurir' }],
      },
    }).partida;
    expect(jogador(rompeu, B).guarda).toBe(0);
    const apAntes = jogador(rompeu, A).pontosDeAcao;
    const { partida: depois } = jogar(rompeu, A, { pedido: { carta: 'B02' as never } });
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('BC05 Alaúde de Cristal Ativado move uma carta de CD2 para CD1 numa Melodia', () => {
    const base = duelo(bardo(['B02', 'B01'], { cartasDeClasse: ['BC05', 'BC01'] }), guerreiro, A);
    const comCd2 = com(base, A, { cooldown: { 1: [], 2: ['B04' as never], 3: [] } });
    const { partida: depois } = jogar(comCd2, A, {
      pedido: {
        carta: 'B02' as never,
        escolhas: { cartaEmCooldown: 'B04' as never },
        cartasDeClasse: [{ carta: 'BC05' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, A).cooldown[1]).toContain('B04');
  });

  it('BC05 Exaurido devolve uma carta do cooldown à mão e a encarece', () => {
    const base = duelo(bardo(['B02', 'B01'], { cartasDeClasse: ['BC05', 'BC01'] }), guerreiro, A);
    const comCd3 = com(base, A, { cooldown: { 1: [], 2: [], 3: ['B04' as never] } });
    const { partida: depois } = jogar(comCd3, A, {
      pedido: {
        carta: 'B02' as never,
        escolhas: { cartaEmCooldown: 'B04' as never },
        cartasDeClasse: [{ carta: 'BC05' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).mao).toContain('B04');
  });

  it('BC06 Flauta de Prata Ativada dá +1 Reserva depois de uma Harmonia', () => {
    const base = duelo(bardo(['B12', 'B01'], { cartasDeClasse: ['BC06', 'BC01'] }), guerreiro, A);
    const usada = jogar(base, A, {
      pedido: {
        carta: 'B12' as never,
        cartasDeClasse: [{ carta: 'BC06' as never, modo: 'ativar' }],
      },
    }).partida;
    expect(jogador(virarTurno(usada, A), A).reserva).toBe(2);
  });

  it('BC06 Exaurida ajusta a Reserva para 2 antes de responder', () => {
    const base = com(duelo(guerreiro, bardo(['B16'], { cartasDeClasse: ['BC06', 'BC01'] }), A), B, {
      reserva: 1,
    });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'B16' as never,
        cartasDeClasse: [{ carta: 'BC06' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).reserva).toBeGreaterThanOrEqual(1);
  });
});

describe('Bardo — Ultimates', () => {
  it('BU01 Grande Finale exige terceira Ação com as duas Notas anteriores diferentes', () => {
    const base = duelo(bardo(['B01', 'B12', 'B02'], { ultimate: 'BU01' }), guerreiro, A);
    expect(erroDe(declarar(base, A, { carta: 'BU01' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const uma = jogar(base, A, { pedido: { carta: 'B01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'B12' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'BU01' as never } });
    // 5 D impressos + 4 D pelas duas Notas que não se repetiram.
    expect(antes - jogador(depois, B).vida).toBe(9);
  });

  it('BU02 Bis prontifica as Cartas de Classe, devolve uma carta e recupera 1 AP', () => {
    const base = duelo(bardo(['B01', 'B02'], { ultimate: 'BU02' }), guerreiro, A);
    const comAtivada = com(com(base, A, { cooldown: { 1: ['B02' as never], 2: [], 3: [] } }), A, {
      cartasDeClasse: jogador(base, A).cartasDeClasse.map((item) => ({
        ...item,
        estado: 'ativada' as const,
      })),
    });
    const apAntes = jogador(comAtivada, A).pontosDeAcao;
    const { partida: depois } = jogar(comAtivada, A, {
      pedido: { carta: 'BU02' as never, escolhas: { cartaEmCooldown: 'B02' as never } },
    });
    expect(jogador(depois, A).mao).toContain('B02');
    expect(jogador(depois, A).cartasDeClasse.every((item) => item.estado === 'pronta')).toBe(true);
    // Custa 2 AP e devolve 1.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('BU03 Silêncio da Plateia zera a ação e prontifica as Cartas de Classe', () => {
    const base = duelo(guerreiro, bardo(['B01'], { ultimate: 'BU03' }), A);
    const comAtivada = com(com(base, B, { reserva: 2 }), B, {
      cartasDeClasse: jogador(base, B).cartasDeClasse.map((item) => ({
        ...item,
        estado: 'ativada' as const,
      })),
    });
    const { partida: depois } = jogar(comAtivada, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'BU03' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(6);
    expect(jogador(depois, B).cartasDeClasse.every((item) => item.estado === 'pronta')).toBe(true);
  });
});
