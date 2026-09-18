import type {
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  PlayerId,
  SlotDeAcao,
  SlotsDeAcao,
} from '@arcane-duel/shared-types';

/*
 * Utilidades internas de atualização imutável.
 *
 * Nada aqui decide regra: são só as tesouras que recortam um estado novo a
 * partir do anterior, sem tocar no original.
 */

export const substituirJogador = (
  partida: EstadoDaPartida,
  jogador: EstadoDeJogador,
): EstadoDaPartida => ({
  ...partida,
  jogadores: [
    partida.jogadores[0].id === jogador.id ? jogador : partida.jogadores[0],
    partida.jogadores[1].id === jogador.id ? jogador : partida.jogadores[1],
  ],
});

export const substituirSlot = (jogador: EstadoDeJogador, slot: SlotDeAcao): EstadoDeJogador => ({
  ...jogador,
  acoes: jogador.acoes.map((atual) =>
    atual.indice === slot.indice ? slot : atual,
  ) as unknown as SlotsDeAcao,
});

export const slotVazio = (
  indice: IndiceDeAcao,
  situacao: 'vazio' | 'indisponivel' = 'vazio',
): SlotDeAcao => ({
  indice,
  situacao,
  perfil: null,
  escolhas: {},
  resposta: { voluntaria: null, escolhas: {} },
  modificadores: { dano: 0, impacto: 0 },
  reducaoDaResposta: { dano: 0, impacto: 0 },
  danoFinalDefinido: null,
  impactoFinalDefinido: null,
  impedirRuptura: false,
  bonusDeRupturaSubstituto: null,
  bonusAposReducao: 0,
  textoCancelado: false,
  recursoGasto: 0,
  cartasDeClasseUsadas: [],
});

/**
 * Os espaços do começo do turno: três abertos e o quarto indisponível, porque
 * só uma carta impressa o libera.
 */
export const slotsVazios = (): SlotsDeAcao => [
  slotVazio(0),
  slotVazio(1),
  slotVazio(2),
  slotVazio(3, 'indisponivel'),
];

export const adversarioDe = (partida: EstadoDaPartida, jogador: PlayerId): EstadoDeJogador => {
  const outro = partida.jogadores.find((atual) => atual.id !== jogador);
  // A partida tem exatamente dois jogadores e `jogador` é um deles: quem
  // chama já validou a identidade antes de chegar aqui.
  if (outro === undefined) throw new Error(`Partida sem adversário para ${jogador}`);
  return outro;
};

export const semNegativo = (valor: number): number => (valor < 0 ? 0 : valor);
