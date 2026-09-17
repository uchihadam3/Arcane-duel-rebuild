import { useCallback, useEffect, useMemo, useState } from 'react';

import { useModoDeExibicao } from './useModoDeExibicao.js';

/**
 * Evento que o Chrome dispara quando a PWA pode ser instalada.
 * Ele não está nas definições padrão do DOM, então é declarado aqui.
 */
export interface EventoDeInstalacao extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

export type FormaDeInstalar =
  'prompt-do-navegador' | 'instrucao-manual' | 'ja-instalado' | 'indisponivel';

export type ResultadoDaInstalacao = 'aceita' | 'recusada' | 'indisponivel';

export interface EstadoDeInstalacao {
  readonly forma: FormaDeInstalar;
  /** Verdadeiro quando há algo a oferecer ao jogador: botão ou instrução. */
  readonly podeOferecer: boolean;
  readonly instalar: () => Promise<ResultadoDaInstalacao>;
}

const pareceIos = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const agente = navigator.userAgent;
  // iPadOS recente se apresenta como Macintosh, mas continua tendo toque.
  const iPadDisfarcado = /Macintosh/i.test(agente) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(agente) || iPadDisfarcado;
};

/**
 * Instalação da PWA.
 *
 * O prompt do navegador nunca é aberto sozinho: o evento é capturado e
 * guardado, e só a ação do jogador o dispara. Onde o navegador não oferece o
 * evento — Safari no iPhone e no iPad — a única saída honesta é explicar o
 * caminho manual, em vez de fingir que existe um instalador.
 */
export const useInstalacao = (): EstadoDeInstalacao => {
  const modo = useModoDeExibicao();
  const [evento, setEvento] = useState<EventoDeInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const aoPoderInstalar = (bruto: Event): void => {
      // Impede o navegador de abrir o prompt por conta própria.
      bruto.preventDefault();
      setEvento(bruto as EventoDeInstalacao);
    };
    const aoInstalar = (): void => {
      setInstalado(true);
      setEvento(null);
    };

    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  const forma = useMemo<FormaDeInstalar>(() => {
    if (instalado || modo === 'standalone') return 'ja-instalado';
    if (evento !== null) return 'prompt-do-navegador';
    if (pareceIos()) return 'instrucao-manual';
    return 'indisponivel';
  }, [instalado, modo, evento]);

  const instalar = useCallback(async (): Promise<ResultadoDaInstalacao> => {
    if (evento === null) return 'indisponivel';
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    // O evento só pode ser usado uma vez; o navegador dispara outro se a
    // instalação continuar disponível.
    setEvento(null);
    return outcome === 'accepted' ? 'aceita' : 'recusada';
  }, [evento]);

  return {
    forma,
    podeOferecer: forma === 'prompt-do-navegador' || forma === 'instrucao-manual',
    instalar,
  };
};
