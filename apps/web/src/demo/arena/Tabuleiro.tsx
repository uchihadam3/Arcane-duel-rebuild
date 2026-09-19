import type { IndiceDeAcao } from '@arcane-duel/shared-types';

import type { Metade, Retangulo } from './planta.js';
import {
  LINHA_DE_CENTRO,
  TABULEIRO,
  ehAcaoExtra,
  ZONAS_DE_COOLDOWN,
  encaixeDePassiva,
  gavetaDeCooldown,
  pedestalDeAcao,
  pedestalDeClasse,
  pedestalDePersonagem,
  pedestalDeResposta,
  pilhaDeRemovidas,
  slotDeUltimate,
} from './planta.js';

/*
 * A superfície da arena, desenhada por código.
 *
 * Nada aqui vem de imagem. O que dá a leitura de "pedra escura com metal
 * envelhecido e ouro" são quatro coisas empilhadas, sempre na mesma ordem:
 *
 *   1. a pedra, com ruído grosso por cima;
 *   2. as placas de metal, com bisel — luz em cima, sombra embaixo;
 *   3. o ouro, sempre como **fio**, nunca como área: ouro chapado vira plástico;
 *   4. o sulco arcano, que é a única coisa que emite luz.
 *
 * O centro fica deliberadamente limpo. Os três pedestais de Ação e as três
 * Respostas acopladas são o que o olho precisa achar primeiro, e ornamento em
 * volta deles é ruído — a auditoria da Etapa 6 registrou exatamente esse erro.
 * O ornamento mora na borda.
 */

const CHANFRO = 14;

const placa = (caixa: Retangulo, chanfro = CHANFRO): string => {
  const { x, y, largura: l, altura: a } = caixa;
  return [
    `M ${String(x + chanfro)} ${String(y)}`,
    `H ${String(x + l - chanfro)}`,
    `L ${String(x + l)} ${String(y + chanfro)}`,
    `V ${String(y + a - chanfro)}`,
    `L ${String(x + l - chanfro)} ${String(y + a)}`,
    `H ${String(x + chanfro)}`,
    `L ${String(x)} ${String(y + a - chanfro)}`,
    `V ${String(y + chanfro)}`,
    'Z',
  ].join(' ');
};

interface EncaixeProps {
  readonly caixa: Retangulo;
  /** Quanto este encaixe pesa na composição, de 0 a 1. */
  readonly peso: number;
  readonly chanfro?: number;
  readonly children?: React.ReactNode;
}

/**
 * Um encaixe: a cavidade onde uma carta assenta.
 *
 * Cavidade, e não pedestal saliente. Uma carta que entra num buraco tem sombra
 * de contato e lugar; uma carta em cima de um bloco flutua. A profundidade sai
 * de três traços: a sombra interna no topo, o fio de ouro na borda, e o brilho
 * fino na aresta de baixo.
 */
const Encaixe = ({ caixa, peso, chanfro = CHANFRO, children }: EncaixeProps): React.JSX.Element => (
  <g>
    <path d={placa(caixa, chanfro)} fill="url(#cavidade)" />
    <path
      d={placa(caixa, chanfro)}
      fill="none"
      stroke="url(#fioDeOuro)"
      strokeWidth={1.4 + peso * 2}
      strokeOpacity={0.45 + peso * 0.45}
    />
    {/* A sombra que a borda de cima projeta para dentro da cavidade. */}
    <path
      d={`M ${String(caixa.x + chanfro)} ${String(caixa.y + 2)} H ${String(caixa.x + caixa.largura - chanfro)}`}
      stroke="#000000"
      strokeOpacity="0.75"
      strokeWidth={6 + peso * 5}
      strokeLinecap="round"
      filter="url(#suavizar)"
    />
    {/* O fio de luz na aresta de baixo, que fecha o relevo. */}
    <path
      d={`M ${String(caixa.x + chanfro)} ${String(caixa.y + caixa.altura - 2)} H ${String(caixa.x + caixa.largura - chanfro)}`}
      stroke="#8e8574"
      strokeOpacity={0.3 + peso * 0.25}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {children}
  </g>
);

