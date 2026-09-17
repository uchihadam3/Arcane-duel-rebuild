import type { CardId } from './ids.js';

/*
 * Anotações de efeito.
 *
 * Muita carta cria um estado temporário que não cabe em nenhum campo fixo do
 * jogador: "seu próximo Ataque neste turno recebe +2 I", "uma vez por turno
 * inimigo", "a primeira vez por turno que isso ocorrer". Em vez de inventar um
 * campo por carta, o estado guarda anotações.
 *
 * A **forma** da anotação mora aqui, junto com o resto do contrato de estado; o
 * **vocabulário** de chaves mora na camada que conhece as cartas. Assim o tipo
 * do estado não precisa aprender o catálogo, e nenhuma chave vira texto solto
 * sem dono: cada módulo de classe declara as suas.
 */

/**
 * Até quando a anotação sobrevive.
 *
 * - `acao`: some quando a Ação em que foi criada resolve;
 * - `turno`: some no início de qualquer turno, próprio ou inimigo — é o que
 *   sustenta tanto "uma vez por turno" quanto "uma vez por turno inimigo";
 * - `partida`: nunca some.
 */
export type EscopoDaAnotacao = 'acao' | 'turno' | 'partida';

export interface AnotacaoDeEfeito {
  /** Chave documentada pelo módulo de classe que a escreve. */
  readonly chave: string;
  /** Carta responsável pela anotação, para o log e para a interface. */
  readonly origem: CardId;
  readonly escopo: EscopoDaAnotacao;
  readonly valor: number;
}

export type Anotacoes = readonly AnotacaoDeEfeito[];

export const valorDaAnotacao = (anotacoes: Anotacoes, chave: string): number => {
  let total = 0;
  for (const anotacao of anotacoes) {
    if (anotacao.chave === chave) total += anotacao.valor;
  }
  return total;
};

export const temAnotacao = (anotacoes: Anotacoes, chave: string): boolean =>
  anotacoes.some((anotacao) => anotacao.chave === chave);

export const comAnotacao = (anotacoes: Anotacoes, nova: AnotacaoDeEfeito): Anotacoes => [
  ...anotacoes,
  nova,
];

export const semAnotacoesDaChave = (anotacoes: Anotacoes, chave: string): Anotacoes =>
  anotacoes.filter((anotacao) => anotacao.chave !== chave);

/** Descarta as anotações cujo escopo terminou. */
export const expirarAnotacoes = (anotacoes: Anotacoes, escopo: EscopoDaAnotacao): Anotacoes =>
  anotacoes.filter((anotacao) => anotacao.escopo !== escopo);
