import type { ResumoDaMatriz, ResumoDeLado, ResumoDoLote } from '@arcane-duel/gameplay';

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
  `  comando ilegal ............ ${String(lado.partidasComComandoIlegal)}`,
];

/** Frequência de uso por carta, da mais jogada para a menos jogada. */
const linhasDeUso = (usoPorCarta: Readonly<Record<string, number>>): readonly string[] => {
  const entradas = Object.entries(usoPorCarta).sort(
    ([aCarta, aVezes], [bCarta, bVezes]) => bVezes - aVezes || aCarta.localeCompare(bCarta),
  );
  if (entradas.length === 0) return ['frequência por carta ........ nenhuma carta jogada'];

  return [
    `frequência por carta ........ ${String(entradas.length)} cartas distintas`,
    ...entradas.map(([carta, vezes]) => `  ${carta.padEnd(6)} ${String(vezes)}`),
  ];
};

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
    `Passivas reveladas .......... ${resumo.passivasReveladasPorPartida.toFixed(2)}`,
    `Passivas Ativadas ........... ${resumo.passivasAtivadasPorPartida.toFixed(2)}`,
    `Cartas de Classe Ativadas ... ${resumo.cartasDeClassePorAtivarPorPartida.toFixed(2)}`,
    `Cartas de Classe Exauridas .. ${resumo.cartasDeClassePorExaurirPorPartida.toFixed(2)}`,
    `Vida média do vencedor ...... ${resumo.vidaMediaDoVencedor === null ? '—' : resumo.vidaMediaDoVencedor.toFixed(2)}`,
    `vitórias do Guerreiro ....... ${String(resumo.vitoriasDoGuerreiro)}`,
    `vitórias do Mago ............ ${String(resumo.vitoriasDoMago)}`,
    `bloqueios Lento + Impulso ... ${String(resumo.bloqueiosDeLentoComImpulso)}`,
    `comandos ilegais ............ ${String(resumo.comandosIlegais)}`,
    ...(resumo.comandosIlegais === 0
      ? []
      : [
          '',
          'ATENÇÃO: houve comando ilegal. Isso é bug do simulador, não resultado',
          'de partida. Esta linha de base NÃO é válida — corrija a política antes',
          'de publicar qualquer número daqui.',
          ...resumo.exemplosDeComandoIlegal.map(
            (item) =>
              `  ${item.comando} por ${item.jogador} no turno ${String(item.turno)}: ${item.erro.tipo}`,
          ),
        ]),
    '',
    ...linhasDeUso(resumo.usoPorCarta),
  ].join('\n');

/*
 * O relatório da matriz de doze por doze.
 *
 * Ele é descritivo: mostra o que aconteceu e não recomenda mudança nenhuma. A
 * coluna "começou" existe porque começar é vantagem estrutural conhecida (§7) e
 * um número só esconderia isso.
 */

const porcentagem = (parte: number, total: number): string =>
  total === 0 ? '  0%' : `${String(Math.round((parte / total) * 100)).padStart(3, ' ')}%`;

export const formatarMatriz = (resumo: ResumoDaMatriz): string => {
  const linhas: string[] = [
    `semente ..................... ${resumo.semente}`,
    `classes ..................... ${String(resumo.classes.length)}`,
    `configurações ............... ${String(resumo.configuracoes)}`,
    `partidas .................... ${String(resumo.partidas)}`,
    `turno médio ................. ${resumo.turnoMedio.toFixed(2)}`,
    `indefinidas ................. ${String(resumo.indefinidas)}`,
    `interrompidas por limite .... ${String(resumo.interrompidasPorLimiteTecnico)}`,
    `bloqueios de regra .......... ${String(resumo.bloqueiosDeRegra)}`,
    `comandos ilegais ............ ${String(resumo.comandosIlegais)}`,
    `invariantes de instantâneo .. ${String(resumo.invariantesQuebradas.length)}`,
    `invariantes de transição .... ${String(resumo.invariantesDeTransicaoQuebradas.length)}`,
    '',
    'vitórias por classe (os dois lados somados)',
  ];

  for (const classe of resumo.classes) {
    const vitorias = resumo.vitoriasPorClasse[classe] ?? 0;
    const partidas = resumo.partidasPorClasse[classe] ?? 0;
    linhas.push(
      `  ${classe.padEnd(13, '.')} ${String(vitorias).padStart(4, ' ')} / ${String(partidas).padStart(4, ' ')}  ${porcentagem(vitorias, partidas)}`,
    );
  }

  linhas.push('', 'pares (A x B — vitórias de A, vitórias de B, começou venceu)');
  for (const par of resumo.pares) {
    linhas.push(
      `  ${`${par.classeA} x ${par.classeB}`.padEnd(28, '.')} ${String(par.vitoriasDeA).padStart(4, ' ')} ${String(par.vitoriasDeB).padStart(4, ' ')}  ${porcentagem(par.vitoriasDeQuemComecou, par.partidas)}  turno ${par.turnoMedio.toFixed(1)}`,
    );
  }

  for (const quebra of resumo.invariantesQuebradas) linhas.push(`  INVARIANTE: ${quebra}`);
  for (const quebra of resumo.invariantesDeTransicaoQuebradas) {
    linhas.push(`  TRANSIÇÃO: ${quebra}`);
  }
  for (const ilegal of resumo.exemplosDeComandoIlegal) {
    linhas.push(`  ILEGAL: ${JSON.stringify(ilegal)}`);
  }

  return linhas.join('\n');
};
