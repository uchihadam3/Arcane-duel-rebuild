/**
 * Estrutura reservada para áudio.
 *
 * O áudio ajuda o jogador a entender o estado da partida, então o vocabulário
 * de eventos é definido aqui desde já; a implementação (Web Audio, mixagem e
 * assinatura sonora por classe) entra na etapa treze do ROADMAP_CODEX.md.
 */

/** Eventos mínimos que precisam de som próprio (FULL_GAME_SPEC.md §28). */
export type EventoSonoro =
  | 'selecionar-carta'
  | 'colocar-carta-em-acao'
  | 'declarar-reacao'
  | 'aplicar-dano'
  | 'aplicar-impacto'
  | 'ruptura'
  | 'revelar-passiva'
  | 'ativar-carta-de-classe'
  | 'exaurir-carta-de-classe'
  | 'usar-ultimate'
  | 'mudar-turno'
  | 'vitoria'
  | 'derrota'
  | 'desbloquear-receita';

export const EVENTOS_SONOROS: readonly EventoSonoro[] = [
  'selecionar-carta',
  'colocar-carta-em-acao',
  'declarar-reacao',
  'aplicar-dano',
  'aplicar-impacto',
  'ruptura',
  'revelar-passiva',
  'ativar-carta-de-classe',
  'exaurir-carta-de-classe',
  'usar-ultimate',
  'mudar-turno',
  'vitoria',
  'derrota',
  'desbloquear-receita',
];

/** Volumes independentes, exigidos pela seção de acessibilidade (§41). */
export type BarramentoDeAudio = 'musica' | 'interface' | 'efeitos';

export interface VolumesDeAudio {
  readonly musica: number;
  readonly interface: number;
  readonly efeitos: number;
}

export const VOLUMES_PADRAO: VolumesDeAudio = {
  musica: 0.6,
  interface: 0.8,
  efeitos: 0.8,
};
