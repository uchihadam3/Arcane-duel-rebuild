import type { CardId, PassivaProjetada } from '@arcane-duel/shared-types';
import { CartaDeJogo, CartaVirada, SlotDoCampo } from '@arcane-duel/ui';

import { atributoDaAncora } from './ancoras.js';
import { MOLDURA_DO_TIPO, NOME_DO_TIPO, cartaVisivel } from '../partida/apresentacao.js';

/*
 * As quatro Passivas.
 *
 * Enquanto oculta, a Passiva é o verso aprovado — e a identidade dela **não
 * chega até aqui**: a projeção do observador que não pode vê-la simplesmente
 * não traz o campo. Revelada, ela vira carta face-up como qualquer outra.
 *
 * Passiva nunca Exaure. Ela pode estar Ativada, e isso é girar, não sair.
 */

const NOME_DO_ESTADO: Readonly<Record<string, string>> = {
  oculta: 'oculta',
  pronta: 'Pronta',
  ativada: 'Ativada',
};

export interface PassivasProps {
  readonly passivas: readonly PassivaProjetada[];
  readonly lado: 'proprio' | 'adversario';
  readonly aoTocar?: ((carta: CardId) => void) | undefined;
  readonly selecionada?: CardId | null | undefined;
}

export const Passivas = ({
  passivas,
  lado,
  aoTocar,
  selecionada = null,
}: PassivasProps): React.JSX.Element => (
  <div className={`passivas passivas--${lado}`} data-teste={`passivas-${lado}`}>
    {passivas.map((passiva, indice) => {
      const chave = passiva.carta.visivel
        ? String(passiva.carta.carta)
        : `oculta-${String(indice)}`;
      return (
        <SlotDoCampo
          key={chave}
          ancora={atributoDaAncora(lado, 'passiva', indice)['data-ancora']}
          assetId="slot-passiva"
          rotulo={`Passiva ${String(indice + 1)}`}
          estado={passiva.estado === 'oculta' ? 'vazio' : 'ocupado'}
        >
          {passiva.carta.visivel ? (
            <PassivaRevelada
              carta={passiva.carta.carta}
              estado={passiva.estado}
              aoTocar={aoTocar}
              selecionada={selecionada === passiva.carta.carta}
            />
          ) : (
            <CartaVirada tamanho="miniatura" rotuloDeAcesso="Passiva ainda oculta" />
          )}
          <span className="passivas__estado">
            {NOME_DO_ESTADO[passiva.estado] ?? passiva.estado}
          </span>
        </SlotDoCampo>
      );
    })}
  </div>
);

const PassivaRevelada = ({
  carta,
  estado,
  aoTocar,
  selecionada,
}: {
  readonly carta: CardId;
  readonly estado: string;
  readonly aoTocar?: ((carta: CardId) => void) | undefined;
  readonly selecionada: boolean;
}): React.JSX.Element => {
  const visivel = cartaVisivel(carta);
  if (visivel === null) return <span className="passivas__vazia">—</span>;

  return (
    <CartaDeJogo
      nome={visivel.nome}
      tipo={NOME_DO_TIPO[visivel.tipo]}
      moldura={MOLDURA_DO_TIPO[visivel.tipo]}
      tamanho="miniatura"
      deitada={estado === 'ativada'}
      selecao={selecionada ? 'selecionada' : 'nenhum'}
      aoTocar={
        aoTocar === undefined
          ? undefined
          : () => {
              aoTocar(carta);
            }
      }
    />
  );
};
