# Desenvolvimento

## Fluxo

1. `npm install`
2. `npm run dev` para o cliente, `npm run dev:server` para o servidor
3. escreva o teste junto com o código
4. `npm run check` antes de commitar
5. `npm run simulate -- --games 10000 --seed etapa3-baseline` para medir o jogo
   sem interface

## Regras de qualidade

- `any` é erro de lint. Use `unknown` e estreite o tipo.
- Funções exportadas declaram o tipo de retorno.
- Código de regra usa `Resultado<T, E>` em vez de exceção para caso previsto.
- Nada de regra dentro de componente visual.
- Nada de texto ou número de jogo desenhado dentro de um PNG.

## Testes

O Vitest roda a partir do código-fonte dos pacotes, então `npm test` funciona
sem build prévio. Arquivos que precisam de DOM declaram
`// @vitest-environment jsdom` na primeira linha.

## Publicação

O destino oficial e único é o **GitHub Pages**:

**https://uchihadam3.github.io/Arcane-duel-rebuild/**

O cliente é um site estático. `npm run build` gera `apps/web/dist`, e a branch
`main` é a fonte da publicação. Nenhum serviço externo participa do deploy, e
nenhum segredo é necessário.

### O método de publicação é GitHub Pages via GitHub Actions

Esta é a regra, e ela não é detalhe de implementação:

> A publicação oficial do Arcane Duel é **GitHub Pages via GitHub Actions**,
> com `actions/upload-pages-artifact` e `actions/deploy-pages`.
> **Não publicar empurrando a branch `gh-pages`.**

O motivo é concreto. A origem do Pages deste repositório é "GitHub Actions".
Quando a origem é essa, o serviço publica o **artefato** que `deploy-pages`
envia e ignora completamente o conteúdo de qualquer branch. Em algum momento o
workflow passou a publicar fazendo commit e push em `gh-pages`, e o resultado
foi a pior combinação possível:

- o workflow terminava **verde**;
- a branch `gh-pages` ficava **em dia**;
- o endereço público continuava servindo o **primeiro deploy**, de dias antes.

Nada acusava o problema, porque ninguém estava errado isoladamente — os dois
mecanismos simplesmente não conversam. A branch pode continuar existindo como
histórico, mas não é o endpoint público e não deve voltar a ser o caminho de
publicação.

### Como o deploy acontece

`.github/workflows/pages.yml` roda a cada push em `main`, em dois jobs:

**Construir o cliente**

1. instala com `npm ci` e constrói com `npm run build`, a partir da raiz do
   monorepo — não existe cópia separada do cliente;
2. `actions/configure-pages` com `enablement: true`, que garante que a origem
   do Pages seja "GitHub Actions";
3. passa `BASE_PATH` com o nome do repositório, porque o Pages serve o site
   sob `/Arcane-duel-rebuild/` e não na raiz do domínio, e `GITHUB_SHA` e
   `GITHUB_RUN_NUMBER`, que viram o commit e a build mostrados na tela;
4. copia `index.html` para `404.html`, que é como o Pages faz fallback de SPA
   — ele não tem reescrita de rota;
5. cria `.nojekyll`;
6. **confere o artefato** com `scripts/verificar-artefato-publicado.mjs`;
7. envia `apps/web/dist` com `actions/upload-pages-artifact`.

**Publicar**

8. `actions/deploy-pages` no environment `github-pages`. É **este** job que
   troca o site público. Um build verde não significa site novo: enquanto este
   job não terminar, o endereço continua servindo a versão anterior.

### Conferir o artefato, e não só o workflow

`scripts/verificar-artefato-publicado.mjs` roda logo antes do upload e recusa a
publicação quando o `dist` não corresponde ao commit em construção. Ele exige
que `index.html` aponte para um bundle que existe, que esse bundle carregue o
commit atual, ofereça "Jogar local" e mencione a Etapa 5, e que não carregue
texto da fundação do projeto — `COMBATE NÃO IMPLEMENTADO` e afins.

`apps/web/src/deploy.test.ts` verifica o método lendo o próprio workflow, e
**recusa** qualquer volta a `gh-pages`, `git worktree`, `git commit` ou
`git push` dentro dele.

### Como confirmar que uma publicação realmente aconteceu

Ler a branch `gh-pages` não prova nada — ela não é o endpoint público. O que
prova:

1. o job `Publicar` terminou verde, com `actions/deploy-pages` executado;
2. existe um deployment novo no environment `github-pages` apontando para o
   commit esperado;
3. o HTML servido em https://uchihadam3.github.io/Arcane-duel-rebuild/
   referencia o bundle daquela build.

### Do push ao aplicativo instalado

Esta é a regra do projeto, e vale para todo merge ou push em `main`:

1. o CI roda `npm run check` e a matriz de fumaça;
2. o workflow publica o build no GitHub Pages;
3. o PWA já instalado **detecta** a versão nova sozinho;
4. ao abrir ou reabrir o aplicativo fora de uma partida ativa, ele **aplica**
   a versão nova e recarrega nela;
5. **não é necessário reinstalar o aplicativo.**

O aplicativo instalado é sempre o mesmo produto do site. Não existe "versão
PWA separada": o que está em `gh-pages` é o que o aplicativo mostra, e o
commit publicado aparece na própria tela para conferir isso sem adivinhação.

