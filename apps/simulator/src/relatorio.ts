import type { ResumoDeLado, ResumoDoLote } from '@arcane-duel/gameplay';

/*
 * Formatação do resumo de um lote.
 *
 * Números crus, sem recomendação de balanceamento: ajustar carta é decisão
 * humana depois de playtest (FULL_GAME_SPEC.md §44).
 */

const porcento = (parte: number, total: number): string =>
  total === 0 ? '—' : `${((parte / total) * 100).toFixed(1)}%`;

const linhaDeLado = (titulo: string, lado: ResumoDeLado): readonly string[] => [
  `${titulo}:`,
  `  partidas .................. ${String(lado.partidas)}`,
  `  venceu quem começou ....... ${String(lado.vitoriasDeQuemComecou)} (${porcento(lado.vitoriasDeQuemComecou, lado.partidas)})`,
  `  venceu quem respondeu ..... ${String(lado.vitoriasDeQuemRespondeu)} (${porcento(lado.vitoriasDeQuemRespondeu, lado.partidas)})`,
  `  desfecho indefinido ....... ${String(lado.indefinidas)}`,
  `  parou no limite técnico ... ${String(lado.interrompidasPorLimiteTecnico)}`,
  `  bloqueio de regra ......... ${String(lado.bloqueiosDeRegra)}`,
];

export const formatarResumo = (resumo: ResumoDoLote): string =>
  [
    `semente ..................... ${resumo.semente}`,
    `partidas .................... ${String(resumo.partidas)}`,
    `limite técnico de turnos .... ${String(resumo.limiteTecnicoDeTurnos)}`,
    `exploração da política ...... ${resumo.exploracao.toFixed(2)}`,
    `linhas de jogo distintas .... ${String(resumo.linhasDistintas)}`,
    '',
    ...linhaDeLado('Guerreiro começando', resumo.comA),
    '',
    ...linhaDeLado('Mago começando', resumo.comB),
    '',
    `turnos por partida .......... ${resumo.turnoMedio.toFixed(2)}`,
    `Ações por partida ........... ${resumo.acoesPorPartida.toFixed(2)}`,
    `Rupturas por partida ........ ${resumo.rupturasPorPartida.toFixed(2)}`,
    `Reações por partida ......... ${resumo.respostasComCartaPorPartida.toFixed(2)}`,
    `Defesas Inatas por partida .. ${resumo.respostasComDefesaInataPorPartida.toFixed(2)}`,
    `Ultimates por partida ....... ${resumo.ultimatesPorPartida.toFixed(2)}`,
    `vitórias do Guerreiro ....... ${String(resumo.vitoriasDoGuerreiro)}`,
    `vitórias do Mago ............ ${String(resumo.vitoriasDoMago)}`,
    `bloqueios Lento + Impulso ... ${String(resumo.bloqueiosDeLentoComImpulso)}`,
  ].join('\n');
