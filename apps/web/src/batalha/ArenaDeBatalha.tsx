import { Suspense, lazy, useMemo } from 'react';
import type {
  CardId,
  IndiceDeAcao,
  VisaoDaPartida,
  VisaoDeJogador,
} from '@arcane-duel/shared-types';
import type { MomentoEmCena } from '@arcane-duel/vfx';
import { chaveDaAncora } from '@arcane-duel/ui';

import { paletaDaClasse } from '../arena/paleta.js';
import type { AcaoDoDisco } from './DiscoDeTurno.js';
import { CamadaDeInteracao } from './CamadaDeInteracao.js';
import { CamadaDeMomentos } from './CamadaDeMomentos.js';
import { DiscoDeTurno } from './DiscoDeTurno.js';
import { HudDeCombate } from './HudDeCombate.js';
import { montarEstadoVisual } from './visual.js';

/*
 * A tela de batalha.
 *
 * Três camadas, e elas não se misturam:
 *
 * 1. **cena** — a arena tridimensional, que só desenha;
 * 2. **interação** — os alvos de toque e o campo em DOM, projetados sobre a
 *    cena pela mesma câmera;
 * 3. **tela** — HUD, disco de turno, faixa e números, presos aos cantos.
 *
 * A stack tridimensional entra por `lazy`: o menu e a configuração não
 * carregam Three.js, e o download dela só acontece quando alguém entra numa
 * partida.
 */

const ArenaTridimensional = lazy(async () => {
  const modulo = await import('./ArenaTridimensional.js');
  return { default: modulo.ArenaTridimensional };
});

export interface ArenaDeBatalhaProps {
  readonly visao: VisaoDaPartida;
  readonly eu: VisaoDeJogador;
  readonly adversario: VisaoDeJogador;
  readonly nomeDoJogador: string;
  readonly nomeDoAdversario: string;
  readonly focada: CardId | null;
  readonly jogaveis: ReadonlySet<string>;
  /** O espaço de Ação que espera Resposta, quando há um. */
  readonly respondendo: IndiceDeAcao | null;
  readonly momentos: readonly MomentoEmCena[];
  /** Quanto da luz de cada lado está acesa. Vem do diretor de apresentação. */
  readonly enfaseProprio: number;
  readonly enfaseAdversario: number;
  readonly bloqueada: boolean;
  /** Falso quando o WebGL não nasceu ou foi perdido: a cena some, o jogo fica. */
  readonly comCena: boolean;
  readonly aoFocarCarta: (carta: CardId) => void;
  readonly aoFalharCena: () => void;
  readonly acaoDoDisco: AcaoDoDisco;
  readonly aoTocarDisco: () => void;
  readonly vidaMaxima: number;
  readonly guardaMaxima: number;
}

export const ArenaDeBatalha = ({
  visao,
  eu,
  adversario,
  nomeDoJogador,
  nomeDoAdversario,
  focada,
  jogaveis,
  respondendo,
  momentos,
  enfaseProprio,
  enfaseAdversario,
  bloqueada,
  comCena,
  aoFocarCarta,
  aoFalharCena,
  acaoDoDisco,
  aoTocarDisco,
  vidaMaxima,
  guardaMaxima,
}: ArenaDeBatalhaProps): React.JSX.Element => {
  const ativo = visao.turno?.jogadorAtivo;

  const estado = useMemo(
    () =>
      montarEstadoVisual({
        visao,
        eu,
        adversario,
        focada,
        jogaveis,
        enfaseProprio,
        enfaseAdversario,
        slotEmEspera:
          respondendo === null
            ? null
            : chaveDaAncora({ lado: 'adversario', zona: 'acao', indice: respondendo }),
      }),
    [visao, eu, adversario, focada, jogaveis, enfaseProprio, enfaseAdversario, respondendo],
  );

  return (
    <div className="arena" data-teste="campo">
      {comCena && (
        <Suspense fallback={null}>
          <ArenaTridimensional estado={estado} momentos={momentos} aoFalhar={aoFalharCena} />
        </Suspense>
      )}

      {/*
       * A ênfase de lado é luz em código, e não uma imagem esticada: não há
       * asset para ela no catálogo, e não deveria haver. Ela existe também
       * aqui, fora do canvas, para continuar respondendo "de quem é o efeito"
       * quando não há WebGL.
       */}
      <div
        className="arena__enfase arena__enfase--adversario"
        aria-hidden="true"
        style={{
          opacity: enfaseAdversario * 0.42,
          ['--cor-do-lado' as string]: paletaDaClasse(adversario.classe).cssLuz,
        }}
      />
      <div
        className="arena__enfase arena__enfase--proprio"
        aria-hidden="true"
        style={{
          opacity: enfaseProprio * 0.42,
          ['--cor-do-lado' as string]: paletaDaClasse(eu.classe).cssLuz,
        }}
      />

      <CamadaDeInteracao
        estado={estado}
        comCena={comCena}
        aoFocarCarta={aoFocarCarta}
        bloqueada={bloqueada}
      />

      <CamadaDeMomentos momentos={momentos} />

      <HudDeCombate
        jogador={adversario}
        nome={nomeDoAdversario}
        lado="adversario"
        daVez={ativo === adversario.id}
        vidaMaxima={vidaMaxima}
        guardaMaxima={guardaMaxima}
      />
      <HudDeCombate
        jogador={eu}
        nome={nomeDoJogador}
        lado="proprio"
        daVez={ativo === eu.id}
        vidaMaxima={vidaMaxima}
        guardaMaxima={guardaMaxima}
      />

      <DiscoDeTurno
        turno={visao.turno?.numero ?? 0}
        pontosDeAcao={eu.pontosDeAcao}
        acoesUsadas={eu.acoesRealizadasNoTurno}
        acoesPermitidas={eu.acoesPermitidasNoTurno}
        corDaClasse={paletaDaClasse(eu.classe).cssLuz}
        acao={acaoDoDisco}
        aoTocar={aoTocarDisco}
        desabilitado={bloqueada}
      />
    </div>
  );
};
