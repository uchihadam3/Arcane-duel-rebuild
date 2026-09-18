/*
 * As rotas do service worker, montadas no build.
 *
 * Elas moram aqui, e não dentro de `vite.config.ts`, por um motivo concreto: o
 * Workbox **serializa** o que recebe em `urlPattern`. Se for função, ele
 * serializa só o corpo — o fechamento léxico fica para trás. Uma função que
 * lia o prefixo de publicação da configuração chegou ao `sw.js` publicado
 * apontando para um identificador que não existe no escopo do worker, e
 * lançava ReferenceError em todo pedido que chegasse até a rota.
 *
 * Uma expressão regular não tem esse problema: ela é serializada como literal,
 * com o valor já dentro. Construí-la aqui deixa a regra testável sem precisar
 * carregar o Vite inteiro.
 */

/** Escapa um trecho literal para uso dentro de uma expressão regular. */
export const comoRegex = (valor: string): string => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A rota dos assets aprovados, para o cache de execução.
 *
 * Sem âncora, de propósito. O Workbox testa este padrão contra a URL inteira
 * (`url.href`) e só aceita um casamento de outra origem quando ele começa na
 * posição zero. Sem `^`, o padrão casa no meio do href da própria origem — e
 * **não** casa no começo do de terceiros, que é exatamente a regra desejada.
 * Com `^` ele não casaria com nada, porque todo href começa com o esquema.
 */
export const rotaDosAssets = (prefixo: string): RegExp =>
  new RegExp(`${comoRegex(prefixo)}assets/`);

/**
 * O que a navegação **não** pode servir do documento do aplicativo.
 *
 * Diferente de `urlPattern`, a lista de exceções da navegação é testada contra
 * o caminho, então aqui a âncora vale e é necessária.
 */
export const excecoesDaNavegacao = (prefixo: string): readonly RegExp[] => [
  new RegExp(`^${comoRegex(prefixo)}assets/`),
  /^\/api\//,
  /^\/auth\//,
  /^\/socket/,
];

/**
 * Os caminhos que nunca viram conteúdo estático.
 *
 * Esta é a lista canônica, mas ela **não** pode ser chamada de dentro do
 * `urlPattern`: um ajudante referenciado por uma função serializada fica livre
 * no worker, que é o defeito descrito acima. A configuração repete os caminhos
 * com literais, e o teste confere que as duas não divergem.
 */
export const CAMINHOS_SO_DE_REDE = ['/api/', '/auth/', '/socket'] as const;
