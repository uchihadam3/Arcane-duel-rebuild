#!/usr/bin/env node
/**
 * Gera os ícones da PWA como placeholder técnico.
 *
 * São quadrados escuros com moldura tracejada e hachura — deliberadamente
 * neutros. Não representam a identidade visual do jogo e precisam ser
 * substituídos por arte aprovada antes de qualquer publicação pública.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { RAIZ } from './paths.mjs';

const DESTINO = path.join(RAIZ, 'apps', 'web', 'public', 'icons');

const tabelaCrc = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = tabelaCrc[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const bloco = (tipo, dados) => {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length, 0);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo), 0);
  return Buffer.concat([tamanho, corpo, crc]);
};

const codificarPng = (largura, altura, pixel) => {
  const linhas = Buffer.alloc(altura * (largura * 4 + 1));
  let posicao = 0;
  for (let y = 0; y < altura; y += 1) {
    linhas[posicao] = 0;
    posicao += 1;
    for (let x = 0; x < largura; x += 1) {
      const [r, g, b, a] = pixel(x, y, largura, altura);
      linhas[posicao] = r;
      linhas[posicao + 1] = g;
      linhas[posicao + 2] = b;
      linhas[posicao + 3] = a;
      posicao += 4;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
};

const FUNDO = [17, 20, 28, 255];
const HACHURA = [35, 41, 54, 255];
const MOLDURA = [91, 100, 120, 255];

const desenhar = (margemRelativa) => (x, y, largura, altura) => {
  const margem = Math.round(largura * margemRelativa);
  const naMoldura =
    x >= margem &&
    x < largura - margem &&
    y >= margem &&
    y < altura - margem &&
    (x < margem + 4 || x >= largura - margem - 4 || y < margem + 4 || y >= altura - margem - 4);

  if (naMoldura) return MOLDURA;
  if (Math.floor((x + y) / 12) % 2 === 0) return HACHURA;
  return FUNDO;
};

fs.mkdirSync(DESTINO, { recursive: true });

const arquivos = [
  { nome: 'icon-192.png', tamanho: 192, margem: 0.08 },
  { nome: 'icon-512.png', tamanho: 512, margem: 0.08 },
  // Ícone maskable precisa de zona segura: o sistema pode recortar as bordas.
  { nome: 'icon-maskable-512.png', tamanho: 512, margem: 0.2 },
  { nome: 'apple-touch-icon.png', tamanho: 180, margem: 0.08 },
];

for (const { nome, tamanho, margem } of arquivos) {
  fs.writeFileSync(path.join(DESTINO, nome), codificarPng(tamanho, tamanho, desenhar(margem)));
  console.info(`ícone gerado: ${nome} (${tamanho}x${tamanho})`);
}

fs.writeFileSync(
  path.join(DESTINO, 'LEIA-ME.md'),
  [
    '# Ícones da PWA',
    '',
    'Os arquivos desta pasta são **placeholder técnico**, gerados por',
    '`npm run icons:placeholder`. Eles não representam a identidade visual do',
    'jogo e precisam ser substituídos por arte aprovada antes de qualquer',
    'publicação pública.',
    '',
    'Nenhum asset aprovado foi recortado, redimensionado ou alterado para',
    'produzi-los.',
    '',
  ].join('\n'),
);
