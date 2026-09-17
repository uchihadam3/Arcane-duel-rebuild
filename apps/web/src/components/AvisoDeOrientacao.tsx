export interface AvisoDeOrientacaoProps {
  readonly visivel: boolean;
}

/**
 * Pede a rotação do aparelho em vez de comprimir o campo. Menus podem funcionar
 * em portrait, mas a batalha não (FULL_GAME_SPEC.md §42).
 */
export const AvisoDeOrientacao = ({ visivel }: AvisoDeOrientacaoProps): React.JSX.Element => (
  <div
    className="aviso-de-orientacao"
    data-visivel={visivel ? 'true' : 'false'}
    aria-hidden={!visivel}
  >
    <div>
      <h2>Gire o aparelho</h2>
      <p>O Arcane Duel é jogado em landscape, com o campo inteiro visível de uma só vez.</p>
    </div>
  </div>
);
