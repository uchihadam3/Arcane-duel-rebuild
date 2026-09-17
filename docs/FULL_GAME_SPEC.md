# FULL GAME SPEC

## Título provisório

Arcane Duel.

O título é provisório. Nenhum nome comercial deve ser tratado como definitivo até a etapa de identidade da marca.

## Função deste arquivo

Este arquivo é a fonte de verdade do projeto. O código, a interface, a IA, o backend, o banco de dados, o sistema de cartas e os testes automatizados devem obedecer este documento. Quando uma regra mudar, este arquivo deve ser atualizado antes ou no mesmo commit da mudança.

O jogo precisa funcionar de duas maneiras com as mesmas regras:

- como jogo digital online;
- como jogo físico imprimível.

Nenhuma regra central pode depender de cálculo oculto que só um computador consiga acompanhar.

---

# 1. VISÃO DO JOGO

Arcane Duel é um jogo de duelo entre duas classes de RPG transformadas em um jogo de cartas competitivo. Cada jogador escolhe uma classe, monta uma build antes da batalha e entra em combate com todas as suas habilidades escolhidas disponíveis desde o começo.

Não existe deck embaralhado durante a batalha. Não existe compra aleatória de cartas. Não existe dano aleatório. Não existe chance de crítico. Não existe chance de esquiva. O resultado precisa nascer de construção de build, conhecimento de matchup, gerenciamento de cooldown, leitura do adversário e decisões de turno.

A sensação pretendida é a de um combate de RPG em que a ficha do personagem virou cartas.

Princípios obrigatórios:

- baixa aleatoriedade durante o combate;
- fácil de aprender;
- difícil de dominar;
- toda derrota deve ter decisões que o jogador consiga rever;
- classes precisam jogar de formas diferentes;
- o mesmo campo deve suportar todas as classes;
- cartas precisam fazer sentido dentro da fantasia da habilidade;
- uma Bola de Fogo nunca vira bloqueio apenas por conveniência mecânica;
- efeitos importantes precisam ser visíveis na mesa física;
- a versão digital não pode esconder regras que não seriam possíveis fisicamente.

---

# 2. CONTEÚDO INICIAL

O lançamento inicial terá doze classes:

- Guerreiro;
- Mago;
- Clérigo;
- Necromante;
- Paladino;
- Ladino;
- Bardo;
- Monge;
- Patrulheiro;
- Bárbaro;
- Druida;
- Bruxo.

Cada classe possui no catálogo inicial:

- vinte habilidades de combate;
- dez passivas;
- seis Cartas de Classe;
- três Ultimates.

Para uma batalha, o jogador equipa:

- oito habilidades de combate;
- quatro passivas;
- duas Cartas de Classe;
- uma Ultimate;
- uma carta de Personagem da classe.

Todas as cartas das doze classes ficam liberadas para todos os jogadores desde a criação da conta.

Não existe pacote aleatório, booster, gacha ou desbloqueio de poder.

---

# 3. BARALHO, BUILD E RECEITAS

No produto, o conjunto equipado pode ser chamado de Baralho para o jogador, mesmo que mecanicamente não exista compra de cartas durante o combate.

Uma build completa contém oito habilidades, quatro passivas, duas Cartas de Classe e uma Ultimate.

O jogador pode montar qualquer combinação legal manualmente desde o primeiro dia.

Cada classe terá oito Receitas de Build oficiais.

As Receitas são apenas atalhos de montagem. Elas não bloqueiam cartas.

Se o jogador souber quais cartas formam uma Receita bloqueada, pode montar manualmente aquela combinação e jogar normalmente.

Cada classe começa com uma Receita oficial desbloqueada e sete bloqueadas.

A progressão de Receitas acontece no modo Desafio de IA.

Para desbloquear a próxima Receita de uma classe, o jogador precisa usar a Receita oficial atualmente ativa na sequência de desbloqueio daquela classe e derrotar o décimo adversário de uma campanha de IA.

A Receita seguinte é liberada imediatamente após a vitória contra o décimo adversário. Não é necessário derrotar o décimo primeiro ou o décimo segundo.

Builds montadas manualmente não avançam essa sequência de desbloqueio. O objetivo das Receitas é também servir como trilha de aprendizado da classe.

---

# 4. CAMPO DE JOGO

Cada jogador possui as seguintes zonas:

