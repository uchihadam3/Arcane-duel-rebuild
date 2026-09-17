import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Atualização controlada pelo jogador.
 *
 * O service worker baixa a versão nova em segundo plano, mas a troca só
 * acontece quando o jogador aceita — recarregar sozinho no meio de uma partida
 * seria perder a partida.
 */
export const BarraDeAtualizacao = (): React.JSX.Element | null => {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();

  if (!precisaAtualizar) return null;

  return (
    <div className="barra-de-atualizacao" role="status">
      <span>Uma versão nova do cliente está pronta.</span>
      <span>
        <button
          type="button"
          onClick={() => {
            void updateServiceWorker(true);
          }}
        >
          Atualizar agora
        </button>{' '}
        <button
          type="button"
          onClick={() => {
            setPrecisaAtualizar(false);
          }}
        >
          Depois
        </button>
      </span>
    </div>
  );
};
