import type { Material } from './paleta.js';
import { FERRO, OURO, PEDRA } from './paleta.js';

/*
 * As definições SVG compartilhadas da carta.
 *
 * Toda a profundidade da moldura sai daqui: gradientes de bisel, microtextura
 * e as sombras. Não há uma única imagem na carta — o que dá relevo é sempre a
 * mesma ideia, aplicada em camadas: uma luz no canto superior esquerdo, um
 * corpo, e uma sombra no canto oposto.
 *
 * Os identificadores levam um sufixo porque duas cartas podem estar na tela ao
 * mesmo tempo; `url(#...)` é global no documento, e sem o sufixo a segunda
 * carta roubaria os gradientes da primeira.
 */

export interface DefsProps {
  /** Sufixo único desta carta no documento. */
  readonly chave: string;
  readonly energia: string;
  readonly energiaClara: string;
  readonly energiaEscura: string;
  readonly tipo: Material;
}

/** Um gradiente de bisel: luz em cima à esquerda, sombra embaixo à direita. */
const Bisel = ({
  id,
  material,
  invertido = false,
}: {
  readonly id: string;
  readonly material: Material;
  readonly invertido?: boolean;
}): React.JSX.Element => (
  <linearGradient id={id} x1="0" y1="0" x2="0.72" y2="1">
    <stop offset="0" stopColor={invertido ? material.sombra : material.luz} />
    <stop offset="0.34" stopColor={material.corpo} />
    <stop offset="0.68" stopColor={material.corpo} />
    <stop offset="1" stopColor={invertido ? material.luz : material.sombra} />
  </linearGradient>
);

export const DefsDaCarta = ({
  chave,
  energia,
  energiaClara,
  energiaEscura,
  tipo,
}: DefsProps): React.JSX.Element => (
  <defs>
    <Bisel id={`ferro-${chave}`} material={FERRO} />
    <Bisel id={`ferro-fundo-${chave}`} material={FERRO} invertido />
    <Bisel id={`ouro-${chave}`} material={OURO} />
    <Bisel id={`ouro-fundo-${chave}`} material={OURO} invertido />
    <Bisel id={`pedra-${chave}`} material={PEDRA} invertido />
    <Bisel id={`tipo-${chave}`} material={tipo} />

    {/* A gema de custo: um ponto de luz alto e uma massa de cor embaixo. */}
    <radialGradient id={`gema-${chave}`} cx="0.36" cy="0.3" r="0.78">
      <stop offset="0" stopColor={energiaClara} />
      <stop offset="0.42" stopColor={energia} />
      <stop offset="1" stopColor={energiaEscura} />
    </radialGradient>

    {/* O sulco arcano: escuro nas pontas, aceso no meio. */}
    <linearGradient id={`sulco-${chave}`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={energiaEscura} stopOpacity="0" />
      <stop offset="0.5" stopColor={energiaClara} stopOpacity="0.95" />
      <stop offset="1" stopColor={energiaEscura} stopOpacity="0" />
    </linearGradient>

    {/* O verniz: a luz difusa que atravessa a carta de cima para baixo. */}
    <linearGradient id={`verniz-${chave}`} x1="0.1" y1="0" x2="0.7" y2="1">
      <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
      <stop offset="0.26" stopColor="#ffffff" stopOpacity="0.04" />
      <stop offset="0.62" stopColor="#000000" stopOpacity="0.06" />
      <stop offset="1" stopColor="#000000" stopOpacity="0.28" />
    </linearGradient>

    {/*
      A microtextura do metal.
      Ruído fino, quase invisível de perto e decisivo de longe: é o que impede
      o ferro de ler como preenchimento chapado. Uma oitava só, porque duas
      custam o dobro e não aparecem no tamanho em que a carta é vista.
    */}
    <filter id={`poeira-${chave}`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.14" intercept="0" />
      </feComponentTransfer>
    </filter>

    {/* A pedra do painel de texto é mais grossa que a poeira do metal. */}
    <filter id={`granito-${chave}`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.34" numOctaves="2" seed="19" />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.2" intercept="0" />
      </feComponentTransfer>
    </filter>

    {/* Sombra de contato: curta e dura, como a de um objeto apoiado. */}
    <filter id={`contato-${chave}`} x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.62" />
    </filter>

    {/* O brilho da energia, para gema e sulco. */}
    <filter id={`brilho-${chave}`} x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="6" result="borrado" />
      <feMerge>
        <feMergeNode in="borrado" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);
