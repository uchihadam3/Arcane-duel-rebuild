import type { VisaoDeJogador } from '@arcane-duel/shared-types';

import { corDaClasse } from '../carta/paleta.js';
import type { Caixa } from '../layout/zonas.js';

/*
 * Os controles de turno.
 *
 * AP, Reserva, o contador de Ações e o botão de encerrar. Eles são **HUD**, e
 * moram num retângulo próprio no canto inferior direito — nunca sobre a mão,
 * nunca sobre o campo, nunca sobre o cooldown. O teste geométrico dos seis
 * viewports é quem garante isso, e ele falha o build.
 *
 * O AP é o recurso do turno e aparece grande: é o número que decide se ainda dá
 * para jogar. Reserva e Ações são menores porque se consultam menos.
 */

const FONTE_NUMERO = "'SF Mono', 'Segoe UI', 'Noto Sans', system-ui, sans-serif";
const FONTE_ROTULO = "'Iowan Old Style', Palatino, Georgia, serif";

export interface ControlesDeTurnoProps {
  readonly jogador: VisaoDeJogador;
  readonly caixa: Caixa;
  readonly acoesUsadas: number;
  readonly acoesPermitidas: number;
  readonly podeEncerrar: boolean;
  readonly aoEncerrar: () => void;
  /**
   * A pergunta da janela de Resposta, quando há uma.
   *
   * Ela mora **aqui**, e não no meio da arena. No meio ela cobriria
   * exatamente o pedestal com a carta que está sendo perguntada — foi o que
   * a primeira prova mostrou: o painel tapava a Técnica que ele anunciava.
   * Aqui fica onde o polegar já está quando há um comando a dar.
   */
  readonly pergunta?: { readonly texto: string; readonly aoDispensar: () => void } | null;
}

export const ControlesDeTurno = ({
  jogador,
  caixa,
  acoesUsadas,
  acoesPermitidas,
  podeEncerrar,
  aoEncerrar,
  pergunta = null,
}: ControlesDeTurnoProps): React.JSX.Element => {
  const cores = corDaClasse(jogador.classe);
  return (
    <div
      className={`v2-controles${pergunta !== null ? ' v2-controles--pergunta' : ''}`}
      data-teste="controles-de-turno"
      style={{
        left: `${String(caixa.x)}px`,
        top: `${String(caixa.y)}px`,
        width: `${String(caixa.largura)}px`,
        height: `${String(caixa.altura)}px`,
        ['--v2-energia' as string]: cores.energia,
      }}
    >
      <div className="v2-controles__medidores">
        <div className="v2-controles__ap">
          <span className="v2-controles__rotulo" style={{ fontFamily: FONTE_ROTULO }}>
            AP
          </span>
          <span className="v2-controles__numero" style={{ fontFamily: FONTE_NUMERO }}>
            {String(jogador.pontosDeAcao)}
          </span>
        </div>
        <div className="v2-controles__menores">
          <span style={{ fontFamily: FONTE_ROTULO }}>
            RESERVA <b style={{ fontFamily: FONTE_NUMERO }}>{String(jogador.reserva)}</b>
          </span>
          <span style={{ fontFamily: FONTE_ROTULO }}>
            AÇÕES{' '}
            <b style={{ fontFamily: FONTE_NUMERO }}>
              {String(acoesUsadas)}/{String(acoesPermitidas)}
            </b>
          </span>
        </div>
      </div>
      {pergunta === null ? (
        <button
          type="button"
          className="v2-controles__encerrar"
          data-teste="encerrar-turno"
          disabled={!podeEncerrar}
          onClick={aoEncerrar}
        >
          ENCERRAR TURNO
        </button>
      ) : (
        <div className="v2-controles__pergunta" data-teste="janela-de-resposta">
          <span className="v2-controles__aviso">{pergunta.texto}</span>
          <button
            type="button"
            className="v2-controles__encerrar"
            data-teste="sem-resposta"
            onClick={pergunta.aoDispensar}
          >
            SEM RESPOSTA
          </button>
        </div>
      )}
    </div>
  );
};
