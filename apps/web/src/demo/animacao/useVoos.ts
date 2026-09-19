import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { CartaVisivel } from '../../partida/apresentacao.js';

import type { Movimento } from './apresentacao.js';
import { movimentosDaDiferenca } from './apresentacao.js';
import type { Caixa, Pose } from './voo.js';
import { MARCOS, RITMO_REDUZIDO, estadoDoVoo } from './voo.js';

/*
 * A ponte entre o estado e o movimento.
 *
 * O motor é autoritativo e resolve na hora. Se a tela seguisse o estado
 * diretamente, a carta sumiria da mão e apareceria no pedestal no mesmo quadro.
 * Este arquivo é a diferença entre as duas coisas, e a técnica é FLIP:
 *
 *   1. antes do navegador pintar, as posições do **quadro anterior** ainda
 *      estão guardadas, medidas com `getBoundingClientRect`;
 *   2. o React já montou o estado novo, então as posições novas também podem
 *      ser medidas, no mesmo instante;
 *   3. o diretor diz o que se moveu, e cada movimento vira um clone que voa da
 *      caixa antiga para a nova.
 *
 * A medição é o ponto central da arquitetura. A mão vive em coordenadas de tela
 * e o pedestal vive dentro do tabuleiro transformado em 3D; **nós não
 * calculamos** a ponte entre os dois. O navegador já aplicou a perspectiva e o
 * `DOMRect` é a resposta dele. Recalcular por conta própria é exatamente o que
 * deformou a Etapa 6.
 */

export interface PecaMensuravel {
  readonly chave: string;
  readonly lugar: string;
}

export interface CenaParaVoo {
  readonly pecas: readonly PecaMensuravel[];
  readonly mao: readonly string[];
  readonly maoDaMaquina: number;
  /** Como achar a carta, quando o observador pode conhecê-la. */
  readonly cartaDe: (chave: string) => CartaVisivel | null;
}

export interface VooAtivo {
  readonly id: string;
  readonly movimento: Movimento;
  readonly origem: Caixa;
  readonly destino: Caixa;
  readonly inicioMs: number;
  readonly carta: CartaVisivel | null;
}

export interface VooRenderizado {
  readonly id: string;
  readonly carta: CartaVisivel | null;
  readonly origem: Caixa;
  readonly pose: Pose;
  readonly vira: boolean;
}

const daRect = (rect: DOMRect, raiz: DOMRect): Caixa => ({
  x: rect.x - raiz.x,
  y: rect.y - raiz.y,
  largura: rect.width,
  altura: rect.height,
});

/**
 * Mede tudo que tem `data-chave` dentro da raiz.
 *
 * Um passo só, e com `getBoundingClientRect`: a peça do campo é filha do
 * elemento transformado, então o retângulo que volta já é o projetado na tela.
 */
const medirTudo = (raiz: HTMLElement): Map<string, Caixa> => {
  const caixaDaRaiz = raiz.getBoundingClientRect();
  const medidas = new Map<string, Caixa>();
  for (const elemento of raiz.querySelectorAll<HTMLElement>('[data-chave]')) {
    const chave = elemento.dataset.chave;
    if (chave === undefined || chave === '') continue;
    medidas.set(chave, daRect(elemento.getBoundingClientRect(), caixaDaRaiz));
  }
  return medidas;
};

/** Uma âncora para a mão da máquina, quando não há carta medida para usar. */
const CENTRO_DA_MAO_DA_MAQUINA = 'ancora:mao-da-maquina';

export interface OpcoesDosVoos {
  readonly cena: CenaParaVoo;
  readonly raiz: React.RefObject<HTMLElement | null>;
  /** Encurta tudo quando o sistema pede movimento reduzido. */
  readonly movimentoReduzido?: boolean;
  /** Chamado quando um voo termina, para o som do encaixe. */
  readonly aoEncaixar?: (movimento: Movimento) => void;
}

export interface ResultadoDosVoos {
  readonly clones: readonly VooRenderizado[];
  /** As chaves que estão voando: a peça real delas não deve aparecer. */
  readonly emVoo: ReadonlySet<string>;
  /** Há movimento acontecendo agora? */
  readonly animando: boolean;
}

