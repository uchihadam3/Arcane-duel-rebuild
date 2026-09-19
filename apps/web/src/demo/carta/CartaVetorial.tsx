import { useId } from 'react';

import type { CartaVisivel } from '../../partida/apresentacao.js';

import { DefsDaCarta } from './defs.jsx';
import {
  COR_DO_TIPO,
  FONTE_NUMERO,
  FONTE_TEXTO,
  FONTE_TITULO,
  ROTULO_DO_TIPO,
  corDaClasse,
} from './paleta.js';
import { ArteDaCarta } from './arte/index.jsx';

/*
 * A carta, desenhada por código.
 *
 * Vetorial de ponta a ponta: nenhum PNG, nenhuma textura, nenhum canvas. A
 * mesma carta serve a mão, ao pedestal e à inspeção, e em qualquer um dos três
 * ela é rasterizada pelo navegador **no tamanho em que está na tela**. É isso
 * que responde de vez à reprovação por nitidez: não existe resolução de textura
 * a escolher, porque não existe textura.
 *
 * A moldura é a mesma para todas as cartas; o que muda com a carta é a cor do
 * tipo, a cor da classe e a arte. Ter uma moldura só é o que faz trinta cartas
 * parecerem do mesmo jogo.
 *
 * Proporção mestre do catálogo: 5:7.
 */

export const TAMANHO = { largura: 500, altura: 700 } as const;

/*
 * A silhueta.
 *
 * Cantos cortados em vez de arredondados: é o que dá o ar de placa de metal
 * recortada em vez de cartão de plástico. O chanfro é de 26, grande o bastante
 * para ler no tamanho da mão.
 */
const CHANFRO = 26;
const silhueta = (x: number, y: number, l: number, a: number, c: number): string =>
  [
    `M ${String(x + c)} ${String(y)}`,
    `H ${String(x + l - c)}`,
    `L ${String(x + l)} ${String(y + c)}`,
    `V ${String(y + a - c)}`,
    `L ${String(x + l - c)} ${String(y + a)}`,
    `H ${String(x + c)}`,
    `L ${String(x)} ${String(y + a - c)}`,
    `V ${String(y + c)}`,
    'Z',
  ].join(' ');

/**
 * Quebra o texto de regra em linhas.
 *
 * Sem medir: SVG não quebra sozinho, e medir exigiria o DOM montado — o que
 * tornaria a carta impossível de renderizar num teste ou fora do navegador. A
 * largura média de caractere de uma serifada nestes corpos é estável o
 * bastante para uma estimativa, e o corpo da fonte é reduzido quando o texto
 * não cabe, em vez de estourar a placa.
 */
const quebrarTexto = (
  texto: string,
  caracteresPorLinha: number,
  maximoDeLinhas: number,
): readonly string[] => {
  const palavras = texto.split(/\s+/).filter((palavra) => palavra !== '');
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of palavras) {
    const tentativa = atual === '' ? palavra : `${atual} ${palavra}`;
    if (tentativa.length <= caracteresPorLinha || atual === '') {
      atual = tentativa;
      continue;
    }
    linhas.push(atual);
    atual = palavra;
    if (linhas.length === maximoDeLinhas) return linhas;
  }
  if (atual !== '' && linhas.length < maximoDeLinhas) linhas.push(atual);
  return linhas;
};

/** O corpo de letra do nome encolhe até caber em duas linhas. */
const corpoDoNome = (nome: string): number => {
  if (nome.length <= 14) return 38;
  if (nome.length <= 19) return 33;
  return 29;
};

interface PlacaProps {
  readonly chave: string;
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
  readonly preenchimento: string;
  readonly chanfro?: number;
}

/** Uma placa de metal embutida: bisel por baixo, fio de ouro por cima. */
const Placa = ({
  chave,
  x,
  y,
  largura,
  altura,
  preenchimento,
  chanfro = 10,
}: PlacaProps): React.JSX.Element => (
  <g>
    <path
      d={silhueta(x, y, largura, altura, chanfro)}
      fill={preenchimento}
      stroke={`url(#ouro-${chave})`}
      strokeWidth="2.5"
    />
    <path
      d={silhueta(x + 4, y + 4, largura - 8, altura - 8, Math.max(2, chanfro - 4))}
      fill="none"
      stroke="#000000"
      strokeOpacity="0.4"
      strokeWidth="1.5"
    />
  </g>
);

export interface CartaVetorialProps {
  readonly carta: CartaVisivel;
  /** Mostra o texto de regra. A mão não comporta; o foco e a inspeção sim. */
  readonly comTexto?: boolean;
  readonly className?: string;
}

