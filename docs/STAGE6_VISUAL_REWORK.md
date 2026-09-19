# Etapa 6 — auditoria da reprovação visual

O vertical slice do commit `da59e7a` foi aberto em aparelho real e **reprovado**.
Este documento registra o que está errado antes de qualquer correção, com
medição onde há medição possível. Ele não é um plano de polimento: o que a
Etapa 6 entregou é um _technical spike_ funcional, não a aparência do Arcane
Duel.

A regra que este documento estabelece para o resto da etapa: **ter Three.js,
ter partículas, ter WebGL, não dar overflow e passar em captura não é
qualidade.** Se continuar parecendo protótipo, continua reprovado.

---

## A. A arena aprovada estava sendo deformada, não só borrada

Este é o defeito mais grave, e ele não é de nitidez — é de **proporção**.

| Medida                            | Valor                 |
| --------------------------------- | --------------------- |
| `arena_board_clean_vertical.png`  | 941 × 1672 px, 4,1 MB |
| Proporção do arquivo aprovado     | 0,563 (retrato)       |
| Desenho dentro de `desenharTampo` | 832 × 944 px          |
| Proporção aplicada                | 0,881                 |
| **Distorção horizontal**          | **1,57×**             |
| Pixels preservados                | 50 %                  |

`desenharTampo()` criava um canvas 1024 × 1024 e desenhava o PNG em
832 × 944 antes de virar `CanvasTexture`. Uma arena retrato foi espremida em um
quadrado: o compasso central virou elipse, as bandeiras e as estátuas ficaram
gordas, e a arte deixou de ser reconhecível. Por cima disso ainda ia uma
vinheta radial de 78 % de preto, que apagava a borda ornamentada — exatamente a
parte mais rica do desenho.

Somando: o usuário aprovou uma arte e o jogo mostrava outra coisa.

### O que a medição mostra sobre o uso do asset

A arte aprovada **já está desenhada em perspectiva**: tem ponto de fuga, o
fundo (bandeiras vermelhas) é visto mais de cima que a frente (bandeiras
azuis), e há degraus vindo em direção ao observador. Ela não é uma textura
topo-plana para ser deitada num tampo e olhada de novo em perspectiva — fazer
isso aplica perspectiva duas vezes, e é parte do motivo de o campo parecer
"uma cama tombada".

Consequência de composição, e não só de código: a arena precisa aparecer com a
perspectiva dela, não com a nossa por cima.

---

## B. A textura de carta joga fora três quartos da moldura

| Medida                      | Valor          |
| --------------------------- | -------------- |
| Moldura aprovada            | 1060 × 1484 px |
| `TAMANHO_DA_TEXTURA`        | 512 × 717 px   |
| Resolução linear preservada | 48 %           |
| **Área preservada**         | **23 %**       |

E essa textura única servia a todos os usos: mão, campo, carta em foco e
apresentação central. Uma carta em foco, ampliada, estava mostrando uma
moldura com menos de um quarto dos pixels que o arquivo tem — ampliada ainda
por cima. Em tela de alta densidade isso é borrão garantido.

Não existe estratégia de resolução por uso. Existe um número só.

---

## C. A resolução de renderização estava limitada abaixo da tela

`ORCAMENTO_VISUAL.alta.escalaDeRenderizacao` era **1,75**, e o renderizador
usava `Math.min(escala, devicePixelRatio)`. Num telefone com DPR 3, a cena era
desenhada a 1,75× e esticada para 3× — perda visível, permanente, escolhida
por nós.

Os níveis abaixo pioram: média 1,25 e baixa 1,0.

Nitidez de carta, HUD e texto é informação competitiva. Ela não pode ser a
primeira coisa a ser sacrificada.

---

## D. A qualidade caía sozinha, rápido, e levava a resolução junto

O laço media a média do quadro e, **depois de um único segundo** acima de
33 ms, descia um degrau — e o degrau incluía `escalaDeRenderizacao`.

Efeito prático: o jogador escolhe Alta, abre a partida, e em poucos segundos
está vendo a cena em resolução Baixa sem ter pedido nada. Sem histerese, sem
janela estável, sem poder voltar a subir.

