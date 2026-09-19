import { useEffect, useRef, useState } from 'react';

import type { DescricaoDoVoo, Pose } from '../animacao/voo.js';
import { DURACAO_DO_VOO_MS, estadoDoVoo } from '../animacao/voo.js';

import type { CenaAlvo, PecaAlvo } from './montar.js';

/*
 * Do alvo para o movimento.
 *
 * `montarCena` diz **onde cada peça deveria estar** para o estado atual. Este
 * arquivo compara esse alvo com onde as peças estão de verdade e, para cada
 * diferença, começa um voo. É o que faz a carta atravessar o campo em vez de
 * aparecer no destino — e faz isso para os dois lados com o mesmo código,
 * porque nada aqui pergunta de quem é a carta.
 *
 * Três consequências que valem dizer:
 *
 * - Uma carta que **surge** já no campo não pisca: ela nasce na origem que
 *   quem a montou indicou — a mão do jogador para as dele, a mão da máquina
 *   para as dela — e voa dali.
 * - Uma carta que **anda** de um encaixe para outro (o deslize do cooldown, a
 *   volta para a mão) usa o mesmo voo, sem caso especial.
 * - Uma carta que **some** não é removida no mesmo quadro: ela apaga, para o
 *   jogador ver o que saiu.
 *
 * O estado do jogo não espera nada disto. Se o laço de animação parar, a
 * partida continua correta; só fica parada na tela.
 */

export interface PecaEmCena extends PecaAlvo {
  /** A pose de agora, já interpolada. */
  readonly pose: Pose;
  /**
   * 0 mostra o verso, 1 mostra a face.
   *
   * A carta da máquina sai virada e **gira no meio do caminho**, quando a
   * regra já tornou a identidade pública. Antes disso ela é verso na tela e
   * verso no dado: `carta` continua `null` até a projeção revelar.
   */
  readonly virada: number;
  /** 0 quando está saindo de cena. */
  readonly presenca: number;
}

const DURACAO_DA_SAIDA_MS = 260;

interface EmVoo {
  readonly alvo: PecaAlvo;
  readonly voo: DescricaoDoVoo;
  /** Verdadeiro quando a carta chegou virada e precisa virar durante o voo. */
  readonly revela: boolean;
}

interface Saindo {
  readonly alvo: PecaAlvo;
  readonly pose: Pose;
  readonly virada: number;
  readonly inicioMs: number;
}

export interface OpcoesDaCena {
  /** A inclinação da câmera, para a pose "de frente" da mão. */
  readonly inclinacaoDaMao: number;
  /** Multiplicador de duração. Menor é mais rápido. */
  readonly ritmo: number;
  /** Quando ligado, a carta vai direto ao destino, sem travessia. */
  readonly movimentoReduzido: boolean;
}

const poseParada = (alvo: PecaAlvo): Pose => ({
  x: alvo.x,
  y: alvo.y,
  altura: 0,
  giro: alvo.giro,
  inclinacao: alvo.inclinacao,
  escala: alvo.escala,
  fase: 'resolvendo',
  progresso: 1,
});

const vooEntre = (de: Pose, para: PecaAlvo, agoraMs: number, ritmo: number): DescricaoDoVoo => ({
  origem: { x: de.x, y: de.y },
  destino: { x: para.x, y: para.y },
  giroDeOrigem: de.giro,
  giroDeDestino: para.giro,
  inclinacaoDeOrigem: de.inclinacao,
  inclinacaoDeDestino: para.inclinacao,
  escalaDeOrigem: de.escala,
  escalaDeDestino: para.escala,
  inicioMs: agoraMs,
  ritmo,
});

/**
 * A cena animada.
 *
 * Devolve as peças com a pose de agora. Ela se redesenha a cada quadro
 * **enquanto houver movimento** e para sozinha quando tudo assentou: um campo
 * parado não gasta bateria.
 */
