#!/usr/bin/env node
/**
 * Espelha /assets em apps/web/public/assets para que o Vite os sirva como
 * arquivos estáticos. A pasta de origem continua sendo a única fonte de
 * verdade; o espelho é gerado e fica fora do controle de versão.
 */
import fs from 'node:fs';
import path from 'node:path';

import { DIR_ASSETS, DIR_ESPELHO } from './paths.mjs';

let copiados = 0;
let mantidos = 0;

const espelhar = (origem, destino) => {
  if (!fs.existsSync(origem)) return;
  fs.mkdirSync(destino, { recursive: true });

  for (const item of fs.readdirSync(origem, { withFileTypes: true })) {
    if (item.name.startsWith('.')) continue;
    const caminhoOrigem = path.join(origem, item.name);
    const caminhoDestino = path.join(destino, item.name);

    if (item.isDirectory()) {
      espelhar(caminhoOrigem, caminhoDestino);
      continue;
    }

    const info = fs.statSync(caminhoOrigem);
    const atual = fs.existsSync(caminhoDestino) ? fs.statSync(caminhoDestino) : null;
    if (atual !== null && atual.size === info.size && atual.mtimeMs >= info.mtimeMs) {
      mantidos += 1;
      continue;
    }

    fs.copyFileSync(caminhoOrigem, caminhoDestino);
    copiados += 1;
  }
};

espelhar(DIR_ASSETS, DIR_ESPELHO);
console.info(`assets espelhados: ${copiados} copiados, ${mantidos} já atualizados.`);
