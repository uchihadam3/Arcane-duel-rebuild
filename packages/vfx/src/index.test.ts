import { describe, expect, it } from 'vitest';

import { PREFERENCIAS_PADRAO, duracaoEfetiva } from './index.js';

describe('ritmo de animação', () => {
  it('permite acelerar e reduzir dentro de limites definidos', () => {
    expect(duracaoEfetiva(400, 'reduzida')).toBe(600);
    expect(duracaoEfetiva(400, 'normal')).toBe(400);
    expect(duracaoEfetiva(400, 'rapida')).toBe(240);
    expect(duracaoEfetiva(400, 'instantanea')).toBe(0);
  });

  it('parte de qualidade alta sem reduzir movimento de câmera', () => {
    expect(PREFERENCIAS_PADRAO.qualidade).toBe('alta');
    expect(PREFERENCIAS_PADRAO.reduzirMovimentoDeCamera).toBe(false);
  });
});
