import { CONDICOES, ZONAS_DE_COOLDOWN, matchId, playerId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { COMPOSICAO_DA_BUILD, REGRAS_UNIVERSAIS } from './constants.js';
import { criarEstadoDeJogador, criarPartida, obterAdversario, obterJogador } from './criacao.js';
import { ID_A, ID_B, buildDeApoio, jogadorDeApoio } from './teste-apoio.js';

const partidaDeApoio = (): ReturnType<typeof criarPartida> =>
  criarPartida({
    id: matchId('partida-1'),
    semente: 'semente-de-teste',
    cardDataVersion: '0.1.0-alpha',
    jogadores: [jogadorDeApoio('jogador-a', 'guerreiro'), jogadorDeApoio('jogador-b', 'mago')],
  });

describe('estado inicial do jogador', () => {
  const jogador = criarEstadoDeJogador(jogadorDeApoio('jogador-a', 'guerreiro'));

  it('parte dos valores universais de Vida e Guarda', () => {
    expect(jogador.vida).toBe(REGRAS_UNIVERSAIS.vidaInicial);
    expect(jogador.guarda).toBe(REGRAS_UNIVERSAIS.guardaInicial);
  });

  it('não distribui pontos de Ação: eles chegam no início do próprio turno', () => {
    expect(jogador.pontosDeAcao).toBe(0);
    expect(jogador.reserva).toBe(0);
    expect(jogador.impulsoInicial).toBe(false);
  });

  it('começa com as oito habilidades na mão, sem baralho e sem cooldown', () => {
    expect(jogador.mao).toHaveLength(COMPOSICAO_DA_BUILD.habilidades);
    for (const zona of ZONAS_DE_COOLDOWN) {
      expect(jogador.cooldown[zona]).toHaveLength(0);
    }
  });

  it('equipa quatro Passivas, todas ocultas', () => {
    expect(jogador.passivas).toHaveLength(COMPOSICAO_DA_BUILD.passivas);
    for (const passiva of jogador.passivas) {
      expect(passiva.estado).toBe('oculta');
    }
  });

  it('equipa duas Cartas de Classe, face-up e Prontas', () => {
    expect(jogador.cartasDeClasse).toHaveLength(COMPOSICAO_DA_BUILD.cartasDeClasse);
    for (const carta of jogador.cartasDeClasse) {
      expect(carta.estado).toBe('pronta');
    }
    expect(jogador.removidas).toHaveLength(0);
  });

  it('equipa uma Ultimate disponível', () => {
    expect(jogador.ultimate.estado).toBe('disponivel');
  });

  it('abre os três espaços de Ação vazios, cada um com o seu espaço de Resposta', () => {
    expect(jogador.acoes).toHaveLength(REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno);
    jogador.acoes.forEach((slot, posicao) => {
      expect(slot.indice).toBe(posicao);
      expect(slot.carta).toBeNull();
      expect(slot.resposta.voluntaria).toBeNull();
    });
  });

  it('abre as quatro Condições zeradas', () => {
    expect(Object.keys(jogador.condicoes).sort()).toEqual([...CONDICOES].sort());
    for (const condicao of CONDICOES) {
      expect(jogador.condicoes[condicao]).toBe(0);
    }
  });

  it('aceita a Reserva e o Impulso iniciais de quem joga em segundo', () => {
    const segundo = criarEstadoDeJogador({
      id: playerId('jogador-b'),
      build: buildDeApoio('mago', 'b'),
      reservaInicial: REGRAS_UNIVERSAIS.reservaInicialDoSegundoJogador,
      impulsoInicial: true,
    });
    expect(segundo.reserva).toBe(2);
    expect(segundo.impulsoInicial).toBe(true);
  });
});

describe('estado inicial da partida', () => {
  it('contém exatamente dois jogadores', () => {
    expect(partidaDeApoio().jogadores).toHaveLength(2);
  });

  it('grava o carimbo de versão para o replay', () => {
    const partida = partidaDeApoio();
    expect(partida.versoes.rulesVersion.length).toBeGreaterThan(0);
    expect(partida.versoes.cardDataVersion).toBe('0.1.0-alpha');
    expect(partida.semente).toBe('semente-de-teste');
  });

  it('não decide quem começa: nasce sem turno e aguardando início', () => {
    const partida = partidaDeApoio();
    expect(partida.situacao).toBe('aguardando-inicio');
    expect(partida.turno).toBeNull();
    expect(partida.desfecho).toBeNull();
  });

  it('localiza jogador e adversário pelo identificador', () => {
    const partida = partidaDeApoio();
    expect(obterJogador(partida, ID_A)?.classe).toBe('guerreiro');
    expect(obterAdversario(partida, ID_A)?.id).toBe(ID_B);
    expect(obterJogador(partida, playerId('ninguem'))).toBeUndefined();
  });

  it('dá a cada jogador o componente da própria classe', () => {
    const partida = partidaDeApoio();
    expect(partida.jogadores[0].recurso).toEqual({ classe: 'guerreiro', momentum: 0 });
    expect(partida.jogadores[1].recurso).toEqual({ classe: 'mago', mana: 4 });
  });
});
