# Simulação — linha de base da Etapa 3

Este documento registra o que o simulador headless mediu com o Guerreiro e o
Mago completos. Ele **mede**; ele não recomenda mudança de carta. O
`FULL_GAME_SPEC.md` §44 é explícito: o catálogo é Alpha e só deve ser ajustado
depois de playtest humano. Nenhum número de carta foi alterado por causa destes
resultados.

## Como reproduzir

```
npm run simulate -- --games 10000 --seed etapa3-baseline
npm run simulate -- --games 10000 --seed etapa3-baseline --exploracao 0.25
```

Versões: `rulesVersion 0.2.0`, `cardDataVersion 0.2.0-alpha`.
Builds: as Receitas 1 oficiais de `PRESET_BUILDS.md` — **Quebra-Muralhas**
(Guerreiro) e **Piromante** (Mago). Teto técnico de 60 turnos.

O lote é dividido pela metade entre "Guerreiro começa" e "Mago começa", porque
começar é uma vantagem estrutural conhecida: o segundo jogador recebe duas
Reservas e o Impulso Inicial como compensação (§7).

## Comando ilegal é bug, não resultado

Uma política de simulação só pode produzir comandos **legais**. Se o motor
recusar um comando dela, isso é defeito do simulador — nunca comportamento
normal de partida. O motor registra a ocorrência, encerra aquela partida como
`comando-ilegal` e a conta à parte: ela **não** vira vitória, derrota, empate,
turno encerrado nem limite técnico. O processo do simulador termina com código
de erro quando o contador é maior que zero, para que nenhum número deste
arquivo saia de um lote inválido.

**Nos dois lotes abaixo, comandos ilegais = 0.**

A conferência encontrou um defeito real e antes invisível: a política oferecia a
Defesa Inata uma segunda vez no mesmo turno inimigo. O código antigo ignorava a
recusa em silêncio e seguia a partida. Agora a recusa é acusada, e a política
passou a conferir o limite na própria projeção antes de oferecer.

Duas exceções continuam sendo exceções, contadas separadamente:

- **`interacao-nao-definida`** — a lacuna de Lento + Impulso Inicial (item 22 de
  `AMBIGUIDADES.md`). É lacuna do documento, não bug.
- **limite técnico de turnos** — trava do simulador, não regra de jogo.

## Como a frequência por carta é contada

Cada utilização real de uma carta incrementa a frequência dela **exatamente uma
vez**. Os eventos que contam são os seis que representam uma carta entrando em
uso:

| Evento                     | Vale |
| -------------------------- | ---: |
| `acao-declarada`           |    1 |
| `resposta-registrada`      |    1 |
| `carta-de-classe-ativada`  |    1 |
| `carta-de-classe-exaurida` |    1 |
| `passiva-revelada`         |    1 |
| `passiva-ativada`          |    1 |
| `ultimate-consumida`       |    0 |

`ultimate-consumida` vale zero **de propósito**: a Ultimate já foi contada
quando ocupou o espaço de Ação ou de Resposta. Somá-la de novo dobrava a
frequência dela — era o que fazia MU01 aparecer 20 000 vezes em um lote com
2,00 Ultimates por partida. Ela continua alimentando o contador próprio
`ultimatesUsadas`, que mede outra coisa.

Os contadores específicos — Ultimates, Passivas reveladas, Passivas Ativadas,
Cartas de Classe por Ativar e por Exaurir — seguem separados, e nenhum deles
duplica a frequência geral.

## O primeiro resultado é sobre o simulador, não sobre o jogo

Com a política de base pura — PRNG usado **apenas** para desempatar opções de
mesma pontuação —, 10 000 partidas produziram **duas** linhas de jogo distintas:
uma com o Guerreiro começando e outra com o Mago começando. Não é defeito do
motor: a política é determinística, o combate não tem aleatoriedade, as duas
builds são fixas e nunca há empate de pontuação a desempatar. Dez mil partidas
idênticas são dez mil cópias de duas partidas.

