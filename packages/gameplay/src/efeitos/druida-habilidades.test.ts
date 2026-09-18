import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comForma,
  duelo,
  formaDe,
  jogador,
  jogar,
  virarTurno,
} from '../teste-apoio.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Druida.
 *
 * A Forma é estado: os testes colocam o Druida na Forma que o texto pede e
 * conferem os dois lados quando a carta tem um para cada Forma.
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

describe('Druida — habilidades', () => {
  it('D01 Chicote de Raízes recebe +1 I na primeira Ação em Forma Humana', () => {
    const base = duelo(druida(['D01']), guerreiro, A);
    expect(formaDe(base, A)).toBe('humana');
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'D01' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 2);
  });

  it('D02 Espinhos Vivos soma +1 D depois da redução em Forma Humana', () => {
    const base = com(duelo(druida(['D02']), guerreiro, A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'D02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    // Aparar zera os 3 D impressos; os Espinhos somam 1 depois disso.
    expect(jogador(depois, B).vida).toBe(30 - 1);
  });

  it('D03 Raio da Tempestade recebe +1 I depois de uma Técnica em Forma Humana', () => {
    const base = duelo(druida(['D11', 'D03']), guerreiro, A);
    const tecnica = jogar(base, A, { pedido: { carta: 'D11' as never } }).partida;
    const guardaAntes = jogador(tecnica, B).guarda;
    const { partida: depois } = jogar(tecnica, A, { pedido: { carta: 'D03' as never } });
    // 1 I impresso + 1 I do Crescimento Súbito + 1 I do Raio.
    expect(guardaAntes - jogador(depois, B).guarda).toBe(3);
  });

  it('D04 Garra Selvagem recebe +1 D na Forma Selvagem', () => {
    const humano = duelo(druida(['D04']), guerreiro, A);
    const semBonus = jogar(humano, A, { pedido: { carta: 'D04' as never } });
    expect(jogador(semBonus.partida, B).vida).toBe(30 - 2);

    const feral = comForma(duelo(druida(['D04']), guerreiro, A), A, 'selvagem');
    const comBonus = jogar(feral, A, { pedido: { carta: 'D04' as never } });
    expect(jogador(comBonus.partida, B).vida).toBe(30 - 3);
  });

  it('D05 Mordida Predatória recebe +1 D Selvagem contra Guarda baixa', () => {
    const base = com(comForma(duelo(druida(['D05']), guerreiro, A), A, 'selvagem'), B, {
      guarda: 3,
    });
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'D05' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 5);
  });

  it('D06 Investida Bestial recebe +1 I Selvagem na primeira Ação ofensiva', () => {
    const base = comForma(duelo(druida(['D06']), guerreiro, A), A, 'selvagem');
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'D06' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 4);
  });

  it('D07 Garras Gêmeas recebem +2 D depois de agir Humano e se transformar', () => {
    const base = duelo(druida(['D01', 'D12', 'D07']), guerreiro, A);
    const humana = jogar(base, A, { pedido: { carta: 'D01' as never } }).partida;
    const virou = jogar(humana, A, { pedido: { carta: 'D12' as never } }).partida;
    expect(formaDe(virou, A)).toBe('selvagem');
    const antes = jogador(virou, B).vida;
    const { partida: depois } = jogar(virou, A, { pedido: { carta: 'D07' as never } });
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('D08 Golpe Totêmico recebe +1 D e +1 I se mudou de forma no turno', () => {
    const base = duelo(druida(['D12', 'D08']), guerreiro, A);
    const virou = jogar(base, A, { pedido: { carta: 'D12' as never } }).partida;
    const antes = jogador(virou, B).vida;
    const { partida: depois } = jogar(virou, A, { pedido: { carta: 'D08' as never } });
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('D09 Fúria da Tempestade dá +1 I Humana e +1 D Selvagem', () => {
    const humano = duelo(druida(['D09']), guerreiro, A);
    const comI = jogar(humano, A, { pedido: { carta: 'D09' as never } });
    expect(jogador(comI.partida, B).guarda).toBe(6 - 5);

    const feral = comForma(duelo(druida(['D09']), guerreiro, A), A, 'selvagem');
    const comD = jogar(feral, A, { pedido: { carta: 'D09' as never } });
    expect(jogador(comD.partida, B).vida).toBe(30 - 5);
  });

  it('D10 Predador da Lua recebe +2 D Selvagem na terceira Ação', () => {
    const base = comForma(duelo(druida(['D01', 'D04', 'D10']), guerreiro, A), A, 'selvagem');
    const uma = jogar(base, A, { pedido: { carta: 'D01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'D04' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'D10' as never } });
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('D11 Crescimento Súbito prepara o próximo Ataque e restaura Guarda Humana', () => {
    const base = com(duelo(druida(['D11', 'D01']), guerreiro, A), A, { guarda: 4 });
    const cresceu = jogar(base, A, { pedido: { carta: 'D11' as never } }).partida;
    expect(jogador(cresceu, A).guarda).toBe(5);
    const { partida: depois } = jogar(cresceu, A, { pedido: { carta: 'D01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('D12 Metamorfose Instintiva muda de forma e barateia a próxima Ação', () => {
    const base = duelo(druida(['D12', 'D09']), guerreiro, A);
    const virou = jogar(base, A, { pedido: { carta: 'D12' as never } }).partida;
    expect(formaDe(virou, A)).toBe('selvagem');
    const apAntes = jogador(virou, A).pontosDeAcao;
    const { partida: depois } = jogar(virou, A, { pedido: { carta: 'D09' as never } });
    // Fúria da Tempestade custa 3 AP; com o desconto, sai por 2.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });

  it('D13 Renovo Natural restaura 3 Humana e 2 Selvagem', () => {
    const humano = com(duelo(druida(['D13']), guerreiro, A), A, { vida: 20 });
    expect(jogador(jogar(humano, A, { pedido: { carta: 'D13' as never } }).partida, A).vida).toBe(
      23,
    );

    const feral = com(comForma(duelo(druida(['D13']), guerreiro, A), A, 'selvagem'), A, {
      vida: 20,
    });
    expect(jogador(jogar(feral, A, { pedido: { carta: 'D13' as never } }).partida, A).vida).toBe(
      22,
    );
  });

  it('D14 Casca de Carvalho reforça a primeira Resposta até o próximo turno', () => {
    const base = duelo(druida(['D14', 'D17']), guerreiro, A);
    const preparado = jogar(base, A, { pedido: { carta: 'D14' as never } }).partida;
    const proximo = virarTurno(preparado, A);
    const { partida: depois } = jogar(proximo, B, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'D17' as never },
    });
    expect(jogador(depois, A).vida).toBe(30);
    expect(jogador(depois, A).guarda).toBe(6 - 2);
  });

  it('D15 Lua Crescente transforma e guarda +2 D para o Ataque Selvagem', () => {
    const base = duelo(druida(['D15', 'D04']), guerreiro, A);
    const lua = jogar(base, A, { pedido: { carta: 'D15' as never } }).partida;
    expect(formaDe(lua, A)).toBe('selvagem');
    const { partida: depois } = jogar(lua, A, { pedido: { carta: 'D04' as never } });
    // 2 D impressos + 1 D Selvagem + 2 D da Lua Crescente.
    expect(jogador(depois, B).vida).toBe(30 - 5);
  });

  it('D16 Casca Reflexa restaura 1 Guarda ao impedir Ruptura em Forma Humana', () => {
    const base = com(duelo(guerreiro, druida(['D16']), A), B, { guarda: 2, reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'D16' as never },
    });
    expect(jogador(depois, B).guarda).toBeGreaterThanOrEqual(2);
  });

  it('D17 Instinto Feral reduz 3 D Humana e 4 D Selvagem', () => {
    const humano = com(duelo(guerreiro, druida(['D17']), A), B, { reserva: 2 });
    const comTres = jogar(humano, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'D17' as never },
    });
    expect(jogador(comTres.partida, B).vida).toBe(30);

    const feral = com(comForma(duelo(guerreiro, druida(['D17']), A), B, 'selvagem'), B, {
      reserva: 2,
    });
    const comQuatro = jogar(feral, A, {
      pedido: { carta: 'W11' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'D17' as never },
    });
    expect(jogador(comQuatro.partida, B).vida).toBe(30);
  });

  it('D18 Raízes Protetoras guardam +1 I quando o Impacto final é 0 em Forma Humana', () => {
    const base = com(duelo(guerreiro, druida(['D18', 'D01']), A), B, { reserva: 2 });
    const reagiu = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'D18' as never },
    }).partida;
    expect(jogador(reagiu, B).guarda).toBe(6);

    const proximo = virarTurno(reagiu, A);
    const guardaAntes = jogador(proximo, A).guarda;
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'D01' as never } });
    // 1 I impresso + 1 I da primeira Ação Humana + 1 I guardado.
    expect(guardaAntes - jogador(depois, A).guarda).toBe(3);
  });

  it('D19 Salto da Fera guarda +1 D quando zera o Dano em Forma Selvagem', () => {
    const base = com(comForma(duelo(guerreiro, druida(['D19', 'D04']), A), B, 'selvagem'), B, {
      reserva: 2,
    });
    const reagiu = jogar(base, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'D19' as never },
    }).partida;
    const proximo = virarTurno(reagiu, A);
    const { partida: depois } = jogar(proximo, B, { pedido: { carta: 'D04' as never } });
    // 2 D impressos + 1 D Selvagem + 1 D guardado.
    expect(jogador(depois, A).vida).toBe(30 - 4);
  });

  it('D20 Mudar com o Golpe muda de forma depois da resolução', () => {
    const base = com(duelo(guerreiro, druida(['D20']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'D20' as never,
        escolhas: { forma: 'selvagem' },
      },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(formaDe(depois, B)).toBe('selvagem');
  });
});