export const CartaVetorial = ({
  carta,
  comTexto = true,
  className,
}: CartaVetorialProps): React.JSX.Element => {
  /*
   * O sufixo dos gradientes precisa ser único no documento.
   *
   * `url(#id)` é global: duas cartas com o mesmo sufixo compartilham gradiente,
   * e a segunda passa a ser pintada com as cores da primeira. A prova de carta
   * pegou isso em flagrante — quatro cartas de tipos diferentes saíram todas
   * com a faixa vermelha do Ataque, e as de Mago com a gema laranja do
   * Guerreiro.
   *
   * `useId` sozinho não bastava: ele é único **dentro de uma árvore**, e cada
   * renderização separada recomeça a contagem. O identificador da carta entra
   * junto, e com ele duas árvores independentes deixam de colidir.
   */
  const chave = `${useId()}${String(carta.id)}`.replace(/[^a-zA-Z0-9]/g, '');
  const classe = corDaClasse(carta.classe);
  const tipo = COR_DO_TIPO[carta.tipo];

  const linhasDoNome = quebrarTexto(carta.nome, 17, 2);
  const corpo = corpoDoNome(carta.nome);
  const linhasDoTexto = comTexto ? quebrarTexto(carta.texto, 42, 5) : [];
  const corpoDoTexto = linhasDoTexto.length > 4 ? 21 : 23;

  return (
    <svg
      viewBox={`0 0 ${String(TAMANHO.largura)} ${String(TAMANHO.altura)}`}
      className={className}
      role="img"
      aria-label={carta.nome}
      preserveAspectRatio="xMidYMid meet"
    >
      <DefsDaCarta
        chave={chave}
        energia={classe.energia}
        energiaClara={classe.energiaClara}
        energiaEscura={classe.energiaEscura}
        tipo={tipo}
      />

      {/* ---- Corpo da carta ------------------------------------------- */}
      <path d={silhueta(2, 2, 496, 696, CHANFRO)} fill={`url(#ferro-${chave})`} />
      <path
        d={silhueta(2, 2, 496, 696, CHANFRO)}
        fill="#8a8a96"
        filter={`url(#poeira-${chave})`}
        opacity="0.5"
      />

      {/* O fio de ouro da borda, e o vinco escuro logo dentro dele. */}
      <path
        d={silhueta(7, 7, 486, 686, CHANFRO - 4)}
        fill="none"
        stroke={`url(#ouro-${chave})`}
        strokeWidth="4"
      />
      <path
        d={silhueta(15, 15, 470, 670, CHANFRO - 10)}
        fill="none"
        stroke="#000000"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
      <path
        d={silhueta(19, 19, 462, 662, CHANFRO - 12)}
        fill="none"
        stroke={`url(#ouro-fundo-${chave})`}
        strokeWidth="1.4"
        strokeOpacity="0.7"
      />

      {/* Losangos de ouro nos quatro cantos: o ornamento vive na borda. */}
      {[
        [30, 30],
        [470, 30],
        [30, 670],
        [470, 670],
      ].map(([cx, cy]) => (
        <path
          key={`${String(cx)}-${String(cy)}`}
          d={`M ${String(cx)} ${String((cy ?? 0) - 11)} L ${String((cx ?? 0) + 11)} ${String(cy)} L ${String(cx)} ${String((cy ?? 0) + 11)} L ${String((cx ?? 0) - 11)} ${String(cy)} Z`}
          fill={`url(#ouro-${chave})`}
          stroke="#00000066"
          strokeWidth="1"
        />
      ))}

      {/* ---- Cabeçalho: custo, nome, cooldown --------------------------- */}
      <Placa
        chave={chave}
        x={104}
        y={30}
        largura={292}
        altura={72}
        preenchimento={`url(#pedra-${chave})`}
        chanfro={14}
      />
      <g fontFamily={FONTE_TITULO} fill="#f6ecd2" textAnchor="middle">
        {linhasDoNome.map((linha, indice) => (
          <text
            key={linha}
            x="250"
            y={linhasDoNome.length === 1 ? 79 : 60 + indice * (corpo + 2)}
            fontSize={corpo}
            fontWeight="600"
            letterSpacing="0.6"
          >
            {linha}
          </text>
        ))}
      </g>

      {carta.custo !== null && (
        <g filter={`url(#contato-${chave})`}>
          <circle cx="56" cy="66" r="34" fill={`url(#ferro-fundo-${chave})`} />
          <circle
            cx="56"
            cy="66"
            r="30"
            fill={`url(#gema-${chave})`}
            stroke={`url(#ouro-${chave})`}
            strokeWidth="3"
          />
          {/* O ponto de luz da gema, que é o que a faz parecer vidro. */}
          <ellipse cx="46" cy="54" rx="11" ry="7" fill="#ffffff" opacity="0.5" />
          <text
            x="56"
            y="78"
            fontFamily={FONTE_NUMERO}
            fontSize="34"
            fontWeight="700"
            fill="#12100c"
            textAnchor="middle"
          >
            {carta.custo.valor}
          </text>
        </g>
      )}

      {carta.cooldown !== null && (
        <g filter={`url(#contato-${chave})`}>
          <path
            d={silhueta(414, 38, 60, 56, 12)}
            fill={`url(#ferro-fundo-${chave})`}
            stroke={`url(#ouro-${chave})`}
            strokeWidth="2.5"
          />
          <text
            x="444"
            y="70"
            fontFamily={FONTE_NUMERO}
            fontSize="17"
            fontWeight="700"
            fill="#c8b98e"
            textAnchor="middle"
          >
            CD
          </text>
          <text
            x="444"
            y="88"
            fontFamily={FONTE_NUMERO}
            fontSize="19"
            fontWeight="700"
            fill="#f6e8c4"
            textAnchor="middle"
          >
            {carta.cooldown}
          </text>
        </g>
      )}

      {/* ---- Janela de arte --------------------------------------------- */}
      <g>
        <path
          d={silhueta(34, 116, 432, 262, 16)}
          fill="#05060a"
          stroke={`url(#ouro-fundo-${chave})`}
          strokeWidth="3"
        />
        <clipPath id={`janela-${chave}`}>
          <path d={silhueta(37, 119, 426, 256, 14)} />
        </clipPath>
        <g clipPath={`url(#janela-${chave})`}>
          <ArteDaCarta carta={carta} chave={chave} />
        </g>
        {/* O verniz por cima da arte: a luz da sala batendo no vidro. */}
        <path
          d={silhueta(37, 119, 426, 256, 14)}
          fill={`url(#verniz-${chave})`}
          pointerEvents="none"
        />
        <path
          d={silhueta(34, 116, 432, 262, 16)}
          fill="none"
          stroke="#000000"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
      </g>

      {/* ---- Faixa de tipo ---------------------------------------------- */}
      <g filter={`url(#contato-${chave})`}>
        <path
          d={silhueta(60, 388, 380, 46, 12)}
          fill={`url(#tipo-${chave})`}
          stroke={`url(#ouro-${chave})`}
          strokeWidth="2.5"
        />
        <path
          d={silhueta(60, 388, 380, 46, 12)}
          fill="#ffffff"
          filter={`url(#poeira-${chave})`}
          opacity="0.35"
        />
        <text
          x="250"
          y="419"
          fontFamily={FONTE_TITULO}
          fontSize="24"
          fontWeight="700"
          fill="#fdf3e0"
          textAnchor="middle"
          letterSpacing="5"
        >
          {ROTULO_DO_TIPO[carta.tipo]}
        </text>
      </g>

      {/* Sulcos arcanos ligando a faixa às bordas: a energia da classe. */}
      {[398, 411, 424].map((y) => (
        <g key={y}>
          <rect x="26" y={y - 1} width="30" height="2" fill={`url(#sulco-${chave})`} />
          <rect x="444" y={y - 1} width="30" height="2" fill={`url(#sulco-${chave})`} />
        </g>
      ))}

      {/* ---- Texto de regra ---------------------------------------------- */}
      <g>
        <path
          d={silhueta(38, 446, 424, 152, 12)}
          fill={`url(#pedra-${chave})`}
          stroke="#00000088"
          strokeWidth="2"
        />
        <path
          d={silhueta(38, 446, 424, 152, 12)}
          fill="#9b8f78"
          filter={`url(#granito-${chave})`}
          opacity="0.45"
        />
        <path
          d={silhueta(38, 446, 424, 152, 12)}
          fill="none"
          stroke={`url(#ouro-fundo-${chave})`}
          strokeWidth="1.2"
          strokeOpacity="0.55"
        />
        {/*
          O texto fica centrado na placa, e não ancorado no topo.
          Com duas linhas numa placa de cinco, encostar em cima deixa um vazio
          embaixo que lê como erro de diagramação.
        */}
        <g fontFamily={FONTE_TEXTO} fontSize={corpoDoTexto} fill="#e5d9bd" textAnchor="middle">
          {linhasDoTexto.map((linha, indice) => {
            const alturaDaLinha = corpoDoTexto + 7;
            const bloco = linhasDoTexto.length * alturaDaLinha;
            const topo = 446 + (152 - bloco) / 2 + corpoDoTexto;
            return (
              <text key={linha} x="250" y={topo + indice * alturaDaLinha}>
                {linha}
              </text>
            );
          })}
        </g>
      </g>

      {/* ---- Dano e Impacto ---------------------------------------------- */}
      {carta.dano !== null && (
        <g filter={`url(#contato-${chave})`}>
          <Placa
            chave={chave}
            x={42}
            y={612}
            largura={150}
            altura={56}
            preenchimento={`url(#ferro-fundo-${chave})`}
          />
          <text
            x="76"
            y="652"
            fontFamily={FONTE_NUMERO}
            fontSize="34"
            fontWeight="700"
            fill="#ffb9a6"
            textAnchor="middle"
          >
            {carta.dano}
          </text>
          <text
            x="140"
            y="650"
            fontFamily={FONTE_TITULO}
            fontSize="20"
            fill="#c9b08f"
            textAnchor="middle"
            letterSpacing="1.5"
          >
            DANO
          </text>
        </g>
      )}

      {carta.impacto !== null && (
        <g filter={`url(#contato-${chave})`}>
          <Placa
            chave={chave}
            x={308}
            y={612}
            largura={150}
            altura={56}
            preenchimento={`url(#ferro-fundo-${chave})`}
          />
          <text
            x="342"
            y="652"
            fontFamily={FONTE_NUMERO}
            fontSize="34"
            fontWeight="700"
            fill="#c9bcff"
            textAnchor="middle"
          >
            {carta.impacto}
          </text>
          <text
            x="410"
            y="650"
            fontFamily={FONTE_TITULO}
            fontSize="15"
            fill="#c9b08f"
            textAnchor="middle"
            letterSpacing="0.8"
          >
            IMPACTO
          </text>
        </g>
      )}

      {/* O verniz da carta inteira, por último: ele passa por cima de tudo. */}
      <path
        d={silhueta(2, 2, 496, 696, CHANFRO)}
        fill={`url(#verniz-${chave})`}
        pointerEvents="none"
        opacity="0.55"
      />
    </svg>
  );
};