/** Os parafusos que prendem uma placa. Quatro, nos cantos, sempre. */
const Rebites = ({
  caixa,
  raio = 4,
}: {
  readonly caixa: Retangulo;
  readonly raio?: number;
}): React.JSX.Element => (
  <g>
    {[
      [caixa.x + 12, caixa.y + 12],
      [caixa.x + caixa.largura - 12, caixa.y + 12],
      [caixa.x + 12, caixa.y + caixa.altura - 12],
      [caixa.x + caixa.largura - 12, caixa.y + caixa.altura - 12],
    ].map(([cx, cy]) => (
      <g key={`${String(cx)}-${String(cy)}`}>
        <circle cx={cx} cy={cy} r={raio} fill="url(#metalRebite)" />
        <circle cx={cx} cy={(cy ?? 0) - 1} r={raio * 0.45} fill="#c4bba8" opacity="0.5" />
      </g>
    ))}
  </g>
);

/**
 * A moldura de um pedestal de Ação: o objeto mais rico do campo.
 *
 * `discreto` é a quarta coluna. Ela recebe a mesma linguagem com metade da
 * voz — sem rebites, com o ouro apagado e sem as cunhas. Ter os quatro
 * pedestais idênticos apagava a leitura de "três Ações e uma exceção", que é
 * informação de regra.
 */
const PedestalDeAcao = ({
  caixa,
  discreto = false,
}: {
  readonly caixa: Retangulo;
  readonly discreto?: boolean;
}): React.JSX.Element => {
  const margem = discreto ? 9 : 14;
  const moldura: Retangulo = {
    x: caixa.x - margem,
    y: caixa.y - margem,
    largura: caixa.largura + margem * 2,
    altura: caixa.altura + margem * 2,
  };
  return (
    <g opacity={discreto ? 0.72 : 1}>
      <path d={placa(moldura, CHANFRO + 6)} fill="url(#metalPlaca)" />
      <path
        d={placa(moldura, CHANFRO + 6)}
        fill="none"
        stroke="url(#fioDeOuro)"
        strokeWidth={discreto ? 1.6 : 2.6}
        strokeOpacity={discreto ? 0.5 : 0.9}
      />
      {!discreto && <Rebites caixa={moldura} raio={5} />}
      <Encaixe caixa={caixa} peso={discreto ? 0.5 : 1} />
      {!discreto && (
        <text
          x={caixa.x + caixa.largura / 2}
          y={caixa.y + caixa.altura - 11}
          textAnchor="middle"
          fontFamily="'Iowan Old Style', Palatino, Georgia, serif"
          fontSize="17"
          fill="#8c8474"
          opacity="0.85"
          letterSpacing="2"
        >
          AÇÃO
        </text>
      )}
      {discreto && (
        <text
          x={caixa.x + caixa.largura / 2}
          y={caixa.y + caixa.altura - 10}
          textAnchor="middle"
          fontFamily="'Iowan Old Style', Palatino, Georgia, serif"
          fontSize="15"
          fill="#7c7466"
          opacity="0.9"
        >
          EXTRA
        </text>
      )}
      {/* Duas cunhas de ouro apontando para dentro: "a carta entra aqui". */}
      {!discreto &&
        [0, 1].map((lado) => {
          const cx = lado === 0 ? moldura.x + 3 : moldura.x + moldura.largura - 3;
          const sentido = lado === 0 ? 1 : -1;
          const cy = moldura.y + moldura.altura / 2;
          return (
            <path
              key={lado}
              d={`M ${String(cx)} ${String(cy - 16)} L ${String(cx + sentido * 16)} ${String(cy)} L ${String(cx)} ${String(cy + 16)} Z`}
              fill="url(#fioDeOuro)"
              opacity="0.85"
            />
          );
        })}
    </g>
  );
};

