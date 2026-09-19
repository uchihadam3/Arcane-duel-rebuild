import { CARD_DATA_VERSION, CATALOGO, CLASSES_IMPLEMENTADAS } from '@arcane-duel/card-data';
// Caminho direto de propósito: o barril de `gameplay` traz o registro de
// efeitos das doze classes junto, e o cliente só precisa das Receitas.
import { RECEITAS_INICIAIS } from '@arcane-duel/gameplay/receitas';
import { COMPOSICAO_DA_BUILD, REGRAS_UNIVERSAIS, RULES_VERSION } from '@arcane-duel/rules-engine';
import { MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';

import { BotaoDeJogo } from '@arcane-duel/ui';

import { BotaoDeInstalacao } from '../components/BotaoDeInstalacao.js';
import { GradeDeAssets } from '../components/GradeDeAssets.js';
import { useInventarioDeAssets } from '../hooks/useInventarioDeAssets.js';
import { useModoDeExibicao } from '../hooks/useModoDeExibicao.js';
import { useOrientacao } from '../hooks/useOrientacao.js';

/*
 * A tela de status do desenvolvimento.
 *
 * Ela **não** é mais a home: a home é o menu, e o jogo começa por lá. Esta
 * tela continua existindo porque responde uma pergunta que nenhuma outra
 * responde — olhando o aplicativo instalado, qual build está no ar.
 */

const COMMIT_CURTO = __COMMIT_DO_CLIENTE__.slice(0, 7);

/** O que está entregue até aqui, em uma linha cada. */
const ENTREGUE: readonly string[] = [
  'Motor de combate universal ativo',
  'Partida local jogável do início ao fim',
  'Arena tridimensional com câmera fixa',
  'Apresentação, VFX e áudio de Guerreiro × Mago',
  'Privacidade hot-seat pela projeção',
  'Simulador headless e matriz 12 × 12 disponíveis',
];

export interface TelaDeStatusProps {
  readonly aoVoltar: () => void;
  readonly estadoDaAtualizacao: string;
  readonly aoVerificarAtualizacao: () => void;
  readonly aoForcarAtualizacao: () => void;
}

export const TelaDeStatus = ({
  aoVoltar,
  estadoDaAtualizacao,
  aoVerificarAtualizacao,
  aoForcarAtualizacao,
}: TelaDeStatusProps): React.JSX.Element => {
  const orientacao = useOrientacao();
  const modo = useModoDeExibicao();
  const inventario = useInventarioDeAssets();

  const instalado = modo === 'standalone';

  return (
    <div className="app">
      <header className="cabecalho">
        <h1>Arcane Duel</h1>
        <span className="selo">Etapa 6 concluída</span>
        <span className="selo">vertical slice Guerreiro × Mago</span>
        <BotaoDeInstalacao />
        <BotaoDeJogo tom="discreto" aoTocar={aoVoltar} dadoDeTeste="voltar-do-status">
          Voltar
        </BotaoDeJogo>
      </header>

      <div className="conteudo">
        <div className="coluna">
          <section className="painel">
            <h2>Status</h2>
            <dl className="lista-de-dados">
              <dt>Motor</dt>
              <dd>Combate implementado</dd>
              <dt>Etapa atual</dt>
              <dd>Etapa 6 concluída — vertical slice Guerreiro × Mago</dd>
              <dt>Interface de partida</dt>
              <dd>Partida local completa, do menu à tela de vitória</dd>
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
              <dd data-teste="estado-da-atualizacao">{estadoDaAtualizacao}</dd>
              <dt>Forçar</dt>
              <dd className="acoes-da-atualizacao">
                <BotaoDeJogo
                  tom="secundario"
                  aoTocar={aoVerificarAtualizacao}
                  dadoDeTeste="verificar-atualizacao"
                >
                  Buscar versão nova
                </BotaoDeJogo>
                <BotaoDeJogo
                  tom="secundario"
                  aoTocar={aoForcarAtualizacao}
                  dadoDeTeste="forcar-atualizacao"
                >
                  Aplicar agora
                </BotaoDeJogo>
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
        O motor de regras, o catálogo das doze classes e o protótipo local jogável já existem e são
        cobertos por testes. A aparência final, a partida online e o Desafio de IA entram nas etapas
        seguintes do roadmap.
      </footer>
    </div>
  );
};
