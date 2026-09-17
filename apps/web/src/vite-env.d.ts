/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** Versão do cliente, injetada pelo Vite a partir do package.json. */
declare const __VERSAO_DO_CLIENTE__: string;

/** Commit que originou este build, injetado pelo Vite. */
declare const __COMMIT_DO_CLIENTE__: string;

interface Navigator {
  /** Safari no iOS usa esta propriedade em vez de `display-mode: standalone`. */
  readonly standalone?: boolean;
}
