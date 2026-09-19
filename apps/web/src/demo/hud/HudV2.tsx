import type { ClassId, VisaoDeJogador } from '@arcane-duel/shared-types';

import { corDaClasse } from '../carta/paleta.js';

/*
 * O HUD da Demo V2, desenhado por código.
 *
 * Nenhum PNG. Metal e vidro em SVG, pelas mesmas três camadas do resto da
 * linguagem: bisel de ferro, fio de ouro, e a energia da classe como única
 * coisa que emite luz.
 *
 * A regra que decide todo o layout é a legibilidade em 915 × 412: Vida e Guarda
 * têm número **e** barra, porque a barra dá a proporção num relance e o número
 * dá a conta exata para decidir a jogada. Uma coisa sem a outra obriga o
 * jogador a calcular no meio do turno.
 */

const FONTE_NUMERO = "'SF Mono', 'Segoe UI', 'Noto Sans', system-ui, sans-serif";
const FONTE_ROTULO = "'Iowan Old Style', Palatino, Georgia, serif";

interface BarraProps {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly valor: number;
  readonly maximo: number;
  readonly cor: string;
  readonly chave: string;
}

/** Uma barra de vidro: cavidade escura, líquido, e o brilho por cima. */
const Barra = ({ x, y, largura, valor, maximo, cor, chave }: BarraProps): React.JSX.Element => {
  const fracao = maximo <= 0 ? 0 : Math.max(0, Math.min(1, valor / maximo));
  return (
    <g>
      <rect x={x} y={y} width={largura} height={12} rx={6} fill="#07070c" />
      <rect
        x={x}
        y={y}
        width={largura * fracao}
        height={12}
        rx={6}
        fill={`url(#hudLiquido-${chave})`}
        style={{ transition: 'width 320ms cubic-bezier(.2,.7,.3,1)' }}
      />
      {/* O reflexo no topo do vidro, que é o que o faz parecer vidro. */}
      <rect
        x={x + 2}
        y={y + 2}
        width={Math.max(0, largura * fracao - 4)}
        height={3.5}
        rx={2}
        fill="#ffffff"
        opacity="0.3"
      />
      <rect
        x={x}
        y={y}
        width={largura}
        height={12}
        rx={6}
        fill="none"
        stroke={cor}
        strokeOpacity="0.5"
        strokeWidth="1.2"
      />
    </g>
  );
};

export interface HudV2Props {
  readonly jogador: VisaoDeJogador;
  readonly rotulo: string;
  /** `true` no HUD de baixo: ele mostra AP e Reserva, que são comando. */
  readonly detalhado: boolean;
  readonly daVez: boolean;
  /** Em que canto ele mora. Sem isto os dois HUDs caem um sobre o outro. */
  readonly posicao: 'maquina' | 'jogador';
  readonly dadoDeTeste: string;
}

/** Brasas do Guerreiro, orbes do Mago, e nada para quem não tem moeda. */
const Recurso = ({
  classe,
  quantidade,
  maximo,
  cor,
}: {
  readonly classe: ClassId;
  readonly quantidade: number;
  readonly maximo: number;
  readonly cor: string;
}): React.JSX.Element | null => {
  if (classe !== 'guerreiro' && classe !== 'mago') return null;
  const fichas = Array.from({ length: maximo }, (_, indice) => indice);
  return (
    <g>
      {fichas.map((indice) => {
        const aceso = indice < quantidade;
        const cx = 8 + indice * 17;
        if (classe === 'guerreiro') {
          // Brasa: losango, que é a forma do Momentum.
          return (
            <path
              key={indice}
              d={`M ${String(cx)} 1 L ${String(cx + 7)} 9 L ${String(cx)} 17 L ${String(cx - 7)} 9 Z`}
              fill={aceso ? cor : '#1c1d24'}
              stroke={aceso ? '#ffd9b0' : '#33353f'}
              strokeWidth="1.2"
              opacity={aceso ? 1 : 0.7}
            />
          );
        }
        return (
          <circle
            key={indice}
            cx={cx}
            cy={9}
            r={6.5}
            fill={aceso ? cor : '#1c1d24'}
            stroke={aceso ? '#cdc4ff' : '#33353f'}
            strokeWidth="1.2"
            opacity={aceso ? 1 : 0.7}
          />
        );
      })}
    </g>
  );
};

