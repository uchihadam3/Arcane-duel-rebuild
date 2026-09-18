export interface AvisoDeOrientacaoProps {
  readonly visivel: boolean;
}

/**
 * Pede a rotação do aparelho em vez de comprimir o campo.
 *
 * Menus funcionam em portrait; a batalha não (FULL_GAME_SPEC.md §42). Quando
 * não é para aparecer, o aviso não fica escondido por CSS: ele simplesmente
 * não é renderizado, e o campo volta sozinho quando o aparelho gira.
 */
export const AvisoDeOrientacao = ({
  visivel,
}: AvisoDeOrientacaoProps): React.JSX.Element | null => {
  if (!visivel) return null;

  return (
    <div className="aviso-de-orientacao" data-visivel="true" data-teste="aviso-de-orientacao">
      <div>
        <h2>Gire o aparelho</h2>
        <p>O Arcane Duel é jogado em landscape, com o campo inteiro visível de uma só vez.</p>
      </div>
    </div>
  );
};
