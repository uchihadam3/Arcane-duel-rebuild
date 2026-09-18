# Arcane Duel

Card battler de classes um contra um. Duas classes de RPG viram cartas: cada
jogador monta uma build antes da batalha e entra em combate com todas as suas
habilidades disponíveis desde o começo. Sem deck embaralhado, sem compra
aleatória, sem dano variável, sem crítico e sem esquiva.

As regras completas estão em [`docs/FULL_GAME_SPEC.md`](docs/FULL_GAME_SPEC.md),
que é a fonte de verdade do projeto.

Publicado em **https://uchihadam3.github.io/Arcane-duel-rebuild/**, a partir da
branch `main`. O cliente é instalável como PWA no Android e no iPhone.

> **Estado atual: motor e catálogo completos, sem interface de batalha.** As
> doze classes estão implementadas, com as 468 cartas jogáveis do
> [`docs/CARD_CATALOG.md`](docs/CARD_CATALOG.md) — 39 por classe — e pelo menos
> um teste de comportamento por carta. O motor resolve combate inteiro e roda
> headless: a matriz de doze por doze (156 configurações) está em
> [`docs/SIMULATION_STAGE4_MATRIX.md`](docs/SIMULATION_STAGE4_MATRIX.md).
> A tela inicial ainda é um diagnóstico — ela não simula partida, e a interface
> de batalha é escopo das etapas seguintes.

## Requisitos

- Node.js 20.19 ou superior (o projeto é desenvolvido em 22; veja `.nvmrc`)
- npm 10 ou superior

## Como rodar

```bash
npm install          # instala as dependências do workspace inteiro
npm run dev          # cliente web em http://localhost:5173
npm run dev:server   # game-server (diagnóstico) em http://localhost:8787
```

`npm run dev` espelha automaticamente os PNGs de `/assets` para
`apps/web/public/assets` antes de subir o Vite.

## Verificação

```bash
npm run check
```

Esse comando roda, nesta ordem: formatação, lint, conferência do manifesto de
assets, verificação de tipos, build do cliente e testes. Ele precisa passar
antes de qualquer commit.

Comandos individuais:

| Comando                | O que faz                                            |
| ---------------------- | ---------------------------------------------------- |
| `npm run format`       | aplica o Prettier                                    |
| `npm run format:check` | falha se algo estiver fora do formato                |
| `npm run lint`         | ESLint com regras que usam informação de tipo        |
| `npm run typecheck`    | TypeScript em todos os projetos, inclusive os testes |
| `npm run build`        | verifica tipos e gera o cliente em `apps/web/dist`   |
| `npm test`             | Vitest, uma vez                                      |
| `npm run test:watch`   | Vitest em modo observador                            |
| `npm run assets:check` | confere o manifesto contra os arquivos em `/assets`  |
| `npm run assets:sync`  | espelha `/assets` em `apps/web/public/assets`        |
| `npm run clean`        | remove builds e o espelho de assets                  |

## Simulador headless

```bash
npm run simulate -- --games 10000 --seed baseline
npm run simulate:matrix -- --seed etapa4-matrix   # 12x12: 156 configurações
npm run simulate:matrix:smoke                     # uma partida por configuração
```

O simulador roda partidas inteiras sem interface, decidindo só pela projeção que
um cliente receberia — ele não enxerga a mão do adversário. Qualquer comando
ilegal ou invariante de estado quebrada faz o processo terminar com erro: um
lote nessas condições não vale como medição.

## Estrutura

```text
apps/
  web/            cliente React + Vite, landscape-first, instalável como PWA
  game-server/    esqueleto do servidor autoritativo de partida
packages/
  shared-types/   tipos de domínio compartilhados
  rules-engine/   motor de regras determinístico, sem DOM e sem React
  card-data/      descritores de classe e catálogo de cartas
  ai/             contratos da IA do Desafio de doze adversários
  ui/             manifesto de assets, resolução de URLs e componentes
  audio/          vocabulário de eventos sonoros e barramentos
  vfx/            qualidade e ritmo de animação
assets/           PNGs aprovados, organizados por função
docs/             documentos de design e documentação técnica
scripts/          ferramentas de manutenção do repositório
```

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — camadas, dependências e decisões técnicas
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — fluxo de trabalho e publicação
- [`docs/ASSETS.md`](docs/ASSETS.md) — como os assets entram no projeto
- [`docs/VIDEO_ANALYSIS.md`](docs/VIDEO_ANALYSIS.md) — o que o vídeo de referência ensina, e o que não copiar
- [`docs/AMBIGUIDADES.md`](docs/AMBIGUIDADES.md) — pontos em aberto nos documentos de design

Documentos de design (não editar sem atualizar as regras junto):
`FULL_GAME_SPEC.md`, `CARD_CATALOG.md`, `PRESET_BUILDS.md`, `ASSET_CATALOG.md`,
`VIDEO_VISUAL_TARGET.md`, `ROADMAP_CODEX.md`, `CODEX_START_HERE.md`.
