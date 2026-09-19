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
  /** A anisotropia que este aparelho aceita. Quem monta textura pergunta aqui. */
  readonly anisotropiaMaxima: number;
  /** A densidade com que a cena está sendo desenhada agora. A guarda mede isto. */
  readonly densidade: () => number;
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
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.type = PCFSoftShadowMap;

  let orcamento = ORCAMENTO_VISUAL[opcoes.qualidade];
  renderer.shadowMap.enabled = orcamento.sombras;

  const aoPerder = (evento: Event): void => {
    evento.preventDefault();
    opcoes.aoPerderContexto();
  };
  opcoes.canvas.addEventListener('webglcontextlost', aoPerder);

  /*
   * A densidade real da tela, e não uma fração dela.
   *
   * A versão reprovada desenhava a `min(1,75, devicePixelRatio)`: num telefone
   * de DPR 3 a cena saía a 1,75× e era esticada para 3×. Isso é borrão
   * escolhido por nós, permanente, em cima de nome de carta e número de HUD.
   *
   * Agora o teto de qualidade só entra se for **menor** que a tela, que é o
   * caso de um aparelho fraco em Baixa. No resto, manda o aparelho.
   */
  const pixelRatio = (): number =>
    Math.min(
      orcamento.tetoDeResolucao,
      typeof window === 'undefined' ? 1 : window.devicePixelRatio,
    );

  return {
    canvas: opcoes.canvas,
    anisotropiaMaxima: renderer.capabilities.getMaxAnisotropy(),
    densidade: () => renderer.getPixelRatio(),

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
