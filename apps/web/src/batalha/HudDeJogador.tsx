import type { VisaoDeJogador } from '@arcane-duel/shared-types';
import { Medidor } from '@arcane-duel/ui';

import { nomeDaClasse } from '../partida/apresentacao.js';
import { RecursoDaClasse } from './RecursoDaClasse.js';

/*
 * O HUD é camada de tela, não peça do tabuleiro.
 *
 * Vida e Guarda ficam presas ao canto — do jogador embaixo, do adversário em
 * cima — porque são a primeira coisa que alguém procura e precisam estar
 * sempre no mesmo lugar.
 */

export interface HudDeJogadorProps {
  readonly jogador: VisaoDeJogador;
  readonly nome: string;
  readonly lado: 'proprio' | 'adversario';
  readonly daVez: boolean;
  readonly maximoDeAcoes: number;
}

export const HudDeJogador = ({
  jogador,
  nome,
  lado,
  daVez,
  maximoDeAcoes,
}: HudDeJogadorProps): React.JSX.Element => (
  <header className={`hud hud--${lado}${daVez ? ' hud--da-vez' : ''}`} data-teste={`hud-${lado}`}>
    <div className="hud__identidade">
      <span className="hud__nome">{nome}</span>
      <span className="hud__classe">{nomeDaClasse(jogador.classe)}</span>
      {daVez && <span className="hud__vez">Vez dele</span>}
    </div>

    <div className="hud__vitais">
      <Medidor rotulo="Vida" valor={jogador.vida} maximo={30} tom="vida" />
      <Medidor rotulo="Guarda" valor={jogador.guarda} maximo={6} tom="guarda" />
    </div>

    <div className="hud__turno">
      <Medidor rotulo="AP" valor={jogador.pontosDeAcao} tom="acao" compacto />
      <Medidor rotulo="Reserva" valor={jogador.reserva} maximo={2} tom="reserva" compacto />
      <span className="hud__acoes" data-teste={`acoes-usadas-${lado}`}>
        Ações {jogador.acoesRealizadasNoTurno}/{maximoDeAcoes}
      </span>
      {jogador.impulsoInicial && <span className="hud__impulso">Impulso Inicial</span>}
    </div>

    <div className="hud__recurso">
      <RecursoDaClasse recurso={jogador.recurso} guarda={jogador.guarda} />
    </div>
  </header>
);
