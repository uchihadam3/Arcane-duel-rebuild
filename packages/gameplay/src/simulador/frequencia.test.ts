import { describe, expect, it } from 'vitest';

import { cardId } from '@arcane-duel/shared-types';

import { A, B, build, com, comRecurso, duelo, jogador, jogar, virarTurno } from '../teste-apoio.js';
import { ativarPassivaNaAcao, declarar } from '../partida.js';
import { PIROMANTE, QUEBRA_MURALHAS } from '../receitas.js';
import { rodarLote } from './lote.js';
import { simularPartida } from './motor.js';
import type { Politica } from './politica.js';
import { POLITICA_DE_BASE } from './politica.js';

/*
 * Frequência por carta: uma utilização real vale exatamente um.
 *
 * O ponto delicado é a Ultimate, que emite dois eventos pela mesma jogada —
 * `acao-declarada` (ou `resposta-registrada`) e `ultimate-consumida`. Só o
 * primeiro alimenta a frequência; o segundo alimenta apenas o contador próprio
 * de Ultimates.
 */

/** Roda uma partida com uma política fixa e devolve o relatório. */
const comPolitica = (politica: Partial<Politica>): ReturnType<typeof simularPartida> =>
  simularPartida({
    semente: 'frequencia',
    buildA: QUEBRA_MURALHAS,
    buildB: PIROMANTE,
    primeiroJogador: 'a',
    politicaA: { ...POLITICA_DE_BASE, ...politica },
    politicaB: { ...POLITICA_DE_BASE, ...politica },
  });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15'] });
const mago = build('mago', { habilidades: ['M01', 'M02', 'M15'] });

