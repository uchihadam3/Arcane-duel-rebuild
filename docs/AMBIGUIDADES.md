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

## Levantados na Etapa 3 (Guerreiro e Mago completos)

29. **Runa Ativada e o momento em que ela volta a ficar Pronta.** O §13 diz que
    uma Carta de Classe Ativada volta a ficar Pronta "no momento normal", e o
    motor aplica o início do turno do dono (item 23). Isso convive com o texto
    das cartas do Mago: uma Runa Ativada fica Ativada durante todo o turno
    inimigo, que é quando Barreira Prismática e Runa da Égide agem, e voltar a
    deixá-la Pronta **dentro do próprio turno** é exatamente o que Recalibrar
    Runa, Barreira Prismática e Sobrecarga Temporal compram. Não há contradição,
    mas a leitura depende do item 23 continuar valendo: se o playtest decidir
    outro momento, essas três cartas mudam de valor.
30. ~~**Ativações opcionais de Passiva são automáticas no motor.**~~
    **RESOLVIDO na revisão corretiva da Etapa 3.** O motor não Ativa mais
    Passiva nenhuma sozinho. Instinto de Ferro e Véu Prismático só agem pelo
    comando explícito de Ativação, que faz a carta passar de Pronta para Ativada
    e cobra o recurso. Ver os itens 41 e 42.
31. **Ordem entre "o Dano final se torna 0" e o bônus de Ruptura.** Imagem
    Espelhada, Runa da Égide Exaurida e Última Palavra fixam o Dano final em
    zero; a Ruptura soma Dano ao mesmo Ataque (§9). O motor aplica o valor
    fixado **por último**, porque as cartas que perguntam "se o Dano final for
    0" só fazem sentido se o valor fixado for o valor aplicado à Vida. Isso é
    leitura do texto, não invenção, mas está registrado porque a ordem inversa
    seria defensável para quem lesse a Ruptura como parte do próprio Ataque.
32. **A quarta Ação da Runa Prismática.** O §8 fixa três Ações por turno; a Runa
    Prismática Exaurida abre uma quarta. O estado representa isso com um quarto
    espaço que nasce `indisponivel` e um limite de Ações por turno que a carta
    levanta de três para quatro. O documento não diz o que acontece se duas
    cartas futuras abrirem Ações extras no mesmo turno.
33. ~~**"Reduza 1 D ou 1 I" sem interface para escolher.**~~
    **RESOLVIDO na revisão corretiva da Etapa 3.** Guarda Marcial, Guarda de
    Veterano e Runa da Égide Ativada passaram a exigir a escolha no comando, com
    erro tipado quando ela falta. O motor não tem mais regra de desempate
    própria para esses casos.
34. **Contrafeitiço e o que é "o texto" de uma Técnica.** A carta cancela "o
    texto" da Técnica e mantém custo e espaço de Ação. O motor cancela os
    ganchos da **carta declarada**, e só dela: Passivas reveladas e Cartas de
    Classe usadas naquela Ação continuam valendo, porque o texto delas não é o
    texto da Técnica. O documento não trata o caso explicitamente.
35. **Runa do Eco Exaurida e o "+1 AP se for utilizado novamente neste turno".**
    O acréscimo vale para a carta devolvida, dentro do turno em que ela voltou.
    O documento não diz o que acontece se a mesma carta for devolvida duas vezes
    no mesmo turno; o motor não acumula o acréscimo.
36. **Ordem entre efeitos simultâneos de fontes diferentes.** Quando a carta
    declarada, uma Carta de Classe e uma Passiva agem na mesma janela, o motor
    percorre sempre a mesma ordem — carta declarada, Cartas de Classe na ordem
    de uso, carta de Reação, Passivas do atacante e depois do defensor. A ordem
    é fixa para que o replay reproduza, mas o documento não define prioridade de
    gatilhos simultâneos (item 20 continua aberto).

## Levantados na revisão corretiva da Etapa 3

