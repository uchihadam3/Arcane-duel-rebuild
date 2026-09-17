# Análise do vídeo de referência

## Do que se trata

Três gravações de tela, em landscape, de um jogo de cartas digital comercial
rodando em console: 1560×720, entre 22 s e 24 s cada, capturadas com o overlay
de transmissão do console por cima.

Este documento registra **o que aprender do vídeo**, não o que copiar. A arte,
as molduras, o cenário, a tipografia, os ícones e o layout específico daquele
jogo são propriedade de terceiros e não entram no Arcane Duel de forma alguma.
O que se aproveita é a gramática: enquadramento, profundidade, ritmo, feedback,
hierarquia de leitura e a sensação de produto acabado.

O `VIDEO_VISUAL_TARGET.md` continua valendo. Onde o vídeo confirmou o
documento, este arquivo diz "confirmado"; onde o vídeo mostrou algo que o
documento não cobria, diz "novo".

---

## 1. Enquadramento, perspectiva e profundidade

**Confirmado.** O tabuleiro é uma cena tridimensional que ocupa praticamente
toda a área útil, vista de cima em perspectiva oblíqua. O lado do jogador fica
embaixo e o do adversário em cima, com a metade adversária visivelmente menor
por estar mais longe da câmera.

**Novo, e importante:** a perspectiva é **fixa**. Em 24 segundos de jogo a
câmera não orbita, não faz dolly e não muda de ângulo. Toda a sensação de
profundidade vem da geometria do cenário e da iluminação, não de movimento de
câmera. Isso é uma vantagem competitiva, não uma limitação: o jogador decora a
posição de cada zona e nunca precisa reencontrá-la.

O cenário tem relevo real — degraus, água corrente na borda frontal, vegetação,
pilastras nos cantos — mas **nada disso invade as zonas de jogo**. O ornamento
fica nas margens; o miolo do tabuleiro é liso e legível.

> Para o Arcane Duel: câmera fixa em perspectiva, definida uma vez. O
> `arena_board_clean_vertical.png` já é exatamente isso — cenário sem HUD e sem
> slots desenhados. O ornamento da arena nunca pode disputar atenção com os
> três espaços de Ação.

---

## 2. Zonas incorporadas ao campo

**Confirmado, e mais forte do que o documento sugeria.** As zonas não são
retângulos desenhados por cima do cenário: são lajes de pedra embutidas no
chão, com a mesma iluminação e o mesmo desgaste do resto da arena. Uma zona
vazia continua sendo um objeto do mundo, não um buraco na interface.

Cada lado do campo repete a mesma estrutura, espelhada.

> Para o Arcane Duel: os slots aprovados (`board_action_slot`,
> `board_response_slot`, `board_class_slot_purple`, `board_passive_slot_purple`,
> `board_ultimate_slot`) devem ser compostos **sobre** a arena parecendo parte
> dela, com sombra de contato, e não flutuando acima dela.

---

## 3. Mão de cartas

**Confirmado com ressalva.** A mão fica na borda inferior, com as cartas lado a
lado e levemente sobrepostas, cortadas pela borda da tela — o jogador vê a
metade de cima de cada carta. Elas acompanham a inclinação do tabuleiro, então
a mão parece apoiada na mesa, não colada no vidro.

**Novo:** o leque é **discreto**. As cartas não formam um arco exagerado; o
ângulo entre vizinhas é pequeno. Isso mantém nome e custo alinhados e legíveis
em tela pequena.

A carta em foco sobe, cresce em relação às vizinhas e se separa do grupo. As
outras não se afastam para abrir espaço — só a carta em foco se move. É uma
animação barata e muito legível.

> Para o Arcane Duel: oito cartas na mão, mais do que as cinco a seis do vídeo.
> Com 1560×720, oito cartas exigem sobreposição maior; a área que precisa
> permanecer visível em toda carta não escondida é o topo — nome, custo e tipo.
> O leque deve ser sutil pelo mesmo motivo.

---

## 4. Inspeção de carta

**Confirmado, e o vídeo resolve a dúvida do documento.** A inspeção não é um
modal. É um **painel fixo na coluna esquerda**, aberto enquanto a carta está em
foco, mostrando arte grande, nome, o tipo em uma tarja colorida, os valores
numéricos e o texto completo de regras em área rolável.

O painel cobre a lateral esquerda do campo, mas **as zonas centrais de combate
continuam inteiramente visíveis**. Durante uma sequência de ataque de três
segundos o painel permanece aberto e não atrapalha em nada.

> Para o Arcane Duel: reservar uma coluna lateral no layout landscape para a
> inspeção, e garantir que os três espaços de Ação e as Respostas **nunca**
> fiquem sob ela. Isso é uma restrição de layout, não de decoração.

