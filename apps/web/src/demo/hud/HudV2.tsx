import type { ClassId, VisaoDeJogador } from '@arcane-duel/shared-types';

import { corDaClasse } from '../carta/paleta.js';
import type { Caixa } from '../layout/zonas.js';

/*
 * O HUD da Demo V2, em **coordenadas de tela**.
 *
 * Esta é a correção estrutural mais importante da revisão. O HUD não é filho
 * do tabuleiro, não recebe a transformação 3D dele e não compete com nenhuma
 * zona do campo: ele mora num retângulo próprio, definido em `layout/zonas.ts`,
 * e um teste geométrico falha o build se esse retângulo encostar no da arena,
 * no da mão ou no dos controles.
 *
 * Tabuleiro é objeto físico e contém somente cartas. HUD é **informação**.
 * Vida, Guarda, Momentum, Mana, AP, Reserva, contador de Ações, condições e o
 * aviso de "IA pensando" moram todos aqui, e nenhum deles põe o pé no campo.
 *
 * Nenhum PNG: metal e vidro em SVG, pelas mesmas camadas do resto da
 * linguagem — bisel de ferro, fio de ouro, e a energia da classe como única
 * coisa que emite luz.
 *
 * A regra que decide o layout é a legibilidade em 915 × 412: Vida e Guarda têm
 * número **e** barra, porque a barra dá a proporção num relance e o número dá a
 * conta exata para decidir a jogada.
 */

const FONTE_NUMERO = "'SF Mono', 'Segoe UI', 'Noto Sans', system-ui, sans-serif";
const FONTE_ROTULO = "'Iowan Old Style', Palatino, Georgia, serif";

/** O tamanho de referência do painel. O SVG escala para a caixa que receber. */
const PAINEL = { largura: 260, altura: 108 } as const;

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
      <rect x={x} y={y} width={largura} height={11} rx={5.5} fill="#07070c" />
      <rect
        x={x}
        y={y}
        width={largura * fracao}
        height={11}
        rx={5.5}
        fill={`url(#hudLiquido-${chave})`}
        style={{ transition: 'width 320ms cubic-bezier(.2,.7,.3,1)' }}
      />
      <rect
        x={x + 2}
        y={y + 2}
        width={Math.max(0, largura * fracao - 4)}
        height={3}
        rx={1.5}
        fill="#ffffff"
        opacity="0.3"
      />
      <rect
        x={x}
        y={y}
        width={largura}
        height={11}
        rx={5.5}
        fill="none"
        stroke={cor}
        strokeOpacity="0.5"
        strokeWidth="1.1"
      />
    </g>
  );
};

/**
 * O recurso de classe, em pontos.
 *
 * Momentum e Mana são recursos **contáveis** e pequenos, e contar losangos é
 * mais rápido que ler um número. Uma barra aqui obrigaria a estimar uma
 * proporção para saber se dá para pagar quatro de Mana.
 */
const Pontos = ({
  x,
  y,
  quantidade,
  maximo,
  cor,
}: {
  readonly x: number;
  readonly y: number;
  readonly quantidade: number;
  readonly maximo: number;
  readonly cor: string;
}): React.JSX.Element => (
  <g>
    {Array.from({ length: Math.min(maximo, 8) }, (_, indice) => indice).map((indice) => {
      const cheio = indice < quantidade;
      return (
        <path
          key={indice}
          transform={`translate(${String(x + indice * 13)} ${String(y)})`}
          d="M 0 -5 L 4.4 0 L 0 5 L -4.4 0 Z"
          fill={cheio ? cor : '#14131a'}
          stroke={cheio ? '#ffffff' : cor}
          strokeOpacity={cheio ? 0.5 : 0.35}
          strokeWidth="1"
        />
      );
    })}
  </g>
);

/*
 * As condições ficam **junto do HUD**, e não no campo.
 *
 * Queimadura, Lento, Murchar e Sangramento são estado de um jogador, não peça
 * de tabuleiro. Ícone e pilha, pequenos, ao lado de quem elas afetam.
 */