export const useVoos = ({
  cena,
  raiz,
  movimentoReduzido = false,
  aoEncaixar,
}: OpcoesDosVoos): ResultadoDosVoos => {
  const medidasAnteriores = useRef<Map<string, Caixa>>(new Map());
  const cenaAnterior = useRef<{
    pecas: readonly PecaMensuravel[];
    mao: readonly string[];
    maoDaMaquina: number;
  }>({ pecas: [], mao: [], maoDaMaquina: 0 });
  const [ativos, definirAtivos] = useState<readonly VooAtivo[]>([]);
  const [agora, definirAgora] = useState(0);
  const encaixados = useRef<Set<string>>(new Set());

  const ritmo = movimentoReduzido ? RITMO_REDUZIDO : 1;

  /*
   * A captura acontece **antes da pintura**.
   *
   * `useLayoutEffect` roda depois do commit e antes do navegador desenhar. É a
   * única janela em que dá para ter as medidas novas em mãos enquanto as
   * antigas ainda estão guardadas — que é o que FLIP precisa.
   */
  useLayoutEffect(() => {
    const elemento = raiz.current;
    if (elemento === null) return;

    const atuais = medirTudo(elemento);
    const anteriores = medidasAnteriores.current;
    const antes = cenaAnterior.current;

    const movimentos =
      antes.pecas.length === 0 && antes.mao.length === 0
        ? []
        : movimentosDaDiferenca({
            antes,
            depois: { pecas: cena.pecas, mao: cena.mao, maoDaMaquina: cena.maoDaMaquina },
          });

    const relogio = performance.now();
    const novos: VooAtivo[] = [];

    for (const movimento of movimentos) {
      /*
       * A origem vem das medidas **antigas**: é onde a peça estava quando o
       * jogador a viu pela última vez. Usar a medida nova como origem faria o
       * clone nascer já no destino, que é o teleporte que se está evitando.
       */
      const origem =
        movimento.de.tipo === 'mao-da-maquina'
          ? (anteriores.get(CENTRO_DA_MAO_DA_MAQUINA) ??
            anteriores.get(`v:maquina:mao:0`) ??
            atuais.get(CENTRO_DA_MAO_DA_MAQUINA))
          : anteriores.get(movimento.de.chave);

      const destino =
        movimento.para.tipo === 'fora'
          ? (anteriores.get(movimento.de.chave) ?? origem)
          : atuais.get(movimento.para.chave);

      if (origem === undefined || destino === undefined) continue;
      if (origem.largura <= 0 || destino.largura <= 0) continue;

      novos.push({
        id: `${movimento.id}:${String(Math.round(relogio))}`,
        movimento,
        origem,
        destino,
        inicioMs: relogio + movimento.atrasoMs * ritmo,
        carta: cena.cartaDe(movimento.para.chave) ?? cena.cartaDe(movimento.de.chave),
      });
    }

    medidasAnteriores.current = atuais;
    cenaAnterior.current = {
      pecas: cena.pecas,
      mao: cena.mao,
      maoDaMaquina: cena.maoDaMaquina,
    };

    if (novos.length > 0) {
      encaixados.current = new Set();
      definirAtivos(novos);
      definirAgora(relogio);
    }
  }, [cena, raiz, ritmo]);

  /* O relógio: um rAF enquanto houver voo, e nenhum quando não houver. */
  useEffect(() => {
    if (ativos.length === 0) return;
    let vivo = true;
    let bilhete = 0;
    const passo = (): void => {
      if (!vivo) return;
      const t = performance.now();
      definirAgora(t);
      const fim = Math.max(...ativos.map((voo) => voo.inicioMs + MARCOS.assenta * ritmo));
      if (t >= fim) {
        definirAtivos([]);
        return;
      }
      bilhete = requestAnimationFrame(passo);
    };
    bilhete = requestAnimationFrame(passo);
    return () => {
      vivo = false;
      cancelAnimationFrame(bilhete);
    };
  }, [ativos, ritmo]);

  const avisarEncaixe = useCallback(
    (voo: VooAtivo) => {
      if (encaixados.current.has(voo.id)) return;
      encaixados.current.add(voo.id);
      aoEncaixar?.(voo.movimento);
    },
    [aoEncaixar],
  );

  const clones: VooRenderizado[] = [];
  const emVoo = new Set<string>();

  for (const voo of ativos) {
    const pose = estadoDoVoo(
      {
        origem: voo.origem,
        destino: voo.destino,
        giroDeOrigem: 0,
        giroDeDestino: 0,
        inclinacaoDoCampo: 0,
        inicioMs: voo.inicioMs,
        ritmo,
      },
      agora,
    );
    if (pose.terminou) {
      avisarEncaixe(voo);
      continue;
    }
    // Enquanto voa, a peça real de origem e de destino some da cena.
    emVoo.add(voo.movimento.de.chave);
    emVoo.add(voo.movimento.para.chave);
    clones.push({
      id: voo.id,
      carta: voo.movimento.vira && pose.progresso < 0.55 ? null : voo.carta,
      origem: voo.origem,
      pose,
      vira: voo.movimento.vira,
    });
  }

  return { clones, emVoo, animando: clones.length > 0 };
};