---

## 5. Texto e números sobre o campo

**Novo, e confirma uma regra que já era nossa.** Valores de combate aparecem
como texto flutuante logo acima da carta no campo, em branco, com o valor
secundário em cinza. Contadores de baralho aparecem em fichas circulares nas
laterais. Vida fica em placas nos cantos. **Nada disso está desenhado na arte.**

Os contadores mudam **no instante em que o estado muda**, sem esperar a
animação terminar: durante a apresentação de uma carta o contador do baralho já
cai de 479 para 478 enquanto a carta ainda está grande no centro.

> Para o Arcane Duel: é exatamente a separação que o projeto já exige — moldura
> é asset, valor é código. E confirma a regra de que a lógica não espera a
> animação: o estado canônico avança, a apresentação o alcança.

---

## 6. Ênfase e seleção

O vídeo usa **três escalas de destaque**, e só uma delas está coberta pelos
overlays aprovados:

1. **Carta** — a carta em foco sobe e ganha brilho de contorno.
2. **Slot** — a zona válida recebe um contorno grosso amarelo-esverdeado, bem
   saturado, que se lê à distância mesmo em zona vazia.
3. **Lado inteiro do campo** — quando um efeito do adversário está resolvendo,
   **toda a metade dele fica banhada numa luz colorida**, sustentada durante a
   ação inteira.

A terceira é a descoberta do vídeo. Ela responde sozinha "de quem é o efeito
que está acontecendo agora", antes de o jogador ler qualquer texto.

> Para o Arcane Duel: `overlay_selectable_blue`, `overlay_selected_gold` e
> `overlay_valid_target_green` cobrem carta e slot. **Não existe asset para a
> ênfase de lado/área** — ela é luz em código, não uma imagem esticada. Está
> registrado como contrato em `packages/ui/src/composicao/enfase.ts` e como
> lacuna em `AMBIGUIDADES.md`.

---

## 7. Transições de turno e de fase

**Confirmado, com números medidos.** A troca de turno é uma faixa horizontal
que varre a largura da tela na altura do meio, semitransparente, com texto em
caixa alta e itálico, e uma borda luminosa na frente da varredura.

Medições feitas quadro a quadro, a 10 fps:

| Momento                                      | Duração medida                     |
| -------------------------------------------- | ---------------------------------- |
| Faixa de troca de turno                      | ~1,3 s                             |
| Faixa de fase                                | ~0,9 s a 1,0 s                     |
| Apresentação de carta em tamanho grande      | ~1,0 s por carta                   |
| Ataque completo (viagem do efeito + impacto) | ~3,2 s, dos quais ~2,6 s de viagem |

Três coisas importam mais que os números:

- **A faixa nunca esconde o campo.** Ela é translúcida e ocupa só uma tira
  horizontal; o tabuleiro continua legível atrás.
- **A cor identifica o dono.** Azul quando o turno passa para o jogador,
  vermelho quando passa para o adversário. Sem ler o texto já se sabe.
- **As faixas encadeiam.** Troca de turno, depois fase, com um respiro curto
  entre elas. Nunca duas ao mesmo tempo.

> Para o Arcane Duel: `hud_turn_banner_red.png` é exatamente essa peça. Ela
> precisa de variante por dono — o asset entregue é vermelho, então a versão do
> jogador tem que sair de tonalização em código ou de um segundo asset
> aprovado.

---

## 8. Resposta visual de uma ação

**Novo, e é a lição mais valiosa do vídeo.** Um ataque não é um corte seco. Ele
tem três tempos claros:

1. **Telegrafia** — o efeito nasce na carta atacante e **viaja fisicamente pelo
   campo** até o alvo, por cerca de 2,6 s. É tempo suficiente para o olho
   acompanhar o trajeto e entender quem está batendo em quem.
2. **Impacto** — estouro curto e brilhante exatamente sobre o alvo.
3. **Consequência** — o número do dano aparece no ponto do impacto, em dígitos
   grandes, e a Vida do alvo cai.

O dano é dito **duas vezes**: no ponto do impacto e na placa de Vida. A
redundância é deliberada — o jogador olha para a ação, não para o HUD.

> Para o Arcane Duel: é o molde de Dano, Impacto e Ruptura. O número de Dano e
> o de Impacto precisam aparecer no ponto do impacto, além das barras. E a
> Ruptura, por ser o momento que o documento manda ter peso próprio, é onde o
> orçamento de ~3,2 s se justifica. Uma Ação comum tem que ser mais curta.

Consequência arquitetural direta: um efeito que viaja precisa saber **onde**
estão a origem e o destino. Isso virou o registro de âncoras de campo.

---

## 9. Apresentação de carta

