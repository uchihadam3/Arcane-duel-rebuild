import { describe, expect, it } from 'vitest';

import { chaveDaAncora, criarRegistroDeAncoras } from './ancoras.js';

describe('registro de âncoras', () => {
  it('distingue os dois lados do campo', () => {
    expect(chaveDaAncora({ lado: 'proprio', zona: 'acao', indice: 0 })).not.toBe(
      chaveDaAncora({ lado: 'adversario', zona: 'acao', indice: 0 }),
    );
  });

  it('distingue zonas repetidas pelo índice', () => {
    const chaves = [0, 1, 2].map((indice) =>
      chaveDaAncora({ lado: 'proprio', zona: 'acao', indice }),
    );
    expect(new Set(chaves).size).toBe(3);
  });

  it('trata âncora sem índice como índice zero', () => {
    expect(chaveDaAncora({ lado: 'proprio', zona: 'personagem' })).toBe(
      chaveDaAncora({ lado: 'proprio', zona: 'personagem', indice: 0 }),
    );
  });

  it('devolve o ponto registrado', () => {
    const registro = criarRegistroDeAncoras();
    registro.registrar({ lado: 'proprio', zona: 'acao', indice: 1 }, { x: 0.5, y: 0.62 });
    expect(registro.obter({ lado: 'proprio', zona: 'acao', indice: 1 })).toEqual({
      x: 0.5,
      y: 0.62,
    });
  });

  it('devolve undefined para zona ainda não montada', () => {
    expect(
      criarRegistroDeAncoras().obter({ lado: 'adversario', zona: 'ultimate' }),
    ).toBeUndefined();
  });

  it('cancela o registro quando a zona sai da tela', () => {
    const registro = criarRegistroDeAncoras();
    const cancelar = registro.registrar({ lado: 'proprio', zona: 'cd1' }, { x: 0.1, y: 0.9 });
    expect(registro.registradas()).toHaveLength(1);
    cancelar();
    expect(registro.registradas()).toHaveLength(0);
    expect(registro.obter({ lado: 'proprio', zona: 'cd1' })).toBeUndefined();
  });

  it('permite ligar origem e destino de um efeito', () => {
    const registro = criarRegistroDeAncoras();
    registro.registrar({ lado: 'proprio', zona: 'acao', indice: 0 }, { x: 0.4, y: 0.6 });
    registro.registrar({ lado: 'adversario', zona: 'personagem' }, { x: 0.5, y: 0.1 });

    const origem = registro.obter({ lado: 'proprio', zona: 'acao', indice: 0 });
    const destino = registro.obter({ lado: 'adversario', zona: 'personagem' });
    expect(origem).toBeDefined();
    expect(destino).toBeDefined();
    expect(destino!.y).toBeLessThan(origem!.y);
  });
});
