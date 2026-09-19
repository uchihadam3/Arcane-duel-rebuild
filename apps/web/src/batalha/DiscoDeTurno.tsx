/*
 * O disco de turno.
 *
 * Estado e ação no mesmo lugar, na borda alcançável pelo polegar: AP restante,
 * Ações usadas no turno e o botão que fecha o turno. O vídeo de referência
 * mostra essa peça como uma das soluções mais fortes da interface dele — o
 * jogador nunca precisa procurar "e agora?".
 *
 * Ela é uma peça do jogo, e não um botão de formulário: anel, ranhura e
 * ponteiro desenhados em código, com a cor da classe de quem está jogando.
 */

export type AcaoDoDisco = 'encerrar-turno' | 'enviar-acao' | 'aguardando' | 'nenhuma';

export interface DiscoDeTurnoProps {
  readonly turno: number;
  readonly pontosDeAcao: number;
  readonly acoesUsadas: number;
  readonly acoesPermitidas: number;
  readonly corDaClasse: string;
  readonly acao: AcaoDoDisco;
  readonly aoTocar: () => void;
  readonly desabilitado: boolean;
}

const ROTULO: Readonly<Record<AcaoDoDisco, string>> = {
  'encerrar-turno': 'Encerrar turno',
  'enviar-acao': 'Enviar Ação',
  aguardando: 'Aguardando',
  nenhuma: '—',
};

const TESTE: Readonly<Record<AcaoDoDisco, string | undefined>> = {
  'encerrar-turno': 'encerrar-turno',
  'enviar-acao': 'enviar-acao',
  aguardando: undefined,
  nenhuma: undefined,
};

export const DiscoDeTurno = ({
  turno,
  pontosDeAcao,
  acoesUsadas,
  acoesPermitidas,
  corDaClasse,
  acao,
  aoTocar,
  desabilitado,
}: DiscoDeTurnoProps): React.JSX.Element => {
  const fracao = acoesPermitidas <= 0 ? 0 : acoesUsadas / acoesPermitidas;

  return (
    <div className="disco" style={{ ['--cor-da-classe' as string]: corDaClasse }}>
      <div
        className="disco__anel"
        style={{ ['--voltas' as string]: `${String(Math.round(fracao * 360))}deg` }}
        aria-hidden="true"
      />
      <div className="disco__miolo">
        <span className="disco__turno">TURNO {turno}</span>
        <span className="disco__ap" aria-label={`Pontos de Ação: ${String(pontosDeAcao)}`}>
          {pontosDeAcao}
          <i>AP</i>
        </span>
        <span
          className="disco__acoes"
          aria-label={`Ações: ${String(acoesUsadas)} de ${String(acoesPermitidas)}`}
        >
          {acoesUsadas}/{acoesPermitidas}
        </span>
      </div>
      <button
        type="button"
        className={`disco__botao disco__botao--${acao}`}
        onClick={aoTocar}
        disabled={desabilitado || acao === 'aguardando' || acao === 'nenhuma'}
        data-teste={TESTE[acao]}
      >
        {ROTULO[acao]}
      </button>
    </div>
  );
};
