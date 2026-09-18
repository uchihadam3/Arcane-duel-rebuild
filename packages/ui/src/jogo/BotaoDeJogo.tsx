/*
 * O botão da batalha.
 *
 * Ele não pode ser confundido com uma carta, precisa caber no polegar e
 * precisa dizer o que faz por texto — não só por cor. Os estados `pressed`,
 * `disabled` e `focus` são visíveis porque um deles é a única resposta que o
 * jogador recebe ao tocar.
 */

export type TomDoBotao = 'principal' | 'secundario' | 'perigo' | 'discreto';

export interface BotaoDeJogoProps {
  readonly children: React.ReactNode;
  readonly aoTocar: () => void;
  readonly tom?: TomDoBotao | undefined;
  readonly desabilitado?: boolean | undefined;
  readonly rotuloDeAcesso?: string | undefined;
  readonly largo?: boolean | undefined;
  readonly dadoDeTeste?: string | undefined;
}

export const BotaoDeJogo = ({
  children,
  aoTocar,
  tom = 'secundario',
  desabilitado = false,
  rotuloDeAcesso,
  largo = false,
  dadoDeTeste,
}: BotaoDeJogoProps): React.JSX.Element => (
  <button
    type="button"
    className={`botao botao--${tom}${largo ? ' botao--largo' : ''}`}
    onClick={aoTocar}
    disabled={desabilitado}
    aria-label={rotuloDeAcesso}
    data-teste={dadoDeTeste}
  >
    {children}
  </button>
);