const MARCA_DA_CONDICAO: Readonly<Record<string, string>> = {
  queimadura: 'M 0 -6 q 5 4 3 8 q -1 2 -3 2 q -2 0 -3 -2 q -2 -4 3 -8 Z',
  lento: 'M -5 -5 H 5 L -5 5 H 5',
  murchar: 'M 0 6 V -2 M 0 -2 q -6 -1 -5 -5 q 4 0 5 5 M 0 -2 q 6 -1 5 -5 q -4 0 -5 5',
  sangramento: 'M 0 -6 q 4 5 4 8 a 4 4 0 0 1 -8 0 q 0 -3 4 -8 Z',
};

const COR_DA_CONDICAO: Readonly<Record<string, string>> = {
  queimadura: '#ff8a3d',
  lento: '#8fb6ff',
  murchar: '#8ad39a',
  sangramento: '#e25555',
};

const Condicoes = ({
  x,
  y,
  condicoes,
}: {
  readonly x: number;
  readonly y: number;
  readonly condicoes: Readonly<Record<string, number>>;
}): React.JSX.Element => {
  const ativas = Object.entries(condicoes).filter(([, pilhas]) => pilhas > 0);
  return (
    <g>
      {ativas.map(([nome, pilhas], indice) => (
        <g key={nome} transform={`translate(${String(x + indice * 26)} ${String(y)})`}>
          <circle
            r="9.5"
            fill="#0d0c12"
            stroke={COR_DA_CONDICAO[nome] ?? '#999'}
            strokeWidth="1.1"
          />
          <path
            d={MARCA_DA_CONDICAO[nome] ?? 'M -4 0 H 4'}
            fill={nome === 'lento' ? 'none' : (COR_DA_CONDICAO[nome] ?? '#999')}
            fillOpacity="0.85"
            stroke={COR_DA_CONDICAO[nome] ?? '#999'}
            strokeWidth="1.2"
            strokeLinecap="round"
            transform="scale(0.8)"
          />
          <text
            x="8"
            y="11"
            fontFamily={FONTE_NUMERO}
            fontSize="10"
            fontWeight="700"
            fill="#f0e9db"
          >
            {String(pilhas)}
          </text>
        </g>
      ))}
    </g>
  );
};

const nomeDaClasse = (classe: ClassId): string =>
  classe === 'guerreiro' ? 'GUERREIRO' : classe === 'mago' ? 'MAGO' : classe.toUpperCase();

export interface HudV2Props {
  readonly jogador: VisaoDeJogador;
  readonly caixa: Caixa;
  readonly daVez: boolean;
  /** Superior é a IA; inferior é o humano. Só muda o alinhamento. */
  readonly posicao: 'maquina' | 'jogador';
  /** A IA está pensando? É HUD, e nunca aparece no meio da arena. */
  readonly pensando?: boolean;
  readonly dadoDeTeste: string;
}

