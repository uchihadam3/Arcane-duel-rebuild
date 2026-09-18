import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  brechasDe,
  build,
  com,
  comBrechas,
  duelo,
  erroDe,
  jogador,
  jogar,
  virarTurno,
} from '../teste-apoio.js';
import { declarar } from '../partida.js';

/*
 * As dez Passivas, os três Métodos, as três Ferramentas e as três Ultimates do
 * Ladino.
 */

const ladino = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('ladino', { habilidades, ...extras });

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

describe('Ladino — Passivas', () => {
  it('LP01 Primeiro Sangue se revela no primeiro Dano à Vida e cria 1 Brecha', () => {
    const base = comBrechas(
      duelo(ladino(['L01'], { passivas: ['LP01', 'LP04', 'LP08', 'LP10'] }), guerreiro, A),
      A,
      0,
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'L01' as never } });
    expect(estadoDaPassiva(depois, A, 'LP01')).not.toBe('oculta');
    expect(brechasDe(depois, A)).toBe(1);
  });

  it('LP01 revelada dá +1 D ao primeiro Ataque do turno sem Reação inimiga', () => {
    const base = revelar(
      duelo(ladino(['L01'], { passivas: ['LP01', 'LP04', 'LP08', 'LP10'] }), guerreiro, A),
      A,
      'LP01',
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'L01' as never } });
    // 2 D impressos + 1 D da primeira Ação + 1 D do Primeiro Sangue.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('LP02 Passos Invisíveis barateia o primeiro Ataque do turno seguinte', () => {
    const base = duelo(
      guerreiro,
      ladino(['L04'], { passivas: ['LP02', 'LP04', 'LP08', 'LP10'] }),
      A,
    );
    const semDano = virarTurno(base, A);
    expect(estadoDaPassiva(semDano, B, 'LP02')).not.toBe('oculta');

    const comBrecha = comBrechas(semDano, B, 2);
    const apAntes = jogador(comBrecha, B).pontosDeAcao;
    const { partida: depois } = jogar(comBrecha, B, { pedido: { carta: 'L04' as never } });
    // Golpe nos Rins custa 2 AP; com os Passos Invisíveis, sai por 1.
    expect(apAntes - jogador(depois, B).pontosDeAcao).toBe(1);
  });

  it('LP03 Predador da Brecha dá +1 D ao primeiro Ataque contra Guarda 0', () => {
    const base = revelar(
      duelo(ladino(['L01'], { passivas: ['LP03', 'LP04', 'LP08', 'LP10'] }), guerreiro, A),
      A,
      'LP03',
    );
    const guardaZero = com(base, B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, { pedido: { carta: 'L01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('LP04 Mãos Rápidas exige o reforço escolhido na terceira Ação de 1 AP', () => {
    const base = revelar(
      duelo(
        ladino(['L03', 'L07', 'L01'], { passivas: ['LP04', 'LP08', 'LP09', 'LP10'] }),
        guerreiro,
        A,
      ),
      A,
      'LP04',
    );
    const uma = jogar(base, A, { pedido: { carta: 'L03' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'L07' as never } }).partida;
    expect(erroDe(declarar(duas, A, { carta: 'L01' as never })).tipo).toBe('escolha-obrigatoria');

    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: { carta: 'L01' as never, escolhas: { reforco: 'dano' } },
    });
    // 2 D impressos + 1 D das Mãos Rápidas (a primeira Ação já passou).
    expect(antes - jogador(depois, B).vida).toBe(3);
  });

  it('LP05 Sangue Frio cria 2 Brechas e barateia a primeira habilidade com Brecha', () => {
    const base = comBrechas(
      duelo(ladino(['L04'], { passivas: ['LP05', 'LP04', 'LP08', 'LP10'] }), guerreiro, A),
      A,
      0,
    );
    const ferido = com(base, A, { vida: 9 });
    const virada = virarTurno(virarTurno(ferido, A), B);
    expect(estadoDaPassiva(virada, A, 'LP05')).not.toBe('oculta');
    expect(brechasDe(virada, A)).toBe(2);

    const semBrecha = comBrechas(virada, A, 0);
    expect(declarar(semBrecha, A, { carta: 'L04' as never }).ok).toBe(true);
  });

  it('LP06 Olho para Reações cria 1 Brecha quando o inimigo reage', () => {
    const base = comBrechas(
      revelar(
        duelo(ladino(['L01'], { passivas: ['LP06', 'LP04', 'LP08', 'LP10'] }), guerreiro, A),
        A,
        'LP06',
      ),
      A,
      0,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'L01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    });
    expect(brechasDe(depois, A)).toBe(1);
  });

  it('LP07 Ferida Aberta dá +1 D ao primeiro Ataque contra alvo com Sangramento', () => {
    const base = revelar(
      duelo(ladino(['L01'], { passivas: ['LP07', 'LP04', 'LP08', 'LP10'] }), guerreiro, A),
      A,
      'LP07',
    );
    const sangrando = com(base, B, {
      condicoes: { queimadura: 0, lento: 0, murchar: 0, sangramento: 1 },
    });
    const { partida: depois } = jogar(sangrando, A, { pedido: { carta: 'L01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('LP08 Improvisador barateia a habilidade que voltou cedo do cooldown', () => {
    const base = comBrechas(
      duelo(guerreiro, ladino(['L18', 'L03'], { passivas: ['LP08', 'LP04', 'LP09', 'LP10'] }), A),
      B,
      2,
    );
    const preparado = com(base, B, {
      reserva: 2,
      cooldown: { 1: ['L03' as never], 2: [], 3: [] },
    });
    const { partida: devolvida } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'L18' as never,
        escolhas: { cartaEmCooldown: 'L03' as never },
      },
    });
    expect(estadoDaPassiva(devolvida, B, 'LP08')).not.toBe('oculta');
    expect(jogador(devolvida, B).mao).toContain('L03');
  });

  it('LP09 Sem Testemunhas dá +1 D contra Guarda 0 com Sangramento', () => {
    const base = revelar(
      duelo(ladino(['L01'], { passivas: ['LP09', 'LP04', 'LP08', 'LP10'] }), guerreiro, A),
      A,
      'LP09',
    );
    const alvo = com(base, B, {
      guarda: 0,
      condicoes: { queimadura: 0, lento: 0, murchar: 0, sangramento: 1 },
    });
    const { partida: depois } = jogar(alvo, A, { pedido: { carta: 'L01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('LP10 Plano de Fuga cria 1 Brecha adicional na primeira Reação do turno inimigo', () => {
    const base = comBrechas(
      revelar(
        duelo(guerreiro, ladino(['L15'], { passivas: ['LP10', 'LP04', 'LP08', 'LP09'] }), A),
        B,
        'LP10',
      ),
      B,
      0,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'L15' as never },
    });
    expect(brechasDe(depois, B)).toBe(2);
  });
});

describe('Ladino — Métodos e Ferramentas', () => {
  it('LC01 Método do Assassino Ativado dá +1 D contra Guarda 0', () => {
    const base = duelo(ladino(['L01'], { cartasDeClasse: ['LC01', 'LC06'] }), guerreiro, A);
    const guardaZero = com(base, B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, {
      pedido: {
        carta: 'L01' as never,
        cartasDeClasse: [{ carta: 'LC01' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('LC01 Exaurido dá +4 D contra Guarda 0', () => {
    const base = duelo(ladino(['L01'], { cartasDeClasse: ['LC01', 'LC06'] }), guerreiro, A);
    const guardaZero = com(base, B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, {
      pedido: {
        carta: 'L01' as never,
        cartasDeClasse: [{ carta: 'LC01' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 7);
  });

  it('LC02 Método do Duelista Ativado cria 1 Brecha quando a Reação zera o Dano', () => {
    const base = comBrechas(
      duelo(guerreiro, ladino(['L15'], { cartasDeClasse: ['LC02', 'LC06'] }), A),
      B,
      0,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W01' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'L15' as never,
        cartasDeClasse: [{ carta: 'LC02' as never, modo: 'ativar' }],
      },
    });
    // Uma Brecha pela Esquiva e outra pelo Método do Duelista.
    expect(brechasDe(depois, B)).toBe(2);
  });

  it('LC02 Exaurido reduz +3 D e cobra 3 de Vida quando zera o Dano', () => {
    const base = comBrechas(
      duelo(guerreiro, ladino(['L15'], { cartasDeClasse: ['LC02', 'LC06'] }), A),
      B,
      0,
    );
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'L15' as never,
        cartasDeClasse: [{ carta: 'LC02' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, A).vida).toBe(30 - 3);
  });

  it('LC03 Método do Sabotador Ativado cria 1 Brecha ao sabotar', () => {
    const base = comBrechas(
      duelo(ladino(['L09'], { cartasDeClasse: ['LC03', 'LC06'] }), guerreiro, A),
      A,
      2,
    );
    const comServo = com(base, A, {
      cartasDeClasse: jogador(base, A).cartasDeClasse.map((item) =>
        item.carta === 'LC03' ? { ...item, estado: 'ativada' as const } : item,
      ),
    });
    const comCd1 = com(comServo, B, { cooldown: { 1: ['W15' as never], 2: [], 3: [] } });
    const antes = brechasDe(comCd1, A);
    const { partida: depois } = jogar(comCd1, A, {
      pedido: { carta: 'L09' as never, escolhas: { cartaAdversariaEmCooldown: 'W15' as never } },
    });
    // Consome 1 Brecha no custo e ganha 1 pela sabotagem.
    expect(brechasDe(depois, A)).toBe(antes);
  });

  it('LC03 Exaurido empurra até duas cartas adversárias para trás', () => {
    const base = comBrechas(
      duelo(ladino(['L01'], { cartasDeClasse: ['LC03', 'LC06'] }), guerreiro, A),
      A,
      0,
    );
    const comCooldown = com(base, B, {
      cooldown: { 1: ['W15' as never, 'W19' as never], 2: [], 3: [] },
    });
    const { partida: depois } = jogar(comCooldown, A, {
      pedido: {
        carta: 'L01' as never,
        escolhas: { cartasEmCooldown: ['W15' as never, 'W19' as never] },
        cartasDeClasse: [{ carta: 'LC03' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).cooldown[2]).toContain('W15');
    expect(jogador(depois, B).cooldown[2]).toContain('W19');
  });

  it('LC04 Lâminas Serrilhadas Ativadas aplicam Sangramento 1', () => {
    const base = duelo(ladino(['L01'], { cartasDeClasse: ['LC04', 'LC06'] }), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'L01' as never,
        cartasDeClasse: [{ carta: 'LC04' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).condicoes.sangramento).toBe(1);
  });

  it('LC04 Exauridas dão +1 D e aplicam Sangramento 2', () => {
    const base = duelo(ladino(['L01'], { cartasDeClasse: ['LC04', 'LC06'] }), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'L01' as never,
        cartasDeClasse: [{ carta: 'LC04' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 4);
    expect(jogador(depois, B).condicoes.sangramento).toBe(2);
  });

  it('LC05 Frasco de Fumaça Ativado exige o reforço escolhido', () => {
    const base = com(
      duelo(guerreiro, ladino(['L15'], { cartasDeClasse: ['LC05', 'LC06'] }), A),
      B,
      {
        reserva: 2,
      },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'L15' as never,
        escolhas: { reforco: 'dano' },
        cartasDeClasse: [{ carta: 'LC05' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('LC05 Exaurido reduz +2 D e +2 I', () => {
    const base = com(
      duelo(guerreiro, ladino(['L15'], { cartasDeClasse: ['LC05', 'LC06'] }), A),
      B,
      {
        reserva: 2,
      },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'L15' as never,
        cartasDeClasse: [{ carta: 'LC05' as never, modo: 'exaurir' }],
      },
    });
    // Ombro de Guerra chega com 3 de Impacto na primeira Ação; sobram 1.
    expect(jogador(depois, B).guarda).toBe(5);
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('LC06 Fio Oculto Ativado dá +1 I na segunda Ação', () => {
    const base = duelo(ladino(['L01', 'L03'], { cartasDeClasse: ['LC06', 'LC01'] }), guerreiro, A);
    const recusa = declarar(base, A, {
      carta: 'L01' as never,
      cartasDeClasse: [{ carta: 'LC06' as never, modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const primeira = jogar(base, A, { pedido: { carta: 'L01' as never } }).partida;
    const guardaAntes = jogador(primeira, B).guarda;
    const { partida: depois } = jogar(primeira, A, {
      pedido: {
        carta: 'L03' as never,
        cartasDeClasse: [{ carta: 'LC06' as never, modo: 'ativar' }],
      },
    });
    expect(guardaAntes - jogador(depois, B).guarda).toBe(2);
  });

  it('LC06 Exaurido dá +2 D e +2 I e cria 2 Brechas na Ruptura', () => {
    const base = comBrechas(
      duelo(ladino(['L01'], { cartasDeClasse: ['LC06', 'LC01'] }), guerreiro, A),
      A,
      0,
    );
    const quaseRompido = com(base, B, { guarda: 3 });
    const { partida: depois } = jogar(quaseRompido, A, {
      pedido: {
        carta: 'L01' as never,
        cartasDeClasse: [{ carta: 'LC06' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(0);
    expect(brechasDe(depois, A)).toBe(2);
  });
});

describe('Ladino — Ultimates', () => {
  it('LU01 Golpe Perfeito exige pelo menos 2 Brechas e ganha +2 D contra Guarda 0', () => {
    const semBrechas = comBrechas(duelo(ladino(['L01'], { ultimate: 'LU01' }), guerreiro, A), A, 1);
    expect(
      erroDe(declarar(semBrechas, A, { carta: 'LU01' as never, escolhas: { recursoAdicional: 2 } }))
        .tipo,
    ).toBe('recurso-insuficiente');

    const base = comBrechas(duelo(ladino(['L01'], { ultimate: 'LU01' }), guerreiro, A), A, 3);
    const guardaZero = com(base, B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, {
      pedido: { carta: 'LU01' as never, escolhas: { recursoAdicional: 2 } },
    });
    expect(jogador(depois, B).vida).toBe(30 - 10);
    expect(brechasDe(depois, A)).toBe(1);
  });

  it('LU02 Mil Cortes soma +2 D por Ação anterior do turno, até +4 D', () => {
    // Duas Ações baratas antes, para sobrar AP para a Ultimate de 3.
    const base = comBrechas(
      duelo(ladino(['L01', 'L11'], { ultimate: 'LU02' }), guerreiro, A),
      A,
      3,
    );
    const uma = jogar(base, A, { pedido: { carta: 'L01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'L11' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'LU02' as never } });
    // 4 D impressos + 4 D por duas Ações anteriores. O Impacto 2 mais o +1 I
    // guardado pela Preparar a Brecha não chega a romper a Guarda 6.
    expect(antes - jogador(depois, B).vida).toBe(8);
  });

  it('LU03 Desaparecer zera o Dano e devolve até duas cartas de CD1', () => {
    const base = comBrechas(duelo(guerreiro, ladino(['L01'], { ultimate: 'LU03' }), A), B, 3);
    const preparado = com(base, B, {
      reserva: 2,
      cooldown: { 1: ['L03' as never, 'L07' as never], 2: [], 3: [] },
    });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'LU03' as never,
        escolhas: { cartasEmCooldown: ['L03' as never, 'L07' as never] },
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).mao).toContain('L03');
    expect(jogador(depois, B).mao).toContain('L07');
  });
});
