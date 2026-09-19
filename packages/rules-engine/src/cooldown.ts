import type {
  CardId,
  CooldownAgendado,
  EstadoDeCooldown,
  EstadoDeJogador,
  OrigemDoAgendamento,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';

/*
 * Cooldown.
 *
 * A zona física É o cooldown: não existe contador adicional (§11). No início
 * do turno do dono, CD1 volta para a mão, CD2 passa para CD1 e CD3 para CD2.
 * Várias cartas podem dividir a mesma zona.
 *
 * **A habilidade usada não entra no cooldown ao resolver.** Ela fica no espaço
 * de Ação ou de Resposta até o encerramento do turno atual, e só então entra na
 * zona indicada (§11). O intervalo entre a resolução e o encerramento é o que
 * `CooldownAgendado` representa.
 *
 * A consequência que importa para as regras: uma carta usada **agora** não
 * está em CD1, e portanto não é alvo de um efeito que peça "uma carta sua em
 * CD1". Ela é alvo dos efeitos que adiantam o **agendamento**, que é outra
 * coisa e está logo abaixo.
 */

export interface AvancoDeCooldown {
  readonly cooldown: EstadoDeCooldown;
  readonly paraAMao: readonly CardId[];
}

/**
 * Avança as três zonas de uma vez.
 *
 * O avanço é calculado a partir do estado anterior inteiro, e não zona a zona
 * em sequência: fosse em sequência, uma carta de CD3 poderia atravessar até a
 * mão no mesmo turno.
 */
export const avancarCooldown = (anterior: EstadoDeCooldown): AvancoDeCooldown => ({
  cooldown: { 1: [...anterior[2]], 2: [...anterior[3]], 3: [] },
  paraAMao: [...anterior[1]],
});

/** Coloca uma habilidade usada na zona de cooldown impressa nela. */
export const enviarParaCooldown = (
  jogador: EstadoDeJogador,
  carta: CardId,
  zona: 1 | 2 | 3,
): EstadoDeJogador => ({
  ...jogador,
  cooldown: { ...jogador.cooldown, [zona]: [...jogador.cooldown[zona], carta] },
});

/* ---------------------------------------------------------------------------
 * O agendamento.
 * ------------------------------------------------------------------------- */

/**
 * Agenda a entrada de uma habilidade no cooldown, para o fim do turno.
 *
 * `destino` nasce igual à zona impressa. Quem o altera são os modificadores, e
 * eles alteram **este número** — não movem uma carta que ainda não está na
 * zona.
 */
export const agendarCooldown = (
  jogador: EstadoDeJogador,
  entrada: {
    readonly carta: CardId;
    readonly zona: ZonaDeCooldown;
    readonly turno: number;
    readonly origem: OrigemDoAgendamento;
  },
): EstadoDeJogador => ({
  ...jogador,
  cooldownAgendado: [
    ...jogador.cooldownAgendado,
    {
      carta: entrada.carta,
      zonaImpressa: entrada.zona,
      destino: entrada.zona,
      turnoDeUso: entrada.turno,
      origem: entrada.origem,
    },
  ],
});

/** O agendamento de uma carta, quando existe. */
export const agendamentoDaCarta = (
  jogador: EstadoDeJogador,
  carta: CardId,
): CooldownAgendado | null =>
  jogador.cooldownAgendado.find((atual) => atual.carta === carta) ?? null;

/** Troca o destino de um agendamento, mantendo a zona impressa como referência. */
export const redirecionarAgendamento = (
  jogador: EstadoDeJogador,
  carta: CardId,
  destino: ZonaDeCooldown,
): EstadoDeJogador => ({
  ...jogador,
  cooldownAgendado: jogador.cooldownAgendado.map((atual) =>
    atual.carta === carta ? { ...atual, destino } : atual,
  ),
});

/** Cancela um agendamento — a carta deixa de ir para o cooldown. */
export const cancelarAgendamento = (jogador: EstadoDeJogador, carta: CardId): EstadoDeJogador => ({
  ...jogador,
  cooldownAgendado: jogador.cooldownAgendado.filter((atual) => atual.carta !== carta),
});

export interface EntradaNoCooldown {
  readonly carta: CardId;
  readonly zona: ZonaDeCooldown;
  readonly origem: OrigemDoAgendamento;
}

export interface LiquidacaoDeCooldown {
  readonly jogador: EstadoDeJogador;
  /** O que entrou, na ordem em que entrou. A apresentação anima nesta ordem. */
  readonly entradas: readonly EntradaNoCooldown[];
}

/**
 * Liquida os agendamentos: as habilidades usadas entram no cooldown.
 *
 * Chamado uma vez no encerramento do turno, para os **dois** jogadores — a
 * Reação de quem defendeu também foi usada neste turno e também sai do campo
 * agora.
 *
 * A ordem é a de uso, e é determinística: é a mesma no replay e no simulador, e
 * é a ordem em que a apresentação mostra as cartas migrando.
 */
export const liquidarAgendamentos = (jogador: EstadoDeJogador): LiquidacaoDeCooldown => {
  if (jogador.cooldownAgendado.length === 0) {
    return { jogador, entradas: [] };
  }

  let cooldown: EstadoDeCooldown = jogador.cooldown;
  const entradas: EntradaNoCooldown[] = [];

  for (const agendado of jogador.cooldownAgendado) {
    cooldown = { ...cooldown, [agendado.destino]: [...cooldown[agendado.destino], agendado.carta] };
    entradas.push({ carta: agendado.carta, zona: agendado.destino, origem: agendado.origem });
  }

  return { jogador: { ...jogador, cooldown, cooldownAgendado: [] }, entradas };
};
