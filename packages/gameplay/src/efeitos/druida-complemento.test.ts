import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  carta,
  com,
  comForma,
  duelo,
  erroDe,
  formaDe,
  jogador,
  jogar,
  virarTurno,
} from '../teste-apoio.js';
import { declarar, usarMetamorfose } from '../partida.js';

/*
 * As dez Passivas, as três Formas Selvagens, os três Círculos Naturais e as
 * três Ultimates do Druida.
 *
 * A Forma é o eixo da classe: quase toda carta daqui lê em que Forma o Druida
 * está, então cada prova fixa a Forma antes de olhar para o número.
 */

const druida = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('druida', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

const estadoDaPassiva = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  codigo: string,
): string | undefined =>
  jogador(partida, quem).passivas.find((passiva) => passiva.carta === codigo)?.estado;

const revelar = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  codigo: string,
): ReturnType<typeof duelo> =>
  com(partida, quem, {
    passivas: jogador(partida, quem).passivas.map((passiva) =>
      passiva.carta === codigo ? { ...passiva, estado: 'pronta' as const } : passiva,
    ),
  });

const estadoDaCartaDeClasse = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  codigo: string,
): string | undefined =>
  jogador(partida, quem).cartasDeClasse.find((item) => item.carta === codigo)?.estado;

const comCartaDeClasseAtivada = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  codigo: string,
): ReturnType<typeof duelo> =>
  com(partida, quem, {
    cartasDeClasse: jogador(partida, quem).cartasDeClasse.map((item) =>
      item.carta === codigo ? { ...item, estado: 'ativada' as const } : item,
    ),
  });