/** A trilha de cooldown: três gavetas num trilho físico contínuo. */
const TrilhoDeCooldown = ({ metade }: { readonly metade: Metade }): React.JSX.Element => {
  const primeira = gavetaDeCooldown(metade, 1);
  const ultima = gavetaDeCooldown(metade, 3);
  const trilho: Retangulo = {
    x: primeira.x - 16,
    y: primeira.y - 16,
    largura: ultima.x + ultima.largura - primeira.x + 32,
    altura: primeira.altura + 32,
  };
  return (
    <g>
      <path d={placa(trilho, 12)} fill="url(#metalPlaca)" />
      <path
        d={placa(trilho, 12)}
        fill="none"
        stroke="url(#fioDeOuro)"
        strokeWidth="2"
        strokeOpacity="0.7"
      />
      <Rebites caixa={trilho} />
      {ZONAS_DE_COOLDOWN.map((zona) => {
        const caixa = gavetaDeCooldown(metade, zona);
        return (
          <g key={zona}>
            <Encaixe caixa={caixa} peso={0.45} chanfro={10} />
            {/*
              O número da gaveta, gravado na pedra.
              Ele fica no rodapé da cavidade, para a carta não cobri-lo: saber
              que aquela carta está em CD2 é informação de jogo.
            */}
            <text
              x={caixa.x + caixa.largura / 2}
              y={caixa.y + caixa.altura - 8}
              textAnchor="middle"
              fontFamily="'Iowan Old Style', Palatino, Georgia, serif"
              fontSize="17"
              fill="#8c8474"
              opacity="0.8"
            >
              CD{zona}
            </text>
          </g>
        );
      })}
      {/* O trilho por onde a carta desliza de CD3 para CD1. */}
      <path
        d={`M ${String(primeira.x + 8)} ${String(primeira.y + primeira.altura + 6)} H ${String(ultima.x + ultima.largura - 8)}`}
        stroke="url(#sulcoAceso)"
        strokeWidth="3"
        strokeOpacity="0.55"
      />
    </g>
  );
};

