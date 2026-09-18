import type { ResumoDaMatriz, ResumoDoLote } from '@arcane-duel/gameplay';
import { RULES_VERSION } from '@arcane-duel/rules-engine';
import { CARD_DATA_VERSION } from '@arcane-duel/card-data';

import type { Argumentos } from './argumentos.js';
import { formatarMatriz, formatarResumo } from './relatorio.js';

/*
 * Saída do simulador.
 *
 * O formato muda o texto, nunca o veredito: um lote com comando ilegal é um
 * lote inválido em qualquer formato, e o processo precisa terminar com erro nos
 * dois. Separar isto do ponto de entrada é o que torna a regra testável sem
 * lançar um processo.
 */

/**
 * Código de saída do processo.
 *
 * Zero quando o lote vale como medição; diferente de zero quando a política
 * produziu comando ilegal — que é bug do simulador, e não resultado de partida.
 */
export const codigoDeSaida = (resumo: ResumoDoLote): number => (resumo.comandosIlegais > 0 ? 1 : 0);

/**
 * Código de saída da matriz.
 *
 * Comando ilegal **ou** invariante quebrada invalidam a medição: os dois são
 * bug, e nenhum dos dois pode passar despercebido para dentro de um relatório.
 */
export const codigoDeSaidaDaMatriz = (resumo: ResumoDaMatriz): number =>
  resumo.comandosIlegais > 0 || resumo.invariantesQuebradas.length > 0 ? 1 : 0;

/** O relatório da matriz no formato pedido. */
export const renderizarMatriz = (
  resumo: ResumoDaMatriz,
  formato: Argumentos['formato'],
  duracaoEmMs: number,
): string => {
  if (formato === 'json') {
    return `${JSON.stringify(
      { rulesVersion: RULES_VERSION, cardDataVersion: CARD_DATA_VERSION, duracaoEmMs, ...resumo },
      null,
      2,
    )}\n`;
  }

  return [
    `rulesVersion ................ ${RULES_VERSION}`,
    `cardDataVersion ............. ${CARD_DATA_VERSION}`,
    formatarMatriz(resumo),
    `duração ..................... ${String(duracaoEmMs)} ms`,
    '',
  ].join('\n');
};

/** O relatório no formato pedido. O JSON também sai quando o lote é inválido. */
export const renderizar = (
  resumo: ResumoDoLote,
  formato: Argumentos['formato'],
  duracaoEmMs: number,
): string => {
  if (formato === 'json') {
    return `${JSON.stringify(
      {
        rulesVersion: RULES_VERSION,
        cardDataVersion: CARD_DATA_VERSION,
        duracaoEmMs,
        ...resumo,
      },
      null,
      2,
    )}\n`;
  }

  return [
    `rulesVersion ................ ${RULES_VERSION}`,
    `cardDataVersion ............. ${CARD_DATA_VERSION}`,
    formatarResumo(resumo),
    `duração ..................... ${String(duracaoEmMs)} ms`,
    '',
  ].join('\n');
};
