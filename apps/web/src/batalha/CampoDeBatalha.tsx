import type {
  CardId,
  IndiceDeAcao,
  VisaoDaPartida,
  VisaoDeJogador,
} from '@arcane-duel/shared-types';

import { atributoDaAncora, useAncorasDoCampo } from './ancoras.js';
import { CartasDeClasse } from './CartasDeClasse.js';
import { Condicoes } from './Condicoes.js';
import { Cooldown } from './Cooldown.js';
import { HudDeJogador } from './HudDeJogador.js';
import { Mao } from './Mao.js';
import { ModuloDeAcoes } from './ModuloDeAcoes.js';
import { Passivas } from './Passivas.js';
import { Ultimate } from './Ultimate.js';

/*
 * O campo inteiro, em uma tela só.
 *
 * O adversário em cima, os três módulos de Ação no centro, o jogador embaixo
 * com a mão na borda. A coluna lateral é da inspeção e **nunca** cobre o
 * miolo: os espaços de Ação e as Respostas precisam continuar visíveis
 * enquanto se lê uma carta.
 */

export interface CampoDeBatalhaProps {
  readonly visao: VisaoDaPartida;
  readonly eu: VisaoDeJogador;
  readonly adversario: VisaoDeJogador;
  readonly nomeDoJogador: string;
  readonly nomeDoAdversario: string;
  readonly focada: CardId | null;
  readonly jogaveis: ReadonlySet<string>;
  readonly reservado: IndiceDeAcao | null;
  readonly emFoco: IndiceDeAcao | null;
  readonly aoFocarCarta: (carta: CardId) => void;
}

export const CampoDeBatalha = ({
  visao,
  eu,
  adversario,
  nomeDoJogador,
  nomeDoAdversario,
  focada,
  jogaveis,
  reservado,
  emFoco,
  aoFocarCarta,
}: CampoDeBatalhaProps): React.JSX.Element => {
  const ativo = visao.turno?.jogadorAtivo;
  // As zonas se declaram com `data-ancora`; o campo mede todas de uma vez.
  const { campo } = useAncorasDoCampo(visao);

  return (
    <div className="campo" data-teste="campo" ref={campo}>
      <section className="campo__lado campo__lado--adversario">
        <HudDeJogador
          jogador={adversario}
          nome={nomeDoAdversario}
          lado="adversario"
          daVez={ativo === adversario.id}
          maximoDeAcoes={adversario.acoesPermitidasNoTurno}
        />
        <div className="campo__pecas">
          <Passivas passivas={adversario.passivas} lado="adversario" />
          <CartasDeClasse
            cartas={adversario.cartasDeClasse}
            removidas={adversario.removidas}
            lado="adversario"
          />
          <Ultimate ultimate={adversario.ultimate} lado="adversario" />
          <Cooldown zonas={adversario.cooldown} lado="adversario" />
          <Condicoes condicoes={adversario.condicoes} />
        </div>
        <ModuloDeAcoes acoes={adversario.acoes} lado="adversario" />
      </section>

      <section className="campo__lado campo__lado--proprio">
        <ModuloDeAcoes acoes={eu.acoes} lado="proprio" reservado={reservado} emFoco={emFoco} />
        <div className="campo__pecas">
          <Passivas
            passivas={eu.passivas}
            lado="proprio"
            aoTocar={aoFocarCarta}
            selecionada={focada}
          />
          <CartasDeClasse
            cartas={eu.cartasDeClasse}
            removidas={eu.removidas}
            lado="proprio"
            aoTocar={aoFocarCarta}
            selecionada={focada}
          />
          <Ultimate
            ultimate={eu.ultimate}
            lado="proprio"
            aoTocar={aoFocarCarta}
            selecionada={focada === eu.ultimate.carta}
          />
          <Cooldown zonas={eu.cooldown} lado="proprio" />
          <Condicoes condicoes={eu.condicoes} />
        </div>
        <HudDeJogador
          jogador={eu}
          nome={nomeDoJogador}
          lado="proprio"
          daVez={ativo === eu.id}
          maximoDeAcoes={eu.acoesPermitidasNoTurno}
        />
        <div {...atributoDaAncora('proprio', 'mao')}>
          <Mao cartas={eu.mao} focada={focada} jogaveis={jogaveis} aoFocar={aoFocarCarta} />
        </div>
      </section>
    </div>
  );
};
