# Arquitetura

## Princípio

Regra e apresentação são camadas separadas. O motor de regras precisa ser
determinístico, testável sem abrir o jogo e reproduzível a partir de eventos.
Nenhuma regra mora dentro de componente visual, e nenhum texto ou número de
jogo mora dentro de um PNG.

## Camadas e dependências

```text
apps/web ──────────┐
                   ├── packages/ui ──────────┐
apps/game-server ──┤                         │
                   ├── packages/gameplay ────┤
apps/simulator ────┤        │                ├── packages/shared-types
                   │        ├── card-data ───┤
                   │        └── rules-engine ┤
                   ├── packages/ai ──────────┘
                   ├── packages/audio
                   └── packages/vfx
```

A seta aponta para o que o pacote pode importar. As setas nunca voltam:

- `shared-types` não importa ninguém;
- `rules-engine`, `card-data` e `ai` importam apenas `shared-types`;
- `card-data` e `rules-engine` **não se conhecem**: o motor recebe o perfil
  impresso de uma carta, e quem vai buscá-lo no catálogo é a camada de cima;
- `gameplay` é essa camada de cima — ela é a única que importa os dois, e é
  onde o texto das cartas vira comportamento;
- `ui` conhece React e o DOM, mas nenhuma regra de combate;
- `apps/web` compõe tudo;
- `apps/game-server` e `apps/simulator` usam regras e dados, nunca `ui`, `vfx`
  ou `audio`.

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

## Regras universais do combate

O motor executa o ciclo de uma partida sem conhecer carta, classe ou
interface. Quem declara uma Ação informa o **perfil impresso** da habilidade
(`PerfilDeHabilidade`): custo, cooldown, Dano e Impacto. Assim as regras
universais são testáveis antes de existir uma única carta real, e o catálogo
entra depois sem tocar no motor.

### Forma dos comandos

Todo comando tem a mesma assinatura conceitual:

```text
(estado, argumentos) -> Resultado<{ partida, eventos }, ErroDeDominio>
```

Puro, sem mutação, com erro tipado. Não há command bus, fila nem despachante:
a função é o comando.

| Comando                                       | O que faz                                                      |
| --------------------------------------------- | -------------------------------------------------------------- |
| `iniciarPartida`                              | recebe quem começa, dá 2 de Reserva ao segundo, abre o turno 1 |
| `iniciarTurno`                                | a rotina de início, uma vez por turno                          |
| `declararAcao`                                | paga custos, tira da mão, ocupa o próximo espaço de Ação       |
| `registrarResposta`                           | uma Resposta voluntária por Ação inimiga                       |
| `registrarModificador`                        | acumula Dano e Impacto sobre a Ação antes de resolver          |
| `resolverAcao`                                | a ordem canônica de resolução                                  |
| `encerrarTurno`                               | a rotina de fim e a troca de jogador                           |
| `revelarPassiva`, `ativarPassiva`             | Passiva oculta → pronta → ativada                              |
| `ativarCartaDeClasse`, `exaurirCartaDeClasse` | efeito renovável e efeito extremo                              |
| `consumirUltimate`                            | uma vez por partida                                            |

`iniciarTurno` e `encerrarTurno` são separados de propósito: encerrar prepara a
troca, não executa o início seguinte. O campo `turno.iniciado` é a trava que
impede rodar a rotina duas vezes — o que duplicaria pontos de Ação e faria o
cooldown pular um estágio.

### Início de turno

1. a Reserva que sobrou desaparece;
2. os cinco pontos de Ação chegam;
3. o segundo jogador recebe o Impulso Inicial, no primeiro turno dele;
4. a Guarda volta para seis;
5. Murchar é aplicado **depois** da recuperação e é removido por inteiro;
6. o cooldown avança: CD1 para a mão, CD2 para CD1, CD3 para CD2;
7. Passivas e Cartas de Classe Ativadas voltam a ficar Prontas;
8. o contador de Ações do turno zera e os espaços de Ação são limpos.

