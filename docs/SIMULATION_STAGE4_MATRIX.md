# Simulação da Etapa 4 — a matriz de doze por doze

Este documento é **descritivo**. Ele registra o que o catálogo atual produziu
sob a política de base do simulador headless, e não recomenda mudança de carta
nenhuma: ajustar número é decisão humana depois de playtest
(`FULL_GAME_SPEC.md` §44). Nenhum valor do `CARD_CATALOG.md` foi alterado por
causa destes resultados.

## Como reproduzir

```bash
npm run simulate:matrix -- --seed etapa4-matrix
```

A versão de fumaça, que roda uma partida por configuração e serve de guarda em
CI, está em `npm run simulate:matrix:smoke` e também como teste
(`packages/gameplay/src/simulador/matriz.test.ts`).

## O que foi medido

|                           |                                                    |
| ------------------------- | -------------------------------------------------- |
| Classes                   | 12, cada uma com a Receita 1 de `PRESET_BUILDS.md` |
| Pares não ordenados       | 78, incluindo os 12 espelhos                       |
| Posições iniciais por par | 2 — quem começa e quem responde                    |
| Configurações             | **156**                                            |
| Partidas por configuração | 20                                                 |
| Partidas                  | **3120**                                           |
| Semente                   | `etapa4-matrix`                                    |
| `RULES_VERSION`           | 0.3.0                                              |
| `CARD_DATA_VERSION`       | 0.3.0-alpha                                        |

As duas posições iniciais são rodadas separadamente porque começar é vantagem
estrutural conhecida (§7: quem responde recebe 2 de Reserva e o Impulso
Inicial como compensação). Somar as duas posições em um número só esconderia
exatamente o que a matriz existe para mostrar.

## Saúde da execução

| Indicador                                      | Resultado |
| ---------------------------------------------- | --------- |
| Comandos ilegais                               | **0**     |
| Invariantes quebradas                          | **0**     |
| Bloqueios de regra                             | 0         |
| Partidas indefinidas                           | 0         |
| Interrompidas pelo limite técnico de 60 turnos | 0         |
| Turno médio                                    | 8,97      |

As invariantes são conferidas em **todo** estado que o simulador produz, não só
no final: faixas de Vida, Guarda, pontos de Ação, Reserva, Ações por turno e
Condições; a conservação das quatro Almas do Necromante; as três pedras de Chi
do Monge; o domínio de Brechas, Momentum e Mana; "Passiva nunca Exaure"; e a
proibição de uma mesma carta estar em duas zonas ao mesmo tempo
(`packages/gameplay/src/simulador/invariantes.ts`).

## Vitórias por classe

Cada classe aparece em 24 partidas por adversário (12 adversários, contando o
espelho, nas duas posições iniciais), somando 480 partidas. No espelho as duas
vitórias são da mesma classe, então a coluna soma 40 por espelho.

| Classe      | Vitórias | Partidas |   % |
| ----------- | -------: | -------: | --: |
| Guerreiro   |      224 |      480 | 47% |
| Mago        |      369 |      480 | 77% |
| Clérigo     |      120 |      480 | 25% |
| Necromante  |      155 |      480 | 32% |
| Paladino    |       85 |      480 | 18% |
| Ladino      |      474 |      480 | 99% |
| Bardo       |       80 |      480 | 17% |
| Monge       |      355 |      480 | 74% |
| Patrulheiro |      263 |      480 | 55% |
| Bárbaro     |      378 |      480 | 79% |
| Druida      |      397 |      480 | 83% |
| Bruxo       |      220 |      480 | 46% |

## Pares

"Começou venceu" é a fração das partidas do par em que venceu quem abriu o
duelo, somando as duas posições iniciais.

