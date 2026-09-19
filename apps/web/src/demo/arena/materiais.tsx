import { TABULEIRO } from './planta.js';

/*
 * Os materiais da arena.
 *
 * Tudo aqui é definição — gradientes, filtros e padrões — e nada desenha
 * sozinho. Separar os materiais da composição é o que permite que a superfície
 * seja rica sem que o arquivo da composição fique ilegível, e é o que deixa
 * claro onde mexer quando a direção de arte mudar.
 *
 * A direção é **dark fantasy sofisticado**, e ela se resume a três regras que
 * valem para cada traço deste arquivo:
 *
 *   1. Pedra precisa parecer pedra: granulada, com variação de tom, veios e
 *      microfissuras. Chapa cinza lisa é o que denuncia campo desenhado às
 *      pressas.
 *   2. Ouro precisa parecer metal: ele tem highlight estreito e sombra logo ao
 *      lado. Ouro chapado, sem sombra, vira plástico amarelo.
 *   3. Nada vira glow de neon.
 *
 * Todo filtro aqui declara `color-interpolation-filters="sRGB"`. O padrão do
 * SVG é linearRGB, e em linearRGB um desfoque ou uma matriz de cor sobre tom
 * escuro devolve o tom deslocado — foi o que pintou uma faixa avermelhada
 * dentro de cada encaixe na primeira prova. Não é detalhe: é a diferença
 * entre pedra e pedra manchada. A profundidade vem de sombra interna, bisel e
 *      luz direcional — não de brilho. Só o sulco arcano emite luz, e pouca.
 */

/*
 * A paleta, depois da reprovação por cor.
 *
 * O veredito do aparelho real foi "tudo cinza e preto", e ele estava certo: a
 * paleta anterior tinha um único eixo — do quase-preto ao cinza-arroxeado — e
 * nenhuma temperatura. Uma pedra real nunca é monocromática: ela tem áreas
 * frias onde a luz não chega e áreas quentes onde o calor assentou, e é o
 * contraste **entre as duas** que faz o olho ler material em vez de superfície
 * pintada.
 *
 * As entradas abaixo passam a ter os dois lados. `pedraQuente` e `pedraFria`
 * são as manchas que a superfície ganha por cima da base; bronze e ouro
 * ficaram mais saturados para parecerem metal envelhecido em vez de cinza
 * amarelado; o ferro escureceu e ganhou um traço quente, porque ferro velho
 * não é cinza neutro.
 *
 * Nada disto vira neon: o teto de saturação continua baixo, e o único material
 * que emite luz é o sulco arcano.
 */
export const PALETA = {
  pedraProfunda: '#120d12',
  pedra: '#2b2329',
  pedraClara: '#453a42',
  /** A mancha quente: onde o calor da arena assentou na pedra. */
  pedraQuente: '#4b3a30',
  /** A mancha fria: pedra arroxeada, na sombra. */
  pedraFria: '#2a2740',
  metal: '#352e30',
  metalClaro: '#6a5c56',
  metalEscuro: '#191419',
  ouro: '#a07c30',
  ouroClaro: '#f0cf86',
  ouroEscuro: '#533c12',
  bronze: '#7d5f35',
  sulco: '#3b3550',
} as const;

/**
 * Os materiais, uma vez por tabuleiro.
 *
 * Os identificadores recebem sufixo porque `id` em SVG é global no documento:
 * duas arenas na mesma página — a folha de prova é exatamente isso — fariam a
 * segunda usar os gradientes da primeira.
 */
export interface MateriaisProps {
  readonly sufixo: string;
  /** A cor de classe da metade de baixo, para a luz de ambiente dela. */
  readonly energiaDoJogador?: string;
  /** E a da metade de cima. */
  readonly energiaDaMaquina?: string;
}

/**
 * O quanto a luz de classe pinta a pedra.
 *
 * Extremamente pouco, e o número está aqui para o teste poder cobrá-lo. A
 * revisão pediu presença de classe **sem pintar metades**: acima de uns 12 %
 * a arena deixa de ser uma mesa de pedra iluminada e vira um campo laranja de
 * um lado e roxo do outro, que é o oposto do que se pediu.
 */
export const OPACIDADE_DA_LUZ_DE_CLASSE = 0.085;

/**
 * Até onde ela alcança, em fração da altura do tabuleiro.
 *
 * Menos de meia metade: a luz nasce na retaguarda de cada lado e **morre
 * antes do corredor central**. É isso que impede que ela leia como pintura de
 * metade — no meio da mesa as duas já sumiram, e a pedra é a mesma pedra.
 */
export const ALCANCE_DA_LUZ_DE_CLASSE = 0.4;

