import type { ArteProps } from './janela.js';
import { JANELA } from './janela.js';

/*
 * Aparar.
 *
 * O oposto de Golpe de Cerco em tudo: luz fria, composição frontal, e o
 * assunto é o instante em que o ataque **para**. A lâmina do defensor sobe
 * quase vertical e recebe a do atacante de viés; onde as duas se cruzam nasce a
 * faísca, que é a única fonte de luz quente da carta.
 *
 * Nenhuma muralha, nenhum fragmento: quem apara não destrói nada. O que sobra
 * é o arco de guarda atrás das lâminas, curto e contido.
 */
export const Aparar = ({ chave }: ArteProps): React.JSX.Element => {
  const x = JANELA.x;
  const y = JANELA.y;
  const l = JANELA.largura;
  const a = JANELA.altura;
  const cruzamento = { x: x + l * 0.5, y: y + a * 0.44 };

  return (
    <g>
      <defs>
        <radialGradient id={`apFundo-${chave}`} cx="0.5" cy="0.44" r="0.72">
          <stop offset="0" stopColor="#243043" />
          <stop offset="0.55" stopColor="#111823" />
          <stop offset="1" stopColor="#05070b" />
        </radialGradient>
        <linearGradient id={`apLamina-${chave}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2c3238" />
          <stop offset="0.36" stopColor="#c9d4e2" />
          <stop offset="0.52" stopColor="#ffffff" />
          <stop offset="0.68" stopColor="#8e98a6" />
          <stop offset="1" stopColor="#1e2328" />
        </linearGradient>
        <linearGradient id={`apLaminaB-${chave}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1b2026" />
          <stop offset="0.4" stopColor="#7d8794" />
          <stop offset="0.55" stopColor="#dfe6ef" />
          <stop offset="0.75" stopColor="#5b646f" />
          <stop offset="1" stopColor="#15191e" />
        </linearGradient>
        <radialGradient id={`apFaisca-${chave}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.2" stopColor="#ffe9b0" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#ffab3d" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ff6a10" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`apGuarda-${chave}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3f7fd0" stopOpacity="0" />
        </linearGradient>
        <filter id={`apBrilho-${chave}`} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={x} y={y} width={l} height={a} fill={`url(#apFundo-${chave})`} />

      {/*
        O arco de guarda.
        Uma calota atrás das lâminas, apagando para baixo: a postura, e não um
        escudo mágico. Se ele fosse um círculo fechado a carta viraria barreira,
        que é outra coisa.
      */}
      <path
        d={`M ${String(x + l * 0.16)} ${String(y + a * 0.86)}
            A ${String(l * 0.34)} ${String(a * 0.52)} 0 0 1 ${String(x + l * 0.84)} ${String(y + a * 0.86)}`}
        fill={`url(#apGuarda-${chave})`}
        stroke="#9fd8ff"
        strokeOpacity="0.5"
        strokeWidth="3"
      />
      {[0.72, 0.8, 0.88].map((raio) => (
        <path
          key={raio}
          d={`M ${String(x + l * (0.5 - 0.34 * raio))} ${String(y + a * 0.86)}
              A ${String(l * 0.34 * raio)} ${String(a * 0.52 * raio)} 0 0 1 ${String(x + l * (0.5 + 0.34 * raio))} ${String(y + a * 0.86)}`}
          fill="none"
          stroke="#8fd0ff"
          strokeOpacity={0.2}
          strokeWidth="1.5"
        />
      ))}

      {/* A lâmina que atacava: entra de cima à direita e é interrompida. */}
      <g transform={`translate(${String(cruzamento.x)} ${String(cruzamento.y)}) rotate(58)`}>
        <path
          d="M -12 -168 L 12 -168 L 16 40 L 0 62 L -16 40 Z"
          fill={`url(#apLaminaB-${chave})`}
          stroke="#0b0e12"
          strokeWidth="2.5"
        />
        <rect
          x={-34}
          y={40}
          width={68}
          height={13}
          rx={4}
          fill="#4a4139"
          stroke="#15120f"
          strokeWidth="2"
        />
        <rect x={-9} y={53} width={18} height={54} rx={5} fill="#2c2520" />
      </g>

      {/* A lâmina que apara: quase vertical, à frente, com mais luz. */}
      <g transform={`translate(${String(cruzamento.x)} ${String(cruzamento.y)}) rotate(-12)`}>
        <path
          d="M -14 -150 L 14 -150 L 18 52 L 0 76 L -18 52 Z"
          fill={`url(#apLamina-${chave})`}
          stroke="#090c10"
          strokeWidth="3"
        />
        {/* O fio: a linha branca que corre pelo meio da lâmina. */}
        <rect x={-2} y={-146} width={4} height={196} fill="#ffffff" opacity="0.5" />
        <rect
          x={-40}
          y={52}
          width={80}
          height={15}
          rx={5}
          fill="#b8912f"
          stroke="#2a1f08"
          strokeWidth="2"
        />
        <rect x={-10} y={67} width={20} height={58} rx={6} fill="#33291f" />
        <circle cx={0} cy={128} r={11} fill="#b8912f" stroke="#2a1f08" strokeWidth="2" />
      </g>

      {/* A faísca do cruzamento, e o estilhaço de luz em volta dela. */}
      <circle cx={cruzamento.x} cy={cruzamento.y - 54} r={54} fill={`url(#apFaisca-${chave})`} />
      <g filter={`url(#apBrilho-${chave})`}>
        {[-72, -44, -18, 6, 30, 58, 84, 112, 140, 168].map((angulo, indice) => {
          const raio = 26 + ((indice * 13) % 44);
          const radianos = (angulo * Math.PI) / 180;
          return (
            <line
              key={angulo}
              x1={cruzamento.x}
              y1={cruzamento.y - 54}
              x2={cruzamento.x + Math.cos(radianos) * raio}
              y2={cruzamento.y - 54 + Math.sin(radianos) * raio}
              stroke="#ffe0a0"
              strokeOpacity="0.85"
              strokeWidth={indice % 3 === 0 ? 2.5 : 1.5}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      {[
        [0.42, 0.24],
        [0.58, 0.2],
        [0.64, 0.32],
        [0.36, 0.34],
        [0.52, 0.12],
      ].map(([fx, fy], indice) => (
        <circle
          key={indice}
          cx={x + l * (fx ?? 0)}
          cy={y + a * (fy ?? 0)}
          r={indice % 2 === 0 ? 3 : 2}
          fill="#ffd489"
          opacity="0.9"
        />
      ))}
    </g>
  );
};
