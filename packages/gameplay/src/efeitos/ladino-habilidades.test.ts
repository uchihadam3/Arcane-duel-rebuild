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
} from '../teste-apoio.js';
import { declarar, responder } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Ladino.
 *
 * A Brecha é moeda consumida de vez: os testes conferem quantas entram e
 * quantas saem, e nenhuma carta pode passar do teto impresso de três.
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

describe('Ladino — habilidades', () => {
  it('L01 Corte Rápido recebe +1 D na primeira Ação', () => {
    const partida = duelo(ladino(['L01']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'L01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('L02 Finta cria 1 Brecha sem Reação e devolve 1 AP com Reação', () => {
    const semReacao = duelo(ladino(['L02']), guerreiro, A);
    const { partida: comBrecha } = jogar(semReacao, A, { pedido: { carta: 'L02' as never } });
    expect(brechasDe(comBrecha, A)).toBe(1);

    const base = com(duelo(ladino(['L02']), guerreiro, A), B, { reserva: 2 });
    const apAntes = jogador(base, A).pontosDeAcao;
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'L02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    });
    expect(jogador(depois, A).pontosDeAcao).toBe(apAntes);
    expect(brechasDe(depois, A)).toBe(0);
  });

  it('L03 Corte Serrilhado aplica Sangramento 1 ao causar Dano à Vida', () => {
    const partida = duelo(ladino(['L03']), guerreiro, A);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'L03' as never } });
    expect(jogador(depois, B).condicoes.sangramento).toBe(1);
  });

  it('L04 Golpe nos Rins consome 1 Brecha e recebe +1 D na segunda Ação', () => {
    const base = comBrechas(duelo(ladino(['L01', 'L04']), guerreiro, A), A, 2);
    const primeira = jogar(base, A, { pedido: { carta: 'L01' as never } }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'L04' as never } });
    expect(antes - jogador(depois, B).vida).toBe(3);
    expect(brechasDe(depois, A)).toBe(brechasDe(primeira, A) - 1);
  });

  it('L04 é recusada sem Brecha para consumir', () => {
    const base = comBrechas(duelo(ladino(['L04']), guerreiro, A), A, 0);
    expect(erroDe(declarar(base, A, { carta: 'L04' as never })).tipo).toBe('recurso-insuficiente');
  });

  it('L05 Estocada Sombria recebe +2 D na primeira Ação sem Reação inimiga', () => {
    const base = comBrechas(duelo(ladino(['L05']), guerreiro, A), A, 2);
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'L05' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('L06 Punhalada Oportunista só sai contra Guarda 0', () => {
    const base = duelo(ladino(['L06']), guerreiro, A);
    expect(erroDe(declarar(base, A, { carta: 'L06' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const guardaZero = com(base, B, { guarda: 0 });
    const { partida: depois } = jogar(guardaZero, A, { pedido: { carta: 'L06' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('L07 Corte de Tendão recebe +1 I contra alvo com Sangramento', () => {
    const base = duelo(ladino(['L07']), guerreiro, A);
    const sangrando = com(base, B, {
      condicoes: { queimadura: 0, lento: 0, murchar: 0, sangramento: 1 },
    });
    const { partida: depois } = jogar(sangrando, A, { pedido: { carta: 'L07' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });

  it('L08 Execução Precisa recebe +1 D por Brecha consumida', () => {
    const base = comBrechas(duelo(ladino(['L08']), guerreiro, A), A, 3);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'L08' as never, escolhas: { recursoAdicional: 2 } },
    });
    expect(brechasDe(depois, A)).toBe(1);
    expect(jogador(depois, B).vida).toBe(30 - 6);
  });

  it('L09 Ataque de Desarme empurra uma carta adversária de CD1 para CD2', () => {
    const base = comBrechas(duelo(ladino(['L09']), guerreiro, A), A, 2);
    const comCd1 = com(base, B, { cooldown: { 1: ['W15' as never], 2: [], 3: [] } });
    const { partida: depois } = jogar(comCd1, A, {
      pedido: { carta: 'L09' as never, escolhas: { cartaAdversariaEmCooldown: 'W15' as never } },
    });
    expect(jogador(depois, B).cooldown[2]).toContain('W15');
  });

  it('L10 Golpe Final consome 2 Brechas e recebe +2 D na terceira Ação', () => {
    const base = comBrechas(duelo(ladino(['L01', 'L03', 'L10']), guerreiro, A), A, 3);
    const uma = jogar(base, A, { pedido: { carta: 'L01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'L03' as never } }).partida;
    const antes = jogador(duas, B).vida;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'L10' as never } });
    expect(antes - jogador(depois, B).vida).toBe(6);
  });

  it('L11 Preparar a Brecha cria 1 Brecha e dá +1 I ao próximo Ataque', () => {
    const base = duelo(ladino(['L11', 'L01']), guerreiro, A);
    const preparado = jogar(base, A, { pedido: { carta: 'L11' as never } }).partida;
    expect(brechasDe(preparado, A)).toBe(1);
    const { partida: depois } = jogar(preparado, A, { pedido: { carta: 'L01' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 2);
  });

  it('L12 Marcar o Alvo dá +2 D ao próximo Ataque que atingir a Vida', () => {
    const base = duelo(ladino(['L12', 'L01']), guerreiro, A);
    const marcado = jogar(base, A, { pedido: { carta: 'L12' as never } }).partida;
    const { partida: depois } = jogar(marcado, A, { pedido: { carta: 'L01' as never } });
    // 2 D impressos + 1 D da primeira Ação... a Marca soma mais 2.
    expect(jogador(depois, B).vida).toBe(30 - 4);
  });

  it('L13 Sabotagem exige exatamente um dos dois efeitos', () => {
    const base = comBrechas(duelo(ladino(['L13']), guerreiro, A), A, 2);
    const comCd1 = com(base, B, { cooldown: { 1: ['W15' as never], 2: [], 3: [] } });
    expect(erroDe(declarar(comCd1, A, { carta: 'L13' as never })).tipo).toBe('escolha-obrigatoria');

    const { partida: depois } = jogar(comCd1, A, {
      pedido: { carta: 'L13' as never, escolhas: { cartaAdversariaEmCooldown: 'W15' as never } },
    });
    expect(jogador(depois, B).cooldown[2]).toContain('W15');
  });

  it('L14 Passo Falso cria 1 Brecha quando o adversário não reage', () => {
    const base = duelo(ladino(['L14', 'L01']), guerreiro, A);
    const preparado = jogar(base, A, { pedido: { carta: 'L14' as never } }).partida;
    const { partida: depois } = jogar(preparado, A, { pedido: { carta: 'L01' as never } });
    expect(brechasDe(depois, A)).toBe(1);
  });

  it('L15 Esquiva cria 1 Brecha quando zera o Dano', () => {
    const base = com(duelo(guerreiro, ladino(['L15']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'L15' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(brechasDe(depois, B)).toBe(1);
  });

  it('L16 Adaga de Aparar tira 1 Vida do adversário e cria 1 Brecha', () => {
    const base = com(duelo(guerreiro, ladino(['L16']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'L16' as never },
    });
    expect(jogador(depois, A).vida).toBe(30 - 1);
    expect(brechasDe(depois, B)).toBe(1);
  });

  it('L17 Bomba de Fumaça tranca as Cartas de Classe inimigas naquela ação', () => {
    const base = com(duelo(guerreiro, ladino(['L17']), A), B, { reserva: 2 });
    const declarada = declarar(base, A, { carta: 'W01' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const respondida = responder(declarada.valor.partida, B, 0, {
      tipo: 'carta-de-reacao',
      carta: 'L17' as never,
    });
    expect(respondida.ok).toBe(true);
    if (!respondida.ok) return;
    expect(jogador(respondida.valor.partida, B).guarda).toBe(6);
  });

  it('L18 Escapar pelas Sombras devolve uma habilidade de CD1 à mão', () => {
    const base = comBrechas(duelo(guerreiro, ladino(['L18']), A), B, 2);
    const preparado = com(base, B, {
      reserva: 2,
      cooldown: { 1: ['L01' as never], 2: [], 3: [] },
    });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'L18' as never,
        escolhas: { cartaEmCooldown: 'L01' as never },
      },
    });
    expect(jogador(depois, B).mao).toContain('L01');
  });

  it('L19 Contra-ataque Sujo aplica Sangramento ao adversário quando zera o Dano', () => {
    const base = comBrechas(duelo(guerreiro, ladino(['L19']), A), B, 2);
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'L19' as never },
    });
    expect(jogador(depois, A).condicoes.sangramento).toBe(1);
  });

  it('L20 Instinto de Sobrevivência só sai contra Ataque letal', () => {
    const base = comBrechas(duelo(guerreiro, ladino(['L20']), A), B, 2);
    const saudavel = com(base, B, { reserva: 2 });
    const declarada = declarar(saudavel, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    expect(
      erroDe(
        responder(declarada.valor.partida, B, 0, {
          tipo: 'carta-de-reacao',
          carta: 'L20' as never,
        }),
      ).tipo,
    ).toBe('condicao-de-uso-nao-satisfeita');

    const morrendo = com(saudavel, B, { vida: 3, reserva: 2 });
    const { partida: depois } = jogar(morrendo, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'L20' as never },
    });
    expect(jogador(depois, B).vida).toBe(3);
  });
});
