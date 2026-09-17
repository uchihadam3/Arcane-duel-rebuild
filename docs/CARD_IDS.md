# Identificadores de carta

Cada carta tem um código estável. O código é a **identidade** da carta, não a
posição dela em uma lista: reordenar um arquivo de dados não pode trocar o
código de nada. Um replay antigo fala desses códigos, e um código reaproveitado
transformaria um replay em uma partida diferente.

`packages/card-data/src/catalogo.test.ts` prende cada código ao nome impresso.
Trocar um nome sem trocar o código, ou vice-versa, quebra a verificação.

## Como os códigos são formados

| Prefixo                      | Significa                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| `W` / `M`                    | Guerreiro / Mago                                           |
| `W01`–`W20`, `M01`–`M20`     | as vinte habilidades, exatamente como no `CARD_CATALOG.md` |
| `WP01`–`WP10`, `MP01`–`MP10` | as dez Passivas                                            |
| `WC01`–`WC06`, `MC01`–`MC06` | as seis Cartas de Classe                                   |
| `WU01`–`WU03`, `MU01`–`MU03` | as três Ultimates                                          |

Os códigos das habilidades vêm do próprio `CARD_CATALOG.md`. Os demais não
existiam no documento — ele lista Passivas, Cartas de Classe e Ultimates por
nome — e foram atribuídos **uma única vez**, na ordem em que o documento as
apresenta. A partir daqui a ordem do documento é irrelevante: o que vale é a
tabela abaixo.

## Guerreiro

| Código | Carta                  | Tipo            |
| ------ | ---------------------- | --------------- |
| W01    | Corte de Sondagem      | Ataque          |
| W02    | Ombro de Guerra        | Ataque          |
| W03    | Quebra-Escudo          | Ataque          |
| W04    | Corte Ascendente       | Ataque          |
| W05    | Golpe do Carrasco      | Ataque          |
| W06    | Sequência Brutal       | Ataque          |
| W07    | Finta Cortante         | Ataque          |
| W08    | Golpe de Cerco         | Ataque          |
| W09    | Corte Encadeado        | Ataque          |
| W10    | Ataque de Oportunidade | Ataque          |
| W11    | Pressão Implacável     | Técnica         |
| W12    | Disciplina de Aço      | Técnica         |
| W13    | Finta Calculada        | Técnica         |
| W14    | Guarda Preparada       | Técnica         |
| W15    | Aparar                 | Reação          |
| W16    | Base Firme             | Reação          |
| W17    | Absorver o Golpe       | Reação          |
| W18    | Ripostar               | Reação          |
| W19    | Interposição           | Reação          |
| W20    | Último Bastião         | Reação          |
| WP01   | Instinto de Ferro      | Passiva         |
| WP02   | Sangue Aceso           | Passiva         |
| WP03   | Leitura de Combate     | Passiva         |
| WP04   | Predador de Ruptura    | Passiva         |
| WP05   | Dor em Força           | Passiva         |
| WP06   | Mestre da Defesa       | Passiva         |
| WP07   | Pressão de Veterano    | Passiva         |
| WP08   | Mão Pesada             | Passiva         |
| WP09   | Olho na Abertura       | Passiva         |
| WP10   | Guarda de Veterano     | Passiva         |
| WC01   | Postura da Fortaleza   | Carta de Classe |
| WC02   | Postura da Vanguarda   | Carta de Classe |
| WC03   | Postura do Duelista    | Carta de Classe |
| WC04   | Cerco Metódico         | Carta de Classe |
| WC05   | Contraofensiva         | Carta de Classe |
| WC06   | Ritmo de Batalha       | Carta de Classe |
| WU01   | Quebra-Reinos          | Ultimate        |
| WU02   | Última Palavra         | Ultimate        |
| WU03   | Sequência do Campeão   | Ultimate        |

## Mago

Todas as habilidades e as Ultimates do Mago carregam o traço `feitico`.
"Feitiço" é traço impresso ao lado do tipo, nunca um quarto tipo universal.

