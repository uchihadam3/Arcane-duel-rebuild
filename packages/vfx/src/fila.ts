import type { EventoDeApresentacao } from './momentos.js';
import type { VelocidadeDeAnimacao } from './ritmo.js';
import { duracaoEfetiva } from './ritmo.js';

/*
 * A fila de apresentação.
 *
 * Ela é a régua do tempo da tela, e só isso. O motor já resolveu a partida
 * quando um evento chega aqui: a fila não pode adiar, cancelar nem alterar
 * nada do estado canônico. Se ela travar, o jogo continua correto — só fica
 * feio.
 *
 * É essa separação que o vídeo de referência mostra de forma explícita: o
 * contador do baralho cai de 479 para 478 **enquanto** a carta ainda está
 * grande no centro. O estado não espera; a apresentação alcança.
 *
 * Nenhum `await animacao()` antes de aplicar regra. Em lugar nenhum.
 */

export interface MomentoEmCena {
  readonly evento: EventoDeApresentacao;
  /** 0 no primeiro quadro, 1 no último. Sempre monotônico. */
  readonly progresso: number;
  readonly comecouEm: number;
  readonly duracaoMs: number;
}

export interface FilaDeApresentacao {
  /** Enfileira uma sequência inteira, na ordem em que o motor a produziu. */
  readonly enfileirar: (eventos: readonly EventoDeApresentacao[]) => void;
  /** Avança o relógio. Devolve os beats que **começaram** neste quadro. */
  readonly avancar: (agoraMs: number) => readonly EventoDeApresentacao[];
  readonly emCena: () => readonly MomentoEmCena[];
  /** Verdadeiro enquanto um beat que segura a entrada estiver correndo. */
  readonly bloqueada: () => boolean;
  readonly vazia: () => boolean;
  /** Descarta tudo o que falta e encerra o que está em cena, sem pular regra. */
  readonly limpar: () => void;
  readonly velocidade: (proxima: VelocidadeDeAnimacao) => void;
}

/** Quantos beats podem nascer no mesmo quadro, para uma fila longa não estourar. */
const MAXIMO_POR_QUADRO = 8;

export const criarFilaDeApresentacao = (
  velocidadeInicial: VelocidadeDeAnimacao = 'normal',
): FilaDeApresentacao => {
  let velocidade = velocidadeInicial;
  let pendentes: EventoDeApresentacao[] = [];
  let emCena: MomentoEmCena[] = [];

  const bloqueada = (): boolean =>
    emCena.some((momento) => momento.evento.bloqueiaEntrada && momento.progresso < 1);

  const iniciar = (evento: EventoDeApresentacao, agoraMs: number): MomentoEmCena => ({
    evento,
    progresso: 0,
    comecouEm: agoraMs,
    duracaoMs: duracaoEfetiva(evento.duracaoBaseMs, velocidade),
  });

  const progressoDe = (momento: MomentoEmCena, agoraMs: number): number => {
    if (momento.duracaoMs <= 0) return 1;
    const decorrido = agoraMs - momento.comecouEm;
    return Math.min(1, Math.max(0, decorrido / momento.duracaoMs));
  };

  return {
    enfileirar: (eventos) => {
      pendentes = [...pendentes, ...eventos];
    },

    avancar: (agoraMs) => {
      emCena = emCena
        .map((momento) => ({ ...momento, progresso: progressoDe(momento, agoraMs) }))
        // Um beat termina no quadro seguinte ao que completou, para que quem
        // desenha veja o progresso 1 pelo menos uma vez.
        .filter((momento) => momento.progresso < 1 || momento.comecouEm === agoraMs);

      const nascidos: EventoDeApresentacao[] = [];
      while (pendentes.length > 0 && !bloqueada() && nascidos.length < MAXIMO_POR_QUADRO) {
        const proximo = pendentes[0];
        if (proximo === undefined) break;
        pendentes = pendentes.slice(1);
        emCena = [...emCena, iniciar(proximo, agoraMs)];
        nascidos.push(proximo);
      }
      return nascidos;
    },

    emCena: () => emCena,
    bloqueada,
    vazia: () => pendentes.length === 0 && emCena.length === 0,

    limpar: () => {
      pendentes = [];
      emCena = [];
    },

    velocidade: (proxima) => {
      velocidade = proxima;
    },
  };
};