/** Uma metade do campo: apoio, Ação e Resposta. */
const Metade = ({ metade }: { readonly metade: Metade }): React.JSX.Element => {
  const indices: readonly IndiceDeAcao[] = [0, 1, 2, 3];
  return (
    <g>
      {/* Apoio: Personagem, Passivas, Cartas de Classe, Ultimate, cooldown. */}
      <Encaixe caixa={pedestalDePersonagem(metade)} peso={0.4} chanfro={10} />
      {[0, 1, 2, 3].map((indice) => (
        <Encaixe key={indice} caixa={encaixeDePassiva(metade, indice)} peso={0.25} chanfro={8} />
      ))}
      {[0, 1].map((indice) => (
        <g key={indice}>
          <Encaixe caixa={pedestalDeClasse(metade, indice)} peso={0.5} chanfro={10} />
          {/* O arco roxo é a assinatura da Carta de Classe. */}
          <path
            d={`M ${String(pedestalDeClasse(metade, indice).x + 10)} ${String(pedestalDeClasse(metade, indice).y - 5)}
                Q ${String(pedestalDeClasse(metade, indice).x + pedestalDeClasse(metade, indice).largura / 2)} ${String(pedestalDeClasse(metade, indice).y - 20)}
                  ${String(pedestalDeClasse(metade, indice).x + pedestalDeClasse(metade, indice).largura - 10)} ${String(pedestalDeClasse(metade, indice).y - 5)}`}
            fill="none"
            stroke="#8b5cd6"
            strokeOpacity="0.55"
            strokeWidth="2.5"
          />
        </g>
      ))}
      <Encaixe caixa={slotDeUltimate(metade)} peso={0.75} chanfro={12}>
        {/* A estrela do Ultimate: gravada no fundo da cavidade. */}
        {(() => {
          const caixa = slotDeUltimate(metade);
          const cx = caixa.x + caixa.largura / 2;
          const cy = caixa.y + caixa.altura / 2;
          return (
            <path
              d={`M ${String(cx)} ${String(cy - 30)} L ${String(cx + 8)} ${String(cy - 8)} L ${String(cx + 30)} ${String(cy)} L ${String(cx + 8)} ${String(cy + 8)} L ${String(cx)} ${String(cy + 30)} L ${String(cx - 8)} ${String(cy + 8)} L ${String(cx - 30)} ${String(cy)} L ${String(cx - 8)} ${String(cy - 8)} Z`}
              fill="none"
              stroke="url(#fioDeOuro)"
              strokeWidth="2"
              strokeOpacity="0.7"
            />
          );
        })()}
      </Encaixe>
      <TrilhoDeCooldown metade={metade} />
      <Encaixe caixa={pilhaDeRemovidas(metade)} peso={0.2} chanfro={10} />

      {/* Choque: os quatro pedestais de Ação e as Respostas acopladas. */}
      {indices.map((indice) => (
        <PedestalDeAcao
          key={indice}
          caixa={pedestalDeAcao(metade, indice)}
          discreto={ehAcaoExtra(indice)}
        />
      ))}
      {indices.map((indice) => {
        const caixa = pedestalDeResposta(metade, indice);
        const acao = pedestalDeAcao(metade, indice);
        return (
          <g key={indice}>
            {/* O braço que liga a Resposta ao Ataque que ela apara. */}
            <path
              d={`M ${String(caixa.x + caixa.largura / 2)} ${String(metade === 'maquina' ? caixa.y + 6 : caixa.y + caixa.altura - 6)}
                  L ${String(acao.x + acao.largura / 2)} ${String(metade === 'maquina' ? acao.y + acao.altura - 10 : acao.y + 10)}`}
              stroke="url(#sulcoAceso)"
              strokeWidth="4"
              strokeOpacity="0.45"
            />
            {/* A bandeja da Resposta: metal por baixo, para ela pousar sobre o
                Ataque sem virar um buraco no meio dele. */}
            <path
              d={placa(
                {
                  x: caixa.x - 7,
                  y: caixa.y - 7,
                  largura: caixa.largura + 14,
                  altura: caixa.altura + 14,
                },
                13,
              )}
              fill="url(#metalPlaca)"
              stroke="url(#fioDeOuro)"
              strokeWidth="1.8"
              strokeOpacity="0.7"
            />
            <Encaixe caixa={caixa} peso={0.55} chanfro={11} />
            <text
              x={caixa.x + caixa.largura / 2}
              y={caixa.y + caixa.altura - 9}
              textAnchor="middle"
              fontFamily="'Iowan Old Style', Palatino, Georgia, serif"
              fontSize="14"
              fill="#7c7466"
              opacity="0.85"
              letterSpacing="1.5"
            >
              R{indice + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export interface TabuleiroProps {
  /** Cor de energia do lado do jogador, para os sulcos da metade de baixo. */
  readonly energiaDoJogador: string;
  readonly energiaDaMaquina: string;
}

export const Tabuleiro = ({
  energiaDoJogador,
  energiaDaMaquina,
}: TabuleiroProps): React.JSX.Element => (
  <svg
    className="v2-tabuleiro__svg"
    viewBox={`0 0 ${String(TABULEIRO.largura)} ${String(TABULEIRO.altura)}`}
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="pedraDoCampo" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#23242c" />
        <stop offset="0.45" stopColor="#15161c" />
        <stop offset="1" stopColor="#0b0c11" />
      </linearGradient>
      <linearGradient id="metalPlaca" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor="#4d4e59" />
        <stop offset="0.3" stopColor="#2e2f38" />
        <stop offset="0.72" stopColor="#212229" />
        <stop offset="1" stopColor="#0f1015" />
      </linearGradient>
      <radialGradient id="metalRebite" cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#b9b0a0" />
        <stop offset="0.6" stopColor="#5e574c" />
        <stop offset="1" stopColor="#1b1814" />
      </radialGradient>
      <linearGradient id="cavidade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#05050a" />
        <stop offset="0.6" stopColor="#0d0e14" />
        <stop offset="1" stopColor="#15161e" />
      </linearGradient>
      <linearGradient id="fioDeOuro" x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0" stopColor="#f0dba4" />
        <stop offset="0.4" stopColor="#b8912f" />
        <stop offset="1" stopColor="#5a4210" />
      </linearGradient>
      <linearGradient id="sulcoAceso" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={energiaDaMaquina} stopOpacity="0.15" />
        <stop offset="0.5" stopColor="#f0dba4" stopOpacity="0.9" />
        <stop offset="1" stopColor={energiaDoJogador} stopOpacity="0.15" />
      </linearGradient>
      <radialGradient id="auraDaMaquina" cx="0.5" cy="0" r="0.85">
        <stop offset="0" stopColor={energiaDaMaquina} stopOpacity="0.2" />
        <stop offset="1" stopColor={energiaDaMaquina} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="auraDoJogador" cx="0.5" cy="1" r="0.85">
        <stop offset="0" stopColor={energiaDoJogador} stopOpacity="0.22" />
        <stop offset="1" stopColor={energiaDoJogador} stopOpacity="0" />
      </radialGradient>

      {/* O granito do campo. Grosso: ele é visto de longe e de viés. */}
      <filter id="granitoDoCampo" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves="3" seed="41" />
        <feColorMatrix type="saturate" values="0.1" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3" />
        </feComponentTransfer>
      </filter>
      <filter id="suavizar" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id="brilhoDoSulco" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* ---- Pedra ------------------------------------------------------- */}
    <rect width={TABULEIRO.largura} height={TABULEIRO.altura} fill="url(#pedraDoCampo)" />
    <rect
      width={TABULEIRO.largura}
      height={TABULEIRO.altura}
      fill="#8d8a86"
      filter="url(#granitoDoCampo)"
      opacity="0.42"
    />
    <rect width={TABULEIRO.largura} height={TABULEIRO.altura} fill="url(#auraDaMaquina)" />
    <rect width={TABULEIRO.largura} height={TABULEIRO.altura} fill="url(#auraDoJogador)" />

    {/* Fissuras finas: a pedra é velha, e velha tem trinca. */}
    {[
      'M 0 640 L 180 596 L 306 628 L 470 570',
      'M 1300 250 L 1120 292 L 980 262 L 842 300',
      'M 120 120 L 250 180 L 210 268',
      'M 1180 760 L 1040 700 L 1090 616',
      'M 640 40 L 604 130 L 660 196',
      'M 660 860 L 700 770 L 646 700',
    ].map((linha) => (
      <path
        key={linha}
        d={linha}
        fill="none"
        stroke="#000000"
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    ))}

    {/* ---- Borda ornamentada ------------------------------------------- */}
    <rect
      x="16"
      y="16"
      width={TABULEIRO.largura - 32}
      height={TABULEIRO.altura - 32}
      fill="none"
      stroke="url(#fioDeOuro)"
      strokeWidth="5"
      strokeOpacity="0.75"
    />
    <rect
      x="30"
      y="30"
      width={TABULEIRO.largura - 60}
      height={TABULEIRO.altura - 60}
      fill="none"
      stroke="#000000"
      strokeOpacity="0.6"
      strokeWidth="2"
    />
    {/* Inscrições abstratas na borda: ritmo, e não texto. */}
    {Array.from({ length: 26 }, (_, indice) => indice).map((indice) => {
      const passo = (TABULEIRO.largura - 120) / 25;
      const px = 60 + indice * passo;
      return (
        <g key={indice} stroke="#6f6553" strokeOpacity="0.5" strokeWidth="2" fill="none">
          <path d={`M ${String(px)} 40 v 12 M ${String(px - 4)} 46 h 8`} />
          <path
            d={`M ${String(px)} ${String(TABULEIRO.altura - 40)} v -12 M ${String(px - 4)} ${String(TABULEIRO.altura - 46)} h 8`}
          />
        </g>
      );
    })}

    {/* ---- Linha de centro e rosa dos ventos ---------------------------- */}
    <g filter="url(#brilhoDoSulco)">
      <path
        d={`M 60 ${String(LINHA_DE_CENTRO)} H ${String(TABULEIRO.largura - 60)}`}
        stroke="url(#sulcoAceso)"
        strokeWidth="3"
      />
    </g>
    <g transform={`translate(${String(TABULEIRO.largura / 2)} ${String(LINHA_DE_CENTRO)})`}>
      {[58, 44, 26].map((raio, indice) => (
        <circle
          key={raio}
          r={raio}
          fill="none"
          stroke="url(#fioDeOuro)"
          strokeWidth={indice === 0 ? 3 : 1.6}
          strokeOpacity={0.4 + indice * 0.15}
        />
      ))}
      {[0, 45, 90, 135].map((giro) => (
        <path
          key={giro}
          transform={`rotate(${String(giro)})`}
          d="M 0 -52 L 9 -9 L 52 0 L 9 9 L 0 52 L -9 9 L -52 0 L -9 -9 Z"
          fill="none"
          stroke="url(#fioDeOuro)"
          strokeOpacity={giro % 90 === 0 ? 0.75 : 0.3}
          strokeWidth={giro % 90 === 0 ? 2.4 : 1.4}
        />
      ))}
      <circle r="8" fill="url(#fioDeOuro)" opacity="0.7" />
    </g>

    {/*
      Sigilos gravados nos flancos.
      As laterais da fileira de choque ficavam vazias, e pedra lisa em área
      grande lê como falta de acabamento. Eles são **gravados**: sem
      preenchimento, contraste baixo, e nenhum deles encosta no centro.
    */}
    {[
      { x: 258, y: LINHA_DE_CENTRO, raio: 150 },
      { x: TABULEIRO.largura - 258, y: LINHA_DE_CENTRO, raio: 150 },
    ].map((sigilo) => (
      <g
        key={sigilo.x}
        transform={`translate(${String(sigilo.x)} ${String(sigilo.y)})`}
        opacity="0.16"
        fill="none"
        stroke="#e8d9ae"
      >
        <circle r={sigilo.raio} strokeWidth="2.5" />
        <circle r={sigilo.raio * 0.74} strokeWidth="1.4" />
        <circle r={sigilo.raio * 0.3} strokeWidth="2" />
        {Array.from({ length: 12 }, (_, indice) => (indice * 360) / 12).map((angulo) => {
          const radianos = (angulo * Math.PI) / 180;
          return (
            <line
              key={angulo}
              x1={Math.cos(radianos) * sigilo.raio * 0.3}
              y1={Math.sin(radianos) * sigilo.raio * 0.3}
              x2={Math.cos(radianos) * sigilo.raio * 0.74}
              y2={Math.sin(radianos) * sigilo.raio * 0.74}
              strokeWidth="1.4"
            />
          );
        })}
        {[0, 60, 120, 180, 240, 300].map((angulo) => {
          const radianos = (angulo * Math.PI) / 180;
          const px = Math.cos(radianos) * sigilo.raio * 0.87;
          const py = Math.sin(radianos) * sigilo.raio * 0.87;
          return (
            <path
              key={angulo}
              transform={`translate(${String(px)} ${String(py)}) rotate(${String(angulo)})`}
              d="M -10 -14 L 10 -14 M 0 -14 L 0 14 M -8 6 L 8 6"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </g>
    ))}

    {/* ---- As duas metades --------------------------------------------- */}
    <Metade metade="maquina" />
    <Metade metade="jogador" />
  </svg>
);
