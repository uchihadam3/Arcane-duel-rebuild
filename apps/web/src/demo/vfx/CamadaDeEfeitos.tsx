import { useId } from 'react';

import type { Metade } from '../arena/planta.js';
import { TABULEIRO, pedestalDeAcao } from '../arena/planta.js';

import type { BeatEmCena } from './roteiros.js';

/*
 * A camada de efeitos.
 *
 * Ela desenha os beats que estão no ar, em SVG, sobre o tabuleiro e dentro da
 * mesma transformação 3D — um golpe que atravessa o campo precisa atravessar
 * **o campo**, e não um plano colado na tela.
 *
 * Nada aqui é `RingGeometry` crescendo. Cada forma tem desenho próprio, com
 * antecipação, corpo e dissipação separados, porque foi exatamente a falta
 * disso que a auditoria da Etapa 6 registrou: um anel que cresce não é
 * impacto, e um cilindro que sobe não é Ultimate.
 */

export interface CamadaDeEfeitosProps {
  readonly beats: readonly BeatEmCena[];
  /** De onde o efeito sai. */
  readonly origem: Metade;
  /** Em qual coluna ele acontece. */
  readonly coluna: 0 | 1 | 2 | 3;
  readonly energia: string;
  readonly energiaClara: string;
}

const suave = (t: number): number => t * t * (3 - 2 * t);

