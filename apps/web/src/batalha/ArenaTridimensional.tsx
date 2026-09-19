import { useEffect, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import type { MomentoEmCena, QualidadeDeVfx } from '@arcane-duel/vfx';
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
     * Qualidade que cede antes dos quadros.
     *
     * O nível escolhido pelo jogador é o **teto**, não uma promessa: num
     * aparelho fraco, insistir em sombra e resolução alta troca fluidez por
     * enfeite, e fluidez é o que um jogo competitivo precisa. A queda é só
     * para baixo e só acontece depois de um segundo inteiro ruim, para um
     * engasgo isolado não rebaixar a cena.
     *
     * Nada disso toca informação, regra ou duração de beat.
     */
    const ESCADA: readonly QualidadeDeVfx[] = ['alta', 'media', 'baixa'];
    let degrau = ESCADA.indexOf(preferencias.qualidade);
    let somaDeQuadros = 0;
    let quadrosMedidos = 0;
    let anterior = 0;

    const ajustarQualidade = (tempoMs: number): void => {
      if (anterior !== 0) {
        somaDeQuadros += tempoMs - anterior;
        quadrosMedidos += 1;
      }
      anterior = tempoMs;
      if (somaDeQuadros < 1000) return;

      const medio = somaDeQuadros / quadrosMedidos;
      somaDeQuadros = 0;
      quadrosMedidos = 0;
      // 33 ms é o quadro de 30 fps: abaixo disso a arena já não acompanha o
      // dedo, e é hora de abrir mão de enfeite.
      if (medio <= 33 || degrau >= ESCADA.length - 1) return;

      degrau += 1;
      const proxima = ESCADA[degrau] ?? 'baixa';
      renderizador.definirQualidade(proxima);
      cena.definirQualidade(proxima);
      efeitos.definirQualidade(proxima);
      renderizador.redimensionar(larguraAtual, alturaAtual);
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
