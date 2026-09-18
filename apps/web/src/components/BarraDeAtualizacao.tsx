import type { AtualizacaoDoCliente } from '../hooks/useAtualizacaoDoCliente.js';

/*
 * O que a tela diz sobre a atualização.
 *
 * Fora de uma partida, atualizar é automático: a barra existe para o jogador
 * ver que está acontecendo, e para oferecer o botão de emergência quando a
 * troca automática não puder ser feita.
 */

export interface BarraDeAtualizacaoProps {
  readonly atualizacao: AtualizacaoDoCliente;
}

export const BarraDeAtualizacao = ({
  atualizacao,
}: BarraDeAtualizacaoProps): React.JSX.Element | null => {
  if (atualizacao.estado === 'em-dia' || atualizacao.estado === 'verificando') return null;

  if (atualizacao.estado === 'aplicando') {
    return (
      <div className="barra-de-atualizacao" role="status" data-estado="aplicando">
        <span>Atualizando para a versão mais recente…</span>
      </div>
    );
  }

  return (
    <div className="barra-de-atualizacao" role="status" data-estado="pendente">
      <span>Uma versão nova está pronta e será aplicada quando for seguro.</span>
      <button
        type="button"
        onClick={() => {
          atualizacao.aplicarAgora();
        }}
      >
        Atualizar agora
      </button>
    </div>
  );
};