export const CamadaDeEfeitos = ({
  beats,
  origem,
  coluna,
  energia,
  energiaClara,
}: CamadaDeEfeitosProps): React.JSX.Element | null => {
  /*
   * Identificador único por instância.
   *
   * `id` em SVG é **global no documento**: duas camadas montadas ao mesmo tempo
   * fariam a segunda usar os gradientes da primeira, e o efeito do Mago sairia
   * na cor do Guerreiro. A folha de prova pegou exatamente isso. O sufixo aqui
   * é o que garante que cada camada pinte com a energia dela.
   *
   * A energia entra no sufixo junto do `useId`, e não por enfeite: `useId`
   * reinicia a cada `renderToStaticMarkup`, então sozinho ele volta a colidir
   * fora do navegador — foi assim que a moldura das quatro cartas saiu toda da
   * mesma cor antes. A cor é justamente o que distingue as duas camadas.
   */
  const sufixo = `${useId()}${energia}${String(coluna)}${origem}`.replace(/[^a-zA-Z0-9]/g, '');
  const nucleo = `efeitoNucleo${sufixo}`;
  const rastro = `efeitoRastro${sufixo}`;
  const brilho = `efeitoBrilho${sufixo}`;

  if (beats.length === 0) return null;

  const daOrigem = pedestalDeAcao(origem, coluna);
  const doAlvo = pedestalDeAcao(origem === 'jogador' ? 'maquina' : 'jogador', coluna);
  const de = { x: daOrigem.x + daOrigem.largura / 2, y: daOrigem.y + daOrigem.altura / 2 };
  const para = { x: doAlvo.x + doAlvo.largura / 2, y: doAlvo.y + doAlvo.altura / 2 };
  const sentido = origem === 'jogador' ? -1 : 1;

  return (
    <svg
      className="v2-efeitos"
      viewBox={`0 0 ${String(TABULEIRO.largura)} ${String(TABULEIRO.altura)}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={nucleo}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor={energiaClara} />
          <stop offset="0.7" stopColor={energia} stopOpacity="0.5" />
          <stop offset="1" stopColor={energia} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={rastro} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={energia} stopOpacity="0" />
          <stop offset="0.7" stopColor={energiaClara} stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
        </linearGradient>
        <filter id={brilho} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {beats.map((beat) => {
        const t = suave(beat.progresso);
        const chave = `${beat.forma}-${String(beat.emMs)}`;

        switch (beat.forma) {
          case 'escurecer':
            /* A arena perde luz. É o que faz o brilho seguinte parecer grande. */
            return (
              <rect
                key={chave}
                width={TABULEIRO.largura}
                height={TABULEIRO.altura}
                fill="#04030a"
                opacity={t * 0.72 * beat.forca}
              />
            );

          case 'restaurar':
            return (
              <rect
                key={chave}
                width={TABULEIRO.largura}
                height={TABULEIRO.altura}
                fill="#04030a"
                opacity={(1 - t) * 0.5}
              />
            );

          case 'concentrar':
            /* Energia entrando: anéis que **encolhem** para o centro. */
            return (
              <g key={chave} filter={`url(#${brilho})`}>
                {[0, 0.33, 0.66].map((desvio) => {
                  const fase = (t + desvio) % 1;
                  return (
                    <circle
                      key={desvio}
                      cx={de.x}
                      cy={de.y}
                      r={30 + (1 - fase) * 130 * beat.forca}
                      fill="none"
                      stroke={energiaClara}
                      strokeOpacity={fase * 0.8}
                      strokeWidth={2 + fase * 4}
                    />
                  );
                })}
                <circle cx={de.x} cy={de.y} r={38 * beat.forca * t} fill={`url(#${nucleo})`} />
              </g>
            );

          case 'pressao':
            /* O ar deslocado: arcos abrindo para trás, contra o movimento. */
            return (
              <g key={chave} opacity={1 - t}>
                {[0, 1, 2].map((indice) => (
                  <path
                    key={indice}
                    d={`M ${String(de.x - 120 - indice * 26)} ${String(de.y + sentido * (20 + indice * 18))}
                        Q ${String(de.x)} ${String(de.y + sentido * (70 + indice * 26) - t * sentido * 40)}
                          ${String(de.x + 120 + indice * 26)} ${String(de.y + sentido * (20 + indice * 18))}`}
                    fill="none"
                    stroke={energiaClara}
                    strokeOpacity={(0.5 - indice * 0.12) * (1 - t)}
                    strokeWidth={4 - indice}
                    strokeLinecap="round"
                  />
                ))}
              </g>
            );

          case 'golpe': {
            /*
             * O golpe é uma lâmina de luz que **varre**, e não um anel.
             * A cabeça vai à frente e a cauda fica para trás, encurtando.
             */
            const cabeca = { x: de.x + (para.x - de.x) * t, y: de.y + (para.y - de.y) * t };
            const cauda = {
              x: de.x + (para.x - de.x) * Math.max(0, t - 0.34),
              y: de.y + (para.y - de.y) * Math.max(0, t - 0.34),
            };
            return (
              <g key={chave} filter={`url(#${brilho})`}>
                <path
                  d={`M ${String(cauda.x - 54)} ${String(cauda.y)}
                      L ${String(cabeca.x)} ${String(cabeca.y - 26)}
                      L ${String(cauda.x + 54)} ${String(cauda.y)}
                      L ${String(cabeca.x)} ${String(cabeca.y + 26)} Z`}
                  fill={energiaClara}
                  opacity={0.85 * (1 - t * 0.35)}
                />
                <circle cx={cabeca.x} cy={cabeca.y} r={26} fill={`url(#${nucleo})`} />
              </g>
            );
          }

          case 'projetil': {
            /* A esfera viaja com um rastro que afina atrás dela. */
            const pos = { x: de.x + (para.x - de.x) * t, y: de.y + (para.y - de.y) * t };
            const atras = {
              x: de.x + (para.x - de.x) * Math.max(0, t - 0.4),
              y: de.y + (para.y - de.y) * Math.max(0, t - 0.4),
            };
            return (
              <g key={chave} filter={`url(#${brilho})`}>
                <path
                  d={`M ${String(atras.x - 8)} ${String(atras.y)}
                      L ${String(pos.x - 34)} ${String(pos.y)}
                      L ${String(pos.x + 34)} ${String(pos.y)}
                      L ${String(atras.x + 8)} ${String(atras.y)} Z`}
                  fill={`url(#${rastro})`}
                  opacity={0.8}
                />
                <circle cx={pos.x} cy={pos.y} r={34} fill={`url(#${nucleo})`} />
                <circle cx={pos.x} cy={pos.y} r={13} fill="#ffffff" opacity={0.9} />
              </g>
            );
          }

          case 'runa':
            /* O círculo de runas abrindo: ele gira e cresce até parar. */
            return (
              <g
                key={chave}
                filter={`url(#${brilho})`}
                transform={`translate(${String(de.x)} ${String(de.y)}) rotate(${String(t * 90)}) scale(${String(0.3 + t * 0.8)})`}
                opacity={Math.min(1, t * 3) * (1 - Math.max(0, t - 0.8) * 5)}
              >
                {[150, 112, 70].map((raio, indice) => (
                  <circle
                    key={raio}
                    r={raio}
                    fill="none"
                    stroke={indice === 0 ? energiaClara : energia}
                    strokeOpacity={0.75 - indice * 0.15}
                    strokeWidth={indice === 0 ? 4 : 2}
                  />
                ))}
                {Array.from({ length: 8 }, (_, indice) => (indice * 360) / 8).map((angulo) => {
                  const radianos = (angulo * Math.PI) / 180;
                  return (
                    <path
                      key={angulo}
                      transform={`translate(${String(Math.cos(radianos) * 130)} ${String(Math.sin(radianos) * 130)}) rotate(${String(angulo)})`}
                      d="M -11 -15 L 11 -15 M 0 -15 L 0 15 M -9 7 L 9 7"
                      stroke={energiaClara}
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                    />
                  );
                })}
              </g>
            );

          case 'queda': {
            /*
             * A queda vem de **fora do quadro**, no alto.
             * Começar dentro do campo mataria a escala: o jogador precisa ver
             * que a coisa veio de longe.
             */
            const alvo = para;
            const pos = {
              x: alvo.x + (1 - t) * 420,
              y: alvo.y - (1 - t) * (TABULEIRO.altura * 1.4),
            };
            return (
              <g key={chave} filter={`url(#${brilho})`}>
                <path
                  d={`M ${String(pos.x + 340)} ${String(pos.y - 340 * 1.1)}
                      L ${String(pos.x + 44)} ${String(pos.y + 26)}
                      L ${String(pos.x - 44)} ${String(pos.y - 26)} Z`}
                  fill={`url(#${rastro})`}
                  opacity="0.9"
                />
                <circle cx={pos.x} cy={pos.y} r={46 + t * 26} fill={`url(#${nucleo})`} />
                <circle cx={pos.x} cy={pos.y} r={20 + t * 12} fill="#fff4d0" />
              </g>
            );
          }

          case 'impacto':
            /*
             * O impacto é um estrelamento, e não um círculo.
             * Oito lanças de comprimento desigual saindo do ponto, mais uma
             * mancha quente que encolhe. Círculo perfeito lê como onda de
             * rádio; irregular lê como pancada.
             */
            return (
              <g key={chave} filter={`url(#${brilho})`} opacity={1 - t}>
                {[0, 41, 88, 133, 180, 224, 271, 315].map((angulo, indice) => {
                  const radianos = (angulo * Math.PI) / 180;
                  const comprimento = (70 + ((indice * 37) % 90)) * beat.forca * (0.4 + t * 0.9);
                  return (
                    <path
                      key={angulo}
                      d={`M ${String(para.x)} ${String(para.y)}
                          l ${String(Math.cos(radianos) * comprimento)} ${String(Math.sin(radianos) * comprimento)}`}
                      stroke={energiaClara}
                      strokeWidth={9 * (1 - t) + 2}
                      strokeLinecap="round"
                    />
                  );
                })}
                <circle
                  cx={para.x}
                  cy={para.y}
                  r={(78 - t * 40) * beat.forca}
                  fill={`url(#${nucleo})`}
                />
              </g>
            );

          case 'explosao':
            return (
              <g key={chave} filter={`url(#${brilho})`}>
                <circle
                  cx={para.x}
                  cy={para.y}
                  r={(50 + t * 210) * beat.forca}
                  fill={`url(#${nucleo})`}
                  opacity={1 - t}
                />
                <circle
                  cx={para.x}
                  cy={para.y}
                  r={(24 + t * 90) * beat.forca}
                  fill="#fff6d8"
                  opacity={(1 - t) * 0.9}
                />
              </g>
            );

          case 'onda':
            /* A onda corre **no plano do campo**: ela é uma elipse, não um círculo. */
            return (
              <g key={chave}>
                {[0, 0.22].map((desvio) => {
                  const fase = Math.max(0, t - desvio);
                  return (
                    <ellipse
                      key={desvio}
                      cx={para.x}
                      cy={para.y}
                      rx={fase * TABULEIRO.largura * 0.7}
                      ry={fase * TABULEIRO.altura * 0.42}
                      fill="none"
                      stroke={energiaClara}
                      strokeOpacity={(1 - fase) * 0.65}
                      strokeWidth={10 * (1 - fase) + 1}
                    />
                  );
                })}
              </g>
            );

          case 'guarda':
            /* A defesa aparece **na frente** do alvo, e não sobre ele. */
            return (
              <g key={chave} opacity={Math.min(1, t * 4) * (1 - Math.max(0, t - 0.7) * 3)}>
                <path
                  d={`M ${String(para.x - 130)} ${String(para.y + sentido * -80)}
                      A 150 96 0 0 ${String(sentido > 0 ? 1 : 0)} ${String(para.x + 130)} ${String(para.y + sentido * -80)}`}
                  fill="none"
                  stroke="#9fd8ff"
                  strokeOpacity="0.85"
                  strokeWidth={8}
                  filter={`url(#${brilho})`}
                />
                <path
                  d={`M ${String(para.x - 104)} ${String(para.y + sentido * -80)}
                      A 120 74 0 0 ${String(sentido > 0 ? 1 : 0)} ${String(para.x + 104)} ${String(para.y + sentido * -80)}`}
                  fill="none"
                  stroke="#d9efff"
                  strokeOpacity="0.5"
                  strokeWidth={3}
                />
              </g>
            );

          case 'faiscas':
            return (
              <g key={chave} filter={`url(#${brilho})`} opacity={1 - t}>
                {Array.from({ length: 14 }, (_, indice) => indice).map((indice) => {
                  const angulo = ((indice * 137) % 360) * (Math.PI / 180);
                  const alcance = (40 + ((indice * 29) % 110)) * t;
                  return (
                    <line
                      key={indice}
                      x1={para.x}
                      y1={para.y + sentido * -70}
                      x2={para.x + Math.cos(angulo) * alcance}
                      y2={para.y + sentido * -70 + Math.sin(angulo) * alcance * 0.6}
                      stroke="#ffe0a0"
                      strokeWidth={indice % 3 === 0 ? 4 : 2}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            );

          case 'fragmentos':
            return (
              <g key={chave} opacity={1 - t}>
                {Array.from({ length: 11 }, (_, indice) => indice).map((indice) => {
                  const angulo = ((indice * 97) % 360) * (Math.PI / 180);
                  const alcance = (60 + ((indice * 43) % 150)) * t * beat.forca;
                  const tamanho = 6 + ((indice * 7) % 12);
                  return (
                    <path
                      key={indice}
                      transform={`translate(${String(para.x + Math.cos(angulo) * alcance)} ${String(para.y + Math.sin(angulo) * alcance * 0.55)}) rotate(${String(indice * 47 + t * 220)})`}
                      d={`M 0 ${String(-tamanho)} L ${String(tamanho * 0.8)} 0 L 0 ${String(tamanho * 0.7)} L ${String(-tamanho * 0.6)} ${String(tamanho * 0.2)} Z`}
                      fill="#6a6157"
                      stroke="#100e0c"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </g>
            );

          case 'dissipar':
            return (
              <g key={chave} opacity={(1 - t) * 0.5 * beat.forca}>
                {[0, 1, 2].map((indice) => (
                  <ellipse
                    key={indice}
                    cx={para.x + (indice - 1) * 60}
                    cy={para.y - t * (40 + indice * 22)}
                    rx={(46 + indice * 18) * (0.6 + t)}
                    ry={(30 + indice * 12) * (0.6 + t)}
                    fill="#4a423a"
                  />
                ))}
              </g>
            );

          default:
            return null;
        }
      })}
    </svg>
  );
};
