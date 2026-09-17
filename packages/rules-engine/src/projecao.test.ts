import type { EstadoDaPartida } from '@arcane-duel/shared-types';
import { cardId, matchId, playerId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { criarPartida } from './criacao.js';
import { projetarParaEspectador, projetarParaJogador } from './projecao.js';
import { ID_A, ID_B, jogadorDeApoio } from './teste-apoio.js';

const montar = (): EstadoDaPartida =>
  criarPartida({
    id: matchId('partida-1'),
    semente: 'semente-secreta',
    cardDataVersion: '0.1.0-alpha',
    jogadores: [jogadorDeApoio('jogador-a', 'guerreiro'), jogadorDeApoio('jogador-b', 'mago')],
  });

/** Congela em profundidade, para qualquer mutação virar erro em vez de passar. */
const congelar = <T>(valor: T): T => {
  if (typeof valor === 'object' && valor !== null) {
    Object.values(valor).forEach(congelar);
    Object.freeze(valor);
  }
  return valor;
};

describe('visão privada', () => {
  it('mostra ao dono a identidade das próprias cartas na mão', () => {
    const visao = projetarParaJogador(montar(), ID_A);
    const propria = visao.jogadores.find((jogador) => jogador.id === ID_A);
    expect(propria?.mao).toHaveLength(8);
    for (const carta of propria?.mao ?? []) {
      expect(carta.visivel).toBe(true);
    }
  });

  it('mostra ao dono as próprias Passivas mesmo ainda ocultas', () => {
    const visao = projetarParaJogador(montar(), ID_A);
    const propria = visao.jogadores.find((jogador) => jogador.id === ID_A);
    for (const passiva of propria?.passivas ?? []) {
      expect(passiva.estado).toBe('oculta');
      expect(passiva.carta.visivel).toBe(true);
    }
  });

  it('registra de quem é a perspectiva', () => {
    expect(projetarParaJogador(montar(), ID_B).perspectiva).toBe(ID_B);
  });

  it('não dá visão privilegiada a um identificador de fora da partida', () => {
    const visao = projetarParaJogador(montar(), playerId('intruso'));
    expect(visao.perspectiva).toBeNull();
    for (const jogador of visao.jogadores) {
      expect(jogador.mao.every((carta) => !carta.visivel)).toBe(true);
    }
  });
});

describe('visão pública', () => {
  it('esconde a identidade das cartas na mão do adversário', () => {
    const visao = projetarParaJogador(montar(), ID_A);
    const adversario = visao.jogadores.find((jogador) => jogador.id === ID_B);
    expect(adversario?.mao).toHaveLength(8);
    for (const carta of adversario?.mao ?? []) {
      expect(carta.visivel).toBe(false);
      expect('carta' in carta).toBe(false);
    }
  });

  it('esconde a identidade das Passivas ainda não reveladas', () => {
    const visao = projetarParaJogador(montar(), ID_A);
    const adversario = visao.jogadores.find((jogador) => jogador.id === ID_B);
    for (const passiva of adversario?.passivas ?? []) {
      expect(passiva.estado).toBe('oculta');
      expect(passiva.carta.visivel).toBe(false);
    }
  });

  it('revela a Passiva assim que ela é revelada', () => {
    const partida = montar();
    const revelada = {
      ...partida,
      jogadores: [
        partida.jogadores[0],
        {
          ...partida.jogadores[1],
          passivas: partida.jogadores[1].passivas.map((passiva, indice) =>
            indice === 0 ? { ...passiva, estado: 'pronta' as const } : passiva,
          ),
        },
      ] as EstadoDaPartida['jogadores'],
    };
    const visao = projetarParaJogador(revelada, ID_A);
    const adversario = visao.jogadores.find((jogador) => jogador.id === ID_B);
    expect(adversario?.passivas[0]?.carta.visivel).toBe(true);
    expect(adversario?.passivas[1]?.carta.visivel).toBe(false);
  });

  it('mantém públicos Cartas de Classe, Ultimate, Condições e componente de classe', () => {
    const visao = projetarParaJogador(montar(), ID_A);
    const adversario = visao.jogadores.find((jogador) => jogador.id === ID_B);
    expect(adversario?.cartasDeClasse).toHaveLength(2);
    expect(adversario?.ultimate.carta).toBeDefined();
    expect(adversario?.recurso).toEqual({ classe: 'mago', mana: 4 });
    expect(adversario?.condicoes.queimadura).toBe(0);
    expect(adversario?.vida).toBe(30);
  });

  it('não vaza nenhuma carta da mão do adversário no dado serializado', () => {
    const partida = montar();
    const serializada = JSON.stringify(projetarParaJogador(partida, ID_A));
    for (const carta of partida.jogadores[1].mao) {
      expect(serializada).not.toContain(carta);
    }
    for (const passiva of partida.jogadores[1].passivas) {
      expect(serializada).not.toContain(passiva.carta);
    }
  });

  it('nunca leva a semente do replay para dentro de uma visão', () => {
    const partida = montar();
    expect(JSON.stringify(projetarParaJogador(partida, ID_A))).not.toContain(partida.semente);
    expect(JSON.stringify(projetarParaEspectador(partida))).not.toContain(partida.semente);
  });

  it('para o espectador, esconde a mão dos dois lados', () => {
    const visao = projetarParaEspectador(montar());
    expect(visao.perspectiva).toBeNull();
    for (const jogador of visao.jogadores) {
      expect(jogador.mao.every((carta) => !carta.visivel)).toBe(true);
      expect(jogador.passivas.every((passiva) => !passiva.carta.visivel)).toBe(true);
    }
  });

  it('mostra as cartas em cooldown, que já foram jogadas publicamente', () => {
    const partida = montar();
    const comCooldown: EstadoDaPartida = {
      ...partida,
      jogadores: [
        partida.jogadores[0],
        {
          ...partida.jogadores[1],
          mao: partida.jogadores[1].mao.slice(1),
          cooldown: { ...partida.jogadores[1].cooldown, 1: [cardId('jogador-b-hab-1')] },
        },
      ],
    };
    const visao = projetarParaJogador(comCooldown, ID_A);
    const adversario = visao.jogadores.find((jogador) => jogador.id === ID_B);
    expect(adversario?.cooldown[1]).toEqual([cardId('jogador-b-hab-1')]);
  });
});

describe('projeção como função pura', () => {
  it('não muta o estado canônico', () => {
    const partida = congelar(montar());
    const antes = JSON.stringify(partida);
    projetarParaJogador(partida, ID_A);
    projetarParaEspectador(partida);
    expect(JSON.stringify(partida)).toBe(antes);
  });

  it('não devolve as mesmas referências do estado canônico', () => {
    const partida = montar();
    const visao = projetarParaJogador(partida, ID_A);
    expect(visao.jogadores[0].condicoes).not.toBe(partida.jogadores[0].condicoes);
    expect(visao.jogadores[0].recurso).not.toBe(partida.jogadores[0].recurso);
    expect(visao.versoes).not.toBe(partida.versoes);
  });

  it('é determinística: a mesma entrada produz a mesma serialização', () => {
    const partida = montar();
    expect(JSON.stringify(projetarParaJogador(partida, ID_A))).toBe(
      JSON.stringify(projetarParaJogador(partida, ID_A)),
    );
    expect(JSON.stringify(projetarParaEspectador(partida))).toBe(
      JSON.stringify(projetarParaEspectador(partida)),
    );
  });

  it('projeta uma partida em andamento preservando turno e desfecho', () => {
    const partida = montar();
    const emAndamento: EstadoDaPartida = {
      ...partida,
      situacao: 'em-andamento',
      turno: { numero: 3, jogadorAtivo: ID_B, iniciado: true },
    };
    const visao = projetarParaJogador(emAndamento, ID_A);
    expect(visao.situacao).toBe('em-andamento');
    expect(visao.turno).toEqual({ numero: 3, jogadorAtivo: ID_B, iniciado: true });
    expect(visao.desfecho).toBeNull();
  });
});
