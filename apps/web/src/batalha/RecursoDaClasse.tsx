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

/**
 * O Momentum como objeto, não como número.
 *
 * Três brasas metálicas numa trilha. Ganhar acende uma; gastar apaga. O número
 * fica no rótulo acessível — quem precisa dele continua tendo, e quem joga
 * olhando vê a ficha acender.
 */
const MomentumDoGuerreiro = ({ momentum }: { readonly momentum: number }): React.JSX.Element => (
  <div className="recurso recurso--momentum" data-recurso="momentum">
    <span className="recurso__rotulo">Momentum</span>
    <span className="recurso__pecas" aria-label={`Momentum: ${String(momentum)} de 3`}>
      {[0, 1, 2].map((indice) => (
        <span
          key={indice}
          className={`brasa${indice < momentum ? ' brasa--acesa' : ''}`}
          aria-hidden="true"
        />
      ))}
    </span>
  </div>
);

/**
 * A Mana como medidor arcano de seis segmentos.
 *
 * Recuperar preenche de baixo para cima, gastar esvazia. É deliberadamente
 * diferente das brasas do Guerreiro: as duas classes não podem ler igual.
 */
const ManaDoMago = ({ mana }: { readonly mana: number }): React.JSX.Element => (
  <div className="recurso recurso--mana" data-recurso="mana">
    <span className="recurso__rotulo">Mana</span>
    <span className="recurso__pecas" aria-label={`Mana: ${String(mana)} de 6`}>
      {[0, 1, 2, 3, 4, 5].map((indice) => (
        <span
          key={indice}
          className={`orbe${indice < mana ? ' orbe--cheio' : ''}`}
          aria-hidden="true"
        />
      ))}
    </span>
    <span className="recurso__numero">{mana}</span>
  </div>
);

export interface RecursoDaClasseProps {
  readonly recurso: RecursoProjetado;
  /** A Guarda atual: o combustível do Bárbaro vive no estado do jogador. */
  readonly guarda: number;
}

export const RecursoDaClasse = ({ recurso, guarda }: RecursoDaClasseProps): React.JSX.Element => {
  switch (recurso.classe) {
    case 'guerreiro':
      return <MomentumDoGuerreiro momentum={recurso.momentum} />;

    case 'mago':
      return <ManaDoMago mana={recurso.mana} />;

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
