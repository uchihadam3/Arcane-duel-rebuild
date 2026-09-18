#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { RAIZ } from './paths.mjs';

/*
 * Verificação do service worker **gerado**, e não da configuração que o gera.
 *
 * Conferir `vite.config.ts` não bastou: a configuração estava correta e mesmo
 * assim o `sw.js` publicado saiu quebrado. O Workbox serializa `urlPattern`
 * quando ele é função — e serializa só o corpo, sem o fechamento léxico. Uma
 * função que lia `base` da configuração chegou ao worker publicado apontando
 * para um `base` que não existe lá, lançando ReferenceError em todo pedido que
 * chegasse até a rota.
 *
 * Por isso esta verificação não lê a configuração: ela constrói o artefato de
 * produção com o prefixo do GitHub Pages, lê o `sw.js` resultante e **executa**
 * cada função de rota encontrada nele. Um identificador livre estoura na hora,
 * que é exatamente o que aconteceria no navegador.
 */

const BASE = process.env.BASE_PATH ?? '/Arcane-duel-rebuild/';
const SAIDA = 'dist-verificacao-sw';

const cliente = join(RAIZ, 'apps', 'web');
const pastaDeSaida = join(cliente, SAIDA);

const falhas = [];

const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};

/** Recorta o primeiro argumento de `registerRoute(`, equilibrando parênteses. */
const primeiroArgumento = (fonte, inicio) => {
  let profundidade = 0;
  let dentroDeTexto = null;
  for (let i = inicio; i < fonte.length; i += 1) {
    const c = fonte[i];
    if (dentroDeTexto !== null) {
      if (c === '\\') i += 1;
      else if (c === dentroDeTexto) dentroDeTexto = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      dentroDeTexto = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') profundidade += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (profundidade === 0) return fonte.slice(inicio, i);
      profundidade -= 1;
    } else if (c === ',' && profundidade === 0) {
      return fonte.slice(inicio, i);
    }
  }
  return null;
};

const rotasDe = (fonte) => {
  const rotas = [];
  const marca = 'registerRoute(';
  let de = 0;
  for (;;) {
    const achou = fonte.indexOf(marca, de);
    if (achou === -1) return rotas;
    const argumento = primeiroArgumento(fonte, achou + marca.length);
    if (argumento !== null) {
      // O trecho seguinte carrega a estratégia da rota — é lá que se lê se ela
      // é NetworkOnly ou StaleWhileRevalidate.
      const fim = achou + marca.length + argumento.length;
      rotas.push({ fonte: argumento, estrategia: fonte.slice(fim, fim + 160) });
    }
    de = achou + marca.length;
  }
};

/* ------------------------------------------------------------------ */

console.log(`Construindo o cliente com BASE_PATH=${BASE} …`);
rmSync(pastaDeSaida, { recursive: true, force: true });
execFileSync('npx', ['vite', 'build', '--outDir', SAIDA], {
  cwd: cliente,
  env: { ...process.env, BASE_PATH: BASE },
  stdio: 'pipe',
});

const sw = readFileSync(join(pastaDeSaida, 'sw.js'), 'utf8');

// 1. O worker novo ativa sozinho e assume as páginas abertas.
exigir(sw.includes('self.skipWaiting()'), 'o worker gerado não chama self.skipWaiting()');
exigir(sw.includes('clientsClaim()'), 'o worker gerado não chama clientsClaim()');

// 2. Nenhum resto do fechamento léxico da configuração.
exigir(!/\bbase\b/.test(sw), 'o worker gerado contém o identificador livre `base`');
exigir(!sw.includes('${base}'), 'o worker gerado contém a interpolação `${base}` por escrever');

// 3. A navegação cai no documento do aplicativo.
exigir(
  sw.includes('createHandlerBoundToURL("index.html")'),
  'o worker gerado não devolve index.html para navegações',
);

/*
 * 4. Cada rota é avaliada de verdade.
 *
 * Função com identificador livre estoura aqui, do mesmo jeito que estouraria
 * no navegador. É este passo que quebra se o Workbox voltar a serializar um
 * fechamento inválido.
 */
const origem = 'https://uchihadam3.github.io';
const urlDeAsset = new URL(`${origem}${BASE}assets/cards/frames/card_frame_attack_red.png`);
const urlDeApi = new URL(`${origem}/api/partida`);
const urlDeDocumento = new URL(`${origem}${BASE}`);
const urlDaSonda = new URL(`${origem}${BASE}assets/versao.html`);