/**
 * O verso.
 *
 * Nenhuma informação da carta chega a esta função — nem como argumento. É assim
 * que a mão da IA fica impossível de vazar: o componente que a desenha não tem
 * o dado.
 */
export const VersoVetorial = ({
  className,
}: {
  readonly className?: string;
}): React.JSX.Element => {
  const chave = `verso${useId()}`.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg
      viewBox={`0 0 ${String(TAMANHO.largura)} ${String(TAMANHO.altura)}`}
      className={className}
      role="img"
      aria-label="Carta virada"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`versoFundo-${chave}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#2a2333" />
          <stop offset="0.5" stopColor="#141019" />
          <stop offset="1" stopColor="#07060a" />
        </linearGradient>
        <radialGradient id={`versoMiolo-${chave}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#b8912f" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#5d4310" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id={`versoPoeira-${chave}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="3" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.12" />
          </feComponentTransfer>
        </filter>
      </defs>

      <path d={silhueta(2, 2, 496, 696, CHANFRO)} fill={`url(#versoFundo-${chave})`} />
      <path
        d={silhueta(2, 2, 496, 696, CHANFRO)}
        fill="#9a9ab0"
        filter={`url(#versoPoeira-${chave})`}
        opacity="0.5"
      />
      <path
        d={silhueta(7, 7, 486, 686, CHANFRO - 4)}
        fill="none"
        stroke="#b8912f"
        strokeOpacity="0.8"
        strokeWidth="4"
      />
      <ellipse cx="250" cy="350" rx="170" ry="220" fill={`url(#versoMiolo-${chave})`} />

      {/* O selo: duas estrelas de oito pontas, uma girada sobre a outra. */}
      {[0, 22.5].map((giro) => (
        <path
          key={giro}
          transform={`rotate(${String(giro)} 250 350)`}
          d="M 250 226 L 268 332 L 374 350 L 268 368 L 250 474 L 232 368 L 126 350 L 232 332 Z"
          fill="none"
          stroke="#c9a227"
          strokeOpacity={giro === 0 ? 0.85 : 0.4}
          strokeWidth={giro === 0 ? 3 : 2}
        />
      ))}
      <circle
        cx="250"
        cy="350"
        r="36"
        fill="none"
        stroke="#c9a227"
        strokeOpacity="0.7"
        strokeWidth="3"
      />
      <circle cx="250" cy="350" r="14" fill="#c9a227" fillOpacity="0.55" />
    </svg>
  );
};
