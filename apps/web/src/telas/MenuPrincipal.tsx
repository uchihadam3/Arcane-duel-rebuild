import { BotaoDeJogo } from '@arcane-duel/ui';

import { BotaoDeInstalacao } from '../components/BotaoDeInstalacao.js';

/*
 * A home do produto.
 *
 * Só o que existe entra aqui. Login, loja, ranked, campanha e Desafio de IA
 * são etapas seguintes do roadmap e não ganham botão desligado: um botão que
 * não leva a lugar nenhum é uma promessa quebrada na primeira vez que alguém
 * abre o aplicativo.
 */

export interface MenuPrincipalProps {
  readonly aoJogarLocal: () => void;
  readonly aoAbrirStatus: () => void;
  readonly commitCurto: string;
}

export const MenuPrincipal = ({
  aoJogarLocal,
  aoAbrirStatus,
  commitCurto,
}: MenuPrincipalProps): React.JSX.Element => (
  <main className="menu" data-teste="menu-principal">
    <div className="menu__marca">
      <h1 className="menu__titulo">Arcane Duel</h1>
      <p className="menu__subtitulo">Duelo de classes, um contra um</p>
    </div>

    <div className="menu__acoes">
      <BotaoDeJogo tom="principal" aoTocar={aoJogarLocal} largo dadoDeTeste="jogar-local">
        Jogar local
      </BotaoDeJogo>
      <BotaoDeInstalacao />
    </div>

    <footer className="menu__rodape">
      <button
        type="button"
        className="menu__link"
        onClick={aoAbrirStatus}
        data-teste="abrir-status"
      >
        Sobre / Build
      </button>
      <span className="menu__commit">{commitCurto}</span>
    </footer>
  </main>
);
