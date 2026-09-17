import { cardId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { CATALOGO, criarCatalogo } from './card-definition.js';
import type { DefinicaoDeCarta } from './card-definition.js';

const cartaDeExemplo: DefinicaoDeCarta = {
  id: cardId('W01'),
  classe: 'guerreiro',
  nome: 'Corte de Sondagem',
  tipo: 'ataque',
  custo: { moeda: 'ap', valor: 1 },
  valores: { dano: 2, impacto: 1 },
  cooldown: 1,
  texto: 'Exemplo usado apenas no teste do índice.',
};

describe('catálogo de cartas', () => {
  it('começa vazio: as cartas entram junto com as regras e os testes delas', () => {
    expect(CATALOGO.todas).toHaveLength(0);
    expect(CATALOGO.porClasse('guerreiro')).toHaveLength(0);
  });

  it('indexa por id e por classe', () => {
    const catalogo = criarCatalogo([cartaDeExemplo]);
    expect(catalogo.porId(cardId('W01'))?.nome).toBe('Corte de Sondagem');
    expect(catalogo.porClasse('guerreiro')).toHaveLength(1);
    expect(catalogo.porClasse('mago')).toHaveLength(0);
  });

  it('devolve undefined para uma carta inexistente', () => {
    expect(criarCatalogo([]).porId(cardId('X99'))).toBeUndefined();
  });

  it('rejeita ids duplicados', () => {
    expect(() => criarCatalogo([cartaDeExemplo, cartaDeExemplo])).toThrow(/Carta duplicada/);
  });
});