| Par                       | Vitórias de A | Vitórias de B | Começou venceu | Turno médio |
| ------------------------- | ------------: | ------------: | -------------: | ----------: |
| Guerreiro × Guerreiro     |            20 |            20 |             0% |         8.0 |
| Guerreiro × Mago          |            20 |            20 |             0% |         8.0 |
| Guerreiro × Clérigo       |            40 |             0 |            50% |         6.5 |
| Guerreiro × Necromante    |            20 |            20 |           100% |         9.0 |
| Guerreiro × Paladino      |            20 |            20 |            30% |        11.3 |
| Guerreiro × Ladino        |             0 |            40 |            50% |         7.5 |
| Guerreiro × Bardo         |            40 |             0 |            50% |         9.5 |
| Guerreiro × Monge         |             0 |            40 |            50% |         6.6 |
| Guerreiro × Patrulheiro   |            24 |            16 |            10% |         7.9 |
| Guerreiro × Bárbaro       |             0 |            40 |            50% |         8.5 |
| Guerreiro × Druida        |             0 |            40 |            50% |        11.3 |
| Guerreiro × Bruxo         |            20 |            20 |             0% |         8.0 |
| Mago × Mago               |            20 |            20 |             0% |         8.0 |
| Mago × Clérigo            |            40 |             0 |            50% |         6.0 |
| Mago × Necromante         |            40 |             0 |            50% |         7.0 |
| Mago × Paladino           |            40 |             0 |            50% |         8.5 |
| Mago × Ladino             |             0 |            40 |            50% |         8.5 |
| Mago × Bardo              |            40 |             0 |            50% |         8.5 |
| Mago × Monge              |            19 |            21 |            28% |         7.4 |
| Mago × Patrulheiro        |            40 |             0 |            50% |         8.5 |
| Mago × Bárbaro            |            20 |            20 |             0% |         8.7 |
| Mago × Druida             |            30 |            10 |            70% |        11.3 |
| Mago × Bruxo              |            40 |             0 |            50% |         7.5 |
| Clérigo × Clérigo         |            20 |            20 |           100% |        11.0 |
| Clérigo × Necromante      |             0 |            40 |            50% |         7.5 |
| Clérigo × Paladino        |            40 |             0 |            50% |         9.5 |
| Clérigo × Ladino          |             0 |            40 |            50% |         5.5 |
| Clérigo × Bardo           |            40 |             0 |            50% |         9.5 |
| Clérigo × Monge           |             0 |            40 |            50% |         5.5 |
| Clérigo × Patrulheiro     |             0 |            40 |            50% |         7.5 |
| Clérigo × Bárbaro         |             0 |            40 |            50% |         7.5 |
| Clérigo × Druida          |             0 |            40 |            50% |        10.7 |
| Clérigo × Bruxo           |             0 |            40 |            50% |         7.5 |
| Necromante × Necromante   |            20 |            20 |             0% |        10.0 |
| Necromante × Paladino     |            35 |             5 |            38% |        11.0 |
| Necromante × Ladino       |             0 |            40 |            50% |         6.5 |
| Necromante × Bardo        |            20 |            20 |             0% |        10.0 |
| Necromante × Monge        |             0 |            40 |            50% |         6.8 |
| Necromante × Patrulheiro  |             0 |            40 |            50% |         7.5 |
| Necromante × Bárbaro      |             0 |            40 |            50% |         7.5 |
| Necromante × Druida       |             0 |            40 |            50% |        11.7 |
| Necromante × Bruxo        |             0 |            40 |            50% |         8.5 |
| Paladino × Paladino       |            20 |            20 |             0% |        13.0 |
| Paladino × Ladino         |             0 |            40 |            50% |         8.5 |
| Paladino × Bardo          |            20 |            20 |             0% |        12.0 |
| Paladino × Monge          |             0 |            40 |            50% |         8.7 |
| Paladino × Patrulheiro    |             0 |            40 |            50% |         9.5 |
| Paladino × Bárbaro        |             0 |            40 |            50% |         8.5 |
| Paladino × Druida         |             0 |            40 |            50% |        12.0 |
| Paladino × Bruxo          |             0 |            40 |            50% |        10.5 |
| Ladino × Ladino           |            20 |            20 |           100% |         9.0 |
| Ladino × Bardo            |            40 |             0 |            50% |         9.5 |
| Ladino × Monge            |            40 |             0 |            50% |         7.7 |
| Ladino × Patrulheiro      |            40 |             0 |            50% |         8.3 |
| Ladino × Bárbaro          |            40 |             0 |            50% |         9.5 |
| Ladino × Druida           |            34 |             6 |            65% |        11.2 |
| Ladino × Bruxo            |            40 |             0 |            50% |         9.4 |
| Bardo × Bardo             |            20 |            20 |             0% |        14.0 |
| Bardo × Monge             |             0 |            40 |            50% |         7.8 |
| Bardo × Patrulheiro       |             0 |            40 |            50% |         8.8 |
| Bardo × Bárbaro           |             0 |            40 |            50% |         9.5 |
| Bardo × Druida            |             0 |            40 |            50% |        12.1 |
| Bardo × Bruxo             |             0 |            40 |            50% |        10.5 |
| Monge × Monge             |            21 |            19 |            23% |         6.7 |
| Monge × Patrulheiro       |            33 |             7 |            53% |         7.5 |
| Monge × Bárbaro           |            10 |            30 |            25% |         7.1 |
| Monge × Druida            |            11 |            29 |            57% |        11.0 |
| Monge × Bruxo             |            40 |             0 |            50% |         7.0 |
| Patrulheiro × Patrulheiro |            20 |            20 |             0% |         8.0 |
| Patrulheiro × Bárbaro     |             0 |            40 |            50% |         8.5 |
| Patrulheiro × Druida      |             0 |            40 |            50% |        11.7 |
| Patrulheiro × Bruxo       |            40 |             0 |            50% |         7.5 |
| Bárbaro × Bárbaro         |            20 |            20 |             0% |         8.0 |
| Bárbaro × Druida          |             8 |            32 |            30% |        12.7 |
| Bárbaro × Bruxo           |            40 |             0 |            50% |         7.5 |
| Druida × Druida           |            22 |            18 |            45% |        14.6 |
| Druida × Bruxo            |            40 |             0 |            50% |        11.1 |
| Bruxo × Bruxo             |            20 |            20 |             0% |         8.0 |

