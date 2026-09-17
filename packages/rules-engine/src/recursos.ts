import type { EstadoDeJogador, RecursoDeCusto } from '@arcane-duel/shared-types';

/*
 * Leitura e escrita do componente próprio de classe.
 *
 * O recurso é uma união discriminada por classe: o Momentum do Guerreiro e a
 * Mana do Mago não são o mesmo campo com outro nome. Estas funções são a única
 * ponte entre o custo impresso — que fala "1 Mana", "3 Momentum" — e o campo
 * certo do jogador certo, e recusam quando a classe não tem aquele recurso.
 */

/** Limites documentados de cada recurso (CARD_CATALOG.md, seções de mecânica). */
export const LIMITES_DE_RECURSO: Readonly<
  Record<RecursoDeCusto, { readonly minimo: number; readonly maximo: number }>
> = {
  mana: { minimo: 0, maximo: 6 },
  momentum: { minimo: 0, maximo: 3 },
};

/** Quanto o jogador tem, ou `null` quando a classe dele não usa esse recurso. */
export const valorDoRecurso = (
  jogador: EstadoDeJogador,
  recurso: RecursoDeCusto,
): number | null => {
  const atual = jogador.recurso;
  if (recurso === 'mana') return atual.classe === 'mago' ? atual.mana : null;
  return atual.classe === 'guerreiro' ? atual.momentum : null;
};

const limitar = (recurso: RecursoDeCusto, valor: number): number => {
  const limite = LIMITES_DE_RECURSO[recurso];
  if (valor < limite.minimo) return limite.minimo;
  return valor > limite.maximo ? limite.maximo : valor;
};

/**
 * Grava um novo valor de recurso, respeitando o teto e o piso impressos.
 *
 * Quando a classe não usa o recurso, o jogador volta inalterado: quem precisa
 * recusar a jogada já recusou antes, no pagamento do custo.
 */
export const definirRecurso = (
  jogador: EstadoDeJogador,
  recurso: RecursoDeCusto,
  valor: number,
): EstadoDeJogador => {
  const atual = jogador.recurso;
  const limitado = limitar(recurso, valor);
  if (recurso === 'mana' && atual.classe === 'mago') {
    return { ...jogador, recurso: { ...atual, mana: limitado } };
  }
  if (recurso === 'momentum' && atual.classe === 'guerreiro') {
    return { ...jogador, recurso: { ...atual, momentum: limitado } };
  }
  return jogador;
};

/** Soma (ou subtrai, com valor negativo) respeitando teto e piso. */
export const somarRecurso = (
  jogador: EstadoDeJogador,
  recurso: RecursoDeCusto,
  delta: number,
): EstadoDeJogador => {
  const atual = valorDoRecurso(jogador, recurso);
  return atual === null ? jogador : definirRecurso(jogador, recurso, atual + delta);
};

/** O recurso próprio da classe, quando ela tem um que serve de custo. */
export const recursoDaClasse = (jogador: EstadoDeJogador): RecursoDeCusto | null => {
  if (jogador.recurso.classe === 'mago') return 'mana';
  return jogador.recurso.classe === 'guerreiro' ? 'momentum' : null;
};
