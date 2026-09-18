import { BotaoDeJogo } from '@arcane-duel/ui';

/*
 * A troca de jogador no mesmo aparelho.
 *
 * Enquanto esta tela está no ar, **nada** do outro jogador existe na página:
 * a projeção nem chega a ser calculada. Não é opacidade, não é `display:none`
 * e não é um campo escondido atrás de uma flag — é ausência de dado.
 */

export interface HandoffProps {
  readonly nomeDoJogador: string;
  readonly classe: string;
  readonly aoConfirmar: () => void;
}

export const Handoff = ({
  nomeDoJogador,
  classe,
  aoConfirmar,
}: HandoffProps): React.JSX.Element => (
  <div className="handoff" data-teste="handoff" role="dialog" aria-modal="true">
    <div className="handoff__caixa">
      <p className="handoff__aviso">Passe o aparelho</p>
      <h1 className="handoff__jogador">{nomeDoJogador}</h1>
      <p className="handoff__classe">{classe}</p>
      <p className="handoff__instrucao">
        A mão e as Passivas ocultas do outro jogador continuam escondidas até você confirmar.
      </p>
      <BotaoDeJogo tom="principal" aoTocar={aoConfirmar} largo dadoDeTeste="estou-pronto">
        Estou pronto
      </BotaoDeJogo>
    </div>
  </div>
);