export const useCena = (alvo: CenaAlvo, opcoes: OpcoesDaCena): readonly PecaEmCena[] => {
  const emVoo = useRef(new Map<string, EmVoo>());
  const paradas = useRef(new Map<string, { readonly alvo: PecaAlvo; readonly pose: Pose }>());
  const saindo = useRef(new Map<string, Saindo>());
  const [, redesenhar] = useState(0);

  /*
   * A reconciliação acontece quando o alvo muda, e não a cada quadro.
   *
   * Refazer a comparação a cada quadro reiniciaria os voos continuamente e
   * nenhuma carta sairia do lugar — o erro clássico de misturar estado com
   * animação.
   */
  useEffect(() => {
    const agora = performance.now();
    const vistos = new Set<string>();

    for (const peca of alvo.pecas) {
      vistos.add(peca.chave);

      const voando = emVoo.current.get(peca.chave);
      const parada = paradas.current.get(peca.chave);
      const reaparecendo = saindo.current.get(peca.chave);
      saindo.current.delete(peca.chave);

      const atual: Pose | undefined =
        voando !== undefined
          ? estadoDoVoo(voando.voo, agora)
          : (parada?.pose ?? reaparecendo?.pose);

      if (atual === undefined) {
        /*
         * A peça é nova.
         *
         * Uma carta que nasce num encaixe do campo veio de alguma mão: a do
         * jogador, quando ele a jogou, ou a da máquina. Começar o voo ali é o
         * que dá a leitura de origem. Uma carta que nasce na própria mão
         * simplesmente aparece — ela foi comprada, não atravessou nada.
         */
        if (peca.lugar === 'mao') {
          paradas.current.set(peca.chave, { alvo: peca, pose: poseParada(peca) });
          continue;
        }
        const origem: Pose = {
          ...poseParada(peca),
          x: peca.metade === 'maquina' ? alvo.origemDaMaquina.x : peca.x,
          y: peca.metade === 'maquina' ? alvo.origemDaMaquina.y : peca.y + 320,
          inclinacao: opcoes.inclinacaoDaMao,
          escala: peca.escala * 1.1,
        };
        emVoo.current.set(peca.chave, {
          alvo: peca,
          voo: vooEntre(origem, peca, agora, opcoes.movimentoReduzido ? 0.001 : opcoes.ritmo),
          revela: peca.metade === 'maquina' && peca.carta !== null,
        });
        continue;
      }

      const mudou =
        Math.abs(atual.x - peca.x) > 0.5 ||
        Math.abs(atual.y - peca.y) > 0.5 ||
        Math.abs(atual.escala - peca.escala) > 0.01 ||
        Math.abs(atual.giro - peca.giro) > 0.5 ||
        Math.abs(atual.inclinacao - peca.inclinacao) > 0.5;

      if (!mudou) {
        if (voando === undefined) paradas.current.set(peca.chave, { alvo: peca, pose: atual });
        else emVoo.current.set(peca.chave, { ...voando, alvo: peca });
        continue;
      }

      paradas.current.delete(peca.chave);
      emVoo.current.set(peca.chave, {
        alvo: peca,
        voo: vooEntre(atual, peca, agora, opcoes.movimentoReduzido ? 0.001 : opcoes.ritmo),
        revela: false,
      });
    }

    for (const [chave, item] of emVoo.current) {
      if (vistos.has(chave)) continue;
      saindo.current.set(chave, {
        alvo: item.alvo,
        pose: estadoDoVoo(item.voo, agora),
        virada: item.alvo.carta === null ? 0 : 1,
        inicioMs: agora,
      });
      emVoo.current.delete(chave);
    }
    for (const [chave, item] of paradas.current) {
      if (vistos.has(chave)) continue;
      saindo.current.set(chave, {
        alvo: item.alvo,
        pose: item.pose,
        virada: item.alvo.carta === null ? 0 : 1,
        inicioMs: agora,
      });
      paradas.current.delete(chave);
    }

    redesenhar((valor) => valor + 1);
  }, [alvo, opcoes.inclinacaoDaMao, opcoes.ritmo, opcoes.movimentoReduzido]);

  /* O laço só roda enquanto há movimento. */
  useEffect(() => {
    if (typeof requestAnimationFrame === 'undefined') return;
    let ativo = true;
    let pedido = 0;

    const passo = (): void => {
      if (!ativo) return;
      const agora = performance.now();
      let movendo = false;

      for (const [chave, item] of emVoo.current) {
        const decorrido = agora - item.voo.inicioMs;
        if (decorrido >= DURACAO_DO_VOO_MS * (item.voo.ritmo ?? 1)) {
          paradas.current.set(chave, { alvo: item.alvo, pose: poseParada(item.alvo) });
          emVoo.current.delete(chave);
          movendo = true;
          continue;
        }
        movendo = true;
      }

      for (const [chave, item] of saindo.current) {
        if (agora - item.inicioMs >= DURACAO_DA_SAIDA_MS) {
          saindo.current.delete(chave);
          movendo = true;
          continue;
        }
        movendo = true;
      }

      if (movendo) redesenhar((valor) => valor + 1);
      pedido = requestAnimationFrame(passo);
    };

    pedido = requestAnimationFrame(passo);
    return () => {
      ativo = false;
      cancelAnimationFrame(pedido);
    };
  }, []);

  const agora = typeof performance === 'undefined' ? 0 : performance.now();
  const pecas: PecaEmCena[] = [];

  for (const item of emVoo.current.values()) {
    const pose = estadoDoVoo(item.voo, agora);
    pecas.push({
      ...item.alvo,
      pose,
      /*
       * A virada acontece no meio da travessia.
       *
       * Não antes: enquanto a carta está saindo da mão da máquina, a
       * identidade dela ainda não é pública. E não depois: o jogador precisa
       * ver o que o atingiu antes de a carta encaixar.
       */
      virada: item.revela ? (pose.progresso < 0.55 ? 0 : 1) : item.alvo.carta === null ? 0 : 1,
      presenca: 1,
    });
  }
  for (const item of paradas.current.values()) {
    pecas.push({
      ...item.alvo,
      pose: item.pose,
      virada: item.alvo.carta === null ? 0 : 1,
      presenca: 1,
    });
  }
  for (const item of saindo.current.values()) {
    const t = Math.min(1, (agora - item.inicioMs) / DURACAO_DA_SAIDA_MS);
    pecas.push({
      ...item.alvo,
      pose: { ...item.pose, escala: item.pose.escala * (1 - t * 0.14) },
      virada: item.virada,
      presenca: 1 - t,
    });
  }

  return pecas.sort((a, b) => a.ordem - b.ordem);
};
