import type { CondicaoId } from '@arcane-duel/shared-types';

/** Valores universais de playtest (FULL_GAME_SPEC.md §5, §6, §7, §9). */
export const REGRAS_UNIVERSAIS = {
  vidaInicial: 30,
  guardaInicial: 6,
  pontosDeAcaoPorTurno: 5,
  maximoDeAcoesPorTurno: 3,
  maximoDeReserva: 2,
  /** Reservas com que o segundo jogador começa a partida (§7). */
  reservaInicialDoSegundoJogador: 2,
  /** O Impulso Inicial vale exatamente 1 AP e nunca vira Reserva (§7). */
  impulsoInicial: 1,
  /** Dano adicional aplicado pelo próprio Ataque que causou a Ruptura (§9). */
  danoAdicionalDeRuptura: 2,
  /** Respostas voluntárias permitidas por Ação inimiga (§8). */
  respostasVoluntariasPorAcao: 1,
  zonasDeCooldown: 3,
  /** Sangramento tica depois que o personagem conclui a segunda Ação (§15). */
  gatilhoDeSangramento: 2,
} as const;

/** Composição obrigatória de uma build para a batalha (FULL_GAME_SPEC.md §3). */
export const COMPOSICAO_DA_BUILD = {
  habilidades: 8,
  passivas: 4,
  cartasDeClasse: 2,
  ultimates: 1,
  personagens: 1,
} as const;

/** Tamanho do catálogo inicial de cada classe (FULL_GAME_SPEC.md §2). */
export const CATALOGO_POR_CLASSE = {
  habilidades: 20,
  passivas: 10,
  cartasDeClasse: 6,
  ultimates: 3,
} as const;

/** Receitas oficiais por classe, sendo a primeira já desbloqueada (§19). */
export const RECEITAS_POR_CLASSE = 8;

/** Duelos de uma campanha do Desafio de IA (§17). */
export const DUELOS_POR_CAMPANHA = 12;

/** Acúmulo máximo de cada Condição (FULL_GAME_SPEC.md §15). */
export const LIMITE_DE_CONDICAO: Readonly<Record<CondicaoId, number>> = {
  queimadura: 3,
  lento: 2,
  murchar: 2,
  sangramento: 3,
};
