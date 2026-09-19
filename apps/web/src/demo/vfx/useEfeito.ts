import { useEffect, useRef, useState } from 'react';
import type { EventoUniversal } from '@arcane-duel/rules-engine';
import type { IndiceDeAcao, PlayerId } from '@arcane-duel/shared-types';

import type { MarcosDoLote } from '../animacao/useVoos.js';
import type { Metade } from '../arena/planta.js';
import type { PalcoSonoro } from '../som/palco.js';

import type { BeatEmCena, RoteiroDeEfeito } from './roteiros.js';
import { beatsNoAr, beatsQueComecaram, duracaoDoRoteiro, roteiroDaCarta } from './roteiros.js';

/*
 * O efeito no ar.
 *
 * Ele lê o **log de eventos** — o registro público do que aconteceu — e não o
 * desenho. Quando uma Ação resolve, o efeito da carta que estava naquele
 * espaço entra no ar, com a origem na metade de quem atacou. A carta já foi
 * jogada, o Dano já foi aplicado, a Guarda já caiu: o efeito conta o que houve.
 *
 * Som e imagem saem do mesmo relógio: o beat que está no ar é o mesmo que
 * disparou a voz. É isso que impede o som de chegar depois da explosão.
 *
 * **E o efeito espera a vez dele.** O log chega no mesmo quadro em que a
 * carta sai da mão, mas o efeito não pode começar aí: a carta ainda está no
 * ar. Ele fica pendurado até o instante que a fila reservou — depois do
 * encaixe e da pausa de leitura —, e então é esticado para caber exatamente
 * na janela dela. Foi a sobreposição desses dois momentos que fez o lance
 * ficar ilegível no aparelho real.
 */

export interface EfeitoEmCena {
  readonly roteiro: RoteiroDeEfeito;
  readonly beats: readonly BeatEmCena[];
  readonly origem: Metade;
  readonly coluna: 0 | 1 | 2 | 3;
}

interface EmCurso {
  readonly roteiro: RoteiroDeEfeito;
  readonly origem: Metade;
  readonly coluna: 0 | 1 | 2 | 3;
  readonly inicioMs: number;
  /**
   * Quanto o relógio do roteiro é esticado para caber na janela da fila.
   *
   * O roteiro guarda a **proporção** entre os beats da carta; a fila guarda o
   * tempo que a apresentação tem. Multiplicar um pelo outro preserva o
   * desenho de cada efeito e ainda assim respeita o andamento escolhido.
   */
  readonly escala: number;
}

/** Um efeito que já foi anunciado pelo log e ainda não chegou a vez dele. */
interface Pendente {
  readonly roteiro: RoteiroDeEfeito;
  readonly origem: Metade;
  readonly coluna: 0 | 1 | 2 | 3;
}

export interface EntradaDoEfeito {
  readonly eventos: readonly EventoUniversal[];
  readonly lote: number;
  /** Quem é o humano, para saber de qual metade o efeito sai. */
  readonly humano: PlayerId;
  readonly palco: PalcoSonoro;
  /** Os instantes que a fila reservou. O efeito não começa antes do dele. */
  readonly marcos: MarcosDoLote;
}

/**
 * Qual carta resolveu neste lote, e de quem.
 *
 * A declaração e a resolução chegam no mesmo lote quando o defensor não
 * responde, e em lotes diferentes quando responde. Guardar a última declaração
 * resolve os dois casos sem caso especial.
 */
const declaracaoDoLote = (
  eventos: readonly EventoUniversal[],
): { readonly carta: string; readonly jogador: PlayerId; readonly indice: IndiceDeAcao } | null => {
  for (const evento of eventos) {
    if (evento.tipo === 'acao-declarada') {
      return { carta: String(evento.carta), jogador: evento.jogador, indice: evento.indice };
    }
  }
  return null;
};

const resolveu = (eventos: readonly EventoUniversal[]): boolean =>
  eventos.some((evento) => evento.tipo === 'acao-resolvida');

export const useEfeito = (entrada: EntradaDoEfeito): EfeitoEmCena | null => {
  const emCurso = useRef<EmCurso | null>(null);
  const pendente = useRef<Pendente | null>(null);
  const ultimaDeclaracao = useRef<{
    readonly carta: string;
    readonly jogador: PlayerId;
    readonly indice: IndiceDeAcao;
  } | null>(null);
  const ultimoBeatMs = useRef(0);
  const [, redesenhar] = useState(0);

  /*
   * Os marcos mudam no mesmo commit em que o lote chega, e o laço de quadros
   * precisa enxergar sempre o valor mais novo. Uma referência resolve isso sem
   * religar o laço a cada render.
   */
  const marcos = useRef(entrada.marcos);
  marcos.current = entrada.marcos;

  useEffect(() => {
    const declarada = declaracaoDoLote(entrada.eventos);
    if (declarada !== null) ultimaDeclaracao.current = declarada;
    if (!resolveu(entrada.eventos)) return;

    const fonte = ultimaDeclaracao.current;
    if (fonte === null) return;

    // Anunciado, e **não** começado: quem começa é o laço, no beat reservado.
    pendente.current = {
      roteiro: roteiroDaCarta(fonte.carta),
      // A metade é a de quem atacou, e é fixa: o humano é sempre a de baixo.
      origem: fonte.jogador === entrada.humano ? 'jogador' : 'maquina',
      coluna: Math.min(3, Math.max(0, fonte.indice)) as 0 | 1 | 2 | 3,
    };
    redesenhar((valor) => valor + 1);
  }, [entrada.eventos, entrada.humano, entrada.lote]);

  useEffect(() => {
    if (typeof requestAnimationFrame === 'undefined') return;
    let ativo = true;
    let pedido = 0;

    const passo = (): void => {
      if (!ativo) return;
      const agora = performance.now();

      /* A vez do efeito chegou? */
      const espera = pendente.current;
      if (espera !== null && emCurso.current === null) {
        const reservado = marcos.current.efeitoMs;
        if (reservado === null || agora >= reservado) {
          const bruta = duracaoDoRoteiro(espera.roteiro);
          const janela = marcos.current.janelaDoEfeitoMs;
          emCurso.current = {
            ...espera,
            inicioMs: reservado ?? agora,
            escala: janela > 0 && bruta > 0 ? janela / bruta : 1,
          };
          pendente.current = null;
          ultimoBeatMs.current = -1;
        }
      }

      const atual = emCurso.current;
      if (atual !== null) {
        const decorrido = (agora - atual.inicioMs) / atual.escala;

        // O som nasce com o beat, e não com um cronômetro próprio.
        for (const beat of beatsQueComecaram(atual.roteiro, ultimoBeatMs.current, decorrido)) {
          if (beat.som !== undefined) entrada.palco.tocarEfeito(beat.som);
        }
        ultimoBeatMs.current = decorrido;

        if (decorrido > duracaoDoRoteiro(atual.roteiro)) emCurso.current = null;
        redesenhar((valor) => valor + 1);
      }
      pedido = requestAnimationFrame(passo);
    };

    pedido = requestAnimationFrame(passo);
    return () => {
      ativo = false;
      cancelAnimationFrame(pedido);
    };
  }, [entrada.palco]);

  const atual = emCurso.current;
  if (atual === null) return null;
  const decorrido = (performance.now() - atual.inicioMs) / atual.escala;
  return {
    roteiro: atual.roteiro,
    beats: beatsNoAr(atual.roteiro, decorrido),
    origem: atual.origem,
    coluna: atual.coluna,
  };
};
