import { useEffect, useState } from 'react';
import { AssetImage } from '@arcane-duel/ui';

/*
 * O aviso curto de troca de turno.
 *
 * Ele é apresentação pura: o estado já mudou quando o banner aparece, e a
 * lógica nunca espera por ele. Some sozinho, e um toque em qualquer lugar não
 * fica preso atrás dele.
 */

const DURACAO_MS = 900;

export interface BannerDeTurnoProps {
  readonly texto: string | null;
}

export const BannerDeTurno = ({ texto }: BannerDeTurnoProps): React.JSX.Element | null => {
  const [visivel, setVisivel] = useState(texto !== null);

  useEffect(() => {
    if (texto === null) return;
    setVisivel(true);
    const id = window.setTimeout(() => {
      setVisivel(false);
    }, DURACAO_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [texto]);

  if (texto === null || !visivel) return null;

  return (
    <div className="banner-de-turno" data-teste="banner-de-turno" role="status">
      <AssetImage assetId="hud-faixa-de-turno" alt="" className="banner-de-turno__faixa" />
      <span className="banner-de-turno__texto">{texto}</span>
    </div>
  );
};
