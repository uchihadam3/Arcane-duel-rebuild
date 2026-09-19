# Demo Visual V2 — protótipo isolado da linguagem final

Este documento descreve **um protótipo para aprovação**, e não a Etapa 6. A
Etapa 6 continua aberta e continua reprovada; a batalha antiga segue no
aplicativo, intacta, para a comparação ser possível lado a lado.

O que a Demo V2 testa: se conseguimos atingir qualidade superior **desenhando
tudo por código** — arena, cartas, HUD, efeitos, som e música —, com o jogador
contra a IA e a câmera parada do lado dele.

---

## 1. A decisão de arquitetura que manda em tudo

A Etapa 6 foi reprovada duas vezes, e as duas por motivos que têm a mesma
origem técnica.

| Reprovação  | Causa técnica                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| "borrado"   | A carta era desenhada num canvas e virava textura. Toda resolução escolhida está errada em algum aparelho. |
| "deformado" | A arena era projetada por conta própria, e a projeção divergia do que o WebGL desenhava.                   |

A V2 troca o caminho: **SVG sob transformação 3D do CSS**.

- **Não existe textura.** A carta é SVG, o tabuleiro é SVG, o HUD é SVG. Quem
  rasteriza é o navegador, no tamanho exato em que a coisa está na tela e na
  densidade real do aparelho. Não há resolução a calibrar porque não há
  resolução.
- **Não existe projeção nossa.** As peças são **filhas** do elemento que recebeu
  a transformação 3D. Elas herdam a perspectiva pelo navegador, e o toque cai
  onde a carta está desenhada porque é o mesmo elemento. O alinhamento deixa de
  ser uma conta que pode estar errada e passa a ser uma propriedade da árvore.

O custo declarado: uma superfície SVG grande sob transformação 3D é mais cara
de rasterizar que uma textura. O tabuleiro é estático, então o navegador o
rasteriza uma vez e reaproveita a camada — mas isso é uma aposta que só o
aparelho real confirma.

## 2. Perspectiva fixa

A regra mais importante da tarefa, e ela é **estrutural**, não disciplinar.

`apps/web/src/demo/sessao.ts` calcula **uma** projeção:
`projetarParaJogador(partida, HUMANO)`. A visão do lado da IA é calculada,
entregue à IA e descartada — ela nunca chega ao estado publicado. Virar a
câmera exigiria inventar um dado que não existe ali.

Na planta (`arena/planta.ts`), `jogador` é a metade de baixo e `maquina` a de
cima, em toda chamada. Não há parâmetro de inversão, e nenhuma função aceita
"de quem é a vez".

Durante o turno da IA:

- ela joga do lado superior;
- a carta sai da mão de cima, atravessa, **vira** quando a regra torna a
  identidade pública, e encaixa no slot dela;
- o efeito resolve;
- a câmera não se mexe, e nenhum beat de efeito pode movê-la — não existe beat
  de câmera no vocabulário, e um teste garante isso.

Não existe hot-seat nesta sessão. Não existe "passe o aparelho".

## 3. A IA do vertical slice

`packages/ai/src/vertical-slice.ts`, sobre a mesma `Politica` do simulador.

Três garantias estruturais:

1. Ela decide lendo `VisaoDaPartida` — a projeção. A mão do adversário não está
   nesse dado, nem a identidade de uma Passiva oculta. Não é que ela se abstenha
   de olhar: não há o que olhar.
2. Ela só propõe comandos que a enumeração de legalidade do `gameplay`
   devolveu. Custo, condição impressa e escolhas obrigatórias vêm de lá. Ela
   pontua candidatas; não inventa candidatas.
3. Ela não recebe bônus. O motor trata o comando dela como trata o de um humano.

**Guerreiro** joga pela Ruptura: Momentum nasce de derrubar Guarda e de anular
Dano, então gastá-lo cedo é barato. Ruptura pesa 14 e recurso poupado pesa 1,2.

**Mago** joga pela Mana e pela condição: a Mana repõe devagar e as cartas
grandes cobram quatro de uma vez. Recurso poupado pesa 3,4 e condição pesa 7.

A Ultimate só compete quando o Dano previsto é grande em relação à Vida que
resta: abaixo de 40 % ela leva penalidade de 22 pontos.

Encerrar o turno com AP na mão é decisão legítima — uma nota negativa significa
"pior que não jogar", e a IA respeita isso.

**Tempo de pensamento**: 300 a 900 ms, proporcional ao tamanho da decisão que
ela acabou de tomar. Não é atraso decorativo.

## 4. As quatro cartas-modelo

W08 Golpe de Cerco, W15 Aparar, M02 Bola de Fogo, MU01 Meteoro. Elas têm
moldura, arte e efeito próprios. As outras vinte e seis do slice usam o sigilo
neutro e o efeito neutro — **de propósito**, para ninguém confundir "ainda não
foi feito" com "foi feito assim".

Meteoro dura entre 2,5 e 4 s, escurece antes de brilhar e devolve a luz no fim.
Há teste para os três fatos.

## 5. Som e música

Camadas, não osciladores soltos. Cada evento é uma receita: transiente de ruído
filtrado, corpo com altura (FM para metal e vidro), e cauda numa reverberação de
arena gerada por código. Três barramentos independentes e um compressor no fim
da cadeia.

A música é original, em Ré menor, 76 bpm, oito compassos de progressão
(Dm–Bb–F–C–Dm–Gm–A–Dm) com arpejo variado por gerador determinístico. Três
camadas — exploração, pressão, clímax — cujos ganhos a tensão da partida move
em rampas de quatro segundos. Ultimate e Ruptura abaixam a música e a devolvem
devagar.

**O que não foi resolvido, e fica registrado em vez de vendido**: síntese
subtrativa simples não produz timbre de cordas de verdade. O que existe é uma
cama sintética convincente para um protótipo, não uma trilha orquestral. A
arquitetura já separa as vozes da mixagem, então trocá-las por gravação original
é trabalho próprio e isolado.

## 6. O que esta demo **não** faz

- Não substitui a batalha principal. Ela é uma entrada separada no menu.
- Não produz as 30 cartas do slice, nem as 468 do jogo.
- Não implementa as doze dificuldades da Etapa 8 nem a campanha.
- Não declara visual final aprovado.

## 7. Como avaliar

Menu → **Demo Visual V2 — Guerreiro × Mago** → escolha a classe → Entrar na
arena.

O que o avaliador decide, item a item: arena, carta, movimento, IA, som,
música.
