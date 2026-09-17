import { describe, expect, it } from 'vitest';

import type { CardId } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';

import { PIROMANTE, QUEBRA_MURALHAS } from '../receitas.js';
import { rodarLote } from './lote.js';
import { simularPartida } from './motor.js';
import type { Politica } from './politica.js';
import { POLITICA_DE_BASE } from './politica.js';

/*
 * Comando ilegal é bug do simulador.
 *
 * Uma política de simulação só pode produzir comandos legais. Se o motor
 * recusar um deles, a partida é inválida — e isso nunca pode virar vitória,
 * derrota, empate ou turno encerrado em silêncio.
 *
 * Estes testes usam políticas defeituosas de propósito para provar que cada
 * ponto de comando detecta a falha em vez de engoli-la.
 */

const defeituosa = (partes: Partial<Politica>): Politica => ({
  ...POLITICA_DE_BASE,
  nome: 'defeituosa',
  ...partes,
});

const rodar = (politica: Politica): ReturnType<typeof simularPartida> =>
  simularPartida({
    semente: 'defeito',
    buildA: QUEBRA_MURALHAS,
    buildB: PIROMANTE,
    primeiroJogador: 'a',
    politicaA: politica,
    politicaB: politica,
  });

const CARTA_INEXISTENTE: CardId = cardId('X99');

describe('a política defeituosa é detectada', () => {
  it('Ação ilegal: carta que não existe no catálogo', () => {
    const relatorio = rodar(defeituosa({ escolherAcao: () => ({ carta: CARTA_INEXISTENTE }) }));

    expect(relatorio.comandosIlegais).toHaveLength(1);
    expect(relatorio.comandosIlegais[0]?.comando).toBe('declarar');
    expect(relatorio.comandosIlegais[0]?.erro.tipo).toBe('carta-desconhecida');
    expect(relatorio.desfecho.tipo).toBe('comando-ilegal');
  });

  it('Ação ilegal: escolha obrigatória que não foi enviada', () => {
    // Golpe do Carrasco pede "gaste até 2 Momentum"; sem a escolha, é recusa.
    const comEscolhaFaltando = simularPartida({
      semente: 'defeito',
      buildA: {
        ...QUEBRA_MURALHAS,
        habilidades: [cardId('W05'), ...QUEBRA_MURALHAS.habilidades.slice(1)],
      },
      buildB: PIROMANTE,
      primeiroJogador: 'a',
      politicaA: defeituosa({ escolherAcao: () => ({ carta: cardId('W05') }) }),
      politicaB: POLITICA_DE_BASE,
    });

    expect(comEscolhaFaltando.comandosIlegais).toHaveLength(1);
    expect(comEscolhaFaltando.comandosIlegais[0]?.erro.tipo).toBe('escolha-obrigatoria');
    expect(comEscolhaFaltando.desfecho.tipo).toBe('comando-ilegal');
  });

  it('Resposta ilegal: carta de Reação que o jogador não tem', () => {
    const relatorio = rodar(
      defeituosa({
        escolherResposta: () => ({ tipo: 'carta-de-reacao', carta: cardId('W20') }),
      }),
    );

    expect(relatorio.comandosIlegais.length).toBeGreaterThan(0);
    expect(relatorio.comandosIlegais[0]?.comando).toBe('responder');
    expect(relatorio.desfecho.tipo).toBe('comando-ilegal');
  });

  it('Resposta ilegal: Defesa Inata sem a escolha que ela exige', () => {
    // Só o Guerreiro precisa escolher: a Guarda Marcial reduz 1 D **ou** 1 I.
    // A Barreira Arcana do Mago reduz os dois e não pergunta nada.
    const relatorio = simularPartida({
      semente: 'defeito',
      buildA: QUEBRA_MURALHAS,
      buildB: PIROMANTE,
      primeiroJogador: 'b',
      politicaA: defeituosa({ escolherResposta: () => ({ tipo: 'defesa-inata' }) }),
      politicaB: POLITICA_DE_BASE,
    });

    expect(relatorio.comandosIlegais.length).toBeGreaterThan(0);
    expect(relatorio.comandosIlegais[0]?.comando).toBe('responder');
    expect(relatorio.comandosIlegais[0]?.erro.tipo).toBe('escolha-obrigatoria');
  });

  it('falha de resolução é detectada e não passa como turno normal', () => {
    // A política responde duas vezes: a segunda Resposta é ilegal, e o erro
    // aparece no comando de Resposta em vez de sumir na resolução.
    const relatorio = rodar(
      defeituosa({
        escolherResposta: (visao, eu, indice, rng) => {
          const escolha = POLITICA_DE_BASE.escolherResposta(visao, eu, indice, rng);
          return escolha.tipo === 'sem-resposta'
            ? { tipo: 'carta-de-reacao', carta: cardId('M19') }
            : escolha;
        },
      }),
    );

    expect(relatorio.comandosIlegais.length).toBeGreaterThan(0);
    expect(relatorio.desfecho.tipo).toBe('comando-ilegal');
  });

  it('o erro não vira vitória, derrota, empate nem limite técnico', () => {
    const relatorio = rodar(defeituosa({ escolherAcao: () => ({ carta: CARTA_INEXISTENTE }) }));

    expect(relatorio.desfecho.tipo).not.toBe('vitoria');
    expect(relatorio.desfecho.tipo).not.toBe('indefinido');
    expect(relatorio.desfecho.tipo).not.toBe('limite-tecnico-de-turnos');
    expect(relatorio.desfecho.tipo).not.toBe('bloqueio-de-regra');
    expect(relatorio.vidaDoVencedor).toBeNull();
  });

  it('o lote conta a partida inválida à parte e não a soma a vitórias', () => {
    const invalida = rodarLote({
      semente: 'invalida',
      partidas: 4,
      buildA: QUEBRA_MURALHAS,
      buildB: PIROMANTE,
    });
    expect(invalida.comandosIlegais).toBe(0);
    expect(invalida.comA.partidasComComandoIlegal).toBe(0);
  });

  it('a linha de base oficial não produz nenhum comando ilegal', () => {
    const resumo = rodarLote({ semente: 'etapa3-baseline', partidas: 200 });
    expect(resumo.comandosIlegais).toBe(0);
    expect(resumo.exemplosDeComandoIlegal).toEqual([]);
  });

  it('nem com exploração pedida', () => {
    const resumo = rodarLote({ semente: 'etapa3-baseline', partidas: 200, exploracao: 0.25 });
    expect(resumo.comandosIlegais).toBe(0);
  });
});