- quatro espaços de Passiva;
- dois espaços de Carta de Classe;
- uma zona de Ultimate;
- uma zona de Personagem;
- uma área de Condições;
- três zonas de cooldown, chamadas CD um, CD dois e CD três;
- uma área de mão com as oito habilidades disponíveis;
- três espaços centrais de Ação compartilhados visualmente com o combate;
- um espaço de Resposta correspondente sob cada Ação.

As três zonas centrais são espaços de Ação, não espaços exclusivos de ataque.

Uma Ação pode ser Ataque, Técnica ou outro tipo permitido pela carta.

O adversário pode responder a cada Ação de acordo com as regras de Resposta.

O campo precisa permanecer legível em uma única tela. Durante uma partida não deve existir rolagem de página.

---

# 5. ESTADO INICIAL DO PERSONAGEM

Valores universais de playtest:

- trinta pontos de Vida;
- seis pontos de Guarda;
- cinco pontos de Ação no início do próprio turno;
- no máximo três Ações por turno;
- no máximo duas Reservas.

A classe pode possuir componentes próprios, mas não recebe automaticamente uma barra genérica de recurso.

---

# 6. PONTOS DE AÇÃO E RESERVA

No início do próprio turno, o jogador recebe cinco pontos de Ação.

Ele pode executar até três Ações naquele turno.

No final do turno, até dois pontos de Ação não utilizados podem ser convertidos em Reserva.

A Reserva é usada para pagar cartas de Reação no turno adversário.

Reservas não utilizadas desaparecem quando o turno do jogador começa. Depois disso ele recebe os cinco pontos de Ação normais.

Essa regra cria a escolha entre gastar todo o turno pressionando ou preservar capacidade defensiva.

---

# 7. IMPULSO INICIAL

O segundo jogador começa a partida com duas Reservas para responder ao primeiro turno do adversário.

Quando começa seu primeiro turno, essas Reservas iniciais desaparecem normalmente.

Além dos cinco pontos de Ação normais, o segundo jogador recebe um marcador de Impulso Inicial.

O Impulso pode fornecer exatamente um ponto de Ação apenas quando os pontos de Ação restantes não forem suficientes para pagar a habilidade desejada.

Todos os pontos de Ação restantes precisam ser gastos primeiro.

Exemplos:

- se restarem dois pontos de Ação e a habilidade custar três, o Impulso pode completar o terceiro ponto;
- se restar um ponto de Ação e a habilidade custar dois, o Impulso pode completar o segundo;
- se não restar ponto de Ação e a habilidade custar um, o Impulso pode pagar esse ponto;
- se restarem três pontos de Ação e a habilidade custar dois, o Impulso não pode ser usado.

O Impulso nunca pode virar Reserva.

Se não for usado no primeiro turno do segundo jogador, desaparece.

---

# 8. RESPOSTAS

Para cada Ação inimiga, o defensor pode utilizar no máximo uma Resposta voluntária.

A Resposta voluntária pode ser:

- a Defesa Inata da classe;
- uma carta de Reação.

Não é permitido usar a Defesa Inata e uma carta de Reação como duas Respostas separadas contra a mesma Ação.

Passivas automáticas e ativações permitidas de Cartas de Classe podem modificar aquela Resposta sem contar como uma segunda Resposta voluntária.

Uma Carta de Classe pode ser usada no máximo uma vez naquela Ação, seja por Ativação ou por Exaustão.

---

# 9. GUARDA, IMPACTO E RUPTURA

Todo personagem começa com seis pontos de Guarda.

Ataques podem possuir dois valores:

- Dano;
- Impacto.

Impacto reduz Guarda.

Dano reduz Vida.

Quando um Ataque leva a Guarda de um valor acima de zero para zero, ocorre Ruptura.

O mesmo Ataque que causou a Ruptura recebe dois pontos adicionais de Dano.

A Guarda permanece no valor atual até o início do turno daquele personagem, quando volta para seis, salvo texto específico de carta ou condição.

Reduzir a própria Guarda como custo não causa Ruptura. Ruptura só acontece quando uma ação inimiga reduz a Guarda de acima de zero para zero.

---

# 10. ORDEM DE RESOLUÇÃO DE UMA AÇÃO

A sequência padrão é:

1. o atacante declara a carta e paga custos;
2. a carta ocupa o próximo espaço de Ação;
3. o defensor decide se usa uma Resposta voluntária;
4. ativações de Passivas e Cartas de Classe legalmente ligadas à ação são declaradas;
5. modificadores de Impacto e Dano são aplicados;
6. Impacto é aplicado à Guarda;
7. se a Guarda passou de acima de zero para zero, ocorre Ruptura e a ação recebe mais dois de Dano;
8. Dano é aplicado à Vida;
9. condições e efeitos posteriores são resolvidos;
10. a ação termina.

