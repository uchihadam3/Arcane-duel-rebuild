import { describe, expect, it } from 'vitest';

import { EVENTOS_SONOROS, VOLUMES_PADRAO } from './index.js';

describe('vocabulário de áudio', () => {
  it('cobre os catorze eventos mínimos do documento', () => {
    expect(EVENTOS_SONOROS).toHaveLength(14);
    expect(new Set(EVENTOS_SONOROS).size).toBe(14);
  });

  it('separa Ativar de Exaurir também no áudio', () => {
    expect(EVENTOS_SONOROS).toContain('ativar-carta-de-classe');
    expect(EVENTOS_SONOROS).toContain('exaurir-carta-de-classe');
  });

  it('mantém os três barramentos com volume independente', () => {
    expect(Object.keys(VOLUMES_PADRAO).sort()).toEqual(['efeitos', 'interface', 'musica']);
    for (const volume of Object.values(VOLUMES_PADRAO)) {
      expect(volume).toBeGreaterThanOrEqual(0);
      expect(volume).toBeLessThanOrEqual(1);
    }
  });
});
