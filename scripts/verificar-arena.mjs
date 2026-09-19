#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';

import { RAIZ } from './paths.mjs';

/*
 * A verificação da arena, em navegador de verdade.
 *
 * O jsdom não faz layout, não tem WebGL e não sabe o que é uma safe area.
 * Tudo o que a Etapa 6 promete — nada competitivo cortado, alvo de toque de
 * 44 px, sessenta quadros, nenhuma exceção de WebGL — só pode ser conferido
 * abrindo o cliente publicado num Chromium e medindo.
 *
 * Foi exatamente assim que a Etapa 5 achou dois defeitos reais que os testes
 * em jsdom não pegavam. Esta verificação é a mesma ideia, agora com a cena
 * tridimensional no ar e com capturas de regressão do nosso próprio jogo.
 *
 * Uso:
 *   node scripts/verificar-arena.mjs               confere e captura
 *   node scripts/verificar-arena.mjs --so-capturas pula as asserções lentas
 */

const DIST = join(RAIZ, 'apps', 'web', 'dist');
/** As capturas de trabalho: uma por resolução, regeneradas a cada execução. */
const CAPTURAS = join(RAIZ, 'capturas');
/**
 * A referência de regressão visual.
 *
 * São os momentos do **nosso** jogo, em 844×390 e escala 1. A comparação é
 * sempre contra nós mesmos: nada aqui é comparado com o jogo do vídeo.
 *
 * Estes arquivos **não entram no repositório**: `capturas/` está no
 * `.gitignore` e pega este diretório também. São doze megabytes de PNG por
 * execução, num repositório que é a própria fonte do GitHub Pages — versioná-
 * los faria cada clone e cada publicação carregarem isso. Quem quiser a
 * referência roda o comando; comentar que ela é "versionada" quando não é seria
 * pior do que não ter.
 */
const REFERENCIA = join(RAIZ, 'docs', 'capturas');
const PORTA = 4399;

/** As resoluções que o documento manda atender. */
const VIEWPORTS = [
  { nome: '720x360', largura: 720, altura: 360 },
  { nome: '800x360', largura: 800, altura: 360 },
  { nome: '844x390', largura: 844, altura: 390 },
  { nome: '915x412', largura: 915, altura: 412 },
  { nome: '1280x720', largura: 1280, altura: 720 },
  { nome: '1560x720', largura: 1560, altura: 720 },
];

/** O alvo de toque mínimo. Menor que isto o dedo erra. */
const ALVO_MINIMO = 44;

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

/**
 * Escolhe uma opção só quando ela ainda não está escolhida.
 *
 * A configuração já vem com Guerreiro e Mago marcados, e clicar de novo num
 * botão que a tela acabou de rerrenderizar dá corrida de elemento destacado.
 */
const escolher = async (pagina, grupo, classe, dadoDeTeste) => {
  const alvo =
    dadoDeTeste === undefined
      ? pagina.locator(`[data-teste="${grupo}"] [data-classe="${classe}"]`)
      : pagina.getByTestId(dadoDeTeste);
  if ((await alvo.getAttribute('aria-pressed')) === 'true') return;
  await alvo.click();
};

/** Leva a partida do menu até o campo, com Guerreiro contra Mago. */
const abrirPartida = async (pagina, opcoes = {}) => {
  await pagina.goto(`http://localhost:${String(PORTA)}/`, { waitUntil: 'load' });
  await pagina.getByTestId('jogar-local').click();
  await escolher(pagina, 'classes-jogador-1', 'guerreiro');
  await escolher(pagina, 'classes-jogador-2', 'mago');
  await escolher(pagina, null, null, opcoes.comeca ?? 'comeca-jogador-1');
  await pagina.getByTestId('iniciar-partida').click();
  const pronto = pagina.getByTestId('estou-pronto');
  if ((await pronto.count()) > 0) await pronto.click();
  await pagina.waitForSelector('[data-teste="campo"]');
  // Um par de quadros para a cena montar e a primeira faixa de turno passar.
  await pagina.waitForTimeout(1400);
};

