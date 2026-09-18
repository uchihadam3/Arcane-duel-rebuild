import type {
  CardId,
  ClassId,
  CustoDeCarta,
  Nota,
  PassoDeKata,
  PerfilDeHabilidade,
  TagDeCarta,
  TipoDeCarta,
  TipoDeHabilidade,
  ValoresDeAtaque,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';

/**
 * Definição de uma carta do catálogo.
 *
 * Esta é a **fonte autoritativa** dos dados impressos. Nenhum cliente informa
 * custo, Dano, Impacto, tipo ou cooldown: ele informa a identidade da carta e
 * as escolhas legais dela, e o sistema busca o resto aqui. Um cliente que
 * afirme "W03 custa 0 e causa 99" não tem por onde ser acreditado, porque
 * esses campos não viajam na declaração.
 *
 * Nenhum texto ou número desta definição pode ser desenhado dentro de um PNG:
 * a moldura é asset, o conteúdo é dado (ASSET_CATALOG.md §1).
 */
export interface DefinicaoDeCarta {
  readonly id: CardId;
  readonly classe: ClassId;
  readonly nome: string;
  readonly tipo: TipoDeCarta;
  /**
   * Como a carta se comporta quando é jogada. Igual a `tipo` nas habilidades;
   * nas Ultimates é o que diz se aquela Ultimate é Ataque, Técnica ou Reação.
   */
  readonly comportaComo?: TipoDeHabilidade;
  readonly tags: readonly TagDeCarta[];
  /** A Nota impressa na carta. Só o Bardo imprime Nota. */
  readonly nota?: Nota;
  /** O passo de Kata impresso na carta. Só o Monge imprime Kata. */
  readonly kata?: PassoDeKata;
  readonly custo?: CustoDeCarta;
  readonly valores?: ValoresDeAtaque;
  /** Ausente quando a carta não vai para cooldown: Passiva, Carta de Classe, Ultimate. */
  readonly cooldown?: ZonaDeCooldown;
  /** Texto impresso, transcrito de docs/CARD_CATALOG.md. */
  readonly texto: string;
  /** Efeito renovável de uma Carta de Classe. */
  readonly textoAtivar?: string;
  /** Efeito extremo e definitivo de uma Carta de Classe. */
  readonly textoExaurir?: string;
}

export interface CatalogoDeCartas {
  readonly todas: readonly DefinicaoDeCarta[];
  readonly porId: (id: CardId) => DefinicaoDeCarta | undefined;
  readonly porClasse: (classe: ClassId) => readonly DefinicaoDeCarta[];
  readonly porClasseETipo: (classe: ClassId, tipo: TipoDeCarta) => readonly DefinicaoDeCarta[];
}

export const criarCatalogo = (cartas: readonly DefinicaoDeCarta[]): CatalogoDeCartas => {
  const indice = new Map<CardId, DefinicaoDeCarta>();
  for (const carta of cartas) {
    if (indice.has(carta.id)) {
      throw new Error(`Carta duplicada no catálogo: ${carta.id}`);
    }
    indice.set(carta.id, carta);
  }

  return {
    todas: cartas,
    porId: (id) => indice.get(id),
    porClasse: (classe) => cartas.filter((carta) => carta.classe === classe),
    porClasseETipo: (classe, tipo) =>
      cartas.filter((carta) => carta.classe === classe && carta.tipo === tipo),
  };
};

/** Tipos de carta que ocupam espaço de Ação ou de Resposta quando jogadas. */
const JOGAVEIS: readonly TipoDeCarta[] = ['ataque', 'tecnica', 'reacao', 'ultimate'];

/**
 * O perfil impresso de uma carta jogável, montado a partir do catálogo.
 *
 * É o único caminho legítimo até um `PerfilDeHabilidade`: quem quiser resolver
 * uma carta precisa passar por aqui, e o que sai daqui é exatamente o que está
 * impresso.
 */
export const perfilDaDefinicao = (definicao: DefinicaoDeCarta): PerfilDeHabilidade | undefined => {
  if (!JOGAVEIS.includes(definicao.tipo)) return undefined;
  const custo = definicao.custo;
  if (custo === undefined) return undefined;

  const tipo = definicao.comportaComo ?? (definicao.tipo as TipoDeHabilidade);
  return {
    carta: definicao.id,
    tipo,
    tags: definicao.tags,
    ...(definicao.nota === undefined ? {} : { nota: definicao.nota }),
    ...(definicao.kata === undefined ? {} : { kata: definicao.kata }),
    custo,
    // A Ultimate é consumida e sai da partida: ela não tem zona de cooldown.
    cooldown: definicao.cooldown ?? null,
    valores: definicao.valores ?? null,
  };
};
