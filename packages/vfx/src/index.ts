/*
 * Efeitos visuais: ritmo, vocabulário e fila.
 *
 * O pacote é puro de propósito — nem React, nem DOM, nem Three.js entram aqui.
 * Quem desenha é `apps/web`; o que este pacote define é **quando** e **o que**,
 * de forma que o mesmo roteiro sirva à arena tridimensional e ao campo em DOM
 * que sobra quando o WebGL falha.
 */

export * from './ritmo.js';
export * from './momentos.js';
export * from './fila.js';
