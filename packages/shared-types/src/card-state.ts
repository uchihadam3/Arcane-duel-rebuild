/**
 * Estados de uma Carta de Classe.
 *
 * `ativada` é o efeito renovável (carta girada para a horizontal); ela volta a
 * ficar `pronta` no momento normal. `exaurida` é o efeito extremo: a carta sai
 * da partida permanentemente e nada no jogo-base a recupera.
 */
export type EstadoDeCartaDeClasse = 'pronta' | 'ativada' | 'exaurida';

/**
 * Estados de uma Passiva.
 *
 * Passivas começam `oculta` (face-down) e, depois de reveladas, alternam entre
 * `pronta` e `ativada`. Passivas NUNCA são Exauridas — por isso este tipo não
 * possui e não pode possuir o estado `exaurida`.
 */
export type EstadoDePassiva = 'oculta' | 'pronta' | 'ativada';

/** Estado da Ultimate: uma única utilização por partida (FULL_GAME_SPEC.md §14). */
export type EstadoDeUltimate = 'disponivel' | 'consumida';
