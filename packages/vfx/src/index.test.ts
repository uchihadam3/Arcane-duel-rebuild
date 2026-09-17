import { describe, expect, it } from 'vitest';

import type { MomentoDeApresentacao } from './index.js';
import {
  PREFERENCIAS_PADRAO,
  duracaoDaSequencia,
  duracaoEfetiva,
  estouroDeOrcamento,
} from './index.js';

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

describe('orçamento de apresentação', () => {
  const momento = (id: string, duracaoBaseMs: number): MomentoDeApresentacao => ({
    id,
    duracaoBaseMs,
    bloqueiaEntrada: true,
  });

  it('aceita uma sequência dentro do teto', () => {
    expect(
      estouroDeOrcamento([
        momento('viagem-do-efeito', 900),
        momento('impacto', 500),
        momento('ruptura', 700),
      ]),
    ).toBeUndefined();
  });

  it('recusa um único momento longo demais', () => {
    expect(estouroDeOrcamento([momento('ultimate-interminavel', 2500)])).toBe('momento');
  });

  it('recusa uma sequência longa demais mesmo com momentos curtos', () => {
    const momentos = Array.from({ length: 4 }, (_, indice) =>
      momento(`beat-${String(indice)}`, 1000),
    );
    expect(estouroDeOrcamento(momentos)).toBe('sequencia');
  });

  it('soma a sequência já ajustada pela preferência de velocidade', () => {
    const momentos = [momento('a', 600), momento('b', 400)];
    expect(duracaoDaSequencia(momentos, 'normal')).toBe(1000);
    expect(duracaoDaSequencia(momentos, 'rapida')).toBe(600);
    expect(duracaoDaSequencia(momentos, 'instantanea')).toBe(0);
  });

  it('não deixa a velocidade acelerada esconder uma sequência longa demais', () => {
    const momentos = Array.from({ length: 5 }, (_, indice) =>
      momento(`beat-${String(indice)}`, 1000),
    );
    expect(duracaoDaSequencia(momentos, 'instantanea')).toBe(0);
    expect(estouroDeOrcamento(momentos)).toBe('sequencia');
  });
});
