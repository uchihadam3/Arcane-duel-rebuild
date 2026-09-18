// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BarraDeAtualizacao } from './BarraDeAtualizacao.js';
import type { EstadoDaAtualizacao } from '../pwa/atualizacao.js';

const barra = (estado: EstadoDaAtualizacao, aplicarAgora = vi.fn()): void => {
  render(<BarraDeAtualizacao atualizacao={{ estado, aplicarAgora, verificarAgora: vi.fn() }} />);
};

describe('barra de atualização', () => {
  it('fica invisível quando o cliente está em dia', () => {
    barra('em-dia');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('não pisca enquanto só está consultando o servidor', () => {
    barra('verificando');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('avisa enquanto está trocando de versão', () => {
    barra('aplicando');
    expect(screen.getByRole('status').textContent).toContain(
      'Atualizando para a versão mais recente',
    );
    // Trocar sozinho não pede botão nenhum.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('oferece o botão de emergência quando a troca ficou pendente', () => {
    const aplicarAgora = vi.fn();
    barra('pendente', aplicarAgora);
    const botao = screen.getByRole('button', { name: 'Atualizar agora' });
    botao.click();
    expect(aplicarAgora).toHaveBeenCalledTimes(1);
  });
});
