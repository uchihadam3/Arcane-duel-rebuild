import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import type { EstadoDaAtualizacao } from '../pwa/atualizacao.js';
import { criarCoordenadorDeAtualizacao } from '../pwa/atualizacao.js';
import { situacaoAtualDoCliente } from '../pwa/politica-de-atualizacao.js';

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
}

export const useAtualizacaoDoCliente = (): AtualizacaoDoCliente => {
  const [estado, setEstado] = useState<EstadoDaAtualizacao>('em-dia');
  const registro = useRef<ServiceWorkerRegistration | null>(null);

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
      situacaoDoCliente: situacaoAtualDoCliente,
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

  useEffect(() => {
    if (precisaAtualizar) coordenador.current.aoEncontrarAtualizacao();
  }, [precisaAtualizar]);

  return {
    estado,
    aplicarAgora: () => {
      coordenador.current.aplicarAgora();
    },
  };
};
