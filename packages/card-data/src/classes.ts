import type { CardId, ClassId } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';

/**
 * Forma do componente próprio de cada classe. Nenhuma classe recebe uma barra
 * genérica de recurso (FULL_GAME_SPEC.md §5).
 */
export type FormaDoComponente =
  'fichas' | 'pontos' | 'trilha' | 'estados' | 'forma' | 'marca' | 'guarda' | 'vida' | 'sequencia';

export interface ComponenteDeClasse {
  readonly nome: string;
  readonly forma: FormaDoComponente;
  /** Resumo literal da mecânica, conforme FULL_GAME_SPEC.md §16. */
  readonly resumo: string;
}

export interface DescritorDeClasse {
  readonly id: ClassId;
  readonly nome: string;
  readonly componente: ComponenteDeClasse;
  /**
   * Identidade técnica da carta de Personagem da classe.
   *
   * O estado da partida exige um Personagem (§3, §4), mas o CARD_CATALOG.md não
   * fornece dados de Personagem para classe nenhuma: não há custo, valores,
   * cooldown nem texto impresso para transcrever. Inventar esses dados seria
   * criar carta, então o Personagem vive **fora** do catálogo jogável — aqui,
   * como um identificador estável e mais nada.
   *
   * Quando o documento trouxer as cartas de Personagem, elas entram no catálogo
   * com os dados reais e este campo passa a apontar para elas.
   */
  readonly personagem: CardId;
}

/** As doze classes do lançamento inicial (FULL_GAME_SPEC.md §2 e §16). */
export const CLASSES: readonly DescritorDeClasse[] = [
  {
    id: 'guerreiro',
    personagem: cardId('personagem:guerreiro'),
    nome: 'Guerreiro',
    componente: {
      nome: 'Momentum',
      forma: 'fichas',
      resumo: 'No máximo três fichas. Começa sem Momentum.',
    },
  },
  {
    id: 'mago',
    personagem: cardId('personagem:mago'),
    nome: 'Mago',
    componente: {
      nome: 'Mana',
      forma: 'pontos',
      resumo: 'Vai até seis. Começa com quatro e recupera duas no início do próprio turno.',
    },
  },
  {
    id: 'clerigo',
    personagem: cardId('personagem:clerigo'),
    nome: 'Clérigo',
    componente: {
      nome: 'Devoção',
      forma: 'trilha',
      resumo: 'Trilha de Vigília, Graça, Fervor e Milagre. Começa em Vigília.',
    },
  },
  {
    id: 'necromante',
    personagem: cardId('personagem:necromante'),
    nome: 'Necromante',
    componente: {
      nome: 'Almas',
      forma: 'fichas',
      resumo: 'Quatro fichas de Alma: começa controlando duas, com duas no Cemitério de Almas.',
    },
  },
  {
    id: 'paladino',
    personagem: cardId('personagem:paladino'),
    nome: 'Paladino',
    componente: {
      nome: 'Juramento',
      forma: 'estados',
      resumo: 'Três estados: Vacilante, Resoluto e Inabalável. Começa Resoluto.',
    },
  },
  {
    id: 'ladino',
    personagem: cardId('personagem:ladino'),
    nome: 'Ladino',
    componente: {
      nome: 'Brechas',
      forma: 'fichas',
      resumo:
        'Até três fichas de Brecha sobre o adversário. Não são Condições e desaparecem no fim do turno do Ladino.',
    },
  },
  {
    id: 'bardo',
    personagem: cardId('personagem:bardo'),
    nome: 'Bardo',
    componente: {
      nome: 'Cadência',
      forma: 'sequencia',
      resumo:
        'Não possui recurso numérico. Notas de Pulso, Melodia e Harmonia em sequência criam Cadência.',
    },
  },
  {
    id: 'monge',
    personagem: cardId('personagem:monge'),
    nome: 'Monge',
    componente: {
      nome: 'Chi',
      forma: 'fichas',
      resumo: 'Exatamente três pedras de Chi, todas começando Prontas.',
    },
  },
  {
    id: 'patrulheiro',
    personagem: cardId('personagem:patrulheiro'),
    nome: 'Patrulheiro',
    componente: {
      nome: 'Marca da Presa',
      forma: 'marca',
      resumo: 'Uma única Marca, colocada sobre o adversário.',
    },
  },
  {
    id: 'barbaro',
    personagem: cardId('personagem:barbaro'),
    nome: 'Bárbaro',
    componente: {
      nome: 'Fúria',
      forma: 'guarda',
      resumo:
        'Usa a própria Guarda como combustível: Contido (4–6), Enfurecido (1–3) e Desencadeado (0).',
    },
  },
  {
    id: 'druida',
    personagem: cardId('personagem:druida'),
    nome: 'Druida',
    componente: {
      nome: 'Forma',
      forma: 'forma',
      resumo: 'Administra Forma, não recurso. Começa em Forma Humana.',
    },
  },
  {
    id: 'bruxo',
    personagem: cardId('personagem:bruxo'),
    nome: 'Bruxo',
    componente: {
      nome: 'Preço Proibido',
      forma: 'vida',
      resumo: 'Usa a própria Vida como preço. A perda de Vida como custo não é Dano.',
    },
  },
];

const PORCLASSE = new Map<ClassId, DescritorDeClasse>(CLASSES.map((classe) => [classe.id, classe]));

export const obterClasse = (id: ClassId): DescritorDeClasse => {
  const classe = PORCLASSE.get(id);
  if (classe === undefined) {
    throw new Error(`Classe desconhecida: ${id}`);
  }
  return classe;
};

export const CLASS_IDS: readonly ClassId[] = CLASSES.map((classe) => classe.id);

/**
 * A carta de Personagem de cada classe, por identificador.
 *
 * É um registro técnico, não uma entrada do catálogo jogável: `CATALOGO` não
 * conhece nenhum desses identificadores, e `perfilDaCarta` não devolve perfil
 * para eles. Quem monta uma build usa este registro.
 */
export const PERSONAGEM_DA_CLASSE: Readonly<Record<ClassId, CardId>> = Object.fromEntries(
  CLASSES.map((classe) => [classe.id, classe.personagem]),
) as Readonly<Record<ClassId, CardId>>;

/** O identificador informado é a carta de Personagem de alguma classe? */
export const ehPersonagem = (carta: CardId): boolean =>
  CLASSES.some((classe) => classe.personagem === carta);
