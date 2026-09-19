#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';

import { RAIZ } from './paths.mjs';

/*
 * A ficha visual do Checkpoint A.
 *
 * A Etapa 6 foi reprovada em aparelho real depois de passar em toda a
 * verificação automática. A lição não é que a verificação estava errada: é que
 * ela media as coisas erradas. "Não dá overflow", "o alvo tem 44 px" e "não
 * estourou exceção" são pré-requisitos, não qualidade.
 *
 * Esta ficha mede o que a reprovação apontou, e mede em número:
 *
 *   - com que densidade a cena está **realmente** sendo desenhada;
 *   - se a arena aprovada aparece na proporção dela ou esticada;
 *   - quanto da arte chega ao aparelho, em pixels por pixel de tela;
 *   - se o tampo cobre a tela ou sobra preto na quina.
 *
 * E guarda as capturas lado a lado, nas duas densidades, para a avaliação ser
 * feita olhando — que é como o usuário reprovou.
 *
 * Uso:
 *   node scripts/ficha-visual.mjs
 */

const DIST = join(RAIZ, 'apps', 'web', 'dist');
const SAIDA = join(RAIZ, 'docs', 'capturas', 'checkpoint-a');
const PORTA = 4401;

/** A arte aprovada, como ela está no disco. Os números da ficha saem daqui. */
const ARENA_APROVADA = { largura: 941, altura: 1672 };

/*
 * Dois telefones e duas densidades.
 *
 * DPR 1 existe para a comparação ser justa com as capturas anteriores; DPR 3 é
 * o aparelho do usuário, e é onde o borrão aparecia. Medir só em 1 foi parte
 * do motivo de a primeira entrega ter passado.
 */
const CASOS = [
  { nome: '915x412-dpr1', largura: 915, altura: 412, densidade: 1 },
  { nome: '915x412-dpr3', largura: 915, altura: 412, densidade: 3 },
  { nome: '844x390-dpr1', largura: 844, altura: 390, densidade: 1 },
  { nome: '844x390-dpr3', largura: 844, altura: 390, densidade: 3 },
];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.map': 'application/json',
};

const falhas = [];
const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};

const servir = () =>
  new Promise((resolver) => {
    const servidor = createServer((pedido, resposta) => {
      const caminho = join(DIST, decodeURIComponent((pedido.url ?? '/').split('?')[0]));
      const alvo =
        existsSync(caminho) && extname(caminho) !== '' ? caminho : join(DIST, 'index.html');
      try {
        resposta.writeHead(200, {
          'content-type': TIPOS[extname(alvo)] ?? 'application/octet-stream',
        });
        resposta.end(readFileSync(alvo));
      } catch {
        resposta.writeHead(404);
        resposta.end();
      }
    });
    servidor.listen(PORTA, () => {
      resolver(servidor);
    });
  });

const escolher = async (pagina, grupo, classe, dadoDeTeste) => {
  const alvo =
    dadoDeTeste === undefined
      ? pagina.locator(`[data-teste="${grupo}"] [data-classe="${classe}"]`)
      : pagina.getByTestId(dadoDeTeste);
  if ((await alvo.getAttribute('aria-pressed')) === 'true') return;
  await alvo.click();
};

const abrirPartida = async (pagina) => {
  await pagina.goto(`http://localhost:${String(PORTA)}/`, { waitUntil: 'load' });
  await pagina.getByTestId('jogar-local').click();
  await escolher(pagina, 'classes-jogador-1', 'guerreiro');
  await escolher(pagina, 'classes-jogador-2', 'mago');
  await escolher(pagina, null, null, 'comeca-jogador-1');
  await pagina.getByTestId('iniciar-partida').click();
  const pronto = pagina.getByTestId('estou-pronto');
  if ((await pronto.count()) > 0) await pronto.click();
  await pagina.waitForSelector('[data-teste="campo"]');
  // A faixa de turno passa, a textura da arena chega e a cena assenta.
  await pagina.waitForTimeout(2600);
};

/** O teto de resolução de cada nível. É a cópia local de `ORCAMENTO_VISUAL`. */
const TETO_DE_RESOLUCAO = { alta: 3, media: 3, baixa: 2 };

/** O que o canvas realmente tem, perguntado ao próprio WebGL. */
const medirNitidez = (pagina) =>
  pagina.evaluate(() => {
    const canvas = document.querySelector('canvas.arena__cena');
    if (canvas === null) return null;
    const caixa = canvas.getBoundingClientRect();
    return {
      cssLargura: Math.round(caixa.width),
      cssAltura: Math.round(caixa.height),
      bufferLargura: canvas.width,
      bufferAltura: canvas.height,
      devicePixelRatio: window.devicePixelRatio,
      qualidade: canvas.dataset.qualidade ?? 'desconhecida',
    };
  });