A interface digital deve apresentar esses passos de forma fluida sem obrigar o jogador a ler uma lista durante a partida.

---

# 11. COOLDOWN

Habilidades usadas saem da mão e entram na zona de cooldown indicada na carta.

As zonas são CD um, CD dois e CD três.

No início do turno do dono:

- cartas em CD um voltam para a mão;
- cartas em CD dois passam para CD um;
- cartas em CD três passam para CD dois.

Várias cartas podem existir na mesma zona.

A zona física representa o cooldown. Não existe contador adicional para esse sistema.

---

# 12. PASSIVAS

Cada jogador equipa quatro Passivas escolhidas entre dez da classe.

Elas começam face-down.

Quando a condição de revelação acontece, a Passiva é revelada.

Depois disso permanece face-up.

Se a Passiva possuir um efeito utilizável uma vez por ciclo, o termo usado é Ativar.

Ativar uma Passiva significa girar a carta para a horizontal.

No momento indicado pela regra ou pelo texto, normalmente no início do turno do dono, a Passiva volta a ficar Pronta.

A palavra Exaurir nunca é usada para Passivas.

---

# 13. CARTAS DE CLASSE

Cada classe possui seis Cartas de Classe no catálogo e equipa duas antes da batalha.

Elas começam face-up e Prontas no campo.

Elas não fazem parte das oito habilidades da mão.

Elas não entram no cooldown normal.

Uma Carta de Classe possui dois níveis possíveis de uso.

Ativar significa usar o efeito renovável da carta e girá-la para a horizontal. Ela volta a ficar Pronta no momento normal.

Exaurir significa usar o efeito extremo da carta e removê-la da partida permanentemente.

Uma Carta de Classe só pode ser Ativada ou Exaurida enquanto estiver Pronta.

Uma Carta de Classe Ativada não pode ser Exaurida antes de voltar a ficar Pronta.

Nenhum efeito do jogo-base recupera uma Carta de Classe Exaurida.

---

# 14. ULTIMATES

Cada classe possui três Ultimates no catálogo e equipa uma antes da batalha.

A Ultimate começa face-up.

O adversário sabe qual Ultimate foi escolhida.

A Ultimate só pode ser usada uma vez por partida.

Depois de usada, permanece visualmente marcada como consumida.

---

# 15. CONDIÇÕES

Condições ficam na área de Condições da carta de Personagem.

Quantidade ou duração pode ser indicada por um dado usado apenas como contador.

O dado nunca é rolado.

Condições atualmente definidas incluem:

## Queimadura

Queimadura pode chegar a três.

No final do turno do personagem afetado, ele perde um ponto de Vida e a Queimadura diminui em um.

## Lento

Lento pode chegar a dois.

As próximas ações afetadas custam um ponto de Ação adicional. Depois que uma ação paga esse aumento, Lento diminui em um.

## Murchar

Murchar pode chegar a dois.

No início do turno do personagem afetado, depois da recuperação normal da Guarda para seis, reduza a Guarda pela quantidade de Murchar e remova todo o Murchar.

## Sangramento

Sangramento pode chegar a três.

Depois que o personagem afetado concluir sua segunda Ação no turno, ele perde um ponto de Vida e Sangramento diminui em um.

O dano de Condição não é um Ataque e não pode receber uma Reação comum, salvo texto específico.

---

# 16. IDENTIDADE DAS DOZE CLASSES

## Guerreiro

Administra Momentum temporário. Pressiona Guarda, força Reações, provoca Ruptura e tenta manter o embalo.

Momentum possui no máximo três fichas.

Começa sem Momentum.

A primeira vez em cada próprio turno que um Ataque remover pelo menos dois pontos de Guarda, ganhe um Momentum.

A primeira vez em cada turno inimigo que uma Reação do Guerreiro reduzir o Dano final a zero, ganhe um Momentum.

No final do próprio turno, se o Guerreiro não causou Dano à Vida e não provocou Ruptura, perde um Momentum.

## Mago

É a classe que utiliza Mana tradicional.

Mana vai até seis.

Começa com quatro.

No início do próprio turno recupera duas, até o máximo.

Runas modificam feitiços, defesa, cooldown e sequência.

## Clérigo

Usa uma trilha de Devoção.

Os estágios são Vigília, Graça, Fervor e Milagre.

Começa em Vigília.

Na primeira vez em cada próprio turno em que restaurar Vida ou provocar Ruptura, avança um estágio.

