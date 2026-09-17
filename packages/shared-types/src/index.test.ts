import { describe, expect, it } from 'vitest';

import { CONDICOES, INDICES_DE_ACAO, cardId, falha, playerId, sucesso } from './index.js';

describe('shared-types', () => {
  it('cria identificadores nominais a partir de strings', () => {
    expect(playerId('p1')).toBe('p1');
    expect(cardId('W01')).toBe('W01');
  });

  it('expõe as quatro condições do jogo-base', () => {
    expect(CONDICOES).toEqual(['queimadura', 'lento', 'murchar', 'sangramento']);
  });

  it('expõe exatamente três espaços centrais de Ação', () => {
    expect(INDICES_DE_ACAO).toHaveLength(3);
  });

  it('modela resultado sem exceções', () => {
    const bom = sucesso(2);
    const ruim = falha('nao-pode');
    expect(bom.ok && bom.valor).toBe(2);
    expect(ruim.ok).toBe(false);
  });
});
