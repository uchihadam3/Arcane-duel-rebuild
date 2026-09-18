import type { CardId, CartaDeClasseEquipada } from '@arcane-duel/shared-types';
import { CartaDeJogo, SlotDoCampo } from '@arcane-duel/ui';

import { atributoDaAncora } from './ancoras.js';
import {
  MOLDURA_DO_TIPO,
  NOME_DO_TIPO,
  cartaVisivel,
  nomeDaCarta,
} from '../partida/apresentacao.js';

/*
 * As duas Cartas de Classe, e a Ultimate ao lado delas.
 *
 * Elas começam face-up: o adversário sabe o que você escolheu. O estado é
 * legível pela orientação — Pronta em pé, Ativada deitada — e Exaurida não
 * fica no slot: ela saiu da partida, e fingir que continua lá seria mentir
 * sobre uma decisão irreversível.
 */

const NOME_DO_ESTADO: Readonly<Record<string, string>> = {
  pronta: 'Pronta',
  ativada: 'Ativada',
  exaurida: 'Exaurida',
};

export interface CartasDeClasseProps {
  readonly cartas: readonly CartaDeClasseEquipada[];
  readonly removidas: readonly CardId[];
  readonly lado: 'proprio' | 'adversario';
  readonly aoTocar?: ((carta: CardId) => void) | undefined;
  readonly selecionada?: CardId | null | undefined;
}

export const CartasDeClasse = ({
  cartas,
  removidas,
  lado,
  aoTocar,
  selecionada = null,
}: CartasDeClasseProps): React.JSX.Element => (
  <div className={`cartas-de-classe cartas-de-classe--${lado}`} data-teste={`classe-${lado}`}>
    {cartas.map((equipada, indice) => {
      const visivel = cartaVisivel(equipada.carta);
      const exaurida = equipada.estado === 'exaurida';
      return (
        <SlotDoCampo
          key={equipada.carta}
          ancora={atributoDaAncora(lado, 'carta-de-classe', indice)['data-ancora']}
          assetId="slot-carta-de-classe"
          rotulo={`Carta de Classe ${String(indice + 1)}`}
          estado={exaurida ? 'vazio' : 'ocupado'}
        >
          {visivel !== null && !exaurida && (
            <CartaDeJogo
              nome={visivel.nome}
              tipo={NOME_DO_TIPO[visivel.tipo]}
              moldura={MOLDURA_DO_TIPO[visivel.tipo]}
              tamanho="miniatura"
              deitada={equipada.estado === 'ativada'}
              selecao={selecionada === equipada.carta ? 'selecionada' : 'nenhum'}
              aoTocar={
                aoTocar === undefined
                  ? undefined
                  : () => {
                      aoTocar(equipada.carta);
                    }
              }
            />
          )}
          <span className="cartas-de-classe__estado" data-estado={equipada.estado}>
            {NOME_DO_ESTADO[equipada.estado] ?? equipada.estado}
          </span>
        </SlotDoCampo>
      );
    })}
    {removidas.length > 0 && (
      <p className="cartas-de-classe__removidas">
        Saiu da partida: {removidas.map(nomeDaCarta).join(', ')}
      </p>
    )}
  </div>
);
