import { describe, expect, it } from 'vitest';

import {
  CAMADAS,
  MANIFESTO_DE_ASSETS,
  MODULO_ACAO_RESPOSTA,
  ORDEM_DO_ATLAS_DE_ICONES,
  assetsPorCategoria,
  obterAsset,
} from './manifest.js';

describe('manifesto de assets', () => {
  it('não repete ids nem arquivos', () => {
    const ids = MANIFESTO_DE_ASSETS.map((entrada) => entrada.id);
    const arquivos = MANIFESTO_DE_ASSETS.map((entrada) => entrada.arquivo);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(arquivos).size).toBe(arquivos.length);
  });

  it('usa caminhos relativos, sempre .png, terminando no nome canônico', () => {
    for (const entrada of MANIFESTO_DE_ASSETS) {
      expect(entrada.caminho.startsWith('/')).toBe(false);
      expect(entrada.caminho.includes('..')).toBe(false);
      expect(entrada.caminho.endsWith('.png')).toBe(true);
      expect(entrada.caminho.endsWith(entrada.arquivo)).toBe(true);
    }
  });

  it('declara uma camada válida para cada asset', () => {
    for (const entrada of MANIFESTO_DE_ASSETS) {
      expect(CAMADAS).toContain(entrada.camada);
    }
  });

  it('cobre as sete molduras e o verso descritos no catálogo', () => {
    expect(assetsPorCategoria('card-frame')).toHaveLength(6);
    expect(assetsPorCategoria('card-back')).toHaveLength(1);
  });

  it('cobre os slots, bandejas, HUD e overlays do catálogo', () => {
    expect(assetsPorCategoria('board-slot')).toHaveLength(5);
    expect(assetsPorCategoria('board-tray')).toHaveLength(2);
    expect(assetsPorCategoria('hud')).toHaveLength(8);
    expect(assetsPorCategoria('overlay')).toHaveLength(3);
    expect(assetsPorCategoria('arena')).toHaveLength(1);
  });

  it('declara os dez ícones universais na ordem documentada', () => {
    expect(assetsPorCategoria('icone')).toHaveLength(10);
    expect(ORDEM_DO_ATLAS_DE_ICONES).toHaveLength(10);
    for (const id of ORDEM_DO_ATLAS_DE_ICONES) {
      expect(obterAsset(id)).toBeDefined();
    }
  });

  it('separa o ícone de Ativar do ícone de Exaurir', () => {
    expect(obterAsset('icone-ativar')?.arquivo).toBe('icon_activate.png');
    expect(obterAsset('icone-exaurir')?.arquivo).toBe('icon_exhaust.png');
  });

  it('monta o módulo Ação + Resposta em código, três vezes', () => {
    expect(obterAsset(MODULO_ACAO_RESPOSTA.acao)).toBeDefined();
    expect(obterAsset(MODULO_ACAO_RESPOSTA.resposta)).toBeDefined();
    expect(MODULO_ACAO_RESPOSTA.repeticoes).toBe(3);
  });

  it('devolve undefined para um id fora do manifesto', () => {
    expect(obterAsset('nao-existe')).toBeUndefined();
  });
});
