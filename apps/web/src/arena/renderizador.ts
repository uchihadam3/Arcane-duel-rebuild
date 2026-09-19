import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace, WebGLRenderer } from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import type { QualidadeDeVfx } from '@arcane-duel/vfx';
import { ORCAMENTO_VISUAL } from '@arcane-duel/vfx';

/*
 * O renderizador.
 *
 * É o único ponto do cliente que pode falhar por falta de WebGL, e por isso é
 * o único que precisa falhar bem: se o contexto não nasce, ou se o navegador o
 * perde no meio da partida, quem chama recebe `null` e a tela continua
 * jogável pela camada em DOM. Tela preta nunca é resposta.
 */

export interface Renderizador {
  readonly canvas: HTMLCanvasElement;
  readonly redimensionar: (largura: number, altura: number) => void;
  readonly desenhar: (scene: Scene, camera: PerspectiveCamera) => void;
  readonly definirQualidade: (qualidade: QualidadeDeVfx) => void;
  readonly descartar: () => void;
}

export interface OpcoesDoRenderizador {
  readonly canvas: HTMLCanvasElement;
  readonly qualidade: QualidadeDeVfx;
  /** Chamado quando o navegador tira o contexto. A tela cai para o DOM. */
  readonly aoPerderContexto: () => void;
}

export const criarRenderizador = (opcoes: OpcoesDoRenderizador): Renderizador | null => {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas: opcoes.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.type = PCFSoftShadowMap;

  let orcamento = ORCAMENTO_VISUAL[opcoes.qualidade];
  renderer.shadowMap.enabled = orcamento.sombras;

  const aoPerder = (evento: Event): void => {
    evento.preventDefault();
    opcoes.aoPerderContexto();
  };
  opcoes.canvas.addEventListener('webglcontextlost', aoPerder);

  const pixelRatio = (): number =>
    Math.min(
      orcamento.escalaDeRenderizacao,
      typeof window === 'undefined' ? 1 : window.devicePixelRatio,
    );

  return {
    canvas: opcoes.canvas,

    redimensionar: (largura, altura) => {
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(Math.max(1, largura), Math.max(1, altura), false);
    },

    desenhar: (scene, camera) => {
      renderer.render(scene, camera);
    },

    definirQualidade: (qualidade) => {
      orcamento = ORCAMENTO_VISUAL[qualidade];
      renderer.shadowMap.enabled = orcamento.sombras;
      renderer.setPixelRatio(pixelRatio());
    },

    descartar: () => {
      opcoes.canvas.removeEventListener('webglcontextlost', aoPerder);
      renderer.dispose();
    },
  };
};
