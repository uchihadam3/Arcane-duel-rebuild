import { CARD_DATA_VERSION, CATALOGO, CLASSES_IMPLEMENTADAS } from '@arcane-duel/card-data';
import { RECEITAS_INICIAIS } from '@arcane-duel/gameplay';
import { COMPOSICAO_DA_BUILD, REGRAS_UNIVERSAIS, RULES_VERSION } from '@arcane-duel/rules-engine';
import { AssetProvider, MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';

import { AvisoDeOrientacao } from './components/AvisoDeOrientacao.js';
import { BotaoDeInstalacao } from './components/BotaoDeInstalacao.js';
import { BarraDeAtualizacao } from './components/BarraDeAtualizacao.js';
import { GradeDeAssets } from './components/GradeDeAssets.js';
import { useAtualizacaoDoCliente } from './hooks/useAtualizacaoDoCliente.js';
import { useInventarioDeAssets } from './hooks/useInventarioDeAssets.js';
import { useModoDeExibicao } from './hooks/useModoDeExibicao.js';
import { useOrientacao } from './hooks/useOrientacao.js';

/**
 * Tela de status do desenvolvimento.
 *
 * Ela não é o jogo: é o painel que diz, olhando o aplicativo instalado, qual
 * build está no ar e o que já existe por baixo dele. Enquanto a interface
 * jogável não existir, é esta tela que responde "o app atualizou?".
 */

const COMMIT_CURTO = __COMMIT_DO_CLIENTE__.slice(0, 7);

/** O que a Etapa 4 entregou, em uma linha cada. */
const ENTREGUE: readonly string[] = [
  'Motor de combate universal ativo',
  'Simulador headless ativo',
  'Matriz 12 × 12 disponível',
  'Invariantes de estado e de transição conferidas',
];

export const App = (): React.JSX.Element => {
  const orientacao = useOrientacao();
  const modo = useModoDeExibicao();
  const inventario = useInventarioDeAssets();
  const atualizacao = useAtualizacaoDoCliente();

  const instalado = modo === 'standalone';

  return (
    <AssetProvider base={import.meta.env.BASE_URL}>
      <div className="app">
        <header className="cabecalho">
          <h1>Arcane Duel</h1>
          <span className="selo">motor de combate implementado</span>
          <span className="selo selo--aviso">interface jogável ainda não implementada</span>
          <BotaoDeInstalacao />
        </header>

        <BarraDeAtualizacao atualizacao={atualizacao} />

        <div className="conteudo">
          <div className="coluna">
            <section className="painel">
              <h2>Status</h2>
              <dl className="lista-de-dados">
                <dt>Motor</dt>
                <dd>Combate implementado</dd>
                <dt>Etapa atual</dt>
                <dd>Etapa 4 concluída — aguardando a próxima etapa</dd>
                <dt>Interface de partida</dt>
                <dd>Ainda não implementada</dd>
              </dl>
              <ul className="lista-simples">
                {ENTREGUE.map((linha) => (
                  <li key={linha}>{linha}</li>
                ))}
              </ul>
            </section>

            <section className="painel">
              <h2>Conteúdo carregado</h2>
              <dl className="lista-de-dados">
                <dt>Classes</dt>
                <dd>{CLASSES_IMPLEMENTADAS.length}</dd>
                <dt>Cartas no catálogo</dt>
                <dd>{CATALOGO.todas.length}</dd>
                <dt>Receitas iniciais</dt>
                <dd>{Object.keys(RECEITAS_INICIAIS).length}</dd>
                <dt>Assets declarados</dt>
                <dd>{MANIFESTO_DE_ASSETS.length}</dd>
                <dt>Assets carregados</dt>
                <dd>{inventario.carregados}</dd>
                <dt>Assets ausentes</dt>
                <dd>{inventario.ausentes}</dd>
              </dl>
            </section>

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
                <dt>Build</dt>
                <dd>
                  <code data-teste="build">{__BUILD_DO_CLIENTE__}</code>
                </dd>
                <dt>Commit</dt>
                <dd>
                  <code data-teste="commit" title={__COMMIT_DO_CLIENTE__}>
                    {COMMIT_CURTO}
                  </code>
                </dd>
              </dl>
            </section>

            <section className="painel">
              <h2>Aplicativo</h2>
              <dl className="lista-de-dados">
                <dt>Instalação</dt>
                <dd>{instalado ? 'Instalado' : 'Navegador'}</dd>
                <dt>Atualização</dt>
                <dd data-teste="estado-da-atualizacao">
                  {atualizacao.estado === 'aplicando'
                    ? 'Atualizando para a versão mais recente…'
                    : atualizacao.estado === 'pendente'
                      ? 'Versão nova pronta, aguardando momento seguro'
                      : `Atualizado para o commit ${COMMIT_CURTO}`}
                </dd>
                <dt>Orientação</dt>
                <dd>{orientacao}</dd>
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
          </div>

          <div className="coluna">
            <GradeDeAssets aoMudarEstado={inventario.registrar} />
          </div>
        </div>

        <footer className="rodape">
          O motor de regras e o catálogo das doze classes já existem e são cobertos por testes. A
          interface jogável, a partida online e o Desafio de IA entram nas etapas seguintes do
          roadmap.
        </footer>

        <AvisoDeOrientacao visivel={orientacao === 'portrait'} />
      </div>
    </AssetProvider>
  );
};