**Novo.** Quando uma carta importante entra em jogo, ela sai da zona de origem
com um portal escuro se abrindo, cresce até o centro do campo em tamanho de
leitura confortável, fica cerca de 1 s com um halo de luz atrás, e então
encolhe e assenta no seu lugar.

O campo em volta continua visível durante a apresentação inteira. A carta
grande não é um modal: é um objeto do campo que se aproximou da câmera.

> Para o Arcane Duel: é o tratamento natural para Ultimate, para revelação de
> Passiva e para Exaustão de Carta de Classe. E reforça que a moldura precisa
> ser legível tanto em miniatura na mão quanto ampliada no centro — a mesma
> textura serve aos dois, desde que a resolução aguente.

---

## 10. HUD

**Novo quanto à ancoragem.** As placas de Vida e os retratos ficam **presos aos
cantos da tela**, não ao tabuleiro. Enquanto o campo é uma cena com
perspectiva, o HUD é uma camada plana por cima. Jogador embaixo à esquerda,
adversário em cima à direita — diagonal, e não espelhado verticalmente.

Há também um **disco de estado** na borda direita, sempre visível, dizendo o
turno e a fase atuais, e que vira botão de ação quando há algo a confirmar.
Estado e ação no mesmo lugar, ao alcance do polegar.

> Para o Arcane Duel: `hud_portrait_frame_primary_red`, `hud_nameplate_red` e as
> barras de Vida, Guarda e Reserva são camada de tela, não de campo. O disco de
> estado é um bom lugar para AP restante, Ações usadas no turno e o botão de
> passar o turno — tudo no mesmo canto, sem atravessar o campo.

---

## 11. Ritmo e legibilidade

O ritmo é **denso, não apressado**. Sempre há algo acontecendo, mas cada beat
termina antes do próximo começar e nenhum deles se repete duas vezes seguidas.
As ações do jogador são instantâneas; a espera existe só quando o adversário
age, e aí ela é informativa.

Em 1560×720 tudo permanece legível porque a hierarquia é rígida: valores de
combate em branco puro sobre fundo escuro, contorno de seleção muito saturado,
texto de regras só no painel lateral e nunca sobre o campo.

> Para o Arcane Duel: a batalha cabe em uma tela sem rolagem, e nossa mão tem
> oito cartas contra cinco a seis do vídeo, mais três Ações com Resposta
> embaixo, quatro Passivas, duas Cartas de Classe, Ultimate, trilha de cooldown
> e bandeja de Condições. **É mais denso que a referência.** A conclusão prática
> é que precisamos ser mais econômicos que ela em ornamento, não mais generosos.

---

## 12. Sensação de produto premium

Vem de coisas baratas, e nenhuma delas é arte cara:

- a câmera nunca se mexe, então o jogador nunca se perde;
- todo evento tem um beat próprio, com começo, meio e fim;
- nenhuma informação competitiva depende de cor sozinha — há posição, tamanho e
  texto junto;
- o cenário é rico nas bordas e calmo no centro;
- o som chega junto do quadro do impacto, não depois.

---

## O que **não** copiar

- A arte, o cenário, as molduras, os ícones e a tipografia do jogo do vídeo.
- O layout específico dele: o Arcane Duel tem três Ações centrais com Resposta
  logo abaixo, quatro Passivas, duas Cartas de Classe, Ultimate, cooldown em
  trilha e bandeja de Condições. A organização espacial é nossa.
- As regras dele. Nada no vídeo altera uma linha do `FULL_GAME_SPEC.md`.

---

## Consequências para a arquitetura

Três, todas já aplicadas nesta revisão. Detalhe em `ARCHITECTURE.md`.

1. **Âncoras de campo** (`packages/ui/src/composicao/ancoras.ts`) — efeitos que
   viajam e cartas que se movem precisam perguntar onde uma zona está. O ponto
   é normalizado, então o mesmo registro serve para o campo em DOM de hoje e
   para o campo tridimensional de depois.
2. **Escopo de ênfase** (`packages/ui/src/composicao/enfase.ts`) — destaque não
   é só overlay em carta; existe destaque de slot, de grupo, de lado e de campo
   inteiro. Os três overlays aprovados cobrem carta e slot; área é luz em
   código.
3. **Orçamento de apresentação** (`packages/vfx/src/index.ts`) — teto de 1,2 s
   por momento e 3,2 s por sequência, medidos no vídeo, para que nenhum efeito
   futuro atrapalhe o ritmo competitivo.

O que o vídeo **não** mudou: a separação entre regra e apresentação, a câmera
fixa, a decisão de manter React + Vite com caminho aberto para Three.js, e o
fato de a lógica da partida nunca depender da velocidade da animação — o vídeo
confirmou essa última de forma explícita, com contadores mudando antes de a
animação acabar.
