import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  carta,
  com,
  duelo,
  erroDe,
  jogador,
  jogar,
  precoProibidoDe,
  virarTurno,
} from '../teste-apoio.js';
import { declarar } from '../partida.js';

/*
 * As dez Passivas, os três Pactos, as três Maldições e as três Ultimates do
 * Bruxo.
 */

const bruxo = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('bruxo', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

/** Passivas que não se revelam num duelo comum, para isolar a que é provada. */
const NEUTRAS = ['BRP03', 'BRP04', 'BRP05', 'BRP08'];

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

describe('Bruxo — Passivas', () => {
  it('BRP01 Sangue por Poder se revela no Preço Proibido e dá +1 I depois dele', () => {
    const base = duelo(
      bruxo(['BR05', 'BR02'], { passivas: ['BRP01', ...NEUTRAS.slice(0, 3)] }),
      guerreiro,
      A,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    });
    expect(estadoDaPassiva(depois, A, 'BRP01')).not.toBe('oculta');

    const jaRevelada = revelar(base, A, 'BRP01');
    const { partida: comBonus } = jogar(jaRevelada, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    });
    // 2 I impressos + 1 I do Sangue por Poder.
    expect(jogador(comBonus, B).guarda).toBe(3);
  });

  it('BRP02 Dor Familiar guarda +1 D ao chegar a 3 de Vida perdidos no turno', () => {
    const base = revelar(
      duelo(bruxo(['BR06', 'BR01'], { passivas: ['BRP02', ...NEUTRAS.slice(0, 3)] }), guerreiro, A),
      A,
      'BRP02',
    );
    const sangrou = jogar(base, A, {
      pedido: { carta: carta('BR06'), escolhas: { vidaOferecida: 3 } },
    }).partida;
    expect(jogador(sangrou, A).vida).toBe(27);
    const antes = jogador(sangrou, B).vida;
    const { partida: depois } = jogar(sangrou, A, { pedido: { carta: carta('BR01') } });
    // 2 D impressos + 1 D da Seta + 1 D da Dor Familiar.
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('BRP03 Pacto Profundo se revela na terceira Ativação e restaura 1 Vida depois dela', () => {
    const base = com(
      duelo(
        bruxo(['BR01', 'BR09', 'BR07'], {
          passivas: ['BRP03', 'BRP04', 'BRP05', 'BRP08'],
          cartasDeClasse: ['BRC01', 'BRC04'],
        }),
        guerreiro,
        A,
      ),
      A,
      { vida: 20 },
    );
    const comPacto = (
      partida: ReturnType<typeof duelo>,
      codigo: string,
    ): ReturnType<typeof duelo> =>
      jogar(partida, A, {
        pedido: {
          carta: carta(codigo),
          cartasDeClasse: [{ carta: carta('BRC01'), modo: 'ativar' }],
        },
      }).partida;

    const uma = comPacto(base, 'BR01');
    const duas = comPacto(virarTurno(virarTurno(uma, A), B), 'BR09');
    const tres = comPacto(virarTurno(virarTurno(duas, A), B), 'BR07');
    expect(estadoDaPassiva(tres, A, 'BRP03')).not.toBe('oculta');

    const quarta = comPacto(virarTurno(virarTurno(tres, A), B), 'BR01');
    expect(jogador(quarta, A).vida).toBe(21);
  });

  it('BRP04 Maldição Persistente se revela na terceira Ativação e promete +1 I', () => {
    const base = duelo(
      bruxo(['BR01', 'BR09', 'BR07', 'BR04'], {
        passivas: ['BRP04', 'BRP03', 'BRP05', 'BRP08'],
        cartasDeClasse: ['BRC05', 'BRC01'],
      }),
      guerreiro,
      A,
    );
    const comMaldicao = (
      partida: ReturnType<typeof duelo>,
      codigo: string,
    ): ReturnType<typeof duelo> =>
      jogar(partida, A, {
        pedido: {
          carta: carta(codigo),
          cartasDeClasse: [{ carta: carta('BRC05'), modo: 'ativar' }],
        },
      }).partida;

    const uma = comMaldicao(base, 'BR01');
    const duas = comMaldicao(virarTurno(virarTurno(uma, A), B), 'BR09');
    const tres = comMaldicao(virarTurno(virarTurno(duas, A), B), 'BR07');
    expect(estadoDaPassiva(tres, A, 'BRP04')).not.toBe('oculta');

    const proximo = virarTurno(virarTurno(tres, A), B);
    const ativou = comMaldicao(proximo, 'BR01');
    const guardaAntes = jogador(ativou, B).guarda;
    const { partida: depois } = jogar(ativou, A, { pedido: { carta: carta('BR04') } });
    // 1 I impresso + 1 I da Maldição Persistente.
    expect(guardaAntes - jogador(depois, B).guarda).toBe(2);
  });

  it('BRP05 Tudo Tem um Preço se revela fechando o turno com Preço pago e Reserva 2', () => {
    const base = duelo(
      bruxo(['BR05'], { passivas: ['BRP05', 'BRP03', 'BRP04', 'BRP08'] }),
      guerreiro,
      A,
    );
    const usou = jogar(base, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    }).partida;
    const virada = virarTurno(usou, A);
    expect(jogador(virada, A).reserva).toBe(2);
    expect(estadoDaPassiva(virada, A, 'BRP05')).not.toBe('oculta');
  });

  it('BRP05 já revelada restaura 1 Vida quando a situação se repete', () => {
    const base = revelar(
      com(
        duelo(bruxo(['BR05'], { passivas: ['BRP05', 'BRP03', 'BRP04', 'BRP08'] }), guerreiro, A),
        A,
        { vida: 20 },
      ),
      A,
      'BRP05',
    );
    const usou = jogar(base, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    }).partida;
    expect(jogador(usou, A).vida).toBe(19);
    const virada = virarTurno(usou, A);
    expect(jogador(virada, A).vida).toBe(20);
  });

  it('BRP06 Cicatriz do Abismo exige a escolha e reforça a habilidade que cobra Vida', () => {
    const base = revelar(
      com(
        duelo(bruxo(['BR02'], { passivas: ['BRP06', 'BRP03', 'BRP04', 'BRP08'] }), guerreiro, A),
        A,
        { vida: 14 },
      ),
      A,
      'BRP06',
    );
    const semEscolha = declarar(base, A, {
      carta: carta('BR02'),
      escolhas: { vidaOferecida: 1 },
    });
    expect(erroDe(semEscolha).tipo).toBe('escolha-obrigatoria');

    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('BR02'), escolhas: { vidaOferecida: 1, reforco: 'dano' } },
    });
    // 3 D impressos + 2 D do preço da Chama + 1 D da Cicatriz.
    expect(jogador(depois, B).vida).toBe(30 - 6);
    expect(jogador(depois, A).vida).toBe(13);
  });

  it('BRP07 Não Há Retorno troca 1 Vida adicional por +1 D uma vez por turno', () => {
    const base = revelar(
      com(
        duelo(bruxo(['BR01'], { passivas: ['BRP07', 'BRP03', 'BRP04', 'BRP08'] }), guerreiro, A),
        A,
        { vida: 9 },
      ),
      A,
      'BRP07',
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('BR01'), escolhas: { precoDaPassiva: true } },
    });
    // O preço da Passiva sai depois do texto da carta: a Seta já tinha
    // perguntado "já perdi Vida?" e ouvido que não.
    expect(jogador(depois, A).vida).toBe(8);
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('BRP08 Dor Compartilhada faz o adversário perder 1 Vida junto da Reação', () => {
    const base = revelar(
      com(
        duelo(guerreiro, bruxo(['BR18'], { passivas: ['BRP08', 'BRP03', 'BRP04', 'BRP05'] }), A),
        B,
        { reserva: 2 },
      ),
      B,
      'BRP08',
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'carta-de-reacao', carta: carta('BR18') },
    });
    // 1 de Vida do texto da carta e mais 1 da Passiva.
    expect(jogador(depois, A).vida).toBe(28);
    expect(jogador(depois, B).vida).toBe(29);
  });

  it('BRP09 Mestre das Barganhas prontifica uma Carta de Classe com 2 custos de Vida', () => {
    const base = revelar(
      comCartaDeClasseAtivada(
        duelo(
          bruxo(['BR11', 'BR02'], {
            passivas: ['BRP09', 'BRP03', 'BRP04', 'BRP05'],
            cartasDeClasse: ['BRC01', 'BRC04'],
          }),
          guerreiro,
          A,
        ),
        A,
        'BRC01',
      ),
      A,
      'BRP09',
    );
    const primeiro = jogar(base, A, { pedido: { carta: carta('BR11') } }).partida;
    expect(estadoDaCartaDeClasse(primeiro, A, 'BRC01')).toBe('ativada');

    const { partida: depois } = jogar(primeiro, A, {
      pedido: { carta: carta('BR02'), escolhas: { vidaOferecida: 1 } },
    });
    expect(estadoDaCartaDeClasse(depois, A, 'BRC01')).toBe('pronta');
  });

  it('BRP10 Último Contrato se revela abrindo o turno com 5 de Vida e restaura 2', () => {
    const base = com(
      duelo(bruxo(['BR05'], { passivas: ['BRP10', 'BRP03', 'BRP04', 'BRP08'] }), guerreiro, A),
      A,
      { vida: 4 },
    );
    const proximo = virarTurno(virarTurno(base, A), B);
    expect(estadoDaPassiva(proximo, A, 'BRP10')).not.toBe('oculta');
    expect(jogador(proximo, A).vida).toBe(6);

    const { partida: depois } = jogar(proximo, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    });
    // 5 D impressos + 1 D da Lança + 2 D do Último Contrato.
    expect(jogador(depois, B).vida).toBe(30 - 8);
  });
});

