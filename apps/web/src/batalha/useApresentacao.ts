import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EventoDeApresentacao, MomentoEmCena } from '@arcane-duel/vfx';
import { criarFilaDeApresentacao } from '@arcane-duel/vfx';
import type { DiretorDeAudio, EventoSonoro } from '@arcane-duel/audio';
import { EVENTOS_SONOROS, criarDiretorDeAudio } from '@arcane-duel/audio';

import { usePreferencias } from '../preferencias/preferencias.js';

/*
 * O diretor de apresentação.
 *
 * Ele tem uma fila, um relógio e um barramento de áudio. O que ele **não**
 * tem é qualquer influência sobre a partida: o estado já mudou quando um beat
 * chega aqui, e nenhum comando espera um beat terminar.
 *
 * O som nasce no mesmo quadro que o visual. `avancar` devolve os beats que
 * começaram naquele quadro, e é ali — não num `setTimeout`, não depois — que
 * `tocar` é chamado. Foi essa a razão de a fila devolver os nascidos.
 */

const ehEventoSonoro = (valor: string): valor is EventoSonoro =>
  (EVENTOS_SONOROS as readonly string[]).includes(valor);

export interface Apresentacao {
  /** Os beats correndo agora, com progresso de 0 a 1. */
  readonly momentos: readonly MomentoEmCena[];
  /** Segura o dedo do jogador enquanto o campo se rearranja. Nunca a regra. */
  readonly bloqueada: boolean;
  readonly enfaseProprio: number;
  readonly enfaseAdversario: number;
  readonly enfileirar: (beats: readonly EventoDeApresentacao[]) => void;
  readonly limpar: () => void;
  /** O primeiro toque do jogador libera o áudio do navegador. */
  readonly destravarAudio: () => void;
}

export interface OpcoesDaApresentacao {
  /** Injetável para teste: sem fábrica, o diretor toca em silêncio. */
  readonly audio?: DiretorDeAudio;
  /** Injetável para teste: sem relógio, nada anima e nada quebra. */
  readonly relogio?: (passo: (tempoMs: number) => void) => () => void;
}

const relogioDeQuadros = (): ((passo: (tempoMs: number) => void) => () => void) => (passo) => {
  if (typeof requestAnimationFrame === 'undefined') return () => undefined;
  let ativo = true;
  let pedido = 0;
  const laco = (tempoMs: number): void => {
    if (!ativo) return;
    passo(tempoMs);
    pedido = requestAnimationFrame(laco);
  };
  pedido = requestAnimationFrame(laco);
  return () => {
    ativo = false;
    cancelAnimationFrame(pedido);
  };
};

/**
 * A ênfase de lado.
 *
 * Enquanto um efeito daquele jogador resolve, a metade dele do campo fica
 * banhada na luz da classe. É a leitura que responde "de quem é o efeito que
 * está acontecendo agora" antes de qualquer texto — e ela não é uma imagem
 * esticada: é luz calculada a partir de quais beats estão em cena.
 */
const forcaDaEnfase = (
  momentos: readonly MomentoEmCena[],
  lado: 'proprio' | 'adversario',
): number => {
  let maior = 0;
  for (const momento of momentos) {
    if (momento.evento.lado !== lado) continue;
    if (momento.evento.tipo === 'numero-flutuante') continue;
    // Sobe rápido, sustenta, e cai junto com o fim do beat.
    const forca =
      Math.sin(Math.PI * Math.min(1, momento.progresso * 1.25)) * momento.evento.intensidade;
    maior = Math.max(maior, forca);
  }
  return maior;
};

export const useApresentacao = (opcoes: OpcoesDaApresentacao = {}): Apresentacao => {
  const { velocidade, preferencias } = usePreferencias();
  const fila = useRef(criarFilaDeApresentacao(velocidade));
  const [momentos, setMomentos] = useState<readonly MomentoEmCena[]>([]);
  const [bloqueada, setBloqueada] = useState(false);

  const audio = useRef<DiretorDeAudio | null>(null);
  audio.current ??=
    opcoes.audio ??
    criarDiretorDeAudio({
      criar: () => {
        try {
          const Construtor = window.AudioContext;
          return new Construtor();
        } catch {
          return null;
        }
      },
    });

  useEffect(() => {
    fila.current.velocidade(velocidade);
  }, [velocidade]);

  useEffect(() => {
    audio.current?.silenciar(!preferencias.somLigado);
  }, [preferencias.somLigado]);

  useEffect(() => {
    const relogio = opcoes.relogio ?? relogioDeQuadros();
    return relogio((tempoMs) => {
      const nascidos = fila.current.avancar(tempoMs);
      for (const beat of nascidos) {
        if (beat.som !== null && ehEventoSonoro(beat.som)) audio.current?.tocar(beat.som);
      }
      const emCena = fila.current.emCena();
      setMomentos((anteriores) =>
        anteriores.length === 0 && emCena.length === 0 ? anteriores : emCena,
      );
      setBloqueada(fila.current.bloqueada());
    });
    // `opcoes.relogio` é estável por construção; recriar o laço a cada render
    // custaria um quadro perdido por render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const atual = audio.current;
    return () => {
      atual?.encerrar();
    };
  }, []);

  const enfileirar = useCallback((beats: readonly EventoDeApresentacao[]) => {
    if (beats.length === 0) return;
    fila.current.enfileirar(beats);
  }, []);

  const limpar = useCallback(() => {
    fila.current.limpar();
    setMomentos([]);
    setBloqueada(false);
  }, []);

  const destravarAudio = useCallback(() => {
    audio.current?.destravar();
  }, []);

  return useMemo(
    () => ({
      momentos,
      bloqueada,
      enfaseProprio: forcaDaEnfase(momentos, 'proprio'),
      enfaseAdversario: forcaDaEnfase(momentos, 'adversario'),
      enfileirar,
      limpar,
      destravarAudio,
    }),
    [momentos, bloqueada, enfileirar, limpar, destravarAudio],
  );
};