Na primeira vez em cada turno adversário em que uma única Resposta reduzir pelo menos três pontos somados entre Dano e Impacto, avança um estágio.

Milagres podem consumir a trilha e devolver o Clérigo para Vigília.

## Necromante

Usa quatro fichas físicas de Alma.

Começa controlando duas e com duas no Cemitério de Almas.

Almas gastas voltam para o Cemitério e precisam ser colhidas novamente.

Servos podem receber Almas e usar versões fortalecidas de suas habilidades.

## Paladino

Não possui moeda de Convicção.

Possui três estados: Vacilante, Resoluto e Inabalável.

Começa Resoluto.

Seu Juramento define como sobe de estado.

Algumas habilidades poderosas exigem um estado ou fazem o Paladino descer um estado.

## Ladino

Cria até três fichas de Brecha sobre o adversário.

Brechas representam oportunidades e não são Condições.

Brechas não utilizadas desaparecem no final do turno do Ladino.

Habilidades de execução consomem Brechas.

## Bardo

Não possui recurso numérico.

Suas ações possuem Notas de Pulso, Melodia e Harmonia.

Executar Notas diferentes em sequência cria Cadência.

A própria ordem das cartas é o recurso do Bardo.

## Monge

Possui exatamente três pedras de Chi.

Todas começam Prontas.

Gastar Chi vira uma pedra para o lado Gasto.

Executar Abertura seguida de Fluxo recupera uma pedra gasta.

Completar Abertura, Fluxo e Finalização recupera outra.

## Patrulheiro

Possui uma única Marca da Presa.

A Marca fica sobre o adversário.

Diversas habilidades usam a Marca sem consumi-la. Outras Exploram a Marca e depois a removem.

Armadilhas e Emboscadas controlam o ritmo da caça.

## Bárbaro

Usa a própria Guarda como combustível.

Com Guarda entre quatro e seis está Contido.

Com Guarda entre um e três está Enfurecido.

Com Guarda zero está Desencadeado.

Habilidades normais podem reduzir voluntariamente no máximo dois pontos da própria Guarda por turno.

Ultimates e efeitos de Exaurir Cartas de Classe podem ultrapassar esse limite.

## Druida

Administra Forma, não recurso.

Começa em Forma Humana.

No início do próprio turno, antes da primeira Ação, pode usar Metamorfose gratuitamente e mudar entre Forma Humana e Forma Selvagem.

Mudanças adicionais no mesmo turno exigem cartas específicas.

A Forma Selvagem escolhida antes da batalha define como o Druida luta transformado.

## Bruxo

Usa a própria Vida como preço.

Uma vez em cada próprio turno, Preço Proibido permite perder um ponto de Vida para reduzir em um o custo de Ação de uma habilidade normal que custe pelo menos dois, com custo mínimo de um.

Algumas cartas oferecem custos adicionais de Vida para aumentar Dano, Impacto ou defesa.

A perda de Vida usada como custo não é Dano e não pode ser reduzida.

---

# 17. MODO CONTRA IA

O modo principal solo se chama Desafio de IA.

O jogador escolhe uma classe e uma build.

Uma campanha contém doze duelos.

As doze classes aparecem exatamente uma vez durante a campanha, incluindo a classe escolhida pelo próprio jogador.

A ordem é embaralhada a cada nova campanha.

Exemplo: uma campanha de Guerreiro pode enfrentar Mago primeiro, Clérigo depois e Guerreiro em quarto. Na campanha seguinte, Guerreiro pode aparecer primeiro ou por último.

Se o jogador perder um duelo, a campanha termina.

Ao começar outra campanha, a ordem das doze classes é sorteada novamente.

Não existe aleatoriedade de combate adicionada por esse modo. A aleatoriedade serve apenas para a ordem dos adversários e para a escolha da Receita de Build da IA.

---

# 18. DIFICULDADE DA IA

A posição na campanha define a capacidade da IA.

A primeira IA joga como iniciante.

A segunda entende um pouco mais de economia e defesa.

A dificuldade aumenta gradualmente até o décimo segundo adversário.

O décimo segundo deve jogar em nível muito alto.

A IA nunca pode trapacear.

Ela não pode conhecer Passivas ainda não reveladas, habilidades escondidas do adversário ou decisões privadas que um jogador humano não conheceria.

A dificuldade deve vir de:

- profundidade de busca;
- avaliação de estado;
- entendimento de matchup;
- gerenciamento de Reserva;
- planejamento de cooldown;
- leitura probabilística de cartas escondidas a partir do catálogo legal;
- qualidade de escolha de Ativar ou Exaurir;
- capacidade de montar sequências;
- capacidade de guardar uma ferramenta para um turno futuro.

Nos níveis baixos, a IA pode usar heurísticas simples e cometer erros de decisão. Nos níveis altos, deve usar busca mais profunda e memória de informações já reveladas.

---

# 19. RECEITAS DE BUILD E DESBLOQUEIO

Cada classe terá oito Receitas oficiais.

Uma começa desbloqueada.

As outras sete ficam visíveis como progressão, mas podem ter os detalhes ocultos até a liberação, conforme decisão de interface.

Para liberar a Receita seguinte:

- selecione a Receita oficial atual;
- entre no Desafio de IA;
- derrote o décimo adversário;
- a próxima Receita é liberada imediatamente.

A derrota no décimo primeiro ou décimo segundo não cancela o desbloqueio já conquistado.

O desbloqueio é por classe.

Progresso do Guerreiro não libera Receitas do Mago.

---

# 20. MODOS ONLINE

O jogo terá pelo menos:

- PvP Casual;
- PvP Ranqueado;
- Desafio de IA;
- Construtor de Build;
- área de treino local contra IA.

O PvP deve ser autoritativo no servidor.

O cliente nunca decide sozinho se uma jogada é válida.

O cliente envia intenção de ação. O servidor valida custos, alvo, estado, informação escondida e sequência, atualiza o estado canônico e devolve eventos para os dois jogadores.

---

# 21. CONTAS

O sistema de conta precisa permitir:

- criar conta com e-mail e senha;
- enviar confirmação de e-mail;
- confirmar conta;
- fazer login;
- manter sessão;
- fazer logout;
- recuperar senha;
- escolher nome público único;
- salvar builds;
- salvar progresso de Receitas;
- salvar estatísticas;
- salvar ranking;
- consultar histórico de partidas.

---

# 22. RANKING E LEADERBOARD

O PvP Ranqueado possui MMR separado de partidas casuais.

A versão inicial deve usar um sistema de ranking que leve em conta força do adversário e quantidade de partidas. Glicko dois é uma opção recomendada para a implementação porque representa também incerteza do rating, mas a escolha final deve ser validada antes da fase online.

O jogador deve conseguir ver:

- rating atual;
- posição no ranking;
- vitórias e derrotas;
- classe mais utilizada;
- histórico recente;
- posição global;
- posição da temporada, quando temporadas forem implementadas.

O leaderboard não deve expor e-mail ou qualquer dado privado.

---

# 23. REPLAY E LOG DE PARTIDA

Toda partida online deve gerar um log determinístico de eventos.

Esse log precisa permitir:

- reproduzir uma partida;
- investigar bugs;
- resolver disputas técnicas;
- testar mudanças de balanceamento;
- gerar replay visual no futuro.

O log registra comandos e resultados canônicos, não apenas animações.

---

# 24. ALVO VISUAL DA PARTIDA

O vídeo fornecido pelo usuário estabelece o nível de acabamento desejado.

O objetivo não é copiar o layout ou a arte do jogo de referência. O objetivo é atingir a mesma sensação de produto premium.

Características obrigatórias:

- tabuleiro integrado a um cenário tridimensional;
- câmera em perspectiva mostrando o lado do jogador na parte inferior e o adversário na parte superior;
- mão do jogador em leque na borda inferior;
- cartas adversárias representadas por versos na borda superior quando forem informações ocultas;
- zonas do campo visíveis, mas integradas ao cenário;
- carta selecionada levanta e ganha destaque;
- inspeção de carta mostra arte e texto em tamanho grande sem perder completamente a leitura do campo;
- cartas jogadas se movem fisicamente da mão para o espaço correto;
- Reações entram visualmente abaixo da Ação à qual respondem;
- Passivas fazem animação de virar quando reveladas;
- Cartas de Classe giram para a horizontal quando Ativadas;
- Carta de Classe Exaurida recebe uma animação extrema própria e sai do campo para uma área de cartas removidas;
- cooldown é mostrado pelo movimento real da carta entre as zonas;
- Ruptura precisa ter impacto visual e sonoro claro;
- Ultimates recebem apresentação especial;
- mudança de turno recebe transição curta e forte;
- nenhum efeito pode demorar tanto que atrapalhe o ritmo competitivo;
- o usuário deve poder acelerar ou reduzir animações dentro de limites definidos.

---

# 25. DIREÇÃO DE ARTE DAS CARTAS