describe('Druida — Passivas', () => {
  it('DP01 Duas Naturezas se revela ao agir nas duas Formas e reforça a Ação seguinte', () => {
    const base = duelo(
      druida(['D12', 'D04', 'D01'], { passivas: ['DP01', 'DP02', 'DP06', 'DP07'] }),
      guerreiro,
      A,
    );
    const humana = jogar(base, A, { pedido: { carta: carta('D12') } }).partida;
    expect(formaDe(humana, A)).toBe('selvagem');
    const selvagem = jogar(humana, A, { pedido: { carta: carta('D04') } }).partida;
    expect(estadoDaPassiva(selvagem, A, 'DP01')).not.toBe('oculta');

    // Com as duas Formas já usadas, a Duas Naturezas exige a escolha do reforço.
    expect(erroDe(declarar(selvagem, A, { carta: carta('D01') })).tipo).toBe('escolha-obrigatoria');

    const antes = jogador(selvagem, B).vida;
    const { partida: depois } = jogar(selvagem, A, {
      pedido: { carta: carta('D01'), escolhas: { reforco: 'dano' } },
    });
    // 2 D impressos + 1 D das Duas Naturezas.
    expect(antes - jogador(depois, B).vida).toBe(3);
  });

  it('DP02 Sangue da Fera dá +1 D ao primeiro Ataque Selvagem contra Guarda 0', () => {
    const base = revelar(
      comForma(
        com(
          duelo(druida(['D04'], { passivas: ['DP02', 'DP06', 'DP07', 'DP10'] }), guerreiro, A),
          B,
          { guarda: 0 },
        ),
        A,
        'selvagem',
      ),
      A,
      'DP02',
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: carta('D04') } });
    // 2 D impressos + 1 D da Garra Selvagem + 1 D do Sangue da Fera.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('DP03 Sabedoria Ancestral soma 1 ao valor que a Técnica Humana prometeu', () => {
    const base = revelar(
      duelo(druida(['D11', 'D01'], { passivas: ['DP03', 'DP02', 'DP06', 'DP10'] }), guerreiro, A),
      A,
      'DP03',
    );
    const tecnica = jogar(base, A, { pedido: { carta: carta('D11') } }).partida;
    const { partida: depois } = jogar(tecnica, A, { pedido: { carta: carta('D01') } });
    // 2 D impressos + 1 D do Crescimento Súbito + 1 D da Sabedoria Ancestral.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('DP04 Pele Renovada se revela voltando a Humano abaixo de 15 e restaura 2 Vida', () => {
    const base = comForma(
      com(duelo(druida(['D12'], { passivas: ['DP04', 'DP02', 'DP06', 'DP07'] }), guerreiro, A), A, {
        vida: 12,
      }),
      A,
      'selvagem',
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: carta('D12') } });
    expect(formaDe(depois, A)).toBe('humana');
    expect(estadoDaPassiva(depois, A, 'DP04')).not.toBe('oculta');
    expect(jogador(depois, A).vida).toBe(14);
  });

  it('DP04 já revelada restaura 1 Vida quando a transformação se repete', () => {
    const base = revelar(
      comForma(
        com(
          duelo(druida(['D12'], { passivas: ['DP04', 'DP02', 'DP06', 'DP07'] }), guerreiro, A),
          A,
          { vida: 12 },
        ),
        A,
        'selvagem',
      ),
      A,
      'DP04',
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: carta('D12') } });
    expect(jogador(depois, A).vida).toBe(13);
  });

  it('DP05 Instinto Predatório dá +1 D ao segundo Ataque Selvagem do turno', () => {
    const base = revelar(
      comForma(
        duelo(druida(['D04', 'D05'], { passivas: ['DP05', 'DP02', 'DP06', 'DP10'] }), guerreiro, A),
        A,
        'selvagem',
      ),
      A,
      'DP05',
    );
    const primeiro = jogar(base, A, { pedido: { carta: carta('D04') } }).partida;
    const antes = jogador(primeiro, B).vida;
    const { partida: depois } = jogar(primeiro, A, { pedido: { carta: carta('D05') } });
    // 4 D impressos + 1 D do Instinto; a Guarda inimiga ainda passa de 3.
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('DP06 Raízes Profundas restaura 1 Guarda quando a Resposta Humana impede Ruptura', () => {
    const base = revelar(
      com(duelo(guerreiro, druida(['D18'], { passivas: ['DP06', 'DP02', 'DP05', 'DP10'] }), A), B, {
        guarda: 2,
        reserva: 2,
      }),
      B,
      'DP06',
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'carta-de-reacao', carta: carta('D18') },
    });
    // As Raízes Protetoras zeram os 3 I do Ombro; a Guarda sobrevive e ganha 1.
    expect(jogador(depois, B).guarda).toBe(3);
  });

  it('DP07 Olho da Tempestade guarda +1 D depois de um Ataque com 3 I ou mais', () => {
    const base = revelar(
      duelo(druida(['D06', 'D01'], { passivas: ['DP07', 'DP02', 'DP06', 'DP10'] }), guerreiro, A),
      A,
      'DP07',
    );
    const primeiro = jogar(base, A, { pedido: { carta: carta('D06') } }).partida;
    expect(jogador(primeiro, B).guarda).toBe(3);
    const antes = jogador(primeiro, B).vida;
    const { partida: depois } = jogar(primeiro, A, { pedido: { carta: carta('D01') } });
    // 2 D impressos + 1 D do Olho da Tempestade.
    expect(antes - jogador(depois, B).vida).toBe(3);
  });

  it('DP08 Metamorfose Perfeita se revela ao mudar de forma duas vezes no turno', () => {
    const base = duelo(
      druida(['D12'], { passivas: ['DP08', 'DP02', 'DP06', 'DP10'] }),
      guerreiro,
      A,
    );
    const gratuita = usarMetamorfose(base, A, 'selvagem');
    expect(gratuita.ok).toBe(true);
    const trocada = gratuita.ok ? gratuita.valor.partida : base;
    const { partida: depois } = jogar(trocada, A, { pedido: { carta: carta('D12') } });
    expect(formaDe(depois, A)).toBe('humana');
    expect(estadoDaPassiva(depois, A, 'DP08')).not.toBe('oculta');
  });

  it('DP08 revelada reforça a ação seguinte à Metamorfose Instintiva', () => {
    const base = revelar(
      duelo(druida(['D12', 'D01'], { passivas: ['DP08', 'DP02', 'DP06', 'DP10'] }), guerreiro, A),
      A,
      'DP08',
    );
    const trocada = jogar(base, A, {
      pedido: { carta: carta('D12'), escolhas: { reforco: 'dano' } },
    }).partida;
    const { partida: depois } = jogar(trocada, A, { pedido: { carta: carta('D01') } });
    // 2 D impressos + 1 D da Metamorfose Perfeita.
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('DP09 Sobrevivência Selvagem tira 1 ponto a mais da Defesa Inata Selvagem', () => {
    const semPassiva = comForma(
      com(duelo(guerreiro, druida(['D01'], { passivas: ['DP01', 'DP05', 'DP07', 'DP10'] }), A), B, {
        vida: 9,
      }),
      B,
      'selvagem',
    );
    const { partida: sem } = jogar(semPassiva, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'defesa-inata', reducao: 'dano' },
    });
    // Ombro de Guerra passa 3 D; o Instinto Mutável tira 2.
    expect(jogador(sem, B).vida).toBe(8);

    const comPassiva = revelar(
      comForma(
        com(
          duelo(guerreiro, druida(['D01'], { passivas: ['DP09', 'DP01', 'DP05', 'DP07'] }), A),
          B,
          { vida: 9 },
        ),
        B,
        'selvagem',
      ),
      B,
      'DP09',
    );
    const { partida: comReforco } = jogar(comPassiva, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'defesa-inata', reducao: 'dano' },
    });
    expect(jogador(comReforco, B).vida).toBe(9);
  });

  it('DP10 Equilíbrio Natural se revela fechando o turno nas duas Formas com Reserva', () => {
    const base = com(
      duelo(druida(['D12', 'D04'], { passivas: ['DP10', 'DP02', 'DP06', 'DP07'] }), guerreiro, A),
      A,
      { vida: 20 },
    );
    const humana = jogar(base, A, { pedido: { carta: carta('D12') } }).partida;
    const selvagem = jogar(humana, A, { pedido: { carta: carta('D04') } }).partida;
    const virada = virarTurno(selvagem, A);
    expect(estadoDaPassiva(virada, A, 'DP10')).not.toBe('oculta');
    expect(jogador(virada, A).vida).toBe(21);
  });

  it('DP10 já revelada restaura 1 Vida sempre que a situação se repete', () => {
    const base = revelar(
      com(
        duelo(druida(['D12', 'D04'], { passivas: ['DP10', 'DP02', 'DP06', 'DP07'] }), guerreiro, A),
        A,
        { vida: 20 },
      ),
      A,
      'DP10',
    );
    const humana = jogar(base, A, { pedido: { carta: carta('D12') } }).partida;
    const selvagem = jogar(humana, A, { pedido: { carta: carta('D04') } }).partida;
    const virada = virarTurno(selvagem, A);
    expect(jogador(virada, A).vida).toBe(21);
  });
});

