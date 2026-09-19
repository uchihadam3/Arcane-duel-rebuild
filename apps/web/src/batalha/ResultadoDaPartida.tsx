import { BotaoDeJogo } from '@arcane-duel/ui';

/*
 * O fim da partida.
 *
 * Quem venceu, com que classe e em quantos turnos. A revanche não decide
 * sozinha quem começa: o documento não define o critério, então a pergunta
 * volta a ser feita.
 *
 * A arena continua atrás, e de propósito: a última jogada fica à vista,
 * desacelerada e escurecida, com a metade do vencedor acesa na cor da classe
 * dele. Cobrir o campo com um retângulo apagaria justamente o que acabou de
 * acontecer.
 */

export interface ResultadoDaPartidaProps {
  readonly vencedor: string | null;
  /** De que lado do campo está quem venceu, para a luz saber onde acender. */
  readonly lado?: 'proprio' | 'adversario' | null;
  /** A cor da classe vencedora, em CSS. */
  readonly corDaClasse?: string | null;
  readonly classeVencedora: string | null;
  readonly classePerdedora: string | null;
  readonly turnos: number;
  readonly vidaRestante: number | null;
  readonly aoRevanche: () => void;
  readonly aoMenu: () => void;
}

export const ResultadoDaPartida = ({
  vencedor,
  lado = null,
  corDaClasse = null,
  classeVencedora,
  classePerdedora,
  turnos,
  vidaRestante,
  aoRevanche,
  aoMenu,
}: ResultadoDaPartidaProps): React.JSX.Element => (
  <section
    className={`resultado${lado === null ? '' : ` resultado--${lado}`}`}
    data-teste="resultado"
    role="dialog"
    aria-modal="true"
    style={corDaClasse === null ? undefined : { ['--cor-do-vencedor' as string]: corDaClasse }}
  >
    <div className="resultado__caixa">
      <h1 className="resultado__titulo">{vencedor === null ? 'Empate' : 'Vitória'}</h1>
      {vencedor !== null && (
        <p className="resultado__vencedor">
          {vencedor}
          {classeVencedora !== null && <span className="resultado__classe">{classeVencedora}</span>}
        </p>
      )}

      <dl className="resultado__resumo">
        <dt>Turnos</dt>
        <dd>{turnos}</dd>
        {vidaRestante !== null && (
          <>
            <dt>Vida restante</dt>
            <dd>{vidaRestante}</dd>
          </>
        )}
        {classePerdedora !== null && (
          <>
            <dt>Adversário</dt>
            <dd>{classePerdedora}</dd>
          </>
        )}
      </dl>

      <div className="resultado__acoes">
        <BotaoDeJogo tom="principal" aoTocar={aoRevanche} largo dadoDeTeste="revanche">
          Revanche
        </BotaoDeJogo>
        <BotaoDeJogo tom="secundario" aoTocar={aoMenu} largo dadoDeTeste="voltar-ao-menu">
          Menu
        </BotaoDeJogo>
      </div>
    </div>
  </section>
);
