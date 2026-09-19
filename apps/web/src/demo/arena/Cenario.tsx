import { useId } from 'react';

/*
 * O salão em volta da mesa.
 *
 * O tabuleiro flutuava num retângulo preto. Um objeto sem lugar não tem
 * escala: a mesa parecia um cartão colado na tela, e a revisão cobrou
 * exatamente isso — falta o mundo em que a partida acontece.
 *
 * Este é o mundo, e ele tem uma única regra: **não competir com as cartas**.
 * Tudo aqui é de baixo contraste, desfocado e distante. Colunas que se
 * adivinham, névoa entre elas, uma luz longe ao fundo, poeira no ar. Se
 * alguém, olhando a tela, reparar numa coluna antes de reparar numa carta, o
 * cenário falhou — e é por isso que ele é desenhado com desfoque de verdade e
 * não com detalhe reduzido: detalhe pequeno puxa o olho; borrão não.
 *
 * Ele vive **fora** da transformação 3D do tabuleiro, atrás dela. Não é
 * perspectiva calculada: é um fundo. Colocá-lo dentro do tabuleiro o faria
 * inclinar junto com a mesa, e o salão ficaria deitado.
 */

/** Quanto o cenário pode aparecer, no máximo. Acima disto ele rouba atenção. */
export const OPACIDADE_DO_CENARIO = 0.55;

/** Onde as colunas ficam, em fração da largura. Irregular de propósito. */
const COLUNAS: readonly { readonly x: number; readonly largura: number }[] = [
  { x: 0.035, largura: 0.055 },
  { x: 0.155, largura: 0.042 },
  { x: 0.275, largura: 0.032 },
  { x: 0.7, largura: 0.032 },
  { x: 0.815, largura: 0.042 },
  { x: 0.93, largura: 0.055 },
];

export const Cenario = ({
  energiaDoJogador,
  energiaDaMaquina,
}: {
  readonly energiaDoJogador: string;
  readonly energiaDaMaquina: string;
}): React.JSX.Element => {
  const sufixo = `${useId()}${energiaDoJogador}`.replace(/[^a-zA-Z0-9]/g, '');
  const id = (nome: string): string => `${nome}${sufixo}`;
  const url = (nome: string): string => `url(#${nome}${sufixo})`;

  return (
    <svg
      className="v2-cenario"
      viewBox="0 0 1000 480"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-teste="cenario"
    >
      <defs>
        {/* O ar do salão: escuro nas bordas, com uma abertura de luz ao fundo. */}
        <radialGradient id={id('fundo')} cx="0.5" cy="0.38" r="0.72">
          <stop offset="0" stopColor="#2a2430" />
          <stop offset="0.42" stopColor="#171420" />
          <stop offset="1" stopColor="#06050a" />
        </radialGradient>

        {/*
         * A luz distante.
         *
         * Uma única fonte, alta e atrás, que é a razão de as colunas terem
         * silhueta. Sem uma fonte declarada, sombra e recorte não concordam e
         * o fundo lê como colagem.
         */}
        <radialGradient id={id('claraboia')} cx="0.5" cy="0.16" r="0.34">
          <stop offset="0" stopColor="#c8b48e" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#8a7a63" stopOpacity="0.14" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* A pedra das colunas, vista contra a luz: quase silhueta. */}
        <linearGradient id={id('coluna')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#090810" />
          <stop offset="0.38" stopColor="#241f2c" />
          <stop offset="0.62" stopColor="#2c2634" />
          <stop offset="1" stopColor="#0b0912" />
        </linearGradient>

        {/* A névoa que sobe do chão e engole a base das colunas. */}
        <linearGradient id={id('nevoa')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3a3448" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#2c2738" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </linearGradient>

        {/* As duas brasas de classe, muito longe, uma de cada lado do salão. */}
        <radialGradient id={id('brasaBaixo')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={energiaDoJogador} stopOpacity="0.17" />
          <stop offset="1" stopColor={energiaDoJogador} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('brasaCima')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={energiaDaMaquina} stopOpacity="0.17" />
          <stop offset="1" stopColor={energiaDaMaquina} stopOpacity="0" />
        </radialGradient>

        {/*
         * O desfoque.
         *
         * Forte, e é a peça central da ideia. O salão precisa ser reconhecido
         * pela **forma geral** e por nada além disso: um contorno nítido de
         * coluna disputaria a atenção com a borda de uma carta, que é o que a
         * revisão proibiu.
         */}
        <filter
          colorInterpolationFilters="sRGB"
          id={id('distancia')}
          x="-12%"
          y="-12%"
          width="124%"
          height="124%"
        >
          <feGaussianBlur stdDeviation="7" />
        </filter>

        {/* A poeira no ar: grão fino, quase imperceptível, que dá volume. */}
        <filter
          colorInterpolationFilters="sRGB"
          id={id('poeira')}
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="2"
            seed="5"
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.80  0 0 0 0 0.74  0 0 0 0 0.62  0 0 0 0.10 0"
          />
        </filter>
      </defs>

      <rect width="1000" height="480" fill={url('fundo')} />
      <rect width="1000" height="480" fill={url('claraboia')} />

      <g filter={url('distancia')} opacity="0.9">
        {COLUNAS.map((coluna) => {
          const x = coluna.x * 1000;
          const largura = coluna.largura * 1000;
          return (
            <g key={coluna.x}>
              <rect x={x} y={-20} width={largura} height={430} fill={url('coluna')} />
              {/* O capitel, adivinhado: um bloco mais largo no alto. */}
              <rect
                x={x - largura * 0.16}
                y={26}
                width={largura * 1.32}
                height={largura * 0.34}
                fill="#1d1926"
              />
              {/* E a base, engolida pela névoa. */}
              <rect
                x={x - largura * 0.2}
                y={372}
                width={largura * 1.4}
                height={largura * 0.4}
                fill="#14111c"
              />
            </g>
          );
        })}
      </g>

      {/* As brasas distantes, uma por classe, atrás das colunas. */}
      <ellipse cx="190" cy="392" rx="240" ry="120" fill={url('brasaBaixo')} />
      <ellipse cx="810" cy="96" rx="240" ry="120" fill={url('brasaCima')} />

      <rect y="250" width="1000" height="230" fill={url('nevoa')} />
      <rect width="1000" height="480" filter={url('poeira')} opacity="0.5" />
    </svg>
  );
};