Todas as cartas devem compartilhar a mesma estrutura básica de moldura.

A identidade da classe aparece por:

- símbolo da classe;
- cor de destaque;
- detalhes ornamentais;
- textura secundária;
- efeitos de brilho.

A forma geral da moldura permanece consistente para que o jogo pareça uma coleção única.

A arte precisa ser original.

Referências de qualidade podem incluir jogos de cartas premium, mas nenhuma moldura, composição, personagem ou ilustração deve copiar propriedade de terceiros.

Estilo pretendido:

- fantasia de alto detalhe;
- ilustração digital cinematográfica;
- leitura forte da ação principal;
- iluminação dramática;
- silhueta clara mesmo em tamanho reduzido;
- consistência de mundo entre classes.

---

# 26. PADRÃO FÍSICO DA CARTA

Formato recomendado para protótipo físico:

- aproximadamente sessenta e três por oitenta e oito milímetros;
- compatível com sleeves comuns de jogos de cartas;
- sangria para impressão na versão final;
- área segura para texto e ícones;
- frente em alta resolução;
- verso padronizado quando a informação precisa ficar oculta.

O arquivo de arte deve ser separado da moldura e do texto. O jogo digital nunca deve depender de uma imagem única com todo o texto já desenhado nela.

---

# 27. TIPOS VISUAIS DE CARTA

A moldura base deve diferenciar claramente:

- Ataque;
- Técnica;
- Reação;
- Passiva;
- Carta de Classe;
- Ultimate;
- Personagem.

O custo de Ação ou Reserva deve ser legível sem abrir zoom.

Dano, Impacto e cooldown devem estar em posições fixas em todas as cartas que usam esses valores.

---

# 28. EFEITOS VISUAIS E SONOROS

O áudio deve ajudar o jogador a entender o estado da partida.

Eventos mínimos com som próprio:

- selecionar carta;
- colocar carta em Ação;
- declarar Reação;
- aplicar Dano;
- aplicar Impacto;
- Ruptura;
- revelar Passiva;
- Ativar Carta de Classe;
- Exaurir Carta de Classe;
- usar Ultimate;
- mudar turno;
- vitória;
- derrota;
- desbloquear Receita.

Cada classe deve ter uma assinatura sonora própria sem tornar a mistura confusa.

Exemplos de linguagem sonora:

- Guerreiro: metal, impacto e peso;
- Mago: energia, cristal e ressonância arcana;
- Clérigo: sinos, coro e luz;
- Necromante: ossos, sussurros e graves secos;
- Bardo: instrumentos reais integrados aos efeitos;
- Monge: respiração, tecido e impacto corporal;
- Patrulheiro: arco, corda, madeira e vento;
- Bárbaro: madeira quebrando, metal bruto e rugido;
- Druida: folhas, vento, madeira e transformação orgânica;
- Bruxo: pulsação, fogo profano e distorção.

---

# 29. ARQUITETURA TÉCNICA RECOMENDADA

A implementação deve ser dividida em camadas.

## Motor de regras

Pacote TypeScript puro, sem interface gráfica.

Responsável por:

- validar builds;
- iniciar partidas;
- calcular ações legais;
- validar custos;
- resolver respostas;
- resolver Dano, Impacto e Ruptura;
- administrar cooldown;
- administrar informações escondidas;
- administrar mecânicas de classe;
- produzir eventos determinísticos.

O mesmo motor é usado por cliente, servidor, IA e testes.

## Cliente

Aplicação web em TypeScript.

Recomendação inicial:

- React para telas, menus e HUD;
- Three.js com React Three Fiber para o campo tridimensional;
- sistema de animação baseado em timeline;
- Web Audio ou biblioteca dedicada para áudio;
- assets carregados sob demanda.

A escolha final de bibliotecas deve ocorrer no início da implementação, depois de um pequeno protótipo de desempenho.

## Servidor de partida

Servidor autoritativo em TypeScript.

Pode utilizar WebSocket e um framework de salas de partida como Colyseus, ou uma camada equivalente implementada sobre WebSocket.

O servidor mantém o estado verdadeiro e envia para cada cliente apenas as informações que aquele jogador pode conhecer.

## Conta e persistência

Supabase é uma opção adequada para:

- autenticação;
- confirmação de e-mail;
- recuperação de senha;
- PostgreSQL;
- perfis;
- builds;
- ranking;
- progresso de Receitas;
- histórico;
- armazenamento de assets quando necessário.

O servidor autoritativo de partida não deve confiar em mutações de estado vindas diretamente do cliente.