### Fim de turno

1. a Queimadura tica: um de Vida a menos, um acúmulo a menos;
2. até dois pontos de Ação não usados viram Reserva;
3. o Impulso Inicial não usado desaparece — ele nunca vira Reserva;
4. o turno passa para o adversário, ainda não iniciado.

### Ação e Resposta

O atacante declara, paga e ocupa um dos três espaços. A carta fica no espaço
até a resolução, para o defensor poder responder. O espaço de Resposta tem um
único campo, então duas Respostas voluntárias contra a mesma Ação não são
representáveis: a Defesa Inata **ou** uma carta de Reação.

Na resolução, a carta usada e a carta de Reação vão **cada uma para o cooldown
impresso nela** — a Reação não herda o cooldown da Ação a que respondeu. A Ação
conta para o limite de três do turno e o Sangramento tica se aquela foi a
segunda Ação.

A Resposta por carta carrega o `PerfilDeHabilidade` da própria Reação, e não só
o identificador. É daí que saem o custo em Reserva e a zona de cooldown, de
modo que não existe como o chamador informar um número que contradiga a carta.
O motor exige que o tipo seja `reacao` e que a moeda seja Reserva.

O efeito numérico de uma Resposta é texto de carta, e entra pelos
modificadores. O motor universal só registra e cobra a Resposta.

### Ruptura

```text
impacto final = impresso + modificadores
guarda        = max(0, guarda - impacto)
ruptura       = guarda antes > 0 e guarda depois == 0
dano final    = impresso + modificadores + (ruptura ? 2 : 0)
vida          = vida - dano
```

Impacto reduz só Guarda. Dano reduz só Vida. A Guarda nunca absorve Dano. Se a
Guarda já estava em zero, não há Ruptura nova — não há de onde romper.

Reduzir a própria Guarda como custo não é ação inimiga e não passa por essa
resolução, então não provoca Ruptura. Mas a Guarda que sobrou continua
rompível: um Ataque inimigo posterior que a leve a zero provoca Ruptura
normalmente.

### As quatro Condições

| Condição    | Máximo | Quando                                    | O que faz                                             |
| ----------- | ------ | ----------------------------------------- | ----------------------------------------------------- |
| Queimadura  | 3      | fim do turno do afetado                   | perde 1 de Vida, diminui 1                            |
| Lento       | 2      | ao pagar uma Ação                         | custa +1 AP; o acúmulo só cai quando o aumento é pago |
| Murchar     | 2      | início do turno, após a Guarda voltar a 6 | reduz a Guarda pelo valor e é limpo por inteiro       |
| Sangramento | 3      | ao concluir a **segunda** Ação do turno   | perde 1 de Vida, diminui 1                            |

Dano de Condição não é Ataque: não passa pela resolução de Ação e não abre
espaço de Resposta. O gatilho do Sangramento é concluir a segunda Ação, o que
acontece uma vez por turno — a terceira Ação não repete, e o turno seguinte
recomeça a contagem.

### Erros de domínio

`ErroDeDominio` é uma união discriminada por `tipo`, com o dado relevante
junto: quanto faltou de AP, qual carta, qual espaço de Ação. Nenhum erro é
distinguido por texto solto. O caso mais incomum é
`interacao-nao-definida`, que existe para o motor **recusar** uma jogada cuja
regra o documento não define, em vez de escolher uma interpretação — hoje só
Lento com Impulso Inicial.

### O que ainda não existe

Nenhuma lógica específica de classe. Momentum, Mana, Devoção, Almas,
Juramento, Brechas, Notas, Chi, Marca, Fúria, Forma e Preço Proibido têm
estado desde a Etapa 1, mas nenhum deles é lido ou alterado pelo motor. As
Defesas Inatas são registráveis como Resposta, sem efeito próprio. Nenhuma
carta do catálogo foi implementada.

## Servidor

