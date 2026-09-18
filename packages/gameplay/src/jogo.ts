/*
 * A superfície que o cliente de partida usa.
 *
 * O barril `index.ts` carrega junto o simulador, a política headless e a
 * matriz 12 × 12 — ferramentas de verificação que não têm o que fazer dentro
 * do pacote da batalha. Este arquivo existe para que a interface importe o
 * jogo sem arrastar nada disso para o bundle do jogador.
 *
 * Ele não acrescenta comportamento nenhum: é só a fronteira de importação.
 */

export * from './partida.js';
export * from './interacao.js';
export * from './receitas.js';
export {
  defesaInataJaUsada,
  nomeDaDefesaInata,
  motivoParaNaoUsarDefesaInata,
} from './efeitos/mecanicas.js';
