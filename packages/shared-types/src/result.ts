export interface Sucesso<T> {
  readonly ok: true;
  readonly valor: T;
}

export interface Falha<E> {
  readonly ok: false;
  readonly erro: E;
}

/** Resultado explícito, usado no lugar de exceções em código de regra. */
export type Resultado<T, E> = Sucesso<T> | Falha<E>;

export const sucesso = <T>(valor: T): Sucesso<T> => ({ ok: true, valor });
export const falha = <E>(erro: E): Falha<E> => ({ ok: false, erro });
