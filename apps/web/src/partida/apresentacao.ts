import type { CardId, ClassId, TipoDeCarta, ZonaDeCooldown } from '@arcane-duel/shared-types';
import { CLASSES, definicaoDe } from '@arcane-duel/card-data';

/*
 * Do identificador ao que o jogador lê.
 *
 * Nenhum número, texto ou tipo é escrito aqui: tudo vem do catálogo. O que
 * este arquivo faz é montar, a partir dele, a forma que os componentes de
 * apresentação esperam — e garantir que **nada** na tela de batalha precise
 * conhecer um CardId para funcionar.
 */

export type MoedaVisivel = 'ap' | 'reserva';

export interface CustoVisivel {
  readonly moeda: MoedaVisivel;
  readonly valor: number;
  /** "+1 Mana", "+1 a 3 Momentum" — a parcela em recurso de classe. */
  readonly recurso: string | null;
}

export interface CartaVisivel {
  readonly id: CardId;
  readonly nome: string;
  readonly tipo: TipoDeCarta;
  readonly classe: ClassId;
  readonly custo: CustoVisivel | null;
  readonly dano: number | null;
  readonly impacto: number | null;
  readonly cooldown: ZonaDeCooldown | null;
  readonly texto: string;
  readonly textoAtivar: string | null;
  readonly textoExaurir: string | null;
  readonly tags: readonly string[];
}

const NOME_DO_RECURSO: Readonly<Record<string, string>> = {
  momentum: 'Momentum',
  mana: 'Mana',
  alma: 'Alma',
  chi: 'Chi',
  vida: 'Vida',
  guarda: 'Guarda',
};

const nomeDoRecurso = (recurso: string): string => NOME_DO_RECURSO[recurso] ?? recurso;

const descreverRecurso = (
  fixa: { readonly recurso: string; readonly quantidade: number } | undefined,
  variavel:
    { readonly recurso: string; readonly minimo: number; readonly maximo: number } | undefined,
): string | null => {
  const partes: string[] = [];
  if (fixa !== undefined && fixa.quantidade > 0) {
    partes.push(`${String(fixa.quantidade)} ${nomeDoRecurso(fixa.recurso)}`);
  }
  if (variavel !== undefined) {
    partes.push(
      variavel.minimo === variavel.maximo
        ? `${String(variavel.maximo)} ${nomeDoRecurso(variavel.recurso)}`
        : `${String(variavel.minimo)} a ${String(variavel.maximo)} ${nomeDoRecurso(variavel.recurso)}`,
    );
  }
  return partes.length === 0 ? null : partes.join(' + ');
};

/** A carta como a tela a mostra. `null` só para identificador fora do catálogo. */
export const cartaVisivel = (id: CardId): CartaVisivel | null => {
  const definicao = definicaoDe(id);
  if (definicao === undefined) return null;

  const custo = definicao.custo;
  return {
    id,
    nome: definicao.nome,
    tipo: definicao.tipo,
    classe: definicao.classe,
    custo:
      custo === undefined
        ? null
        : {
            moeda: custo.moeda,
            valor: custo.valor,
            recurso: descreverRecurso(custo.recurso, custo.variavel),
          },
    dano: definicao.valores?.dano ?? null,
    impacto: definicao.valores?.impacto ?? null,
    cooldown: definicao.cooldown ?? null,
    texto: definicao.texto,
    textoAtivar: definicao.textoAtivar ?? null,
    textoExaurir: definicao.textoExaurir ?? null,
    tags: definicao.tags,
  };
};

/** O nome humano de uma carta; o identificador nunca chega à tela de batalha. */
export const nomeDaCarta = (id: CardId): string => definicaoDe(id)?.nome ?? 'Carta desconhecida';

export const NOME_DO_TIPO: Readonly<Record<TipoDeCarta, string>> = {
  ataque: 'Ataque',
  tecnica: 'Técnica',
  reacao: 'Reação',
  passiva: 'Passiva',
  'carta-de-classe': 'Carta de Classe',
  ultimate: 'Ultimate',
  personagem: 'Personagem',
};

/** A moldura aprovada de cada tipo (docs/ASSET_CATALOG.md). */
export const MOLDURA_DO_TIPO: Readonly<Record<TipoDeCarta, string>> = {
  ataque: 'card-frame-ataque',
  tecnica: 'card-frame-tecnica',
  reacao: 'card-frame-reacao',
  passiva: 'card-frame-passiva',
  'carta-de-classe': 'card-frame-classe',
  ultimate: 'card-frame-ultimate',
  // O Personagem não é carta jogável do catálogo; ele nunca entra na mão.
  personagem: 'card-frame-classe',
};

export interface ClasseVisivel {
  readonly id: ClassId;
  readonly nome: string;
  readonly componente: string;
  /** Uma frase curta, transcrita do descritor da classe. */
  readonly resumo: string;
}

export const CLASSES_VISIVEIS: readonly ClasseVisivel[] = CLASSES.map((classe) => ({
  id: classe.id,
  nome: classe.nome,
  componente: classe.componente.nome,
  resumo: classe.componente.resumo,
}));

export const classeVisivel = (id: ClassId): ClasseVisivel => {
  const encontrada = CLASSES_VISIVEIS.find((item) => item.id === id);
  if (encontrada === undefined) throw new Error(`classe fora do catálogo: ${id}`);
  return encontrada;
};

export const nomeDaClasse = (id: ClassId): string => classeVisivel(id).nome;
