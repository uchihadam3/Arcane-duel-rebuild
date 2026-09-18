# Identificadores de carta

Todo identificador do catálogo é uma string estável, imutável e única. Ele é a
chave que liga as três metades de uma carta: o dado (`packages/card-data`), o
comportamento (`packages/gameplay/src/efeitos`) e o asset
(`packages/ui/src/assets`). Renomear um identificador é quebrar replay, teste e
arte ao mesmo tempo — então identificador não se renomeia.

## Formato

```
<prefixo da classe><marcador de tipo><número de dois dígitos>
```

O marcador de tipo é vazio para habilidade, `P` para Passiva, `C` para Carta de
Classe e `U` para Ultimate. O número é sempre de dois dígitos, começando em
`01`, na ordem em que a carta aparece em `docs/CARD_CATALOG.md`.

| Classe      | Prefixo | Habilidades   | Passivas        | Cartas de Classe | Ultimates       |
| ----------- | ------- | ------------- | --------------- | ---------------- | --------------- |
| Guerreiro   | `W`     | `W01`–`W20`   | `WP01`–`WP10`   | `WC01`–`WC06`    | `WU01`–`WU03`   |
| Mago        | `M`     | `M01`–`M20`   | `MP01`–`MP10`   | `MC01`–`MC06`    | `MU01`–`MU03`   |
| Clérigo     | `C`     | `C01`–`C20`   | `CP01`–`CP10`   | `CC01`–`CC06`    | `CU01`–`CU03`   |
| Necromante  | `N`     | `N01`–`N20`   | `NP01`–`NP10`   | `NC01`–`NC06`    | `NU01`–`NU03`   |
| Paladino    | `P`     | `P01`–`P20`   | `PP01`–`PP10`   | `PC01`–`PC06`    | `PU01`–`PU03`   |
| Ladino      | `L`     | `L01`–`L20`   | `LP01`–`LP10`   | `LC01`–`LC06`    | `LU01`–`LU03`   |
| Bardo       | `B`     | `B01`–`B20`   | `BP01`–`BP10`   | `BC01`–`BC06`    | `BU01`–`BU03`   |
| Monge       | `MO`    | `MO01`–`MO20` | `MOP01`–`MOP10` | `MOC01`–`MOC06`  | `MOU01`–`MOU03` |
| Patrulheiro | `R`     | `R01`–`R20`   | `RP01`–`RP10`   | `RC01`–`RC06`    | `RU01`–`RU03`   |
| Bárbaro     | `BA`    | `BA01`–`BA20` | `BAP01`–`BAP10` | `BAC01`–`BAC06`  | `BAU01`–`BAU03` |
| Druida      | `D`     | `D01`–`D20`   | `DP01`–`DP10`   | `DC01`–`DC06`    | `DU01`–`DU03`   |
| Bruxo       | `BR`    | `BR01`–`BR20` | `BRP01`–`BRP10` | `BRC01`–`BRC06`  | `BRU01`–`BRU03` |

## Por que alguns prefixos têm duas letras

`M` já era do Mago quando o Monge entrou, e `B` já era do Bardo quando o Bárbaro
e o Bruxo entraram. Em vez de renomear cartas que já tinham dado, comportamento,
teste e asset, as classes novas ganharam prefixo de duas letras: `MO`, `BA` e
`BR`. O Patrulheiro usa `R` (de _Ranger_) porque `P` é do Paladino.

Nenhum prefixo é prefixo de outro em uma mesma família de tipo — `B01` e `BA01`
não colidem, e `BP01`, `BAP01` e `BRP01` são três Passivas distintas —, e um
teste do catálogo confere que os 468 identificadores são únicos.

## Identificadores que não são cartas

Duas famílias de identificador existem fora do catálogo jogável e **nunca**
aparecem nele:

- `personagem:<classe>` — a identidade técnica do Personagem, usada como origem
  de efeito da classe. O `CARD_CATALOG.md` ainda não traz as cartas de
  Personagem, e o catálogo jogável não as inventa (ver `AMBIGUIDADES.md`, 37).
- `sistema:<nome>` — origem de efeito que pertence ao motor e não a uma carta:
  `sistema:turno` para as rotinas de turno e `sistema:guarda-marcial`,
  `sistema:veu-profano` e as outras dez para as Defesas Inatas, que são regra de
  classe e não cartas (§8).

## Contagem

Doze classes × 39 cartas jogáveis = **468**. Por classe: 20 habilidades,
10 Passivas, 6 Cartas de Classe e 3 Ultimates. A composição é conferida carta a
carta em `packages/card-data/src/catalogo.test.ts`, contra uma tabela de nomes
transcrita à mão do `CARD_CATALOG.md` — uma segunda leitura independente do
documento, de propósito.