37. **Cartas de Personagem não existem no documento.** O `CARD_CATALOG.md` não
    traz custo, valores, cooldown nem texto de Personagem para classe nenhuma,
    mas o estado da partida exige um (§3, §4). O catálogo jogável ficou com 39
    cartas por classe e nenhuma de Personagem; a identidade técnica do
    Personagem vive no descritor da classe, como identificador e nada mais. Se o
    documento trouxer essas cartas depois, elas entram no catálogo e o descritor
    passa a apontar para elas — nenhum dado foi inventado no lugar delas.
38. **Escolhas que disparam fora da janela de quem escolhe.** Concentração sob
    Pressão manda o **defensor** escolher uma carta de cooldown no meio da Ação
    do adversário, quando ele não tem comando nenhum para dar. O motor não
    escolhe por ele: a escolha fica pendente no estado, trava o dono de declarar
    e de responder, e ele a resolve com um comando próprio. O documento não
    descreve esse protocolo — ele é consequência da regra de que o motor não
    decide pelo jogador.
39. **Escolha pendente respondida depois de a carta sair do cooldown.** Se o
    dono só responde a pendência no turno seguinte, o avanço de cooldown já pode
    ter devolvido a carta à mão sozinho. A decisão dele continua valendo e a
    pendência se encerra; o que não existe mais é o movimento. O documento não
    trata o caso.
40. **"Reduza 1 D ou 1 I" da Guarda Marcial é escolha, não padrão.** O texto da
    Defesa Inata do Guerreiro oferece um "ou", e o motor passou a exigir a
    decisão em vez de escolher o Dano por omissão. A Barreira Arcana do Mago
    reduz 1 D **e** 1 I, então não pergunta nada — a assimetria é do documento.
41. **Momento em que "um Ataque causaria Ruptura" se torna verdade.** Instinto
    de Ferro e Véu Prismático se revelam "quando um Ataque causaria Ruptura". O
    motor passou a avaliar isso já na declaração da Ação, e não só na resolução:
    é nesse instante que a ameaça existe, e é antes dela resolver que o defensor
    precisa poder decidir se Ativa a Passiva. O documento não fixa o instante.
42. **"Uma vez por turno inimigo" das Passivas Ativáveis é o próprio estado.**
    Instinto de Ferro e Véu Prismático passam de Pronta para Ativada quando o
    jogador as Ativa, e só voltam a Pronta no início do turno do dono (§12).
    Esse ciclo já é o limite de uma vez por turno inimigo, então não existe
    contador paralelo. Passiva continua sem estado Exaurida.
43. **Desfecho avaliado depois dos efeitos posteriores.** Ripostar e Última
    Palavra tiram Vida "depois da resolução". A verificação de fim de partida
    saiu de dentro da resolução universal e passou a acontecer uma única vez, no
    fim de tudo que pertence àquela Ação. A regra continua sendo uma só, a do
    motor; o que mudou foi o momento. Morte simultânea segue encerrando com
    vencedor `null` e motivo `indefinido` (itens 17 e 24), e com o catálogo
    atual nenhuma Ação consegue produzi-la: as duas cartas que tiram Vida depois
    só disparam quando o Dano final foi zero, ou seja, quando o defensor
    sobreviveu.
44. **"Uma vez em cada rodada" virou uma vez em cada turno.** Sete Passivas de
    cinco classes — Virtuose, Canção Inesquecível, Voto Cumprido, Passos
    Invisíveis, Mestre das Armadilhas, Pacto Profundo e Maldição Persistente —
    limitam o efeito a "a primeira vez em cada rodada". O documento não define
    rodada em lugar nenhum: o estado tem número de turno e jogador ativo, e
    nada que marque onde uma rodada começa ou termina. O motor lê a frase como
    "uma vez em cada turno", que é o limite que o estado sabe representar, e o
    faz de forma idêntica nas sete. Se o documento definir rodada depois, muda
    uma função só (`consumirLimitePorTurno`) e as sete acompanham.
