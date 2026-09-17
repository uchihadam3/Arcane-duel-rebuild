#!/usr/bin/env node
/**
 * Verificação de tipos em duas passadas.
 *
 * 1. `tsc --build` compila os pacotes na ordem correta e gera os `.d.ts` que
 *    os outros pacotes consomem.
 * 2. Cada projeto é verificado de novo pelo seu próprio `tsconfig.json`, que
 *    inclui os arquivos de teste — assim um teste com tipo errado quebra a
 *    verificação em vez de passar despercebido.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { RAIZ } from './paths.mjs';

const PROJETOS = [
  'packages/shared-types',
  'packages/rules-engine',
  'packages/card-data',
  'packages/gameplay',
  'packages/ai',
  'packages/audio',
  'packages/vfx',
  'packages/ui',
  'apps/game-server',
  'apps/simulator',
  'apps/web',
];

const tsc = path.join(RAIZ, 'node_modules', '.bin', 'tsc');

const rodar = (argumentos) => {
  const resultado = spawnSync(tsc, argumentos, { cwd: RAIZ, stdio: 'inherit' });
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
};

rodar(['--build', '--force', 'tsconfig.build.json']);
for (const projeto of PROJETOS) {
  rodar(['-p', path.join(projeto, 'tsconfig.json')]);
}
console.info('tipos verificados, incluindo os arquivos de teste.');