| Código | Carta                    | Tipo            |
| ------ | ------------------------ | --------------- |
| M01    | Dardo Arcano             | Ataque/Feitiço  |
| M02    | Bola de Fogo             | Ataque/Feitiço  |
| M03    | Chama Persistente        | Ataque/Feitiço  |
| M04    | Pulso Cinético           | Ataque/Feitiço  |
| M05    | Lança Arcana             | Ataque/Feitiço  |
| M06    | Estilhaço de Gelo        | Ataque/Feitiço  |
| M07    | Onda Glacial             | Ataque/Feitiço  |
| M08    | Rajada Prismática        | Ataque/Feitiço  |
| M09    | Orbe Instável            | Ataque/Feitiço  |
| M10    | Explosão de Mana         | Ataque/Feitiço  |
| M11    | Canalizar                | Técnica/Feitiço |
| M12    | Concentração Prismática  | Técnica/Feitiço |
| M13    | Distorção Temporal       | Técnica/Feitiço |
| M14    | Recalibrar Runa          | Técnica/Feitiço |
| M15    | Barreira de Mana         | Reação/Feitiço  |
| M16    | Imagem Espelhada         | Reação/Feitiço  |
| M17    | Égide Cinética           | Reação/Feitiço  |
| M18    | Armadura de Gelo         | Reação/Feitiço  |
| M19    | Contrafeitiço            | Reação/Feitiço  |
| M20    | Barreira Prismática      | Reação/Feitiço  |
| MP01   | Reserva Arcana           | Passiva         |
| MP02   | Mente Calculista         | Passiva         |
| MP03   | Véu Prismático           | Passiva         |
| MP04   | Eco Rúnico               | Passiva         |
| MP05   | Concentração sob Pressão | Passiva         |
| MP06   | Combustão Controlada     | Passiva         |
| MP07   | Frio Calculado           | Passiva         |
| MP08   | Geometria Rúnica         | Passiva         |
| MP09   | Reserva de Contramedidas | Passiva         |
| MP10   | Núcleo Sobrecarregado    | Passiva         |
| MC01   | Runa de Cinzas           | Carta de Classe |
| MC02   | Runa da Geada            | Carta de Classe |
| MC03   | Runa do Eco              | Carta de Classe |
| MC04   | Runa da Égide            | Carta de Classe |
| MC05   | Runa do Conduíte         | Carta de Classe |
| MC06   | Runa Prismática          | Carta de Classe |
| MU01   | Meteoro                  | Ultimate        |
| MU02   | Zero Absoluto            | Ultimate        |
| MU03   | Sobrecarga Temporal      | Ultimate        |

## Personagem: identidade técnica, não carta

O `CARD_CATALOG.md` **não fornece dados de Personagem** para classe nenhuma:
não há custo, valores, cooldown nem texto impresso para transcrever. Inventar
esses dados seria criar carta, e isso a Etapa 3 proíbe explicitamente.

O estado da partida, porém, exige um Personagem (§3, §4). As duas coisas ficam
separadas: o **catálogo jogável** tem 39 cartas por classe e nenhuma delas é
Personagem; a **identidade técnica** do Personagem vive no descritor da classe,
em `packages/card-data/src/classes.ts`, como identificador e nada mais.

| Classe             | Identificador do Personagem |
| ------------------ | --------------------------- |
| Guerreiro          | `personagem:guerreiro`      |
| Mago               | `personagem:mago`           |
| demais dez classes | `personagem:<classe>`       |

`CATALOGO.porId('personagem:guerreiro')` devolve `undefined` de propósito, e
`perfilDaCarta` também: o Personagem não é jogado de lugar nenhum, e a build o
valida contra o descritor da classe em vez de contra o catálogo. Quando o
documento trouxer as cartas de Personagem com os dados reais, elas entram no
catálogo e o descritor passa a apontar para elas.

## Identificadores que não são carta

Algumas anotações de efeito nascem de uma mecânica de classe, e não de uma
carta. Elas usam identificadores de sistema, fora do catálogo de propósito:
`sistema:momentum`, `sistema:mana`, `sistema:guarda-marcial`,
`sistema:barreira-arcana` e `sistema:turno`. Nenhum deles é procurável no
catálogo, e é assim que se distingue "isto veio de uma carta" de "isto é a
mecânica da classe".
