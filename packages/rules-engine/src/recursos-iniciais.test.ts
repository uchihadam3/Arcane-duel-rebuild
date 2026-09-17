import type { ClassId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { recursoInicialDaClasse } from './recursos-iniciais.js';

const TODAS: readonly ClassId[] = [
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

describe('componente inicial de cada classe', () => {
  it('cobre as doze classes, cada uma com o próprio componente', () => {
    for (const classe of TODAS) {
      expect(recursoInicialDaClasse(classe).classe).toBe(classe);
    }
  });

  it('Guerreiro começa sem Momentum', () => {
    expect(recursoInicialDaClasse('guerreiro')).toEqual({ classe: 'guerreiro', momentum: 0 });
  });

  it('Mago começa com quatro de Mana', () => {
    expect(recursoInicialDaClasse('mago')).toEqual({ classe: 'mago', mana: 4 });
  });

  it('Clérigo começa em Vigília', () => {
    expect(recursoInicialDaClasse('clerigo').devocao).toBe('vigilia');
  });

  it('Necromante começa controlando duas Almas, com duas no Cemitério', () => {
    const recurso = recursoInicialDaClasse('necromante');
    expect(recurso.almasControladas).toBe(2);
    expect(recurso.almasNoCemiterio).toBe(2);
    expect(recurso.almasControladas + recurso.almasNoCemiterio).toBe(4);
  });

  it('Paladino começa Resoluto, e não possui moeda de Convicção', () => {
    const recurso = recursoInicialDaClasse('paladino');
    expect(recurso.juramento).toBe('resoluto');
    expect(Object.keys(recurso)).toEqual(['classe', 'juramento']);
  });

  it('Ladino começa sem Brechas sobre o adversário', () => {
    expect(recursoInicialDaClasse('ladino').brechasNoAdversario).toBe(0);
  });

  it('Bardo começa sem sequência de Notas: a ordem é o recurso dele', () => {
    expect(recursoInicialDaClasse('bardo').sequenciaDeNotas).toEqual([]);
  });

  it('Monge começa com as três pedras de Chi Prontas', () => {
    const recurso = recursoInicialDaClasse('monge');
    expect(recurso.chi).toEqual(['pronta', 'pronta', 'pronta']);
    expect(recurso.chi).toHaveLength(3);
    expect(recurso.sequenciaDeKata).toEqual([]);
  });

  it('Patrulheiro começa sem a Marca da Presa colocada', () => {
    expect(recursoInicialDaClasse('patrulheiro').marcaDaPresa).toBe(false);
  });

  it('Bárbaro começa sem ter reduzido a própria Guarda no turno', () => {
    expect(recursoInicialDaClasse('barbaro').guardaReduzidaVoluntariamenteNoTurno).toBe(0);
  });

  it('Druida começa em Forma Humana, com a Metamorfose gratuita disponível', () => {
    const recurso = recursoInicialDaClasse('druida');
    expect(recurso.forma).toBe('humana');
    expect(recurso.metamorfoseGratuitaUsadaNoTurno).toBe(false);
  });

  it('Bruxo começa com o Preço Proibido disponível no turno', () => {
    expect(recursoInicialDaClasse('bruxo').precoProibidoUsadoNoTurno).toBe(false);
  });

  it('devolve um objeto novo a cada chamada, sem estado compartilhado', () => {
    const primeiro = recursoInicialDaClasse('monge');
    const segundo = recursoInicialDaClasse('monge');
    expect(primeiro).not.toBe(segundo);
    expect(primeiro.chi).not.toBe(segundo.chi);
  });
});
