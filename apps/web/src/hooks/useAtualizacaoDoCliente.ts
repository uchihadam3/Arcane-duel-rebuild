import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import type { EstadoDaAtualizacao } from '../pwa/atualizacao.js';
import { criarCoordenadorDeAtualizacao } from '../pwa/atualizacao.js';
import type { SituacaoDoCliente } from '../pwa/politica-de-atualizacao.js';

/*
 * A ponte entre o service worker e o coordenador de atualização.
 *
 * Toda a decisão mora em `pwa/atualizacao.ts` e em `pwa/politica-de-atualizacao.ts`,
 * que não conhecem React nem navegador. Aqui só acontece o encanamento: pegar
 * o registro do worker, pedir `update()` quando o coordenador mandar, e
 * chamar a troca com recarga quando ele decidir aplicar.
 */

export interface AtualizacaoDoCliente {
  readonly estado: EstadoDaAtualizacao;
  /** Botão de emergência: existe para o caso de a troca automática falhar. */
  readonly aplicarAgora: () => void;
  /** Pergunta por uma versão nova fora dos gatilhos automáticos. */
  readonly verificarAgora: () => void;
}

export const useAtualizacaoDoCliente = (
  situacao: SituacaoDoCliente = 'sem-partida',
): AtualizacaoDoCliente => {
  const [estado, setEstado] = useState<EstadoDaAtualizacao>('em-dia');
  const registro = useRef<ServiceWorkerRegistration | null>(null);
  /*
   * A situação é lida por referência, e não capturada.
   *
   * O coordenador é criado uma vez e vive a sessão inteira; se ele guardasse
   * o valor de agora, a partida que começa depois nunca seguraria uma
   * atualização. A caixa abaixo é o que mantém a leitura sempre atual.
   */
  const situacaoAtual = useRef<SituacaoDoCliente>(situacao);
  situacaoAtual.current = situacao;

  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, registrado) => {
      registro.current = registrado ?? null;
    },
  });

  const coordenador = useRef(
    criarCoordenadorDeAtualizacao({
      // `update()` é o que faz o navegador buscar o sw.js novo. Sem ele, o
      // aplicativo instalado só descobriria a versão nova em um reinício.
      verificar: async () => {
        await registro.current?.update();
      },
      // `true` ativa o worker em espera e recarrega no build novo. É isto que
      // dispensa reinstalar o aplicativo.
      aplicar: async () => {
        await updateServiceWorker(true);
      },
      // Quando o worker já assumiu sozinho não há o que ativar: falta só a
      // página buscar a versão que ele já está servindo.
      recarregar: () => {
        window.location.reload();
      },
      situacaoDoCliente: () => situacaoAtual.current,
      aoMudarEstado: setEstado,
      janela: window,
      documento: document,
      agendar: (callback, intervalo) => {
        const id = window.setInterval(callback, intervalo);
        return () => {
          window.clearInterval(id);
        };
      },
    }),
  );

  useEffect(() => coordenador.current.iniciar(), []);

  /*
   * A partida acabou e havia uma versão esperando? Aplica agora.
   *
   * Sem isto a atualização ficaria pendente até a próxima verificação
   * periódica — o jogador voltaria ao menu e continuaria na build velha.
   */
  useEffect(() => {
    if (situacao === 'sem-partida') coordenador.current.aplicarPendente();
  }, [situacao]);

  useEffect(() => {
    if (precisaAtualizar) coordenador.current.aoEncontrarAtualizacao();
  }, [precisaAtualizar]);

  /*
   * O worker novo assumiu o controle desta página.
   *
   * Com `skipWaiting` a ativação acontece sem pedir licença, então este é o
   * aviso que chega primeiro — antes, e às vezes em vez, de `needRefresh`. Sem
   * escutá-lo, a página continuaria mostrando a build antiga até alguém fechar
   * e reabrir o aplicativo.
   *
   * Com uma ressalva, e ela custou uma recarga em toda primeira visita: quando
   * a página abre **sem** controlador, o `clientsClaim` da primeira instalação
   * dispara este mesmo evento. Ali não há build antiga para trocar — o
   * documento acabou de vir da rede, já na versão nova — e recarregar só faz o
   * aplicativo piscar e jogar fora a tela em que a pessoa estava.
   *
   * A verificação em navegador pegou isto: a tela de configuração sumia
   * sozinha um segundo depois de abrir.
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const jaTinhaControlador = navigator.serviceWorker.controller !== null;
    const aoTrocar = (): void => {
      if (!jaTinhaControlador) return;
      coordenador.current.aoTrocarDeControlador();
    };
    navigator.serviceWorker.addEventListener('controllerchange', aoTrocar);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', aoTrocar);
    };
  }, []);

  return {
    estado,
    aplicarAgora: () => {
      coordenador.current.aplicarAgora();
    },
    verificarAgora: () => {
      coordenador.current.verificarAgora();
    },
  };
};
