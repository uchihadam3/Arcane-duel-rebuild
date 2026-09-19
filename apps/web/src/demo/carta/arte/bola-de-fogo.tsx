import type { ArteProps } from './janela.js';
import { JANELA } from './janela.js';

/*
 * Bola de Fogo.
 *
 * O assunto é a **esfera**, e por isso ela é redonda de verdade: núcleo branco
 * deslocado do centro geométrico, massa laranja em volta, e a borda apagando
 * em fumaça. Fogo desenhado como um disco chapado é o erro clássico; o que dá
 * volume é o núcleo estar fora do meio e a sombra ficar do lado oposto a ele.
 *
 * As runas ficam discretas e atrás, num anel inclinado: elas dizem que isto é
 * feitiço, e não incêndio. Se aparecessem na frente roubariam a esfera.
 */
export const BolaDeFogo = ({ chave }: ArteProps): React.JSX.Element => {
  const x = JANELA.x;
  const y = JANELA.y;
  const l = JANELA.largura;
  const a = JANELA.altura;
  const centro = { x: x + l * 0.52, y: y + a * 0.5 };
  const raio = a * 0.34;

  return (
    <g>
      <defs>
        <radialGradient id={`bfFundo-${chave}`} cx="0.52" cy="0.5" r="0.75">
          <stop offset="0" stopColor="#4a1c06" />
          <stop offset="0.45" stopColor="#1e0c05" />
          <stop offset="1" stopColor="#070303" />
        </radialGradient>
        {/* O núcleo fora do centro é o que dá esfericidade. */}
        <radialGradient id={`bfNucleo-${chave}`} cx="0.4" cy="0.36" r="0.68">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.16" stopColor="#fff3c4" />
          <stop offset="0.34" stopColor="#ffc14d" />
          <stop offset="0.58" stopColor="#f2721a" />
          <stop offset="0.82" stopColor="#a52b07" />
          <stop offset="1" stopColor="#4a1102" />
        </radialGradient>
        <radialGradient id={`bfHalo-${chave}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff9a3c" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#c23c06" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`bfRastro-${chave}`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#fff0b8" stopOpacity="0.95" />
          <stop offset="0.22" stopColor="#ffb14a" stopOpacity="0.8" />
          <stop offset="0.6" stopColor="#e2560c" stopOpacity="0.4" />
          <stop offset="1" stopColor="#7a1c02" stopOpacity="0" />
        </linearGradient>
        <filter id={`bfCalor-${chave}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id={`bfFumaca-${chave}`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="26" />
        </filter>
      </defs>

      <rect x={x} y={y} width={l} height={a} fill={`url(#bfFundo-${chave})`} />

      {/* Anel de runas, atrás e inclinado. */}
      <g opacity="0.38">
        <ellipse
          cx={centro.x}
          cy={centro.y + raio * 0.28}
          rx={raio * 1.72}
          ry={raio * 0.52}
          fill="none"
          stroke="#ffb35c"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
        <ellipse
          cx={centro.x}
          cy={centro.y + raio * 0.28}
          rx={raio * 1.44}
          ry={raio * 0.42}
          fill="none"
          stroke="#ff8a2b"
          strokeOpacity="0.35"
          strokeWidth="1.4"
        />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angulo) => {
          const radianos = (angulo * Math.PI) / 180;
          const rx = centro.x + Math.cos(radianos) * raio * 1.58;
          const ry = centro.y + raio * 0.28 + Math.sin(radianos) * raio * 0.47;
          return (
            <path
              key={angulo}
              transform={`translate(${String(rx)} ${String(ry)}) rotate(${String(angulo / 2)})`}
              d="M -6 -9 L 6 -9 M 0 -9 L 0 9 M -5 4 L 5 4"
              stroke="#ffd08a"
              strokeOpacity="0.85"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Halo de calor, bem difuso. */}
      <circle cx={centro.x} cy={centro.y} r={raio * 2.1} fill={`url(#bfHalo-${chave})`} />

      {/*
        A fumaça é **rastro**, e fica atrás.
        Centrada sobre a esfera e deslocada para cima, ela lia como uma
        mordida escura no contorno — o desenho perdia a forma esférica
        exatamente onde ela mais importa.
      */}
      <g filter={`url(#bfFumaca-${chave})`} opacity="0.16">
        <ellipse
          cx={centro.x - raio * 1.7}
          cy={centro.y + raio * 0.2}
          rx={raio * 0.8}
          ry={raio * 0.55}
          fill="#4a2409"
        />
      </g>

      {/*
        Línguas de fogo: o rastro, não uma coroa.
        A esfera está indo para a direita, então o fogo se estica para a
        esquerda e afina. Desenhá-lo em volta, para todos os lados, fazia o
        desenho parar — e uma Bola de Fogo parada não é uma Bola de Fogo.
      */}
      {[
        [0.7, 1.7, 13],
        [0.3, 2.15, 17],
        [-0.03, 2.45, 20],
        [-0.38, 2.1, 16],
        [-0.74, 1.6, 12],
      ].map(([desvio, alcance, espessura], indice) => {
        const base = {
          x: centro.x - raio * 0.55,
          y: centro.y + raio * (desvio ?? 0) * 0.62,
        };
        const ponta = {
          x: centro.x - raio * (alcance ?? 0),
          y: centro.y + raio * (desvio ?? 0) * 1.05,
        };
        const meia = (espessura ?? 0) / 2;
        return (
          <path
            key={indice}
            d={`M ${String(base.x)} ${String(base.y - meia)}
                Q ${String((base.x + ponta.x) / 2)} ${String(base.y - meia * 1.5)}
                  ${String(ponta.x)} ${String(ponta.y)}
                Q ${String((base.x + ponta.x) / 2)} ${String(base.y + meia * 1.5)}
                  ${String(base.x)} ${String(base.y + meia)} Z`}
            fill={`url(#bfRastro-${chave})`}
            opacity={0.78 + (indice === 2 ? 0.22 : 0)}
          />
        );
      })}

      {/* A esfera. */}
      <circle cx={centro.x} cy={centro.y} r={raio} fill={`url(#bfNucleo-${chave})`} />
      {/* O brilho especular, pequeno e alto — o que grita "isto é esférico". */}
      <ellipse
        cx={centro.x - raio * 0.3}
        cy={centro.y - raio * 0.36}
        rx={raio * 0.2}
        ry={raio * 0.13}
        fill="#ffffff"
        opacity="0.55"
      />
      {/* O núcleo aceso, visto por dentro. */}
      <circle
        cx={centro.x - raio * 0.08}
        cy={centro.y - raio * 0.06}
        r={raio * 0.3}
        fill="#fff6d0"
        opacity="0.75"
        filter={`url(#bfCalor-${chave})`}
      />

      {/* Brasas em volta, todas na mesma direção: a esfera está indo. */}
      {[
        [-2.3, -0.6, 4],
        [-2.65, 0.25, 3],
        [-1.95, 0.85, 5],
        [-1.5, -0.95, 3],
        [-2.9, -0.15, 3],
        [1.25, -0.5, 3],
        [-1.15, 1.2, 4],
        [1.05, 0.8, 3],
      ].map(([dx, dy, r], indice) => (
        <circle
          key={indice}
          cx={centro.x + raio * (dx ?? 0)}
          cy={centro.y + raio * (dy ?? 0)}
          r={r}
          fill={indice % 3 === 0 ? '#fff0b8' : '#ff9a3c'}
          opacity={0.85}
        />
      ))}
    </g>
  );
};
