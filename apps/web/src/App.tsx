import { CARD_DATA_VERSION, CATALOGO, CLASSES } from '@arcane-duel/card-data';
import { COMPOSICAO_DA_BUILD, REGRAS_UNIVERSAIS, RULES_VERSION } from '@arcane-duel/rules-engine';
import { AssetProvider, MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';

import { AvisoDeOrientacao } from './components/AvisoDeOrientacao.js';
import { BotaoDeInstalacao } from './components/BotaoDeInstalacao.js';
import { BarraDeAtualizacao } from './components/BarraDeAtualizacao.js';
import { GradeDeAssets } from './components/GradeDeAssets.js';
import { useInventarioDeAssets } from './hooks/useInventarioDeAssets.js';
import { useModoDeExibicao } from './hooks/useModoDeExibicao.js';
import { useOrientacao } from './hooks/useOrientacao.js';

/**
 * Tela de fundação.
 *
 * Ela existe para provar que o cliente abre, que os assets aprovados carregam,
 * que a aplicação se comporta em landscape e que a estrutura está pronta para
 * receber o jogo. Ela não simula combate e não finge estado de partida.
 */
export const App = (): React.JSX.Element => {
  const orientacao = useOrientacao();
  const modo = useModoDeExibicao();
  const inventario = useInventarioDeAssets();

  return (
    <AssetProvider base={import.meta.env.BASE_URL}>
      <div className="app">
        <header className="cabecalho">
          <h1>Arcane Duel</h1>
          <span className="selo">fundação</span>
          <span className="selo selo--aviso">combate não implementado</span>
          <BotaoDeInstalacao />
        </header>

        <BarraDeAtualizacao />

        <div className="conteudo">
          <div className="coluna">
            <section className="painel">
              <h2>Versões</h2>
              <dl className="lista-de-dados">
                <dt>Regras</dt>
                <dd>
                  <code>{RULES_VERSION}</code>
                </dd>
                <dt>Catálogo</dt>
                <dd>
                  <code>{CARD_DATA_VERSION}</code>
                </dd>
                <dt>Cliente</dt>
                <dd>
                  <code>{__VERSAO_DO_CLIENTE__}</code>
                </dd>
                <dt>Commit</dt>
                <dd>
                  <code title={__COMMIT_DO_CLIENTE__}>{__COMMIT_DO_CLIENTE__.slice(0, 7)}</code>
                </dd>
              </dl>
            </section>

            <section className="painel">
              <h2>Conteúdo carregado</h2>
              <dl className="lista-de-dados">
                <dt>Classes</dt>
                <dd>{CLASSES.length}</dd>
                <dt>Cartas no catálogo</dt>
                <dd>{CATALOGO.todas.length}</dd>
                <dt>Assets declarados</dt>
                <dd>{MANIFESTO_DE_ASSETS.length}</dd>
                <dt>Assets carregados</dt>
                <dd>{inventario.carregados}</dd>
                <dt>Assets ausentes</dt>
                <dd>{inventario.ausentes}</dd>
              </dl>
            </section>

            <section className="painel">
              <h2>Regras universais</h2>
              <dl className="lista-de-dados">
                <dt>Vida</dt>
                <dd>{REGRAS_UNIVERSAIS.vidaInicial}</dd>
                <dt>Guarda</dt>
                <dd>{REGRAS_UNIVERSAIS.guardaInicial}</dd>
                <dt>Pontos de Ação</dt>
                <dd>{REGRAS_UNIVERSAIS.pontosDeAcaoPorTurno}</dd>
                <dt>Ações por turno</dt>
                <dd>{REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno}</dd>
                <dt>Reserva máxima</dt>
                <dd>{REGRAS_UNIVERSAIS.maximoDeReserva}</dd>
                <dt>Build equipada</dt>
                <dd>
                  {COMPOSICAO_DA_BUILD.habilidades}/{COMPOSICAO_DA_BUILD.passivas}/
                  {COMPOSICAO_DA_BUILD.cartasDeClasse}/{COMPOSICAO_DA_BUILD.ultimates}
                </dd>
              </dl>
            </section>

            <section className="painel">
              <h2>Ambiente</h2>
              <dl className="lista-de-dados">
                <dt>Orientação</dt>
                <dd>{orientacao}</dd>
                <dt>Exibição</dt>
                <dd>{modo === 'standalone' ? 'Aplicativo instalado' : 'Navegador'}</dd>
              </dl>
            </section>
          </div>

          <div className="coluna">
            <GradeDeAssets aoMudarEstado={inventario.registrar} />
          </div>
        </div>

        <footer className="rodape">
          Fundação do projeto. O motor de regras, o catálogo de cartas e a partida online entram nas
          etapas seguintes do roadmap.
        </footer>

        <AvisoDeOrientacao visivel={orientacao === 'portrait'} />
      </div>
    </AssetProvider>
  );
};
