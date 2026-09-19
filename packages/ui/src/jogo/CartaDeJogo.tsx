import { AssetImage } from '../components/AssetImage.js';

/*
 * A carta digital.
 *
 * O componente é puramente visual: ele não conhece catálogo, regra nem
 * identificador de carta. Tudo o que aparece impresso chega por propriedade,
 * porque nome, custo, Dano, Impacto e cooldown vêm do código e **nunca** estão
 * assados dentro da imagem — a moldura é o asset aprovado, o resto é texto.
 *
 * As regiões abaixo são as da moldura aprovada, em porcentagem: o disco
 * superior esquerdo é o custo, a faixa clara ao lado é o nome, a janela
 * central é a arte, a faixa vermelha é o tipo, a caixa clara é o texto e as
 * duas placas escuras do pé são Dano e Impacto. Nada é posicionado "no olho":
 * cada número tem o lugar que a moldura desenhou para ele.
 */

export type EstadoDeSelecao = 'nenhum' | 'selecionavel' | 'selecionada' | 'alvo-valido';

export type TamanhoDaCarta = 'mao' | 'campo' | 'inspecao' | 'miniatura';

export interface CartaDeJogoProps {
  readonly nome: string;
  /** Rótulo humano do tipo, já traduzido. */
  readonly tipo: string;
  /** Id do asset da moldura aprovada do tipo. */
  readonly moldura: string;
  readonly custo?: string | null;
  readonly dano?: number | null;
  readonly impacto?: number | null;
  readonly cooldown?: number | null;
  /** O texto impresso. Só aparece nos tamanhos que o comportam. */
  readonly texto?: string | null;
  readonly tamanho?: TamanhoDaCarta;
  readonly selecao?: EstadoDeSelecao;
  readonly indisponivel?: boolean;
  /** Girada em 90°: Carta de Classe Ativada, Passiva Ativada. */
  readonly deitada?: boolean;
  readonly aoTocar?: (() => void) | undefined;
  readonly rotuloDeAcesso?: string | undefined;
  /**
   * O que preenche a janela de arte.
   *
   * O componente não sabe desenhar arte e não deve saber: quem monta a carta é
   * que decide o que entra ali — a ilustração aprovada, quando existir, ou a
   * composição procedural que a substitui até lá. Vazio, a janela fica com o
   * fundo neutro.
   */
  readonly arte?: React.ReactNode | undefined;
}

const OVERLAY: Readonly<Partial<Record<EstadoDeSelecao, string>>> = {
  selecionavel: 'overlay-selecionavel',
  selecionada: 'overlay-selecionado',
  'alvo-valido': 'overlay-alvo-valido',
};

export const CartaDeJogo = ({
  nome,
  tipo,
  moldura,
  custo = null,
  dano = null,
  impacto = null,
  cooldown = null,
  texto = null,
  tamanho = 'mao',
  selecao = 'nenhum',
  indisponivel = false,
  deitada = false,
  aoTocar,
  rotuloDeAcesso,
  arte,
}: CartaDeJogoProps): React.JSX.Element => {
  const overlay = OVERLAY[selecao];
  const conteudo = (
    <>
      {/* A janela de arte: a composição que quem monta a carta entregou, ou o
          fundo neutro. Arte de habilidade nunca é inventada aqui. */}
      <span className="carta__arte" aria-hidden="true">
        {arte}
      </span>
      <AssetImage assetId={moldura} alt="" className="carta__moldura" />

      {custo !== null && <span className="carta__custo">{custo}</span>}
      {cooldown !== null && <span className="carta__cooldown">{cooldown}</span>}
      <span className="carta__nome">{nome}</span>
      <span className="carta__tipo">{tipo}</span>
      {texto !== null && <span className="carta__texto">{texto}</span>}
      {dano !== null && (
        <span className="carta__valor carta__valor--dano">
          {dano}
          <i>D</i>
        </span>
      )}
      {impacto !== null && (
        <span className="carta__valor carta__valor--impacto">
          {impacto}
          <i>I</i>
        </span>
      )}

      {overlay !== undefined && <AssetImage assetId={overlay} alt="" className="carta__enfase" />}
    </>
  );

  const classe = [
    'carta',
    `carta--${tamanho}`,
    selecao !== 'nenhum' ? `carta--${selecao}` : '',
    indisponivel ? 'carta--indisponivel' : '',
    deitada ? 'carta--deitada' : '',
  ]
    .filter((parte) => parte !== '')
    .join(' ');

  if (aoTocar === undefined) {
    return (
      <div className={classe} data-carta={nome}>
        {conteudo}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={classe}
      data-carta={nome}
      aria-pressed={selecao === 'selecionada'}
      aria-label={rotuloDeAcesso ?? `${nome}, ${tipo}`}
      onClick={aoTocar}
    >
      {conteudo}
    </button>
  );
};

export interface CartaViradaProps {
  readonly tamanho?: TamanhoDaCarta;
  /** O que esta carta virada representa, para leitor de tela. */
  readonly rotuloDeAcesso: string;
  readonly aoTocar?: (() => void) | undefined;
}

/**
 * Uma carta face-down.
 *
 * Ela não recebe — e não pode receber — a identidade da carta: quando o
 * observador não tem direito de conhecê-la, o dado não chega até aqui.
 */
export const CartaVirada = ({
  tamanho = 'mao',
  rotuloDeAcesso,
  aoTocar,
}: CartaViradaProps): React.JSX.Element => {
  const conteudo = <AssetImage assetId="card-back" alt="" className="carta__moldura" />;
  const classe = `carta carta--${tamanho} carta--virada`;

  return aoTocar === undefined ? (
    <div className={classe} aria-label={rotuloDeAcesso} role="img">
      {conteudo}
    </div>
  ) : (
    <button type="button" className={classe} aria-label={rotuloDeAcesso} onClick={aoTocar}>
      {conteudo}
    </button>
  );
};