/** Foca a primeira carta jogável da mão e devolve o nome dela. */
const focarPrimeiraJogavel = async (pagina) => {
  const carta = pagina.locator('.peca--mao .carta--selecionavel').first();
  if ((await carta.count()) === 0) return null;
  const nome = await carta.getAttribute('data-carta');
  /*
   * O clique vai direto no elemento, e não por coordenada.
   *
   * Com a cena no ar as cartas em DOM são transparentes e se sobrepõem; um
   * clique por ponto acertaria a vizinha. Quem confere se o dedo alcança é a
   * medição de alvo de toque, logo acima — aqui o que interessa é chegar à
   * carta certa.
   */
  await carta.dispatchEvent('click');
  await pagina.waitForTimeout(240);
  return nome;
};

const medirQuadros = async (pagina) =>
  pagina.evaluate(
    () =>
      new Promise((resolver) => {
        let quadros = 0;
        const inicio = performance.now();
        const passo = () => {
          quadros += 1;
          if (performance.now() - inicio >= 1000) {
            resolver(quadros);
            return;
          }
          requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      }),
  );

/** Os momentos que a referência visual deve cobrir (§60). */
const MOMENTOS_ESPERADOS = [
  'inicio',
  'mao-guerreiro',
  'mao-mago',
  'carta-focada',
  'inspetor',
  'janela-de-resposta',
  'classe-ativada',
  'classe-exaurida',
  'ruptura',
  'ultimate',
  'vitoria',
];

/*
 * A ordem em que esta partida automática escolhe o que jogar.
 *
 * Não é uma IA e não pretende ser — a IA é outra etapa. É uma preferência
 * fixa, escolhida para que a partida **alcance** os momentos que a referência
 * visual precisa registrar: Impacto alto primeiro leva a Guarda a zero e
 * produz Ruptura; a Ultimate entra assim que ficar jogável.
 */
const PREFERENCIA = [
  'Quebra-Reinos',
  'Meteoro',
  'Golpe de Cerco',
  'Quebra-Escudo',
  'Bola de Fogo',
  'Pulso Cinético',
  'Ombro de Guerra',
  'Dardo Arcano',
];

/** Foca a carta preferida entre as jogáveis, e devolve o nome dela. */
const focarPreferida = async (pagina) => {
  for (const nome of PREFERENCIA) {
    const alvo = pagina.locator(`.peca--mao .carta--selecionavel[data-carta="${nome}"]`).first();
    if ((await alvo.count()) === 0) continue;
    await alvo.dispatchEvent('click');
    await pagina.waitForTimeout(220);
    return nome;
  }
  return focarPrimeiraJogavel(pagina);
};

/** Declara a carta preferida e devolve o nome dela, ou `null`. */
const declararUmaAcao = async (pagina) => {
  const nome = await focarPreferida(pagina);
  if (nome === null) return null;
  const usar = pagina.getByRole('button', { name: 'Usar' });
  if ((await usar.count()) > 0) {
    await usar.first().click();
    // O beat da declaração segura a entrada enquanto corre; interagir antes
    // do fim dele encontra a carta como texto, e não como botão.
    await pagina.waitForTimeout(560);
    return nome;
  }
  const ultimate = pagina.getByRole('button', { name: 'Usar Ultimate' });
  if ((await ultimate.count()) > 0) {
    await ultimate.first().click();
    const confirmar = pagina.getByTestId('confirmar');
    if ((await confirmar.count()) > 0) await confirmar.click();
    await pagina.waitForTimeout(320);
    return nome;
  }
  return null;
};

/** Fecha a janela de complementos, responde sem Resposta e resolve a Ação. */
const resolverAAcao = async (pagina, aoAbrirResposta) => {
  const enviar = pagina.getByTestId('enviar-acao');
  if ((await enviar.count()) === 0) return;
  await enviar.click();
  await pagina.waitForTimeout(220);

  const defensor = pagina.getByTestId('estou-pronto');
  if ((await defensor.count()) > 0) await defensor.click();
  await pagina.waitForTimeout(420);
  if (aoAbrirResposta !== undefined) await aoAbrirResposta();

  const sem = pagina.getByTestId('sem-resposta');
  if ((await sem.count()) === 0) return;
  await sem.click();
  await pagina.waitForTimeout(260);

  // A resolução é apresentada para quem pega o aparelho em seguida: o lote
  // espera a confirmação da troca, e só então a fila o toca.
  const proximo = pagina.getByTestId('estou-pronto');
  if ((await proximo.count()) > 0) await proximo.click();
  /*
   * A sequência de um Ataque — viagem, impacto, número e, quando houver,
   * Ruptura — cabe no orçamento de 3,2 s. Esperar por ela é esperar o que o
   * jogador vê; sair antes seria fotografar o campo já parado.
   */
  for (let espera = 0; espera < 10; espera += 1) {
    await pagina.waitForTimeout(220);
    if ((await pagina.getByTestId('ruptura').count()) > 0) return;
  }
};

const guardar = async (pagina, nome, registrados) => {
  await pagina.screenshot({ path: join(REFERENCIA, `${nome}.png`) });
  registrados.add(nome);
};

/**
 * Joga Guerreiro contra Mago pela interface e guarda os momentos que aparecem.
 *
 * Ela joga de verdade: nenhum estado é forjado, nenhum painel de depuração é
 * aberto. Por isso alguns momentos podem não acontecer nesta partida — e é
 * melhor relatar isso do que fabricar uma captura.
 */
const capturarMomentos = async (navegador) => {
  const registrados = new Set();
  const contexto = await navegador.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    hasTouch: true,
  });
  const pagina = await contexto.newPage();

  await abrirPartida(pagina);
  await guardar(pagina, 'inicio', registrados);
  await guardar(pagina, 'mao-guerreiro', registrados);

  await focarPrimeiraJogavel(pagina);
  await guardar(pagina, 'carta-focada', registrados);
  await guardar(pagina, 'inspetor', registrados);

  /*
   * Carta de Classe: Ativar e Exaurir são coisas diferentes, e parecem.
   *
   * A janela para os dois é a mesma — uma Ação já declarada —, então as duas
   * capturas saem da mesma jogada: a primeira carta que aceitar Ativar é
   * ativada, e a outra é Exaurida.
   */
  if ((await declararUmaAcao(pagina)) !== null) {
    const daClasse = ['Postura da Vanguarda', 'Cerco Metódico'];
    let ativada = null;

    for (const nome of daClasse) {
      const carta = pagina.locator(`.peca--campo .carta[data-carta="${nome}"]`).first();
      if ((await carta.count()) === 0) continue;
      await carta.dispatchEvent('click');
      await pagina.waitForTimeout(260);
      const ativar = pagina.getByRole('button', { name: 'Ativar' });
      if ((await ativar.count()) === 0 || (await ativar.first().isDisabled())) continue;
      await ativar.first().click();
      await pagina.waitForTimeout(620);
      await guardar(pagina, 'classe-ativada', registrados);
      ativada = nome;
      break;
    }

    for (const nome of daClasse.filter((item) => item !== ativada)) {
      const carta = pagina.locator(`.peca--campo .carta[data-carta="${nome}"]`).first();
      if ((await carta.count()) === 0) continue;
      await carta.dispatchEvent('click');
      await pagina.waitForTimeout(260);
      const exaurir = pagina.getByRole('button', { name: 'Exaurir' });
      if ((await exaurir.count()) === 0 || (await exaurir.first().isDisabled())) continue;
      await exaurir.first().click();
      const confirmar = pagina.getByTestId('confirmar');
      if ((await confirmar.count()) > 0) await confirmar.click();
      await pagina.waitForTimeout(820);
      await guardar(pagina, 'classe-exaurida', registrados);
      break;
    }

    await resolverAAcao(pagina, async () => {
      await guardar(pagina, 'janela-de-resposta', registrados);
    });
  }

  /*
   * A partida segue, e os momentos raros são colhidos quando acontecem.
   *
   * O limite existe para a verificação não virar um duelo infinito; o teste de
   * partida completa em jsdom já cobre o fim de jogo.
   */
  for (let rodada = 0; rodada < 90; rodada += 1) {
    if ((await pagina.getByTestId('resultado').count()) > 0) {
      await guardar(pagina, 'vitoria', registrados);
      break;
    }
    const pronto = pagina.getByTestId('estou-pronto');
    if ((await pronto.count()) > 0) {
      await pronto.click();
      await pagina.waitForTimeout(320);
      continue;
    }
    if (!registrados.has('ruptura') && (await pagina.getByTestId('ruptura').count()) > 0) {
      await guardar(pagina, 'ruptura', registrados);
    }
    const jogada = await declararUmaAcao(pagina);
    if (jogada !== null) {
      if (!registrados.has('ultimate') && (jogada === 'Quebra-Reinos' || jogada === 'Meteoro')) {
        await pagina.waitForTimeout(420);
        await guardar(pagina, 'ultimate', registrados);
      }
      await resolverAAcao(pagina, async () => {
        if (!registrados.has('ruptura') && (await pagina.getByTestId('ruptura').count()) > 0) {
          await guardar(pagina, 'ruptura', registrados);
        }
      });
      if (!registrados.has('ruptura') && (await pagina.getByTestId('ruptura').count()) > 0) {
        await guardar(pagina, 'ruptura', registrados);
      }
      continue;
    }
    const encerrar = pagina.getByTestId('encerrar-turno');
    if ((await encerrar.count()) === 0) break;
    await encerrar.click();
    await pagina.waitForTimeout(340);
  }

  await contexto.close();

  /* A mão do Mago, numa partida em que ele começa. */
  const doMago = await navegador.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    hasTouch: true,
  });
  const paginaDoMago = await doMago.newPage();
  await abrirPartida(paginaDoMago, { comeca: 'comeca-jogador-2' });
  await guardar(paginaDoMago, 'mao-mago', registrados);
  await doMago.close();

  return registrados;
};

