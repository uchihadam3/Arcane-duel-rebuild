# Ambiguidades e pontos em aberto

Levantados na leitura dos documentos de design durante a montagem da fundação.
Nenhum deles foi resolvido por conta própria: onde não havia regra, nada foi
inventado.

## Material que não chegou

1. ~~**Vídeo de referência** não entregue.~~ **Resolvido.** As três gravações
   foram entregues e analisadas quadro a quadro; as conclusões estão em
   [`VIDEO_ANALYSIS.md`](VIDEO_ANALYSIS.md) e as consequências arquiteturais em
   [`ARCHITECTURE.md`](ARCHITECTURE.md). O vídeo não é redistribuído neste
   repositório: ele é gravação de um produto de terceiros e serve apenas como
   referência de qualidade, câmera, movimento e interação.
2. **Onze assets do catálogo oficial.** Faltam `board_passive_slot_purple.png`
   e os dez ícones universais. Estão listados em [`ASSETS.md`](ASSETS.md).

## Lacunas no catálogo de assets

3. **Não existe asset para os componentes de classe.** O campo tem bandeja de
   Condições (quatro espaços) e trilha de cooldown, mas Momentum, Mana, Almas,
   Chi, Brechas, a trilha de Devoção do Clérigo, os três estados do Paladino e
   a Forma do Druida não têm representação aprovada. Como o documento exige que
   efeitos importantes sejam visíveis na mesa física, isso vai precisar de
   decisão antes do vertical slice.
4. **Ficha de Marca da Presa.** Mesma situação: a Marca fica sobre o
   adversário e não há asset para ela.
5. **Área de cartas removidas.** `VIDEO_VISUAL_TARGET.md` diz que a Carta de
   Classe Exaurida sai do campo para uma área de cartas removidas, mas o
   `ASSET_CATALOG.md` não lista slot ou bandeja para essa área.
6. **Ênfase de área não tem asset.** O vídeo mostra o lado inteiro do tabuleiro
   banhado de luz enquanto um efeito resolve, e essa é a leitura mais rápida de
   "de quem é o efeito". Os três overlays aprovados cobrem carta e slot, não
   área. Fica resolvido por luz em código
   (`packages/ui/src/composicao/enfase.ts`), mas se a intenção for que isso
   também seja arte aprovada, falta o asset.
7. **Faixa de turno só existe em vermelho.** No vídeo, a cor da faixa de
   transição identifica de quem é o turno antes de qualquer texto ser lido. O
   catálogo entrega apenas `hud_turn_banner_red.png`. Ou sai uma variante
   aprovada para o lado do jogador, ou a cor é aplicada por tonalização em
   código sobre o mesmo PNG.

## Divergências entre documentos

8. **Lista de pacotes.** `FULL_GAME_SPEC.md` §30 recomenda também `/audio` e
   `/vfx`; a Etapa zero do `ROADMAP_CODEX.md` cita apenas rules-engine,
   card-data, ai, shared-types e ui. Pela regra de precedência, arquitetura é
   decidida pelo `FULL_GAME_SPEC.md`, então os sete pacotes existem.
9. **Nome do arquivo de especificação.** O arquivo foi entregue como
   `FULL_GAME_SPEC2.md`, mas todos os documentos o referenciam como
   `FULL_GAME_SPEC.md`. Ele está no repositório com o nome canônico e conteúdo
   idêntico ao entregue.
10. **Posição da Resposta.** `FULL_GAME_SPEC.md` §24 diz que a Reação entra
    "abaixo da Ação"; `VIDEO_VISUAL_TARGET.md` diz "logo abaixo ou sobreposta
    parcialmente". Continua em aberto para a etapa visual, mas o vídeo indica o
    caminho: lá, cartas ligadas a uma mesma ação ficam visivelmente encostadas,
    e o registro de âncoras já trata Ação e Resposta como zonas vizinhas.

## Pontos de regra que precisarão de decisão explícita

11. **Composição da build.** O documento fala em "quinze componentes"
    (§35), mas a lista é 8 habilidades + 4 passivas + 2 Cartas de Classe +
    1 Ultimate + 1 Personagem = 16. A leitura mais provável é que a carta de
    Personagem não conta como componente montável, já que ela é determinada pela
    classe. A fundação registra os cinco números separadamente e não força um
    total.
12. **Impulso Inicial e Lento.** O Impulso completa exatamente 1 AP quando o AP
    restante não basta (§7), e Lento aumenta o custo da ação em 1 (§15). Não
    está dito se o custo considerado pelo Impulso é o impresso ou o já
    aumentado por Lento. Precisa de decisão antes das regras universais.
13. ~~**Ruptura e redução voluntária.**~~ **Resolvido.** A regra canônica é:
    reduzir a própria Guarda como custo **não** provoca Ruptura; mas se depois
    um Ataque inimigo levar a Guarda restante de acima de zero para zero, esse
    Ataque provoca Ruptura normalmente. O que não provoca Ruptura é a redução
    voluntária em si, não a Guarda baixa que ela deixa. Implementado em
    `packages/rules-engine/src/combate.ts` e coberto por teste.
14. **Título provisório.** "Arcane Duel" é explicitamente provisório (§1) e não
    deve ser tratado como nome comercial até a etapa de identidade da marca.

## Levantados na Etapa 1 (tipos do estado da partida)

