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

## O que o vídeo de referência impôs à arquitetura

A análise quadro a quadro está em [`VIDEO_ANALYSIS.md`](VIDEO_ANALYSIS.md).
Três conclusões exigiram contrato no código; o resto confirmou o que já
existia.

### Âncoras de campo

No vídeo, um efeito de ataque nasce na carta atacante e viaja pelo tabuleiro
até o alvo antes de estourar. Para isso o VFX precisa saber onde as duas zonas
estão, sem conhecer o layout.

`packages/ui/src/composicao/ancoras.ts` resolve com um registro: cada zona
publica um ponto normalizado (0..1 sobre a área do campo) e quem desenha um
efeito apenas consulta. O ponto é normalizado de propósito — o mesmo registro
serve para o campo em DOM de hoje e para um campo tridimensional projetado em
tela depois. Só muda quem preenche o registro.

Isso também é o que torna possível a Resposta entrar visualmente ligada à Ação
a que responde: as duas são âncoras vizinhas, não posições calculadas à mão.

### Escopo de ênfase

O vídeo destaca o campo em três escalas: a carta em foco, o slot válido e — o
caso que os overlays aprovados não cobrem — **o lado inteiro do tabuleiro
banhado de luz** enquanto o efeito daquele jogador resolve.

`packages/ui/src/composicao/enfase.ts` torna o escopo explícito
(`carta`, `slot`, `grupo-de-slots`, `lado`, `campo`) e mapeia apenas as ênfases
de seleção para os overlays aprovados. `area-afetada` fica deliberadamente sem
asset: é luz em código, não uma imagem esticada.

### Orçamento de apresentação

Durações medidas no vídeo: faixa de troca de turno ~1,3 s, faixa de fase
~0,9 s, apresentação de carta ~1,0 s, e a sequência mais longa — um ataque
completo — ~3,2 s.

`packages/vfx` passou a publicar `ORCAMENTO_DE_APRESENTACAO_MS` (1,2 s por
momento, 3,2 s por sequência) e `estouroDeOrcamento()`. A verificação usa
sempre a velocidade normal: acelerar animação não pode virar desculpa para
desenhar uma sequência longa demais.

### O que o vídeo confirmou sem exigir mudança

- **Câmera fixa.** Em 24 s de partida a câmera não orbita nem muda de ângulo.
  A profundidade vem da geometria e da luz. Isso simplifica o caminho para
  Three.js em vez de complicá-lo.
- **Estado não espera animação.** Contadores mudam no instante do evento, com a
  animação ainda tocando. É exatamente a separação que o motor já garante.
- **Texto e número nunca na arte.** Valores de combate são texto flutuante
  sobre o campo, sempre renderizados por código.
- **HUD é camada de tela, campo é cena.** Vida e retratos ficam presos aos
  cantos; slots e cartas vivem no tabuleiro. A separação de camadas em
  `theme/tokens.ts` já previa isso.

## Estado da partida

`packages/shared-types` descreve o estado; `packages/rules-engine` cria,
valida e projeta. Nenhuma das duas camadas resolve combate — isso é a etapa
dois do roadmap.

### Forma do estado

`EstadoDaPartida` guarda identificador, carimbo de versão, semente do replay,
situação, **uma tupla de exatamente dois jogadores**, turno e desfecho. A tupla
é o que garante os dois jogadores: não existe estado representável com um ou
com três.

`EstadoDeJogador` guarda Vida, Guarda, pontos de Ação, Reserva, o marcador de
Impulso Inicial, as Ações já realizadas no turno, a mão, as três zonas de
cooldown, as quatro Passivas, as duas Cartas de Classe, a Ultimate, os três
espaços de Ação com as suas Respostas, as quatro Condições, o componente da
classe e as cartas removidas.

Não há baralho, monte de compra, embaralhamento nem descarte: a build inteira
começa na mão e o que sai dela vai para uma zona de cooldown.

### Ação e Resposta

Cada `SlotDeAcao` carrega um `SlotDeResposta`, e esse espaço tem **um único
campo** `voluntaria`. Duas Respostas voluntárias contra a mesma Ação não são
representáveis — a regra de §8 vira impossibilidade estrutural, não
verificação. A Resposta distingue a Defesa Inata da classe de uma carta de
Reação, e a variante de Defesa Inata nem sequer tem campo de carta.

### Componentes de classe

`RecursoDeClasse` é uma união discriminada por `classe`, com uma variante por
classe. O compilador recusa Momentum em um Mago ou Mana em um Guerreiro, e
`EstadoDeJogador<'mago'>` aceita apenas o recurso do Mago. Na forma genérica,
a coerência é verificada em tempo de execução por `validarEstadoDeJogador`.
Nada de `any`, nada de saco de propriedades opcionais.

### Visões

O cliente nunca recebe o estado canônico; ele recebe uma projeção.
`projetarParaJogador` devolve o próprio estado por inteiro e o do adversário
filtrado; `projetarParaEspectador` filtra os dois lados.

O que fica escondido não é marcado como escondido: ele não é copiado para
dentro da visão. `CartaProjetada` é uma união em que a variante invisível não
possui o campo `carta`, então não existe campo de onde vazar.

| Informação                   | Visão      | Por quê                                                           |
| ---------------------------- | ---------- | ----------------------------------------------------------------- |
| Identidade das cartas na mão | privada    | a IA não pode conhecer habilidades escondidas do adversário (§18) |
| Passiva ainda face-down      | privada    | Passivas só se revelam quando a condição acontece (§12)           |
| Semente do replay            | de ninguém | não pertence a jogador nenhum                                     |
| Quantidade de cartas na mão  | pública    | contar cartas na mesa é possível                                  |
| Cooldown                     | pública    | a carta foi jogada publicamente e a zona é física (§11)           |
| Cartas de Classe             | pública    | começam face-up no campo (§13)                                    |
| Ultimate                     | pública    | o adversário sabe qual foi escolhida (§14)                        |
| Condições                    | pública    | ficam na área de Condições (§15)                                  |
| Componente de classe         | pública    | são fichas, trilhas e marcadores físicos (§16)                    |
| Vida, Guarda, AP, Reserva    | pública    | valores visíveis na mesa                                          |

Um identificador que não pertence à partida recebe visão de espectador, e não
visão privilegiada por engano.

### O que a Etapa 1 deliberadamente não decide

Quem começa, critério de desempate, morte simultânea e prioridade entre
gatilhos simultâneos continuam sem regra no documento. A estrutura representa
as situações — a ordem da tupla, `vencedor: null`, motivo `indefinido` — sem
escolher por elas. Está registrado em [`AMBIGUIDADES.md`](AMBIGUIDADES.md).

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
