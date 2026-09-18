#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RAIZ } from './paths.mjs';

/*
 * O que vai ao ar é isto, e não o que o repositório diz que deveria ir.
 *
 * O site público ficou dias servindo o primeiro deploy enquanto todo workflow
 * terminava verde. A lição não é "conferir melhor o workflow": é conferir o
 * **artefato**, logo antes de publicá-lo, contra o commit que o gerou.
 *
 * Ele recusa a publicação quando o `dist` não corresponde ao commit em
 * construção, ou quando carrega sinais da fundação do projeto — texto que só
 * existia antes de o jogo existir.
 */

const dist = join(RAIZ, 'apps', 'web', 'dist');

const commitAtual = (() => {
  const doWorkflow = process.env.GITHUB_SHA;
  if (doWorkflow !== undefined && doWorkflow !== '') return doWorkflow;
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();
})();

const falhas = [];
const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`não há build em ${dist} — rode "npm run build" antes.`);
  process.exit(1);
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');

/* 1. O documento aponta para um bundle que existe mesmo. */
const referencias = [...html.matchAll(/src="([^"]*app\/[^"]+\.js)"/g)].map((achado) => achado[1]);
exigir(referencias.length > 0, 'index.html não referencia bundle nenhum');

/*
 * O caminho no HTML vem com o prefixo de publicação — `/Arcane-duel-rebuild/`
 * no Pages, `/` no desenvolvimento. O que interessa é o trecho a partir de
 * `app/`, que é onde os bundles ficam dentro do artefato.
 */
const bundles = referencias
  .map((referencia) => referencia.slice(referencia.indexOf('app/')))
  .map((caminho) => join(dist, caminho));

for (const bundle of bundles) {
  exigir(existsSync(bundle), `index.html aponta para um arquivo ausente: ${bundle}`);
}

const codigo = bundles
  .filter((bundle) => existsSync(bundle))
  .map((bundle) => readFileSync(bundle, 'utf8'))
  .join('\n');

/* 2. O bundle é o desta build, e mostra a etapa atual. */
exigir(
  codigo.includes(commitAtual),
  `o bundle não carrega o commit em construção (${commitAtual.slice(0, 7)})`,
);
exigir(codigo.includes('Jogar local'), 'o bundle não oferece "Jogar local"');
exigir(codigo.includes('Etapa 5'), 'o bundle não menciona a Etapa 5');

/* 3. E não é um fantasma da fundação do projeto. */
for (const fantasma of ['COMBATE NÃO IMPLEMENTADO', 'interface jogável ainda não implementada']) {
  exigir(!codigo.includes(fantasma), `o bundle ainda contém "${fantasma}"`);
}
exigir(
  !codigo.includes('36693b96555d8b10308ea3f5b4f02b8ddf796ee6'),
  'o bundle carrega o commit da fundação como build atual',
);

/*
 * 4. O fallback de SPA e o worker seguem junto.
 *
 * O 404.html é criado no passo que prepara o site, logo antes daqui. Rodando
 * à mão, prepare o artefato do mesmo jeito que o workflow prepara:
 *
 *     cp apps/web/dist/index.html apps/web/dist/404.html
 */
exigir(existsSync(join(dist, '404.html')), 'falta 404.html, o fallback de rota do Pages');
exigir(existsSync(join(dist, 'sw.js')), 'falta sw.js no artefato');

if (falhas.length > 0) {
  console.error('\nartefato NÃO pode ser publicado:');
  for (const falha of falhas) console.error(`  - ${falha}`);
  process.exit(1);
}

console.log('artefato conferido:');
console.log(`  commit ................ ${commitAtual}`);
console.log(`  bundle ................ ${referencias.join(', ')}`);
console.log('  "Jogar local" ......... presente');
console.log('  Etapa 5 ............... presente');
console.log('  textos da fundação .... ausentes');
console.log('  404.html e sw.js ...... presentes');
