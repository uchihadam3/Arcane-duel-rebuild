import { useMemo } from 'react';
import type { ClassId, TipoDeCarta } from '@arcane-duel/shared-types';

import { caminhoDoSigilo, sigiloDaCarta } from '../arena/sigilo.js';

/*
 * O sigilo, fora do canvas.
 *
 * A arena desenha o sigilo direto na textura da carta. Aqui ele aparece em
 * SVG, para a mesma carta ter a mesma arte no inspetor e no campo em DOM — e
 * para que o cliente sem WebGL não mostre uma janela vazia onde deveria haver
 * composição.
 *
 * É a mesma função geradora nos dois lados: a carta não pode ter duas artes.
 */

export interface SigiloDaCartaProps {
  readonly id: string;
  readonly tipo: TipoDeCarta;
  readonly classe: ClassId;
}

export const SigiloDaCarta = ({ id, tipo, classe }: SigiloDaCartaProps): React.JSX.Element => {
  const sigilo = useMemo(() => sigiloDaCarta(id, tipo, classe), [id, tipo, classe]);

  return (
    <svg className="sigilo" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id={`nucleo-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={sigilo.corPrimaria} stopOpacity="0.9" />
          <stop offset="55%" stopColor={sigilo.corPrimaria} stopOpacity="0.28" />
          <stop offset="100%" stopColor={sigilo.corPrimaria} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0.5" cy="0.5" r="0.46" fill={`url(#nucleo-${id})`} />
      {Array.from({ length: sigilo.aneis }, (_, anel) => (
        <path
          key={anel}
          d={caminhoDoSigilo(sigilo, anel)}
          fill="none"
          stroke={anel === 0 ? sigilo.corPrimaria : sigilo.corSecundaria}
          strokeWidth={anel === 0 ? 0.022 : 0.011}
          opacity={0.34 + 0.2 * (sigilo.aneis - anel)}
        />
      ))}
      {sigilo.nos.map((no, indice) => (
        <circle
          key={indice}
          cx={no.x}
          cy={no.y}
          r={no.raio}
          fill={sigilo.corSecundaria}
          opacity="0.85"
        />
      ))}
    </svg>
  );
};
