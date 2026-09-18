import type { CardId } from '@arcane-duel/shared-types';
import { BotaoDeJogo, CartaDeJogo } from '@arcane-duel/ui';

import { MOLDURA_DO_TIPO, NOME_DO_TIPO, cartaVisivel } from '../partida/apresentacao.js';

/*
 * A inspeção de carta.
 *
 * Coluna lateral, e não modal: durante uma sequência de Ação o jogador precisa
 * continuar vendo os três espaços centrais. O painel cobre a lateral, nunca o
 * miolo do campo.
 */

export interface AcaoDoInspetor {
  readonly rotulo: string;
  readonly aoTocar: () => void;
  readonly tom?: 'principal' | 'secundario' | 'perigo';
  readonly desabilitado?: boolean;
}

export interface InspetorDeCartaProps {
  readonly carta: CardId | null;
  readonly acoes: readonly AcaoDoInspetor[];
  readonly aviso?: string | null;
  readonly aoFechar?: (() => void) | undefined;
}

export const InspetorDeCarta = ({
  carta,
  acoes,
  aviso = null,
  aoFechar,
}: InspetorDeCartaProps): React.JSX.Element => {
  if (carta === null) {
    return (
      <aside className="inspetor inspetor--vazio" data-teste="inspetor">
        <p className="inspetor__dica">Toque em uma carta para ver o que ela faz.</p>
      </aside>
    );
  }

  const visivel = cartaVisivel(carta);
  if (visivel === null) {
    return (
      <aside className="inspetor" data-teste="inspetor">
        <p className="inspetor__dica">Carta desconhecida.</p>
      </aside>
    );
  }

  return (
    <aside className="inspetor" data-teste="inspetor" aria-label={`Detalhes de ${visivel.nome}`}>
      <div className="inspetor__carta">
        <CartaDeJogo
          nome={visivel.nome}
          tipo={NOME_DO_TIPO[visivel.tipo]}
          moldura={MOLDURA_DO_TIPO[visivel.tipo]}
          tamanho="inspecao"
        />
      </div>

      <h2 className="inspetor__nome">{visivel.nome}</h2>
      <p className="inspetor__tipo">{NOME_DO_TIPO[visivel.tipo]}</p>

      <dl className="inspetor__dados">
        {visivel.custo !== null && (
          <>
            <dt>Custo</dt>
            <dd>
              {visivel.custo.valor} {visivel.custo.moeda === 'reserva' ? 'Reserva' : 'AP'}
              {visivel.custo.recurso !== null && ` + ${visivel.custo.recurso}`}
            </dd>
          </>
        )}
        {visivel.dano !== null && (
          <>
            <dt>Dano</dt>
            <dd>{visivel.dano}</dd>
          </>
        )}
        {visivel.impacto !== null && (
          <>
            <dt>Impacto</dt>
            <dd>{visivel.impacto}</dd>
          </>
        )}
        {visivel.cooldown !== null && (
          <>
            <dt>Cooldown</dt>
            <dd>CD{visivel.cooldown}</dd>
          </>
        )}
      </dl>

      <p className="inspetor__texto">{visivel.texto}</p>
      {visivel.textoAtivar !== null && (
        <p className="inspetor__texto inspetor__texto--ativar">
          <b>Ativar:</b> {visivel.textoAtivar}
        </p>
      )}
      {visivel.textoExaurir !== null && (
        <p className="inspetor__texto inspetor__texto--exaurir">
          <b>Exaurir:</b> {visivel.textoExaurir}
        </p>
      )}

      {aviso !== null && (
        <p className="inspetor__aviso" data-teste="inspetor-aviso">
          {aviso}
        </p>
      )}

      <div className="inspetor__acoes">
        {acoes.map((acao) => (
          <BotaoDeJogo
            key={acao.rotulo}
            tom={acao.tom ?? 'principal'}
            aoTocar={acao.aoTocar}
            desabilitado={acao.desabilitado ?? false}
            largo
          >
            {acao.rotulo}
          </BotaoDeJogo>
        ))}
        {aoFechar !== undefined && (
          <BotaoDeJogo tom="discreto" aoTocar={aoFechar} largo>
            Fechar
          </BotaoDeJogo>
        )}
      </div>
    </aside>
  );
};