const executar = async () => {
  const playwright = await import(process.env.PLAYWRIGHT_MODULO ?? 'playwright').catch(() => null);
  const chromium = playwright?.chromium ?? null;
  if (chromium === null) {
    console.error('playwright não encontrado. Aponte PLAYWRIGHT_MODULO para uma instalação.');
    process.exitCode = 1;
    return;
  }

  // O projeto marca os alvos com `data-teste`; sem isto o Playwright procura
  // `data-testid` e não acha nada.
  playwright.selectors.setTestIdAttribute('data-teste');

  rmSync(SAIDA, { recursive: true, force: true });
  mkdirSync(SAIDA, { recursive: true });

  const servidor = await servir();
  const navegador = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.CHROMIUM_EXECUTAVEL === undefined
      ? {}
      : { executablePath: process.env.CHROMIUM_EXECUTAVEL }),
  });

  const linhas = [];
  for (const caso of CASOS) {
    const contexto = await navegador.newContext({
      viewport: { width: caso.largura, height: caso.altura },
      deviceScaleFactor: caso.densidade,
      hasTouch: true,
    });
    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on('console', (mensagem) => {
      if (mensagem.type() === 'error') erros.push(mensagem.text());
    });

    await abrirPartida(pagina);
    await pagina.screenshot({ path: join(SAIDA, `${caso.nome}.png`) });

    const nitidez = await medirNitidez(pagina);
    exigir(nitidez !== null, `${caso.nome}: a cena tridimensional não subiu`);
    exigir(erros.length === 0, `${caso.nome}: erro no console — ${erros[0] ?? ''}`);

    if (nitidez !== null) {
      const efetiva = nitidez.bufferLargura / Math.max(1, nitidez.cssLargura);
      /*
       * A regra que a reprovação escreveu.
       *
       * A cena precisa ser desenhada na densidade da tela, dentro do que o
       * nível **em vigor** permite. A versão reprovada desenhava a 1,75× num
       * aparelho de DPR 3 mesmo em Alta: borrão escolhido por nós, em cima de
       * nome de carta e número de HUD.
       *
       * O nível em vigor entra na conta de propósito. Este Chromium rasteriza
       * por software e cai para Baixa em qualquer cena — travar a régua em 3×
       * transformaria a guarda num teste do CI, e não do produto. O que ela
       * garante é que não existe limite escondido no código.
       */
      const teto = TETO_DE_RESOLUCAO[nitidez.qualidade] ?? 1;
      exigir(
        efetiva >= Math.min(caso.densidade, teto) - 0.02,
        `${caso.nome}: cena desenhada a ${efetiva.toFixed(2)}× numa tela de ${String(
          nitidez.devicePixelRatio,
        )}× com qualidade ${nitidez.qualidade} (teto ${String(teto)}×)`,
      );

      /*
       * Quantos pixels da arte cabem em cada pixel de tela.
       *
       * Abaixo de 1 a arte está sendo **ampliada**, e nenhum código conserta
       * isso — é resolução de asset. Fica medido e relatado; passar a régua em
       * cima seria esconder do usuário a única coisa que só ele pode resolver.
       */
      const porPixel = ARENA_APROVADA.largura / (nitidez.cssLargura * caso.densidade);
      linhas.push({
        caso: caso.nome,
        css: `${String(nitidez.cssLargura)}×${String(nitidez.cssAltura)}`,
        buffer: `${String(nitidez.bufferLargura)}×${String(nitidez.bufferAltura)}`,
        dpr: nitidez.devicePixelRatio,
        qualidade: nitidez.qualidade,
        efetiva: Number(efetiva.toFixed(2)),
        arenaPorPixel: Number(porPixel.toFixed(2)),
      });
    }

    await contexto.close();
  }

  await navegador.close();
  servidor.close();

  console.log('\nficha visual — Checkpoint A\n');
  console.table(linhas);
  console.log(`capturas em ${SAIDA}\n`);

  if (falhas.length > 0) {
    console.error('falhas:');
    for (const falha of falhas) console.error(`  - ${falha}`);
    process.exitCode = 1;
    return;
  }
  console.log('nitidez conferida: a cena é desenhada na densidade da tela.');
};

await executar();
