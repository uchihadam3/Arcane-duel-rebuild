import type { CondicaoId, EstadoDeCondicoes } from '@arcane-duel/shared-types';
import { CONDICOES } from '@arcane-duel/shared-types';
import { AssetImage } from '@arcane-duel/ui';

/*
 * A bandeja de Condições.
 *
 * As quatro aparecem sempre, mesmo em zero: sumir com uma Condição faz o
 * jogador perder a referência de onde ela estava, e reaparecer no meio de uma
 * troca é pior do que ficar apagada.
 */

const NOME: Readonly<Record<CondicaoId, string>> = {
  queimadura: 'Queimadura',
  lento: 'Lento',
  murchar: 'Murchar',
  sangramento: 'Sangramento',
};

export interface CondicoesProps {
  readonly condicoes: EstadoDeCondicoes;
  readonly compacto?: boolean;
}

export const Condicoes = ({ condicoes, compacto = false }: CondicoesProps): React.JSX.Element => (
  <div className={`condicoes${compacto ? ' condicoes--compacto' : ''}`} data-teste="condicoes">
    <AssetImage assetId="tray-condicoes" alt="" className="condicoes__bandeja" />
    <ul className="condicoes__lista">
      {CONDICOES.map((condicao) => {
        const acumulo = condicoes[condicao];
        return (
          <li
            key={condicao}
            className={`condicao${acumulo > 0 ? ' condicao--ativa' : ''}`}
            data-condicao={condicao}
            aria-label={`${NOME[condicao]}: ${String(acumulo)}`}
          >
            <span className="condicao__nome">{NOME[condicao]}</span>
            <span className="condicao__acumulo">{acumulo}</span>
          </li>
        );
      })}
    </ul>
  </div>
);
