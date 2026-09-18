/*
 * Os números que ficam sempre à vista.
 *
 * Vida, Guarda, AP e Reserva mudam **no instante em que o estado muda** — a
 * transição é decoração e nunca atrasa o valor. É por isso que o número é
 * texto comum e a animação vive só na classe CSS.
 */

export type TomDoMedidor = 'vida' | 'guarda' | 'acao' | 'reserva' | 'neutro';

export interface MedidorProps {
  readonly rotulo: string;
  readonly valor: number;
  readonly maximo?: number;
  readonly tom?: TomDoMedidor;
  readonly compacto?: boolean;
}

export const Medidor = ({
  rotulo,
  valor,
  maximo,
  tom = 'neutro',
  compacto = false,
}: MedidorProps): React.JSX.Element => (
  <div
    className={`medidor medidor--${tom}${compacto ? ' medidor--compacto' : ''}`}
    data-medidor={rotulo}
  >
    <span className="medidor__rotulo">{rotulo}</span>
    <span className="medidor__valor" aria-label={`${rotulo}: ${String(valor)}`}>
      {valor}
      {maximo !== undefined && <span className="medidor__maximo">/{maximo}</span>}
    </span>
    {maximo !== undefined && maximo > 0 && (
      <span className="medidor__barra" aria-hidden="true">
        <span
          className="medidor__preenchimento"
          style={{ inlineSize: `${String(Math.max(0, Math.min(100, (valor / maximo) * 100)))}%` }}
        />
      </span>
    )}
  </div>
);

export interface FichasProps {
  readonly rotulo: string;
  readonly total: number;
  readonly cheias: number;
  readonly tom?: TomDoMedidor;
}

/** Fichas contáveis: Momentum, Brechas, Almas, Chi. */
export const Fichas = ({
  rotulo,
  total,
  cheias,
  tom = 'neutro',
}: FichasProps): React.JSX.Element => (
  <div className={`fichas fichas--${tom}`} data-fichas={rotulo}>
    <span className="fichas__rotulo">{rotulo}</span>
    <span className="fichas__linha" aria-label={`${rotulo}: ${String(cheias)} de ${String(total)}`}>
      {Array.from({ length: total }, (_, indice) => (
        <span
          key={indice}
          className={`ficha${indice < cheias ? ' ficha--cheia' : ''}`}
          aria-hidden="true"
        />
      ))}
    </span>
  </div>
);

export interface TrilhaProps {
  readonly rotulo: string;
  readonly etapas: readonly string[];
  readonly atual: string;
}

/** Trilhas de estado: Devoção, Juramento, Forma, Kata. */
export const Trilha = ({ rotulo, etapas, atual }: TrilhaProps): React.JSX.Element => (
  <div className="trilha" data-trilha={rotulo}>
    <span className="trilha__rotulo">{rotulo}</span>
    <span className="trilha__etapas" aria-label={`${rotulo}: ${atual}`}>
      {etapas.map((etapa) => (
        <span
          key={etapa}
          className={`trilha__etapa${etapa === atual ? ' trilha__etapa--atual' : ''}`}
        >
          {etapa}
        </span>
      ))}
    </span>
  </div>
);
