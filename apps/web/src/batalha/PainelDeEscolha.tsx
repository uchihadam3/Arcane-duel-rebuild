import type { OpcaoDeEscolha, SituacaoDaJogada } from '@arcane-duel/gameplay/jogo';
import { BotaoDeJogo } from '@arcane-duel/ui';

import { PERGUNTA_DO_CAMPO, rotuloDaOpcao } from '../partida/rotulos.js';

/*
 * O painel que faz a pergunta.
 *
 * O motor não escolhe por ninguém: quando uma carta manda escolher, a escolha
 * chega aqui como uma pergunta com as opções que **o motor aceita** — não uma
 * lista montada à mão nesta camada.
 */

export interface PainelDeEscolhaProps {
  readonly situacao: Extract<SituacaoDaJogada, { estado: 'faltam-escolhas' }>;
  readonly aoEscolher: (opcao: OpcaoDeEscolha) => void;
  readonly aoCancelar: () => void;
}

export const PainelDeEscolha = ({
  situacao,
  aoEscolher,
  aoCancelar,
}: PainelDeEscolhaProps): React.JSX.Element => (
  <section className="painel-de-escolha" data-teste="painel-de-escolha" aria-live="polite">
    <h2 className="painel-de-escolha__titulo">{PERGUNTA_DO_CAMPO[situacao.campo]}</h2>
    <p className="painel-de-escolha__detalhe">{situacao.detalhe}</p>
    <div className="painel-de-escolha__opcoes">
      {situacao.opcoes.map((opcao) => (
        <BotaoDeJogo
          key={opcao.chave}
          tom="secundario"
          aoTocar={() => {
            aoEscolher(opcao);
          }}
          dadoDeTeste={`escolha-${opcao.chave}`}
        >
          {rotuloDaOpcao(opcao)}
        </BotaoDeJogo>
      ))}
    </div>
    <BotaoDeJogo tom="discreto" aoTocar={aoCancelar} largo dadoDeTeste="cancelar-escolha">
      Cancelar
    </BotaoDeJogo>
  </section>
);
