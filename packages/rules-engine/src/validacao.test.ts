import type { EstadoDaPartida, EstadoDeJogador } from '@arcane-duel/shared-types';
import { cardId, matchId, playerId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { criarEstadoDeJogador, criarPartida } from './criacao.js';
import { validarEstadoDeJogador, validarPartida } from './validacao.js';
import { ID_A, ID_B, jogadorDeApoio } from './teste-apoio.js';

const jogador = (): EstadoDeJogador =>
  criarEstadoDeJogador(jogadorDeApoio('jogador-a', 'guerreiro'));

const partida = (): EstadoDaPartida =>
  criarPartida({
    id: matchId('partida-1'),
    semente: 's',
    cardDataVersion: '0.1.0-alpha',
    jogadores: [jogadorDeApoio('jogador-a', 'guerreiro'), jogadorDeApoio('jogador-b', 'mago')],
  });

const problemasDe = (resultado: ReturnType<typeof validarEstadoDeJogador>): readonly string[] =>
  resultado.ok ? [] : resultado.erro.map((problema) => problema.campo);

describe('validação do estado do jogador', () => {
  it('aceita um estado recém-criado', () => {
    expect(validarEstadoDeJogador(jogador()).ok).toBe(true);
  });

  it('conta as oito habilidades somando mão e cooldown', () => {
    const base = jogador();
    const comCooldown: EstadoDeJogador = {
      ...base,
      mao: base.mao.slice(2),
      cooldown: { 1: [base.mao[0] ?? cardId('x')], 2: [base.mao[1] ?? cardId('y')], 3: [] },
    };
    expect(validarEstadoDeJogador(comCooldown).ok).toBe(true);
  });

  it('recusa build com número errado de habilidades', () => {
    const base = jogador();
    expect(problemasDe(validarEstadoDeJogador({ ...base, mao: base.mao.slice(1) }))).toContain(
      'habilidades',
    );
  });

  it('recusa a mesma habilidade em dois lugares ao mesmo tempo', () => {
    const base = jogador();
    const duplicada: EstadoDeJogador = {
      ...base,
      cooldown: { ...base.cooldown, 1: [base.mao[0] ?? cardId('x')] },
    };
    const resultado = validarEstadoDeJogador(duplicada);
    expect(resultado.ok).toBe(false);
    expect(
      !resultado.ok && resultado.erro.some((problema) => problema.problema.includes('repetida')),
    ).toBe(true);
  });

  it('recusa número errado de Passivas e de Cartas de Classe', () => {
    const base = jogador();
    expect(
      problemasDe(validarEstadoDeJogador({ ...base, passivas: base.passivas.slice(1) })),
    ).toContain('passivas');
    expect(
      problemasDe(
        validarEstadoDeJogador({ ...base, cartasDeClasse: base.cartasDeClasse.slice(1) }),
      ),
    ).toContain('cartasDeClasse');
  });

  it('aceita uma Carta de Classe Exaurida, que saiu do campo mas continua equipada', () => {
    const base = jogador();
    const exaurida = base.cartasDeClasse[0];
    expect(exaurida).toBeDefined();
    const comExaurida: EstadoDeJogador = {
      ...base,
      cartasDeClasse: base.cartasDeClasse.slice(1),
      removidas: [exaurida?.carta ?? cardId('x')],
    };
    expect(validarEstadoDeJogador(comExaurida).ok).toBe(true);
  });

  it('recusa Resposta em um espaço de Ação vazio', () => {
    const base = jogador();
    const orfã: EstadoDeJogador = {
      ...base,
      acoes: [
        { ...base.acoes[0], resposta: { voluntaria: { tipo: 'defesa-inata' } } },
        base.acoes[1],
        base.acoes[2],
      ],
    };
    expect(problemasDe(validarEstadoDeJogador(orfã))).toContain('acoes[0].resposta');
  });

  it('recusa Condição acima do limite documentado', () => {
    const base = jogador();
    expect(
      problemasDe(
        validarEstadoDeJogador({ ...base, condicoes: { ...base.condicoes, queimadura: 4 } }),
      ),
    ).toContain('condicoes.queimadura');
    expect(
      validarEstadoDeJogador({ ...base, condicoes: { ...base.condicoes, queimadura: 3 } }).ok,
    ).toBe(true);
  });

  it('recusa Lento e Murchar acima de dois', () => {
    const base = jogador();
    expect(
      problemasDe(validarEstadoDeJogador({ ...base, condicoes: { ...base.condicoes, lento: 3 } })),
    ).toContain('condicoes.lento');
    expect(
      problemasDe(
        validarEstadoDeJogador({ ...base, condicoes: { ...base.condicoes, murchar: 3 } }),
      ),
    ).toContain('condicoes.murchar');
  });

  it('recusa o recurso de outra classe', () => {
    const base = jogador();
    const trocado = { ...base, recurso: { classe: 'mago', mana: 4 } } as EstadoDeJogador;
    expect(problemasDe(validarEstadoDeJogador(trocado))).toContain('recurso');
  });

  it('recusa Reserva acima do máximo e valores negativos', () => {
    const base = jogador();
    expect(problemasDe(validarEstadoDeJogador({ ...base, reserva: 3 }))).toContain('reserva');
    expect(problemasDe(validarEstadoDeJogador({ ...base, vida: -1 }))).toContain('vida');
    expect(problemasDe(validarEstadoDeJogador({ ...base, guarda: -1 }))).toContain('guarda');
  });
});

describe('validação da partida', () => {
  it('aceita uma partida recém-criada', () => {
    expect(validarPartida(partida()).ok).toBe(true);
  });

  it('recusa dois jogadores com o mesmo identificador', () => {
    const base = partida();
    const repetida: EstadoDaPartida = {
      ...base,
      jogadores: [base.jogadores[0], { ...base.jogadores[1], id: ID_A }],
    };
    expect(problemasDe(validarPartida(repetida))).toContain('jogadores');
  });

  it('recusa turno de quem não está na partida', () => {
    const base = partida();
    const invalida: EstadoDaPartida = {
      ...base,
      situacao: 'em-andamento',
      turno: { numero: 1, jogadorAtivo: playerId('ninguem'), iniciado: true },
    };
    expect(problemasDe(validarPartida(invalida))).toContain('turno.jogadorAtivo');
  });

  it('recusa partida em andamento sem turno e encerrada sem desfecho', () => {
    const base = partida();
    expect(problemasDe(validarPartida({ ...base, situacao: 'em-andamento' }))).toContain('turno');
    expect(problemasDe(validarPartida({ ...base, situacao: 'encerrada' }))).toContain('desfecho');
  });

  it('aceita um desfecho sem vencedor, que é como o documento deixa a morte simultânea', () => {
    const base = partida();
    const empate: EstadoDaPartida = {
      ...base,
      situacao: 'encerrada',
      desfecho: { vencedor: null, motivo: 'indefinido' },
    };
    expect(validarPartida(empate).ok).toBe(true);
  });

  it('aceita um vencedor que é um dos dois jogadores', () => {
    const base = partida();
    const vitoria: EstadoDaPartida = {
      ...base,
      situacao: 'encerrada',
      desfecho: { vencedor: ID_B, motivo: 'vida-zerada' },
    };
    expect(validarPartida(vitoria).ok).toBe(true);
  });
});
