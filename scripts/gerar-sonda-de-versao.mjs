#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { RAIZ } from './paths.mjs';

/*
 * A sonda de versão.
 *
 * Existe para responder uma pergunta que nem o repositório nem o workflow
 * conseguem responder: **o endereço público está servindo esta build?**
 *
 * A pergunta apareceu em campo e custou dias. O aplicativo instalado mostrava
 * a primeira build, e não havia como saber, olhando para o aparelho, se o
 * atraso era do GitHub Pages ou do service worker antigo que o aparelho tinha
 * instalado. Workflow verde não responde: ele prova que a publicação foi
 * pedida, não o que o navegador recebe. E de dentro do aplicativo preso não
 * dava para ver nada, porque tudo vinha do cache dele.
 *
 * A sonda é um documento minúsculo, fora do pré-cache, publicado em
 * `assets/versao.html` — o único caminho sob o prefixo do Pages que **todo**
 * worker já publicado mantém fora do fallback de navegação, inclusive o da
 * primeira build. Abrir esse endereço, mesmo de dentro do aplicativo preso,
 * mostra o commit que o site público está servindo agora.
 *
 * Ela é gerada **depois** do `vite build`, de propósito: o manifesto de
 * pré-cache já foi escrito nesse ponto, então a sonda não entra nele.
 */

const dist = join(RAIZ, 'apps', 'web', 'dist');

const vazio = (valor) => valor === undefined || valor === '';

const commit = (() => {
  const doWorkflow = process.env.GITHUB_SHA;
  if (!vazio(doWorkflow)) return doWorkflow;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();
  } catch {
    return 'desconhecido';
  }
})();

const build = vazio(process.env.GITHUB_RUN_NUMBER) ? 'local' : process.env.GITHUB_RUN_NUMBER;

const { version } = JSON.parse(readFileSync(join(RAIZ, 'apps', 'web', 'package.json'), 'utf8'));

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`não há build em ${dist} — rode "npm run build" antes.`);
  process.exit(1);
}

/* O bundle que o documento publicado carrega: é ele que muda a cada build. */
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const bundle = /src="([^"]*app\/[^"]+\.js)"/.exec(html)?.[1] ?? '(nenhum)';

const escapar = (valor) =>
  String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const prefixo = /(?:src|href)="([^"]*)app\//.exec(html)?.[1] ?? '/';

const agora = new Date().toISOString().replace('T', ' ').slice(0, 16);

const documento = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="cache-control" content="no-store" />
    <title>Arcane Duel — versão publicada</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0; min-height: 100dvh; display: grid; place-items: center;
        background: #14100e; color: #f3e7d6; padding: 1.5rem;
        font: 1rem/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      main { max-width: 34rem; width: 100%; }
      h1 { font-size: 1.1rem; letter-spacing: .12em; text-transform: uppercase; color: #c9a227; }
      dl { display: grid; grid-template-columns: auto 1fr; gap: .4rem 1rem; margin: 1.5rem 0; }
      dt { color: #9a8f82; }
      dd { margin: 0; overflow-wrap: anywhere; }
      p { color: #9a8f82; font-size: .85rem; }
      a { color: #c9a227; }
    </style>
  </head>
  <body>
    <main>
      <h1>Versão publicada</h1>
      <dl>
        <dt>commit</dt><dd>${escapar(commit)}</dd>
        <dt>build</dt><dd>${escapar(build)}</dd>
        <dt>cliente</dt><dd>${escapar(version)}</dd>
        <dt>bundle</dt><dd>${escapar(bundle)}</dd>
        <dt>gerada em</dt><dd>${escapar(agora)} UTC</dd>
      </dl>
      <p>
        Esta página vem sempre da rede, nunca do cache do aplicativo. Se o que
        está aqui não é o que o aplicativo instalado mostra, o atraso é do
        aparelho — e não da publicação.
      </p>
      <p><a href="${escapar(prefixo)}">Abrir o Arcane Duel</a></p>
    </main>
  </body>
</html>
`;

mkdirSync(join(dist, 'assets'), { recursive: true });
writeFileSync(join(dist, 'assets', 'versao.html'), documento, 'utf8');

console.log('sonda de versão gerada:');
console.log(`  caminho ............... ${prefixo}assets/versao.html`);
console.log(`  commit ................ ${commit}`);
console.log(`  build ................. ${build}`);
console.log(`  bundle ................ ${bundle}`);
