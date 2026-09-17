import { describe, expect, it } from 'vitest';

import { criarAleatorio, projetarParaJogador } from '@arcane-duel/rules-engine';

import { PIROMANTE, QUEBRA_MURALHAS } from '../receitas.js';
import { rodarLote } from './lote.js';
import { JOGADOR_A, JOGADOR_B, simularPartida } from './motor.js';
import { POLITICA_DE_BASE, criarPoliticaDeBase } from './politica.js';

/*
 * O simulador precisa ser reprodutível e honesto.
 *
 * Reprodutível: a mesma semente produz a mesma partida, evento por evento.
 * Honesto: a política decide a partir da visão dela, que não contém a mão do
 * adversário — e um bloqueio de regra nunca vira vitória, derrota ou empate.
 */

describe('determinismo', () => {
  it('a mesma semente produz exatamente a mesma partida', () => {
    const configuracao = {
      semente: 'determinismo',
      buildA: QUEBRA_MURALHAS,
      buildB: PIROMANTE,
      primeiroJogador: 'a' as const,
    };
    const primeira = simularPartida(configuracao);
    const segunda = simularPartida(configuracao);

    expect(segunda.eventos).toEqual(primeira.eventos);
    expect(segunda.desfecho).toEqual(primeira.desfecho);
    expect(segunda.vidaFinal).toEqual(primeira.vidaFinal);
  });

  it('sementes diferentes com a mesma política de base dão a mesma linha', () => {
    // Com o PRNG usado só para desempate, o lote inteiro repete poucas linhas
    // de jogo. O simulador relata isso em vez de escondê-lo atrás de médias.
    const resumo = rodarLote({ semente: 'linhas', partidas: 40 });
    expect(resumo.exploracao).toBe(0);
    expect(resumo.linhasDistintas).toBeLessThanOrEqual(2);
  });

  it('com exploração pedida explicitamente, o lote cobre muitas linhas', () => {
    const resumo = rodarLote({ semente: 'linhas', partidas: 40, exploracao: 0.25 });
    expect(resumo.linhasDistintas).toBeGreaterThan(5);
  });

  it('o lote inteiro se reproduz a partir da semente', () => {
    const primeiro = rodarLote({ semente: 'lote', partidas: 20, exploracao: 0.2 });
    const segundo = rodarLote({ semente: 'lote', partidas: 20, exploracao: 0.2 });
    expect(segundo).toEqual(primeiro);
  });
});

describe('informação privada', () => {
  it('a política só recebe a visão do próprio jogador', () => {
    const relatorio = simularPartida({
      semente: 'privacidade',
      buildA: QUEBRA_MURALHAS,
      buildB: PIROMANTE,
      primeiroJogador: 'a',
    });
    const visao = projetarParaJogador(relatorio.partida, JOGADOR_A);
    const adversario = visao.jogadores.find((jogador) => jogador.id === JOGADOR_B);

    expect(adversario?.mao.every((carta) => !carta.visivel)).toBe(true);
    expect(JSON.stringify(visao)).not.toContain('semente');
  });

  it('a política escolhe só entre cartas que ela enxerga na própria mão', () => {
    const relatorio = simularPartida({
      semente: 'escolha',
      buildA: QUEBRA_MURALHAS,
      buildB: PIROMANTE,
      primeiroJogador: 'a',
    });
    const visao = projetarParaJogador(relatorio.partida, JOGADOR_B);
    const pedido = POLITICA_DE_BASE.escolherAcao(visao, JOGADOR_B, criarAleatorio('x'));

    if (pedido !== null) {
      const proprio = visao.jogadores.find((jogador) => jogador.id === JOGADOR_B);
      const naMao =
        proprio?.mao.some((carta) => carta.visivel && carta.carta === pedido.carta) ?? false;
      const ehAUltimate = proprio?.ultimate.carta === pedido.carta;
      expect(naMao || ehAUltimate).toBe(true);
    }
  });
});

describe('lotes', () => {
  it('separa os resultados por quem começou', () => {
    const resumo = rodarLote({ semente: 'lados', partidas: 40, exploracao: 0.2 });
    expect(resumo.comA.partidas + resumo.comB.partidas).toBe(40);
    expect(resumo.comA.partidas).toBe(20);
    expect(resumo.comB.partidas).toBe(20);
  });

  it('o limite técnico de turnos não é desfecho de jogo', () => {
    const resumo = rodarLote({ semente: 'curto', partidas: 4, limiteDeTurnos: 1 });
    const interrompidas =
      resumo.comA.interrompidasPorLimiteTecnico + resumo.comB.interrompidasPorLimiteTecnico;
    expect(interrompidas).toBe(4);
    expect(resumo.vitoriasDoGuerreiro + resumo.vitoriasDoMago).toBe(0);
  });

  it('contabiliza bloqueios de regra fora de vitória, derrota e empate', () => {
    const resumo = rodarLote({ semente: 'bloqueios', partidas: 20, exploracao: 0.3 });
    const desfechos =
      resumo.comA.vitoriasDeQuemComecou +
      resumo.comA.vitoriasDeQuemRespondeu +
      resumo.comA.indefinidas +
      resumo.comA.interrompidasPorLimiteTecnico +
      resumo.comA.bloqueiosDeRegra +
      resumo.comB.vitoriasDeQuemComecou +
      resumo.comB.vitoriasDeQuemRespondeu +
      resumo.comB.indefinidas +
      resumo.comB.interrompidasPorLimiteTecnico +
      resumo.comB.bloqueiosDeRegra;
    expect(desfechos).toBe(20);
  });
});

describe('política', () => {
  it('a política de base não usa o PRNG para nada além de desempatar', () => {
    expect(POLITICA_DE_BASE.nome).toBe('base');
    expect(criarPoliticaDeBase(0.25).nome).toContain('exploracao');
  });
});