export const HudV2 = ({
  jogador,
  rotulo,
  detalhado,
  daVez,
  posicao,
  dadoDeTeste,
}: HudV2Props): React.JSX.Element => {
  const cores = corDaClasse(jogador.classe);
  const chave = dadoDeTeste;
  const recurso = jogador.recurso;
  const quantidade =
    recurso.classe === 'guerreiro'
      ? recurso.momentum
      : recurso.classe === 'mago'
        ? recurso.mana
        : 0;
  const maximoDoRecurso = recurso.classe === 'guerreiro' ? 3 : 6;
  const usadas = jogador.acoes.filter((slot) => slot.situacao === 'resolvida').length;

  return (
    <div
      className={`v2-hud v2-hud--${posicao}${daVez ? ' v2-hud--da-vez' : ''}`}
      data-teste={dadoDeTeste}
      style={{ ['--v2-energia' as string]: cores.energia }}
    >
      <svg viewBox="0 0 430 92" className="v2-hud__svg" aria-hidden="true">
        <defs>
          <linearGradient id={`hudMetal-${chave}`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="#3a3b45" />
            <stop offset="0.4" stopColor="#1d1e25" />
            <stop offset="1" stopColor="#0b0c10" />
          </linearGradient>
          <linearGradient id={`hudOuro-${chave}`} x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="#f0dba4" />
            <stop offset="0.5" stopColor="#b8912f" />
            <stop offset="1" stopColor="#5a4210" />
          </linearGradient>
          <linearGradient id={`hudLiquido-${chave}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={cores.energiaClara} />
            <stop offset="0.5" stopColor={cores.energia} />
            <stop offset="1" stopColor={cores.energiaEscura} />
          </linearGradient>
          <linearGradient id={`hudVida-${chave}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff9a8a" />
            <stop offset="0.5" stopColor="#d1382a" />
            <stop offset="1" stopColor="#5e120c" />
          </linearGradient>
          <linearGradient id={`hudGuarda-${chave}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a8d4ff" />
            <stop offset="0.5" stopColor="#3b7fd0" />
            <stop offset="1" stopColor="#12335c" />
          </linearGradient>
        </defs>

        <path
          d="M 14 0 H 416 L 430 14 V 78 L 416 92 H 14 L 0 78 V 14 Z"
          fill={`url(#hudMetal-${chave})`}
        />
        <path
          d="M 14 0 H 416 L 430 14 V 78 L 416 92 H 14 L 0 78 V 14 Z"
          fill="none"
          stroke={`url(#hudOuro-${chave})`}
          strokeWidth="2.4"
          strokeOpacity={daVez ? 1 : 0.55}
        />

        {/* Identidade: classe e quem é. */}
        <text
          x="18"
          y="27"
          fontFamily={FONTE_ROTULO}
          fontSize="19"
          fill={cores.energiaClara}
          letterSpacing="2"
        >
          {jogador.classe.toUpperCase()}
        </text>
        <text
          x="18"
          y="46"
          fontFamily={FONTE_ROTULO}
          fontSize="14"
          fill="#9a927f"
          letterSpacing="0.8"
        >
          {rotulo}
        </text>

        {/* Vida. */}
        <text x="18" y="76" fontFamily={FONTE_NUMERO} fontSize="26" fontWeight="700" fill="#ffd9d2">
          {jogador.vida}
        </text>
        <text
          x="58"
          y="76"
          fontFamily={FONTE_ROTULO}
          fontSize="12"
          fill="#8e8474"
          letterSpacing="1.4"
        >
          VIDA
        </text>
        <g>
          <rect x="100" y="60" width="120" height="12" rx="6" fill="#07070c" />
          <rect
            x="100"
            y="60"
            width={120 * Math.max(0, Math.min(1, jogador.vida / 30))}
            height="12"
            rx="6"
            fill={`url(#hudVida-${chave})`}
            style={{ transition: 'width 320ms cubic-bezier(.2,.7,.3,1)' }}
          />
          <rect
            x="100"
            y="60"
            width="120"
            height="12"
            rx="6"
            fill="none"
            stroke="#d1382a"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
        </g>

        {/* Guarda. */}
        <text
          x="238"
          y="76"
          fontFamily={FONTE_NUMERO}
          fontSize="26"
          fontWeight="700"
          fill="#cfe4ff"
        >
          {jogador.guarda}
        </text>
        <text
          x="272"
          y="76"
          fontFamily={FONTE_ROTULO}
          fontSize="12"
          fill="#8e8474"
          letterSpacing="1.4"
        >
          GUARDA
        </text>
        <g>
          <rect x="332" y="60" width="82" height="12" rx="6" fill="#07070c" />
          <rect
            x="332"
            y="60"
            width={82 * Math.max(0, Math.min(1, jogador.guarda / 6))}
            height="12"
            rx="6"
            fill={`url(#hudGuarda-${chave})`}
            style={{ transition: 'width 320ms cubic-bezier(.2,.7,.3,1)' }}
          />
          <rect
            x="332"
            y="60"
            width="82"
            height="12"
            rx="6"
            fill="none"
            stroke="#3b7fd0"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
        </g>

        {/* Recurso da classe. */}
        <g transform="translate(150 12)">
          <Recurso
            classe={jogador.classe}
            quantidade={quantidade}
            maximo={maximoDoRecurso}
            cor={cores.energia}
          />
        </g>

        {detalhado && (
          <g>
            <text
              x="296"
              y="24"
              fontFamily={FONTE_NUMERO}
              fontSize="19"
              fontWeight="700"
              fill="#f2e6c8"
            >
              {jogador.pontosDeAcao}
            </text>
            <text
              x="312"
              y="24"
              fontFamily={FONTE_ROTULO}
              fontSize="11"
              fill="#8e8474"
              letterSpacing="1"
            >
              AP
            </text>
            <text
              x="340"
              y="24"
              fontFamily={FONTE_NUMERO}
              fontSize="19"
              fontWeight="700"
              fill="#f2e6c8"
            >
              {jogador.reserva}
            </text>
            <text
              x="356"
              y="24"
              fontFamily={FONTE_ROTULO}
              fontSize="11"
              fill="#8e8474"
              letterSpacing="1"
            >
              RES
            </text>
            <text
              x="396"
              y="24"
              fontFamily={FONTE_NUMERO}
              fontSize="17"
              fontWeight="700"
              fill="#f2e6c8"
              textAnchor="middle"
              data-teste={`acoes-${dadoDeTeste}`}
            >
              {usadas}/3
            </text>
          </g>
        )}

        {/* Condições, quando existem: elas mudam a conta da próxima jogada. */}
        {(jogador.condicoes.queimadura > 0 || jogador.condicoes.lento > 0) && (
          <g transform="translate(296 34)">
            {jogador.condicoes.queimadura > 0 && (
              <g>
                <circle cx="8" cy="8" r="8" fill="#5e120c" stroke="#ff8a3c" strokeWidth="1.4" />
                <text
                  x="8"
                  y="12"
                  fontFamily={FONTE_NUMERO}
                  fontSize="11"
                  fontWeight="700"
                  fill="#ffd0a0"
                  textAnchor="middle"
                >
                  {jogador.condicoes.queimadura}
                </text>
              </g>
            )}
            {jogador.condicoes.lento > 0 && (
              <g transform="translate(24 0)">
                <circle cx="8" cy="8" r="8" fill="#12335c" stroke="#7fd8ff" strokeWidth="1.4" />
                <text
                  x="8"
                  y="12"
                  fontFamily={FONTE_NUMERO}
                  fontSize="11"
                  fontWeight="700"
                  fill="#cfe9ff"
                  textAnchor="middle"
                >
                  {jogador.condicoes.lento}
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
};

/** Barra exportada para quem precisar dela fora do HUD. */
export { Barra };