15. **Paladino: Convicção não existe.** O briefing da etapa pedia "Paladino —
    Convicção", mas o `FULL_GAME_SPEC.md` §16 diz literalmente "Não possui
    moeda de Convicção" e define três estados: Vacilante, Resoluto e
    Inabalável, começando Resoluto. Seguimos o documento, que tem precedência
    para regras, e modelamos `juramento` em vez de uma moeda. Se a intenção era
    mesmo criar uma moeda de Convicção, o `FULL_GAME_SPEC.md` precisa mudar
    antes do código.
16. **Quem começa a partida não está definido.** Não há regra de sorteio, de
    escolha nem de alternância. `criarPartida` não decide: a ordem da tupla de
    jogadores registra quem é primeiro e quem é segundo, e a Reserva inicial e
    o marcador de Impulso do segundo jogador entram por configuração.
17. **Desempate e morte simultânea.** O documento não diz o que acontece quando
    os dois chegam a zero de Vida na mesma resolução. `DesfechoDaPartida` aceita
    `vencedor: null` com motivo `indefinido`, então a estrutura representa o
    caso sem inventar o resultado.
18. **Prioridade entre gatilhos simultâneos.** Várias Passivas e Cartas de
    Classe podem ter a condição satisfeita ao mesmo tempo, e o documento não
    define a ordem de resolução. Nada foi decidido nesta etapa; a ordem vai
    precisar de regra na etapa dois.
19. **Visibilidade do cooldown.** O documento diz que a zona física representa
    o cooldown (§11), mas não diz explicitamente se o adversário enxerga o que
    está lá. Projetamos o cooldown como informação **pública**, porque a carta
    foi jogada publicamente antes de chegar lá e porque a zona é física e está
    à vista. Se a intenção for esconder, é uma linha na projeção — mas é uma
    mudança de regra e precisa vir do documento.
20. **Composição: dezesseis componentes, não quinze.** Já registrado no item
    11; a Etapa 1 confirma na prática. A validação estrutural cobra 8
    habilidades, 4 Passivas, 2 Cartas de Classe e 1 Ultimate, e trata o
    Personagem à parte, como determinado pela classe.
21. **Runas do Mago.** §16 diz que "Runas modificam feitiços, defesa, cooldown
    e sequência", mas no `CARD_CATALOG.md` as Runas aparecem como Cartas de
    Classe (Runa de Cinzas, Runa do Conduíte). Modelamos o Mago apenas com
    Mana; as Runas ficam cobertas pelas Cartas de Classe. Se elas forem um
    componente separado, falta descrevê-lo.

## Levantados na Etapa 2 (regras universais do combate)

22. **Lento com Impulso Inicial: recusado de propósito.** O §7 diz que o
    Impulso completa um ponto quando "os pontos de Ação restantes não forem
    suficientes para pagar a habilidade desejada". O §15 diz que Lento faz a
    Ação custar um ponto a mais. Não está dito se o custo que o Impulso
    completa é o **impresso** ou o **já aumentado por Lento**, e as duas
    leituras dão respostas diferentes no mesmo caso.

    O motor **recusa** essa jogada com o erro `interacao-nao-definida`, detalhe
    `lento-com-impulso-inicial`, em vez de escolher em silêncio. Quando nenhuma
    das duas leituras permitiria o Impulso, não há ambiguidade e o erro volta a
    ser o normal de AP insuficiente. Há teste documentando o comportamento.
    Para resolver, o `FULL_GAME_SPEC.md` precisa dizer qual custo vale.

23. **Quando a Carta de Classe Ativada volta a ficar Pronta.** O §13 diz que
    ela "volta a ficar Pronta no momento normal", sem definir o momento. O §12
    define esse momento para Passivas — "normalmente no início do turno do
    dono". O motor aplica o mesmo momento às Cartas de Classe, por
    consistência, mas isso é inferência e não texto.
24. **Condição de vitória por Vida.** O documento nunca diz explicitamente que
    chegar a zero de Vida derrota o jogador; isso aparece só de forma indireta.
    O motor encerra a partida quando **um** jogador chega a zero ou menos,
    dando a vitória ao outro. Quando **os dois** chegam na mesma resolução, ele
    encerra com `vencedor: null` e motivo `indefinido`, deixando a decisão
    pendente em vez de inventada. O item 17 continua aberto.
25. **Quando a carta de Reação entra no cooldown.** **Qual** cooldown não é
    ambíguo: o §11 diz que a habilidade usada entra na zona impressa **nela**,
    então a Reação usa o cooldown da própria Reação, nunca o da Ação a que
    respondeu. O que o documento não escreve é o **instante** em que ela entra.
    O motor a envia quando a Ação a que ela respondeu resolve, junto com a
    carta do atacante.
26. **Ordem entre Queimadura e conversão de Reserva.** O §15 diz que a
    Queimadura tica no final do turno e o §6 diz que os pontos sobrando viram
    Reserva no final do turno. As duas não interagem hoje, então a ordem é
    irrelevante; o motor tica a Queimadura primeiro. Se algum texto futuro
    ligar Vida perdida a pontos de Ação, a ordem passa a importar e precisará
    de regra.
27. **Ordem entre etapas do início de turno.** O documento fixa que Murchar é
    aplicado depois da recuperação da Guarda (§15) e que o cooldown avança no
    início do turno do dono (§11). A ordem relativa entre o avanço de cooldown
    e as demais etapas não é definida; elas não interagem hoje.
28. **Efeito numérico da Resposta.** O motor registra a Resposta voluntária e
    cobra o custo dela, mas a redução de Dano e de Impacto é texto de carta.
    Ela entra pelos modificadores da Ação, e os valores chegam com as cartas
    reais nas etapas seguintes.