describe('Bruxo — Pactos e Maldições', () => {
  it('BRC01 Pacto de Sangue Ativado soma +1 D à ação que cobrou Vida', () => {
    const base = duelo(
      bruxo(['BR02'], { passivas: NEUTRAS, cartasDeClasse: ['BRC01', 'BRC04'] }),
      guerreiro,
      A,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('BR02'),
        escolhas: { vidaOferecida: 1 },
        cartasDeClasse: [{ carta: carta('BRC01'), modo: 'ativar' }],
      },
    });
    // 3 D impressos + 2 D do preço da Chama + 1 D do Pacto.
    expect(jogador(depois, B).vida).toBe(30 - 6);
    expect(jogador(depois, A).vida).toBe(29);
  });

  it('BRC01 Exaurido cobra 3 Vida por +4 D', () => {
    const base = duelo(
      bruxo(['BR01'], { passivas: NEUTRAS, cartasDeClasse: ['BRC01', 'BRC04'] }),
      guerreiro,
      A,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC01'), modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).vida).toBe(27);
    // 2 D impressos + 4 D do Pacto. A Seta não soma: o preço do Pacto sai
    // depois do texto dela, na mesma janela de declaração.
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('BRC02 Pacto das Sombras Ativado troca 1 Vida por +1 D e +1 I na Reação', () => {
    const base = com(
      duelo(
        guerreiro,
        bruxo(['BR16'], { passivas: NEUTRAS, cartasDeClasse: ['BRC02', 'BRC04'] }),
        A,
      ),
      B,
      { reserva: 2 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: carta('BR16'),
        escolhas: { vidaOferecida: 1 },
        cartasDeClasse: [{ carta: carta('BRC02'), modo: 'ativar' }],
      },
    });
    // O Escudo já zerava os 3 D; o Pacto tira 1 I dos 3 do Ombro.
    expect(jogador(depois, B).vida).toBe(29);
    expect(jogador(depois, B).guarda).toBe(4);
  });

  it('BRC02 Exaurido reduz +4 D e +2 I sem cobrar nada', () => {
    const base = com(
      duelo(
        guerreiro,
        bruxo(['BR17'], { passivas: NEUTRAS, cartasDeClasse: ['BRC02', 'BRC04'] }),
        A,
      ),
      B,
      { reserva: 2 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: carta('BR17'),
        cartasDeClasse: [{ carta: carta('BRC02'), modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('BRC03 Pacto do Abismo Ativado restaura 1 Vida na Ruptura', () => {
    const base = com(
      com(
        duelo(
          bruxo(['BR01'], { passivas: NEUTRAS, cartasDeClasse: ['BRC03', 'BRC04'] }),
          guerreiro,
          A,
        ),
        A,
        { vida: 20 },
      ),
      B,
      { guarda: 1 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC03'), modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(0);
    expect(jogador(depois, A).vida).toBe(21);
  });

  it('BRC03 Exaurido dá +3 I e restaura 3 Vida na Ruptura', () => {
    const base = com(
      com(
        duelo(
          bruxo(['BR01'], { passivas: NEUTRAS, cartasDeClasse: ['BRC03', 'BRC04'] }),
          guerreiro,
          A,
        ),
        A,
        { vida: 20 },
      ),
      B,
      { guarda: 4 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC03'), modo: 'exaurir' }],
      },
    });
    // 1 I impresso + 3 I do Pacto contra Guarda 4.
    expect(jogador(depois, B).guarda).toBe(0);
    expect(jogador(depois, A).vida).toBe(23);
  });

  it('BRC04 Maldição da Fragilidade pede Guarda 3 ou menos e dá +1 I', () => {
    const inteira = duelo(
      bruxo(['BR01'], { passivas: NEUTRAS, cartasDeClasse: ['BRC04', 'BRC01'] }),
      guerreiro,
      A,
    );
    const recusa = declarar(inteira, A, {
      carta: carta('BR01'),
      cartasDeClasse: [{ carta: carta('BRC04'), modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const trincada = com(inteira, B, { guarda: 3 });
    const { partida: depois } = jogar(trincada, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC04'), modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(1);
  });

  it('BRC04 Exaurida dá +2 D e +3 I contra Guarda baixa', () => {
    const base = com(
      duelo(
        bruxo(['BR01'], { passivas: NEUTRAS, cartasDeClasse: ['BRC04', 'BRC01'] }),
        guerreiro,
        A,
      ),
      B,
      { guarda: 3 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC04'), modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(0);
    // 2 D impressos + 2 D da Maldição + 2 D da Ruptura.
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('BRC05 Maldição da Fome Ativada tira 1 da cura do adversário', () => {
    const base = com(
      com(
        duelo(
          bruxo(['BR01'], { passivas: NEUTRAS, cartasDeClasse: ['BRC05', 'BRC01'] }),
          build('druida', { habilidades: ['D13'] }),
          A,
        ),
        B,
        { vida: 20 },
      ),
      A,
      { vida: 30 },
    );
    const ativou = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC05'), modo: 'ativar' }],
      },
    }).partida;
    const vidaAntes = jogador(ativou, B).vida;
    const turnoDele = virarTurno(ativou, A);
    const { partida: depois } = jogar(turnoDele, B, { pedido: { carta: carta('D13') } });
    // Renovo Natural restaura 3 em Forma Humana; a Fome deixa passar 2.
    expect(jogador(depois, B).vida).toBe(vidaAntes + 2);
  });

  it('BRC05 Exaurida corta 4 da cura e ainda cobra 1 de Vida', () => {
    const base = com(
      com(
        duelo(
          bruxo(['BR01'], { passivas: NEUTRAS, cartasDeClasse: ['BRC05', 'BRC01'] }),
          build('druida', { habilidades: ['D13'] }),
          A,
        ),
        B,
        { vida: 20 },
      ),
      A,
      { vida: 30 },
    );
    const exauriu = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC05'), modo: 'exaurir' }],
      },
    }).partida;
    const vidaAntes = jogador(exauriu, B).vida;
    const turnoDele = virarTurno(exauriu, A);
    const { partida: depois } = jogar(turnoDele, B, { pedido: { carta: carta('D13') } });
    // A cura de 3 vira 0 e a Fome ainda tira 1.
    expect(jogador(depois, B).vida).toBe(vidaAntes - 1);
  });

  it('BRC06 Maldição da Agonia Ativada cobra 1 Vida da segunda Ação inimiga', () => {
    const base = com(
      duelo(
        guerreiro,
        bruxo(['BR16'], { passivas: NEUTRAS, cartasDeClasse: ['BRC06', 'BRC01'] }),
        A,
      ),
      B,
      { reserva: 2 },
    );
    const primeira = jogar(base, A, { pedido: { carta: carta('W01') } }).partida;
    const vidaAntes = jogador(primeira, A).vida;
    const { partida: depois } = jogar(primeira, A, {
      pedido: { carta: carta('W02') },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: carta('BR16'),
        cartasDeClasse: [{ carta: carta('BRC06'), modo: 'ativar' }],
      },
    });
    expect(vidaAntes - jogador(depois, A).vida).toBe(1);
  });

  it('BRC06 Exaurida cobra 2 Vida na segunda Ação e mais 2 na terceira', () => {
    const base = com(
      duelo(
        guerreiro,
        bruxo(['BR16'], { passivas: NEUTRAS, cartasDeClasse: ['BRC06', 'BRC01'] }),
        A,
      ),
      B,
      { reserva: 2 },
    );
    const primeira = jogar(base, A, { pedido: { carta: carta('W01') } }).partida;
    const vidaAntes = jogador(primeira, A).vida;
    const segunda = jogar(primeira, A, {
      pedido: { carta: carta('W11') },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: carta('BR16'),
        cartasDeClasse: [{ carta: carta('BRC06'), modo: 'exaurir' }],
      },
    }).partida;
    expect(vidaAntes - jogador(segunda, A).vida).toBe(2);

    const { partida: terceira } = jogar(segunda, A, { pedido: { carta: carta('W03') } });
    expect(vidaAntes - jogador(terceira, A).vida).toBe(4);
  });
});

describe('Bruxo — Ultimates', () => {
  it('BRU01 Condenação soma +2 D a cada 2 Vida oferecidos', () => {
    const base = duelo(bruxo(['BR01'], { passivas: NEUTRAS, ultimate: 'BRU01' }), guerreiro, A);
    const seco = jogar(base, A, { pedido: { carta: carta('BRU01') } });
    expect(jogador(seco.partida, B).vida).toBe(30 - 7);
    expect(jogador(seco.partida, A).vida).toBe(30);

    const sangrento = jogar(base, A, {
      pedido: { carta: carta('BRU01'), escolhas: { vidaOferecida: 4 } },
    });
    expect(jogador(sangrento.partida, A).vida).toBe(26);
    expect(jogador(sangrento.partida, B).vida).toBe(30 - 11);
  });

  it('BRU01 ignora a Vida ímpar que não fecha um par', () => {
    const base = duelo(bruxo(['BR01'], { passivas: NEUTRAS, ultimate: 'BRU01' }), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('BRU01'), escolhas: { vidaOferecida: 3 } },
    });
    expect(jogador(depois, A).vida).toBe(27);
    // 7 D impressos + 2 D do único par fechado.
    expect(jogador(depois, B).vida).toBe(30 - 9);
  });

  it('BRU02 Contrato Final devolve dois usos do Preço Proibido e prontifica', () => {
    const base = comCartaDeClasseAtivada(
      duelo(
        bruxo(['BR05', 'BR02'], {
          passivas: NEUTRAS,
          cartasDeClasse: ['BRC01', 'BRC04'],
          ultimate: 'BRU02',
        }),
        guerreiro,
        A,
      ),
      A,
      'BRC01',
    );
    const usou = jogar(base, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    }).partida;
    expect(precoProibidoDe(usou, A)).toBe(false);

    const contrato = jogar(usou, A, { pedido: { carta: carta('BRU02') } }).partida;
    const apAntes = jogador(contrato, A).pontosDeAcao;
    const { partida: depois } = jogar(contrato, A, {
      pedido: { carta: carta('BR02'), escolhas: { precoProibido: true } },
    });
    // A Chama custa 2 AP e sai por 1, mesmo com o uso do turno já gasto.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
    expect(estadoDaCartaDeClasse(depois, A, 'BRC01')).toBe('pronta');
  });

  it('BRU03 O Preço Não é Meu zera o Ataque e cobra 3 Vida depois', () => {
    const base = com(
      duelo(guerreiro, bruxo(['BR16'], { passivas: NEUTRAS, ultimate: 'BRU03' }), A),
      B,
      { reserva: 2 },
    );
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'carta-de-reacao', carta: carta('BRU03') },
    });
    expect(jogador(depois, B).guarda).toBe(6);
    expect(jogador(depois, B).vida).toBe(27);
  });

  it('BRU03 é recusada quando os 3 de Vida derrotariam o Bruxo', () => {
    const base = com(
      duelo(guerreiro, bruxo(['BR16'], { passivas: NEUTRAS, ultimate: 'BRU03' }), A),
      B,
      { vida: 3, reserva: 2 },
    );
    const declarada = declarar(base, A, { carta: carta('W02') });
    expect(declarada.ok).toBe(true);
  });
});
