// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DURACAO_BASE_MS, ORCAMENTO_VISUAL, duracaoEfetiva } from '@arcane-duel/vfx';
import type { QualidadeDeVfx, TipoDeMomento } from '@arcane-duel/vfx';

import { ProvedorDePreferencias, usePreferencias } from './preferencias.js';

/*
 * As preferências de apresentação.
 *
 * O que estes testes prendem não é a interface das opções: é a fronteira. Modo
 * e qualidade mexem em aparência, e em nada mais. Se um dia um deles encostar
 * em informação, regra ou no tempo que o jogador tem para decidir, ele deixou
 * de ser preferência e virou vantagem.
 */

const Espelho = (): React.JSX.Element => {
  const { preferencias, velocidade, movimentoReduzido } = usePreferencias();
  return (
    <output data-teste="espelho">
      {preferencias.modo}|{preferencias.qualidade}|{velocidade}|
      {movimentoReduzido ? 'reduzido' : 'normal'}
    </output>
  );
};

describe('modos de animação', () => {
  it('o modo normal roda no ritmo cheio', () => {
    render(
      <ProvedorDePreferencias iniciais={{ modo: 'normal' }}>
        <Espelho />
      </ProvedorDePreferencias>,
    );
    expect(screen.getByTestId('espelho').textContent).toContain('normal|alta|normal|');
  });

  it('o modo rápido encurta as animações, e só isso', () => {
    render(
      <ProvedorDePreferencias iniciais={{ modo: 'rapido' }}>
        <Espelho />
      </ProvedorDePreferencias>,
    );
    expect(screen.getByTestId('espelho').textContent).toContain('rapido|alta|rapida|');

    const tipos = Object.keys(DURACAO_BASE_MS) as readonly TipoDeMomento[];
    for (const tipo of tipos) {
      const cheio = duracaoEfetiva(DURACAO_BASE_MS[tipo], 'normal');
      const curto = duracaoEfetiva(DURACAO_BASE_MS[tipo], 'rapida');
      expect(curto, `${tipo} não encurtou`).toBeLessThan(cheio);
      // Encurtar não é apagar: o beat continua existindo e visível.
      expect(curto, `${tipo} sumiu no modo rápido`).toBeGreaterThan(0);
    }
  });

  it('a preferência do sistema por menos movimento é respeitada sozinha', () => {
    render(
      <ProvedorDePreferencias iniciais={{ movimentoReduzido: true }}>
        <Espelho />
      </ProvedorDePreferencias>,
    );
    expect(screen.getByTestId('espelho').textContent).toContain('|reduzido');
  });
});

describe('níveis de qualidade', () => {
  const niveis: readonly QualidadeDeVfx[] = ['alta', 'media', 'baixa'];

  it('mexem só em enfeite: partícula, sombra, luz, brilho e resolução', () => {
    const chaves = Object.keys(ORCAMENTO_VISUAL.alta).sort();
    expect(chaves).toEqual([
      'brilho',
      'luzesDinamicas',
      'particulasPorEfeito',
      'sombras',
      'tetoDeResolucao',
    ]);
  });

  it('descem de verdade, do mais caro ao mais barato', () => {
    for (let indice = 1; indice < niveis.length; indice += 1) {
      const acima = ORCAMENTO_VISUAL[niveis[indice - 1]!];
      const abaixo = ORCAMENTO_VISUAL[niveis[indice]!];
      expect(abaixo.particulasPorEfeito).toBeLessThan(acima.particulasPorEfeito);
      expect(abaixo.tetoDeResolucao).toBeLessThanOrEqual(acima.tetoDeResolucao);
      expect(abaixo.luzesDinamicas).toBeLessThanOrEqual(acima.luzesDinamicas);
    }
  });

  it('só sacrificam resolução no último degrau', () => {
    /*
     * A regra que a reprovação visual escreveu: nitidez é informação
     * competitiva, e cede depois de sombra, partícula e luz — nunca antes.
     * Alta e Média desenham na densidade real da tela.
     */
    expect(ORCAMENTO_VISUAL.media.tetoDeResolucao).toBe(ORCAMENTO_VISUAL.alta.tetoDeResolucao);
    expect(ORCAMENTO_VISUAL.media.sombras).toBe(false);
    expect(ORCAMENTO_VISUAL.alta.tetoDeResolucao).toBeGreaterThanOrEqual(3);
    expect(ORCAMENTO_VISUAL.baixa.tetoDeResolucao).toBeGreaterThanOrEqual(2);
  });

  it('não encostam na duração de nenhum beat', () => {
    /*
     * Este é o teste que impede a qualidade de virar vantagem competitiva.
     * `ORCAMENTO_VISUAL` não tem — e não pode ganhar — nenhum campo de tempo.
     */
    for (const nivel of niveis) {
      const orcamento: Record<string, unknown> = { ...ORCAMENTO_VISUAL[nivel] };
      for (const chave of Object.keys(orcamento)) {
        expect(chave.toLowerCase()).not.toContain('duracao');
        expect(chave.toLowerCase()).not.toContain('ms');
        expect(chave.toLowerCase()).not.toContain('velocidade');
      }
    }
  });

  it('mesmo no nível mais baixo sobra partícula para o efeito aparecer', () => {
    expect(ORCAMENTO_VISUAL.baixa.particulasPorEfeito).toBeGreaterThan(0);
    expect(ORCAMENTO_VISUAL.baixa.luzesDinamicas).toBeGreaterThan(0);
  });
});
