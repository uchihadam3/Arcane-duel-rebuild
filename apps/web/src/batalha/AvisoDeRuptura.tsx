import { useEffect, useState } from 'react';

/*
 * A Ruptura, sem o VFX final.
 *
 * A Etapa 6 substitui isto pelo efeito cinematográfico. O que não pode
 * acontecer, nem agora nem depois, é a Ruptura passar despercebida: ela muda o
 * Dano e o jogador precisa ver que mudou.
 */

const DURACAO_MS = 800;

export interface AvisoDeRupturaProps {
  readonly bonus: number | null;
  readonly alvo: string | null;
}

export const AvisoDeRuptura = ({ bonus, alvo }: AvisoDeRupturaProps): React.JSX.Element | null => {
  const [visivel, setVisivel] = useState(bonus !== null);

  useEffect(() => {
    if (bonus === null) return;
    setVisivel(true);
    const id = window.setTimeout(() => {
      setVisivel(false);
    }, DURACAO_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [bonus, alvo]);

  if (bonus === null || !visivel) return null;

  return (
    <div className="ruptura" data-teste="ruptura" role="status">
      <span className="ruptura__titulo">RUPTURA</span>
      {bonus > 0 && <span className="ruptura__bonus">+{bonus} D</span>}
      {alvo !== null && <span className="ruptura__alvo">{alvo}</span>}
    </div>
  );
};
