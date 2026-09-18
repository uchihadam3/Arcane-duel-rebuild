import type { ClassId, RecursoDa } from '@arcane-duel/shared-types';

/**
 * Componente próprio de cada classe no começo da partida.
 *
 * São apenas os valores de partida que o FULL_GAME_SPEC.md §16 declara
 * literalmente: Momentum começa em zero, Mana começa com quatro, Devoção
 * começa em Vigília, o Necromante começa controlando duas Almas com duas no
 * Cemitério, o Paladino começa Resoluto, o Monge começa com as três pedras
 * Prontas e o Druida começa em Forma Humana. Nada aqui gera, gasta ou avança
 * recurso: isso é etapa dois.
 */
export const recursoInicialDaClasse = <TClasse extends ClassId>(
  classe: TClasse,
): RecursoDa<TClasse> => POR_CLASSE[classe]();

type Construtores = { readonly [TClasse in ClassId]: () => RecursoDa<TClasse> };

const POR_CLASSE: Construtores = {
  guerreiro: () => ({ classe: 'guerreiro', momentum: 0 }),
  mago: () => ({ classe: 'mago', mana: 4 }),
  clerigo: () => ({ classe: 'clerigo', devocao: 'vigilia' }),
  necromante: () => ({
    classe: 'necromante',
    almasControladas: 2,
    almasNoCemiterio: 2,
    almasAnexadas: [],
  }),
  paladino: () => ({ classe: 'paladino', juramento: 'resoluto' }),
  ladino: () => ({ classe: 'ladino', brechasNoAdversario: 0 }),
  bardo: () => ({ classe: 'bardo', sequenciaDeNotas: [], cadenciasNoTurno: 0 }),
  monge: () => ({
    classe: 'monge',
    chi: ['pronta', 'pronta', 'pronta'],
    sequenciaDeKata: [],
  }),
  patrulheiro: () => ({ classe: 'patrulheiro', marcaDaPresa: false }),
  barbaro: () => ({ classe: 'barbaro', guardaReduzidaVoluntariamenteNoTurno: 0 }),
  druida: () => ({ classe: 'druida', forma: 'humana', metamorfoseGratuitaUsadaNoTurno: false }),
  bruxo: () => ({ classe: 'bruxo', precoProibidoUsadoNoTurno: false }),
};
