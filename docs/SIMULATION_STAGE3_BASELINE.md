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

Versões usadas: `rulesVersion 0.2.0`, `cardDataVersion 0.2.0-alpha`.
Builds: as Receitas 1 oficiais de `PRESET_BUILDS.md` — **Quebra-Muralhas**
(Guerreiro) e **Piromante** (Mago). Teto técnico de 60 turnos.

O lote é dividido pela metade entre "Guerreiro começa" e "Mago começa", porque
começar é uma vantagem estrutural conhecida: o segundo jogador recebe duas
Reservas e o Impulso Inicial como compensação (§7). Misturar os dois lados
esconderia exatamente o que o lote existe para medir.

## O primeiro resultado é sobre o simulador, não sobre o jogo

Com a política de base pura — PRNG usado **apenas** para desempatar opções de
mesma pontuação —, 10 000 partidas produziram **duas** linhas de jogo
distintas: uma com o Guerreiro começando e outra com o Mago começando. Isso não
é um defeito do motor: a política é determinística, o combate não tem
aleatoriedade nenhuma, as duas builds são fixas e nunca há empate de pontuação
a desempatar. Dez mil partidas idênticas são dez mil cópias de duas partidas.

O simulador relata isso na linha `linhas de jogo distintas` em vez de escondê-lo
atrás de médias. Qualquer porcentagem do lote estrito abaixo é a mesma partida
repetida, e deve ser lida assim.

Para obter distribuição de verdade existe `--exploracao`, que faz a política
escolher ao acaso uma fração das decisões, entre as opções legais. **Ela não faz
parte da linha de base** e precisa ser pedida explicitamente. Os dois lotes
estão abaixo lado a lado.

## Lote A — linha de base estrita (`--exploracao 0`)

|                         | Guerreiro começa |   Mago começa |
| ----------------------- | ---------------: | ------------: |
| partidas                |             5000 |          5000 |
| venceu quem começou     |         0 (0,0%) |      0 (0,0%) |
| venceu quem respondeu   |    5000 (100,0%) | 5000 (100,0%) |
| desfecho indefinido     |                0 |             0 |
| parou no limite técnico |                0 |             0 |
| bloqueio de regra       |                0 |             0 |

| Métrica                           | Valor |
| --------------------------------- | ----: |
| linhas de jogo distintas          |     2 |
| turnos por partida                |  8,00 |
| Ações por partida                 | 20,00 |
| Rupturas por partida              |  3,50 |
| Reações por partida               |  3,00 |
| Defesas Inatas por partida        |  6,50 |
| Ultimates por partida             |  2,00 |
| bloqueios Lento + Impulso Inicial |     0 |

## Lote B — com exploração pedida (`--exploracao 0.25`)

|                         | Guerreiro começa |  Mago começa |
| ----------------------- | ---------------: | -----------: |
| partidas                |             5000 |         5000 |
| venceu quem começou     |      896 (17,9%) | 2148 (43,0%) |
| venceu quem respondeu   |     4104 (82,1%) | 2852 (57,0%) |
| desfecho indefinido     |                0 |            0 |
| parou no limite técnico |                0 |            0 |
| bloqueio de regra       |                0 |            0 |

| Métrica                           | Valor |
| --------------------------------- | ----: |
| linhas de jogo distintas          |  1093 |
| turnos por partida                |  8,17 |
| Ações por partida                 | 20,91 |
| Rupturas por partida              |  3,22 |
| Reações por partida               |  3,09 |
| Defesas Inatas por partida        |  5,90 |
| Ultimates por partida             |  2,00 |
| vitórias do Guerreiro             |  3748 |
| vitórias do Mago                  |  6252 |
| bloqueios Lento + Impulso Inicial |     0 |

## O que os números dizem

1. **Quem responde leva vantagem nas duas medições.** No lote estrito o
   responder venceu sempre; no lote com exploração ele venceu 82,1% quando o
   Guerreiro começou e 57,0% quando o Mago começou. As duas Reservas e o
   Impulso Inicial do segundo jogador compram a última palavra: ele responde ao
   turno inicial e ainda devolve o golpe.
2. **A assimetria depende da classe, não só da posição.** Quando o Mago começa,
   a vantagem do responder cai de 82,1% para 57,0%. Ou seja: parte do que
   parecia vantagem de posição é, na verdade, vantagem do Mago.
3. **O Mago vence mais no agregado do lote B** (6252 contra 3748). Com as
   Receitas 1 de cada classe e esta política, o Piromante leva a melhor sobre o
   Quebra-Muralhas.
4. **A partida é curta**: cerca de 8 turnos e 21 Ações. As três Ações por turno
   são usadas quase sempre.
5. **A Ultimate sai nas duas partidas de cada duelo**, sempre — as duas Receitas
   chegam ao custo da Ultimate delas antes do fim.
6. **Nenhum bloqueio de Lento + Impulso Inicial apareceu** em 20 000 partidas.
   A interação não resolvida (item 22 de `AMBIGUIDADES.md`) simplesmente não
   acontece com estas duas Receitas, porque nenhuma carta do Guerreiro aplica
   Lento e o Mago só recebe Impulso quando é o segundo jogador. Ela continua
   contada à parte e **nunca** é convertida em vitória, derrota ou empate.
7. **Nenhuma partida parou no teto de 60 turnos** e **nenhum desfecho ficou
   indefinido**: morte simultânea não ocorreu nestes lotes.

## O que estes números não são

- **Não são um diagnóstico de balanceamento.** A política de base é fraca de
  propósito: ela pontua Dano e Impacto e pouco mais. Ela não segura Reação para
  a Ação certa, não administra Momentum nem Mana ao longo do turno e não planeja
  sequência. Um jogador humano joga melhor que ela, e um agente melhor mudaria
  as porcentagens.
- **Não cobrem o catálogo inteiro.** Só as Receitas 1 entram aqui, então
  32 das 78 cartas das duas classes aparecem em jogo. As outras têm testes
  unitários de comportamento, não medição de lote.
- **Não autorizam mexer em carta.** Ajustar número é decisão humana depois de
  playtest (§44). Nada neste documento foi usado para alterar o catálogo.

## Próximo passo sugerido

O gargalo de medição hoje é a política, não o motor. Uma política melhor — ou um
conjunto de políticas com estilos diferentes — daria um lote informativo sem
precisar de exploração aleatória. Isso é decisão do dono do projeto: a Etapa 3
não pede agente forte, e inventar um mudaria o que os números significam sem
aviso.
