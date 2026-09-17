import { useEffect, useState } from 'react';

import { obterAsset } from '../assets/manifest.js';
import { useResolvedorDeAssets } from './AssetProvider.js';

export interface AssetImageProps {
  /** Id semântico do asset no manifesto. */
  readonly assetId: string;
  /** Texto alternativo. Use string vazia quando a imagem for puramente decorativa. */
  readonly alt: string;
  readonly className?: string;
  readonly loading?: 'eager' | 'lazy';
  /** Avisa quando o arquivo carregou ou caiu para placeholder. */
  readonly onEstado?: (estado: EstadoDoAsset) => void;
}

export type EstadoDoAsset = 'carregado' | 'ausente';

/**
 * Renderiza um asset aprovado a partir do seu id.
 *
 * Se o arquivo ainda não foi entregue, a imagem cai para um placeholder
 * técnico claramente marcado, em vez de quebrar a tela ou inventar arte.
 */
export const AssetImage = ({
  assetId,
  alt,
  className,
  loading = 'lazy',
  onEstado,
}: AssetImageProps): React.JSX.Element => {
  const resolvedor = useResolvedorDeAssets();
  const [ausente, setAusente] = useState(false);

  useEffect(() => {
    setAusente(false);
  }, [assetId]);

  const entrada = obterAsset(assetId);
  const src = ausente ? resolvedor.placeholder(assetId) : resolvedor.url(assetId);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      draggable={false}
      data-asset-id={assetId}
      data-asset-ausente={ausente ? 'true' : 'false'}
      title={entrada?.papel}
      onLoad={() => {
        if (!ausente) onEstado?.('carregado');
      }}
      onError={() => {
        setAusente(true);
        onEstado?.('ausente');
      }}
    />
  );
};
