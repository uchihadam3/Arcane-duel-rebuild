import type { CardId, EstadoDeCooldown, EstadoDeJogador } from '@arcane-duel/shared-types';

/*
 * Cooldown.
 *
 * A zona física É o cooldown: não existe contador adicional (§11). No início
 * do turno do dono, CD1 volta para a mão, CD2 passa para CD1 e CD3 para CD2.
 * Várias cartas podem dividir a mesma zona.
 */

export interface AvancoDeCooldown {
  readonly cooldown: EstadoDeCooldown;
  readonly paraAMao: readonly CardId[];
}

/**
 * Avança as três zonas de uma vez.
 *
 * O avanço é calculado a partir do estado anterior inteiro, e não zona a zona
 * em sequência: fosse em sequência, uma carta de CD3 poderia atravessar até a
 * mão no mesmo turno.
 */
export const avancarCooldown = (anterior: EstadoDeCooldown): AvancoDeCooldown => ({
  cooldown: { 1: [...anterior[2]], 2: [...anterior[3]], 3: [] },
  paraAMao: [...anterior[1]],
});

/** Coloca uma habilidade usada na zona de cooldown impressa nela. */
export const enviarParaCooldown = (
  jogador: EstadoDeJogador,
  carta: CardId,
  zona: 1 | 2 | 3,
): EstadoDeJogador => ({
  ...jogador,
  cooldown: { ...jogador.cooldown, [zona]: [...jogador.cooldown[zona], carta] },
});
