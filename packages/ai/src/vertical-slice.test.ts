import type { PlayerId, VisaoDaPartida } from '@arcane-duel/shared-types';
import { criarAleatorio, projetarParaJogador } from '@arcane-duel/rules-engine';
import {
  POLITICA_DE_BASE,
  RECEITAS_INICIAIS,
  abrirTurno,
  acoesLegais,
  iniciar,
  montarPartida,
  simularPartida,
} from '@arcane-duel/gameplay';
import { matchId, playerId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { criarIaDoSlice, tempoDePensamento } from './vertical-slice.js';

/*
 * A IA do vertical slice, conferida do jeito que importa.
 *
 * O que estes testes provam não é que ela joga bem — isso é julgamento, e quem
 * julga é quem joga contra ela. O que eles provam é que ela **não pode**
 * trapacear e **não pode** travar a partida: só enxerga a projeção, só propõe
 * comando que o motor aceita, e leva a partida até o fim.
 */

const GUERREIRO: PlayerId = playerId('guerreiro');
const MAGO: PlayerId = playerId('mago');

const partidaAberta = (primeiro: PlayerId = GUERREIRO): VisaoDaPartida => {
  const montada = montarPartida({
    id: matchId('teste-ia'),
    semente: 'ia',
    jogadores: [
      { id: GUERREIRO, build: RECEITAS_INICIAIS.guerreiro },
      { id: MAGO, build: RECEITAS_INICIAIS.mago },
    ],
  });
  if (!montada.ok) throw new Error('receita inválida');
  const iniciada = iniciar(montada.valor, primeiro);
  if (!iniciada.ok) throw new Error('não iniciou');
  const aberta = abrirTurno(iniciada.valor.partida, primeiro);
  if (!aberta.ok) throw new Error('não abriu o turno');
  return projetarParaJogador(aberta.valor.partida, primeiro);
};

describe('a IA só enxerga o que a projeção mostra', () => {
  it('recebe a mão do adversário sem identidade nenhuma', () => {
    const visao = partidaAberta();
    const adversario = visao.jogadores.find((jogador) => jogador.id !== GUERREIRO);
    expect(adversario).toBeDefined();
    // A projeção é o único dado que a IA lê. Se a identidade não está aqui,
    // não existe caminho por onde ela a conheça — não é disciplina, é ausência.
    for (const carta of adversario?.mao ?? []) {
      expect(carta.visivel).toBe(false);
      expect(Object.keys(carta)).not.toContain('carta');
    }
  });

  it('recebe as Passivas ocultas do adversário sem identidade', () => {
    const visao = partidaAberta();
    const adversario = visao.jogadores.find((jogador) => jogador.id !== GUERREIRO);
    for (const passiva of adversario?.passivas ?? []) {
      if (passiva.estado === 'oculta') expect(passiva.carta.visivel).toBe(false);
    }
  });

  it('não propõe carta que não está na própria mão', () => {
    const visao = partidaAberta();
    const eu = visao.jogadores.find((jogador) => jogador.id === GUERREIRO);
    const naMinhaMao = new Set(
      (eu?.mao ?? []).flatMap((carta) => (carta.visivel ? [String(carta.carta)] : [])),
    );
    if (eu?.ultimate.estado === 'disponivel') naMinhaMao.add(String(eu.ultimate.carta));

    const ia = criarIaDoSlice('guerreiro');
    const rng = criarAleatorio('escolha');
    for (let tentativa = 0; tentativa < 40; tentativa += 1) {
      const pedido = ia.escolherAcao(visao, GUERREIRO, rng);
      if (pedido === null) continue;
      expect(naMinhaMao.has(String(pedido.carta))).toBe(true);
    }
  });

  it('só propõe Ações que a enumeração de legalidade devolveu', () => {
    const visao = partidaAberta();
    const legais = new Set(acoesLegais(visao, GUERREIRO).map((item) => String(item.pedido.carta)));
    const ia = criarIaDoSlice('guerreiro');
    const pedido = ia.escolherAcao(visao, GUERREIRO, criarAleatorio('legal'));
    if (pedido !== null) expect(legais.has(String(pedido.carta))).toBe(true);
  });

  it('não gasta recurso que não tem', () => {
    const visao = partidaAberta(MAGO);
    const eu = visao.jogadores.find((jogador) => jogador.id === MAGO);
    const mana = eu?.recurso.classe === 'mago' ? eu.recurso.mana : 0;
    const ia = criarIaDoSlice('mago');
    const pedido = ia.escolherAcao(visao, MAGO, criarAleatorio('mana'));
    if (pedido === null) return;
    const candidata = acoesLegais(visao, MAGO).find((item) => item.pedido.carta === pedido.carta);
    const cobrado = candidata?.definicao.custo?.recurso?.quantidade ?? 0;
    expect(cobrado).toBeLessThanOrEqual(mana);
  });
});

describe('a IA joga e a partida termina', () => {
  it('Guerreiro contra Mago, dos dois lados, sem comando ilegal', () => {
    const guerreiro = criarIaDoSlice('guerreiro');
    const mago = criarIaDoSlice('mago');
    const relatorio = simularPartida({
      semente: 'ia-vertical-slice',
      buildA: RECEITAS_INICIAIS.guerreiro,
      buildB: RECEITAS_INICIAIS.mago,
      primeiroJogador: 'a',
      politicaA: guerreiro,
      politicaB: mago,
    });
    expect(relatorio.desfecho.tipo).not.toBe('comando-ilegal');
    expect(relatorio.acoes).toBeGreaterThan(0);
  });

  it('declara Ações, responde e encerra turnos', () => {
    const relatorio = simularPartida({
      semente: 'ia-atividade',
      buildA: RECEITAS_INICIAIS.guerreiro,
      buildB: RECEITAS_INICIAIS.mago,
      primeiroJogador: 'a',
      politicaA: criarIaDoSlice('guerreiro'),
      politicaB: criarIaDoSlice('mago'),
    });
    expect(relatorio.turnos).toBeGreaterThan(1);
    expect(relatorio.acoes).toBeGreaterThan(2);
  });

  /*
   * Trezentas partidas, e o que se procura é travamento, não equilíbrio.
   *
   * Comando ilegal aqui significa que a IA propôs algo que o motor recusou — e
   * isso é bug de IA, não jogada infeliz. O resultado das partidas não é
   * afirmação de balanceamento: o documento é a fonte dos números, e ajustar
   * carta por causa de simulação seria inventar regra.
   */
  it('trezentas partidas sem comando ilegal e sem travar', () => {
    const problemas: string[] = [];
    let terminaram = 0;

    for (let rodada = 0; rodada < 300; rodada += 1) {
      const primeiro = rodada % 2 === 0 ? 'a' : 'b';
      const relatorio = simularPartida({
        semente: `ia-lote-${String(rodada)}`,
        buildA: RECEITAS_INICIAIS.guerreiro,
        buildB: RECEITAS_INICIAIS.mago,
        primeiroJogador: primeiro,
        politicaA: criarIaDoSlice('guerreiro'),
        politicaB: criarIaDoSlice('mago'),
      });
      if (relatorio.desfecho.tipo === 'comando-ilegal') {
        problemas.push(`${String(rodada)}: ${relatorio.desfecho.primeiro.erro.tipo}`);
      }
      if (relatorio.desfecho.tipo === 'vitoria') terminaram += 1;
    }

    expect(problemas).toEqual([]);
    // Não é meta de balanceamento: é a prova de que a IA leva a partida ao fim
    // em vez de ficar passando o turno até o teto técnico.
    expect(terminaram).toBeGreaterThan(250);
  });

  it('a IA também sobrevive contra a política de base dos dois lados', () => {
    for (const lado of ['a', 'b'] as const) {
      const relatorio = simularPartida({
        semente: `ia-contra-base-${lado}`,
        buildA: RECEITAS_INICIAIS.guerreiro,
        buildB: RECEITAS_INICIAIS.mago,
        primeiroJogador: lado,
        politicaA: lado === 'a' ? criarIaDoSlice('guerreiro') : POLITICA_DE_BASE,
        politicaB: lado === 'a' ? POLITICA_DE_BASE : criarIaDoSlice('mago'),
      });
      expect(relatorio.desfecho.tipo).not.toBe('comando-ilegal');
    }
  });
});

describe('o tempo de pensamento acompanha a decisão', () => {
  it('fica dentro da faixa curta, sempre', () => {
    for (const opcoes of [0, 1, 3, 8, 40]) {
      const tempo = tempoDePensamento(opcoes);
      expect(tempo).toBeGreaterThanOrEqual(300);
      expect(tempo).toBeLessThanOrEqual(900);
    }
  });

  it('decisão maior pensa mais que decisão menor', () => {
    expect(tempoDePensamento(8)).toBeGreaterThan(tempoDePensamento(2));
  });

  it('a IA relata quantas opções pesou', () => {
    const visao = partidaAberta();
    const ia = criarIaDoSlice('guerreiro');
    ia.escolherAcao(visao, GUERREIRO, criarAleatorio('carga'));
    expect(ia.ultimaCarga()).toBeGreaterThanOrEqual(1);
  });
});
