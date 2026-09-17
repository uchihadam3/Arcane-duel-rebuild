import { describe, expect, it } from 'vitest';

import { gerarPlaceholder } from './placeholder.js';
import { criarResolvedorEstatico } from './resolver.js';

describe('resolvedor de assets', () => {
  it('resolve um id conhecido para o caminho publicado', () => {
    const resolvedor = criarResolvedorEstatico();
    expect(resolvedor.url('card-frame-ataque')).toBe(
      '/assets/cards/frames/card_frame_attack_red.png',
    );
  });

  it('respeita a base de publicação', () => {
    expect(criarResolvedorEstatico({ base: '/arcane/' }).url('arena')).toBe(
      '/arcane/assets/arenas/arena_board_clean_vertical.png',
    );
    expect(criarResolvedorEstatico({ base: '/arcane' }).url('arena')).toBe(
      '/arcane/assets/arenas/arena_board_clean_vertical.png',
    );
  });

  it('cai para placeholder quando o id não existe no manifesto', () => {
    const url = criarResolvedorEstatico().url('id-inventado');
    expect(url.startsWith('data:image/svg+xml')).toBe(true);
    expect(decodeURIComponent(url)).toContain('ASSET DESCONHECIDO');
  });

  it('gera placeholder legível e claramente marcado', () => {
    const svg = decodeURIComponent(gerarPlaceholder('slot-passiva'));
    expect(svg).toContain('ASSET AUSENTE');
    expect(svg).toContain('slot-passiva');
  });

  it('escapa caracteres de marcação no placeholder', () => {
    const svg = decodeURIComponent(gerarPlaceholder('<script>'));
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});
