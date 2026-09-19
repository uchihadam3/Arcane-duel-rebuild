# Checkpoint A — ficha de avaliação

O que mudou entre o commit reprovado (`da59e7a`) e este Checkpoint A, com a
medição de cada item. Ele cobre **só composição estática**: resolução, câmera,
arena, escala, mão, slots, HUD, cartas e nitidez. Movimento é o Checkpoint B;
combate, VFX e áudio são o Checkpoint C.

As capturas ficam em `docs/capturas/checkpoint-a/`, uma por resolução e
densidade, geradas por `npm run ficha:visual`.

---

## 1. A arena aprovada

|                                | Etapa 6 reprovada                          | Checkpoint A          |
| ------------------------------ | ------------------------------------------ | --------------------- |
| Caminho até a GPU              | PNG → canvas 1024 × 1024 → `CanvasTexture` | PNG → GPU             |
| Tamanho desenhado              | 832 × 944                                  | 941 × 1672, o arquivo |
| Distorção horizontal           | **1,57×**                                  | **1,00×**             |
| Pixels preservados             | 50 %                                       | 100 %                 |
| Espaço de cor                  | sRGB                                       | sRGB                  |
| Mipmap                         | não                                        | sim                   |
| Anisotropia                    | nenhuma                                    | a máxima do aparelho  |
| Vinheta por cima               | radial, 78 % de preto                      | nenhuma               |
| Ornamento desenhado por código | borda dupla, linha de centro               | nenhum                |

A proporção do campo **deixou de ser escolhida**. Ela sai da faixa central da
arte — 0,138 a 0,688 da altura, centrada na rosa dos ventos, que está em 0,413
e não na metade. Se a arte mudar, a planta acompanha sozinha.

E o tampo é maior que o campo: ele leva a arte inteira e sai do quadro pela
frente e pelo fundo. Um plano inclinado não cobre um retângulo deitado, e essa
era a origem do "tabuleiro flutuando no escuro".

## 2. Câmera

|                               | Etapa 6 reprovada           | Checkpoint A                |
| ----------------------------- | --------------------------- | --------------------------- |
| Abertura                      | livre entre **16° e 74°**   | fixa em **10°**             |
| Como cabe na tela             | deformando a lente          | movendo a distância         |
| Declinação                    | 34,6°, implícita na posição | 27,5°, escolhida pela conta |
| Razão de tamanho frente/fundo | 2,0×                        | ~1,2×                       |
| Planos de corte               | 0,8 e 120, fixos            | derivados da distância      |

27,5° não é gosto. A faixa de jogo tem proporção 1,023 e um plano deitado
projeta com proporção `proporção / sen θ`; em 27,5° isso dá 2,22 — um telefone
deitado. O ângulo foi escolhido para a arena preencher a tela **sem ser
esticada em nenhuma direção**.

## 3. Nitidez

|                     | Etapa 6 reprovada     | Checkpoint A                     |
| ------------------- | --------------------- | -------------------------------- |
| Densidade do canvas | `min(1,75, DPR)`      | `min(teto do nível, DPR)`        |
| Teto em Alta        | 1,75                  | 3                                |
| Teto em Média       | 1,25                  | 3                                |
| Teto em Baixa       | 1,0                   | 2                                |
| Textura de carta    | uma, 512 × 717        | três: 512, 768 e **1060 × 1484** |
| Filtragem da carta  | linear, anisotropia 4 | mipmap + anisotropia do aparelho |

Num telefone de DPR 3 a versão reprovada desenhava a 1,75× e esticava. Era
borrão escolhido por nós, permanente, em cima de nome de carta e número de HUD.

A carta em foco passa a usar a moldura aprovada em **tamanho nativo**: antes
ela mostrava 23 % da área do arquivo, ampliada.

## 4. Qualidade automática

|                       | Etapa 6 reprovada         | Checkpoint A                                        |
| --------------------- | ------------------------- | --------------------------------------------------- |
| Janela de decisão     | 1 s                       | 3 s                                                 |
| Estatística           | média                     | mediana                                             |
| Histerese             | nenhuma                   | desce acima de 33 ms, sobe abaixo de 20 ms          |
| Carência entre trocas | nenhuma                   | 6 s                                                 |
| Pode voltar a subir   | não                       | sim, após duas janelas boas                         |
| Ordem do sacrifício   | sombra e resolução juntas | sombra → partícula → luz → **resolução por último** |

O nível escolhido pelo jogador continua sendo teto: a subida automática nunca
passa dele.

## 5. Composição do campo

|                                   | Etapa 6 reprovada                                       | Checkpoint A                                   |
| --------------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| Lajes desenhadas                  | 41, todas com pedestal escuro e placa                   | placa só onde há arte aprovada                 |
| Zonas sem arte aprovada           | retângulo cinza opaco (erro 404 do `slot-passiva`)      | rebaixo translúcido, a arena aparece por baixo |
| Relevo das zonas                  | 0,08 a 0,36 de altura                                   | 0,018 a 0,03 — assentamento, não degrau        |
| Simetria em X                     | não: a pilha de removidas puxava o campo para a direita | sim, ±13,05 na grade dos dois lados            |
| Contorno de zona válida           | verde-limão em WebGL **e** em CSS, somados              | dourado, só em WebGL, 0,21 de opacidade        |
| Passo do leque                    | 2,11 para carta de 3,9 — o nome sumia                   | 3,0                                            |
| Mão sobre a fileira de identidade | sim                                                     | não: o leque começa depois da última fileira   |

## 6. O que continua sendo problema, e não foi maquiado

**A arte da arena é estreita demais para um telefone de alta densidade.** Ela
tem 941 px de largura. Em 915 CSS px com DPR 3, a tela pede 2745 px: a arena
está sendo **ampliada 2,9×**. Nenhum código resolve isso — é resolução de
asset. A ficha mede e relata o número (`arenaPorPixel`).

**A arena não cobre a tela inteira, e não pode.** Um plano inclinado projeta
estreito no fundo; medido em 915 × 412, a arte cobre cerca de 75 % da largura
na altura mais alta ainda visível. As cunhas que sobram são onde moram o Menu e
o HUD do adversário, e o fundo ali é degradê, não preto chapado. Cobrir de
verdade exigiria uma arte de arena mais larga.

**`slot-passiva` está no catálogo e não foi entregue.** Enquanto não existir,
as oito Passivas do campo são rebaixo, e não moldura.

**Os VFX continuam sendo geometria de demonstração** e o áudio continua sendo
oscilador. Nada disso foi tocado aqui — é escopo do Checkpoint C, e continua
registrado em `STAGE6_VISUAL_REWORK.md`.

---

## Como reproduzir a medição

```
npm run build
npm run ficha:visual      # quatro capturas + a tabela de nitidez
npm run verify:arena      # seis resoluções, sem corte e sem overflow
```

A ficha falha se a cena for desenhada abaixo do que o nível de qualidade em
vigor permite. É essa guarda que impede um limite de resolução voltar a entrar
escondido no código.
