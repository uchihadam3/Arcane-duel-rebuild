import { describe, expect, it } from 'vitest';

import { MANIFESTO_DE_ASSETS } from '../assets/manifest.js';
import { OVERLAY_DA_ENFASE, usaOverlay } from './enfase.js';

describe('ênfase visual', () => {
  it('liga cada ênfase de seleção a um overlay aprovado do manifesto', () => {
    const ids = new Set(MANIFESTO_DE_ASSETS.map((entrada) => entrada.id));
    for (const overlay of Object.values(OVERLAY_DA_ENFASE)) {
      expect(ids.has(overlay)).toBe(true);
    }
  });

  it('não usa overlay para área afetada: não existe asset e a leitura é por luz', () => {
    expect(usaOverlay('area-afetada')).toBe(false);
    expect(usaOverlay('selecionado')).toBe(true);
  });

  it('cobre escopos maiores que a carta', () => {
    const escopos = ['carta', 'slot', 'grupo-de-slots', 'lado', 'campo'] as const;
    expect(new Set(escopos).size).toBe(5);
  });
});