---

# 30. ESTRUTURA DE REPOSITÓRIO RECOMENDADA

```text
/apps
  /web
  /game-server
/packages
  /rules-engine
  /card-data
  /ai
  /shared-types
  /ui
  /audio
  /vfx
/assets
  /cards
    /art
    /frames
    /icons
  /boards
  /audio
/docs
  FULL_GAME_SPEC.md
  CARD_CATALOG.md
  PRESET_BUILDS.md
  ROADMAP_CODEX.md
```

O código de regra nunca deve importar Three.js, React ou qualquer biblioteca visual.

---

# 31. BANCO DE DADOS

Entidades iniciais recomendadas:

## profiles

- user_id;
- public_name;
- created_at;
- avatar;
- current_rank;
- rating;
- wins;
- losses.

## saved_builds

- id;
- user_id;
- class_id;
- name;
- eight_skill_ids;
- four_passive_ids;
- two_class_card_ids;
- ultimate_id;
- created_at;
- updated_at.

## preset_unlocks

- user_id;
- class_id;
- highest_recipe_unlocked.

## matches

- id;
- mode;
- player_one_id;
- player_two_id;
- winner_id;
- started_at;
- ended_at;
- rating_delta;
- replay_seed;
- rules_version;
- card_data_version.

## match_events

Pode ser armazenado em formato apropriado para replay e auditoria.

---

# 32. SEGURANÇA

Regras obrigatórias:

- o cliente nunca escolhe o resultado de uma ação;
- informações escondidas são filtradas no servidor;
- endpoints de build validam cartas e quantidade;
- rate limiting em autenticação, matchmaking e ações sensíveis;
- senhas nunca são armazenadas pelo jogo em texto;
- confirmação de e-mail depende do provedor de autenticação;
- logs não registram credenciais;
- regras de banco restringem cada jogador aos próprios dados privados;
- ranking só é atualizado a partir de resultado validado pelo servidor;
- nenhuma vitória enviada pelo cliente é aceita sem a partida autoritativa correspondente.

---

# 33. MATCHMAKING

PvP Casual prioriza tempo de espera e região.

PvP Ranqueado prioriza rating e latência aceitável.

A janela de rating pode crescer conforme o tempo de fila.

Desconexões precisam de período curto de reconexão antes de derrota automática.

A partida continua no servidor durante uma reconexão dentro do limite definido.

---

# 34. IA

A IA deve operar sobre o mesmo motor de regras.

Não criar scripts separados que executam ações impossíveis para humanos.

A arquitetura pode usar:

- geração de ações legais pelo rules engine;
- heurísticas específicas de classe;
- busca limitada para níveis intermediários;
- busca mais profunda e avaliação de informação escondida para níveis altos;
- cache de posições;
- perfis de comportamento por Receita.

A IA precisa saber jogar cada uma das oito Receitas oficiais de cada classe.

O nível de dificuldade deve alterar qualidade de decisão, não Vida, Guarda, dano ou cartas disponíveis.

---

# 35. EXPERIÊNCIA DE CONSTRUTOR DE BUILD

A tela precisa mostrar:

- classe escolhida;
- vinte habilidades disponíveis;
- dez passivas disponíveis;
- seis Cartas de Classe disponíveis;
- três Ultimates;
- slots atualmente equipados;
- filtros por tipo;
- busca por nome;
- explicação de palavras-chave;
- indicador de build válida;
- botão para salvar;
- botão para testar;
- lista das Receitas oficiais.

Ao clicar numa Receita liberada, o jogo pergunta se o jogador quer substituir a build atual e monta os quinze componentes automaticamente.

Uma Receita bloqueada não bloqueia as cartas individuais.

---

# 36. VERTICAL SLICE

Antes de produzir centenas de artes finais, criar um vertical slice de qualidade final com Guerreiro contra Mago.

Esse vertical slice precisa conter:

- uma arena tridimensional final ou muito próxima da final;
- moldura final de carta;
- algumas artes finais;
- movimentos de carta;
- Passiva revelando;
- Carta de Classe Ativando;
- Carta de Classe Exaurindo;
- cooldown;
- Ruptura;
- Ultimate;
- som;
- transição de turno;
- vitória e derrota.

Somente depois de aprovar esse nível de apresentação produzir o restante das artes e efeitos em escala.

---

# 37. ORDEM DE PRODUÇÃO NO CODEX

A ordem recomendada é:

## Fase zero: documentação e fundação

Criar repositório, monorepo, lint, testes, CI, versionamento das regras e importar estes documentos.

