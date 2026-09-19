// @vitest-environment jsdom
import { CARD_DATA_VERSION, CATALOGO, CLASSES_IMPLEMENTADAS } from '@arcane-duel/card-data';
import { RECEITAS_INICIAIS } from '@arcane-duel/gameplay/receitas';
import { RULES_VERSION } from '@arcane-duel/rules-engine';
import { MANIFESTO_DE_ASSETS } from '@arcane-duel/ui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

/*
 * O fluxo do aplicativo, e a tela de status dentro dele.
 *
 * A home passou a ser o menu: quem abre o aplicativo quer jogar. A tela de
 * status continua existindo porque responde uma pergunta prática — abrindo o
 * aplicativo instalado, qual build está no ar? — mas agora fica a um toque de
 * distância, e não na porta de entrada.
 */

const abrirStatus = (): void => {
  render(<App />);
  fireEvent.click(screen.getByTestId('abrir-status'));
};

const valorDe = (painel: string, rotulo: string): string | undefined => {
  const secao = screen.getByText(painel).closest('section');
  expect(secao).not.toBeNull();
  return within(secao!).getByText(rotulo).nextElementSibling?.textContent?.trim();
};

describe('fluxo do aplicativo', () => {
  it('abre no menu principal, e não na tela de status', () => {
    render(<App />);
    expect(screen.getByTestId('menu-principal')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'Arcane Duel' })).toBeDefined();
    expect(screen.queryByText('Regras universais')).toBeNull();
  });

  it('Jogar local abre a configuração da partida', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('jogar-local'));
    expect(screen.getByTestId('configuracao')).toBeDefined();
  });

  it('a configuração volta para o menu', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('jogar-local'));
    fireEvent.click(screen.getByTestId('voltar-do-setup'));
    expect(screen.getByTestId('menu-principal')).toBeDefined();
  });

  it('a tela de status continua acessível a partir do menu', () => {
    abrirStatus();
    expect(screen.getByText('Regras universais')).toBeDefined();
  });

  it('a tela de status volta para o menu', () => {
    abrirStatus();
    fireEvent.click(screen.getByTestId('voltar-do-status'));
    expect(screen.getByTestId('menu-principal')).toBeDefined();
  });

  it('não mostra login, loja, ranked nem campanha, que ainda não existem', () => {
    render(<App />);
    for (const inexistente of ['Entrar', 'Loja', 'Ranked', 'Campanha', 'Desafio de IA']) {
      expect(screen.queryByText(inexistente)).toBeNull();
    }
  });

  it('mantém o aviso de orientação escondido fora da partida', () => {
    render(<App />);
    expect(screen.queryByText('Gire o aparelho')).toBeNull();
  });
});

describe('tela de status do desenvolvimento', () => {
  it('diz que o motor de combate está implementado', () => {
    abrirStatus();
    expect(valorDe('Status', 'Motor')).toBe('Combate implementado');
  });

  it('declara a Etapa 6 concluída e o vertical slice existente', () => {
    abrirStatus();
    expect(screen.getByText('Etapa 6 concluída')).toBeDefined();
    expect(screen.getByText('vertical slice Guerreiro × Mago')).toBeDefined();
    expect(valorDe('Status', 'Etapa atual')).toBe(
      'Etapa 6 concluída — vertical slice Guerreiro × Mago',
    );
    expect(valorDe('Status', 'Interface de partida')).toBe(
      'Partida local completa, do menu à tela de vitória',
    );
  });

  it('não diz mais que a interface jogável não foi implementada', () => {
    abrirStatus();
    expect(screen.queryByText('interface jogável ainda não implementada')).toBeNull();
    expect(document.body.textContent).not.toContain('Ainda não implementada');
  });

  it('mostra as versões de regras e de catálogo em uso', () => {
    abrirStatus();
    expect(valorDe('Versões', 'Regras')).toBe(RULES_VERSION);
    expect(valorDe('Versões', 'Catálogo')).toBe(CARD_DATA_VERSION);
  });

  it('mostra o commit publicado, curto e com o completo no título', () => {
    abrirStatus();
    const commit = screen.getByTestId('commit');
    expect(commit.textContent).toBe(__COMMIT_DO_CLIENTE__.slice(0, 7));
    expect(commit.getAttribute('title')).toBe(__COMMIT_DO_CLIENTE__);
  });

  it('mostra um identificador de build determinístico', () => {
    abrirStatus();
    expect(screen.getByTestId('build').textContent).toBe(__BUILD_DO_CLIENTE__);
  });

  it('mostra as doze classes, as 468 cartas e as doze Receitas', () => {
    abrirStatus();
    expect(valorDe('Conteúdo carregado', 'Classes')).toBe(String(CLASSES_IMPLEMENTADAS.length));
    expect(valorDe('Conteúdo carregado', 'Cartas no catálogo')).toBe(String(CATALOGO.todas.length));
    expect(valorDe('Conteúdo carregado', 'Receitas iniciais')).toBe(
      String(Object.keys(RECEITAS_INICIAIS).length),
    );
  });

  it('diz para qual commit o cliente está atualizado', () => {
    abrirStatus();
    expect(screen.getByTestId('estado-da-atualizacao').textContent).toContain(
      __COMMIT_DO_CLIENTE__.slice(0, 7),
    );
  });

  it('informa se está instalado ou no navegador', () => {
    abrirStatus();
    expect(valorDe('Aplicativo', 'Instalação')).toBe('Navegador');
  });

  it('renderiza um elemento de imagem para cada asset declarado', () => {
    abrirStatus();
    expect(screen.getAllByRole('img')).toHaveLength(MANIFESTO_DE_ASSETS.length);
  });

  it('aponta cada imagem para o arquivo canônico do manifesto', () => {
    abrirStatus();
    for (const entrada of MANIFESTO_DE_ASSETS) {
      const imagem = document.querySelector(`img[data-asset-id="${entrada.id}"]`);
      expect(imagem?.getAttribute('src')).toBe(`/assets/${entrada.caminho}`);
    }
  });
});
