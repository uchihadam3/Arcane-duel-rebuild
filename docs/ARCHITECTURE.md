# Arquitetura

## Princípio

Regra e apresentação são camadas separadas. O motor de regras precisa ser
determinístico, testável sem abrir o jogo e reproduzível a partir de eventos.
Nenhuma regra mora dentro de componente visual, e nenhum texto ou número de
jogo mora dentro de um PNG.

## Camadas e dependências

```text
apps/web ──────────┐
                   ├── packages/ui ──────┐
apps/game-server ──┤                     ├── packages/shared-types
                   ├── packages/card-data┤
                   ├── packages/rules-engine
                   ├── packages/ai ──────┘
                   ├── packages/audio
                   └── packages/vfx
```

A seta aponta para o que o pacote pode importar. As setas nunca voltam:

- `shared-types` não importa ninguém;
- `rules-engine`, `card-data` e `ai` importam apenas `shared-types`;
- `ui` conhece React e o DOM, mas nenhuma regra de combate;
- `apps/web` compõe tudo;
- `apps/game-server` usa regras e dados, nunca `ui`, `vfx` ou `audio`.

Isso não é só convenção: o ESLint proíbe, nas camadas puras, importar React,
Three.js ou qualquer pacote de apresentação, e proíbe tocar em `window`,
`document` e `fetch` (veja `eslint.config.js`).

## Determinismo e replay

O combate do jogo não tem aleatoriedade. O gerador pseudoaleatório do
`rules-engine` existe apenas para o que o documento permite sortear fora do
combate: a ordem dos doze adversários de uma campanha e a Receita escolhida
pela IA. Ele é semeado por string, então a mesma semente reproduz a mesma
campanha.

Toda partida grava um `CarimboDeVersao` com `rulesVersion` e `cardDataVersion`.
Um replay só é interpretável à luz das versões que o produziram, e as duas
sobem sempre que o comportamento correspondente muda.

O `LogDeEventos` numera os eventos de forma contígua e `reproduzir()` aplica um
log sobre um estado inicial. Os tipos concretos de evento de combate entram
junto com as regras universais.

## Idioma do código

O vocabulário do jogo é definido em português nos documentos de design e termos
como Guarda, Impacto, Ruptura, Reserva, Ativar e Exaurir têm significado exato.
Traduzir esse vocabulário para o inglês introduziria ambiguidade justamente
onde ela é mais cara, então **os termos de domínio ficam em português** no
código. Nomes de infraestrutura (build, lint, config, server) seguem o padrão
do ecossistema.

## Ativar e Exaurir

São coisas diferentes e o motor trata as duas separadamente
(`packages/rules-engine/src/estado-de-carta.ts`):

| Termo       | Vale para                  | Efeito                                                                  |
| ----------- | -------------------------- | ----------------------------------------------------------------------- |
| **Ativar**  | Passiva e Carta de Classe  | efeito renovável; a carta gira para a horizontal e volta a ficar Pronta |
| **Exaurir** | **apenas** Carta de Classe | efeito extremo; a carta sai da partida permanentemente                  |

O tipo `EstadoDePassiva` não possui e não pode possuir o estado `exaurida`.
Nenhum efeito do jogo-base recupera uma Carta de Classe Exaurida.

## Cliente

React + Vite + TypeScript. A batalha é desenhada primeiro para landscape e
precisa caber inteira na tela: o `body` não rola, cada painel rola dentro de si.

A arena tridimensional ainda não existe, mas nada aqui impede a evolução para
Three.js / React Three Fiber: o cliente não guarda estado de regra, os assets
são resolvidos por id semântico em vez de caminho de arquivo, e a composição já
é declarada em camadas (arena, slots, cartas, texto, overlays, VFX) em
`packages/ui/src/theme/tokens.ts`.

## Servidor

`apps/game-server` é um esqueleto: ele responde diagnóstico e declara
explicitamente o que ainda não faz. O servidor final é autoritativo — o cliente
envia intenção de ação e o servidor valida custo, alvo, estado, informação
escondida e sequência. O cliente nunca é fonte de verdade de uma partida
online.

## Ferramentas

| Ferramenta                 | Papel                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| npm workspaces             | monorepo sem dependência extra de gerenciador                      |
| TypeScript (strict)        | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| ESLint + typescript-eslint | regras com informação de tipo; `any` é erro                        |
| Prettier                   | formatação                                                         |
| Vitest                     | testes; roda a partir do código-fonte, sem build prévio            |
| Vite                       | build e servidor de desenvolvimento do cliente                     |
| vite-plugin-pwa            | manifest, service worker e atualização controlada                  |

Cada pacote tem dois arquivos de configuração do TypeScript: `tsconfig.json`
verifica tipos incluindo os testes, e `tsconfig.build.json` emite o `dist` sem
eles.
