# Desenvolvimento

## Fluxo

1. `npm install`
2. `npm run dev` para o cliente, `npm run dev:server` para o servidor
3. escreva o teste junto com o código
4. `npm run check` antes de commitar

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

O cliente é um site estático: `npm run build` gera `apps/web/dist`, servido por
qualquer host com HTTPS. A branch `main` é a fonte da publicação.

### Vercel

`vercel.json` na raiz já contém toda a configuração. O build parte da raiz do
monorepo e publica `apps/web/dist` — não existe cópia separada do cliente.

Configuração do projeto na Vercel:

| Campo             | Valor                            |
| ----------------- | -------------------------------- |
| Repositório       | `uchihadam3/Arcane-duel-rebuild` |
| Production Branch | `main`                           |
| Framework Preset  | Other                            |
| Root Directory    | `.` (a raiz do repositório)      |
| Install Command   | `npm ci`                         |
| Build Command     | `npm run build`                  |
| Output Directory  | `apps/web/dist`                  |
| Node.js Version   | 22.x                             |

Nenhuma variável de ambiente é necessária. O projeto não usa segredo nenhum.

A Vercel expõe `VERCEL_GIT_COMMIT_SHA` durante o build; o cliente embute esse
valor e mostra o commit no painel de versões, então dá para conferir na própria
página publicada se ela corresponde ao commit atual da `main`.

Depois de conectado, todo push em `main` gera um deploy de produção
automaticamente, e cada pull request ganha um deploy de pré-visualização.

### O que `vercel.json` garante

- **Fallback de SPA com exceção.** Qualquer rota que não seja arquivo cai em
  `index.html`, para que `/login`, `/builds`, `/match` e `/profile` possam ser
  recarregadas direto sem 404. Ficam de fora `/assets/`, `/icons/`, `/app/`,
  `sw.js`, `registerSW.js`, `workbox-*` e `manifest.webmanifest`: um asset que
  falta precisa devolver 404 de verdade, não HTML com status 200.
  `apps/web/src/deploy.test.ts` verifica essa expressão nos dois sentidos.
- **Service worker sempre revalidado.** `sw.js` e `index.html` vão com
  `max-age=0, must-revalidate`, senão a atualização nunca chegaria ao jogador.
- **Bundles com hash em cache longo** (`/app/*`, um ano, `immutable`).
- **Manifesto com `application/manifest+json`**, que é o que o navegador
  espera para oferecer a instalação.

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
