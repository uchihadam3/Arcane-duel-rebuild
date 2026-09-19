/*
 * Existe WebGL aqui?
 *
 * Este módulo mora sozinho, e de propósito: ele é consultado **antes** de a
 * arena existir, e importá-lo não pode arrastar Three.js para o bundle do
 * menu. Quem entra no aplicativo para ver a tela de início não precisa baixar
 * a stack tridimensional inteira.
 */

export const webglDisponivel = (): boolean => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    // Alguns navegadores lançam em vez de devolver `null` quando o contexto
    // está bloqueado. Lançar aqui viraria tela branca.
    return false;
  }
};