export const Materiais = ({
  sufixo,
  energiaDoJogador = '#ff6a2a',
  energiaDaMaquina = '#7a6bff',
}: MateriaisProps): React.JSX.Element => {
  const id = (nome: string): string => `${nome}${sufixo}`;
  return (
    <defs>
      {/*
       * A luz de classe, uma por metade.
       *
       * Ela nasce atrás da fileira de retaguarda — de onde um lampião ou um
       * braseiro estaria — e cai rápido. O Guerreiro traz âmbar e brasa; o
       * Mago, violeta e azul arcano. A revisão foi explícita em que isto não
       * pode virar duas metades pintadas, e por isso o alcance é curto e a
       * opacidade é baixa: o que se vê é a **temperatura** de cada lado, não
       * a cor dele.
       */}
      <radialGradient id={id('luzDoJogador')} cx="0.5" cy="1" r={String(ALCANCE_DA_LUZ_DE_CLASSE)}>
        <stop offset="0" stopColor={energiaDoJogador} stopOpacity="0.85" />
        <stop offset="0.55" stopColor={energiaDoJogador} stopOpacity="0.28" />
        <stop offset="1" stopColor={energiaDoJogador} stopOpacity="0" />
      </radialGradient>

      <radialGradient id={id('luzDaMaquina')} cx="0.5" cy="0" r={String(ALCANCE_DA_LUZ_DE_CLASSE)}>
        <stop offset="0" stopColor={energiaDaMaquina} stopOpacity="0.85" />
        <stop offset="0.55" stopColor={energiaDaMaquina} stopOpacity="0.28" />
        <stop offset="1" stopColor={energiaDaMaquina} stopOpacity="0" />
      </radialGradient>
      {/*
       * A pedra.
       *
       * Três camadas empilhadas: um gradiente de fundo que dá a variação
       * tonal grande, um ruído fractal grosso que dá a granulação, e um
       * segundo ruído mais esticado que dá os veios. Uma só não basta —
       * granulação sem veio lê como papel de parede.
       */}
      <linearGradient id={id('pedraBase')} x1="0.08" y1="0" x2="0.92" y2="1">
        <stop offset="0" stopColor={PALETA.pedraClara} />
        <stop offset="0.28" stopColor="#332a30" />
        <stop offset="0.62" stopColor={PALETA.pedra} />
        <stop offset="1" stopColor={PALETA.pedraProfunda} />
      </linearGradient>

      {/*
       * As manchas de temperatura.
       *
       * Duas passagens de ruído muito largo, uma quente e uma fria, por cima
       * da base. Elas não desenham forma nenhuma: mudam o **tom** da pedra em
       * regiões grandes e irregulares, que é o que separa granito de papel
       * cinza. A frequência é baixa de propósito — mancha pequena lê como
       * sujeira, mancha grande lê como pedra.
       */}
      <filter
        colorInterpolationFilters="sRGB"
        id={id('manchaQuente')}
        x="-5%"
        y="-5%"
        width="110%"
        height="110%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.0021 0.0034"
          numOctaves="3"
          seed="13"
          result="n"
        />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.47  0 0 0 0 0.31  0 0 0 0 0.19  0 0 0 0.62 -0.24"
        />
      </filter>

      <filter
        colorInterpolationFilters="sRGB"
        id={id('manchaFria')}
        x="-5%"
        y="-5%"
        width="110%"
        height="110%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.0027 0.0019"
          numOctaves="3"
          seed="61"
          result="n"
        />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.20  0 0 0 0 0.18  0 0 0 0 0.33  0 0 0 0.58 -0.22"
        />
      </filter>

      <filter
        colorInterpolationFilters="sRGB"
        id={id('granulacao')}
        x="0"
        y="0"
        width="100%"
        height="100%"
      >
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="7" result="n" />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.66  0 0 0 0 0.60  0 0 0 0 0.58  0 0 0 0.22 0"
        />
      </filter>

      <filter
        colorInterpolationFilters="sRGB"
        id={id('veios')}
        x="-10%"
        y="-10%"
        width="120%"
        height="120%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.019 0.0035"
          numOctaves="5"
          seed="23"
          result="n"
        />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.07  0 0 0 0 0.06  0 0 0 0 0.11  0 0 0 0.85 -0.30"
        />
      </filter>

      {/* O desgaste: manchas largas e irregulares, mais claras nas bordas. */}
      <filter
        colorInterpolationFilters="sRGB"
        id={id('desgaste')}
        x="-5%"
        y="-5%"
        width="110%"
        height="110%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.0055"
          numOctaves="4"
          seed="41"
          result="n"
        />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.74  0 0 0 0 0.66  0 0 0 0 0.55  0 0 0 0.34 -0.10"
        />
      </filter>

      {/*
       * O metal escuro da estrutura.
       *
       * O highlight fica **acima** do meio e a sombra logo abaixo: é a
       * assinatura de uma superfície iluminada de cima, e é ela que faz o
       * olho ler metal em vez de cinza.
       */}
      <linearGradient id={id('metal')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={PALETA.metalClaro} />
        <stop offset="0.18" stopColor={PALETA.metal} />
        <stop offset="0.82" stopColor={PALETA.metalEscuro} />
        <stop offset="1" stopColor="#2d2833" />
      </linearGradient>

      <linearGradient id={id('metalRebite')} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#6e6675" />
        <stop offset="0.5" stopColor="#3a3541" />
        <stop offset="1" stopColor="#16141a" />
      </linearGradient>

      {/*
       * O ouro envelhecido.
       *
       * Quatro paradas, e as quatro importam: escuro na borda de cima (onde a
       * sujeira assenta), claro logo abaixo (o highlight), ouro cheio no meio
       * e escuro de novo embaixo. Duas paradas só produzem plástico.
       */}
      <linearGradient id={id('fioDeOuro')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={PALETA.ouroEscuro} />
        <stop offset="0.24" stopColor={PALETA.ouroClaro} />
        <stop offset="0.62" stopColor={PALETA.ouro} />
        <stop offset="1" stopColor={PALETA.ouroEscuro} />
      </linearGradient>

      <linearGradient id={id('bronzeLargo')} x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0" stopColor="#8a6f42" />
        <stop offset="0.35" stopColor={PALETA.bronze} />
        <stop offset="1" stopColor="#3a2c19" />
      </linearGradient>

      {/* A cavidade onde uma carta assenta: escura no topo, aberta embaixo. */}
      <linearGradient id={id('cavidade')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#07060a" />
        <stop offset="0.5" stopColor="#100e15" />
        <stop offset="1" stopColor="#1a1722" />
      </linearGradient>

      {/* O sulco arcano: a única coisa da arena que emite luz, e pouca. */}
      <linearGradient id={id('sulco')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={PALETA.sulco} stopOpacity="0" />
        <stop offset="0.5" stopColor="#6d63a0" stopOpacity="0.85" />
        <stop offset="1" stopColor={PALETA.sulco} stopOpacity="0" />
      </linearGradient>

      {/* A luz ambiente que cai do alto sobre a mesa inteira. */}
      {/*
       * A poça de luz sobre a mesa.
       *
       * Uma mesa de verdade tem uma fonte de luz acima dela, e é a queda dessa
       * luz até as bordas que dá volume à superfície. Sem ela a pedra fica
       * uniforme e o campo lê como plano, por mais textura que tenha.
       */}
      <radialGradient id={id('luzAmbiente')} cx="0.5" cy="0.46" r="0.66">
        <stop offset="0" stopColor="#fff0d8" stopOpacity="0.17" />
        <stop offset="0.35" stopColor="#ffe6c4" stopOpacity="0.075" />
        <stop offset="0.72" stopColor="#000000" stopOpacity="0.2" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.55" />
      </radialGradient>

      {/* A vinheta que fecha os cantos e empurra o olho para o centro. */}
      <radialGradient id={id('vinheta')} cx="0.5" cy="0.5" r="0.78">
        <stop offset="0.48" stopColor="#000000" stopOpacity="0" />
        <stop offset="0.82" stopColor="#000000" stopOpacity="0.3" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.68" />
      </radialGradient>

      <filter
        colorInterpolationFilters="sRGB"
        id={id('suavizar')}
        x="-40%"
        y="-40%"
        width="180%"
        height="180%"
      >
        <feGaussianBlur stdDeviation="3" />
      </filter>

      <filter
        colorInterpolationFilters="sRGB"
        id={id('sombraDaPeca')}
        x="-30%"
        y="-30%"
        width="160%"
        height="180%"
      >
        <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000000" floodOpacity="0.62" />
      </filter>

      {/*
       * As microfissuras.
       *
       * Um padrão, e não um filtro: fissura é traço fino e escuro com uma
       * borda clara de um lado só, e isso é desenho, não ruído. Elas entram
       * com opacidade baixa e em poucos lugares — fissura demais lê como
       * vidro quebrado.
       */}
      <pattern
        id={id('fissuras')}
        width="620"
        height="440"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-12)"
      >
        <path
          d="M 18 42 l 46 -19 l 31 26 l 58 -8 M 96 49 l 12 44 M 210 12 l 28 51 l -19 36
             M 300 96 l 54 22 l 26 -17 M 62 198 l 71 25 l 40 -13 l 33 29 M 250 244 l 49 -26"
          fill="none"
          stroke="#05040a"
          strokeOpacity="0.5"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M 18 40 l 46 -19 l 31 26 l 58 -8 M 210 10 l 28 51 M 62 196 l 71 25"
          fill="none"
          stroke="#6d6578"
          strokeOpacity="0.16"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </pattern>

      {/* A máscara que apaga as fissuras longe das bordas do tabuleiro. */}
      <radialGradient id={id('mascaraDeFissura')} cx="0.5" cy="0.5" r="0.62">
        <stop offset="0" stopColor="#000000" />
        <stop offset="0.7" stopColor="#555555" />
        <stop offset="1" stopColor="#ffffff" />
      </radialGradient>
      <mask id={id('bordasApenas')}>
        <rect
          width={TABULEIRO.largura}
          height={TABULEIRO.altura}
          fill={`url(#${id('mascaraDeFissura')})`}
        />
      </mask>
    </defs>
  );
};
