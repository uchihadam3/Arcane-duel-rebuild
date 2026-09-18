import { describe, expect, it } from 'vitest';

import type { EstadoDaAtualizacao, FonteDeVisibilidade } from './atualizacao.js';
import { INTERVALO_DE_VERIFICACAO_EM_MS, criarCoordenadorDeAtualizacao } from './atualizacao.js';
import type { SituacaoDoCliente } from './politica-de-atualizacao.js';
import {
  decidirAtualizacao,
  podeAplicarPendente,
  situacaoAtualDoCliente,
} from './politica-de-atualizacao.js';

/*
 * O comportamento da atualização, sem navegador e sem service worker.
 *
 * As portas do coordenador são substituídas por espiões, então cada prova aqui
 * é sobre a decisão — quando perguntar, quando aplicar, quando esperar — e não
 * sobre a API do navegador.
 */

/** Um alvo de eventos de mentira, que deixa disparar o que foi assinado. */
const criarAlvo = (): {
  readonly alvo: FonteDeVisibilidade;
  readonly disparar: (tipo: string) => void;
  readonly assinados: () => readonly string[];
  visibilidade: DocumentVisibilityState;
} => {
  const ouvintes = new Map<string, Set<() => void>>();
  const estado = {
    visibilidade: 'visible' as DocumentVisibilityState,
    alvo: {
      addEventListener: (tipo: string, ouvinte: () => void) => {
        const atuais = ouvintes.get(tipo) ?? new Set<() => void>();
        atuais.add(ouvinte);
        ouvintes.set(tipo, atuais);
      },
      removeEventListener: (tipo: string, ouvinte: () => void) => {
        ouvintes.get(tipo)?.delete(ouvinte);
      },
      get visibilityState(): DocumentVisibilityState {
        return estado.visibilidade;
      },
    },
    disparar: (tipo: string) => {
      for (const ouvinte of [...(ouvintes.get(tipo) ?? [])]) ouvinte();
    },
    assinados: () => [...ouvintes.keys()].filter((tipo) => (ouvintes.get(tipo)?.size ?? 0) > 0),
  };
  return estado;
};

interface Bancada {
  readonly coordenador: ReturnType<typeof criarCoordenadorDeAtualizacao>;
  readonly alvo: ReturnType<typeof criarAlvo>;
  readonly verificacoes: () => number;
  readonly aplicacoes: () => number;
  readonly estados: () => readonly EstadoDaAtualizacao[];
  readonly dispararPeriodica: () => void;
  readonly intervaloAgendado: () => number | null;
  readonly cancelamentos: () => number;
  situacao: SituacaoDoCliente;
}

const montar = (situacaoInicial: SituacaoDoCliente = 'sem-partida'): Bancada => {
  const alvo = criarAlvo();
  let verificacoes = 0;
  let aplicacoes = 0;
  let cancelamentos = 0;
  let periodica: (() => void) | null = null;
  let intervaloAgendado: number | null = null;
  const estados: EstadoDaAtualizacao[] = [];

  const bancada: { situacao: SituacaoDoCliente } = { situacao: situacaoInicial };

  const coordenador = criarCoordenadorDeAtualizacao({
    verificar: () => {
      verificacoes += 1;
    },
    aplicar: () => {
      aplicacoes += 1;
    },
    situacaoDoCliente: () => bancada.situacao,
    aoMudarEstado: (estado) => estados.push(estado),
    janela: alvo.alvo,
    documento: alvo.alvo,
    agendar: (callback, intervalo) => {
      periodica = callback;
      intervaloAgendado = intervalo;
      return () => {
        cancelamentos += 1;
        periodica = null;
      };
    },
  });

  return {
    coordenador,
    alvo,
    verificacoes: () => verificacoes,
    aplicacoes: () => aplicacoes,
    estados: () => estados,
    dispararPeriodica: () => periodica?.(),
    intervaloAgendado: () => intervaloAgendado,
    cancelamentos: () => cancelamentos,
    get situacao() {
      return bancada.situacao;
    },
    set situacao(valor: SituacaoDoCliente) {
      bancada.situacao = valor;
    },
  };
};

/** Deixa as promessas internas do coordenador assentarem. */
const assentar = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('política de atualização', () => {
  it('aplica quando não há partida e adia quando há', () => {
    expect(decidirAtualizacao('sem-partida')).toBe('aplicar');
    expect(decidirAtualizacao('partida-ativa')).toBe('adiar');
    expect(podeAplicarPendente('sem-partida')).toBe(true);
    expect(podeAplicarPendente('partida-ativa')).toBe(false);
  });

  it('hoje o cliente nunca está em partida, porque a partida ainda não existe', () => {
    expect(situacaoAtualDoCliente()).toBe('sem-partida');
  });
});