Além disso, a medição usada para calibrar o critério veio de um Chromium de CI
que rasteriza por software e já mediu 31 e 2 fps na mesma resolução. Isso não
pode decidir a qualidade visual do produto.

---

## E. A câmera resolve layout deformando a lente

`enquadrar` ajustava o FOV livremente entre **16° e 74°** para fazer tudo
caber. Em aparelho real o resultado lê como uma mesa tombada, esticada e
distante — e a "personalidade" da câmera muda conforme a resolução, porque a
lente muda.

A referência não parece uma cama vista de lado. Ela tem perspectiva discreta,
lente longa e enquadramento estável.

O erro de método: quando algo não cabia, a lente abria. O certo é corrigir a
composição do campo.

---

## F. Os VFX são placeholder geométrico

O que existe hoje, literalmente: `PlaneGeometry` como projétil, `RingGeometry`
como impacto e como onda, `CylinderGeometry` como Ultimate, `Points` com
`PointsMaterial` circular como partícula.

Isso é a aparência padrão de uma demo de Three.js. Trocar cor e quantidade não
resolve — falta antecipação, rastro, dissipação, luz correspondente e
consequência legível. Um anel que cresce não é impacto; um cilindro que sobe
não é Ultimate.

_(Escopo do Checkpoint C.)_

---

## G. O áudio é bipe procedural, e foi descrito como pronto

A arquitetura do `AudioDirector` — barramento único, três canais, som no mesmo
quadro do visual — está certa e fica. As **vozes** são osciladores com ruído
branco: são placeholders, e o relatório anterior não deixou isso suficientemente
claro ao chamá-los de "som do vertical slice".

Ficam registrados como placeholder até existirem assets produzidos.

_(Escopo do Checkpoint C.)_

---

## H. Não existe música nem ambiência

O slice não tem cama musical. Não há sistema de música, não há ambiência de
arena, não há mixagem entre música e efeitos.

Nada de terceiros entra aqui. Enquanto não houver faixa original ou licenciada
disponível, o correto é implementar o sistema e marcar **"aguardando música
original"** — e não mascarar a ausência com um tom sintetizado.

_(Escopo do Checkpoint C.)_

---

## I. A composição põe informação demais dentro da perspectiva

Passivas, Cartas de Classe, Ultimate, cooldown, Condições e Personagem foram
todos colocados no chão inclinado, competindo por espaço com os três espaços de
Ação — que são o que o olho precisa achar primeiro. Em 915 × 412 isso vira
microtexto em perspectiva.

A referência separa fortemente mundo e HUD. Informação crítica não pode virar
texto pequeno e inclinado no chão.

---

## Ordem de trabalho

A revisão é feita em três checkpoints, cada um publicado e avaliado em aparelho
antes do seguinte. Pular para o combate seria repetir o erro de declarar pronto
o que não foi visto.

| Checkpoint | Escopo                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------- |
| **A**      | composição estática: resolução, câmera, arena, escala, mão, slots, HUD, cartas, inspetor, nitidez |
| **B**      | movimento: seleção, foco, carta entrando, Resposta, Passiva, Ativar/Exaurir, troca de turno       |
| **C**      | combate: ataques, magia, impacto, Ruptura, Ultimate, áudio e música                               |

O critério do Checkpoint A é simples e é sobre a tela **parada**: abrir a
partida no celular, não tocar em nada, e o campo já precisa parecer várias
categorias acima do atual.

---

## O que o Checkpoint A respondeu

O resultado medido do Checkpoint A — item a item, com o antes e o depois — está
em `STAGE6_VISUAL_REVIEW.md`. Os itens **A**, **B**, **C**, **D**, **E** e
**I** desta auditoria foram atacados lá; **F**, **G** e **H** continuam abertos
e são escopo do Checkpoint C.

Duas coisas que a execução descobriu e que não são de código:

- A arte da arena tem **941 px de largura**. Num telefone de 915 CSS px com
  DPR 3 a tela pede 2745: a arena é ampliada 2,9×. Só uma arte mais larga
  resolve.
- Um plano inclinado **não cobre** uma tela deitada: a borda do fundo projeta
  estreita e sobram duas cunhas nas quinas de cima. Medido em 915 × 412, a arte
  cobre cerca de 75 % da largura na altura mais alta ainda visível.
