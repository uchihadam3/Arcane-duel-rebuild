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

/**
 * Quem pode conhecer a anotação.
 *
 * Quase toda anotação nasce de um texto que resolveu em público — "seu próximo
 * Ataque recebe +2 I" —, e quem assistiu à Ação já sabe dela. Essas são
 * `publica`, que é o padrão.
 *
 * `privada-do-dono` existe para o caso oposto: a anotação guarda informação de
 * zona secreta, como a carta que Preparar Emboscada reservou **face-down**. O
 * estado canônico precisa dela para funcionar; o adversário não pode recebê-la.
 * A projeção a remove inteira em vez de mascarar o conteúdo — não há campo
 * nenhum de onde o identificador vazar.
 */
export type VisibilidadeDaAnotacao = 'publica' | 'privada-do-dono';

export interface AnotacaoDeEfeito {
  /** Chave documentada pelo módulo de classe que a escreve. */
  readonly chave: string;
  /** Carta responsável pela anotação, para o log e para a interface. */
  readonly origem: CardId;
  readonly escopo: EscopoDaAnotacao;
  readonly valor: number;
  /**
   * Ausente quer dizer `publica`: a esmagadora maioria das anotações nasce de
   * texto que resolveu à vista de todos, e obrigar cada uma das centenas de
   * chamadas a repetir isso só esconderia as poucas que importam.
   */
  readonly visibilidade?: VisibilidadeDaAnotacao;
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

/** A anotação guarda informação que só o dono pode conhecer? */
export const anotacaoEhPrivada = (anotacao: AnotacaoDeEfeito): boolean =>
  anotacao.visibilidade === 'privada-do-dono';

/** Só as anotações que qualquer observador pode receber. */
export const anotacoesPublicas = (anotacoes: Anotacoes): Anotacoes =>
  anotacoes.filter((anotacao) => !anotacaoEhPrivada(anotacao));

/** Descarta as anotações cujo escopo terminou. */
export const expirarAnotacoes = (anotacoes: Anotacoes, escopo: EscopoDaAnotacao): Anotacoes =>
  anotacoes.filter((anotacao) => anotacao.escopo !== escopo);