export const HudV2 = ({
  jogador,
  caixa,
  daVez,
  posicao,
  pensando = false,
  dadoDeTeste,
}: HudV2Props): React.JSX.Element => {
  const cores = corDaClasse(jogador.classe);
  const chave = `${posicao}-${jogador.classe}`;
  const recurso = jogador.recurso;
  const contavel =
    recurso.classe === 'guerreiro'
      ? { rotulo: 'MOMENTUM', valor: recurso.momentum, maximo: 6 }
      : recurso.classe === 'mago'
        ? { rotulo: 'MANA', valor: recurso.mana, maximo: 8 }
        : null;

  return (
    <div
      className={`v2-hud v2-hud--${posicao}${daVez ? ' v2-hud--da-vez' : ''}`}
      data-teste={dadoDeTeste}
      style={{
        left: `${String(caixa.x)}px`,
        top: `${String(caixa.y)}px`,
        width: `${String(caixa.largura)}px`,
        height: `${String(caixa.altura)}px`,
        ['--v2-energia' as string]: cores.energia,
      }}
    >
      <svg
        viewBox={`0 0 ${String(PAINEL.largura)} ${String(PAINEL.altura)}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`hudLiquido-${chave}-vida`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff7a6a" />
            <stop offset="1" stopColor="#8c1f16" />
          </linearGradient>
          <linearGradient id={`hudLiquido-${chave}-guarda`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fd8ff" />
            <stop offset="1" stopColor="#1e4a72" />
          </linearGradient>
          <linearGradient id={`hudPainel-${chave}`} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0" stopColor="#2e2a36" />
            <stop offset="0.5" stopColor="#1a1821" />
            <stop offset="1" stopColor="#100e15" />
          </linearGradient>
          <linearGradient id={`hudOuro-${chave}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a3814" />
            <stop offset="0.3" stopColor="#d9b871" />
            <stop offset="0.7" stopColor="#8a6c2e" />
            <stop offset="1" stopColor="#4a3814" />
          </linearGradient>
        </defs>

        {/* O painel: bisel de ferro com um fio de ouro na borda. */}
        <rect
          x="1"
          y="1"
          width={PAINEL.largura - 2}
          height={PAINEL.altura - 2}
          rx="11"
          fill={`url(#hudPainel-${chave})`}
        />
        <rect
          x="1"
          y="1"
          width={PAINEL.largura - 2}
          height={PAINEL.altura - 2}
          rx="11"
          fill="none"
          stroke={`url(#hudOuro-${chave})`}
          strokeWidth="1.6"
          strokeOpacity={daVez ? 0.95 : 0.5}
        />
        {/* O fio de energia da classe, na aresta de baixo. */}
        <rect
          x="14"
          y={PAINEL.altura - 4}
          width={PAINEL.largura - 28}
          height="2"
          rx="1"
          fill={cores.energia}
          opacity={daVez ? 0.85 : 0.3}
        />

        <text
          x="14"
          y="21"
          fontFamily={FONTE_ROTULO}
          fontSize="14"
          letterSpacing="2.4"
          fill="#e8dfcd"
        >
          {nomeDaClasse(jogador.classe)}
        </text>

        {/* Vida */}
        <text
          x="14"
          y="42"
          fontFamily={FONTE_ROTULO}
          fontSize="9.5"
          letterSpacing="1.6"
          fill="#8d8478"
        >
          VIDA
        </text>
        <text
          x="70"
          y="43"
          textAnchor="end"
          fontFamily={FONTE_NUMERO}
          fontSize="16"
          fontWeight="700"
          fill="#f2ece0"
        >
          {String(jogador.vida)}
        </text>
        <Barra
          x={80}
          y={33}
          largura={PAINEL.largura - 96}
          valor={jogador.vida}
          maximo={30}
          cor="#ff7a6a"
          chave={`${chave}-vida`}
        />

        {/* Guarda */}
        <text
          x="14"
          y="64"
          fontFamily={FONTE_ROTULO}
          fontSize="9.5"
          letterSpacing="1.6"
          fill="#8d8478"
        >
          GUARDA
        </text>
        <text
          x="70"
          y="65"
          textAnchor="end"
          fontFamily={FONTE_NUMERO}
          fontSize="16"
          fontWeight="700"
          fill="#f2ece0"
        >
          {String(jogador.guarda)}
        </text>
        <Barra
          x={80}
          y={55}
          largura={PAINEL.largura - 96}
          valor={jogador.guarda}
          maximo={12}
          cor="#9fd8ff"
          chave={`${chave}-guarda`}
        />

        {/* O recurso de classe */}
        {contavel !== null && (
          <>
            <text
              x="14"
              y="87"
              fontFamily={FONTE_ROTULO}
              fontSize="9.5"
              letterSpacing="1.6"
              fill="#8d8478"
            >
              {contavel.rotulo}
            </text>
            <Pontos
              x={104}
              y={83}
              quantidade={contavel.valor}
              maximo={contavel.maximo}
              cor={cores.energia}
            />
          </>
        )}

        <Condicoes x={PAINEL.largura - 30} y={86} condicoes={jogador.condicoes} />
      </svg>

      {/*
       * "IA pensando" é HUD, e mora junto do HUD do adversário.
       *
       * No meio da arena ele cobriria justamente o que o jogador quer ver
       * acontecer. Aqui ele fica onde o olho já está quando espera a jogada
       * dela.
       */}
      {pensando && (
        <div className="v2-hud__pensando" data-teste="pensando">
          <span className="v2-hud__ponto" />
          <span className="v2-hud__ponto" />
          <span className="v2-hud__ponto" />
        </div>
      )}
    </div>
  );
};
