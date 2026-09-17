# ASSET_CATALOG.md
## Catálogo oficial de assets visuais para implementação

> Os nomes abaixo são os nomes canônicos esperados dentro do projeto. Se o arquivo recebido tiver outro nome, renomeie-o para o nome canônico antes de integrar.

## Regras gerais

- PNGs permanecem separados da lógica.
- Não desenhar texto, números ou valores permanentes dentro dos PNGs.
- Não redesenhar assets aprovados.
- Transparência deve ser preservada.
- Arena, slots, cartas, HUD, overlays e VFX são camadas diferentes.
- Oponente e jogador usam a mesma estrutura de campo espelhada.
- O módulo Ação + Resposta é montado por código; não depender de uma imagem composta.

---

# 1. CARTAS — FRENTE

- `card_frame_attack_red.png` — moldura de habilidade do tipo Ataque.
- `card_frame_technique_blue.png` — moldura de Técnica.
- `card_frame_reaction_green.png` — moldura de Reação.
- `card_frame_passive_ivory_gold.png` — moldura de Passiva.
- `card_frame_class_purple.png` — moldura de Carta de Classe.
- `card_frame_ultimate_orange_gold.png` — moldura de Ultimate.

Composição da carta digital:

1. arte da habilidade;
2. moldura PNG;
3. nome;
4. custo;
5. tipo;
6. texto;
7. Dano/Impacto quando houver;
8. cooldown;
9. ícones de classe/recurso.

Texto e números nunca devem ser baked no PNG da moldura.

---

# 2. VERSO

- `card_back_default_gold.png` — verso oficial neutro para cartas ocultas.

Uso:

- mão do oponente;
- Passivas ainda não reveladas;
- animações de flip;
- qualquer carta cujo conteúdo esteja oculto.

O verso nunca deve revelar tipo, classe ou informação privada.

---

# 3. ARENA E CAMPO

- `arena_board_clean_vertical.png` — arena limpa, sem HUD e sem slots baked.
- `board_action_slot.png` — slot base de Ação.
- `board_response_slot.png` — slot individual de Resposta.
- `board_class_slot_purple.png` — slot de Carta de Classe.
- `board_passive_slot_purple.png` — slot de Passiva.
- `board_ultimate_slot.png` — slot especial de Ultimate.
- `board_cooldown_tray_three_slots.png` — trilha/bandeja CD1, CD2, CD3.
- `board_conditions_tray_four_slots.png` — bandeja para Queimadura, Lento, Murchar e Sangramento.

## Ação + Resposta

Não usar PNG composto como fonte principal.

Crie um componente de UI que contenha:

- `board_action_slot.png` em cima;
- `board_response_slot.png` menor e ligado visualmente logo abaixo.

Repita esse componente três vezes.

---

# 4. HUD

- `hud_portrait_frame_primary_red.png` — moldura principal de retrato/personagem.
- `hud_portrait_frame_secondary_red.png` — moldura circular secundária.
- `hud_nameplate_red.png` — placa horizontal para nome/informação textual.
- `hud_health_bar_red.png` — barra visual de Vida.
- `hud_guard_bar_red.png` — barra visual de Guarda.
- `hud_reserve_bar_red.png` — barra visual de Reserva.
- `hud_faction_banner_red.png` — estandarte decorativo/facção.
- `hud_turn_banner_red.png` — faixa de transição de turno.

Todos os valores devem ser renderizados dinamicamente por código.

---

# 5. OVERLAYS DE ESTADO

- `overlay_selectable_blue.png` — carta/slot pode ser escolhido.
- `overlay_selected_gold.png` — carta/slot atualmente selecionado.
- `overlay_valid_target_green.png` — alvo válido.

Aplicar como camada acima da carta/slot. Não duplicar o asset-base em versões coloridas.

---

# 6. ÍCONES UNIVERSAIS

Nomes canônicos desejados:

- `icon_health.png`
- `icon_guard.png`
- `icon_action_points.png`
- `icon_reserve.png`
- `icon_damage.png`
- `icon_impact.png`
- `icon_cooldown.png`
- `icon_rupture.png`
- `icon_activate.png`
- `icon_exhaust.png`

Se, no handoff inicial, os dez ícones estiverem apenas em uma única faixa PNG, ela pode ser integrada temporariamente como **sprite atlas**, sem regenerar a arte:

- nome sugerido: `icons_universal_atlas.png`;
- definir dez regiões/UVs no código;
- depois substituir pelas versões individuais sem mudar os IDs semânticos.

Ordem visual do atlas atual:

1. Health/Vida — coração;
2. Guard/Guarda — escudo;
3. Action Points/AP — vórtice azul;
4. Reserve/Reserva — ampulheta;
5. Damage/Dano — explosão vermelha;
6. Impact/Impacto — impacto roxo;
7. Cooldown — relógio/seta circular;
8. Rupture/Ruptura — fissura vermelha;
9. Activate/Ativar — seta verde para cima;
10. Exhaust/Exaurir — fumaça/cinza.

---

# 7. ASSETS QUE NÃO DEVEM SER USADOS COMO FONTE FINAL

- screenshots/concept sheets com várias molduras juntas;
- HUD composto antigo com todas as peças baked numa só imagem;
- cooldown antigo de três círculos;
- slot antigo circular de Passiva;
- qualquer verso antigo sem transparência externa correta;
- qualquer módulo Ação + Resposta antigo com ícone de escudo fixo;
- mockups completos de batalha usados apenas como referência visual.

---

# 8. ESCALA E LAYOUT

## Cartas

Proporção mestre: aproximadamente 5:7 para as molduras de carta.

A UI pode reduzir a textura, mas deve preservar a proporção e usar resolução suficiente para zoom.

## Arena

A arena é fundo/cenário. Não assuma que pixels da arena definem hitboxes ou zonas lógicas.

## Mobile

A batalha deve caber em uma única tela, sem scroll durante o combate.

O layout final deve priorizar legibilidade de:

- mão de 8 cartas;
- três Ações;
- Respostas;
- HUD de ambos;
- cooldown;
- Passivas;
- Cartas de Classe;
- Ultimate;
- Condições.

---

# 9. CONVENÇÃO DE PASTAS RECOMENDADA

```text
assets/
  cards/
    frames/
    backs/
  board/
    slots/
    trays/
  hud/
  overlays/
  icons/
  arenas/
```

Essa estrutura é recomendada. Codex pode ajustar nomes de diretórios, mas não os nomes semânticos dos assets sem motivo técnico documentado.
