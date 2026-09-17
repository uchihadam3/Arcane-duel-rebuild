# VIDEO VISUAL TARGET

## Referência observada

O vídeo enviado mostra um duelo de cartas digital apresentado em arena tridimensional, com a mão do jogador na parte inferior, adversário na parte superior, zonas integradas ao cenário e animações fortes de carta e mudança de turno.

O objetivo do projeto é atingir esse nível de acabamento, sem copiar interface, molduras, cenário ou arte de terceiros.

## Elementos visuais a reproduzir em conceito próprio

- arena preenchendo praticamente toda a área útil da tela;
- perspectiva clara de jogador contra adversário;
- zonas do tabuleiro embutidas na geometria e textura do ambiente;
- animação de hover que levanta a carta;
- foco visual na carta selecionada;
- carta ativada aparecendo em tamanho maior em momentos importantes;
- brilho localizado na zona onde o efeito acontece;
- movimentos de carta claros entre mão, campo e outras zonas;
- transição de turno grande e curta;
- HUD de Vida sempre visível;
- informação detalhada disponível sem cobrir permanentemente o campo;
- efeitos com partículas e luz que reforçam a ação;
- feedback sonoro sincronizado à animação;
- tempo de animação curto o bastante para partidas competitivas.

## Identidade própria do nosso jogo

O nosso tabuleiro deve enfatizar os três espaços centrais de Ação e suas Respostas correspondentes.

A geometria da arena deve mostrar as quatro Passivas, duas Cartas de Classe, Ultimate, Personagem, Condições e trilha de cooldown sem parecer uma grade plana.

Exemplo de linguagem espacial:

- Personagem como peça central de cada lado;
- Cartas de Classe em pedestais laterais;
- Passivas em quatro encaixes menores próximos ao Personagem;
- cooldown em trilhas físicas onde a carta desliza entre três posições;
- as três Ações no centro como pontos de choque do duelo;
- Resposta entrando logo abaixo ou sobreposta parcialmente à Ação adversária;
- Ultimate em um espaço com ornamentação própria.

## Eventos especiais

### Ruptura

O valor de Guarda chega a zero, a arena reage com impacto curto, fissura de luz e som seco. O efeito precisa ser claro sem impedir a leitura do restante do turno.

### Passiva revelada

A carta face-down vira rapidamente, recebe foco de câmera curto e volta ao tamanho normal.

### Ativação de Carta de Classe

A carta gira para a horizontal no campo e produz uma animação curta ligada à classe.

### Exaustão de Carta de Classe

A carta recebe foco maior, executa o efeito extremo e sai fisicamente do Class Slot para a zona de removidas. A animação deve comunicar irreversibilidade.

### Ultimate

Ultimate possui apresentação acima das habilidades normais, mas deve possuir versão reduzida para jogadores que escolherem animações rápidas.

## Meta de desempenho

O cliente deve manter animações suaves em máquinas comuns. Efeitos visuais devem possuir níveis de qualidade. A lógica da partida nunca depende da velocidade da animação.
