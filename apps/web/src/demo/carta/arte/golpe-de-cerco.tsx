import type { ArteProps } from './janela.js';
import { JANELA } from './janela.js';

/*
 * Golpe de Cerco.
 *
 * A leitura em uma olhada: uma arma pesada já desceu, e a muralha está
 * cedendo. O peso vem da diagonal — o martelo entra de cima à esquerda e o
 * ponto de impacto fica abaixo e à direita, onde a pedra se abre.
 *
 * A luz é quente e vem de dentro da rachadura, e não do céu: é a energia do
 * golpe, não o sol. Isso separa esta carta de Aparar, que é fria e frontal.
 */
export const GolpeDeCerco = ({ chave }: ArteProps): React.JSX.Element => {
  const x = JANELA.x;
  const y = JANELA.y;
  const l = JANELA.largura;
  const a = JANELA.altura;

  return (
    <g>
      <defs>
        <linearGradient id={`gcCeu-${chave}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#2b1f18" />
          <stop offset="0.55" stopColor="#140e0b" />
          <stop offset="1" stopColor="#070504" />
        </linearGradient>
        <radialGradient id={`gcBrasa-${chave}`} cx="0.62" cy="0.66" r="0.55">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.95" />
          <stop offset="0.28" stopColor="#ff8a2b" stopOpacity="0.7" />
          <stop offset="0.7" stopColor="#8e2b06" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`gcPedra-${chave}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#6d6660" />
          <stop offset="0.5" stopColor="#3b3733" />
          <stop offset="1" stopColor="#1b1917" />
        </linearGradient>
        <linearGradient id={`gcAco-${chave}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#eef1f6" />
          <stop offset="0.3" stopColor="#9aa2ad" />
          <stop offset="0.55" stopColor="#4d545e" />
          <stop offset="0.8" stopColor="#8d949e" />
          <stop offset="1" stopColor="#2a2e34" />
        </linearGradient>
        <linearGradient id={`gcCabo-${chave}`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#7a5230" />
          <stop offset="0.5" stopColor="#4a3017" />
          <stop offset="1" stopColor="#23150a" />
        </linearGradient>
        <filter id={`gcCalor-${chave}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* Fundo: noite de assédio, com a poeira do impacto subindo. */}
      <rect x={x} y={y} width={l} height={a} fill={`url(#gcCeu-${chave})`} />

      {/* A muralha: blocos grandes, ligeiramente fora de esquadro. */}
      <g fill={`url(#gcPedra-${chave})`} stroke="#0c0a09" strokeWidth="2">
        {[0, 1, 2, 3].map((linha) =>
          [0, 1, 2, 3, 4].map((coluna) => {
            const deslocamento = linha % 2 === 0 ? 0 : 44;
            const bx = x - 30 + coluna * 96 + deslocamento;
            const by = y + 96 + linha * 48;
            return (
              <rect
                key={`${String(linha)}-${String(coluna)}`}
                x={bx}
                y={by}
                width={90}
                height={44}
                rx={3}
                transform={`rotate(${String(((linha + coluna) % 3) - 1)} ${String(bx + 45)} ${String(by + 22)})`}
              />
            );
          }),
        )}
      </g>

      {/* A rachadura: o vazio que se abriu, e o calor que sai dele. */}
      <ellipse
        cx={x + l * 0.62}
        cy={y + a * 0.66}
        rx={l * 0.42}
        ry={a * 0.44}
        fill={`url(#gcBrasa-${chave})`}
      />
      <path
        d={`M ${String(x + l * 0.42)} ${String(y + a)}
            L ${String(x + l * 0.54)} ${String(y + a * 0.72)}
            L ${String(x + l * 0.48)} ${String(y + a * 0.6)}
            L ${String(x + l * 0.6)} ${String(y + a * 0.5)}
            L ${String(x + l * 0.56)} ${String(y + a * 0.38)}
            L ${String(x + l * 0.72)} ${String(y + a * 0.46)}
            L ${String(x + l * 0.68)} ${String(y + a * 0.64)}
            L ${String(x + l * 0.82)} ${String(y + a * 0.78)}
            L ${String(x + l * 0.74)} ${String(y + a)} Z`}
        fill="#0b0705"
        stroke="#ffb35c"
        strokeOpacity="0.9"
        strokeWidth="3.5"
      />
      <path
        d={`M ${String(x + l * 0.5)} ${String(y + a)}
            L ${String(x + l * 0.58)} ${String(y + a * 0.68)}
            L ${String(x + l * 0.68)} ${String(y + a * 0.54)}`}
        fill="none"
        stroke="#ffcf8a"
        strokeOpacity="0.95"
        strokeWidth="7"
        filter={`url(#gcCalor-${chave})`}
      />

      {/* Fragmentos: pedra arrancada, ainda no ar, na direção do golpe. */}
      {[
        [0.5, 0.36, 15, -22],
        [0.62, 0.3, 11, 14],
        [0.74, 0.42, 9, -40],
        [0.4, 0.52, 8, 33],
        [0.82, 0.6, 13, 8],
        [0.68, 0.22, 7, -12],
        [0.9, 0.34, 6, 25],
      ].map(([fx, fy, tamanho, giro], indice) => (
        <path
          key={indice}
          d={`M 0 ${String(-(tamanho ?? 0))} L ${String((tamanho ?? 0) * 0.8)} 0 L 0 ${String((tamanho ?? 0) * 0.7)} L ${String(-(tamanho ?? 0) * 0.6)} ${String((tamanho ?? 0) * 0.2)} Z`}
          transform={`translate(${String(x + l * (fx ?? 0))} ${String(y + a * (fy ?? 0))}) rotate(${String(giro ?? 0)})`}
          fill="#5a534c"
          stroke="#1a1714"
          strokeWidth="1.5"
        />
      ))}

      {/*
        O martelo.
        Ele entra pela diagonal e a cabeça para pouco antes do ponto quente:
        mostrar a arma já em contato mataria a leitura do peso, que vem do
        espaço entre ela e a pedra.

        A cabeça precisa caber inteira no quadro. Na primeira prova ela ficava
        cortada pela quina da janela e lia como uma mancha cinza — o objeto
        mais pesado do desenho virava ruído.
      */}
      <g
        transform={`translate(${String(x + l * 0.46)} ${String(y + a * 0.52)}) rotate(44) scale(0.95)`}
      >
        {/* Cabo */}
        <rect x={-14} y={-4} width={200} height={26} rx={7} fill={`url(#gcCabo-${chave})`} />
        <rect x={-14} y={-4} width={200} height={7} rx={3} fill="#a87848" opacity="0.35" />
        {/* Anéis de reforço */}
        {[26, 70, 120].map((posicao) => (
          <rect key={posicao} x={posicao} y={-7} width={10} height={32} rx={3} fill="#2a2d33" />
        ))}
        {/* Cabeça: um bloco de aço com chanfro, não um retângulo. */}
        <path
          d="M -120 -62 L -30 -48 L -30 66 L -120 80 L -140 44 L -140 -26 Z"
          fill={`url(#gcAco-${chave})`}
          stroke="#111418"
          strokeWidth="3"
        />
        <path d="M -120 -62 L -30 -48 L -30 -26 L -120 -38 Z" fill="#ffffff" opacity="0.22" />
        <path d="M -140 44 L -120 80 L -30 66 L -30 40 Z" fill="#000000" opacity="0.35" />
        {/* Gume: a face que bateu, ainda com calor. */}
        <path d="M -140 -26 L -140 44 L -152 30 L -152 -12 Z" fill="#ffb066" opacity="0.7" />
      </g>

      {/* Linhas de pressão saindo do impacto: o som do golpe, desenhado. */}
      {[-26, -10, 8, 26].map((angulo) => (
        <path
          key={angulo}
          d={`M ${String(x + l * 0.58)} ${String(y + a * 0.6)} l ${String(88 * Math.cos((angulo * Math.PI) / 180))} ${String(88 * Math.sin((angulo * Math.PI) / 180))}`}
          stroke="#ffd9a0"
          strokeOpacity="0.4"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </g>
  );
};
