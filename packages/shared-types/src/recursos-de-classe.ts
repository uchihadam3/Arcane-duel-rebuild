import type { CardId, ClassId } from './ids.js';

/*
 * Componentes próprios de classe.
 *
 * Nenhuma classe recebe uma barra genérica de recurso (FULL_GAME_SPEC.md §5).
 * Cada uma tem a sua própria forma, e a união abaixo é discriminada por
 * `classe`, de modo que o compilador impede combinar o Momentum do Guerreiro
 * com a Mana do Mago ou com o Chi do Monge.
 *
 * Aqui existe apenas ESTADO. Gerar, gastar, avançar e consumir são regras da
 * etapa dois — nada disso é decidido neste arquivo.
 */

/** Trilha de Devoção do Clérigo (§16). Começa em Vigília. */
export type EstagioDeDevocao = 'vigilia' | 'graca' | 'fervor' | 'milagre';

export const ESTAGIOS_DE_DEVOCAO: readonly EstagioDeDevocao[] = [
  'vigilia',
  'graca',
  'fervor',
  'milagre',
];

/** Estados do Juramento do Paladino (§16). Começa Resoluto. */
export type EstadoDeJuramento = 'vacilante' | 'resoluto' | 'inabalavel';

export const ESTADOS_DE_JURAMENTO: readonly EstadoDeJuramento[] = [
  'vacilante',
  'resoluto',
  'inabalavel',
];

/** Notas do Bardo (§16). A própria ordem das cartas é o recurso dele. */
export type Nota = 'pulso' | 'melodia' | 'harmonia';

/** Lado de uma pedra de Chi do Monge (§16). */
export type PedraDeChi = 'pronta' | 'gasta';

/** Passos do Kata do Monge (§16). */
export type PassoDeKata = 'abertura' | 'fluxo' | 'finalizacao';

/** Forma do Druida (§16). Começa em Forma Humana. */
export type FormaDoDruida = 'humana' | 'selvagem';

/**
 * Estados de Fúria do Bárbaro (§16).
 *
 * Eles derivam da Guarda atual — Contido de 4 a 6, Enfurecido de 1 a 3,
 * Desencadeado em 0 — e por isso não são guardados: derivar é regra, e regra é
 * etapa dois. O tipo existe para que a etapa dois tenha onde se apoiar.
 */
export type EstadoDeFuria = 'contido' | 'enfurecido' | 'desencadeado';

export interface RecursoDoGuerreiro {
  readonly classe: 'guerreiro';
  /** No máximo três fichas. Começa em zero. */
  readonly momentum: number;
}

export interface RecursoDoMago {
  readonly classe: 'mago';
  /** Vai de zero a seis. Começa com quatro. */
  readonly mana: number;
}

export interface RecursoDoClerigo {
  readonly classe: 'clerigo';
  readonly devocao: EstagioDeDevocao;
}

export interface RecursoDoNecromante {
  readonly classe: 'necromante';
  /** Quatro fichas no total; começa controlando duas. */
  readonly almasControladas: number;
  /** As demais ficam no Cemitério de Almas e precisam ser colhidas de novo. */
  readonly almasNoCemiterio: number;
  /**
   * Servos que estão com uma Alma anexada.
   *
   * "Uma Alma anexada permanece até ser usada por aquele Servo ou até o Servo
   * ser Exaurido." A Alma anexada não está controlada nem no Cemitério: ela
   * está sobre a carta, e é por isso que precisa de um lugar próprio. A
   * conservação das quatro fichas é `controladas + cemitério + anexadas`.
   */
  readonly almasAnexadas: readonly CardId[];
}

export interface RecursoDoPaladino {
  readonly classe: 'paladino';
  /** O Paladino não possui moeda de Convicção: ele tem três estados (§16). */
  readonly juramento: EstadoDeJuramento;
}

export interface RecursoDoLadino {
  readonly classe: 'ladino';
  /**
   * Até três fichas de Brecha. Elas ficam sobre o adversário, mas pertencem ao
   * Ladino: quem as cria e quem as consome é ele, então o estado mora aqui.
   * Brechas não são Condições.
   */
  readonly brechasNoAdversario: number;
}

export interface RecursoDoBardo {
  readonly classe: 'bardo';
  /**
   * Notas executadas neste turno, na ordem. A sequência é o recurso: o Bardo
   * não tem número nenhum para gastar.
   */
  readonly sequenciaDeNotas: readonly Nota[];
  /**
   * Cadências produzidas neste turno.
   *
   * "Quando duas Ações consecutivas do Bardo possuem Notas diferentes, ocorre
   * Cadência." Várias cartas perguntam se houve uma ou duas, então a contagem
   * é guardada em vez de recalculada a cada consulta.
   */
  readonly cadenciasNoTurno: number;
}

export interface RecursoDoMonge {
  readonly classe: 'monge';
  /** Exatamente três pedras, todas começando Prontas. */
  readonly chi: readonly [PedraDeChi, PedraDeChi, PedraDeChi];
  /** Passos do Kata executados, na ordem. */
  readonly sequenciaDeKata: readonly PassoDeKata[];
}

export interface RecursoDoPatrulheiro {
  readonly classe: 'patrulheiro';
  /** Uma única Marca, colocada sobre o adversário. */
  readonly marcaDaPresa: boolean;
}

export interface RecursoDoBarbaro {
  readonly classe: 'barbaro';
  /**
   * O combustível do Bárbaro é a própria Guarda, que já vive no estado do
   * jogador. O que é dele e só dele é o teto de redução voluntária por turno.
   */
  readonly guardaReduzidaVoluntariamenteNoTurno: number;
}

export interface RecursoDoDruida {
  readonly classe: 'druida';
  readonly forma: FormaDoDruida;
  /** A Metamorfose gratuita do início do turno já foi usada neste turno? */
  readonly metamorfoseGratuitaUsadaNoTurno: boolean;
}

export interface RecursoDoBruxo {
  readonly classe: 'bruxo';
  /** Preço Proibido vale uma vez em cada próprio turno. */
  readonly precoProibidoUsadoNoTurno: boolean;
}

export type RecursoDeClasse =
  | RecursoDoGuerreiro
  | RecursoDoMago
  | RecursoDoClerigo
  | RecursoDoNecromante
  | RecursoDoPaladino
  | RecursoDoLadino
  | RecursoDoBardo
  | RecursoDoMonge
  | RecursoDoPatrulheiro
  | RecursoDoBarbaro
  | RecursoDoDruida
  | RecursoDoBruxo;

/** O recurso que pertence a uma classe específica. */
export type RecursoDa<TClasse extends ClassId> = Extract<RecursoDeClasse, { classe: TClasse }>;
