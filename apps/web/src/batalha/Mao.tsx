import type { CardId, CartaProjetada } from '@arcane-duel/shared-types';
import { CartaDeJogo, CartaVirada } from '@arcane-duel/ui';

import { MOLDURA_DO_TIPO, NOME_DO_TIPO, cartaVisivel } from '../partida/apresentacao.js';

/*
 * A mão, em leque discreto.
 *
 * São oito cartas em tela pequena, então a sobreposição é grande e o que
 * precisa permanecer legível é o **topo** — nome, custo e tipo. A carta em
 * foco sobe e cresce; as vizinhas não se afastam, porque mover sete cartas
 * para levantar uma é caro e ilegível.
 *
 * Nada aqui depende de hover: o primeiro toque foca, e usar é um botão à
 * parte no inspetor.
 */

export interface MaoProps {
  readonly cartas: readonly CartaProjetada[];
  readonly focada: CardId | null;
  readonly jogaveis: ReadonlySet<string>;
  readonly aoFocar: (carta: CardId) => void;
}

export const Mao = ({ cartas, focada, jogaveis, aoFocar }: MaoProps): React.JSX.Element => (
  <div className="mao" data-teste="mao" role="group" aria-label="Sua mão">
    {cartas.map((item, indice) => {
      if (!item.visivel) {
        return (
          <div className="mao__carta" key={`oculta-${String(indice)}`}>
            <CartaVirada tamanho="mao" rotuloDeAcesso="Carta da mão" />
          </div>
        );
      }

      const visivel = cartaVisivel(item.carta);
      if (visivel === null) return null;
      const podeJogar = jogaveis.has(String(item.carta));

      return (
        <div
          className={`mao__carta${focada === item.carta ? ' mao__carta--foco' : ''}`}
          key={item.carta}
          style={{ '--posicao': indice } as React.CSSProperties}
        >
          <CartaDeJogo
            nome={visivel.nome}
            tipo={NOME_DO_TIPO[visivel.tipo]}
            moldura={MOLDURA_DO_TIPO[visivel.tipo]}
            custo={
              visivel.custo === null
                ? null
                : `${String(visivel.custo.valor)}${visivel.custo.moeda === 'reserva' ? ' R' : ''}`
            }
            dano={visivel.dano}
            impacto={visivel.impacto}
            cooldown={visivel.cooldown}
            tamanho="mao"
            selecao={focada === item.carta ? 'selecionada' : podeJogar ? 'selecionavel' : 'nenhum'}
            indisponivel={!podeJogar}
            aoTocar={() => {
              aoFocar(item.carta);
            }}
            rotuloDeAcesso={`${visivel.nome}, ${NOME_DO_TIPO[visivel.tipo]}${podeJogar ? '' : ', indisponível agora'}`}
          />
        </div>
      );
    })}
  </div>
);
