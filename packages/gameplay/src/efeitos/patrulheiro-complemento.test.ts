import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comMarca,
  duelo,
  erroDe,
  exigir,
  jogador,
  jogar,
  marcaDe,
  virarTurno,
} from '../teste-apoio.js';
import { abrirTurno, declarar, fecharTurno } from '../partida.js';

/*
 * As dez Passivas, os três Estilos, as três Armadilhas e as três Ultimates do
 * Patrulheiro.
 */

const patrulheiro = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('patrulheiro', { habilidades, ...extras });

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

describe('Patrulheiro — Passivas', () => {
  it('RP01 Predador Paciente dá +1 D ao Explorar uma Marca mantida um turno', () => {
    const base = comMarca(
      duelo(
        patrulheiro(['R15', 'R02'], { passivas: ['RP01', 'RP05', 'RP07', 'RP08'] }),
        guerreiro,
        A,
      ),
      A,
      true,
    );
    const paciente = jogar(base, A, { pedido: { carta: 'R15' as never } }).partida;
    const virada = virarTurno(paciente, A);
    expect(estadoDaPassiva(virada, A, 'RP01')).not.toBe('oculta');

    const proximo = virarTurno(virada, B);
    const { partida: depois } = jogar(proximo, A, {
      pedido: { carta: 'R02' as never, escolhas: { explorarMarca: true } },
    });
    // 4 D impressos + 2 D da Exploração + 1 D do Predador Paciente.
    expect(jogador(depois, B).vida).toBe(30 - 7);
  });

  it('RP02 Olho Firme dá +1 D uma vez ao Ataque preparado por Emboscada', () => {
    const base = revelar(
      duelo(
        patrulheiro(['R13', 'R03', 'R01', 'R06'], { passivas: ['RP02', 'RP05', 'RP07', 'RP08'] }),
        guerreiro,
        A,
      ),
      A,
      'RP02',
    );
    const preparado = jogar(base, A, {
      pedido: { carta: 'R13' as never, escolhas: { cartaDaMao: 'R03' as never } },
    }).partida;
    const proximo = virarTurno(virarTurno(preparado, A), B);
    // O Ataque emboscado é a terceira Ação do turno, e só ela.
    const uma = jogar(proximo, A, { pedido: { carta: 'R01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'R06' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'R03' as never } });
    // 3 D impressos + 1 D do Olho Firme.
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('RP03 Pista Fresca dá +1 I ao próximo Ataque depois de aplicar nova Marca', () => {
    const base = revelar(
      duelo(
        patrulheiro(['R11', 'R03'], { passivas: ['RP03', 'RP05', 'RP07', 'RP08'] }),
        guerreiro,
        A,
      ),
      A,
      'RP03',
    );
    const marcou = jogar(base, A, { pedido: { carta: 'R11' as never } }).partida;
    const guardaAntes = jogador(marcou, B).guarda;
    const { partida: depois } = jogar(marcou, A, { pedido: { carta: 'R03' as never } });
    // 2 I impressos + 1 I contra Marcado + 1 I da Pista Fresca.
    expect(guardaAntes - jogador(depois, B).guarda).toBe(4);
  });

  it('RP04 Sem Escapatória se revela ao começar o turno com o alvo Marcado e sem Reserva', () => {
    const base = comMarca(
      duelo(patrulheiro(['R03'], { passivas: ['RP04', 'RP05', 'RP07', 'RP08'] }), guerreiro, A),
      A,
      true,
    );
    // A Reserva do adversário precisa estar em zero **no instante** em que o
    // turno do Patrulheiro abre, então ela é zerada entre fechar e abrir.
    const doB = virarTurno(base, A);
    const fechado = exigir(fecharTurno(doB, B));
    const virada = exigir(abrirTurno(com(fechado, B, { reserva: 0 }), A));
    expect(estadoDaPassiva(virada, A, 'RP04')).not.toBe('oculta');

    const { partida: depois } = jogar(virada, A, { pedido: { carta: 'R03' as never } });
    // 3 D impressos + 1 D do Sem Escapatória.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('RP05 Mestre das Armadilhas move uma carta de CD2 ao Ativar a Armadilha', () => {
    const base = revelar(
      duelo(
        patrulheiro(['R03', 'R07'], {
          passivas: ['RP05', 'RP07', 'RP08', 'RP09'],
          cartasDeClasse: ['RC01', 'RC05'],
        }),
        guerreiro,
        A,
      ),
      A,
      'RP05',
    );
    const comCd2 = com(base, A, { cooldown: { 1: [], 2: ['R11' as never], 3: [] } });
    const { partida: depois } = jogar(comCd2, A, {
      pedido: {
        carta: 'R03' as never,
        escolhas: { cartaEmCooldown: 'R11' as never },
        cartasDeClasse: [{ carta: 'RC05' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, A).cooldown[1]).toContain('R11');
  });

  it('RP06 Respiração Controlada guarda +1 D para o próximo turno', () => {
    const base = duelo(
      patrulheiro(['R03', 'R11'], { passivas: ['RP06', 'RP05', 'RP07', 'RP08'] }),
      guerreiro,
      A,
    );
    const umAtaque = jogar(base, A, { pedido: { carta: 'R03' as never } }).partida;
    const comReserva = com(umAtaque, A, { reserva: 2 });
    const virada = virarTurno(comReserva, A);
    expect(estadoDaPassiva(virada, A, 'RP06')).not.toBe('oculta');
  });

  it('RP07 Caçador Incansável barateia a habilidade que aplica nova Marca', () => {
    const base = revelar(
      duelo(patrulheiro(['R07'], { passivas: ['RP07', 'RP05', 'RP08', 'RP09'] }), guerreiro, A),
      A,
      'RP07',
    );
    const apAntes = jogador(base, A).pontosDeAcao;
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'R07' as never } });
    // Flecha de Impacto custa 3 AP; sem Marca na mesa, sai por 2.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });

  it('RP08 Flecha Guardada dá +1 D à habilidade que voltou cedo', () => {
    const base = revelar(
      duelo(
        patrulheiro(['R13', 'R03'], { passivas: ['RP08', 'RP05', 'RP07', 'RP09'] }),
        guerreiro,
        A,
      ),
      A,
      'RP08',
    );
    expect(estadoDaPassiva(base, A, 'RP08')).not.toBe('oculta');
  });

  it('RP09 Sobrevivente do Ermo guarda +1 I depois de impedir Ruptura', () => {
    const base = com(
      revelar(
        duelo(
          guerreiro,
          patrulheiro(['R20', 'R03'], { passivas: ['RP09', 'RP05', 'RP07', 'RP08'] }),
          A,
        ),
        B,
        'RP09',
      ),
      B,
      { guarda: 2, reserva: 2 },
    );
    const impediu = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'R20' as never },
    }).partida;
    const proximo = virarTurno(impediu, A);
    const guardaAntes = jogador(proximo, A).guarda;
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'R03' as never } });
    // 2 I impressos + 1 I contra Marcado + 1 I do Sobrevivente do Ermo.
    expect(guardaAntes - jogador(depois, A).guarda).toBe(4);
  });

  it('RP10 Última Caçada aplica a Marca e dá +1 D à primeira Exploração', () => {
    const base = duelo(
      patrulheiro(['R02'], { passivas: ['RP10', 'RP05', 'RP07', 'RP08'] }),
      guerreiro,
      A,
    );
    const ferido = com(base, A, { vida: 9 });
    const virada = virarTurno(virarTurno(ferido, A), B);
    expect(estadoDaPassiva(virada, A, 'RP10')).not.toBe('oculta');
    expect(marcaDe(virada, A)).toBe(true);

    const { partida: depois } = jogar(virada, A, {
      pedido: { carta: 'R02' as never, escolhas: { explorarMarca: true } },
    });
    // 4 D impressos + 2 D da Exploração + 1 D da Última Caçada.
    expect(jogador(depois, B).vida).toBe(30 - 7);
  });
});

describe('Patrulheiro — Estilos e Armadilhas', () => {
  it('RC01 Estilo do Atirador Ativado dá +1 D na Exploração', () => {
    const base = comMarca(
      duelo(patrulheiro(['R02'], { cartasDeClasse: ['RC01', 'RC06'] }), guerreiro, A),
      A,
      true,
    );
    const comAtivado = com(base, A, {
      cartasDeClasse: jogador(base, A).cartasDeClasse.map((item) =>
        item.carta === 'RC01' ? { ...item, estado: 'ativada' as const } : item,
      ),
    });
    const { partida: depois } = jogar(comAtivado, A, {
      pedido: { carta: 'R02' as never, escolhas: { explorarMarca: true } },
    });
    expect(jogador(depois, B).vida).toBe(30 - 7);
  });

  it('RC01 Exaurido dá +3 D na Exploração', () => {
    const base = comMarca(
      duelo(patrulheiro(['R02'], { cartasDeClasse: ['RC01', 'RC06'] }), guerreiro, A),
      A,
      true,
    );
    const exaurido = com(base, A, {
      cartasDeClasse: jogador(base, A).cartasDeClasse.filter((item) => item.carta !== 'RC01'),
      removidas: ['RC01' as never],
    });
    const { partida: depois } = jogar(exaurido, A, {
      pedido: { carta: 'R02' as never, escolhas: { explorarMarca: true } },
    });
    expect(jogador(depois, B).vida).toBe(30 - 9);
  });

  it('RC02 Estilo do Rastreador Ativado reaplica a Marca no fim do turno', () => {
    const base = comMarca(
      duelo(patrulheiro(['R02'], { cartasDeClasse: ['RC02', 'RC06'] }), guerreiro, A),
      A,
      true,
    );
    const explorou = jogar(base, A, {
      pedido: {
        carta: 'R02' as never,
        escolhas: { explorarMarca: true },
        cartasDeClasse: [{ carta: 'RC02' as never, modo: 'ativar' }],
      },
    }).partida;
    expect(marcaDe(explorou, A)).toBe(false);
    expect(marcaDe(virarTurno(explorou, A), A)).toBe(true);
  });

  it('RC02 Exaurido reaplica a Marca imediatamente', () => {
    const base = comMarca(
      duelo(patrulheiro(['R02'], { cartasDeClasse: ['RC02', 'RC06'] }), guerreiro, A),
      A,
      true,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'R02' as never,
        escolhas: { explorarMarca: true },
        cartasDeClasse: [{ carta: 'RC02' as never, modo: 'exaurir' }],
      },
    });
    expect(marcaDe(depois, A)).toBe(true);
  });

  it('RC03 Estilo do Emboscador Ativado só entra no Ataque emboscado', () => {
    const base = duelo(
      patrulheiro(['R13', 'R03', 'R01', 'R06'], { cartasDeClasse: ['RC03', 'RC06'] }),
      guerreiro,
      A,
    );
    const recusa = declarar(base, A, {
      carta: 'R03' as never,
      cartasDeClasse: [{ carta: 'RC03' as never, modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const preparado = jogar(base, A, {
      pedido: { carta: 'R13' as never, escolhas: { cartaDaMao: 'R03' as never } },
    }).partida;
    const proximo = virarTurno(virarTurno(preparado, A), B);
    const duas = jogar(jogar(proximo, A, { pedido: { carta: 'R01' as never } }).partida, A, {
      pedido: { carta: 'R06' as never },
    }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: {
        carta: 'R03' as never,
        cartasDeClasse: [{ carta: 'RC03' as never, modo: 'ativar' }],
      },
    });
    // 3 D impressos + 1 D do Estilo Ativado.
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('RC03 Exaurido dá +3 D e +1 I ao Ataque emboscado', () => {
    const base = duelo(
      patrulheiro(['R13', 'R03', 'R01', 'R06'], { cartasDeClasse: ['RC03', 'RC06'] }),
      guerreiro,
      A,
    );
    const preparado = jogar(base, A, {
      pedido: { carta: 'R13' as never, escolhas: { cartaDaMao: 'R03' as never } },
    }).partida;
    const proximo = virarTurno(virarTurno(preparado, A), B);
    const duas = jogar(jogar(proximo, A, { pedido: { carta: 'R01' as never } }).partida, A, {
      pedido: { carta: 'R06' as never },
    }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: {
        carta: 'R03' as never,
        cartasDeClasse: [{ carta: 'RC03' as never, modo: 'exaurir' }],
      },
    });
    // 3 D impressos + 3 D do Estilo Exaurido.
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('RC04 Laço de Caça Ativado enfraquece a terceira Ação inimiga', () => {
    const base = com(
      duelo(guerreiro, patrulheiro(['R16'], { cartasDeClasse: ['RC04', 'RC01'] }), A),
      B,
      {
        reserva: 2,
      },
    );
    const uma = jogar(base, A, { pedido: { carta: 'W01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'W11' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'defesa-inata',
        cartasDeClasse: [{ carta: 'RC04' as never, modo: 'ativar' }],
      },
    });
    // 3 D impressos, menos 1 D do Laço e 1 D do Recuo Tático.
    expect(antes - jogador(depois, B).vida).toBe(1);
  });

  it('RC04 Exaurido enfraquece a terceira Ação em 3 D e 3 I', () => {
    const base = com(
      duelo(guerreiro, patrulheiro(['R16'], { cartasDeClasse: ['RC04', 'RC01'] }), A),
      B,
      {
        reserva: 2,
      },
    );
    const uma = jogar(base, A, { pedido: { carta: 'W01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'W11' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'R16' as never,
        cartasDeClasse: [{ carta: 'RC04' as never, modo: 'exaurir' }],
      },
    });
    expect(antes - jogador(depois, B).vida).toBe(0);
  });

  it('RC05 Estacas Ocultas Ativadas tiram 1 Vida depois do segundo Ataque inimigo', () => {
    const base = com(
      duelo(guerreiro, patrulheiro(['R16'], { cartasDeClasse: ['RC05', 'RC01'] }), A),
      B,
      {
        reserva: 2,
      },
    );
    const uma = jogar(base, A, { pedido: { carta: 'W01' as never } }).partida;
    const antes = jogador(uma, A).vida;
    const { partida: depois } = jogar(uma, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'defesa-inata',
        cartasDeClasse: [{ carta: 'RC05' as never, modo: 'ativar' }],
      },
    });
    expect(antes - jogador(depois, A).vida).toBe(1);
  });

  it('RC05 Exauridas tiram 3 Vida e aplicam a Marca', () => {
    const base = com(
      duelo(guerreiro, patrulheiro(['R16'], { cartasDeClasse: ['RC05', 'RC01'] }), A),
      B,
      {
        reserva: 2,
      },
    );
    const uma = jogar(base, A, { pedido: { carta: 'W01' as never } }).partida;
    const antes = jogador(uma, A).vida;
    const { partida: depois } = jogar(uma, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'defesa-inata',
        cartasDeClasse: [{ carta: 'RC05' as never, modo: 'exaurir' }],
      },
    });
    expect(antes - jogador(depois, A).vida).toBe(3);
    expect(marcaDe(depois, B)).toBe(true);
  });

  it('RC06 Fio de Tropeço Ativado reduz 2 I de um Ataque com 3 I ou mais', () => {
    const base = com(
      duelo(guerreiro, patrulheiro(['R16'], { cartasDeClasse: ['RC06', 'RC01'] }), A),
      B,
      {
        reserva: 2,
      },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'defesa-inata',
        cartasDeClasse: [{ carta: 'RC06' as never, modo: 'ativar' }],
      },
    });
    // Ombro de Guerra chega com 3 I; o Fio tira 2 e o Recuo Tático tira 1.
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('RC06 Exaurido reduz 4 I daquele Ataque', () => {
    const base = com(
      duelo(guerreiro, patrulheiro(['R16'], { cartasDeClasse: ['RC06', 'RC01'] }), A),
      B,
      {
        reserva: 2,
      },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'defesa-inata',
        cartasDeClasse: [{ carta: 'RC06' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(6);
  });
});

describe('Patrulheiro — Ultimates', () => {
  it('RU01 Olho do Predador só sai contra alvo Marcado e Explora a Marca', () => {
    const base = duelo(patrulheiro(['R03'], { ultimate: 'RU01' }), guerreiro, A);
    expect(erroDe(declarar(base, A, { carta: 'RU01' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const marcado = com(comMarca(base, A, true), B, { guarda: 0 });
    const { partida: depois } = jogar(marcado, A, { pedido: { carta: 'RU01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 10);
    expect(marcaDe(depois, A)).toBe(false);
  });

  it('RU02 Chuva de Flechas ganha +1 D e +1 I sem consumir a Marca', () => {
    const base = comMarca(duelo(patrulheiro(['R03'], { ultimate: 'RU02' }), guerreiro, A), A, true);
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'RU02' as never } });
    // 4 I impressos + 1 I por alvo Marcado contra Guarda 6.
    expect(jogador(depois, B).guarda).toBe(1);
    expect(marcaDe(depois, A)).toBe(true);
  });

  it('RU03 Caçada sem Saída aplica a Marca e prepara o próximo Ataque', () => {
    const base = duelo(patrulheiro(['R03'], { ultimate: 'RU03' }), guerreiro, A);
    const cacada = jogar(base, A, { pedido: { carta: 'RU03' as never } }).partida;
    expect(marcaDe(cacada, A)).toBe(true);

    const apAntes = jogador(cacada, A).pontosDeAcao;
    const { partida: depois } = jogar(cacada, A, { pedido: { carta: 'R03' as never } });
    // Flecha de Caça custa 2 AP; com o desconto, sai por 1.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
    // 3 D impressos + 1 D da Caçada.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });
});
