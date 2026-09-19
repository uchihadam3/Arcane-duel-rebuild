import type { CartaVisivel } from '../../../partida/apresentacao.js';
import { corDaClasse } from '../paleta.js';

import { Aparar } from './aparar.jsx';
import { BolaDeFogo } from './bola-de-fogo.jsx';
import { GolpeDeCerco } from './golpe-de-cerco.jsx';
import type { ArteProps } from './janela.js';
import { JANELA } from './janela.js';
import { Meteoro } from './meteoro.jsx';

/*
 * A arte de cada carta.
 *
 * Quatro cartas têm ilustração própria nesta tarefa. Elas são o teste: se a
 * moldura, a tipografia e a arte não convencerem nestas quatro, não faz sentido
 * desenhar as outras vinte e seis — muito menos as 468 do jogo.
 *
 * Todas as demais recebem o sigilo neutro. Ele é **honesto**: não finge ser
 * ilustração, e por isso ninguém confunde "ainda não foi feito" com "foi feito
 * assim". Ele também não é um quadrado vazio com degradê — tem geometria
 * própria, derivada do identificador, para duas cartas placeholder não saírem
 * idênticas na mesma tela.
 */

/** Os identificadores que já têm arte final nesta demonstração. */
export const CARTAS_COM_ARTE: readonly string[] = ['W08', 'W15', 'M02', 'MU01'];

/**
 * O sigilo neutro das cartas que ainda não têm arte.
 *
 * Um polígono e um anel, com o número de lados e o giro tirados do
 * identificador. Determinístico: a mesma carta desenha sempre o mesmo sigilo,
 * em qualquer aparelho e em qualquer partida.
 */
const SigiloNeutro = ({
  chave,
  semente,
  energia,
  energiaClara,
}: ArteProps & {
  readonly semente: string;
  readonly energia: string;
  readonly energiaClara: string;
}): React.JSX.Element => {
  let soma = 0;
  for (const letra of semente) soma = (soma * 31 + letra.charCodeAt(0)) % 9973;
  const lados = 5 + (soma % 4);
  const giro = soma % 360;
  const centro = { x: JANELA.x + JANELA.largura / 2, y: JANELA.y + JANELA.altura / 2 };
  const raio = JANELA.altura * 0.3;

  const pontos = Array.from({ length: lados }, (_, indice) => {
    const angulo = ((indice / lados) * 360 + giro) * (Math.PI / 180);
    return `${String(centro.x + Math.cos(angulo) * raio)},${String(centro.y + Math.sin(angulo) * raio)}`;
  }).join(' ');

  return (
    <g>
      <defs>
        <radialGradient id={`neutroFundo-${chave}`} cx="0.5" cy="0.5" r="0.7">
          <stop offset="0" stopColor={energia} stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#0d0e14" />
          <stop offset="1" stopColor="#05060a" />
        </radialGradient>
      </defs>
      <rect
        x={JANELA.x}
        y={JANELA.y}
        width={JANELA.largura}
        height={JANELA.altura}
        fill={`url(#neutroFundo-${chave})`}
      />
      <circle
        cx={centro.x}
        cy={centro.y}
        r={raio * 1.22}
        fill="none"
        stroke={energia}
        strokeOpacity="0.32"
        strokeWidth="2"
      />
      <polygon
        points={pontos}
        fill="none"
        stroke={energiaClara}
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <polygon
        points={pontos}
        fill={energia}
        fillOpacity="0.1"
        transform={`rotate(${String(180 / lados)} ${String(centro.x)} ${String(centro.y)})`}
      />
      <circle cx={centro.x} cy={centro.y} r={raio * 0.18} fill={energiaClara} fillOpacity="0.45" />
    </g>
  );
};

export interface ArteDaCartaProps {
  readonly carta: CartaVisivel;
  readonly chave: string;
}

export const ArteDaCarta = ({ carta, chave }: ArteDaCartaProps): React.JSX.Element => {
  const identificador = String(carta.id);
  if (identificador === 'W08') return <GolpeDeCerco chave={chave} />;
  if (identificador === 'W15') return <Aparar chave={chave} />;
  if (identificador === 'M02') return <BolaDeFogo chave={chave} />;
  if (identificador === 'MU01') return <Meteoro chave={chave} />;

  const cores = corDaClasse(carta.classe);
  return (
    <SigiloNeutro
      chave={chave}
      semente={identificador}
      energia={cores.energia}
      energiaClara={cores.energiaClara}
    />
  );
};