O simulador relata isso na linha `linhas de jogo distintas` em vez de esconder
atrás de médias. Qualquer porcentagem do lote estrito abaixo é a mesma partida
repetida, e deve ser lida assim.

`--exploracao` faz a política escolher ao acaso uma fração das decisões, entre
as opções legais. **Não faz parte da linha de base** e precisa ser pedida
explicitamente.

## Lote A — linha de base estrita (`--exploracao 0`)

|                         | Guerreiro começa |   Mago começa |
| ----------------------- | ---------------: | ------------: |
| partidas                |             5000 |          5000 |
| venceu quem começou     |         0 (0,0%) |      0 (0,0%) |
| venceu quem respondeu   |    5000 (100,0%) | 5000 (100,0%) |
| desfecho indefinido     |                0 |             0 |
| parou no limite técnico |                0 |             0 |
| bloqueio de regra       |                0 |             0 |
| comando ilegal          |                0 |             0 |

| Métrica                             | Valor |
| ----------------------------------- | ----: |
| linhas de jogo distintas            |     2 |
| turnos por partida                  |  8,00 |
| Ações por partida                   | 20,00 |
| Rupturas por partida                |  3,50 |
| Reações por partida                 |  3,00 |
| Defesas Inatas por partida          |  6,50 |
| Ultimates por partida               |  2,00 |
| Passivas reveladas por partida      |  7,00 |
| Passivas Ativadas por partida       |  0,00 |
| Cartas de Classe Ativadas / partida |  0,00 |
| Cartas de Classe Exauridas /partida |  0,00 |
| Vida média do vencedor              |  1,50 |
| bloqueios Lento + Impulso Inicial   |     0 |
| **comandos ilegais**                | **0** |

Cartas distintas jogadas: 24. Cada Ultimate aparece 10 000 vezes — uma por
partida —, o que fecha com as 2,00 Ultimates por partida do lote.

| Carta | Vezes | Carta | Vezes | Carta | Vezes |
| ----- | ----: | ----- | ----: | ----- | ----: |
| W02   | 40000 | M03   | 15000 | W10   | 10000 |
| M01   | 30000 | M15   | 15000 | WP01  | 10000 |
| M02   | 20000 | MP01  | 10000 | WP04  | 10000 |
| M04   | 20000 | MP06  | 10000 | WP07  | 10000 |
| W08   | 20000 | MP10  | 10000 | WP08  | 10000 |
| MU01  | 10000 | WU01  | 10000 | W03   | 10000 |
| M12   |  5007 | M17   |  5000 | W11   |  5000 |
| W15   |  5000 | W19   |  5000 | M11   |  4993 |

## Lote B — com exploração pedida (`--exploracao 0.25`)

|                         | Guerreiro começa |  Mago começa |
| ----------------------- | ---------------: | -----------: |
| partidas                |             5000 |         5000 |
| venceu quem começou     |      878 (17,6%) | 2400 (48,0%) |
| venceu quem respondeu   |     4122 (82,4%) | 2600 (52,0%) |
| desfecho indefinido     |                0 |            0 |
| parou no limite técnico |                0 |            0 |
| bloqueio de regra       |                0 |            0 |
| comando ilegal          |                0 |            0 |

| Métrica                             | Valor |
| ----------------------------------- | ----: |
| linhas de jogo distintas            |  1213 |
| turnos por partida                  |  8,13 |
| Ações por partida                   | 20,82 |
| Rupturas por partida                |  3,27 |
| Reações por partida                 |  3,09 |
| Defesas Inatas por partida          |  5,86 |
| Ultimates por partida               |  2,00 |
| Passivas reveladas por partida      |  6,81 |
| Passivas Ativadas por partida       |  0,00 |
| Cartas de Classe Ativadas / partida |  0,00 |
| Cartas de Classe Exauridas /partida |  0,00 |
| Vida média do vencedor              |  3,84 |
| vitórias do Guerreiro               |  3478 |
| vitórias do Mago                    |  6522 |
| bloqueios Lento + Impulso Inicial   |     0 |
| **comandos ilegais**                | **0** |

### Frequência por carta (lote B)

