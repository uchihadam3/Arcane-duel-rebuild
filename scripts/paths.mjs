import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const RAIZ = fileURLToPath(new URL('..', import.meta.url));
export const DIR_ASSETS = path.join(RAIZ, 'assets');
export const DIR_ESPELHO = path.join(RAIZ, 'apps', 'web', 'public', 'assets');
export const ARQUIVO_MANIFESTO = path.join(
  RAIZ,
  'packages',
  'ui',
  'src',
  'assets',
  'manifest.json',
);
