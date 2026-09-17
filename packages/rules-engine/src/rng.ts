/**
 * Gerador pseudoaleatório determinístico.
 *
 * O combate do Arcane Duel não possui aleatoriedade: não há compra de cartas,
 * dano variável, crítico ou esquiva. Este gerador existe apenas para o que o
 * documento permite sortear fora do combate — a ordem dos doze adversários de
 * uma campanha e a escolha de Receita da IA (FULL_GAME_SPEC.md §17).
 *
 * A mesma semente sempre produz a mesma sequência, o que torna uma partida
 * reproduzível a partir do seu `replay_seed`.
 */
export interface Aleatorio {
  /** Próximo número no intervalo [0, 1). */
  readonly proximo: () => number;
  /** Inteiro em [0, limiteExclusivo). */
  readonly inteiro: (limiteExclusivo: number) => number;
  /** Nova lista embaralhada; a lista original não é modificada. */
  readonly embaralhar: <T>(itens: readonly T[]) => T[];
}

const converterSementeParaInteiro = (semente: string): number => {
  let hash = 0x811c9dc5;
  for (let indice = 0; indice < semente.length; indice += 1) {
    hash ^= semente.charCodeAt(indice);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const criarAleatorio = (semente: string): Aleatorio => {
  let estado = converterSementeParaInteiro(semente);

  const proximo = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let valor = estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };

  const inteiro = (limiteExclusivo: number): number => {
    if (!Number.isInteger(limiteExclusivo) || limiteExclusivo <= 0) {
      throw new RangeError(
        `limiteExclusivo precisa ser um inteiro positivo: ${String(limiteExclusivo)}`,
      );
    }
    return Math.floor(proximo() * limiteExclusivo);
  };

  const embaralhar = <T>(itens: readonly T[]): T[] => {
    const copia = [...itens];
    for (let indice = copia.length - 1; indice > 0; indice -= 1) {
      const destino = inteiro(indice + 1);
      const atual = copia[indice] as T;
      copia[indice] = copia[destino] as T;
      copia[destino] = atual;
    }
    return copia;
  };

  return { proximo, inteiro, embaralhar };
};