`apps/game-server` é um esqueleto: ele responde diagnóstico e declara
explicitamente o que ainda não faz. O servidor final é autoritativo — o cliente
envia intenção de ação e o servidor valida custo, alvo, estado, informação
escondida e sequência. O cliente nunca é fonte de verdade de uma partida
online.

## Composição: como o texto de uma carta vira comportamento

O `card-data` diz **o que está impresso**. O `rules-engine` diz **como o
tabuleiro funciona**. Nenhum dos dois conhece o outro, e é de propósito: o motor
foi testável antes de existir uma carta, e o catálogo continua sendo dado puro.

`packages/gameplay` é a costura entre os dois, e é a fronteira autoritativa da
partida.

### O catálogo é autoritativo

O cliente informa **identidade de carta e escolhas legais**. Custo, tipo, Dano,
Impacto e zona de cooldown não viajam na jogada: eles são buscados no catálogo
pelo identificador. Um cliente não tem por onde afirmar que "W03 custa 0 e causa
99" — o tipo `PedidoDeAcao` não tem campo nenhum para isso, e
`packages/gameplay/src/autoridade.test.ts` prende essa garantia com
`@ts-expect-error`, que quebra a verificação de tipos se o campo voltar a
existir.

### Custo atômico e multi-recurso

Uma carta pode custar pontos de Ação **e** recurso de classe — "2 AP + 1 Mana",
"3 AP e 3 Momentum" — e a parcela variável ("1 a 3 Mana", "gaste até 2
Momentum") é uma escolha impressa, validada contra o intervalo da carta.

O pagamento é atômico: as parcelas são conferidas todas antes de qualquer uma
ser debitada. Um Ataque de "3 AP + 2 Mana" declarado com 5 AP e 1 Mana não gasta
nada — não existe estado intermediário em que os pontos de Ação já saíram e a
Mana faltou.

### Janelas de efeito

Cada carta declara só as janelas que usa, e o despachante percorre todas as
fontes de uma Ação em ordem fixa — a ordem é o que torna o replay reproduzível:

1. `legalidade` — a carta pode ser declarada agora?
2. `descontos` — o custo impresso é alterado antes de ser pago;
3. `ao-declarar` — custo pago, Ação ocupando o espaço;
4. `ao-responder` — o defensor colocou a Resposta dele;
5. `antes-de-resolver` — última chance de somar Dano, Impacto ou trava;
6. resolução universal do motor;
7. `apos-resolver` — Ruptura, Dano e cooldown já são fatos consumados.

As fontes, em ordem: a carta declarada, as Cartas de Classe usadas naquela Ação,
a carta de Reação, as Passivas reveladas do atacante e depois as do defensor.

### Coisas que o texto pede e não são modificador numérico

- **"O Dano final se torna 0"** é um valor fixado (`danoFinalDefinido`), não um
  modificador de menos novecentos e noventa e nove. Ele é a última palavra da
  conta, e é por isso que "se o Dano final for 0" consegue perguntar por ele.
- **"Quando um Ataque causaria Ruptura"** é respondido por **previsão**
  (`preverRuptura`), não aplicando a Ação para desfazer depois. Desfazer
  deixaria rastro em log, em contadores e em qualquer gatilho intermediário.
- **"Impeça a Ruptura"** e **"o bônus de Ruptura é +3 em vez de +2"** são campos
  próprios do espaço de Ação, porque mexem no evento e não no número.
- **"Cancele o texto dela"** desliga os ganchos da carta declarada, e só dela.

### O motor não escolhe pelo jogador

Onde o texto impresso diz "escolha", "você pode", "Ative" ou "gaste até", a
decisão chega no comando. Faltando, a jogada é recusada com erro tipado —
`escolha-obrigatoria` ou `escolha-invalida` — em vez de o motor completar a
frase com a primeira opção que encontrar.

A conferência roda **antes** de qualquer custo ser pago, sobre a carta
declarada, as Cartas de Classe pedidas e as Passivas reveladas. Depois de pagar
já seria tarde: o comando teria alterado o estado para então descobrir que falta
uma decisão.

Três casos têm forma própria:

- **Ativar Passiva** é um comando (`ativarPassivaNaAcao`), porque "Ative e
  gaste 1 Momentum" é escolha, e ela acontece durante a Ação do adversário. A
  Ativação é a transição normal: Pronta vira Ativada, com o evento
  `passiva-ativada`, e ela só volta a Pronta no início do turno do dono. Esse
  ciclo **é** o "uma vez por turno inimigo" — não existe contador paralelo, e
  Passiva nunca tem estado Exaurida.
- **Escolhas do defensor** viajam no comando de Resposta e ficam no espaço de
  Resposta, separadas das escolhas de quem atacou.
- **Escolhas que disparam fora da janela de quem escolhe** viram uma escolha
  **pendente** no estado. Concentração sob Pressão manda o defensor escolher uma
  carta de cooldown no meio da Ação do adversário, quando ele não tem comando
  nenhum para dar. O efeito não escolhe: ele registra a pendência, que trava o
  dono de declarar e de responder até ele resolvê-la com `resolverEscolhaPendente`.

### O fim da partida é decidido depois dos efeitos posteriores

Ripostar e Última Palavra tiram Vida "depois da resolução". Por isso
`resolverAcao` aceita adiar o desfecho, e a camada de composição chama
`encerrarSeVidaZerou` **uma vez**, no fim de tudo que pertence àquela Ação. A
regra de vitória continua sendo uma só, a do motor; o que a composição escolhe é
o momento de aplicá-la.

### Estado temporário: anotações

Muita carta cria estado que não cabe em campo fixo: "seu próximo Ataque neste
turno recebe +2 I", "uma vez por turno inimigo", "na primeira vez que isso
ocorrer". Em vez de um campo por carta, o estado do jogador carrega anotações
com escopo `acao`, `turno` ou `partida`. A **forma** da anotação está em
`shared-types`; o **vocabulário** de chaves está em
`packages/gameplay/src/chaves.ts`, onde cada chave é declarada e documentada.

Anotações de escopo `turno` expiram no início de **qualquer** turno, dos dois
jogadores. É essa regra única que sustenta tanto "uma vez por turno" quanto "uma
vez por turno inimigo".

## Simulador headless

`apps/simulator` roda milhares de partidas sem interface:

```
npm run simulate -- --games 10000 --seed etapa3-baseline
```

A política de base decide olhando **apenas** a projeção do próprio jogador — a
mesma visão que um cliente receberia, sem a mão do adversário. Ela não tem
acesso ao estado canônico, então não tem como trapacear.

O PRNG semeado serve só para desempatar opções de mesma pontuação; o combate não
tem aleatoriedade nenhuma. Como consequência, um lote com a política de base
pura repete poucas linhas de jogo — o simulador relata isso na métrica `linhas
de jogo distintas` em vez de escondê-lo atrás de médias. O parâmetro
`--exploracao` existe para medir distribuição e **não** faz parte da linha de
base.

O teto de turnos é uma trava técnica do simulador, não regra de jogo: uma
partida interrompida por ele é contada como interrompida, nunca como vitória,
derrota ou empate. O mesmo vale para uma recusa de `interacao-nao-definida`, que
é contada à parte como bloqueio de regra.

**Comando ilegal é bug do simulador.** Uma política só pode produzir comandos
legais. Qualquer outra recusa do motor é registrada em `comandosIlegais`,
encerra a partida como inválida e faz o processo terminar com código de erro —
um lote com comando ilegal não vale como medição, e nenhum número dele deve ser
publicado. O relatório traz, por partida e por lote: Ações, Rupturas, Reações,
Defesas Inatas, Ultimates, Passivas reveladas, Passivas Ativadas, Cartas de
Classe por Ativar e por Exaurir, Vida média do vencedor, frequência por carta
(mapa por identificador, aceitando qualquer build legal), bloqueios por regra
indefinida, limite técnico e comandos ilegais.

O relatório da linha de base está em `SIMULATION_STAGE3_BASELINE.md`.

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
