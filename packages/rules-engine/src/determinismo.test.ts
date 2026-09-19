import type { EstadoDaPartida } from '@arcane-duel/shared-types';
import { matchId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import type { RespostaDeComando } from './comando.js';
import { criarLogDeEventos, logEstaIntegro, reproduzir } from './event-log.js';
import type { EventoUniversal } from './eventos.js';
import { declararAcao, iniciarPartida, registrarResposta, resolverAcao } from './comandos.js';
import { ativarCartaDeClasse, consumirUltimate, revelarPassiva } from './comandos-de-carta.js';
import { encerrarTurno, iniciarTurno } from './turno.js';
import { RULES_VERSION } from './version.js';
import {
  CARTA_A1,
  CARTA_A2,
  CARTA_B1,
  ID_A,
  ID_B,
  exigirSucesso,
  partidaNova,
  perfil,
  perfilDeReacao,
} from './teste-partida.js';

/** Uma partida inteira, descrita como uma sequência de comandos. */
const sequencia = (
  inicial: EstadoDaPartida,
): {
  readonly partida: EstadoDaPartida;
  readonly eventos: readonly EventoUniversal[];
} => {
  const passos: readonly ((partida: EstadoDaPartida) => RespostaDeComando)[] = [
    (partida) => iniciarPartida(partida, ID_A),
    (partida) => iniciarTurno(partida, ID_A),
    (partida) => revelarPassiva(partida, ID_A, partida.jogadores[0].passivas[0]?.carta ?? CARTA_A1),
    (partida) => declararAcao(partida, ID_A, perfil(CARTA_A1, { dano: 2, impacto: 3 })),
    (partida) =>
      registrarResposta(partida, ID_B, 0, {
        tipo: 'carta-de-reacao',
        perfil: perfilDeReacao(CARTA_B1, { cooldown: 3 }),
      }),
    (partida) =>
      ativarCartaDeClasse(
        partida,
        ID_A,
        partida.jogadores[0].cartasDeClasse[0]?.carta ?? CARTA_A1,
        0,
      ),
    (partida) => resolverAcao(partida, ID_A, 0),
    (partida) =>
      declararAcao(partida, ID_A, perfil(CARTA_A2, { dano: 1, impacto: 4, cooldown: 2 })),
    (partida) => resolverAcao(partida, ID_A, 1),
    (partida) => consumirUltimate(partida, ID_A),
    (partida) => encerrarTurno(partida, ID_A),
    (partida) => iniciarTurno(partida, ID_B),
  ];

  let partida = inicial;
  const eventos: EventoUniversal[] = [];
  for (const passo of passos) {
    const resultado = exigirSucesso(passo(partida));
    partida = resultado.partida;
    eventos.push(...resultado.eventos);
  }
  return { partida, eventos };
};

describe('determinismo', () => {
  it('a mesma sequência de comandos produz o mesmo estado', () => {
    const primeira = sequencia(partidaNova());
    const segunda = sequencia(partidaNova());
    expect(JSON.stringify(primeira.partida)).toBe(JSON.stringify(segunda.partida));
  });

  it('a mesma sequência produz os mesmos eventos, na mesma ordem', () => {
    const primeira = sequencia(partidaNova());
    const segunda = sequencia(partidaNova());
    expect(JSON.stringify(primeira.eventos)).toBe(JSON.stringify(segunda.eventos));
    expect(primeira.eventos.length).toBeGreaterThan(20);
  });

  it('serializar duas vezes o mesmo estado dá exatamente o mesmo texto', () => {
    const { partida } = sequencia(partidaNova());
    expect(JSON.stringify(partida)).toBe(JSON.stringify(partida));
  });

  it('nenhum comando muta o estado que recebeu', () => {
    const inicial = partidaNova();
    const antes = JSON.stringify(inicial);
    sequencia(inicial);
    sequencia(inicial);
    expect(JSON.stringify(inicial)).toBe(antes);
  });

  it('o log numera os eventos de forma contígua e reproduz o mesmo resultado', () => {
    const { eventos } = sequencia(partidaNova());
    const log = criarLogDeEventos<EventoUniversal & { readonly sequencia: number }>({
      matchId: matchId('partida-de-teste'),
      semente: 'semente',
      versoes: { rulesVersion: RULES_VERSION, cardDataVersion: '0.1.0-alpha' },
    });
    for (const evento of eventos) log.registrar(evento);

    expect(log.tamanho()).toBe(eventos.length);
    expect(logEstaIntegro(log.eventos())).toBe(true);

    // Reproduzir o log contando o Dano aplicado dá sempre o mesmo total.
    const somarDano = (total: number, evento: { tipo: string; valor?: number }): number =>
      evento.tipo === 'dano-aplicado' ? total + (evento.valor ?? 0) : total;
    const primeira = reproduzir(0, log.eventos(), somarDano);
    const segunda = reproduzir(0, log.eventos(), somarDano);
    expect(primeira).toBe(segunda);
    expect(primeira).toBeGreaterThan(0);
  });

  it('a ordem dos eventos de uma resolução segue a ordem canônica', () => {
    let partida = exigirSucesso(iniciarPartida(partidaNova(), ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(
      declararAcao(partida, ID_A, perfil(CARTA_A1, { dano: 1, impacto: 6 })),
    ).partida;

    const resolucao = exigirSucesso(resolverAcao(partida, ID_A, 0));
    const tipos = resolucao.eventos.map((evento) => evento.tipo);
    expect(tipos.slice(0, 3)).toEqual(['impacto-aplicado', 'ruptura', 'dano-aplicado']);
    /*
     * A resolução **agenda** o cooldown; ela não move a carta.
     *
     * `carta-para-cooldown` só aparece no encerramento do turno (§11), e é
     * essa separação que a ordem canônica precisa preservar: quem lê o log
     * distingue "resolveu" de "saiu do campo".
     */
    expect(tipos).toContain('cooldown-agendado');
    expect(tipos).not.toContain('carta-para-cooldown');
    expect(tipos.at(-1)).toBe('acao-resolvida');
  });

  it('o carimbo de versão da partida acompanha o motor', () => {
    const { partida } = sequencia(partidaNova());
    expect(partida.versoes.rulesVersion).toBe(RULES_VERSION);
    expect(partida.versoes.cardDataVersion).toBe('0.1.0-alpha');
  });
});