describe('coordenador de atualização', () => {
  it('consulta por versão nova já na abertura do aplicativo', () => {
    const bancada = montar();
    expect(bancada.verificacoes()).toBe(0);
    bancada.coordenador.iniciar();
    expect(bancada.verificacoes()).toBe(1);
  });

  it('consulta de novo quando o aplicativo volta do segundo plano', () => {
    const bancada = montar();
    bancada.coordenador.iniciar();

    bancada.alvo.visibilidade = 'hidden';
    bancada.alvo.disparar('visibilitychange');
    expect(bancada.verificacoes()).toBe(1);

    bancada.alvo.visibilidade = 'visible';
    bancada.alvo.disparar('visibilitychange');
    expect(bancada.verificacoes()).toBe(2);
  });

  it('consulta de novo quando a conexão volta', () => {
    const bancada = montar();
    bancada.coordenador.iniciar();
    bancada.alvo.disparar('online');
    expect(bancada.verificacoes()).toBe(2);
  });

  it('consulta periodicamente, com intervalo folgado', () => {
    const bancada = montar();
    bancada.coordenador.iniciar();
    expect(bancada.intervaloAgendado()).toBe(INTERVALO_DE_VERIFICACAO_EM_MS);
    expect(INTERVALO_DE_VERIFICACAO_EM_MS).toBeGreaterThanOrEqual(10 * 60 * 1000);

    bancada.dispararPeriodica();
    expect(bancada.verificacoes()).toBe(2);
  });

  it('solta os ouvintes e cancela a verificação periódica ao desligar', () => {
    const bancada = montar();
    const desligar = bancada.coordenador.iniciar();
    expect(bancada.alvo.assinados()).toContain('visibilitychange');
    desligar();
    expect(bancada.alvo.assinados()).toEqual([]);
    expect(bancada.cancelamentos()).toBe(1);
  });

  it('ativa e recarrega sozinho quando encontra versão nova fora de partida', () => {
    const bancada = montar('sem-partida');
    bancada.coordenador.iniciar();

    bancada.coordenador.aoEncontrarAtualizacao();
    expect(bancada.aplicacoes()).toBe(1);
    expect(bancada.coordenador.estado()).toBe('aplicando');
    expect(bancada.estados()).toContain('aplicando');
  });

  it('não recarrega durante uma partida: a atualização fica pendente', () => {
    const bancada = montar('partida-ativa');
    bancada.coordenador.iniciar();

    bancada.coordenador.aoEncontrarAtualizacao();
    expect(bancada.aplicacoes()).toBe(0);
    expect(bancada.coordenador.estado()).toBe('pendente');
  });

  it('aplica a atualização pendente assim que volta a ser seguro', () => {
    const bancada = montar('partida-ativa');
    bancada.coordenador.iniciar();
    bancada.coordenador.aoEncontrarAtualizacao();
    expect(bancada.coordenador.estado()).toBe('pendente');

    // Ainda em partida: insistir não aplica.
    bancada.coordenador.aplicarPendente();
    expect(bancada.aplicacoes()).toBe(0);

    bancada.situacao = 'sem-partida';
    bancada.coordenador.aplicarPendente();
    expect(bancada.aplicacoes()).toBe(1);
    expect(bancada.coordenador.estado()).toBe('aplicando');
  });

  it('aplica a pendência ao voltar do segundo plano, se já for seguro', () => {
    const bancada = montar('partida-ativa');
    bancada.coordenador.iniciar();
    bancada.coordenador.aoEncontrarAtualizacao();

    bancada.situacao = 'sem-partida';
    bancada.alvo.disparar('visibilitychange');
    expect(bancada.aplicacoes()).toBe(1);
  });

  it('não aplica pendência que não existe', () => {
    const bancada = montar('sem-partida');
    bancada.coordenador.iniciar();
    bancada.coordenador.aplicarPendente();
    expect(bancada.aplicacoes()).toBe(0);
  });

  it('o botão de emergência aplica mesmo sem pendência registrada', () => {
    const bancada = montar('partida-ativa');
    bancada.coordenador.iniciar();
    bancada.coordenador.aplicarAgora();
    expect(bancada.aplicacoes()).toBe(1);
  });

  it('volta para "em-dia" quando a verificação não encontra nada', async () => {
    const bancada = montar();
    bancada.coordenador.iniciar();
    await assentar();
    expect(bancada.coordenador.estado()).toBe('em-dia');
  });

  it('mantém a pendência quando uma nova verificação não encontra nada', async () => {
    const bancada = montar('partida-ativa');
    bancada.coordenador.iniciar();
    bancada.coordenador.aoEncontrarAtualizacao();

    bancada.coordenador.verificarAgora();
    await assentar();
    expect(bancada.coordenador.estado()).toBe('pendente');
  });

  it('não interrompe uma troca em andamento para verificar de novo', () => {
    const bancada = montar();
    bancada.coordenador.iniciar();
    bancada.coordenador.aoEncontrarAtualizacao();
    const antes = bancada.verificacoes();

    bancada.alvo.disparar('online');
    bancada.dispararPeriodica();
    expect(bancada.verificacoes()).toBe(antes);
    expect(bancada.coordenador.estado()).toBe('aplicando');
  });

  it('não fica preso em "aplicando" se a troca falhar', async () => {
    const alvo = criarAlvo();
    const estados: EstadoDaAtualizacao[] = [];
    const coordenador = criarCoordenadorDeAtualizacao({
      verificar: () => undefined,
      aplicar: () => Promise.reject(new Error('sem service worker')),
      situacaoDoCliente: () => 'sem-partida',
      aoMudarEstado: (estado) => estados.push(estado),
      janela: alvo.alvo,
      documento: alvo.alvo,
      agendar: () => () => undefined,
    });

    coordenador.iniciar();
    coordenador.aoEncontrarAtualizacao();
    await assentar();

    // A versão nova continua em espera: o botão de emergência ainda vale.
    expect(coordenador.estado()).toBe('pendente');
    expect(estados).toContain('aplicando');
  });
});
