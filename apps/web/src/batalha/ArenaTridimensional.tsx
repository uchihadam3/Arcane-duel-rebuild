import { useEffect, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import type { MomentoEmCena, QualidadeDeVfx } from '@arcane-duel/vfx';
import { ESCADA_DE_QUALIDADE } from '@arcane-duel/vfx';
import { useResolvedorDeAssets } from '@arcane-duel/ui';

import { cameraParaViewport } from '../arena/camera.js';
import type { CenaDaArena } from '../arena/cena.js';
import { criarCena } from '../arena/cena.js';
import type { DiretorDeEfeitos } from '../arena/efeitos.js';
import { criarDiretorDeEfeitos } from '../arena/efeitos.js';
import type { EstadoVisualDaArena } from '../arena/estado-visual.js';
import type { Renderizador } from '../arena/renderizador.js';
import { criarRenderizador } from '../arena/renderizador.js';
import { webglDisponivel } from '../arena/webgl.js';
import { usePreferencias } from '../preferencias/preferencias.js';

/*
 * O canvas da arena.
 *
 * Ele desenha, e só. Não recebe toque, não decide nada e não sabe de regra:
 * `pointer-events` fica com a camada em DOM que vem por cima, que é quem tem
 * foco, rótulo acessível e alvo de toque de tamanho decente.
 *
 * Se o contexto WebGL não nascer — ou se o navegador o tirar no meio da
 * partida —, este componente avisa e desaparece. A partida continua inteira na
 * camada em DOM. Tela preta nunca é resposta.
 */

export interface ArenaTridimensionalProps {
  readonly estado: EstadoVisualDaArena;
  readonly momentos: readonly MomentoEmCena[];
  readonly aoFalhar: () => void;
}

export const ArenaTridimensional = ({
  estado,
  momentos,
  aoFalhar,
}: ArenaTridimensionalProps): React.JSX.Element => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const resolvedor = useResolvedorDeAssets();
  const { preferencias, movimentoReduzido } = usePreferencias();

  /* O laço lê sempre o último estado sem se reinscrever a cada render. */
  const ultimo = useRef({ estado, momentos });
  ultimo.current = { estado, momentos };

  const falhou = useRef(aoFalhar);
  falhou.current = aoFalhar;

  useEffect(() => {
    const alvo = canvas.current;
    if (alvo === null) return;

    /*
     * Sem suporte, nem tenta.
     *
     * Pedir um contexto que não existe só produz exceção e ruído. Quem decide
     * montar a arena já perguntou antes; este segundo teste cobre o caso de a
     * resposta ter mudado entre a decisão e a montagem — e o caso do jsdom,
     * onde a camada em DOM é o que se quer exercitar.
     */
    if (!webglDisponivel()) return;

    const renderizador: Renderizador | null = criarRenderizador({
      canvas: alvo,
      qualidade: preferencias.qualidade,
      aoPerderContexto: () => {
        falhou.current();
      },
    });
    if (renderizador === null) {
      falhou.current();
      return;
    }

    /*
     * O laço desenha todo quadro.
     *
     * Partícula, rastro, pulso de foco e sigilo em rotação mudam a cada
     * quadro, então redesenhar por demanda economizaria quase nada e
     * acrescentaria um caminho de bug — um quadro perdido com a carta no meio
     * do voo. `aoPrecisarDeQuadro` existe para o caso de a cena ser desenhada
     * sob demanda um dia; hoje ela não precisa fazer nada.
     */
    const cena: CenaDaArena = criarCena({
      qualidade: preferencias.qualidade,
      contextoDeTextura: { url: (assetId) => resolvedor.url(assetId) },
      anisotropiaMaxima: renderizador.anisotropiaMaxima,
      aoPrecisarDeQuadro: () => undefined,
    });
    const efeitos: DiretorDeEfeitos = criarDiretorDeEfeitos(cena.grupoDeEfeitos, {
      qualidade: preferencias.qualidade,
      movimentoReduzido,
    });

    let camera: PerspectiveCamera = cameraParaViewport({ largura: 1, altura: 1 });
    let larguraAtual = 0;
    let alturaAtual = 0;

    const medir = (): void => {
      const pai = alvo.parentElement;
      const largura = Math.round(pai?.clientWidth ?? alvo.clientWidth);
      const altura = Math.round(pai?.clientHeight ?? alvo.clientHeight);
      if (largura === larguraAtual && altura === alturaAtual) return;
      larguraAtual = largura;
      alturaAtual = altura;
      // A câmera é refeita, não movida: o enquadramento depende da tela, a
      // posição não. Nenhum gesto do jogador passa por aqui.
      camera = cameraParaViewport({ largura, altura });
      cena.ajustarProfundidade(camera.position.length());
      renderizador.redimensionar(largura, altura);
    };

    medir();
    const observador =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            medir();
          });
    if (observador !== null && alvo.parentElement !== null) {
      observador.observe(alvo.parentElement);
    }

    /*
     * Qualidade que cede antes dos quadros — devagar, e com volta.
     *
     * A primeira versão descia um degrau depois de **um único segundo** acima
     * de 33 ms, e o degrau levava a resolução junto. Na prática o jogador
     * escolhia Alta, abria a partida e em poucos segundos estava vendo a cena
     * borrada sem ter pedido nada: um engasgo de carregamento bastava, e não
     * havia caminho de volta.
     *
     * Agora a decisão é tomada sobre uma janela longa, pela **mediana** — que
     * ignora o quadro perdido isolado, coisa que a média não faz —, com faixa
     * morta entre descer e subir, com carência depois de cada troca e com
     * subida permitida. O nível escolhido continua sendo teto: a auto-queda
     * nunca sobe acima dele.
     *
     * O que cada degrau custa está em `ORCAMENTO_VISUAL`, e lá a ordem é
     * sombra, partícula, luz e — só no último — resolução.
     */
    const JANELA_MS = 3000;
    /** Acima disto a arena já não acompanha o dedo: 30 fps. */
    const LIMITE_PARA_DESCER_MS = 33;
    /** Abaixo disto sobra folga de verdade: 50 fps. Entre os dois, nada muda. */
    const LIMITE_PARA_SUBIR_MS = 20;
    /** Depois de trocar, espera-se uma janela inteira antes de trocar de novo. */
    const CARENCIA_MS = 6000;
    /** Duas janelas boas seguidas para subir; uma ruim já basta para descer. */
    const JANELAS_BOAS_PARA_SUBIR = 2;

    const teto = Math.max(0, ESCADA_DE_QUALIDADE.indexOf(preferencias.qualidade));
    let degrau = teto;
    let janela: number[] = [];
    let inicioDaJanela = 0;
    let anterior = 0;
    let bloqueadoAte = 0;
    let janelasBoas = 0;

    /*
     * O nível em vigor fica escrito no canvas.
     *
     * Não é enfeite de depuração: é como a ficha de nitidez sabe se a cena
     * está em 2× porque o aparelho cedeu ou porque alguém limitou a resolução
     * no código. Sem isso a medição não distingue as duas coisas — e foi
     * justamente um limite escondido no código que borrou a primeira entrega.
     */
    const anunciarQualidade = (nivel: QualidadeDeVfx): void => {
      alvo.dataset.qualidade = nivel;
    };
    anunciarQualidade(preferencias.qualidade);

    const aplicarDegrau = (indice: number): void => {
      degrau = indice;
      const nivel = ESCADA_DE_QUALIDADE[indice] ?? 'baixa';
      renderizador.definirQualidade(nivel);
      cena.definirQualidade(nivel);
      efeitos.definirQualidade(nivel);
      renderizador.redimensionar(larguraAtual, alturaAtual);
      anunciarQualidade(nivel);
    };

    const mediana = (amostras: readonly number[]): number => {
      const ordenadas = [...amostras].sort((a, b) => a - b);
      const meio = Math.floor(ordenadas.length / 2);
      return ordenadas[meio] ?? 0;
    };

    const ajustarQualidade = (tempoMs: number): void => {
      if (anterior === 0 || inicioDaJanela === 0) {
        anterior = tempoMs;
        inicioDaJanela = tempoMs;
        return;
      }
      janela.push(tempoMs - anterior);
      anterior = tempoMs;
      if (tempoMs - inicioDaJanela < JANELA_MS) return;

      const tipico = mediana(janela);
      janela = [];
      inicioDaJanela = tempoMs;
      if (tempoMs < bloqueadoAte) return;

      if (tipico > LIMITE_PARA_DESCER_MS) {
        janelasBoas = 0;
        if (degrau >= ESCADA_DE_QUALIDADE.length - 1) return;
        aplicarDegrau(degrau + 1);
        bloqueadoAte = tempoMs + CARENCIA_MS;
        return;
      }

      if (tipico < LIMITE_PARA_SUBIR_MS && degrau > teto) {
        janelasBoas += 1;
        if (janelasBoas < JANELAS_BOAS_PARA_SUBIR) return;
        janelasBoas = 0;
        aplicarDegrau(degrau - 1);
        bloqueadoAte = tempoMs + CARENCIA_MS;
        return;
      }

      janelasBoas = 0;
    };

    let ativo = true;
    let pedido = 0;
    const laco = (tempoMs: number): void => {
      if (!ativo) return;
      ajustarQualidade(tempoMs);
      cena.atualizar(ultimo.current.estado, tempoMs);
      efeitos.atualizar(ultimo.current.momentos, tempoMs);
      renderizador.desenhar(cena.scene, camera);
      pedido = requestAnimationFrame(laco);
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      pedido = requestAnimationFrame(laco);
    }

    return () => {
      ativo = false;
      if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(pedido);
      observador?.disconnect();
      efeitos.descartar();
      cena.descartar();
      renderizador.descartar();
    };
  }, [resolvedor, preferencias.qualidade, movimentoReduzido]);

  return <canvas ref={canvas} className="arena__cena" aria-hidden="true" />;
};
