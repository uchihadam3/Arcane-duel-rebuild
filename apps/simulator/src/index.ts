import process from 'node:process';

import { rodarLote, rodarMatriz } from '@arcane-duel/gameplay';

import { lerArgumentos } from './argumentos.js';
import { codigoDeSaida, codigoDeSaidaDaMatriz, renderizar, renderizarMatriz } from './saida.js';

/*
 * Ponto de entrada do simulador headless.
 *
 * Uso: npm run simulate -- --games 10000 --seed etapa3-baseline
 *      npm run simulate:matrix -- --seed etapa4-matrix
 */

const executar = (): void => {
  const argumentos = lerArgumentos(process.argv.slice(2));
  const inicio = Date.now();

  if (argumentos.matriz) {
    const matriz = rodarMatriz({
      semente: argumentos.semente,
      partidasPorConfiguracao: argumentos.partidas,
      limiteDeTurnos: argumentos.limiteDeTurnos,
    });
    process.stdout.write(renderizarMatriz(matriz, argumentos.formato, Date.now() - inicio));
    process.exitCode = codigoDeSaidaDaMatriz(matriz);
    return;
  }

  const resumo = rodarLote({
    semente: argumentos.semente,
    partidas: argumentos.partidas,
    limiteDeTurnos: argumentos.limiteDeTurnos,
    exploracao: argumentos.exploracao,
  });

  process.stdout.write(renderizar(resumo, argumentos.formato, Date.now() - inicio));

  // Um lote com comando ilegal não vale como medição, seja qual for o formato:
  // o processo termina com erro para que ninguém publique esses números por
  // engano.
  process.exitCode = codigoDeSaida(resumo);
};

executar();
