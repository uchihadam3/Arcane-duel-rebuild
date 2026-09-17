#!/usr/bin/env node
/**
 * Confere o manifesto de assets contra os arquivos reais em /assets.
 *
 * Falha quando o manifesto está inconsistente ou desatualizado (id duplicado,
 * caminho inválido, arquivo presente em disco mas não declarado). Apenas avisa
 * quando um asset declarado ainda não foi entregue — a interface já lida com
 * isso mostrando um placeholder técnico.
 */
import fs from 'node:fs';
import path from 'node:path';

import { ARQUIVO_MANIFESTO, DIR_ASSETS } from './paths.mjs';

const manifesto = JSON.parse(fs.readFileSync(ARQUIVO_MANIFESTO, 'utf8'));
const entradas = manifesto.assets;

const erros = [];
const ausentes = [];
const idsVistos = new Set();
const caminhosDeclarados = new Set();

for (const entrada of entradas) {
  if (idsVistos.has(entrada.id)) erros.push(`id duplicado no manifesto: ${entrada.id}`);
  idsVistos.add(entrada.id);

  if (caminhosDeclarados.has(entrada.caminho)) {
    erros.push(`caminho duplicado no manifesto: ${entrada.caminho}`);
  }
  caminhosDeclarados.add(entrada.caminho);

  if (entrada.caminho.startsWith('/') || entrada.caminho.includes('..')) {
    erros.push(`caminho inválido: ${entrada.caminho}`);
    continue;
  }
  if (!entrada.caminho.endsWith(entrada.arquivo)) {
    erros.push(`caminho não termina no nome canônico: ${entrada.caminho} != ${entrada.arquivo}`);
  }
  if (!fs.existsSync(path.join(DIR_ASSETS, entrada.caminho))) {
    ausentes.push(entrada);
  }
}

const listarArquivos = (dir, prefixo = '') => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const relativo = prefixo === '' ? item.name : `${prefixo}/${item.name}`;
    if (item.isDirectory()) return listarArquivos(path.join(dir, item.name), relativo);
    return item.name.startsWith('.') ? [] : [relativo];
  });
};

for (const arquivo of listarArquivos(DIR_ASSETS)) {
  if (!caminhosDeclarados.has(arquivo)) {
    erros.push(`arquivo em /assets não declarado no manifesto: ${arquivo}`);
  }
}

const presentes = entradas.length - ausentes.length;
console.info(`assets declarados: ${entradas.length}`);
console.info(`assets presentes:  ${presentes}`);

if (ausentes.length > 0) {
  console.warn(`\nassets ainda não entregues (${ausentes.length}) — a interface usa placeholder:`);
  for (const entrada of ausentes) console.warn(`  - ${entrada.arquivo}  (${entrada.id})`);
}

if (erros.length > 0) {
  console.error(`\nmanifesto inconsistente (${erros.length}):`);
  for (const erro of erros) console.error(`  - ${erro}`);
  process.exit(1);
}

console.info('\nmanifesto consistente.');
