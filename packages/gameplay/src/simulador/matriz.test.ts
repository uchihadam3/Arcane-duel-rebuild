import { describe, expect, it } from 'vitest';

import { CLASSES_DA_MATRIZ, paresDaMatriz, rodarMatriz } from './matriz.js';
import { RECEITAS_INICIAIS } from '../receitas.js';

/*
 * A matriz de doze por doze e as invariantes que ela confere.
 *
 * O lote grande vive no comando `npm run simulate:matrix`; aqui fica a versão
 * de fumaça, que roda uma partida por configuração e serve de guarda em CI.
 */

describe('matriz de doze por doze', () => {
  it('cobre as doze classes com Receita 1', () => {
    expect(CLASSES_DA_MATRIZ).toHaveLength(12);
    for (const classe of CLASSES_DA_MATRIZ) {
      expect(RECEITAS_INICIAIS[classe].classe).toBe(classe);
    }
  });

  it('tem 78 pares não ordenados, os doze espelhos incluídos', () => {
    const pares = paresDaMatriz([...CLASSES_DA_MATRIZ]);
    expect(pares).toHaveLength(78);
    expect(pares.filter((par) => par.a === par.b)).toHaveLength(12);
  });

  it('roda 156 configurações sem comando ilegal e sem invariante quebrada, de instantâneo ou de transição', () => {
    const resumo = rodarMatriz({ semente: 'smoke', partidasPorConfiguracao: 1 });

    expect(resumo.configuracoes).toBe(156);
    expect(resumo.partidas).toBe(156);
    expect(resumo.comandosIlegais).toBe(0);
    expect(resumo.exemplosDeComandoIlegal).toEqual([]);
    expect(resumo.invariantesQuebradas).toEqual([]);
    expect(resumo.invariantesDeTransicaoQuebradas).toEqual([]);
    expect(resumo.bloqueiosDeRegra).toBe(0);
  });

  it('é reproduzível a partir da semente', () => {
    const uma = rodarMatriz({ semente: 'reprodutivel', partidasPorConfiguracao: 1 });
    const outra = rodarMatriz({ semente: 'reprodutivel', partidasPorConfiguracao: 1 });
    expect(outra.vitoriasPorClasse).toEqual(uma.vitoriasPorClasse);
    expect(outra.pares).toEqual(uma.pares);
  });

  it('conta cada partida do espelho uma vez só para a classe', () => {
    const resumo = rodarMatriz({ semente: 'contagem', partidasPorConfiguracao: 1 });
    for (const classe of CLASSES_DA_MATRIZ) {
      // 11 pares com as outras classes + 1 espelho, em 2 posições iniciais.
      expect(resumo.partidasPorClasse[classe]).toBe(24);
    }
  });
});
