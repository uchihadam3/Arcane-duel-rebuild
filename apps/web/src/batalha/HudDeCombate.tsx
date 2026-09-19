import type { VisaoDeJogador } from '@arcane-duel/shared-types';
import type { LadoDoCampo } from '@arcane-duel/ui';

import { paletaDaClasse } from '../arena/paleta.js';
import { nomeDaClasse } from '../partida/apresentacao.js';
import { RecursoDaClasse } from './RecursoDaClasse.js';

/*
 * O HUD de combate.
 *
 * Camada de **tela**, não de campo: ele não se inclina com a arena e não se
 * move com ela. Jogador no canto inferior esquerdo, adversário no superior
 * direito — diagonal, como no vídeo de referência, e não espelhado na
 * vertical: a diagonal deixa os dois HUDs longe das três Ações centrais.
 *
 * A hierarquia é rígida. Vida é a informação dominante e tem o maior corpo da
 * tela; Guarda vem logo abaixo, com peso próprio porque é ela que decide
 * Ruptura; AP e Ações precisam ser lidos de relance, então ficam em números
 * grandes e tabulares, nunca em texto corrido.
 *
 * Os valores mudam no instante em que o estado muda. Nenhuma barra aqui
 * segura um número esperando animação terminar.
 */

export interface HudDeCombateProps {
  readonly jogador: VisaoDeJogador;
  readonly nome: string;
  readonly lado: LadoDoCampo;
  readonly daVez: boolean;
  readonly vidaMaxima: number;
  readonly guardaMaxima: number;
}

const barra = (valor: number, maximo: number): string =>
  `${String(Math.max(0, Math.min(100, maximo <= 0 ? 0 : (valor / maximo) * 100)))}%`;

export const HudDeCombate = ({
  jogador,
  nome,
  lado,
  daVez,
  vidaMaxima,
  guardaMaxima,
}: HudDeCombateProps): React.JSX.Element => {
  const paleta = paletaDaClasse(jogador.classe);

  return (
    <section
      className={`hud hud--${lado}${daVez ? ' hud--da-vez' : ''}`}
      data-teste={`hud-${lado}`}
      style={{ ['--cor-da-classe' as string]: paleta.cssLuz }}
      aria-label={`${nome}, ${nomeDaClasse(jogador.classe)}`}
    >
      <header className="hud__identidade">
        <span className="hud__classe" data-teste={`classe-hud-${lado}`}>
          {nomeDaClasse(jogador.classe)}
        </span>
        <span className="hud__nome">{nome}</span>
        {daVez && <span className="hud__vez">NA VEZ</span>}
      </header>

      <div className="hud__vida">
        <span className="hud__vida-numero" aria-label={`Vida: ${String(jogador.vida)}`}>
          {jogador.vida}
        </span>
        <span className="hud__vida-barra" aria-hidden="true">
          <span
            className="hud__vida-preenchimento"
            style={{ inlineSize: barra(jogador.vida, vidaMaxima) }}
          />
        </span>
        <span className="hud__vida-rotulo">Vida</span>
      </div>

      <div className="hud__guarda">
        <span className="hud__guarda-numero" aria-label={`Guarda: ${String(jogador.guarda)}`}>
          {jogador.guarda}
        </span>
        <span className="hud__guarda-barra" aria-hidden="true">
          <span
            className="hud__guarda-preenchimento"
            style={{ inlineSize: barra(jogador.guarda, guardaMaxima) }}
          />
        </span>
        <span className="hud__guarda-rotulo">Guarda</span>
      </div>

      <dl className="hud__contadores">
        <div className="hud__contador">
          <dt>AP</dt>
          <dd data-teste={`ap-${lado}`}>{jogador.pontosDeAcao}</dd>
        </div>
        <div className="hud__contador">
          <dt>Reserva</dt>
          <dd>{jogador.reserva}</dd>
        </div>
        <div className="hud__contador">
          <dt>Ações</dt>
          <dd data-teste={`acoes-usadas-${lado}`}>
            {jogador.acoesRealizadasNoTurno}/{jogador.acoesPermitidasNoTurno}
          </dd>
        </div>
      </dl>

      <RecursoDaClasse recurso={jogador.recurso} guarda={jogador.guarda} />
    </section>
  );
};