A frequência é um mapa por identificador e aceita qualquer build legal das duas
classes — ela não está presa às Receitas atuais. Neste lote entraram 25 cartas
distintas, que são as das duas Receitas 1 mais as Passivas reveladas.

| Carta | Vezes | Carta | Vezes | Carta | Vezes |
| ----- | ----: | ----- | ----: | ----- | ----: |
| W02   | 35072 | M03   | 15103 | WP08  | 10000 |
| M01   | 28662 | W03   | 12754 | WP04  |  9998 |
| M02   | 21069 | M11   | 10403 | WU01  |  9960 |
| M04   | 19499 | W11   | 10265 | MP01  |  9772 |
| W08   | 18476 | MP06  | 10000 | W10   |  8688 |
| M15   | 15869 | MP10  | 10000 | WP01  |  8371 |
| MU01  | 10000 | WP07  | 10000 | M12   |  8295 |
| W15   |  6256 | M17   |  4604 | W19   |  4083 |
| W16   |    60 |       |       |       |       |

## O que os números dizem

1. **Quem responde leva vantagem nas duas medições.** No lote estrito o
   responder venceu sempre; no lote com exploração venceu 82,4% quando o
   Guerreiro começou e 52,0% quando o Mago começou. As duas Reservas e o Impulso
   Inicial do segundo jogador compram a última palavra.
2. **A assimetria depende da classe, não só da posição.** Quando o Mago começa,
   a vantagem do responder cai de 82,4% para 52,0%: parte do que parecia
   vantagem de posição é vantagem do Mago.
3. **O Mago vence mais no agregado do lote B** (6522 contra 3478).
4. **A partida é curta e apertada**: cerca de 8 turnos, 21 Ações, e o vencedor
   termina com 3,84 de Vida em média no lote B — 1,50 no lote estrito.
5. **As Ultimates saem nas duas partidas de cada duelo**, sempre.
6. **Nenhum bloqueio de Lento + Impulso Inicial** em 20 000 partidas: nenhuma
   carta do Guerreiro aplica Lento, e o Mago só recebe Impulso como segundo
   jogador.
7. **Nenhuma partida parou no teto de 60 turnos** e **nenhum desfecho ficou
   indefinido**.

## Duas métricas em zero, e por quê

**Passivas Ativadas = 0,00** e **Cartas de Classe Ativadas/Exauridas = 0,00**
não são erro de contagem: são consequência direta da correção das escolhas.

Antes, o motor Ativava Instinto de Ferro e Véu Prismático sozinho, e escolhia
sozinho alvos de Runa. Isso foi removido — Ativar é decisão do jogador, e o
motor não decide por ele. A política de base ainda **não pede** Ativação de
Passiva nem usa Carta de Classe: ela joga Ações e Respostas, e mais nada.

Ou seja: dois dos quatro tipos de carta da build não entram em jogo nesta linha
de base. Isso limita o que os números acima significam, e está declarado aqui em
vez de escondido. Ensinar a política a usar Ativar e Exaurir é uma decisão de
projeto que muda o balanceamento medido — não é correção de bug, e por isso não
foi tomada por conta própria.

## O que estes números não são

- **Não são diagnóstico de balanceamento.** A política de base é fraca de
  propósito: pontua Dano e Impacto e pouco mais, não segura Reação para a Ação
  certa, não administra Momentum nem Mana e não usa Carta de Classe.
- **Não cobrem o catálogo inteiro.** Só as Receitas 1 entram, então 25 das 78
  cartas aparecem em jogo. As outras têm teste unitário de comportamento, não
  medição de lote.
- **Não autorizam mexer em carta.** Ajustar número é decisão humana depois de
  playtest (§44).

## Próximos passos sugeridos

1. Ensinar a política a Ativar Passivas e a usar Cartas de Classe, para que as
   duas métricas em zero passem a medir alguma coisa.
2. Uma política mais forte — ou um conjunto de políticas com estilos diferentes
   — daria um lote informativo sem precisar de exploração aleatória.

As duas são decisões do dono do projeto: a Etapa 3 não pede agente forte, e
inventar um mudaria o que os números significam sem aviso.
