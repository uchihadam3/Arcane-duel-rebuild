import type { CardId, ZonaDeCooldown } from '@arcane-duel/shared-types';
import { AssetImage } from '@arcane-duel/ui';

import { atributoDaAncora } from './ancoras.js';
import { nomeDaCarta } from '../partida/apresentacao.js';

/*
 * A trilha física de cooldown.
 *
 * Ela é zona à vista dos dois jogadores: quem jogou a carta, jogou na cara do
 * adversário. Por isso o nome aparece, e não o verso.
 */

export interface CooldownProps {
  readonly zonas: Readonly<Record<ZonaDeCooldown, readonly CardId[]>>;
  readonly lado: 'proprio' | 'adversario';
  readonly aoTocarCarta?: ((carta: CardId) => void) | undefined;
}

const ZONAS: readonly ZonaDeCooldown[] = [1, 2, 3];

export const Cooldown = ({ zonas, lado, aoTocarCarta }: CooldownProps): React.JSX.Element => (
  <div className="cooldown" data-teste="cooldown">
    <AssetImage assetId="tray-cooldown" alt="" className="cooldown__bandeja" />
    <div className="cooldown__zonas">
      {ZONAS.map((zona) => (
        <div
          key={zona}
          className="cooldown__zona"
          data-zona={`CD${String(zona)}`}
          {...atributoDaAncora(lado, zona === 1 ? 'cd1' : zona === 2 ? 'cd2' : 'cd3')}
        >
          <span className="cooldown__titulo">CD{zona}</span>
          <ul className="cooldown__lista">
            {zonas[zona].map((carta) => (
              <li key={carta}>
                {aoTocarCarta === undefined ? (
                  <span className="cooldown__carta">{nomeDaCarta(carta)}</span>
                ) : (
                  <button
                    type="button"
                    className="cooldown__carta cooldown__carta--tocavel"
                    onClick={() => {
                      aoTocarCarta(carta);
                    }}
                  >
                    {nomeDaCarta(carta)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);
