# Assets

## Regras

- Os PNGs entregues são **assets aprovados**. Não são redesenhados, recriados,
  recortados nem redimensionados.
- Nenhum texto, número ou valor de jogo é desenhado dentro de um PNG. Moldura é
  asset; nome, custo, Dano, Impacto e cooldown são renderizados por código.
- A transparência é preservada.
- Arena, slots, cartas, HUD, overlays e VFX são camadas diferentes.
- O módulo Ação + Resposta é montado em código a partir de
  `board_action_slot.png` e `board_response_slot.png`, repetido três vezes.
  Não existe PNG composto.

O catálogo oficial e os nomes canônicos estão em
[`ASSET_CATALOG.md`](ASSET_CATALOG.md).

## Onde ficam

`/assets` na raiz do repositório é a única fonte de verdade:

```text
assets/
  arenas/        arena_board_clean_vertical.png
  board/slots/   slots de Ação, Resposta, Carta de Classe, Passiva e Ultimate
  board/trays/   bandejas de cooldown e de Condições
  cards/frames/  as seis molduras de carta
  cards/backs/   verso neutro
  cards/art/     arte das habilidades (ainda vazio)
  hud/           retratos, nameplate, barras e estandartes
  overlays/      selecionável, selecionado e alvo válido
  icons/         os dez ícones universais
```

`npm run assets:sync` espelha essa pasta em `apps/web/public/assets`, que é
gerada e fica fora do controle de versão. Isso roda sozinho antes de
`npm run dev` e de `npm run build`.

## Manifesto

`packages/ui/src/assets/manifest.json` declara cada asset com:

| Campo       | Significado                                                 |
| ----------- | ----------------------------------------------------------- |
| `id`        | identificador semântico estável, usado pelo código          |
| `arquivo`   | nome canônico do arquivo                                    |
| `caminho`   | caminho relativo a `/assets`                                |
| `categoria` | moldura, verso, arena, slot, bandeja, HUD, overlay ou ícone |
| `camada`    | camada de composição da interface                           |
| `papel`     | para que serve                                              |

A interface pede o asset pelo `id`, nunca pelo caminho:

```tsx
<AssetImage assetId="card-frame-ataque" alt="Moldura de Ataque" />
```

Trocar o arquivo, mudar a base de publicação ou servir de uma CDN não toca em
componente nenhum.

`npm run assets:check` confere o manifesto contra o disco. Ele **falha** quando
o manifesto está inconsistente (id duplicado, caminho inválido, arquivo em
`/assets` não declarado) e apenas **avisa** quando um asset declarado ainda não
foi entregue.

## Assets ainda não entregues

Quando um arquivo falta, `<AssetImage>` cai para um placeholder técnico gerado
em tempo de execução: hachura diagonal, moldura tracejada e o id do asset
escrito por cima. Ele não é arte, não define identidade visual e desaparece
sozinho quando o PNG aprovado é colocado em `/assets`.

Faltam hoje, do catálogo oficial:

- `board_passive_slot_purple.png` — slot de Passiva;
- os dez ícones universais: `icon_health`, `icon_guard`, `icon_action_points`,
  `icon_reserve`, `icon_damage`, `icon_impact`, `icon_cooldown`, `icon_rupture`,
  `icon_activate`, `icon_exhaust`.

Se os dez ícones vierem como uma faixa única, ela pode entrar temporariamente
como sprite atlas usando a ordem declarada em `ORDEM_DO_ATLAS_DE_ICONES`, e ser
trocada depois pelas versões individuais sem mudar os ids.

## Ícones da PWA

`apps/web/public/icons/` contém **placeholder técnico** gerado por
`npm run icons:placeholder`. Nenhum asset aprovado foi recortado ou alterado
para produzi-los. Eles precisam ser substituídos por arte aprovada antes de
qualquer publicação pública.
