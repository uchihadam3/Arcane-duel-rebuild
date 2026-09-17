import { useState } from 'react';

import { useInstalacao } from '../hooks/useInstalacao.js';

/**
 * Oferece a instalação da PWA real — não há APK, não há instalador falso.
 *
 * O botão só aparece quando o navegador realmente pode instalar. No iPhone e
 * no iPad, onde o Safari não expõe o evento, entra uma instrução discreta com
 * o caminho manual. Quando o jogo já está instalado, nada disso aparece.
 */
export const BotaoDeInstalacao = (): React.JSX.Element | null => {
  const { forma, instalar } = useInstalacao();
  const [recusado, setRecusado] = useState(false);

  if (forma === 'ja-instalado') return null;

  if (recusado) {
    // O evento do navegador só vale uma vez. Depois de recusado, ele some, e
    // dizer "clique de novo" seria mentira: o Chrome só oferece outro na
    // próxima visita.
    return (
      <p className="instalacao-aviso">
        Instalação recusada. Recarregue a página para o navegador oferecer de novo.
      </p>
    );
  }

  if (forma === 'instrucao-manual') {
    return (
      <p className="instalacao-aviso">Para instalar: Compartilhar → Adicionar à Tela de Início.</p>
    );
  }

  if (forma !== 'prompt-do-navegador') return null;

  return (
    <button
      type="button"
      className="botao-instalar"
      onClick={() => {
        void instalar().then((resultado) => {
          if (resultado === 'recusada') setRecusado(true);
        });
      }}
    >
      Instalar Arcane Duel
    </button>
  );
};
