import type { PlayerId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comRecurso,
  duelo,
  erroDe,
  jogador,
  jogar,
  momentumDe,
  virarTurno,
} from '../teste-apoio.js';
import { declarar, responder } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do Guerreiro.
 *
 * Os testes passam pela API autoritativa: nenhum deles informa custo, Dano ou
 * Impacto — eles informam a identidade da carta, e conferem o que o catálogo
 * mandou acontecer.
 */

const guerreiro = (habilidades: readonly string[]): ReturnType<typeof build> =>
  build('guerreiro', { habilidades });

/** O Mago do outro lado, com uma Reação barata na mão para os testes. */
const magoComReacao = build('mago', { habilidades: ['M15', 'M01', 'M02'] });

const vida = (partida: ReturnType<typeof duelo>, id: PlayerId): number => jogador(partida, id).vida;
const guarda = (partida: ReturnType<typeof duelo>, id: PlayerId): number =>
  jogador(partida, id).guarda;

describe('Guerreiro — habilidades', () => {
  it('W01 Corte de Sondagem dá 1 Momentum quando o adversário usa Reação', () => {
    const partida = duelo(guerreiro(['W01']), magoComReacao);
    const antes = momentumDe(partida, A);
    const { partida: depois } = jogar(partida, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M15' as never },
    });
    expect(momentumDe(depois, A)).toBe(antes + 1);
  });

  it('W02 Ombro de Guerra recebe +1 I na primeira Ação do turno', () => {
    const partida = duelo(guerreiro(['W02']), magoComReacao);
    const { eventos } = jogar(partida, A, { pedido: { carta: 'W02' as never } });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(3);
  });

  it('W02 não recebe o bônus quando não é a primeira Ação', () => {
    const inicial = duelo(guerreiro(['W01', 'W02']), magoComReacao);
    const { partida } = jogar(inicial, A, { pedido: { carta: 'W01' as never } });
    const { eventos } = jogar(partida, A, { pedido: { carta: 'W02' as never } });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(2);
  });

  it('W03 Quebra-Escudo dá 1 Momentum ao causar Ruptura', () => {
    // Guarda 1: o Impacto 3 rompe, mas remove só 1 de Guarda — então o ganho
    // vem da carta, e não da mecânica de Momentum por Guarda removida.
    const partida = com(duelo(guerreiro(['W03']), magoComReacao), B, { guarda: 1 });
    const { partida: depois, eventos } = jogar(partida, A, { pedido: { carta: 'W03' as never } });
    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(true);
    expect(momentumDe(depois, A)).toBe(1);
  });

  it('W04 Corte Ascendente recebe +2 D contra Guarda 0', () => {
    const partida = com(duelo(guerreiro(['W04']), magoComReacao), B, { guarda: 0 });
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'W04' as never } });
    expect(vida(depois, B)).toBe(30 - 6);
  });

  it('W05 Golpe do Carrasco recebe +1 D por Momentum gasto', () => {
    const partida = comRecurso(duelo(guerreiro(['W05']), magoComReacao), A, 2);
    const { partida: depois } = jogar(partida, A, {
      pedido: { carta: 'W05' as never, escolhas: { recursoAdicional: 2 } },
    });
    expect(vida(depois, B)).toBe(30 - 7);
    expect(momentumDe(depois, A)).toBe(0);
  });

  it('W06 Sequência Brutal recebe +2 D na terceira Ação', () => {
    const inicial = duelo(guerreiro(['W01', 'W07', 'W06']), magoComReacao);
    const primeira = jogar(inicial, A, { pedido: { carta: 'W01' as never } }).partida;
    const segunda = jogar(primeira, A, { pedido: { carta: 'W07' as never } }).partida;
    const antes = vida(segunda, B);
    const { partida: depois } = jogar(segunda, A, { pedido: { carta: 'W06' as never } });
    expect(antes - vida(depois, B)).toBe(5);
  });

  it('W07 Finta Cortante devolve 1 AP quando enfrenta uma Reação', () => {
    const partida = duelo(guerreiro(['W07']), magoComReacao);
    const { partida: depois, eventos } = jogar(partida, A, {
      pedido: { carta: 'W07' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M15' as never },
    });
    expect(eventos.some((evento) => evento.tipo === 'ap-recuperado')).toBe(true);
    expect(jogador(depois, A).pontosDeAcao).toBe(5);
  });

  it('W08 Golpe de Cerco troca o bônus de Ruptura por +3 D', () => {
    const partida = com(duelo(guerreiro(['W08']), magoComReacao), B, { guarda: 4 });
    const { partida: depois, eventos } = jogar(partida, A, { pedido: { carta: 'W08' as never } });
    const ruptura = eventos.find((evento) => evento.tipo === 'ruptura');
    expect(ruptura?.tipo === 'ruptura' ? ruptura.danoAdicional : 0).toBe(3);
    expect(vida(depois, B)).toBe(30 - 6);
  });

  it('W09 Corte Encadeado recebe +1 D e +1 I depois de um Ataque de 1 AP', () => {
    const inicial = duelo(guerreiro(['W01', 'W09']), magoComReacao);
    const primeira = jogar(inicial, A, { pedido: { carta: 'W01' as never } }).partida;
    const antes = vida(primeira, B);
    const { partida: depois, eventos } = jogar(primeira, A, { pedido: { carta: 'W09' as never } });
    expect(antes - vida(depois, B)).toBe(4);
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(2);
  });

  it('W10 Ataque de Oportunidade só é legal com a Guarda inimiga em 0', () => {
    const partida = duelo(guerreiro(['W10']), magoComReacao);
    expect(erroDe(declarar(partida, A, { carta: 'W10' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const semGuarda = com(partida, B, { guarda: 0 });
    const { partida: depois } = jogar(semGuarda, A, { pedido: { carta: 'W10' as never } });
    expect(vida(depois, B)).toBe(30 - 3);
  });

  it('W11 Pressão Implacável dá +2 I ao próximo Ataque e Momentum na Ruptura', () => {
    const partida = com(duelo(guerreiro(['W11', 'W01']), magoComReacao), B, { guarda: 3 });
    const comTecnica = jogar(partida, A, { pedido: { carta: 'W11' as never } }).partida;
    const { partida: depois, eventos } = jogar(comTecnica, A, {
      pedido: { carta: 'W01' as never },
    });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(3);
    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(true);
    // 1 pela mecânica de Guarda removida, 1 pela promessa da Técnica.
    expect(momentumDe(depois, A)).toBe(2);
  });

  it('W12 Disciplina de Aço dá 1 Momentum na hora e mais 1 ao fechar com Reserva 2', () => {
    const partida = duelo(guerreiro(['W12']), magoComReacao);
    const comTecnica = jogar(partida, A, { pedido: { carta: 'W12' as never } }).partida;
    expect(momentumDe(comTecnica, A)).toBe(1);

    // No fechamento: -1 pela mecânica (o turno não causou Dano nem Ruptura) e
    // +1 pela promessa da carta, porque o turno terminou com Reserva 2.
    const proximoTurno = virarTurno(comTecnica, A);
    expect(jogador(proximoTurno, A).reserva).toBe(2);
    expect(momentumDe(proximoTurno, A)).toBe(1);
  });

  it('W13 Finta Calculada dá +2 D quando o Ataque enfrenta Reação', () => {
    const partida = duelo(guerreiro(['W13', 'W01']), magoComReacao);
    const comTecnica = jogar(partida, A, { pedido: { carta: 'W13' as never } }).partida;
    const { partida: depois } = jogar(comTecnica, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M15' as never },
    });
    // 2 impressos + 2 da Finta, menos os 3 reduzidos pela Barreira de Mana.
    expect(vida(depois, B)).toBe(30 - 1);
  });

  it('W13 dá +2 I quando o Ataque não enfrenta Reação', () => {
    const partida = duelo(guerreiro(['W13', 'W01']), magoComReacao);
    const comTecnica = jogar(partida, A, { pedido: { carta: 'W13' as never } }).partida;
    const { eventos } = jogar(comTecnica, A, { pedido: { carta: 'W01' as never } });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(3);
  });

  it('W14 Guarda Preparada soma 1 Reserva além da conversão, sem passar de 2', () => {
    const partida = duelo(guerreiro(['W14', 'W08']), magoComReacao);
    const comTecnica = jogar(partida, A, { pedido: { carta: 'W14' as never } }).partida;
    // Sobram 4 AP; gastando 3 no Golpe de Cerco, resta 1 para converter.
    const gastando = jogar(comTecnica, A, { pedido: { carta: 'W08' as never } }).partida;
    expect(jogador(gastando, A).pontosDeAcao).toBe(1);
    const proximoTurno = virarTurno(gastando, A);
    expect(jogador(proximoTurno, A).reserva).toBe(2);
  });

  it('W15 Aparar reduz 3 D e dá Momentum quando zera o Dano final', () => {
    const partida = duelo(guerreiro(['W15']), magoComReacao, B);
    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'M01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    expect(vida(depois, A)).toBe(30);
    // 1 pela carta e 1 pela mecânica de anular Dano no turno inimigo.
    expect(momentumDe(depois, A)).toBe(2);
  });

  it('W16 Base Firme dá Momentum quando a redução impede a Ruptura', () => {
    const inicial = duelo(guerreiro(['W16']), magoComReacao, B);
    const partida = com(inicial, A, { guarda: 2 });
    const { partida: depois, eventos } = jogar(partida, B, {
      pedido: { carta: 'M04' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W16' as never },
    });
    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(false);
    expect(momentumDe(depois, A)).toBe(1);
  });

  it('W17 Absorver o Golpe dá Momentum quando ainda sobra Dano', () => {
    const partida = duelo(guerreiro(['W17']), magoComReacao, B);
    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'M02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W17' as never },
    });
    expect(vida(depois, A)).toBe(30 - 2);
    expect(momentumDe(depois, A)).toBe(1);
  });

  it('W18 Ripostar devolve 2 de Vida ao atacante quando zera o Dano', () => {
    const partida = duelo(guerreiro(['W18']), magoComReacao, B);
    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'M01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W18' as never },
    });
    expect(vida(depois, A)).toBe(30);
    expect(vida(depois, B)).toBe(30 - 2);
  });

  it('W19 Interposição reduz 1 D e 2 I', () => {
    const partida = duelo(guerreiro(['W19']), magoComReacao, B);
    const { partida: depois, eventos } = jogar(partida, B, {
      pedido: { carta: 'M04' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(1);
    expect(vida(depois, A)).toBe(30 - 1);
    expect(guarda(depois, A)).toBe(5);
  });

  it('W20 Último Bastião só responde a um Ataque que causaria Ruptura', () => {
    const comAmeaca = com(duelo(guerreiro(['W20']), magoComReacao, B), A, { guarda: 2 });
    const declarada = declarar(comAmeaca, B, { carta: 'M04' as never });
    const partidaDeclarada = declarada.ok ? declarada.valor.partida : comAmeaca;
    const respondida = responder(partidaDeclarada, A, 0, {
      tipo: 'carta-de-reacao',
      carta: 'W20' as never,
    });
    expect(respondida.ok).toBe(true);

    const semRuptura = duelo(guerreiro(['W20']), magoComReacao, B);
    const declarada2 = declarar(semRuptura, B, { carta: 'M01' as never });
    const base = declarada2.ok ? declarada2.valor.partida : semRuptura;
    expect(
      erroDe(responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'W20' as never })).tipo,
    ).toBe('condicao-de-uso-nao-satisfeita');
  });
});
