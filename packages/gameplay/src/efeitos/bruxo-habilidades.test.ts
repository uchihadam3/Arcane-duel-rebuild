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
 * Uma prova de comportamento para cada uma das vinte habilidades do Bruxo.
 *
 * A moeda dele é a própria Vida, então quase toda prova olha para dois números:
 * o que saiu do adversário e o que o Bruxo pagou por isso.
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

/** Passivas que não interferem: nenhuma delas se revela num duelo comum. */
const NEUTRAS = ['BRP03', 'BRP04', 'BRP05', 'BRP08'];

const comPassivasNeutras = (habilidades: readonly string[]): ReturnType<typeof build> =>
  bruxo(habilidades, { passivas: NEUTRAS });

describe('Bruxo — habilidades', () => {
  it('BR01 Seta Sombria recebe +1 D depois de um preço em Vida no mesmo turno', () => {
    const base = duelo(comPassivasNeutras(['BR11', 'BR01']), guerreiro, A);
    const sangrou = jogar(base, A, { pedido: { carta: carta('BR11') } }).partida;
    expect(jogador(sangrou, A).vida).toBe(28);
    const antes = jogador(sangrou, B).vida;
    const { partida: depois } = jogar(sangrou, A, { pedido: { carta: carta('BR01') } });
    // 2 D impressos + 1 D da Seta + 2 D prometidos por Assinar com Sangue.
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('BR02 Chama Profana troca 1 Vida por +2 D, e sem o preço fica nos 3 D', () => {
    const base = duelo(comPassivasNeutras(['BR02']), guerreiro, A);
    const semPreco = jogar(base, A, { pedido: { carta: carta('BR02') } });
    expect(jogador(semPreco.partida, B).vida).toBe(30 - 3);
    expect(jogador(semPreco.partida, A).vida).toBe(30);

    const comPreco = jogar(base, A, {
      pedido: { carta: carta('BR02'), escolhas: { vidaOferecida: 1 } },
    });
    expect(jogador(comPreco.partida, B).vida).toBe(30 - 5);
    expect(jogador(comPreco.partida, A).vida).toBe(29);
  });

  it('BR03 Correntes do Abismo troca 1 Vida por +2 I', () => {
    const base = duelo(comPassivasNeutras(['BR03']), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('BR03'), escolhas: { vidaOferecida: 1 } },
    });
    // 3 I impressos + 2 I do preço contra Guarda 6.
    expect(jogador(depois, B).guarda).toBe(1);
    expect(jogador(depois, A).vida).toBe(29);
  });

  it('BR04 Dreno Vital restaura 1, e 2 se já houve preço em Vida no turno', () => {
    const magro = com(duelo(comPassivasNeutras(['BR04']), guerreiro, A), A, { vida: 20 });
    const sozinho = jogar(magro, A, { pedido: { carta: carta('BR04') } });
    expect(jogador(sozinho.partida, A).vida).toBe(21);

    const comSangue = com(duelo(comPassivasNeutras(['BR11', 'BR04']), guerreiro, A), A, {
      vida: 20,
    });
    const sangrou = jogar(comSangue, A, { pedido: { carta: carta('BR11') } }).partida;
    expect(jogador(sangrou, A).vida).toBe(18);
    const { partida: depois } = jogar(sangrou, A, { pedido: { carta: carta('BR04') } });
    expect(jogador(depois, A).vida).toBe(20);
  });

  it('BR05 Lança Profana recebe +1 D quando o Preço Proibido pagou a jogada', () => {
    const base = duelo(comPassivasNeutras(['BR05']), guerreiro, A);
    const semPreco = jogar(base, A, { pedido: { carta: carta('BR05') } });
    expect(jogador(semPreco.partida, B).vida).toBe(30 - 5);

    const apAntes = jogador(base, A).pontosDeAcao;
    const comPreco = jogar(base, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    });
    // 3 AP impressos viram 2 AP, e a Vida paga o desconto.
    expect(apAntes - jogador(comPreco.partida, A).pontosDeAcao).toBe(2);
    expect(jogador(comPreco.partida, A).vida).toBe(29);
    expect(jogador(comPreco.partida, B).vida).toBe(30 - 6);
    expect(precoProibidoDe(comPreco.partida, A)).toBe(false);
  });

  it('BR06 Fogo Infernal soma +1 D por Vida perdida, até três', () => {
    const base = duelo(comPassivasNeutras(['BR06']), guerreiro, A);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('BR06'), escolhas: { vidaOferecida: 3 } },
    });
    expect(jogador(depois, A).vida).toBe(27);
    expect(jogador(depois, B).vida).toBe(30 - 8);

    const demais = declarar(base, A, {
      carta: carta('BR06'),
      escolhas: { vidaOferecida: 4 },
    });
    expect(erroDe(demais).tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('BR07 Marca Dolorosa recebe +2 D depois de a Maldição ser Ativada no turno', () => {
    const base = com(
      duelo(
        bruxo(['BR01', 'BR07'], { passivas: NEUTRAS, cartasDeClasse: ['BRC04', 'BRC01'] }),
        guerreiro,
        A,
      ),
      B,
      { guarda: 2 },
    );
    const ativou = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC04'), modo: 'ativar' }],
      },
    }).partida;
    const antes = jogador(ativou, B).vida;
    const { partida: depois } = jogar(ativou, A, { pedido: { carta: carta('BR07') } });
    // 3 D impressos + 2 D da Marca.
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('BR08 Ruptura do Pacto recebe +1 I com o Pacto Ativado', () => {
    const base = duelo(
      bruxo(['BR01', 'BR08'], { passivas: NEUTRAS, cartasDeClasse: ['BRC01', 'BRC04'] }),
      guerreiro,
      A,
    );
    const ativou = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC01'), modo: 'ativar' }],
      },
    }).partida;
    const guardaAntes = jogador(ativou, B).guarda;
    const { partida: depois } = jogar(ativou, A, { pedido: { carta: carta('BR08') } });
    // 3 I impressos + 1 I do Pacto Ativado.
    expect(guardaAntes - jogador(depois, B).guarda).toBe(4);
  });

  it('BR09 Cobrar o Preço recebe +2 D com 2 de Vida já perdidos no turno', () => {
    const base = duelo(comPassivasNeutras(['BR11', 'BR09']), guerreiro, A);
    const sozinho = jogar(base, A, { pedido: { carta: carta('BR09') } });
    expect(jogador(sozinho.partida, B).vida).toBe(30 - 2);

    const sangrou = jogar(base, A, { pedido: { carta: carta('BR11') } }).partida;
    const antes = jogador(sangrou, B).vida;
    const { partida: depois } = jogar(sangrou, A, { pedido: { carta: carta('BR09') } });
    // 2 D impressos + 2 D do Preço + 2 D prometidos por Assinar com Sangue.
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('BR10 Boca do Abismo restaura 1 Vida na Ruptura, ou prontifica a Maldição', () => {
    const magro = com(com(duelo(comPassivasNeutras(['BR10']), guerreiro, A), A, { vida: 20 }), B, {
      guarda: 2,
    });
    const { partida: curou } = jogar(magro, A, { pedido: { carta: carta('BR10') } });
    expect(jogador(curou, A).vida).toBe(21);

    const comMaldicao = com(
      duelo(
        bruxo(['BR01', 'BR10'], { passivas: NEUTRAS, cartasDeClasse: ['BRC05', 'BRC01'] }),
        guerreiro,
        A,
      ),
      B,
      { guarda: 4 },
    );
    const ativou = jogar(comMaldicao, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC05'), modo: 'ativar' }],
      },
    }).partida;
    expect(jogador(ativou, B).guarda).toBe(3);
    const { partida: depois } = jogar(ativou, A, {
      pedido: { carta: carta('BR10'), escolhas: { escolhaDoAbismo: 'maldicao' } },
    });
    expect(jogador(depois, A).cartasDeClasse.find((item) => item.carta === 'BRC05')?.estado).toBe(
      'pronta',
    );
  });

  it('BR11 Assinar com Sangue cobra 2 Vida e promete +2 D e +1 I', () => {
    const base = duelo(comPassivasNeutras(['BR11', 'BR01']), guerreiro, A);
    const assinou = jogar(base, A, { pedido: { carta: carta('BR11') } }).partida;
    expect(jogador(assinou, A).vida).toBe(28);
    const guardaAntes = jogador(assinou, B).guarda;
    const { partida: depois } = jogar(assinou, A, { pedido: { carta: carta('BR01') } });
    // A Seta ganha 2 D do contrato e 1 D do próprio texto, e 1 I do contrato.
    expect(jogador(depois, B).vida).toBe(30 - 5);
    expect(guardaAntes - jogador(depois, B).guarda).toBe(2);
  });

  it('BR12 Invocar o Pacto deixa o Pacto Pronto e cobra 1 Vida', () => {
    const base = duelo(
      bruxo(['BR01', 'BR12'], { passivas: NEUTRAS, cartasDeClasse: ['BRC01', 'BRC04'] }),
      guerreiro,
      A,
    );
    const ativou = jogar(base, A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC01'), modo: 'ativar' }],
      },
    }).partida;
    expect(jogador(ativou, A).cartasDeClasse.find((item) => item.carta === 'BRC01')?.estado).toBe(
      'ativada',
    );

    const { partida: depois } = jogar(ativou, A, { pedido: { carta: carta('BR12') } });
    expect(jogador(depois, A).cartasDeClasse.find((item) => item.carta === 'BRC01')?.estado).toBe(
      'pronta',
    );
    expect(jogador(depois, A).vida).toBe(29);
  });

  it('BR13 Apertar a Maldição prontifica a Maldição e promete +1 I', () => {
    const base = duelo(
      bruxo(['BR01', 'BR13'], { passivas: NEUTRAS, cartasDeClasse: ['BRC04', 'BRC01'] }),
      guerreiro,
      A,
    );
    const ativou = jogar(com(base, B, { guarda: 2 }), A, {
      pedido: {
        carta: carta('BR01'),
        cartasDeClasse: [{ carta: carta('BRC04'), modo: 'ativar' }],
      },
    }).partida;
    const { partida: depois } = jogar(ativou, A, { pedido: { carta: carta('BR13') } });
    expect(jogador(depois, A).cartasDeClasse.find((item) => item.carta === 'BRC04')?.estado).toBe(
      'pronta',
    );
  });

  it('BR14 Roubar Fôlego restaura 1, e 3 depois de um preço em Vida', () => {
    const seco = com(duelo(comPassivasNeutras(['BR14']), guerreiro, A), A, { vida: 20 });
    expect(jogador(jogar(seco, A, { pedido: { carta: carta('BR14') } }).partida, A).vida).toBe(21);

    const sangrado = com(duelo(comPassivasNeutras(['BR11', 'BR14']), guerreiro, A), A, {
      vida: 20,
    });
    const sangrou = jogar(sangrado, A, { pedido: { carta: carta('BR11') } }).partida;
    const { partida: depois } = jogar(sangrou, A, { pedido: { carta: carta('BR14') } });
    expect(jogador(depois, A).vida).toBe(21);
  });

  it('BR15 Pacto Apressado devolve um uso do Preço Proibido no mesmo turno', () => {
    const base = duelo(comPassivasNeutras(['BR05', 'BR15', 'BR02']), guerreiro, A);
    const usou = jogar(base, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    }).partida;
    expect(precoProibidoDe(usou, A)).toBe(false);

    const recusa = declarar(usou, A, {
      carta: carta('BR02'),
      escolhas: { precoProibido: true },
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const apressado = jogar(usou, A, { pedido: { carta: carta('BR15') } }).partida;
    const apAntes = jogador(apressado, A).pontosDeAcao;
    const { partida: depois } = jogar(apressado, A, {
      pedido: { carta: carta('BR02'), escolhas: { precoProibido: true } },
    });
    // A Chama custa 2 AP e sai por 1.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('BR16 Escudo Sombrio reduz 3 D', () => {
    const base = com(duelo(guerreiro, comPassivasNeutras(['BR16']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'carta-de-reacao', carta: carta('BR16') },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('BR17 Correntes Defensivas reduzem 3 I', () => {
    const base = com(duelo(guerreiro, comPassivasNeutras(['BR17']), A), B, {
      guarda: 2,
      reserva: 2,
    });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'carta-de-reacao', carta: carta('BR17') },
    });
    // O Ombro passa 3 I; as Correntes zeram e a Guarda sobrevive.
    expect(jogador(depois, B).guarda).toBe(2);
  });

  it('BR18 Transferir a Dor reduz 3 D e tira 1 Vida dos dois', () => {
    const base = com(duelo(guerreiro, comPassivasNeutras(['BR18']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'carta-de-reacao', carta: carta('BR18') },
    });
    expect(jogador(depois, B).vida).toBe(29);
    expect(jogador(depois, A).vida).toBe(29);
  });

  it('BR19 Pele do Abismo reduz 2 D e 3 I, e +2 D por 1 Vida', () => {
    const base = com(duelo(guerreiro, comPassivasNeutras(['BR19']), A), B, {
      guarda: 2,
      reserva: 2,
    });
    const semPreco = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'carta-de-reacao', carta: carta('BR19') },
    });
    // O Ombro passa 3 D; a Pele tira 2.
    expect(jogador(semPreco.partida, B).vida).toBe(29);

    const comPreco = jogar(base, A, {
      pedido: { carta: carta('W02') },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: carta('BR19'),
        escolhas: { vidaOferecida: 1 },
      },
    });
    // O Dano zera e sobra só o preço em Vida.
    expect(jogador(comPreco.partida, B).vida).toBe(29);
  });

  it('BR20 Sobreviver ao Preço só responde ao Ataque que derrotaria o Bruxo', () => {
    const folgado = com(duelo(guerreiro, comPassivasNeutras(['BR20']), A), B, { reserva: 2 });
    const declarada = declarar(folgado, A, { carta: carta('W02') });
    const emJogo = declarada.ok ? declarada.valor.partida : folgado;
    const recusa = declarar(emJogo, A, { carta: carta('W01') });
    expect(recusa.ok).toBe(true);

    const beirada = com(duelo(guerreiro, comPassivasNeutras(['BR20']), A), B, {
      vida: 3,
      reserva: 2,
    });
    const { partida: depois } = jogar(beirada, A, {
      pedido: { carta: carta('W02') },
      resposta: { tipo: 'carta-de-reacao', carta: carta('BR20') },
    });
    expect(jogador(depois, B).vida).toBe(3);
    expect(depois.desfecho).toBeNull();
  });
});

describe('Bruxo — Preço Proibido', () => {
  it('vale uma vez por próprio turno e volta no turno seguinte', () => {
    const base = duelo(comPassivasNeutras(['BR05', 'BR02']), guerreiro, A);
    const usou = jogar(base, A, {
      pedido: { carta: carta('BR05'), escolhas: { precoProibido: true } },
    }).partida;
    expect(precoProibidoDe(usou, A)).toBe(false);

    const proximo = virarTurno(virarTurno(usou, A), B);
    expect(precoProibidoDe(proximo, A)).toBe(true);
  });

  it('recusa carta de custo impresso menor que 2 AP', () => {
    const base = duelo(comPassivasNeutras(['BR01']), guerreiro, A);
    const recusa = declarar(base, A, {
      carta: carta('BR01'),
      escolhas: { precoProibido: true },
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('recusa quando a Vida não dá para pagar', () => {
    const base = com(duelo(comPassivasNeutras(['BR05']), guerreiro, A), A, { vida: 1 });
    const recusa = declarar(base, A, {
      carta: carta('BR05'),
      escolhas: { precoProibido: true },
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');
  });
});
