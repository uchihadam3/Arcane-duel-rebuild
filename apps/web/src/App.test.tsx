// @vitest-environment jsdom
import { CARD_DATA_VERSION, CATALOGO } from '@arcane-duel/card-data';
import { RULES_VERSION } from '@arcane-duel/rules-engine';
import { MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('tela de fundação', () => {
  it('abre e identifica o jogo', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Arcane Duel' })).toBeDefined();
  });

  it('deixa claro que o combate ainda não existe', () => {
    render(<App />);
    expect(screen.getByText('combate não implementado')).toBeDefined();
  });

  it('mostra as versões de regras e de catálogo', () => {
    render(<App />);
    expect(screen.getByText(RULES_VERSION)).toBeDefined();
    expect(screen.getByText(CARD_DATA_VERSION)).toBeDefined();
  });

  it('renderiza um elemento de imagem para cada asset declarado', () => {
    render(<App />);
    const imagens = screen.getAllByRole('img');
    expect(imagens).toHaveLength(MANIFESTO_DE_ASSETS.length);
  });

  it('aponta cada imagem para o arquivo canônico do manifesto', () => {
    render(<App />);
    for (const entrada of MANIFESTO_DE_ASSETS) {
      const imagem = document.querySelector(`img[data-asset-id="${entrada.id}"]`);
      expect(imagem?.getAttribute('src')).toBe(`/assets/${entrada.caminho}`);
    }
  });

  it('mantém o aviso de orientação escondido em landscape', () => {
    render(<App />);
    const aviso = document.querySelector('.aviso-de-orientacao');
    expect(aviso?.getAttribute('data-visivel')).toBe('false');
  });

  it('mostra o tamanho real do catálogo carregado', () => {
    render(<App />);
    const painel = screen.getByText('Conteúdo carregado').closest('section');
    expect(painel).not.toBeNull();
    const linhaDeCartas = within(painel!).getByText('Cartas no catálogo');
    // Guerreiro e Mago completos: 20 habilidades, 10 Passivas, 6 Cartas de
    // Classe e 3 Ultimates de cada um.
    expect(linhaDeCartas.nextElementSibling?.textContent).toBe(String(CATALOGO.todas.length));
    expect(CATALOGO.todas).toHaveLength(78);
  });
});
