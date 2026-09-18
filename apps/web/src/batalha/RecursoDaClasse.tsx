import type { RecursoProjetado } from '@arcane-duel/shared-types';
import { Fichas, Medidor, Trilha } from '@arcane-duel/ui';

/*
 * O componente próprio de cada classe.
 *
 * Nenhuma classe recebe uma barra genérica: o Momentum é ficha, a Devoção é
 * trilha, o Chi é pedra e a Emboscada é carta face-down. O `switch` é
 * discriminado pelo campo `classe`, então o compilador garante que as doze
 * formas estejam cobertas e que nenhuma leia o recurso de outra.
 */

const ETAPAS_DE_DEVOCAO = ['Vigília', 'Graça', 'Fervor', 'Milagre'];
const NOME_DA_DEVOCAO: Readonly<Record<string, string>> = {
  vigilia: 'Vigília',
  graca: 'Graça',
  fervor: 'Fervor',
  milagre: 'Milagre',
};

const ETAPAS_DE_JURAMENTO = ['Vacilante', 'Resoluto', 'Inabalável'];
const NOME_DO_JURAMENTO: Readonly<Record<string, string>> = {
  vacilante: 'Vacilante',
  resoluto: 'Resoluto',
  inabalavel: 'Inabalável',
};

const NOME_DA_NOTA: Readonly<Record<string, string>> = {
  pulso: 'Pulso',
  melodia: 'Melodia',
  harmonia: 'Harmonia',
};

const NOME_DO_PASSO: Readonly<Record<string, string>> = {
  abertura: 'Abertura',
  fluxo: 'Fluxo',
  finalizacao: 'Finalização',
};

export interface RecursoDaClasseProps {
  readonly recurso: RecursoProjetado;
  /** A Guarda atual: o combustível do Bárbaro vive no estado do jogador. */
  readonly guarda: number;
}

export const RecursoDaClasse = ({ recurso, guarda }: RecursoDaClasseProps): React.JSX.Element => {
  switch (recurso.classe) {
    case 'guerreiro':
      return <Fichas rotulo="Momentum" total={3} cheias={recurso.momentum} tom="acao" />;

    case 'mago':
      return <Medidor rotulo="Mana" valor={recurso.mana} maximo={6} tom="acao" compacto />;

    case 'clerigo':
      return (
        <Trilha
          rotulo="Devoção"
          etapas={ETAPAS_DE_DEVOCAO}
          atual={NOME_DA_DEVOCAO[recurso.devocao] ?? recurso.devocao}
        />
      );

    case 'necromante':
      return (
        <div className="recurso recurso--necromante">
          <Fichas rotulo="Almas" total={4} cheias={recurso.almasControladas} tom="acao" />
          <span className="recurso__nota">
            Cemitério {recurso.almasNoCemiterio} · anexadas {recurso.almasAnexadas.length}
          </span>
        </div>
      );

    case 'paladino':
      return (
        <Trilha
          rotulo="Juramento"
          etapas={ETAPAS_DE_JURAMENTO}
          atual={NOME_DO_JURAMENTO[recurso.juramento] ?? recurso.juramento}
        />
      );

    case 'ladino':
      return <Fichas rotulo="Brechas" total={3} cheias={recurso.brechasNoAdversario} tom="acao" />;

    case 'bardo':
      return (
        <div className="recurso recurso--bardo">
          <span className="recurso__rotulo">Notas</span>
          <span className="recurso__sequencia">
            {recurso.sequenciaDeNotas.length === 0
              ? '—'
              : recurso.sequenciaDeNotas.map((nota) => NOME_DA_NOTA[nota] ?? nota).join(' › ')}
          </span>
          <span className="recurso__nota">Cadências {recurso.cadenciasNoTurno}</span>
        </div>
      );

    case 'monge':
      return (
        <div className="recurso recurso--monge">
          <Fichas
            rotulo="Chi"
            total={3}
            cheias={recurso.chi.filter((pedra) => pedra === 'pronta').length}
            tom="acao"
          />
          <span className="recurso__nota">
            Kata{' '}
            {recurso.sequenciaDeKata.length === 0
              ? '—'
              : recurso.sequenciaDeKata.map((passo) => NOME_DO_PASSO[passo] ?? passo).join(' › ')}
          </span>
        </div>
      );

    case 'patrulheiro':
      return (
        <div className="recurso recurso--patrulheiro">
          <span className={`marca${recurso.marcaDaPresa ? ' marca--ativa' : ''}`}>
            Marca da Presa {recurso.marcaDaPresa ? 'aplicada' : 'ausente'}
          </span>
          {recurso.emboscada !== null && (
            <span className="recurso__nota" data-teste="emboscada">
              Emboscada {recurso.emboscada.estado === 'armada' ? 'armada' : 'preparada'}
              {recurso.emboscada.carta.visivel ? '' : ' · carta face-down'}
            </span>
          )}
        </div>
      );

    case 'barbaro':
      return (
        <div className="recurso recurso--barbaro">
          <Medidor rotulo="Guarda" valor={guarda} maximo={6} tom="guarda" compacto />
          <span className="recurso__nota">
            Reduzida no turno {recurso.guardaReduzidaVoluntariamenteNoTurno}
          </span>
        </div>
      );

    case 'druida':
      return (
        <div className="recurso recurso--druida">
          <Trilha
            rotulo="Forma"
            etapas={['Humana', 'Selvagem']}
            atual={recurso.forma === 'humana' ? 'Humana' : 'Selvagem'}
          />
          <span className="recurso__nota">
            {recurso.metamorfoseGratuitaUsadaNoTurno
              ? 'Metamorfose gratuita usada'
              : 'Metamorfose gratuita disponível'}
          </span>
        </div>
      );

    case 'bruxo':
      return (
        <div className="recurso recurso--bruxo">
          <span className="recurso__rotulo">Preço Proibido</span>
          <span className="recurso__nota">
            {recurso.precoProibidoUsadoNoTurno ? 'usado neste turno' : 'disponível'}
          </span>
        </div>
      );
  }
};
