import { describe, expect, it } from 'vitest';

import { MANIFESTO } from './manifest.js';

describe('manifesto da PWA', () => {
  it('identifica o jogo com o nome acordado', () => {
    expect(MANIFESTO.name).toBe('Arcane Duel');
    expect(MANIFESTO.short_name).toBe('Arcane Duel');
  });

  it('abre instalado em standalone e em landscape', () => {
    expect(MANIFESTO.display).toBe('standalone');
    expect(MANIFESTO.orientation).toBe('landscape');
  });

  it('usa a raiz como start_url e como escopo', () => {
    expect(MANIFESTO.start_url).toBe('/');
    expect(MANIFESTO.scope).toBe('/');
    expect(MANIFESTO.start_url.startsWith(MANIFESTO.scope)).toBe(true);
  });

  it('declara os tamanhos que o Android exige para instalar', () => {
    const tamanhos = MANIFESTO.icons.map((icone) => icone.sizes);
    expect(tamanhos).toContain('192x192');
    expect(tamanhos).toContain('512x512');
  });

  it('inclui um ícone maskable para o recorte do sistema', () => {
    const maskable = MANIFESTO.icons.filter((icone) => icone.purpose === 'maskable');
    expect(maskable).toHaveLength(1);
    expect(maskable[0]?.sizes).toBe('512x512');
  });

  it('aponta todos os ícones para caminhos relativos ao escopo, sem barra inicial', () => {
    for (const icone of MANIFESTO.icons) {
      expect(icone.src.startsWith('/')).toBe(false);
      expect(icone.src.startsWith('icons/')).toBe(true);
      expect(icone.type).toBe('image/png');
    }
  });
});