## Fase um: rules engine

Implementar sem interface gráfica:

- estado de partida;
- legalidade de ações;
- AP;
- Reserva;
- Impulso;
- Vida;
- Guarda;
- Impacto;
- Ruptura;
- Respostas;
- cooldown;
- Passivas;
- Cartas de Classe;
- Ultimate;
- condições;
- doze mecânicas de classe.

Criar testes unitários para todas as cartas.

## Fase dois: protótipo jogável local

Interface simples apenas para validar regras e fluxo.

## Fase três: vertical slice visual

Construir o nível visual definido no vídeo de referência usando Guerreiro e Mago.

## Fase quatro: conteúdo completo

Integrar as doze classes e o catálogo inteiro.

## Fase cinco: IA

Construir os doze níveis do Desafio de IA e sistema de campanha.

## Fase seis: conta e persistência

Cadastro, confirmação de e-mail, login, recuperação, perfil, builds e progresso.

## Fase sete: PvP online

Servidor autoritativo, matchmaking, reconexão e logs.

## Fase oito: ranking e replay

MMR, leaderboard, histórico e replay.

## Fase nove: acabamento

Artes finais, VFX, áudio, música, acessibilidade, tutorial, otimização e QA.

---

# 38. TESTES AUTOMATIZADOS OBRIGATÓRIOS

Cada carta precisa ter testes de:

- condição de uso;
- custo;
- Dano;
- Impacto;
- cooldown;
- interação com Resposta;
- interação com Ruptura;
- interação com Class Cards;
- interação com Passivas;
- estado físico correto depois da resolução.

Cada classe precisa ter testes de sua mecânica própria.

Também precisam existir testes de regressão para todos os matchups que já foram balanceados.

---

# 39. META DE BALANCEAMENTO

O critério inicial aceito para matchup é que nenhum confronto ultrapasse sessenta por cento contra quarenta por cento em bateria de teste comparável.

Cinquenta contra cinquenta não é obrigatório.

Matchups podem possuir vantagem natural.

O jogo não deve corrigir toda diferença até todos os pares ficarem idênticos.

O foco é evitar hard counters em que uma classe desligue a mecânica central da outra.

---

# 40. DURAÇÃO

Não existe uma duração única obrigatória para todas as classes.

Classes agressivas podem produzir partidas mais curtas.

Classes defensivas podem produzir partidas cinquenta por cento mais longas sem que isso seja tratado automaticamente como problema.

A duração deve ser avaliada junto da qualidade das decisões e não isoladamente.

---

# 41. ACESSIBILIDADE E LEITURA

A interface precisa oferecer:

- tamanho de texto legível;
- modo para reduzir efeitos de câmera;
- controle de volume separado para música, interface e efeitos;
- opção de acelerar animações;
- contraste suficiente para custos e estados;
- ícones acompanhados por texto em telas explicativas;
- histórico das últimas ações da partida.

Nenhuma informação competitiva pode depender apenas de cor.

---

# 42. MOBILE E DESKTOP

A partida deve ser desenhada primeiro para landscape.

Desktop e tablet devem mostrar o campo inteiro sem rolagem.

No celular, o modo principal deve ser landscape para preservar leitura das cartas e do tabuleiro.

Menus podem funcionar em portrait, mas a batalha não deve ser comprimida a ponto de tornar texto ilegível.

---

# 43. REGRAS DE CONTEÚDO PARA FUTURAS CARTAS

Antes de adicionar uma carta, verificar:

- a habilidade faria sentido num RPG;
- existe representação física clara;
- o adversário consegue entender o que aconteceu;
- o efeito não exige memória desnecessária;
- a carta não duplica uma carta existente apenas com número diferente;
- a carta participa de mais de uma build quando possível;
- o efeito não cria ação, recurso e dano gratuitos ao mesmo tempo sem custo real;
- o efeito não impede permanentemente outra classe de usar sua mecânica central.

---

# 44. ESTADO ATUAL

As doze classes possuem catálogo inicial desenhado.

Todas passaram por pelo menos uma bateria de playtest simulado contra as classes necessárias no momento de sua criação.

O catálogo ainda é Alpha e deve passar por playtest humano e por testes automatizados no rules engine antes de ser tratado como balanceamento final.

O arquivo CARD_CATALOG.md contém o catálogo de cartas.

O arquivo PRESET_BUILDS.md contém a estrutura das oito Receitas por classe.

O arquivo ROADMAP_CODEX.md contém a execução técnica em tarefas menores para o Codex.
