import type { ClassId } from '@arcane-duel/shared-types';
import type { EstadoDeSelecao } from '@arcane-duel/ui';

import type { CartaVisivel } from '../partida/apresentacao.js';
import type { Ponto3D } from './layout.js';

/*
 * O estado visual da arena.
 *
 * É o que a cena tridimensional precisa saber, e **só** isso: onde está cada
 * carta, como ela está posta e que lado está aceso. Ele é derivado da projeção
 * — nunca do estado canônico — e por isso herda a privacidade de graça: uma
 * carta que o observador não pode ver chega aqui com `carta: null`, sem
 * identidade nenhuma para esconder.
 *
 * Nenhuma regra é decidida aqui. Se este arquivo inteiro desaparecer, a
 * partida continua correta; só fica invisível.
 */

export interface CartaNaArena {
  /** Identidade estável do objeto na cena, para reaproveitar a malha. */
  readonly chave: string;
  /**
   * A carta, quando o observador pode conhecê-la.
   *
   * `null` é face-down de verdade: não existe campo escondido por trás de uma
   * flag, o dado simplesmente não chegou. Uma Passiva oculta do adversário e
   * uma Emboscada armada entram por aqui.
   */
  readonly carta: CartaVisivel | null;
  readonly posicao: Ponto3D;
  /** Giro em torno do eixo vertical, em radianos. Usado pelo leque. */
  readonly giro: number;
  /** Ativada: a carta assenta na horizontal, 90° em relação a Pronta. */
  readonly deitada: boolean;
  readonly escala: number;
  /** No leque a carta fica inclinada para a câmera, e não deitada na mesa. */
  readonly noLeque: boolean;
  readonly foco: boolean;
  readonly selecao: EstadoDeSelecao;
  /** Ordem de empilhamento dentro do leque. */
  readonly ordem: number;
  /**
   * Se a peça aceita toque.
   *
   * Cooldown e Personagem são informação: não há comando para eles, e um alvo
   * de toque que não faz nada só rouba o dedo de quem tem.
   */
  readonly interativa: boolean;
}

export interface EstadoVisualDaArena {
  readonly cartas: readonly CartaNaArena[];
  /** 0 a 1 por lado: quanto da luz da classe está acesa sobre aquela metade. */
  readonly enfaseProprio: number;
  readonly enfaseAdversario: number;
  readonly classeDoProprio: ClassId;
  readonly classeDoAdversario: ClassId;
  /** Chaves de âncora com contorno de zona válida. */
  readonly slotsEmDestaque: readonly string[];
  /** Chave da âncora da zona que está esperando alguém agir. */
  readonly slotEmEspera: string | null;
}

export const ESTADO_VISUAL_VAZIO: EstadoVisualDaArena = {
  cartas: [],
  enfaseProprio: 0,
  enfaseAdversario: 0,
  classeDoProprio: 'guerreiro',
  classeDoAdversario: 'mago',
  slotsEmDestaque: [],
  slotEmEspera: null,
};
