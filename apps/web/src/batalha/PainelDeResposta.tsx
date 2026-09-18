import type { CardId } from '@arcane-duel/shared-types';
import { BotaoDeJogo } from '@arcane-duel/ui';

import { nomeDaCarta } from '../partida/apresentacao.js';

/*
 * A janela de Resposta.
 *
 * Ela nunca é pulada em silêncio: mesmo quando o defensor não tem Reação
 * alguma na mão, "Sem Resposta" é uma decisão tomada por ele, e não um passo
 * que a interface dá sozinha.
 */

export interface PainelDeRespostaProps {
  readonly cartaDaAcao: CardId | null;
  readonly reacoes: readonly CardId[];
  readonly nomeDaDefesa: string | null;
  readonly defesaDisponivel: boolean;
  readonly motivoDaDefesa: string | null;
  readonly aoResponderComCarta: (carta: CardId) => void;
  readonly aoUsarDefesaInata: () => void;
  readonly aoNaoResponder: () => void;
}

export const PainelDeResposta = ({
  cartaDaAcao,
  reacoes,
  nomeDaDefesa,
  defesaDisponivel,
  motivoDaDefesa,
  aoResponderComCarta,
  aoUsarDefesaInata,
  aoNaoResponder,
}: PainelDeRespostaProps): React.JSX.Element => (
  <section className="painel-de-resposta" data-teste="painel-de-resposta" aria-live="polite">
    <h2 className="painel-de-resposta__titulo">Ação recebida</h2>
    <p className="painel-de-resposta__alvo">
      {cartaDaAcao === null ? 'Uma Ação foi declarada.' : nomeDaCarta(cartaDaAcao)}
    </p>

    <div className="painel-de-resposta__opcoes">
      <BotaoDeJogo tom="secundario" aoTocar={aoNaoResponder} largo dadoDeTeste="sem-resposta">
        Sem Resposta
      </BotaoDeJogo>

      {nomeDaDefesa !== null && (
        <BotaoDeJogo
          tom="secundario"
          aoTocar={aoUsarDefesaInata}
          desabilitado={!defesaDisponivel}
          largo
          dadoDeTeste="defesa-inata"
        >
          {nomeDaDefesa}
          <small> · Defesa Inata</small>
        </BotaoDeJogo>
      )}

      {reacoes.map((carta) => (
        <BotaoDeJogo
          key={carta}
          tom="principal"
          aoTocar={() => {
            aoResponderComCarta(carta);
          }}
          largo
          dadoDeTeste={`reacao-${String(carta)}`}
        >
          {nomeDaCarta(carta)}
        </BotaoDeJogo>
      ))}
    </div>

    {motivoDaDefesa !== null && <p className="painel-de-resposta__aviso">{motivoDaDefesa}</p>}
  </section>
);
