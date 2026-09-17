import { afterEach } from 'vitest';

/**
 * jsdom não implementa `matchMedia`, e a interface usa essa API para saber a
 * orientação e o modo de exibição. O substituto responde "landscape, no
 * navegador", que é o cenário padrão dos testes.
 */
const criarMediaQueryList = (consulta: string): MediaQueryList => ({
  matches: false,
  media: consulta,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
});

if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: criarMediaQueryList,
    });
  }

  // Sem `globals: true`, a limpeza automática da Testing Library não é
  // registrada; sem ela o DOM de um teste vaza para o seguinte.
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);
}
