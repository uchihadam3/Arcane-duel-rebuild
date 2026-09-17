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

### Como o deploy acontece

`.github/workflows/pages.yml` roda a cada push em `main`:

1. instala com `npm ci` e constrói com `npm run build`, a partir da raiz do
   monorepo — não existe cópia separada do cliente;
2. passa `BASE_PATH` com o nome do repositório, porque o Pages serve o site
   sob `/Arcane-duel-rebuild/` e não na raiz do domínio;
3. copia `index.html` para `404.html`, que é como o Pages faz fallback de SPA
   — ele não tem reescrita de rota;
4. cria `.nojekyll`, senão o Pages reprocessaria o site pelo Jekyll;
5. publica o conteúdo de `apps/web/dist` na branch `gh-pages`, com um commit
   por deploy. Sem force push: o histórico do que já foi publicado é
   preservado.

A branch `gh-pages` guarda apenas o resultado do build. Ela é gerada — nada
deve ser editado à mão nela.

`apps/web/src/deploy.test.ts` verifica essas garantias lendo o próprio
workflow. Um erro ali só apareceria depois do deploy, com o jogo no ar.

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