#### Quando o cliente pergunta por versão nova

`apps/web/src/pwa/atualizacao.ts` coordena, e pergunta:

- na abertura do aplicativo, imediatamente;
- quando ele volta do segundo plano (`visibilitychange` e `focus`);
- quando a conexão volta (`online`);
- a cada 30 minutos enquanto fica aberto — rede de segurança, não polling.

#### Quem decide aplicar

`apps/web/src/pwa/politica-de-atualizacao.ts`, e só ela. A decisão depende do
que o jogador está fazendo:

| Situação        | Decisão                                              |
| --------------- | ---------------------------------------------------- |
| `sem-partida`   | aplica na hora: ativa o worker em espera e recarrega |
| `partida-ativa` | adia; a atualização fica pendente até ser seguro     |

Hoje a interface não tem partida, então a situação é sempre `sem-partida` e a
atualização é automática. Quando a partida existir, quem a conhece passa a
informar `partida-ativa` — e nada mais da estratégia de PWA precisa mudar.

#### Por que `registerType: 'prompt'`

Parece o contrário do que se quer, mas é o oposto: `'autoUpdate'` recarrega
sempre, sem passar por política nenhuma, e não deixaria como adiar a troca
durante um duelo. Com `'prompt'` o worker novo fica em espera e **nós**
mandamos trocar — hoje, imediatamente.

Do lado do Workbox: `skipWaiting: false` (quem manda a mensagem é o
coordenador), `clientsClaim: true` (o worker recém-ativado assume as páginas
já abertas) e `cleanupOutdatedCaches: true` (o precache das versões antigas é
apagado, para nenhuma build velha ressuscitar offline).

#### Identificador de build

A tela mostra `RULES_VERSION`, `CARD_DATA_VERSION`, a versão do cliente, o
commit curto e um identificador de build. O identificador é determinístico:
`actions-<número da execução>` no GitHub Actions, `local-<commit curto>` fora
dele. Nada de carimbo de tempo — duas builds do mesmo commit precisam ter o
mesmo identificador.

### Prefixo de publicação

O prefixo vem de `BASE_PATH` e alimenta três coisas ao mesmo tempo: o `base`
do Vite, os padrões do service worker e o `start_url`/`scope` do manifesto.
`start_url` e `scope` são o que decide se o navegador aceita instalar, então
eles nunca podem divergir do caminho servido.

Sem `BASE_PATH`, o build sai servido na raiz — que é o caso do
desenvolvimento local.

### Rotas

`/login`, `/builds`, `/match` e `/profile` podem ser recarregadas direto: o
Pages devolve `404.html`, que é o mesmo documento do cliente. Um asset que
falta continua devolvendo status 404 de verdade, e é isso que faz o
`<AssetImage>` cair para o placeholder técnico em vez de tentar desenhar HTML.

### Estratégia de cache da PWA

- O shell da aplicação é pré-cacheado (~248 KB).
- `/assets/*` usa `StaleWhileRevalidate`: o PNG aprovado aparece na hora,
  vindo do cache, e a versão nova é buscada em segundo plano. Trocar um asset
  não exige esperar expiração.
- `/api/*`, `/auth/*` e `/socket*` usam `NetworkOnly` e estão fora do fallback
  de navegação. Sessão, partida, matchmaking e dados privados **nunca** podem
  virar conteúdo estático.
- A atualização é `prompt`, nunca automática: o service worker baixa a versão
  nova em segundo plano e a troca só acontece quando o jogador aceita. Uma
  partida em andamento não pode ser recarregada por baixo do jogador.

Como `name`, `start_url`, `scope` e os ícones não mudam entre deploys, a
identidade do aplicativo é sempre a mesma: quem já instalou recebe as versões
novas sem precisar reinstalar.

### Rastreabilidade

O build embute o commit que o originou — `GITHUB_SHA` no workflow, `git
rev-parse HEAD` no desenvolvimento local — e a tela mostra o hash curto no
painel de versões. Dá para conferir na própria página publicada se ela
corresponde ao commit atual da `main`.

### Instalação

`apps/web/src/hooks/useInstalacao.ts` captura `beforeinstallprompt`, chama
`preventDefault()` para o navegador não abrir o prompt sozinho, e guarda o
evento. O botão "Instalar Arcane Duel" só aparece quando há evento guardado, e
o prompt só abre por ação do jogador.

O evento do navegador vale uma única vez. Recusada a instalação, o botão sai e
entra uma linha dizendo que basta recarregar para o navegador oferecer de novo
— dizer "clique outra vez" seria mentira.

No iPhone e no iPad o Safari não expõe o evento, então aparece a instrução do
caminho manual. Não existe instalador nativo nem APK: é sempre a PWA real.

Quando o jogo já está rodando instalado, nada é oferecido. A detecção usa
`display-mode: standalone` e também `navigator.standalone`, que é como o
Safari marca a aplicação instalada.

## Versionamento

- `RULES_VERSION` (`packages/rules-engine/src/version.ts`) sobe quando o
  comportamento do motor muda.
- `CARD_DATA_VERSION` (`packages/card-data/src/version.ts`) sobe quando o
  catálogo muda.

As duas são gravadas em toda partida, porque um replay antigo só faz sentido
com as versões que o produziram.
