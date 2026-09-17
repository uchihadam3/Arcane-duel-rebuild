import { describe, expect, it } from 'vitest';

import { NIVEIS_DE_IA, estiloDoNivel } from './index.js';

describe('níveis da IA', () => {
  it('cobre os doze adversários de uma campanha', () => {
    expect(NIVEIS_DE_IA).toHaveLength(12);
  });

  it('aumenta a profundidade de decisão ao longo da campanha', () => {
    expect(estiloDoNivel(1)).toBe('heuristico');
    expect(estiloDoNivel(6)).toBe('busca-rasa');
    expect(estiloDoNivel(12)).toBe('busca-profunda');
  });
});
