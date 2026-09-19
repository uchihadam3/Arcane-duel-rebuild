import type { CartaVisivel } from '../../partida/apresentacao.js';
import { CartaVetorial, VersoVetorial } from '../carta/CartaVetorial.jsx';

import type { Caixa, Pose } from './voo.js';

/*
 * A camada global de animação.
 *
 * A carta viaja entre camadas diferentes: a mão vive em coordenadas de tela e
 * o pedestal vive dentro do tabuleiro transformado em 3D. Animar de uma para a
 * outra dentro de qualquer uma das duas produz recorte e briga de contexto de
 * empilhamento — a carta some atrás da borda do campo, ou passa por baixo do
 * HUD.
 *
 * A solução é esta camada, acima da arena e da mão e abaixo dos modais: a peça
 * real da origem fica invisível, um **clone** viaja aqui em cima, e ao chegar a
 * peça real do destino assume. O clone é a mesma carta vetorial — não é uma
 * imagem nem um retângulo de substituição —, então não há troca de aparência
 * no fim, só de dono.
 *
 * A ponte entre os dois espaços não é calculada: ela é **medida**. A origem e
 * o destino chegam aqui como `DOMRect` lidos do próprio navegador, que já
 * aplicou a perspectiva. Recalcular a projeção por conta própria foi o que
 * deformou a Etapa 6; aqui a conta é do navegador e nós só perguntamos.
 */

export interface CloneEmVoo {
  readonly id: string;
  /** A carta, quando o observador pode conhecê-la. `null` é verso. */
  readonly carta: CartaVisivel | null;
  /** O tamanho da carta na origem, para o clone nascer do tamanho certo. */
  readonly origem: Caixa;
  readonly pose: Pose;
  /**
   * A carta vira no meio do caminho?
   *
   * Só quando a regra a torna pública ao chegar — é o caso da carta da
   * máquina. Antes da virada o clone mostra o verso; depois, a frente.
   */
  readonly vira: boolean;
}

export interface SobreposicaoProps {
  readonly clones: readonly CloneEmVoo[];
}

/** A partir de onde, no voo, a carta virada mostra a frente. */
export const PROGRESSO_DA_VIRADA = 0.55;

export const Sobreposicao = ({ clones }: SobreposicaoProps): React.JSX.Element => (
  <div className="v2-sobreposicao" aria-hidden="true">
    {clones.map((clone) => {
      const { pose } = clone;
      /*
       * A virada é uma rotação em Y de meia volta.
       *
       * Até a metade, o clone mostra o verso e gira; passando de 90° a face
       * de trás ficaria espelhada, então é aí que a frente entra e a rotação
       * continua de −180 até 0. O jogador vê **a carta virando**, não uma
       * troca de imagem.
       */
      const virou = clone.vira && pose.progresso >= PROGRESSO_DA_VIRADA;
      const giroDaVirada = clone.vira
        ? Math.min(180, (pose.progresso / PROGRESSO_DA_VIRADA) * 180)
        : 0;

      return (
        <div
          key={clone.id}
          className="v2-clone"
          data-teste="carta-em-voo"
          data-fase={pose.fase}
          style={{
            width: `${String(clone.origem.largura)}px`,
            height: `${String(clone.origem.altura)}px`,
            transform: [
              `translate3d(${String(pose.x - clone.origem.largura / 2)}px,`,
              `${String(pose.y - clone.origem.altura / 2)}px, 0)`,
              `rotateX(${String(pose.inclinacao)}deg)`,
              `rotate(${String(pose.giro)}deg)`,
              `scale(${String(pose.escala)})`,
            ].join(' '),
            /*
             * A sombra cresce com a altura.
             *
             * É o que diz que a carta está no ar. Sem ela o voo lê como um
             * recorte deslizando sobre a tela, e a sensação de peso some.
             */
            filter: `drop-shadow(0 ${String(6 + pose.elevacao * 26)}px ${String(
              8 + pose.elevacao * 22,
            )}px rgba(0,0,0,${String(0.35 + pose.elevacao * 0.3)}))`,
          }}
        >
          <div
            className="v2-clone__face"
            style={{
              transform: `rotateY(${String(virou ? giroDaVirada - 180 : giroDaVirada)}deg)`,
            }}
          >
            {virou && clone.carta !== null ? (
              <CartaVetorial carta={clone.carta} comTexto={false} />
            ) : clone.carta !== null && !clone.vira ? (
              <CartaVetorial carta={clone.carta} comTexto={false} />
            ) : (
              <VersoVetorial />
            )}
          </div>
        </div>
      );
    })}
  </div>
);
