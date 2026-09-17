import type { ClassId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { CLASSES, CLASS_IDS, obterClasse } from './classes.js';

describe('descritores de classe', () => {
  it('contém exatamente as doze classes do lançamento inicial', () => {
    expect(CLASSES).toHaveLength(12);
  });

  it('não repete identificadores', () => {
    expect(new Set(CLASS_IDS).size).toBe(CLASS_IDS.length);
  });

  it('cobre a união ClassId por inteiro', () => {
    const esperadas: readonly ClassId[] = [
      'guerreiro',
      'mago',
      'clerigo',
      'necromante',
      'paladino',
      'ladino',
      'bardo',
      'monge',
      'patrulheiro',
      'barbaro',
      'druida',
      'bruxo',
    ];
    expect([...CLASS_IDS].sort()).toEqual([...esperadas].sort());
  });

  it('dá a cada classe um componente próprio, sem barra genérica de recurso', () => {
    for (const classe of CLASSES) {
      expect(classe.componente.nome.length).toBeGreaterThan(0);
      expect(classe.componente.resumo.length).toBeGreaterThan(0);
    }
    const nomes = CLASSES.map((classe) => classe.componente.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('só o Mago usa Mana tradicional', () => {
    const comMana = CLASSES.filter((classe) => classe.componente.nome === 'Mana');
    expect(comMana.map((classe) => classe.id)).toEqual(['mago']);
  });

  it('recupera uma classe pelo identificador', () => {
    expect(obterClasse('bruxo').nome).toBe('Bruxo');
  });

  it('falha de forma explícita para uma classe desconhecida', () => {
    expect(() => obterClasse('ninja' as ClassId)).toThrow(/Classe desconhecida/);
  });
});
