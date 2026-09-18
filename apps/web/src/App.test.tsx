// @vitest-environment jsdom
import { CARD_DATA_VERSION, CATALOGO, CLASSES_IMPLEMENTADAS } from '@arcane-duel/card-data';
import { RECEITAS_INICIAIS } from '@arcane-duel/gameplay';
import { RULES_VERSION } from '@arcane-duel/rules-engine';
import { MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

/*
 * A tela de status existe para uma pergunta prática: abrindo o aplicativo
 * instalado, consigo ver qual build está no ar? Estes testes cobrem o que
 * precisa estar visível para essa resposta ser sim.
 */

const valorDe = (painel: string, rotulo: string): string | undefined => {
  const secao = screen.getByText(painel).closest('section');
  expect(secao).not.toBeNull();
  return within(secao!).getByText(rotulo).nextElementSibling?.textContent?.trim();
};

describe('tela de status do desenvolvimento', () => {
  it('abre e identifica o jogo', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Arcane Duel' })).toBeDefined();
  });

  it('diz que o motor de combate está implementado', () => {
    render(<App />);
    expect(screen.getByText('motor de combate implementado')).toBeDefined();
    expect(valorDe('Status', 'Motor')).toBe('Combate implementado');
  });

  it('deixa explícito que a interface jogável ainda não existe', () => {
    render(<App />);
    expect(screen.getByText('interface jogável ainda não implementada')).toBeDefined();
    expect(valorDe('Status', 'Interface de partida')).toBe('Ainda não implementada');
  });

  it('não diz mais que o motor e o catálogo ainda serão implementados', () => {
    render(<App />);
    const texto = document.body.textContent ?? '';
    expect(texto).not.toContain('combate não implementado');
    expect(texto).not.toContain('Fundação do projeto');
    expect(texto).not.toMatch(/O motor de regras.{0,40}entram nas etapas seguintes/s);
  });

  it('mostra a etapa atual do projeto', () => {
    render(<App />);
    expect(valorDe('Status', 'Etapa atual')).toContain('Etapa 4');
  });

  it('mostra as versões de regras e de catálogo em uso', () => {
    render(<App />);
    expect(valorDe('Versões', 'Regras')).toBe(RULES_VERSION);
    expect(valorDe('Versões', 'Catálogo')).toBe(CARD_DATA_VERSION);
  });

  it('mostra o commit publicado, curto e com o completo no título', () => {
    render(<App />);
    const commit = document.querySelector('[data-teste="commit"]');
    expect(commit?.textContent).toBe(__COMMIT_DO_CLIENTE__.slice(0, 7));
    expect(commit?.getAttribute('title')).toBe(__COMMIT_DO_CLIENTE__);
  });

  it('mostra um identificador de build determinístico', () => {
    render(<App />);
    const build = document.querySelector('[data-teste="build"]');
    expect(build?.textContent).toBe(__BUILD_DO_CLIENTE__);
    expect(build?.textContent?.length).toBeGreaterThan(0);
  });

  it('mostra as doze classes implementadas', () => {
    render(<App />);
    expect(CLASSES_IMPLEMENTADAS).toHaveLength(12);
    expect(valorDe('Conteúdo carregado', 'Classes')).toBe('12');
  });

  it('mostra as 468 cartas do catálogo', () => {
    render(<App />);
    expect(CATALOGO.todas).toHaveLength(468);
    expect(valorDe('Conteúdo carregado', 'Cartas no catálogo')).toBe('468');
  });

  it('mostra as doze Receitas iniciais', () => {
    render(<App />);
    expect(Object.keys(RECEITAS_INICIAIS)).toHaveLength(12);
    expect(valorDe('Conteúdo carregado', 'Receitas iniciais')).toBe('12');
  });

  it('diz para qual commit o cliente está atualizado', () => {
    render(<App />);
    const linha = document.querySelector('[data-teste="estado-da-atualizacao"]');
    expect(linha?.textContent).toContain(__COMMIT_DO_CLIENTE__.slice(0, 7));
  });

  it('informa se está instalado ou no navegador', () => {
    render(<App />);
    expect(valorDe('Aplicativo', 'Instalação')).toBe('Navegador');
  });

  it('renderiza um elemento de imagem para cada asset declarado', () => {
    render(<App />);
    expect(screen.getAllByRole('img')).toHaveLength(MANIFESTO_DE_ASSETS.length);
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
    expect(document.querySelector('.aviso-de-orientacao')?.getAttribute('data-visivel')).toBe(
      'false',
    );
  });
});
