import type {
  CardId,
  ClassId,
  CustoDeCarta,
  TipoDeCarta,
  ValoresDeAtaque,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';

/**
 * Definição de uma carta do catálogo.
 *
 * Nenhum texto ou número desta definição pode ser desenhado dentro de um PNG:
 * a moldura é asset, o conteúdo é dado (ASSET_CATALOG.md §1).
 */
export interface DefinicaoDeCarta {
  readonly id: CardId;
  readonly classe: ClassId;
  readonly nome: string;
  readonly tipo: TipoDeCarta;
  readonly custo?: CustoDeCarta;
  readonly valores?: ValoresDeAtaque;
  readonly cooldown?: ZonaDeCooldown;
  readonly texto: string;
}

export interface CatalogoDeCartas {
  readonly todas: readonly DefinicaoDeCarta[];
  readonly porId: (id: CardId) => DefinicaoDeCarta | undefined;
  readonly porClasse: (classe: ClassId) => readonly DefinicaoDeCarta[];
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
  };
};

/**
 * Catálogo vazio por enquanto.
 *
 * As cartas do CARD_CATALOG.md entram junto com as regras de cada uma e com os
 * seus testes unitários (ROADMAP_CODEX.md, etapas três e quatro). Carregar o
 * catálogo antes disso criaria dados sem comportamento verificado.
 */
export const CATALOGO = criarCatalogo([]);
