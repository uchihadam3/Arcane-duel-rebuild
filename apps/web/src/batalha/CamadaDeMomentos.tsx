import { useMemo, useRef } from 'react';
import type { MomentoEmCena } from '@arcane-duel/vfx';

import { cameraParaViewport, projetar } from '../arena/camera.js';
import { pecaPorChave } from '../arena/layout.js';
import { COR_DO_BANNER } from '../arena/paleta.js';
import { useViewport } from './useViewport.js';

/*
 * O que a apresentação escreve por cima do campo.
 *
 * Três coisas, e nenhuma delas é decoração:
 *
 * - **números flutuantes** no ponto do impacto, porque o jogador está olhando
 *   para a ação e não para o HUD. O dano é dito duas vezes de propósito;
 * - **a palavra RUPTURA**, que precisa de peso próprio;
 * - **a faixa de turno**, translúcida e curta, atravessando a tela sem cobrir
 *   o campo, com a cor de quem recebeu o turno.
 *
 * Tudo posicionado pela projeção das âncoras. Nenhuma coordenada escrita à
 * mão, nenhum `left: 473px`.
 */

export interface CamadaDeMomentosProps {
  readonly momentos: readonly MomentoEmCena[];
}

export const CamadaDeMomentos = ({ momentos }: CamadaDeMomentosProps): React.JSX.Element => {
  const area = useRef<HTMLDivElement | null>(null);
  const usada = useViewport(area);
  const camera = useMemo(() => cameraParaViewport(usada), [usada]);

  const posicao = (
    chave: string | null,
  ): { readonly left: string; readonly top: string } | null => {
    if (chave === null) return null;
    const peca = pecaPorChave(chave);
    if (peca === undefined) return null;
    const ponto = projetar(camera, peca.centro, usada);
    return { left: `${String(ponto.normalX * 100)}%`, top: `${String(ponto.normalY * 100)}%` };
  };

  const faixa = momentos.find((momento) => momento.evento.tipo === 'banner-de-turno');
  const ruptura = momentos.find((momento) => momento.evento.tipo === 'ruptura');

  return (
    <div className="momentos" ref={area} aria-live="polite">
      {momentos
        .filter((momento) => momento.evento.valores.length > 0)
        .map((momento) => {
          const lugar = posicao(momento.evento.destino ?? momento.evento.origem);
          if (lugar === null) return null;
          return (
            <div
              key={momento.evento.id}
              className="flutuante"
              style={{
                ...lugar,
                ['--progresso' as string]: String(momento.progresso),
                opacity: 1 - Math.max(0, momento.progresso - 0.7) / 0.3,
                transform: `translate(-50%, calc(-50% - ${String(momento.progresso * 46)}px))`,
              }}
            >
              {momento.evento.valores.map((valor) => (
                <span
                  key={valor.rotulo}
                  className={`flutuante__valor flutuante__valor--${valor.tom}`}
                >
                  {valor.valor > 0 ? '+' : ''}
                  {valor.valor} {valor.rotulo}
                </span>
              ))}
            </div>
          );
        })}

      {ruptura !== undefined && (
        <div
          className="ruptura"
          data-teste="ruptura"
          role="status"
          style={{ opacity: Math.sin(Math.PI * Math.min(1, ruptura.progresso * 1.4)) }}
        >
          <span className="ruptura__palavra">RUPTURA</span>
          {ruptura.evento.valores.map((valor) => (
            <span key={valor.rotulo} className="ruptura__bonus">
              +{valor.valor} de Dano
            </span>
          ))}
        </div>
      )}

      {faixa !== undefined && (
        <div
          className="faixa-de-turno"
          data-teste="banner-de-turno"
          role="status"
          style={{
            ['--cor-do-dono' as string]: COR_DO_BANNER[faixa.evento.lado],
            // A faixa varre a tela: entra, sustenta e sai, sem nunca cobrir o
            // campo — ela é uma tira translúcida, não um modal.
            ['--varredura' as string]: String(faixa.progresso),
            opacity: Math.sin(Math.PI * Math.min(1, faixa.progresso * 1.15)),
          }}
        >
          <span className="faixa-de-turno__texto">
            {faixa.evento.lado === 'proprio' ? 'SEU TURNO' : 'TURNO DO ADVERSÁRIO'}
          </span>
          {faixa.evento.rotulo !== null && (
            <span className="faixa-de-turno__numero">{faixa.evento.rotulo}</span>
          )}
        </div>
      )}
    </div>
  );
};
