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

const Sonda = ({
  situacao = 'sem-partida',
}: {
  readonly situacao?: 'sem-partida' | 'partida-ativa';
}): React.JSX.Element => {
  const atualizacao = useAtualizacaoDoCliente(situacao);
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

/*
 * A atualização durante a partida.
 *
 * Recarregar o cliente no meio de um duelo é perder o duelo. A versão nova é
 * baixada e fica em espera; a troca acontece quando a partida acaba.
 */
describe('atualização enquanto a partida está no ar', () => {
  beforeEach(() => {
    precisaAtualizar = false;
    registro.update.mockClear();
    trocarComRecarga.mockClear();
  });

  it('não recarrega o cliente durante a partida', () => {
    precisaAtualizar = true;
    render(<Sonda situacao="partida-ativa" />);

    expect(trocarComRecarga).not.toHaveBeenCalled();
    expect(screen.getByRole('button').getAttribute('data-estado')).toBe('pendente');
  });

  it('aplica a versão que ficou pendente assim que a partida termina', () => {
    precisaAtualizar = true;
    const { rerender } = render(<Sonda situacao="partida-ativa" />);
    expect(trocarComRecarga).not.toHaveBeenCalled();

    rerender(<Sonda situacao="sem-partida" />);
    expect(trocarComRecarga).toHaveBeenCalledWith(true);
  });

  it('fora da partida a troca continua automática', () => {
    precisaAtualizar = true;
    render(<Sonda situacao="sem-partida" />);
    expect(trocarComRecarga).toHaveBeenCalledWith(true);
  });
});

/*
 * O aplicativo inteiro, e a partida segurando a atualização.
 *
 * O teste acima prova o hook. Este prova o fio até a tela: entrar na batalha
 * faz o cliente declarar `partida-ativa`, e sair dela libera a troca.
 */
describe('a partida segura a atualização no aplicativo', () => {
  beforeEach(() => {
    precisaAtualizar = true;
    registro.update.mockClear();
    trocarComRecarga.mockClear();
  });

  it('não recarrega enquanto a batalha está no ar, e aplica ao sair', async () => {
    const { App } = await import('../App.js');
    const { fireEvent } = await import('@testing-library/react');

    render(<App />);
    // Fora da partida a troca é automática.
    expect(trocarComRecarga).toHaveBeenCalledWith(true);
    trocarComRecarga.mockClear();

    fireEvent.click(screen.getByTestId('jogar-local'));
    fireEvent.click(screen.getByTestId('comeca-jogador-1'));
    fireEvent.click(screen.getByTestId('iniciar-partida'));
    expect(screen.getByTestId('campo')).toBeDefined();
    trocarComRecarga.mockClear();

    // Com a batalha montada, nada recarrega.
    fireEvent.click(screen.getByTestId('encerrar-turno'));
    fireEvent.click(screen.getByTestId('estou-pronto'));
    expect(trocarComRecarga).not.toHaveBeenCalled();

    // Abandonar volta ao menu e libera a versão que estava esperando.
    fireEvent.click(screen.getByTestId('menu-da-partida'));
    fireEvent.click(screen.getByTestId('abandonar'));
    expect(screen.getByTestId('menu-principal')).toBeDefined();
    expect(trocarComRecarga).toHaveBeenCalledWith(true);
  });
});
