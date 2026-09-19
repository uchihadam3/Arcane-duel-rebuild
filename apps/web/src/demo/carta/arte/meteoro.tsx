import type { ArteProps } from './janela.js';
import { JANELA } from './janela.js';

/*
 * Meteoro.
 *
 * A única das quatro que é uma **paisagem**, e é de propósito: Ultimate
 * precisa ler como acontecimento, não como objeto. Por isso há horizonte,
 * céu, escala e um chão que recebe a luz.
 *
 * A composição é uma diagonal longa do canto superior direito ao inferior
 * esquerdo, com o círculo arcano aberto no alto — a coisa veio de algum lugar,
 * e alguém a chamou. A luz é roxa no céu e laranja no fim do rastro: as duas
 * cores contam que é magia virando fogo.
 */
export const Meteoro = ({ chave }: ArteProps): React.JSX.Element => {
  const x = JANELA.x;
  const y = JANELA.y;
  const l = JANELA.largura;
  const a = JANELA.altura;
  const horizonte = y + a * 0.78;
  const cabeca = { x: x + l * 0.36, y: y + a * 0.6 };

  return (
    <g>
      <defs>
        <linearGradient id={`mtCeu-${chave}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#1a1040" />
          <stop offset="0.45" stopColor="#2a1445" />
          <stop offset="0.78" stopColor="#3b1836" />
          <stop offset="1" stopColor="#120a18" />
        </linearGradient>
        <linearGradient id={`mtChao-${chave}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a2418" />
          <stop offset="0.35" stopColor="#1e0f0c" />
          <stop offset="1" stopColor="#080505" />
        </linearGradient>
        <radialGradient id={`mtCirculo-${chave}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#d9c4ff" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#8a6bff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#3a1f8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`mtRastro-${chave}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6bff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#b48bff" stopOpacity="0.4" />
          <stop offset="0.72" stopColor="#ff9a3c" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff0c0" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id={`mtCabeca-${chave}`} cx="0.42" cy="0.38" r="0.66">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.22" stopColor="#ffe9a8" />
          <stop offset="0.5" stopColor="#ff8f2a" />
          <stop offset="0.8" stopColor="#a02a06" />
          <stop offset="1" stopColor="#3a0f02" />
        </radialGradient>
        <radialGradient id={`mtImpacto-${chave}`} cx="0.5" cy="1" r="0.8">
          <stop offset="0" stopColor="#ffd08a" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#ff7a1e" stopOpacity="0.3" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id={`mtBrilho-${chave}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`mtNuvem-${chave}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.03" numOctaves="3" seed="23" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
        </filter>
      </defs>

      <rect x={x} y={y} width={l} height={a} fill={`url(#mtCeu-${chave})`} />
      <rect
        x={x}
        y={y}
        width={l}
        height={a * 0.82}
        fill="#6a5aa0"
        filter={`url(#mtNuvem-${chave})`}
        opacity="0.32"
      />

      {/* Estrelas: poucas, desiguais, e nenhuma perto do meteoro. */}
      {[
        [0.08, 0.12],
        [0.18, 0.28],
        [0.3, 0.08],
        [0.12, 0.44],
        [0.88, 0.1],
        [0.76, 0.24],
        [0.94, 0.36],
        [0.66, 0.06],
        [0.05, 0.62],
        [0.22, 0.56],
      ].map(([sx, sy], indice) => (
        <circle
          key={indice}
          cx={x + l * (sx ?? 0)}
          cy={y + a * (sy ?? 0)}
          r={indice % 3 === 0 ? 2 : 1.2}
          fill="#e8dcff"
          opacity={indice % 2 === 0 ? 0.85 : 0.5}
        />
      ))}

      {/* O círculo arcano, em perspectiva, alto e à direita. */}
      <g transform={`translate(${String(x + l * 0.74)} ${String(y + a * 0.2)})`}>
        <ellipse rx={l * 0.24} ry={a * 0.1} fill={`url(#mtCirculo-${chave})`} />
        {[1, 0.78, 0.52].map((escala) => (
          <ellipse
            key={escala}
            rx={l * 0.24 * escala}
            ry={a * 0.1 * escala}
            fill="none"
            stroke="#c9b4ff"
            strokeOpacity={0.3 + (1 - escala) * 0.5}
            strokeWidth={escala === 1 ? 2.4 : 1.4}
          />
        ))}
        {[0, 60, 120, 180, 240, 300].map((angulo) => {
          const radianos = (angulo * Math.PI) / 180;
          return (
            <line
              key={angulo}
              x1={Math.cos(radianos) * l * 0.12}
              y1={Math.sin(radianos) * a * 0.05}
              x2={Math.cos(radianos) * l * 0.235}
              y2={Math.sin(radianos) * a * 0.098}
              stroke="#d9c4ff"
              strokeOpacity="0.55"
              strokeWidth="1.6"
            />
          );
        })}
      </g>

      {/* O rastro: uma cunha longa que estreita até a cabeça. */}
      <path
        d={`M ${String(x + l * 1.02)} ${String(y - a * 0.08)}
            L ${String(x + l * 1.06)} ${String(y + a * 0.06)}
            L ${String(cabeca.x + 16)} ${String(cabeca.y + 14)}
            L ${String(cabeca.x - 4)} ${String(cabeca.y - 12)} Z`}
        fill={`url(#mtRastro-${chave})`}
      />
      <path
        d={`M ${String(x + l * 1.02)} ${String(y - a * 0.02)}
            L ${String(cabeca.x + 6)} ${String(cabeca.y + 2)}`}
        stroke="#fff0c0"
        strokeOpacity="0.6"
        strokeWidth="3"
        fill="none"
        filter={`url(#mtBrilho-${chave})`}
      />

      {/* Fagulhas que se soltaram do rastro. */}
      {[
        [0.86, 0.14],
        [0.74, 0.3],
        [0.62, 0.42],
        [0.92, 0.06],
        [0.68, 0.24],
        [0.54, 0.52],
      ].map(([fx, fy], indice) => (
        <circle
          key={indice}
          cx={x + l * (fx ?? 0) + indice * 3}
          cy={y + a * (fy ?? 0) - indice * 2}
          r={indice % 2 === 0 ? 3 : 2}
          fill="#ffca7a"
          opacity="0.8"
        />
      ))}

      {/* O chão, já iluminado pelo que vem. */}
      <path
        d={`M ${String(x)} ${String(horizonte + 14)}
            Q ${String(x + l * 0.3)} ${String(horizonte - 10)} ${String(x + l * 0.56)} ${String(horizonte + 4)}
            Q ${String(x + l * 0.8)} ${String(horizonte + 16)} ${String(x + l)} ${String(horizonte - 4)}
            L ${String(x + l)} ${String(y + a)} L ${String(x)} ${String(y + a)} Z`}
        fill={`url(#mtChao-${chave})`}
      />
      <ellipse
        cx={x + l * 0.3}
        cy={horizonte + a * 0.16}
        rx={l * 0.42}
        ry={a * 0.2}
        fill={`url(#mtImpacto-${chave})`}
      />

      {/* A cabeça do meteoro, sobre tudo. */}
      <g filter={`url(#mtBrilho-${chave})`}>
        <circle cx={cabeca.x} cy={cabeca.y} r={a * 0.115} fill={`url(#mtCabeca-${chave})`} />
        <ellipse
          cx={cabeca.x - a * 0.035}
          cy={cabeca.y - a * 0.04}
          rx={a * 0.026}
          ry={a * 0.017}
          fill="#ffffff"
          opacity="0.6"
        />
      </g>

      {/* Silhuetas no chão: escala. Sem elas o meteoro pode ter um metro. */}
      {[0.08, 0.14, 0.2, 0.9, 0.96].map((px, indice) => (
        <path
          key={px}
          d={`M ${String(x + l * px)} ${String(y + a)}
              L ${String(x + l * px)} ${String(horizonte + (indice % 2 === 0 ? 2 : 8))}
              l ${String(6 + indice)} ${String(-10 - indice * 3)}
              l ${String(6 + indice)} ${String(10 + indice * 3)}
              L ${String(x + l * px + 12 + indice * 2)} ${String(y + a)} Z`}
          fill="#050303"
          opacity="0.9"
        />
      ))}
    </g>
  );
};