describe('cada uso conta exatamente uma vez', () => {
  it('uma Ultimate usada uma vez aparece 1 vez', () => {
    const partida = comRecurso(
      duelo(build('guerreiro', { habilidades: ['W01'], ultimate: 'WU01' }), mago),
      A,
      3,
    );
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'WU01' as never } });
    expect(jogador(depois, A).ultimate.estado).toBe('consumida');

    const relatorio = simularPartida({
      semente: 'ultimate',
      buildA: QUEBRA_MURALHAS,
      buildB: PIROMANTE,
      primeiroJogador: 'a',
    });

    // A Ultimate de cada lado é usada uma vez por partida: a frequência precisa
    // bater com o contador próprio, e não com o dobro dele.
    expect(relatorio.usoPorCarta.WU01).toBe(1);
    expect(relatorio.usoPorCarta.MU01).toBe(1);
    expect(relatorio.ultimatesUsadas).toBe(2);
  });

  it('uma Ultimate usada como Reação aparece 1 vez', () => {
    // Última Palavra é Reação: ela emite `resposta-registrada` e
    // `ultimate-consumida` pela mesma jogada, e só a primeira conta.
    const comUltimateDeReacao = build('guerreiro', {
      habilidades: ['W01', 'W02'],
      ultimate: 'WU02',
    });
    const inicial = duelo(comUltimateDeReacao, mago, B);
    const partida = comRecurso(inicial, A, 3);

    const { eventos } = jogar(partida, B, {
      pedido: { carta: 'M02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'WU02' as never },
    });

    const comoResposta = eventos.filter(
      (evento) =>
        evento.tipo === 'resposta-registrada' &&
        evento.resposta.tipo === 'carta-de-reacao' &&
        evento.resposta.perfil.carta === 'WU02',
    );
    const consumos = eventos.filter((evento) => evento.tipo === 'ultimate-consumida');
    expect(comoResposta).toHaveLength(1);
    expect(consumos).toHaveLength(1);
  });

  it('uma Ação normal usada uma vez aparece 1 vez', () => {
    const relatorio = comPolitica({
      escolherAcao: (visao, eu) => {
        const meu = visao.jogadores.find((jogador) => jogador.id === eu);
        const temOmbro = meu?.mao.some((carta) => carta.visivel && carta.carta === 'W02');
        return temOmbro === true ? { carta: cardId('W02'), escolhas: { reforco: 'dano' } } : null;
      },
    });
    // Ombro de Guerra é CD1: ele volta à mão e é jogado uma vez por turno do
    // Guerreiro. A frequência precisa bater com o número de declarações no log.
    const declaracoes = relatorio.eventos.filter(
      (evento) => evento.tipo === 'acao-declarada' && evento.carta === 'W02',
    ).length;
    expect(declaracoes).toBeGreaterThan(0);
    expect(relatorio.usoPorCarta.W02).toBe(declaracoes);
  });

  it('uma Reação usada uma vez aparece 1 vez', () => {
    const relatorio = simularPartida({
      semente: 'reacao',
      buildA: QUEBRA_MURALHAS,
      buildB: PIROMANTE,
      primeiroJogador: 'a',
    });
    const reacoesContadas = ['W15', 'W16', 'W19', 'M15', 'M17'].reduce(
      (total, carta) => total + (relatorio.usoPorCarta[carta] ?? 0),
      0,
    );
    expect(reacoesContadas).toBe(relatorio.respostasComCarta);
  });

  it('uma Carta de Classe Ativada uma vez aparece 1 vez', () => {
    const comRuna = build('mago', {
      habilidades: ['M01', 'M02'],
      cartasDeClasse: ['MC01', 'MC02'],
    });
    const partida = duelo(comRuna, guerreiro, A);
    const { eventos } = jogar(partida, A, {
      pedido: {
        carta: 'M01' as never,
        escolhas: { reforco: 'dano' },
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    });

    const ativacoes = eventos.filter((evento) => evento.tipo === 'carta-de-classe-ativada');
    expect(ativacoes).toHaveLength(1);
    // A Carta de Classe não emite `acao-declarada`: o único evento dela é o da
    // Ativação, e por isso ela conta uma vez só.
    const declaracoes = eventos.filter(
      (evento) => evento.tipo === 'acao-declarada' && evento.carta === 'MC01',
    );
    expect(declaracoes).toHaveLength(0);
  });

  it('uma Carta de Classe Exaurida uma vez aparece 1 vez', () => {
    const comRuna = build('mago', {
      habilidades: ['M01', 'M02'],
      cartasDeClasse: ['MC02', 'MC01'],
    });
    const inicial = duelo(comRuna, guerreiro, A);
    const partida = com(inicial, B, { guarda: 4 });
    const { eventos } = jogar(partida, A, {
      pedido: {
        carta: 'M01' as never,
        escolhas: { reforco: 'dano' },
        cartasDeClasse: [{ carta: 'MC02' as never, modo: 'exaurir' }],
      },
    });

    expect(eventos.filter((evento) => evento.tipo === 'carta-de-classe-exaurida')).toHaveLength(1);
  });

  it('uma Passiva revelada e depois Ativada conta os dois usos, sem repetir nenhum', () => {
    const comInstinto = build('guerreiro', {
      habilidades: ['W01', 'W15'],
      passivas: ['WP01', 'WP05', 'WP09', 'WP02'],
    });
    const inicial = duelo(comInstinto, build('mago', { habilidades: ['M04', 'M01'] }), B);
    const partida = comRecurso(com(inicial, A, { guarda: 1 }), A, 2);

    const declarada = declarar(partida, B, { carta: 'M04' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const revelacoes = declarada.ok
      ? declarada.valor.eventos.filter((evento) => evento.tipo === 'passiva-revelada')
      : [];
    expect(revelacoes).toHaveLength(1);

    const ativada = ativarPassivaNaAcao(base, A, 0, 'WP01' as never);
    const ativacoes = ativada.ok
      ? ativada.valor.eventos.filter((evento) => evento.tipo === 'passiva-ativada')
      : [];
    expect(ativacoes).toHaveLength(1);
    // Nenhum dos dois comandos emite o outro evento: revelar e Ativar são usos
    // distintos, cada um contado uma vez.
    expect(
      ativada.ok && ativada.valor.eventos.some((evento) => evento.tipo === 'passiva-revelada'),
    ).toBe(false);
  });

  it('nenhuma carta é contada duas vezes pelo mesmo uso', () => {
    const relatorio = simularPartida({
      semente: 'sem-duplicata',
      buildA: QUEBRA_MURALHAS,
      buildB: PIROMANTE,
      primeiroJogador: 'a',
    });

    // A soma da frequência precisa bater, evento por evento, com os usos reais
    // registrados no log — nem um a mais.
    const usosNoLog = relatorio.eventos.filter(
      (evento) =>
        evento.tipo === 'acao-declarada' ||
        evento.tipo === 'carta-de-classe-ativada' ||
        evento.tipo === 'carta-de-classe-exaurida' ||
        evento.tipo === 'passiva-revelada' ||
        evento.tipo === 'passiva-ativada' ||
        (evento.tipo === 'resposta-registrada' && evento.resposta.tipo === 'carta-de-reacao'),
    ).length;

    const somaDaFrequencia = Object.values(relatorio.usoPorCarta).reduce(
      (total, vezes) => total + vezes,
      0,
    );
    expect(somaDaFrequencia).toBe(usosNoLog);
  });

  it('no lote inteiro a frequência da Ultimate bate com o contador de Ultimates', () => {
    const resumo = rodarLote({ semente: 'etapa3-baseline', partidas: 200 });
    const daUltimate = (resumo.usoPorCarta.WU01 ?? 0) + (resumo.usoPorCarta.MU01 ?? 0);
    expect(daUltimate).toBe(resumo.ultimatesPorPartida * resumo.partidas);
  });
});

describe('usos distintos somam', () => {
  it('a mesma carta jogada em dois turnos conta duas vezes', () => {
    const inicial = duelo(guerreiro, mago);
    const primeira = jogar(inicial, A, { pedido: { carta: 'W01' as never } });
    const proximo = virarTurno(virarTurno(primeira.partida, A), B);
    const segunda = jogar(proximo, A, { pedido: { carta: 'W01' as never } });

    const declaracoes = [...primeira.eventos, ...segunda.eventos].filter(
      (evento) => evento.tipo === 'acao-declarada' && evento.carta === 'W01',
    );
    expect(declaracoes).toHaveLength(2);
  });
});
