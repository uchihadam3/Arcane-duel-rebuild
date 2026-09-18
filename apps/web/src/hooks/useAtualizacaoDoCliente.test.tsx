// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * O encanamento entre o service worker e o coordenador.
 *
 * A decisão já é provada em `pwa/atualizacao.test.ts`. O que falta provar é o
 * fio: que `verificar` vira `registration.update()`, que `aplicar` vira a
 * troca com recarga, e que nada disso exige reinstalar o aplicativo.
 */

const registro = {
  update: vi.fn<() => Promise<void>>(() => Promise.resolve()),
};

const trocarComRecarga = vi.fn<(recarregar?: boolean) => Promise<void>>(() => Promise.resolve());

let precisaAtualizar = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (opcoes?: { onRegisteredSW?: (url: string, registrado?: unknown) => void }) => {
    opcoes?.onRegisteredSW?.('/sw.js', registro);
    return {
      needRefresh: [precisaAtualizar, () => undefined] as [boolean, (valor: boolean) => void],
      offlineReady: [false, () => undefined] as [boolean, (valor: boolean) => void],
      updateServiceWorker: trocarComRecarga,
    };
  },
}));

const { useAtualizacaoDoCliente } = await import('./useAtualizacaoDoCliente.js');

const Sonda = (): React.JSX.Element => {
  const atualizacao = useAtualizacaoDoCliente();
  return (
    <button
      type="button"
      data-estado={atualizacao.estado}
      onClick={() => {
        atualizacao.aplicarAgora();
      }}
    >
      estado
    </button>
  );
};

describe('ligação com o service worker', () => {
  beforeEach(() => {
    precisaAtualizar = false;
    registro.update.mockClear();
    trocarComRecarga.mockClear();
  });

  it('pergunta ao service worker por versão nova assim que o cliente monta', () => {
    render(<Sonda />);
    expect(registro.update).toHaveBeenCalled();
  });

  it('pergunta de novo quando o aplicativo volta do segundo plano', () => {
    render(<Sonda />);
    const antes = registro.update.mock.calls.length;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(registro.update.mock.calls.length).toBeGreaterThan(antes);
  });

  it('pergunta de novo quando a conexão volta', () => {
    render(<Sonda />);
    const antes = registro.update.mock.calls.length;
    window.dispatchEvent(new Event('online'));
    expect(registro.update.mock.calls.length).toBeGreaterThan(antes);
  });

  it('ativa o worker em espera e recarrega quando existe versão nova', () => {
    precisaAtualizar = true;
    render(<Sonda />);
    // `true` é o que manda o SKIP_WAITING e recarrega no build novo: é esta
    // chamada que dispensa reinstalar o aplicativo.
    expect(trocarComRecarga).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button').dataset.estado).toBe('aplicando');
  });

  it('volta a "em-dia" quando a consulta não encontra versão nova', async () => {
    render(<Sonda />);
    expect(trocarComRecarga).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('button').dataset.estado).toBe('em-dia');
    });
  });

  it('o botão de emergência força a troca', () => {
    render(<Sonda />);
    screen.getByRole('button').click();
    expect(trocarComRecarga).toHaveBeenCalledWith(true);
  });
});
