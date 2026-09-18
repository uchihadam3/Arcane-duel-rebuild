import type { IndiceDeAcao, SlotDeAcaoProjetado } from '@arcane-duel/shared-types';
import { CartaDeJogo, CartaVirada, SlotDoCampo } from '@arcane-duel/ui';

import { atributoDaAncora } from './ancoras.js';
import { MOLDURA_DO_TIPO, NOME_DO_TIPO, cartaVisivel } from '../partida/apresentacao.js';

/*
 * Os três espaços de Ação, com a Resposta presa a cada um.
 *
 * A Resposta não é uma zona solta: ela pertence à Ação que respondeu, e a
 * leitura "o que aconteceu aqui" precisa caber em um olhar. Por isso os dois
 * slots ficam no mesmo módulo, um sob o outro.
 *
 * A carta declarada **continua** no espaço depois de resolver. Sumir com ela
 * apagaria a memória do turno.
 */

const TITULO = ['Primeira Ação', 'Segunda Ação', 'Terceira Ação', 'Ação extra'];

const ESTADO_LEGIVEL: Readonly<Record<string, string>> = {
  indisponivel: 'Indisponível',
  vazio: 'Livre',
  declarada: 'Aguardando Resposta',
  resolvida: 'Resolvida',
};

export interface ModuloDeAcoesProps {
  readonly acoes: readonly SlotDeAcaoProjetado[];
  readonly lado: 'proprio' | 'adversario';
  /** O espaço que a Emboscada armada reservou, quando há uma. */
  readonly reservado?: IndiceDeAcao | null;
  readonly emFoco?: IndiceDeAcao | null;
}

export const ModuloDeAcoes = ({
  acoes,
  lado,
  reservado = null,
  emFoco = null,
}: ModuloDeAcoesProps): React.JSX.Element => (
  <div className={`acoes acoes--${lado}`} data-teste={`acoes-${lado}`}>
    {acoes.slice(0, 3).map((slot) => {
      const visivel = slot.perfil === null ? null : cartaVisivel(slot.perfil.carta);
      const reservaAqui = reservado === slot.indice && slot.situacao === 'vazio';

      return (
        <div
          key={slot.indice}
          className={`acao${emFoco === slot.indice ? ' acao--foco' : ''}`}
          data-indice={slot.indice}
        >
          <div {...atributoDaAncora(lado, 'acao', slot.indice)}>
            <SlotDoCampo
              assetId="slot-acao"
              rotulo={TITULO[slot.indice] ?? 'Ação'}
              estado={
                reservaAqui
                  ? 'reservado'
                  : slot.situacao === 'declarada'
                    ? 'aguardando'
                    : slot.situacao === 'resolvida'
                      ? 'ocupado'
                      : 'vazio'
              }
            >
              {visivel !== null && (
                <CartaDeJogo
                  nome={visivel.nome}
                  tipo={NOME_DO_TIPO[visivel.tipo]}
                  moldura={MOLDURA_DO_TIPO[visivel.tipo]}
                  custo={visivel.custo === null ? null : String(visivel.custo.valor)}
                  dano={visivel.dano}
                  impacto={visivel.impacto}
                  tamanho="campo"
                />
              )}
              {reservaAqui && (
                <div className="acao__reserva" data-teste="acao-reservada">
                  <CartaVirada tamanho="campo" rotuloDeAcesso="Ataque reservado face-down" />
                  <span className="acao__reserva-texto">Reservado</span>
                </div>
              )}
            </SlotDoCampo>
          </div>

          <span className="acao__situacao">{ESTADO_LEGIVEL[slot.situacao] ?? slot.situacao}</span>

          <div className="acao__resposta-area" {...atributoDaAncora(lado, 'resposta', slot.indice)}>
            <SlotDoCampo
              assetId="slot-resposta"
              rotulo={`Resposta ${String(slot.indice + 1)}`}
              estado={slot.resposta.voluntaria === null ? 'vazio' : 'ocupado'}
              className="acao__resposta"
            >
              {slot.resposta.voluntaria !== null && (
                <RespostaNoSlot resposta={slot.resposta.voluntaria} />
              )}
            </SlotDoCampo>
            {/* O rótulo fica **sob** a laje: dentro dela ele competia com a
                carta da Resposta e sobrava texto por cima da moldura. */}
            {slot.situacao !== 'vazio' && slot.situacao !== 'indisponivel' && (
              <span className="acao__resposta-rotulo">
                {slot.resposta.voluntaria === null ? 'Sem Resposta' : 'Respondida'}
              </span>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

const RespostaNoSlot = ({
  resposta,
}: {
  readonly resposta: SlotDeAcaoProjetado['resposta']['voluntaria'];
}): React.JSX.Element => {
  if (resposta === null) return <span className="acao__sem-resposta">Sem Resposta</span>;

  if (resposta.tipo === 'defesa-inata') {
    // A Defesa Inata não é carta: ela é a defesa impressa da classe. Desenhá-la
    // como carta faria o jogador procurá-la na mão.
    return (
      <span className="defesa-inata" data-teste="defesa-inata">
        Defesa Inata
      </span>
    );
  }

  const visivel = cartaVisivel(resposta.perfil.carta);
  if (visivel === null) return <span className="acao__sem-resposta">—</span>;
  return (
    <CartaDeJogo
      nome={visivel.nome}
      tipo={NOME_DO_TIPO[visivel.tipo]}
      moldura={MOLDURA_DO_TIPO[visivel.tipo]}
      tamanho="miniatura"
    />
  );
};
