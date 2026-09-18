/*
 * Substituto do módulo virtual do plugin de PWA durante os testes.
 *
 * Os testes de comportamento da atualização não passam por aqui: eles exercem
 * o coordenador diretamente, com portas injetadas. Este substituto só existe
 * para que a árvore de componentes renderize sem service worker.
 */

export interface OpcoesDeRegistro {
  readonly onRegisteredSW?: (url: string, registro?: ServiceWorkerRegistration) => void;
  readonly onRegisterError?: (erro: unknown) => void;
}

export interface RegistroDeTeste {
  needRefresh: [boolean, (valor: boolean) => void];
  offlineReady: [boolean, (valor: boolean) => void];
  updateServiceWorker: (recarregar?: boolean) => Promise<void>;
}

/*
 * Em jsdom não existe service worker: o registro acontece, mas sem objeto de
 * registro nenhum. O substituto avisa exatamente isso, e o coordenador então
 * não tem em quem pedir `update()` — que é o comportamento real do navegador
 * quando o worker não pôde ser registrado.
 */
export const useRegisterSW = (opcoes: OpcoesDeRegistro = {}): RegistroDeTeste => {
  opcoes.onRegisteredSW?.('sw.js', undefined);
  return {
    needRefresh: [false, () => undefined],
    offlineReady: [false, () => undefined],
    updateServiceWorker: () => Promise.resolve(),
  };
};
