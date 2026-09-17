import type {
  EstadoDeCartaDeClasse,
  EstadoDePassiva,
  EstadoDeUltimate,
  Resultado,
} from '@arcane-duel/shared-types';
import { falha, sucesso } from '@arcane-duel/shared-types';

export type ErroDeTransicao =
  | 'carta-nao-esta-pronta'
  | 'carta-ja-exaurida'
  | 'passiva-ainda-oculta'
  | 'passiva-ja-revelada'
  | 'passiva-nao-esta-pronta'
  | 'ultimate-ja-consumida';

type Transicao<T> = Resultado<T, ErroDeTransicao>;

/*
 * Ativar e Exaurir são coisas diferentes e este módulo é o único lugar do
 * motor que decide quando cada uma é legal (FULL_GAME_SPEC.md §12 e §13).
 *
 *   Ativar   — efeito renovável. Vale para Passiva e para Carta de Classe.
 *              A carta gira para a horizontal e volta a ficar Pronta depois.
 *   Exaurir  — exclusivo de Carta de Classe. Usa o efeito extremo e remove a
 *              carta da partida permanentemente. Passivas nunca são Exauridas.
 */

/** Ativa uma Carta de Classe: efeito renovável, carta girada para a horizontal. */
export const ativarCartaDeClasse = (
  estado: EstadoDeCartaDeClasse,
): Transicao<EstadoDeCartaDeClasse> => {
  if (estado === 'exaurida') return falha('carta-ja-exaurida');
  if (estado !== 'pronta') return falha('carta-nao-esta-pronta');
  return sucesso('ativada');
};

/**
 * Exaure uma Carta de Classe: efeito extremo e remoção permanente da partida.
 * Só é legal enquanto a carta está Pronta — uma carta Ativada precisa voltar a
 * ficar Pronta antes de poder ser Exaurida.
 */
export const exaurirCartaDeClasse = (
  estado: EstadoDeCartaDeClasse,
): Transicao<EstadoDeCartaDeClasse> => {
  if (estado === 'exaurida') return falha('carta-ja-exaurida');
  if (estado !== 'pronta') return falha('carta-nao-esta-pronta');
  return sucesso('exaurida');
};

/**
 * Devolve uma Carta de Classe Ativada ao estado Pronta no momento normal.
 * Nenhum efeito do jogo-base recupera uma Carta de Classe Exaurida, então uma
 * carta exaurida permanece exaurida.
 */
export const prontificarCartaDeClasse = (estado: EstadoDeCartaDeClasse): EstadoDeCartaDeClasse =>
  estado === 'exaurida' ? 'exaurida' : 'pronta';

/** Revela uma Passiva face-down. Depois de revelada, ela permanece face-up. */
export const revelarPassiva = (estado: EstadoDePassiva): Transicao<EstadoDePassiva> =>
  estado === 'oculta' ? sucesso('pronta') : falha('passiva-ja-revelada');

/** Ativa uma Passiva já revelada: efeito renovável, carta girada para a horizontal. */
export const ativarPassiva = (estado: EstadoDePassiva): Transicao<EstadoDePassiva> => {
  if (estado === 'oculta') return falha('passiva-ainda-oculta');
  if (estado !== 'pronta') return falha('passiva-nao-esta-pronta');
  return sucesso('ativada');
};

/** Devolve uma Passiva Ativada ao estado Pronta. Uma Passiva oculta continua oculta. */
export const prontificarPassiva = (estado: EstadoDePassiva): EstadoDePassiva =>
  estado === 'oculta' ? 'oculta' : 'pronta';

/** Consome a Ultimate. Ela só pode ser usada uma vez por partida. */
export const consumirUltimate = (estado: EstadoDeUltimate): Transicao<EstadoDeUltimate> =>
  estado === 'disponivel' ? sucesso('consumida') : falha('ultimate-ja-consumida');
