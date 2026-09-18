import { useState } from 'react';
import { AssetProvider } from '@arcane-duel/ui';

import { AvisoDeOrientacao } from './components/AvisoDeOrientacao.js';
import { BarraDeAtualizacao } from './components/BarraDeAtualizacao.js';
import { useAtualizacaoDoCliente } from './hooks/useAtualizacaoDoCliente.js';
import { useOrientacao } from './hooks/useOrientacao.js';
import type { ConfiguracaoLocal as Configuracao } from './partida/controlador.js';
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
  | { readonly nome: 'status' };

export const App = (): React.JSX.Element => {
  const orientacao = useOrientacao();
  const [tela, setTela] = useState<Tela>({ nome: 'menu' });

  // A partida só é "ativa" enquanto a batalha está no ar. É esta linha que
  // segura uma versão nova do cliente até o duelo acabar.
  const atualizacao = useAtualizacaoDoCliente(
    tela.nome === 'partida' ? 'partida-ativa' : 'sem-partida',
  );

  const textoDaAtualizacao =
    atualizacao.estado === 'aplicando'
      ? 'Atualizando para a versão mais recente…'
      : atualizacao.estado === 'pendente'
        ? 'Versão nova pronta, aguardando o fim da partida'
        : `Atualizado para o commit ${COMMIT_CURTO}`;

  return (
    <AssetProvider base={import.meta.env.BASE_URL}>
      <div className={`raiz raiz--${tela.nome}`}>
        <BarraDeAtualizacao atualizacao={atualizacao} />

        {tela.nome === 'menu' && (
          <MenuPrincipal
            commitCurto={COMMIT_CURTO}
            aoJogarLocal={() => {
              setTela({ nome: 'configuracao' });
            }}
            aoAbrirStatus={() => {
              setTela({ nome: 'status' });
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
          />
        )}

        <AvisoDeOrientacao visivel={orientacao === 'portrait' && tela.nome === 'partida'} />
      </div>
    </AssetProvider>
  );
};