45. **Ordem entre o texto da carta e os preços que a acompanham.** Três coisas
    podem tirar Vida do Bruxo no mesmo instante de declaração: o Preço Proibido
    (mecânica de classe), o texto da própria carta ("pode perder 1 Vida para
    receber +2 D") e um Pacto ou Passiva ("perca 3 Vida e o Ataque recebe
    +4 D"). Cartas como a Seta Sombria perguntam "já perdeu Vida por efeito
    próprio neste turno?", e a resposta depende de qual desses saiu primeiro. O
    documento não fixa a ordem. O motor fixa uma só, e a mesma para todas as
    classes: o preço da **mecânica de classe** sai junto do custo, antes de
    qualquer texto; depois o texto da carta declarada; depois as Cartas de
    Classe; depois as Passivas. Na prática, a Seta Sombria enxerga o Preço
    Proibido e **não** enxerga o preço do Pacto de Sangue Exaurido, e há teste
    fixando os dois lados.
46. **A Vida não fica negativa.** Um Ataque de 6 D contra 1 de Vida deixava o
    estado com −5. O documento fala em "a Vida chega a zero" e a validação do
    próprio motor já tratava Vida negativa como estado inválido, mas as quatro
    portas de perda — resolução de combate, tique de Condição, perda direta e
    preço pago — não paravam em zero. Agora param, nas quatro. O Dano relatado
    continua sendo o número cheio: quem causou 6 causou 6, e é isso que os
    gatilhos leem; o que para em zero é a Vida no estado.
47. **A Defesa Inata não é carta e não carrega escolha de carta.** Ao responder
    com a Defesa Inata, o motor conferia as escolhas obrigatórias contra o
    perfil da **Ação inimiga** — e portanto cobrava do defensor uma decisão que
    pertencia ao atacante ("colha até 2 Almas", do Necromante). A conferência da
    Defesa Inata passou a olhar só o que é de quem se defende: as Cartas de
    Classe que ele usou na Resposta e as Passivas reveladas dele. O documento
    não descreve esse protocolo — ele é consequência de a Defesa Inata não ser
    carta (§8).
48. **"Colha até N Almas" é escolha, e a linha de base colhe o máximo.** Onde o
    texto diz "até", quem joga escolhe quanto, e o motor exige a escolha em vez
    de completar a frase. A política do simulador precisa escolher alguma coisa:
    ela colhe o máximo que o Cemitério permite, porque colher Alma não tem
    contrapartida impressa. Isso é decisão **da política**, registrada aqui para
    não ser confundida com regra: o motor continua sem escolher no lugar de
    ninguém.
49. **Canção da Marcha Exaurida é inalcançável com três Ações.** O texto pede "a
    terceira Ação depois de ter produzido 2 Cadências", e a segunda Cadência só
    nasce da própria terceira Ação: com três Ações por turno, a condição nunca
    se satisfaz. O motor não a relaxa nem inventa uma quarta Ação — ele recusa
    com `condicao-de-uso-nao-satisfeita`, e há teste fixando a recusa. Se o
    documento quis dizer "depois de 1 Cadência", é mudança de texto da carta, e
    mudança de texto é decisão humana.
50. **Boca do Abismo: "restaure 1 Vida **ou** deixe Pronta sua Maldição".** A
    escolha só importa se o Ataque causar Ruptura, mas a decisão precisa chegar
    junto do comando — depois da resolução não há janela de comando para o
    atacante. O motor exige a escolha na declaração sempre que existir Maldição
    Ativada para prontificar, e dispensa a exigência quando não existe, porque
    aí a metade da Vida é a única metade jogável. Campo próprio e fechado
    (`escolhaDoAbismo: 'vida' | 'maldicao'`), para que o motor não escolha.
51. **"Remova 1 Condição negativa" é sempre do próprio Clérigo.** Prece de
    Purificação e as outras cartas com essa frase não dizem de quem. Como
    remover Condição negativa do adversário seria um presente, e o resto da
    carta cuida de quem a joga ("se não houver nenhuma, restaure 2 Vida"), o
    motor lê a frase como auto-alvo e exige a escolha entre as Condições
    negativas **do próprio jogador**. Se o documento quis dizer o adversário, é
    outra carta.
52. **Preparar Emboscada tem zona própria, no componente de classe do
    Patrulheiro.** O texto manda "coloque 1 Ataque da mão face-down no terceiro
    espaço de Ação", reservado para o próximo turno. Não havia, no estado, zona
    de carta face-down fora da mão. Ela existe agora, e não como zona nova e
    genérica: é um campo do componente de classe do Patrulheiro
    (`RecursoDoPatrulheiro.emboscada`), único e anulável, com dois estados —
    `preparada` no turno em que a carta foi posta ali, `armada` no próprio turno
    seguinte. O ciclo é de estado e não de contagem de turnos: `preparada` vira
    `armada` quando o dono abre o próprio turno, e a reserva termina quando ele o
    fecha.

    Com isso as cinco exigências do texto estão implementadas, e nenhuma fica em
    aberto:

    - **"1 Ataque da mão"**: o tipo vem do catálogo, e a zona é a mão de agora.
      Técnica, Reação, carta inexistente ou carta fora da mão são recusadas com
      erro tipado, sem mutação e sem custo pago.
    - **"coloque face-down"**: a carta **sai da mão** e passa a viver na reserva.
      A contagem da mão cai, e a identidade não atravessa a projeção.
    - **"no próximo turno"**: a reserva só vale na janela — no turno em que foi
      preparada a carta não pode ser declarada, e no turno seguinte ela pode.
    - **"reservado para ser a terceira Ação"**: o terceiro espaço é dele nos dois
      sentidos. A carta reservada não sai como primeira nem como segunda Ação, e
      nenhuma outra carta ocupa o terceiro espaço enquanto a reserva estiver
      armada.
    - **"custa 1 AP a menos, mínimo 1" / "volta à mão"**: o desconto é o mais
      estreito do catálogo — só a carta reservada, só armada, só na terceira
      Ação —, respeita o mínimo de 1 AP, e a carta não usada volta à mão no fecho
      daquele turno, sem cooldown e sem desconto guardado.

    Não há reserva eterna: ela não sobrevive ao turno em que ficou armada. Não há
    duas Emboscadas ao mesmo tempo: o campo é único, e R13 é recusada enquanto
    uma reserva estiver de pé.

    A privacidade continua fechada: o texto diz **face-down**, então a escolha
    `cartaDaMao` não atravessa a projeção para o adversário nem para o espectador
    (item 53). O que o adversário vê é que **existe** uma carta reservada — ele
    precisa ver, porque isso compromete o terceiro espaço —, e a identidade vem
    como `{ visivel: false }`.

53. **Escolhas e anotações têm visibilidade, porque nem toda informação do
    estado é pública.** O estado canônico precisa saber o que Preparar Emboscada
    reservou; o adversário não pode. Até aqui a projeção copiava os espaços de
    Ação e as anotações praticamente inteiros, e o identificador vazava por dois
    caminhos ao mesmo tempo — `escolhas.cartaDaMao` e a chave
    `ataque-emboscado:<carta>`. O documento não descreve esse protocolo: ele é
    consequência de §20 e §32 ("o cliente nunca recebe o estado canônico") e do
    "face-down" impresso na carta. O motor passou a distinguir, por tipo, a
    origem de cada escolha (`ORIGEM_DAS_ESCOLHAS`) e a visibilidade de cada
    anotação (`publica` ou `privada-do-dono`), e a visão ganhou tipos próprios
    para os espaços de Ação em vez de reaproveitar os canônicos.

    A chave `ataque-emboscado:<carta>` não existe mais: quando a reserva virou
    zona do componente de classe (item 52), o caminho da anotação deixou de ser
    necessário e foi removido em vez de continuar filtrado. O protocolo de
    visibilidade continua valendo — a escolha `cartaDaMao` ainda é de
    `zona-secreta`, a Passiva oculta ainda é `passiva-propria`, e a reserva
    projetada mostra o estado sem a identidade.
