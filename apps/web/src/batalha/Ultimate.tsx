import type { CardId, UltimateEquipada } from '@arcane-duel/shared-types';
import { CartaDeJogo, SlotDoCampo } from '@arcane-duel/ui';

import { atributoDaAncora } from './ancoras.js';
import { MOLDURA_DO_TIPO, NOME_DO_TIPO, cartaVisivel } from '../partida/apresentacao.js';

/*
 * A Ultimate.
 *
 * Ela fica sempre à vista e é uma única utilização por partida. O estado
 * precisa ser inequívoco: consumida não volta, e a tela diz isso com palavra,
 * não só com opacidade.
 */

export interface UltimateProps {
  readonly ultimate: UltimateEquipada;
  readonly lado: 'proprio' | 'adversario';
  readonly aoTocar?: ((carta: CardId) => void) | undefined;
  readonly selecionada?: boolean | undefined;
}

export const Ultimate = ({
  ultimate,
  lado,
  aoTocar,
  selecionada = false,
}: UltimateProps): React.JSX.Element => {
  const visivel = cartaVisivel(ultimate.carta);
  const consumida = ultimate.estado === 'consumida';

  return (
    <SlotDoCampo
      ancora={atributoDaAncora(lado, 'ultimate')['data-ancora']}
      assetId="slot-ultimate"
      rotulo="Ultimate"
      estado={consumida ? 'vazio' : 'ocupado'}
      className={`ultimate ultimate--${lado}`}
    >
      {visivel !== null && (
        <CartaDeJogo
          nome={visivel.nome}
          tipo={NOME_DO_TIPO[visivel.tipo]}
          moldura={MOLDURA_DO_TIPO[visivel.tipo]}
          tamanho="miniatura"
          indisponivel={consumida}
          selecao={selecionada ? 'selecionada' : 'nenhum'}
          aoTocar={
            aoTocar === undefined || consumida
              ? undefined
              : () => {
                  aoTocar(ultimate.carta);
                }
          }
        />
      )}
      <span className="ultimate__estado" data-estado={ultimate.estado}>
        {consumida ? 'Consumida' : 'Disponível'}
      </span>
    </SlotDoCampo>
  );
};