describe('Druida — Formas Selvagens e Círculos Naturais', () => {
  it('DC01 Forma do Urso dá +1 I ao primeiro Ataque Selvagem com 2 I ou mais', () => {
    const sem = comForma(
      duelo(druida(['D02'], { cartasDeClasse: ['DC02', 'DC05'] }), guerreiro, A),
      A,
      'selvagem',
    );
    expect(jogador(jogar(sem, A, { pedido: { carta: carta('D02') } }).partida, B).guarda).toBe(4);

    const urso = comForma(
      duelo(druida(['D02'], { cartasDeClasse: ['DC01', 'DC05'] }), guerreiro, A),
      A,
      'selvagem',
    );
    expect(jogador(jogar(urso, A, { pedido: { carta: carta('D02') } }).partida, B).guarda).toBe(3);
  });

  it('DC01 Ativada reduz +1 D e +1 I junto da Defesa Inata Selvagem', () => {
    const base = comForma(
      com(duelo(guerreiro, druida(['D01'], { cartasDeClasse: ['DC01', 'DC05'] }), A), B, {
        guarda: 6,
      }),
      B,
      'selvagem',
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: {
        tipo: 'defesa-inata',
        reducao: 'dano',
        cartasDeClasse: [{ carta: carta('DC01'), modo: 'ativar' }],
      },
    });
    // 3 D: 2 do Instinto Mutável e 1 do Urso. 3 I: 1 reduzido pelo Urso.
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(4);
  });

  it('DC01 Exaurida reduz +4 D e +2 I e tranca a Forma Selvagem', () => {
    const base = comForma(
      duelo(guerreiro, druida(['D01'], { cartasDeClasse: ['DC01', 'DC05'] }), A),
      B,
      'selvagem',
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: {
        tipo: 'defesa-inata',
        reducao: 'dano',
        cartasDeClasse: [{ carta: carta('DC01'), modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(5);
    expect(formaDe(depois, B)).toBe('humana');

    // A trava vale pelo resto da partida: nem a Metamorfose gratuita abre.
    const turnoDele = virarTurno(depois, A);
    expect(erroDe(usarMetamorfose(turnoDele, B, 'selvagem')).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );
  });

  it('DC02 Forma do Lobo Ativada pede o segundo Ataque Selvagem e dá +1 D e +1 I', () => {
    const base = comForma(
      duelo(druida(['D04', 'D01'], { cartasDeClasse: ['DC02', 'DC05'] }), guerreiro, A),
      A,
      'selvagem',
    );
    const recusa = declarar(base, A, {
      carta: carta('D04'),
      cartasDeClasse: [{ carta: carta('DC02'), modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const primeiro = jogar(base, A, { pedido: { carta: carta('D04') } }).partida;
    const antes = jogador(primeiro, B).vida;
    const { partida: depois } = jogar(primeiro, A, {
      pedido: {
        carta: carta('D01'),
        cartasDeClasse: [{ carta: carta('DC02'), modo: 'ativar' }],
      },
    });
    // 2 D impressos + 1 D do Lobo.
    expect(antes - jogador(depois, B).vida).toBe(3);
  });

  it('DC02 Exaurida dá +3 D e +1 I e devolve o Druida à Forma Humana', () => {
    const base = comForma(
      duelo(druida(['D04', 'D01'], { cartasDeClasse: ['DC02', 'DC05'] }), guerreiro, A),
      A,
      'selvagem',
    );
    const primeiro = jogar(base, A, { pedido: { carta: carta('D04') } }).partida;
    const antes = jogador(primeiro, B).vida;
    const { partida: depois } = jogar(primeiro, A, {
      pedido: {
        carta: carta('D01'),
        cartasDeClasse: [{ carta: carta('DC02'), modo: 'exaurir' }],
      },
    });
    // 2 D impressos + 3 D do Lobo Exaurido.
    expect(antes - jogador(depois, B).vida).toBe(5);
    expect(formaDe(depois, A)).toBe('humana');
  });

  it('DC03 Forma do Corvo Ativada adianta uma habilidade de CD2 para CD1', () => {
    const base = com(
      comForma(
        duelo(druida(['D11', 'D05'], { cartasDeClasse: ['DC03', 'DC05'] }), guerreiro, A),
        A,
        'selvagem',
      ),
      A,
      { cooldown: { 1: [], 2: [carta('D05')], 3: [] } },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('D11'),
        escolhas: { cartaEmCooldown: carta('D05') },
        cartasDeClasse: [{ carta: carta('DC03'), modo: 'ativar' }],
      },
    });
    expect(jogador(depois, A).cooldown[1]).toContain('D05');
    expect(jogador(depois, A).cooldown[2]).not.toContain('D05');
  });

  it('DC03 Exaurida devolve uma habilidade de CD1 para a mão e tranca a Selvagem', () => {
    const partida = comForma(
      duelo(druida(['D11', 'D05'], { cartasDeClasse: ['DC03', 'DC05'] }), guerreiro, A),
      A,
      'selvagem',
    );
    const base = com(partida, A, {
      mao: jogador(partida, A).mao.filter((codigo) => codigo !== carta('D05')),
      cooldown: { 1: [carta('D05')], 2: [], 3: [] },
    });
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('D11'),
        escolhas: { cartaEmCooldown: carta('D05') },
        cartasDeClasse: [{ carta: carta('DC03'), modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).mao).toContain('D05');
    expect(formaDe(depois, A)).toBe('humana');
  });

  it('DC04 Círculo do Bosque Ativado aumenta a restauração em 1', () => {
    const base = com(
      duelo(druida(['D13'], { cartasDeClasse: ['DC04', 'DC05'] }), guerreiro, A),
      A,
      { vida: 20 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('D13'),
        cartasDeClasse: [{ carta: carta('DC04'), modo: 'ativar' }],
      },
    });
    // Renovo Natural restaura 3 em Forma Humana; o Círculo soma 1.
    expect(jogador(depois, A).vida).toBe(24);
  });

  it('DC04 Exaurido restaura 3 a mais do mesmo tipo', () => {
    const base = com(
      duelo(druida(['D13'], { cartasDeClasse: ['DC04', 'DC05'] }), guerreiro, A),
      A,
      { vida: 20 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('D13'),
        cartasDeClasse: [{ carta: carta('DC04'), modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).vida).toBe(26);
  });

  it('DC05 Círculo da Tempestade Ativado exige 3 I impressos e dá +1 D', () => {
    const base = duelo(druida(['D06', 'D01'], { cartasDeClasse: ['DC05', 'DC04'] }), guerreiro, A);
    const recusa = declarar(base, A, {
      carta: carta('D01'),
      cartasDeClasse: [{ carta: carta('DC05'), modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('D06'),
        cartasDeClasse: [{ carta: carta('DC05'), modo: 'ativar' }],
      },
    });
    // 3 D impressos + 1 D do Círculo.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('DC05 Exaurido dá +2 D e +2 I a qualquer Ataque', () => {
    const base = duelo(druida(['D01'], { cartasDeClasse: ['DC05', 'DC04'] }), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('D01'),
        cartasDeClasse: [{ carta: carta('DC05'), modo: 'exaurir' }],
      },
    });
    // 2 D + 2 D; 1 I impresso + 1 I da primeira Ação Humana + 2 I do Círculo.
    expect(jogador(depois, B).vida).toBe(30 - 4);
    expect(jogador(depois, B).guarda).toBe(2);
  });

  it('DC06 Círculo da Lua Ativado dá +1 D à primeira ação depois da transformação', () => {
    const base = duelo(druida(['D12', 'D01'], { cartasDeClasse: ['DC06', 'DC05'] }), guerreiro, A);
    const trocada = jogar(base, A, {
      pedido: {
        carta: carta('D12'),
        cartasDeClasse: [{ carta: carta('DC06'), modo: 'ativar' }],
      },
    }).partida;
    expect(formaDe(trocada, A)).toBe('selvagem');
    const { partida: depois } = jogar(trocada, A, { pedido: { carta: carta('D01') } });
    // 2 D impressos + 1 D do Círculo da Lua.
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('DC06 Exaurido deixa a Carta de Forma Pronta e reforça a ação seguinte', () => {
    const base = comCartaDeClasseAtivada(
      duelo(druida(['D12', 'D01'], { cartasDeClasse: ['DC01', 'DC06'] }), guerreiro, A),
      A,
      'DC01',
    );
    const trocada = jogar(base, A, {
      pedido: {
        carta: carta('D12'),
        cartasDeClasse: [{ carta: carta('DC06'), modo: 'exaurir' }],
      },
    }).partida;
    expect(estadoDaCartaDeClasse(trocada, A, 'DC01')).toBe('pronta');

    const { partida: depois } = jogar(trocada, A, { pedido: { carta: carta('D01') } });
    // 2 D impressos + 2 D do Círculo da Lua Exaurido.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });
});

describe('Druida — Ultimates', () => {
  it('DU01 Avatar Selvagem soma +2 D na Forma Selvagem', () => {
    const base = comForma(
      duelo(druida(['D01'], { ultimate: 'DU01' }), guerreiro, A),
      A,
      'selvagem',
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: carta('DU01') } });
    // 6 D + 2 D; 3 I sem o bônus da transformação.
    expect(jogador(depois, B).vida).toBe(30 - 8);
    expect(jogador(depois, B).guarda).toBe(3);
  });

  it('DU01 soma também +1 I quando a transformação aconteceu neste turno', () => {
    const base = duelo(druida(['D12'], { ultimate: 'DU01' }), guerreiro, A);
    const trocada = jogar(base, A, { pedido: { carta: carta('D12') } }).partida;
    const { partida: depois } = jogar(trocada, A, { pedido: { carta: carta('DU01') } });
    expect(jogador(depois, B).vida).toBe(30 - 8);
    expect(jogador(depois, B).guarda).toBe(2);
  });

  it('DU02 Fúria da Natureza muda de forma antes de resolver e soma +2 D', () => {
    const base = duelo(druida(['D01'], { ultimate: 'DU02' }), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('DU02'), escolhas: { forma: 'selvagem' } },
    });
    expect(formaDe(depois, A)).toBe('selvagem');
    // 5 D impressos + 2 D da Forma Selvagem.
    expect(jogador(depois, B).vida).toBe(30 - 7);
  });

  it('DU02 sem transformação soma +2 I em Forma Humana', () => {
    const base = duelo(druida(['D01'], { ultimate: 'DU02' }), guerreiro, A);
    const { partida: depois } = jogar(base, A, { pedido: { carta: carta('DU02') } });
    expect(formaDe(depois, A)).toBe('humana');
    // 4 I impressos + 2 I quebram a Guarda 6.
    expect(jogador(depois, B).guarda).toBe(0);
  });

  it('DU03 Renascimento Primal restaura, transforma e prontifica a Carta de Forma', () => {
    const base = comCartaDeClasseAtivada(
      com(
        duelo(
          druida(['D01'], { cartasDeClasse: ['DC01', 'DC05'], ultimate: 'DU03' }),
          guerreiro,
          A,
        ),
        A,
        { vida: 20, guarda: 2 },
      ),
      A,
      'DC01',
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('DU03'), escolhas: { forma: 'selvagem' } },
    });
    expect(jogador(depois, A).vida).toBe(24);
    expect(jogador(depois, A).guarda).toBe(4);
    expect(formaDe(depois, A)).toBe('selvagem');
    expect(estadoDaCartaDeClasse(depois, A, 'DC01')).toBe('pronta');
  });
});
