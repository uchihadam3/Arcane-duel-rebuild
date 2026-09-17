/** Substituto do módulo virtual do plugin de PWA durante os testes. */
export const useRegisterSW = (): {
  needRefresh: [boolean, (valor: boolean) => void];
  offlineReady: [boolean, (valor: boolean) => void];
  updateServiceWorker: (recarregar?: boolean) => Promise<void>;
} => ({
  needRefresh: [false, () => undefined],
  offlineReady: [false, () => undefined],
  updateServiceWorker: () => Promise.resolve(),
});
