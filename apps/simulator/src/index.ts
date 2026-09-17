import process from 'node:process';

import { rodarLote } from '@arcane-duel/gameplay';

import { lerArgumentos } from './argumentos.js';
import { codigoDeSaida, renderizar } from './saida.js';

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

  process.stdout.write(renderizar(resumo, argumentos.formato, Date.now() - inicio));

  // Um lote com comando ilegal não vale como medição, seja qual for o formato:
  // o processo termina com erro para que ninguém publique esses números por
  // engano.
  process.exitCode = codigoDeSaida(resumo);
};

executar();
