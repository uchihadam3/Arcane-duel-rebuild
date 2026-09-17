import { describe, expect, it } from 'vitest';

import {
  CATALOGO_POR_CLASSE,
  COMPOSICAO_DA_BUILD,
  LIMITE_DE_CONDICAO,
  REGRAS_UNIVERSAIS,
} from './constants.js';

describe('constantes universais', () => {
  it('usa os valores de playtest do FULL_GAME_SPEC', () => {
    expect(REGRAS_UNIVERSAIS.vidaInicial).toBe(30);
    expect(REGRAS_UNIVERSAIS.guardaInicial).toBe(6);
    expect(REGRAS_UNIVERSAIS.pontosDeAcaoPorTurno).toBe(5);
    expect(REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno).toBe(3);
    expect(REGRAS_UNIVERSAIS.maximoDeReserva).toBe(2);
    expect(REGRAS_UNIVERSAIS.danoAdicionalDeRuptura).toBe(2);
  });

  it('descreve uma build de quinze componentes', () => {
    const total =
      COMPOSICAO_DA_BUILD.habilidades +
      COMPOSICAO_DA_BUILD.passivas +
      COMPOSICAO_DA_BUILD.cartasDeClasse +
      COMPOSICAO_DA_BUILD.ultimates +
      COMPOSICAO_DA_BUILD.personagens;
    expect(total).toBe(16);
    expect(COMPOSICAO_DA_BUILD.habilidades).toBe(8);
    expect(COMPOSICAO_DA_BUILD.passivas).toBe(4);
    expect(COMPOSICAO_DA_BUILD.cartasDeClasse).toBe(2);
    expect(COMPOSICAO_DA_BUILD.ultimates).toBe(1);
  });

  it('a build equipada é sempre um subconjunto do catálogo da classe', () => {
    expect(COMPOSICAO_DA_BUILD.habilidades).toBeLessThan(CATALOGO_POR_CLASSE.habilidades);
    expect(COMPOSICAO_DA_BUILD.passivas).toBeLessThan(CATALOGO_POR_CLASSE.passivas);
    expect(COMPOSICAO_DA_BUILD.cartasDeClasse).toBeLessThan(CATALOGO_POR_CLASSE.cartasDeClasse);
    expect(COMPOSICAO_DA_BUILD.ultimates).toBeLessThan(CATALOGO_POR_CLASSE.ultimates);
  });

  it('limita cada condição ao valor do documento', () => {
    expect(LIMITE_DE_CONDICAO).toEqual({
      queimadura: 3,
      lento: 2,
      murchar: 2,
      sangramento: 3,
    });
  });
});
