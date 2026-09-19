import { useState } from 'react';
import { AssetProvider } from '@arcane-duel/ui';

import { AvisoDeOrientacao } from './components/AvisoDeOrientacao.js';
import { BarraDeAtualizacao } from './components/BarraDeAtualizacao.js';
import { useAtualizacaoDoCliente } from './hooks/useAtualizacaoDoCliente.js';
import { useOrientacao } from './hooks/useOrientacao.js';
import type { ClassId } from '@arcane-duel/shared-types';

import type { ConfiguracaoLocal as Configuracao } from './partida/controlador.js';
import { ProvedorDePreferencias } from './preferencias/preferencias.js';
import { DemoVisual } from './demo/DemoVisual.js';
import { EscolhaDaDemo } from './demo/EscolhaDaDemo.js';
import { ConfiguracaoLocal } from './telas/ConfiguracaoLocal.js';
import { MenuPrincipal } from './telas/MenuPrincipal.js';
import { PartidaLocal } from './telas/PartidaLocal.js';
import { TelaDeStatus } from './telas/TelaDeStatus.js';

/*
 * O fluxo do aplicativo.
 *
 * INÍCIO → JOGAR LOCAL → CONFIGURAÇÃO → PARTIDA → RESULTADO. A tela de status
 * continua acessível, mas deixou de ser a porta de entrada: quem abre o
 * aplicativo quer jogar.
 */

const COMMIT_CURTO = __COMMIT_DO_CLIENTE__.slice(0, 7);

type Tela =
  | { readonly nome: 'menu' }
  | { readonly nome: 'configuracao' }
  | { readonly nome: 'partida'; readonly configuracao: Configuracao; readonly semente: string }
  /*
   * A Demo Visual V2 corre em paralelo com a batalha principal, de propósito.
   *
   * Ela é um protótipo para aprovação: a linguagem nova precisa poder ser
   * comparada lado a lado com a atual, e substituir a batalha antes da
   * aprovação apagaria justamente a comparação.
   */
  | { readonly nome: 'escolha-da-demo' }
  | {
      readonly nome: 'demo';
      readonly classeDoHumano: ClassId;
      readonly classeDaIa: ClassId;
      readonly semente: string;
    }
  | { readonly nome: 'status' };

export const App = (): React.JSX.Element => {
  const orientacao = useOrientacao();
  const [tela, setTela] = useState<Tela>({ nome: 'menu' });

  // A partida só é "ativa" enquanto a batalha está no ar. É esta linha que
  // segura uma versão nova do cliente até o duelo acabar.
  const atualizacao = useAtualizacaoDoCliente(
    tela.nome === 'partida' || tela.nome === 'demo' ? 'partida-ativa' : 'sem-partida',
  );

  const textoDaAtualizacao =
    atualizacao.estado === 'aplicando'
      ? 'Atualizando para a versão mais recente…'
      : atualizacao.estado === 'pendente'
        ? 'Versão nova pronta, aguardando o fim da partida'
        : `Atualizado para o commit ${COMMIT_CURTO}`;

  return (
    <AssetProvider base={import.meta.env.BASE_URL}>
      <ProvedorDePreferencias>
        <div className={`raiz raiz--${tela.nome}`}>
          <BarraDeAtualizacao atualizacao={atualizacao} />

          {tela.nome === 'menu' && (
            <MenuPrincipal
              commitCurto={COMMIT_CURTO}
              aoJogarLocal={() => {
                setTela({ nome: 'configuracao' });
              }}
              aoAbrirDemo={() => {
                setTela({ nome: 'escolha-da-demo' });
              }}
              aoAbrirStatus={() => {
                setTela({ nome: 'status' });
              }}
            />
          )}

          {tela.nome === 'escolha-da-demo' && (
            <EscolhaDaDemo
              aoEscolher={(classeDoHumano, classeDaIa) => {
                setTela({
                  nome: 'demo',
                  classeDoHumano,
                  classeDaIa,
                  semente: `demo-${String(Date.now())}`,
                });
              }}
              aoVoltar={() => {
                setTela({ nome: 'menu' });
              }}
            />
          )}

          {tela.nome === 'demo' && (
            <DemoVisual
              classeDoHumano={tela.classeDoHumano}
              classeDaIa={tela.classeDaIa}
              semente={tela.semente}
              aoSair={() => {
                setTela({ nome: 'menu' });
              }}
            />
          )}

          {tela.nome === 'configuracao' && (
            <ConfiguracaoLocal
              aoVoltar={() => {
                setTela({ nome: 'menu' });
              }}
              aoComecar={(configuracao) => {
                setTela({ nome: 'partida', configuracao, semente: `local-${String(Date.now())}` });
              }}
            />
          )}

          {tela.nome === 'partida' && (
            <PartidaLocal
              configuracao={tela.configuracao}
              semente={tela.semente}
              aoSair={() => {
                setTela({ nome: 'menu' });
              }}
              aoRevanche={() => {
                // Revanche mantém as classes e pergunta de novo quem começa: o
                // documento não define alternância oficial, e a interface não a
                // inventa.
                setTela({ nome: 'configuracao' });
              }}
            />
          )}

          {tela.nome === 'status' && (
            <TelaDeStatus
              aoVoltar={() => {
                setTela({ nome: 'menu' });
              }}
              estadoDaAtualizacao={textoDaAtualizacao}
              aoVerificarAtualizacao={atualizacao.verificarAgora}
              aoForcarAtualizacao={atualizacao.aplicarAgora}
            />
          )}

          <AvisoDeOrientacao
            visivel={orientacao === 'portrait' && (tela.nome === 'partida' || tela.nome === 'demo')}
          />
        </div>
      </ProvedorDePreferencias>
    </AssetProvider>
  );
};