const main = async () => {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error(`não há build em ${DIST} — rode "npm run build" antes.`);
    process.exit(1);
  }

  /*
   * O Playwright é ferramenta de bancada, não dependência do cliente.
   *
   * Ele não entra no `package.json`: quem roda esta verificação já tem um
   * Chromium por perto, e o CI não precisa baixar um navegador para conferir
   * regra. Sem ele, a verificação diz o que falta e sai sem reprovar nada.
   */
  const playwright = await import(process.env.PLAYWRIGHT_MODULO ?? 'playwright').catch(() => null);
  const chromium = playwright?.chromium ?? null;
  if (playwright === null || chromium === null) {
    console.error(
      'playwright não encontrado. Instale-o ou aponte PLAYWRIGHT_MODULO para uma instalação existente.',
    );
    process.exitCode = 1;
    return;
  }

  // O projeto marca seus ganchos de teste com `data-teste`, em português,
  // como o resto do código. O Playwright procura `data-testid` por padrão.
  playwright.selectors.setTestIdAttribute('data-teste');

  rmSync(CAPTURAS, { recursive: true, force: true });
  mkdirSync(CAPTURAS, { recursive: true });
  mkdirSync(REFERENCIA, { recursive: true });

  const servidor = await servir();
  const navegador = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.CHROMIUM_EXECUTAVEL === undefined
      ? {}
      : { executablePath: process.env.CHROMIUM_EXECUTAVEL }),
  });

  try {
    for (const viewport of VIEWPORTS) {
      const contexto = await navegador.newContext({
        viewport: { width: viewport.largura, height: viewport.altura },
        deviceScaleFactor: 2,
        hasTouch: true,
      });
      const pagina = await contexto.newPage();

      const erros = [];
      pagina.on('console', (mensagem) => {
        if (mensagem.type() === 'error') erros.push(mensagem.text());
      });
      pagina.on('pageerror', (erro) => {
        erros.push(String(erro));
      });

      await abrirPartida(pagina);

      /* 1. A cena tridimensional existe mesmo. */
      const temCanvas = await pagina.locator('canvas.arena__cena').count();
      exigir(temCanvas === 1, `${viewport.nome}: a arena não montou o canvas`);

      /* 2. Nada de rolagem: a batalha cabe em uma tela. */
      const rolagem = await pagina.evaluate(() => ({
        horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        vertical: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      }));
      exigir(
        rolagem.horizontal <= 1,
        `${viewport.nome}: rolagem horizontal de ${rolagem.horizontal}px`,
      );
      exigir(rolagem.vertical <= 1, `${viewport.nome}: rolagem vertical de ${rolagem.vertical}px`);

      /* 3. Nada competitivo cortado. */
      const cortados = await pagina.evaluate(
        ({ largura, altura }) => {
          const essenciais = [
            '[data-teste="hud-proprio"]',
            '[data-teste="hud-adversario"]',
            '.disco',
            '.zona--acao',
            '.zona--resposta',
            '.zona--passiva',
            '.zona--carta-de-classe',
            '.zona--ultimate',
            '.zona--cooldown',
          ];
          const fora = [];
          for (const seletor of essenciais) {
            for (const elemento of document.querySelectorAll(seletor)) {
              const caixa = elemento.getBoundingClientRect();
              if (caixa.width === 0 || caixa.height === 0) continue;
              if (
                caixa.left < -1 ||
                caixa.top < -1 ||
                caixa.right > largura + 1 ||
                caixa.bottom > altura + 1
              ) {
                fora.push(`${seletor} em ${Math.round(caixa.left)},${Math.round(caixa.top)}`);
              }
            }
          }
          /*
           * A mão é medida por outra régua, e a diferença é intencional.
           *
           * As cartas da mão são grandes o bastante para serem lidas e, por
           * isso, o pé delas sai pela borda de baixo — como na referência. O
           * que **não** pode sair é o topo, onde ficam nome, custo e tipo.
           */
          for (const carta of document.querySelectorAll('.peca--mao')) {
            const caixa = carta.getBoundingClientRect();
            if (caixa.width === 0 || caixa.height === 0) continue;
            if (caixa.top < -1 || caixa.left < -1 || caixa.right > largura + 1) {
              fora.push(`.peca--mao com o topo fora em ${Math.round(caixa.top)}`);
            }
            if (caixa.top > altura - 56) {
              fora.push(`.peca--mao baixa demais: só ${Math.round(altura - caixa.top)}px visíveis`);
            }
          }

          return fora;
        },
        { largura: viewport.largura, altura: viewport.altura },
      );
      for (const corte of cortados) exigir(false, `${viewport.nome}: cortado — ${corte}`);

      /*
       * 4. O dedo alcança.
       *
       * O que se mede é a área **clicável**, e não a área desenhada. Uma carta
       * mantém a proporção impressa da moldura aprovada — esticá-la até 44 px
       * a deformaria —, então quem cresce é o alcance, por uma extensão
       * invisível declarada em `::after`. É essa soma que o dedo encontra, e é
       * ela que precisa passar no mínimo.
       */
      const pequenos = await pagina.evaluate((minimo) => {
        const px = (valor) => {
          const numero = Number.parseFloat(valor);
          return Number.isFinite(numero) ? numero : 0;
        };
        const alvos = [...document.querySelectorAll('button')];
        return alvos
          .map((alvo) => {
            const caixa = alvo.getBoundingClientRect();
            if (caixa.width === 0 || caixa.height === 0) return null;
            const depois = window.getComputedStyle(alvo, '::after');
            const estende = depois.content !== 'none' && depois.position === 'absolute';
            const extra = estende
              ? {
                  esquerda: Math.min(0, px(depois.left)),
                  direita: Math.min(0, px(depois.right)),
                  topo: Math.min(0, px(depois.top)),
                  base: Math.min(0, px(depois.bottom)),
                }
              : { esquerda: 0, direita: 0, topo: 0, base: 0 };
            const largura = caixa.width - extra.esquerda - extra.direita;
            const altura = caixa.height - extra.topo - extra.base;
            // Meio pixel de tolerância: a extensão fecha exatamente no mínimo,
            // e o arredondamento do layout a deixa em 43,99.
            return Math.min(largura, altura) < minimo - 0.5
              ? `${alvo.className}: ${Math.round(largura)}x${Math.round(altura)} clicáveis`
              : null;
          })
          .filter((item) => item !== null);
      }, ALVO_MINIMO);
      for (const pequeno of pequenos) {
        exigir(false, `${viewport.nome}: alvo de toque pequeno — ${pequeno}`);
      }

      /* 5. Nenhuma exceção, nenhum erro de WebGL. */
      for (const erro of erros) exigir(false, `${viewport.nome}: erro no console — ${erro}`);

      /*
       * 6. Quadros por segundo: medidos e relatados, não usados como nota.
       *
       * Este Chromium rasteriza por software (SwiftShader). Não há GPU, o
       * custo de preenchimento em 1560×720 é dezenas de vezes o de um telefone
       * comum, e o número oscila com a carga da máquina — a mesma resolução
       * mediu 31 e 2 em execuções seguidas. Transformar isso em critério de
       * aprovação daria uma verificação que reprova por acaso, que é pior do
       * que nenhuma.
       *
       * O que **é** critério: o laço continuar vivo. Zero quadro em um segundo
       * é a cena travada, e isso reprova. A meta de sessenta quadros se mede
       * em aparelho, com GPU, e é isso que a validação no celular faz.
       */
      const quadros = await medirQuadros(pagina);
      exigir(quadros > 0, `${viewport.nome}: a cena não desenhou nenhum quadro`);
      console.log(`  ${viewport.nome} ... ${String(quadros)} fps em software, sem cortes`);

      await pagina.screenshot({ path: join(CAPTURAS, `campo-${viewport.nome}.png`) });
      await contexto.close();
    }

    /* ---- Capturas de regressão do nosso próprio jogo ------------------ */
    const registrados = await capturarMomentos(navegador);
    for (const faltando of MOMENTOS_ESPERADOS.filter((nome) => !registrados.has(nome))) {
      console.log(`  (sem captura de "${faltando}" nesta partida)`);
    }
  } finally {
    await navegador.close();
    servidor.close();
  }

  if (falhas.length > 0) {
    console.error('\narena NÃO passou:');
    for (const falha of falhas) console.error(`  - ${falha}`);
    process.exitCode = 1;
    return;
  }

  console.log('\narena conferida em navegador:');
  console.log(`  resoluções ............ ${VIEWPORTS.map((v) => v.nome).join(', ')}`);
  console.log('  canvas ................ presente em todas');
  console.log('  rolagem ............... nenhuma');
  console.log('  cortes ................ nenhum');
  console.log(`  alvos de toque ........ nenhum abaixo de ${String(ALVO_MINIMO)}px`);
  console.log('  console ............... sem erros');
  console.log('  quadros ............... medidos acima, em rasterização por software');
  console.log(`  capturas por resolução  ${CAPTURAS}`);
  console.log(`  referência de regressão ${REFERENCIA}`);
};

await main();
