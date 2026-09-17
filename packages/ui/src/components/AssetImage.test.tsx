// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AssetProvider } from './AssetProvider.js';
import { AssetImage } from './AssetImage.js';

describe('<AssetImage>', () => {
  it('renderiza o asset aprovado a partir do id semântico', () => {
    render(
      <AssetProvider>
        <AssetImage assetId="card-frame-ataque" alt="Moldura de Ataque" />
      </AssetProvider>,
    );
    const imagem = screen.getByAltText('Moldura de Ataque');
    expect(imagem.getAttribute('src')).toBe('/assets/cards/frames/card_frame_attack_red.png');
    expect(imagem.getAttribute('data-asset-ausente')).toBe('false');
  });

  it('usa a base de publicação recebida', () => {
    render(
      <AssetProvider base="/jogo/">
        <AssetImage assetId="arena" alt="Arena" />
      </AssetProvider>,
    );
    expect(screen.getByAltText('Arena').getAttribute('src')).toBe(
      '/jogo/assets/arenas/arena_board_clean_vertical.png',
    );
  });

  it('exige o provider', () => {
    expect(() => render(<AssetImage assetId="arena" alt="Arena" />)).toThrow(/AssetProvider/);
  });
});
