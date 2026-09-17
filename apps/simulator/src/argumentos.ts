/*
 * Leitura dos argumentos de linha de comando.
 *
 * Só o necessário: quantas partidas, qual semente e qual o teto técnico de
 * turnos. Nada aqui altera regra — o simulador mede o jogo, não o ajusta.
 */

export interface Argumentos {
  readonly partidas: number;
  readonly semente: string;
  readonly limiteDeTurnos: number;
  readonly formato: 'texto' | 'json';
  /**
   * Fração de decisões escolhidas ao acaso pela política.
   *
   * Zero é a linha de base: o PRNG só desempata. Um valor acima de zero serve
   * para medir distribuição e precisa ser pedido explicitamente.
   */
  readonly exploracao: number;
}

export const PADRAO: Argumentos = {
  partidas: 1000,
  semente: 'padrao',
  limiteDeTurnos: 60,
  formato: 'texto',
  exploracao: 0,
};

const inteiro = (valor: string | undefined, atual: number, nome: string): number => {
  if (valor === undefined) throw new Error(`${nome} precisa de um valor`);
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(`${nome} precisa de um inteiro positivo, recebido: ${valor}`);
  }
  return numero === 0 ? atual : numero;
};

export const lerArgumentos = (argumentos: readonly string[]): Argumentos => {
  let partidas = PADRAO.partidas;
  let semente = PADRAO.semente;
  let limiteDeTurnos = PADRAO.limiteDeTurnos;
  let formato = PADRAO.formato;
  let exploracao = PADRAO.exploracao;

  for (let indice = 0; indice < argumentos.length; indice += 1) {
    const atual = argumentos[indice];
    const proximo = argumentos[indice + 1];

    if (atual === '--games' || atual === '--partidas') {
      partidas = inteiro(proximo, partidas, atual);
      indice += 1;
    } else if (atual === '--seed' || atual === '--semente') {
      if (proximo === undefined) throw new Error(`${atual} precisa de um valor`);
      semente = proximo;
      indice += 1;
    } else if (atual === '--max-turns' || atual === '--limite-de-turnos') {
      limiteDeTurnos = inteiro(proximo, limiteDeTurnos, atual);
      indice += 1;
    } else if (atual === '--exploration' || atual === '--exploracao') {
      if (proximo === undefined) throw new Error(`${atual} precisa de um valor`);
      const fracao = Number.parseFloat(proximo);
      if (!Number.isFinite(fracao) || fracao < 0 || fracao > 1) {
        throw new Error(`${atual} precisa de uma fração entre 0 e 1, recebido: ${proximo}`);
      }
      exploracao = fracao;
      indice += 1;
    } else if (atual === '--json') {
      formato = 'json';
    } else if (atual?.startsWith('--') === true) {
      throw new Error(`argumento desconhecido: ${atual}`);
    }
  }

  return { partidas, semente, limiteDeTurnos, formato, exploracao };
};