## Leitura honesta destes números

Os resultados são fortemente desiguais — o Ladino vence 99% e o Bardo 17%.
**Nada foi rebalanceado por causa disso**, e o motivo não é só a regra de não
mexer em balanceamento sem playtest humano: os números medem tanto o catálogo
quanto a política, e a política é rasa de propósito.

O que a política de base sabe fazer:

- pontuar um Ataque por Dano e por Impacto contra a Guarda atual;
- responder quando a ameaça é grande o bastante;
- conferir as condições impressas que ela consegue ler da projeção;
- mandar as escolhas obrigatórias que cada carta exige.

O que ela **não** sabe fazer, e que pesa contra classes inteiras:

- montar sequências de várias Ações. O Bardo vive de Cadência (duas Ações
  consecutivas com Notas diferentes) e o Monge de Kata (Abertura → Fluxo →
  Finalização); a política escolhe cada Ação isoladamente, pela nota mais alta,
  e só esbarra na sequência por acaso;
- subir trilha de estado. O Clérigo precisa avançar de Vigília até Milagre e o
  Paladino de Vacilante até Inabalável antes de a metade boa da build existir;
  a política não persegue nenhum dos dois, e por isso quase toda carta com
  "Requer Graça ou mais" e "Requer Resoluto" fica fora das candidatas;
- usar Cartas de Classe. Ela nunca Ativa nem Exaure Carta de Classe por conta
  própria, o que apaga metade do texto de toda classe da Etapa 4;
- pagar preços opcionais. O Preço Proibido do Bruxo, o preço em Vida das cartas
  dele, a redução voluntária de Guarda do Bárbaro e a Marca do Patrulheiro só
  entram quando a carta os exige.

A Última Canção do Bardo (`BU01`) ficou explicitamente de fora das candidatas:
a condição impressa dela — a terceira Ação com as duas anteriores de Notas
diferentes — é uma sequência que a política não sabe montar, e propor a carta
fora dela seria comando ilegal.

Por isso o correto a concluir daqui é estreito:

1. **O motor aguenta as doze classes juntas.** 3120 partidas, 156
   configurações, zero comando ilegal, zero invariante quebrada, zero
   bloqueio de regra, zero partida sem desfecho.
2. **Nenhuma partida travou.** Nenhuma bateu no limite técnico de 60 turnos, e
   o turno médio de 8,97 está longe dele.
3. **Os números de vitória ainda não medem balanceamento.** Eles medem o
   catálogo _através_ de uma política que não joga metade do que as cartas
   oferecem. O limite de 60/40 do `CARD_CATALOG.md` só faz sentido contra uma
   política que use Cartas de Classe, trilhas de estado e sequências — e essa
   política ainda não existe.

## Um defeito real que a matriz encontrou

A matriz não é decorativa: ao rodar as doze classes juntas, ela expôs dois bugs
que os testes de carta não pegariam, porque os dois só aparecem em combinações
entre classes diferentes.

1. **A Defesa Inata cobrava do defensor as escolhas da carta do atacante.**
   `responder` conferia as escolhas obrigatórias usando o perfil da Ação
   inimiga, então um Necromante atacando com "colha até 2 Almas" fazia o
   comando de Defesa Inata do adversário ser recusado por falta de uma escolha
   que não era dele. A conferência passou a separar a carta declarada das
   Cartas de Classe e Passivas de quem se defende.
2. **A Vida podia ficar negativa.** Um Ataque com excesso de Dano deixava o
   estado com Vida abaixo de zero, o que a própria validação do motor
   (`validacao.ts`) já considerava estado inválido. As quatro portas de perda
   de Vida — combate, Condições, perda direta e preço — passaram a parar em
   zero.