const avaliadas = [];
for (const { fonte, estrategia } of rotasDe(sw)) {
  if (fonte.startsWith('new ')) continue; // NavigationRoute, montada acima.
  let matcher;
  try {
    matcher = new Function(`return (${fonte});`)();
  } catch (erro) {
    falhas.push(`rota não compila: ${fonte.slice(0, 80)} — ${String(erro)}`);
    continue;
  }

  const testar = (url) => {
    if (matcher instanceof RegExp) return matcher.test(url.href);
    return Boolean(matcher({ url, request: { url: url.href }, sameOrigin: true }));
  };

  try {
    avaliadas.push({
      fonte,
      estrategia,
      asset: testar(urlDeAsset),
      api: testar(urlDeApi),
      documento: testar(urlDeDocumento),
      sonda: testar(urlDaSonda),
    });
  } catch (erro) {
    falhas.push(
      `rota lança ao ser avaliada — era exatamente este o defeito publicado: ` +
        `${fonte.slice(0, 80)} — ${String(erro)}`,
    );
  }
}

exigir(avaliadas.length >= 2, 'o worker gerado não registrou as rotas esperadas');

const doAsset = avaliadas.filter((rota) => rota.asset);
exigir(
  doAsset.length === 1,
  `esperava exatamente uma rota casando com ${BASE}assets/, achei ${String(doAsset.length)}`,
);
exigir(
  doAsset[0] !== undefined && doAsset[0].fonte.includes(BASE.replace(/\//g, '\\/')),
  `a rota dos assets não traz o prefixo ${BASE} embutido: ${doAsset[0]?.fonte ?? '(nenhuma)'}`,
);
exigir(
  doAsset[0] !== undefined && !doAsset[0].api && !doAsset[0].documento,
  'a rota dos assets casa com API ou com o documento, e não deveria',
);

const daApi = avaliadas.filter((rota) => rota.api);
exigir(daApi.length === 1, 'esperava exatamente uma rota casando com /api/');
exigir(
  daApi[0] !== undefined && !daApi[0].asset,
  'a rota de API também casa com asset, e não deveria',
);

/*
 * 5. A sonda de versão vem da rede, sempre.
 *
 * Ela existe para responder "o endereço público já está nesta build?". Servida
 * de cache, responderia outra coisa. O padrão dos assets também casa com o
 * caminho dela, e o Workbox usa a primeira rota que casar — então o que se
 * confere aqui é a **ordem**: quem atende a sonda tem de ser a rota de rede.
 */
const primeiraDaSonda = avaliadas.find((rota) => rota.sonda);
exigir(primeiraDaSonda !== undefined, 'nenhuma rota do worker atende assets/versao.html');
exigir(
  primeiraDaSonda === undefined || primeiraDaSonda.estrategia.includes('NetworkOnly'),
  'a sonda de versão é atendida por uma estratégia de cache, e precisa vir da rede: ' +
    `${primeiraDaSonda?.estrategia.slice(0, 60) ?? '(nenhuma)'}`,
);
exigir(
  primeiraDaSonda === undefined || !primeiraDaSonda.asset,
  'a rota que atende a sonda também atende os assets — ela está na ordem errada',
);

// 6. API, autenticação e socket nunca viram conteúdo estático.
exigir(sw.includes('NetworkOnly'), 'o worker gerado não registra NetworkOnly');
for (const caminho of ['/api/', '/auth/', '/socket']) {
  exigir(
    sw.includes(`"${caminho}"`),
    `o worker gerado não reconhece ${caminho} como rota exclusiva de rede`,
  );
  exigir(
    new RegExp(`denylist:\\[[^\\]]*${caminho.replace(/\//g, '\\\\/')}`).test(sw),
    `${caminho} não está na lista de exceções da navegação`,
  );
}
exigir(
  !new RegExp(`StaleWhileRevalidate[^)]*${'/api/'}`).test(sw),
  'a API aparece dentro de uma estratégia de cache',
);

rmSync(pastaDeSaida, { recursive: true, force: true });

/* ------------------------------------------------------------------ */

if (falhas.length > 0) {
  console.error('\nservice worker gerado NÃO passou:');
  for (const falha of falhas) console.error(`  - ${falha}`);
  process.exitCode = 1;
} else {
  console.log('\nservice worker gerado conferido:');
  console.log(`  prefixo ................... ${BASE}`);
  console.log(`  rota dos assets ........... ${doAsset[0]?.fonte ?? ''}`);
  console.log('  skipWaiting ............... presente');
  console.log('  clientsClaim .............. presente');
  console.log('  identificador `base` livre  nenhum');
  console.log('  navegação ................. index.html');
  console.log('  sonda de versão ........... NetworkOnly, antes dos assets');
  console.log(`  rotas avaliadas ........... ${String(avaliadas.length)}, nenhuma lançou`);
}
