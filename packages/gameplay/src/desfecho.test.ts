import { describe, expect, it } from 'vitest';

import { A, B, build, com, comRecurso, duelo, erroDe, jogador, jogar } from './teste-apoio.js';
import { encerrarSeVidaZerou } from '@arcane-duel/rules-engine';

import { declarar, resolver, responder } from './partida.js';

/*
 * O fim da partida é decidido depois de todos os efeitos daquela resolução.
 *
 * Ripostar e Última Palavra tiram Vida **depois** da resolução. Se o desfecho
 * fosse avaliado no meio, um jogador poderia ficar com Vida zero ou negativa e
 * a partida seguir em andamento.
 */

const guerreiro = build('guerreiro', { habilidades: ['W18', 'W01', 'W02'] });
const mago = build('mago', { habilidades: ['M01', 'M02', 'M11'] });

describe('desfecho depois da perda direta de Vida', () => {
  it('Ripostar levando o atacante de 1 para -1 encerra a partida', () => {
    const inicial = duelo(guerreiro, mago, B);
    const partida = com(inicial, B, { vida: 1 });

    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'M01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W18' as never },
    });

    expect(jogador(depois, B).vida).toBe(-1);
    expect(depois.situacao).toBe('encerrada');
    expect(depois.desfecho).toEqual({ vencedor: A, motivo: 'vida-zerada' });
  });

  it('Última Palavra levando o atacante a 0 encerra a partida', () => {
    const comUltimate = build('guerreiro', { habilidades: ['W01', 'W02'], ultimate: 'WU02' });
    const inicial = duelo(comUltimate, mago, B);
    const partida = com(comRecurso(inicial, A, 3), B, { vida: 4 });

    const declarada = declarar(partida, B, { carta: 'M02' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const respondida = responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'WU02' as never });
    const comResposta = respondida.ok ? respondida.valor.partida : base;
    const resolvida = resolver(comResposta, B, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comResposta;

    expect(jogador(fim, B).vida).toBe(0);
    expect(fim.situacao).toBe('encerrada');
    expect(fim.desfecho?.vencedor).toBe(A);
  });

  it('o jogador derrotado não consegue declarar outra Ação', () => {
    const inicial = duelo(guerreiro, mago, B);
    const partida = com(inicial, B, { vida: 1 });
    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'M01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W18' as never },
    });

    expect(erroDe(declarar(depois, B, { carta: 'M02' as never })).tipo).toBe('partida-encerrada');
  });

  it('o efeito posterior acontece antes do desfecho, não depois', () => {
    const inicial = duelo(guerreiro, mago, B);
    const partida = com(inicial, B, { vida: 1 });
    const { eventos } = jogar(partida, B, {
      pedido: { carta: 'M01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W18' as never },
    });

    const perda = eventos.findIndex((evento) => evento.tipo === 'vida-perdida');
    const encerramento = eventos.findIndex((evento) => evento.tipo === 'partida-encerrada');
    expect(perda).toBeGreaterThanOrEqual(0);
    expect(encerramento).toBeGreaterThan(perda);
  });

  it('morte simultânea continua encerrando sem vencedor, sem regra inventada', () => {
    // Nenhuma Ação do catálogo atual leva os dois a zero de uma vez: Ripostar e
    // Última Palavra só tiram Vida quando o Dano final foi zero, ou seja,
    // quando o defensor sobreviveu. A regra, porém, continua sendo uma só — a
    // do motor — e é ela que este teste verifica, aplicada ao estado que a
    // camada de composição avalia no fim da resolução.
    const partida = com(com(duelo(guerreiro, mago), A, { vida: 0 }), B, { vida: 0 });
    const fim = encerrarSeVidaZerou(partida);

    expect(fim.partida.situacao).toBe('encerrada');
    expect(fim.partida.desfecho).toEqual({ vencedor: null, motivo: 'indefinido' });
  });
});
