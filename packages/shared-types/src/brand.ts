declare const marca: unique symbol;

/**
 * Cria um tipo nominal a partir de um tipo primitivo, impedindo que dois
 * identificadores diferentes sejam trocados por engano.
 */
export type Marcado<TBase, TMarca extends string> = TBase & {
  readonly [marca]: TMarca;
};
