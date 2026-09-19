import { useMemo, useRef } from 'react';
import type { CardId } from '@arcane-duel/shared-types';
import { CartaDeJogo, CartaVirada } from '@arcane-duel/ui';

import type { CaixaNaTela } from '../arena/camera.js';
import { cameraParaViewport, projetarCaixa } from '../arena/camera.js';
import type { CartaNaArena, EstadoVisualDaArena } from '../arena/estado-visual.js';
import { PECAS_DA_ARENA } from '../arena/layout.js';
import { MOLDURA_DO_TIPO, NOME_DO_TIPO } from '../partida/apresentacao.js';
import { SigiloDaCarta } from './SigiloDaCarta.js';
import { useViewport } from './useViewport.js';

/*
 * A camada de interação.
 *
 * Ela fica **por cima** do canvas e é quem recebe toque, foco de teclado e
 * leitor de tela. A razão é prática: raycast em WebGL não tem `tab`, não tem
 * rótulo e não tem alvo de toque medível. Aqui cada peça é um botão de
 * verdade, posicionado exatamente onde a câmera projeta a peça no mundo.
 *
 * Essa é também a resposta para o WebGL ausente. A projeção é matemática pura
 * — ela não precisa de contexto gráfico nenhum —, então esta camada desenha
 * o campo inteiro sozinha quando o canvas não existe. Uma partida sem WebGL é
 * mais simples, e continua inteira.
 *
 * As zonas se declaram com `data-ancora` aqui, e é daqui que o registro de
 * âncoras é preenchido.
 */

export interface CamadaDeInteracaoProps {
  readonly estado: EstadoVisualDaArena;
  /** Sem canvas, esta camada é o campo; com canvas, ela é só o alcance do dedo. */
  readonly comCena: boolean;
  readonly aoFocarCarta: (carta: CardId) => void;
  /** Bloqueio de entrada durante um beat. Nunca bloqueia regra, só o dedo. */
  readonly bloqueada: boolean;
}

interface PecaPosicionada {
  readonly item: CartaNaArena;
  readonly caixa: CaixaNaTela;
}

export const CamadaDeInteracao = ({
  estado,
  comCena,
  aoFocarCarta,
  bloqueada,
}: CamadaDeInteracaoProps): React.JSX.Element => {
  const area = useRef<HTMLDivElement | null>(null);
  const viewport = useViewport(area);

  const camera = useMemo(() => cameraParaViewport(viewport), [viewport]);

  /* As lajes vazias: elas continuam sendo objeto do campo mesmo sem carta. */
  const zonas = useMemo(
    () =>
      PECAS_DA_ARENA.map((peca) => ({
        peca,
        caixa: projetarCaixa(camera, peca.centro, peca.largura, peca.profundidade, viewport),
      })),
    [camera, viewport],
  );

  const pecas = useMemo<readonly PecaPosicionada[]>(
    () =>
      estado.cartas.map((item) => ({
        item,
        caixa: projetarCaixa(camera, item.posicao, 2.0 * item.escala, 2.8 * item.escala, viewport),
      })),
    [estado.cartas, camera, viewport],
  );

  return (
    <div
      className={`arena__interacao${comCena ? '' : ' arena__interacao--sem-cena'}`}
      ref={area}
      data-teste="arena"
    >
      {zonas.map(({ peca, caixa }) => (
        <div
          key={peca.chave}
          className={[
            'zona',
            `zona--${peca.forma}`,
            `zona--${peca.lado}`,
            estado.slotsEmDestaque.includes(peca.chave) ? 'zona--valida' : '',
            estado.slotEmEspera === peca.chave ? 'zona--esperando' : '',
          ]
            .filter((parte) => parte !== '')
            .join(' ')}
          data-ancora={peca.chave}
          style={{
            left: `${String(caixa.x)}px`,
            top: `${String(caixa.y)}px`,
            width: `${String(Math.max(8, caixa.largura))}px`,
            height: `${String(Math.max(8, caixa.altura))}px`,
          }}
        />
      ))}

      {pecas.map(({ item, caixa }) => {
        const rotulo =
          item.carta === null
            ? 'Carta oculta'
            : `${item.carta.nome}, ${NOME_DO_TIPO[item.carta.tipo]}`;
        return (
          <div
            key={item.chave}
            className={[
              'peca',
              item.noLeque ? 'peca--mao' : 'peca--campo',
              item.foco ? 'peca--foco' : '',
              item.deitada ? 'peca--deitada' : '',
            ]
              .filter((parte) => parte !== '')
              .join(' ')}
            style={{
              left: `${String(caixa.x)}px`,
              top: `${String(caixa.y)}px`,
              width: `${String(Math.max(18, caixa.largura))}px`,
              height: `${String(Math.max(24, caixa.altura))}px`,
              zIndex: 10 + item.ordem + (item.foco ? 120 : 0),
              transform: `translate(-50%, -50%) rotate(${String(
                item.noLeque ? (item.giro * 180) / Math.PI : 0,
              )}deg)`,
            }}
          >
            {item.carta === null ? (
              <CartaVirada tamanho="campo" rotuloDeAcesso={rotulo} />
            ) : (
              <CartaDeJogo
                nome={item.carta.nome}
                tipo={NOME_DO_TIPO[item.carta.tipo]}
                moldura={MOLDURA_DO_TIPO[item.carta.tipo]}
                custo={
                  item.carta.custo === null
                    ? null
                    : `${String(item.carta.custo.valor)}${item.carta.custo.recurso === null ? '' : '+'}`
                }
                dano={item.carta.dano}
                impacto={item.carta.impacto}
                cooldown={item.carta.cooldown}
                tamanho={item.noLeque ? 'mao' : 'campo'}
                arte={
                  comCena ? undefined : (
                    <SigiloDaCarta
                      id={String(item.carta.id)}
                      tipo={item.carta.tipo}
                      classe={item.carta.classe}
                    />
                  )
                }
                selecao={item.selecao}
                deitada={item.deitada}
                rotuloDeAcesso={rotulo}
                aoTocar={
                  bloqueada || !item.interativa
                    ? undefined
                    : () => {
                        if (item.carta !== null) aoFocarCarta(item.carta.id);
                      }
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
