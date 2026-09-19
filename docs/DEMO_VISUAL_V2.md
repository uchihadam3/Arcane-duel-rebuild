# Demo Visual V2 — protótipo isolado da linguagem final

Este documento descreve **um protótipo para aprovação**, e não a Etapa 6. A
Etapa 6 continua aberta e continua reprovada; a batalha antiga segue no
aplicativo, intacta, para a comparação ser possível lado a lado.

A seção 0 descreve a **reconstrução da composição** pedida depois da primeira
avaliação desta demo. A planta do campo foi fornecida pelo usuário e está
congelada.

O que a Demo V2 testa: se conseguimos atingir qualidade superior **desenhando
tudo por código** — arena, cartas, HUD, efeitos, som e música —, com o jogador
contra a IA e a câmera parada do lado dele.

---

## 0. A reconstrução da composição

A primeira versão desta demo foi reprovada na **composição do campo**, e a
razão é estrutural: HUD, mesa e mão dividiam o mesmo espaço e competiam por
ele. Personagem, pilha de removidas, um slot permanente de Resposta e um
quarto pedestal fixo ocupavam lugar de carta; a mão morava **dentro** do
tabuleiro e desfazia a inclinação carta por carta, o que é truque e aparece
como truque.

A reconstrução parte de três separações que não dependem de disciplina:

| Camada | Onde vive                    | O que contém                  |
| ------ | ---------------------------- | ----------------------------- |
| arena  | tabuleiro transformado em 3D | **somente cartas**            |
| mãos   | coordenadas de tela          | as cartas que a pessoa segura |
| HUD    | coordenadas de tela          | informação e comandos         |

Cada uma recebe um retângulo de `layout/zonas.ts`, e `layout/zonas.test.ts`
percorre os seis viewports alvo conferindo onze pares proibidos. **Se dois se
cruzarem, o build falha.** A separação é impedida na geometria; `z-index` só
decide quem fica na frente quando duas coisas _devem_ se sobrepor, como o clone
em voo sobre a mesa.

### A planta congelada

Treze zonas permanentes por jogador, vinte e seis na arena, e nada mais:
3 Ações · 4 Passivas · 2 Cartas de Classe · 3 Cooldowns · 1 Ultimate.
`planta.test.ts` conta, e reprova qualquer zona a mais.

A metade da máquina **não é escrita**: ela é a do jogador girada 180° em torno
do centro, `(x, y) → (L − x, A − y)`. Duas listas parecidas escritas à mão
divergem — uma margem aqui, dois pixels ali —, e é exatamente isso que faz uma
composição parecer descuidada. Com a derivação, distância, margem, alinhamento,
escala e ângulo são iguais porque **são o mesmo número**, e há teste conferindo
igualdade exata.

O corredor central de 124 unidades é funcional: é por onde golpe, projétil e
magia atravessam. Nenhuma zona o cruza, e um teste mede a folga em vez de só
conferir a linha — seis pedestais encostados nela formariam um bloco único e o
corredor sumiria na prática, que foi o que a primeira prova mostrou.

### O que deixou de ter lugar permanente

- **Resposta** — a bandeja abre encostada na Ação que ela apara e fecha depois
  da resolução.
- **Quarta Ação** — o pedestal surge da lateral quando a regra a concede e some
  quando acaba. Exceção de regra não polui a arena para sempre.
- **Personagem e removidas** — eram informação ocupando lugar de carta. Foram
  para o HUD ou deixaram de existir como peça.
- **Defesa Inata** — não é carta, e não virou carta falsa.

### O movimento

Nenhuma carta teleporta. O motor resolve na hora — a regra nunca espera pela
animação —, e `animacao/apresentacao.ts` compara o estado velho com o novo para
descobrir **o que se moveu**. Cada mudança vira um movimento; a peça real some
da origem e do destino, e um clone viaja numa camada global acima da arena e da
mão.

A ponte entre os dois espaços não é calculada: ela é **medida**. Origem e
destino chegam como `DOMRect` lidos do próprio navegador, que já aplicou a
perspectiva. Recalcular a projeção por conta própria foi o que deformou a
Etapa 6; aqui a conta é do navegador e nós só perguntamos.

O voo tem peso: a curva da travessia é uma Bézier com o pico de velocidade
**antes** do meio, e o encaixe tem um quique só, amortecido. Simétrico lê como
slide de apresentação; dois quiques leem como brinquedo. A carta atravessa de
frente para quem olha e só deita nos últimos 350 ms — deitar cedo esconderia a
arte durante a viagem, que é o momento em que o jogador quer ver o que foi
jogado.

Com `prefers-reduced-motion` o voo encurta para 45 % mas **continua existindo**:
teleporte tira a informação de origem e destino.

### A mão

Fora do tabuleiro, na base da tela. Leque discreto — 9° na ponta —, com o topo
da carta encostando na borda de cima da zona e o pé transbordando pela de
baixo: é o que permite que a carta seja grande o bastante para o nome ser lido
num telefone.

O primeiro toque **inspeciona**: a carta descola do leque, sobe 62 % da própria
altura, endireita, amplia 1,42× e ganha sombra e luz. O segundo toque na mesma
carta **joga**. Não há botão solto porque não há lugar para ele — a faixa de
baixo é do HUD à esquerda e dos controles de turno à direita —, então o selo
`USAR` mora dentro da moldura da carta levantada.

Focar **não desmancha a mão**: as vizinhas cedem um fio de espaço e escurecem,
e a focada sobe por cima delas. Há teto por teste para isso.

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
