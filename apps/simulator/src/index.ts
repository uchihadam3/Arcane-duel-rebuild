import process from 'node:process';

import { RULES_VERSION } from '@arcane-duel/rules-engine';
import { CARD_DATA_VERSION } from '@arcane-duel/card-data';
import { rodarLote } from '@arcane-duel/gameplay';

import { lerArgumentos } from './argumentos.js';
import { formatarResumo } from './relatorio.js';

/*
 * Ponto de entrada do simulador headless.
 *
 * Uso: npm run simulate -- --games 10000 --seed etapa3-baseline
 */

const executar = (): void => {
  const argumentos = lerArgumentos(process.argv.slice(2));
  const inicio = Date.now();

  const resumo = rodarLote({
    semente: argumentos.semente,
    partidas: argumentos.partidas,
    limiteDeTurnos: argumentos.limiteDeTurnos,
    exploracao: argumentos.exploracao,
  });

  const duracao = Date.now() - inicio;

  if (argumentos.formato === 'json') {
    process.stdout.write(
      `${JSON.stringify({ rulesVersion: RULES_VERSION, cardDataVersion: CARD_DATA_VERSION, duracaoEmMs: duracao, ...resumo }, null, 2)}\n`,
    );
    return;
  }

  process.stdout.write(
    [
      `rulesVersion ................ ${RULES_VERSION}`,
      `cardDataVersion ............. ${CARD_DATA_VERSION}`,
      formatarResumo(resumo),
      `duração ..................... ${String(duracao)} ms`,
      '',
    ].join('\n'),
  );

  // Um lote com comando ilegal não vale como medição: o processo termina com
  // erro para que ninguém publique esses números por engano.
  if (resumo.comandosIlegais > 0) process.exitCode = 1;
};

executar();
