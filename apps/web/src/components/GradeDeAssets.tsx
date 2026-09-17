import { AssetImage, MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';
import type { CategoriaDeAsset, EstadoDoAsset } from '@arcane-duel/ui';

export interface GradeDeAssetsProps {
  readonly aoMudarEstado: (id: string, estado: EstadoDoAsset) => void;
}

const ROTULO_DA_CATEGORIA: Readonly<Record<CategoriaDeAsset, string>> = {
  arena: 'Arena',
  'board-slot': 'Slots do campo',
  'board-tray': 'Bandejas',
  'card-frame': 'Molduras de carta',
  'card-back': 'Verso',
  hud: 'HUD',
  overlay: 'Overlays de estado',
  icone: 'Ícones universais',
};

const ORDEM: readonly CategoriaDeAsset[] = [
  'card-frame',
  'card-back',
  'arena',
  'board-slot',
  'board-tray',
  'hud',
  'overlay',
  'icone',
];

/**
 * Mostra cada asset declarado no manifesto, carregado do arquivo real. Assets
 * ainda não entregues aparecem com placeholder técnico e ficam marcados.
 */
export const GradeDeAssets = ({ aoMudarEstado }: GradeDeAssetsProps): React.JSX.Element => (
  <>
    {ORDEM.map((categoria) => {
      const entradas = MANIFESTO_DE_ASSETS.filter((entrada) => entrada.categoria === categoria);
      return (
        <section className="painel" key={categoria}>
          <h2>
            {ROTULO_DA_CATEGORIA[categoria]} ({entradas.length})
          </h2>
          <div className="grade-de-assets">
            {entradas.map((entrada) => (
              <figure className="asset" key={entrada.id}>
                <AssetImage
                  assetId={entrada.id}
                  alt={entrada.papel}
                  onEstado={(estado) => {
                    aoMudarEstado(entrada.id, estado);
                  }}
                />
                <figcaption>{entrada.arquivo}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      );
    })}
  </>
);
