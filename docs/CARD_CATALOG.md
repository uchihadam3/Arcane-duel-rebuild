# CARD CATALOG

## Status

Catálogo Alpha das doze classes. Este arquivo consolida as cartas criadas durante o design e normaliza a terminologia atual.

Convenções:

- AP = pontos de Ação.
- R = Reserva.
- D = Dano.
- I = Impacto.
- CD = cooldown.
- Ativar = girar a carta para a horizontal e usar o efeito renovável.
- Exaurir = usar o efeito extremo de uma Carta de Classe e removê-la da partida permanentemente.

---

# GUERREIRO

## Mecânica

Momentum possui no máximo 3 fichas. O Guerreiro começa com 0. A primeira vez em cada próprio turno que um Ataque remover pelo menos 2 de Guarda, ganha 1 Momentum. A primeira vez em cada turno inimigo que uma Reação do Guerreiro reduzir o Dano final a 0, ganha 1 Momentum. No fim do próprio turno, se não causou Dano à Vida e não provocou Ruptura, perde 1 Momentum.

Defesa Inata — Guarda Marcial: uma vez por turno inimigo, reduza 1 D ou 1 I.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| W01 | Corte de Sondagem | Ataque | 1 AP | 2 D / 1 I | 1 | Se o adversário usar uma carta de Reação contra este Ataque, ganhe 1 Momentum depois da resolução. |
| W02 | Ombro de Guerra | Ataque | 2 AP | 3 D / 2 I | 1 | Se for sua primeira Ação do turno, recebe +1 I. |
| W03 | Quebra-Escudo | Ataque | 2 AP | 2 D / 3 I | 2 | Se causar Ruptura, ganhe 1 Momentum. |
| W04 | Corte Ascendente | Ataque | 2 AP | 4 D / 1 I | 2 | Se o inimigo já estava com Guarda 0 quando esta carta foi declarada, recebe +2 D. |
| W05 | Golpe do Carrasco | Ataque | 3 AP | 5 D / 1 I | 2 | Ao declarar, gaste até 2 Momentum. Recebe +1 D por Momentum gasto. |
| W06 | Sequência Brutal | Ataque | 2 AP | 3 D / 1 I | 2 | Se for sua terceira Ação do turno, recebe +2 D. |
| W07 | Finta Cortante | Ataque | 1 AP | 1 D / 1 I | 1 | Se o adversário usar uma carta de Reação, recupere 1 AP depois da resolução. |
| W08 | Golpe de Cerco | Ataque | 3 AP | 3 D / 4 I | 3 | Se causar Ruptura, o bônus de Ruptura deste Ataque é +3 D em vez de +2 D. |
| W09 | Corte Encadeado | Ataque | 2 AP | 3 D / 1 I | 1 | Se sua Ação anterior foi um Ataque de 1 AP, recebe +1 D e +1 I. |
| W10 | Ataque de Oportunidade | Ataque | 1 AP | 3 D / 0 I | 2 | Só pode ser usado se o inimigo estiver com Guarda 0. |
| W11 | Pressão Implacável | Técnica | 1 AP | — | 2 | Seu próximo Ataque neste turno recebe +2 I. Se ele causar Ruptura, ganhe 1 Momentum. |
| W12 | Disciplina de Aço | Técnica | 1 AP | — | 1 | Ganhe 1 Momentum. Se terminar o turno com 2 de Reserva, ganhe mais 1 Momentum. |
| W13 | Finta Calculada | Técnica | 1 AP | — | 2 | Seu próximo Ataque neste turno recebe +2 D se enfrentar uma carta de Reação. Se não enfrentar, recebe +2 I. |
| W14 | Guarda Preparada | Técnica | 1 AP | — | 2 | No fim deste turno, ganhe +1 Reserva além da conversão normal, respeitando o máximo de 2. |
| W15 | Aparar | Reação | 1 R | — | 1 | Reduza 3 D. Se o Dano final for 0, ganhe 1 Momentum. |
| W16 | Base Firme | Reação | 1 R | — | 1 | Reduza 3 I. Se isso impedir uma Ruptura, ganhe 1 Momentum. |
| W17 | Absorver o Golpe | Reação | 2 R | — | 2 | Reduza 2 D e 2 I. Se ainda perder Vida, ganhe 1 Momentum. |
| W18 | Ripostar | Reação | 2 R | — | 2 | Reduza 2 D. Se o Dano final for 0, o adversário perde 2 de Vida. |
| W19 | Interposição | Reação | 1 R | — | 2 | Reduza 1 D e 2 I. |
| W20 | Último Bastião | Reação | 2 R | — | 3 | Só contra um Ataque que causaria Ruptura. Reduza 1 D e 3 I. |

## Dez passivas

- Instinto de Ferro — revele quando um Ataque causaria Ruptura. Reduza 2 I. Depois de revelada, uma vez por turno inimigo, Ative e gaste 1 Momentum para reduzir 1 I de um Ataque que causaria Ruptura.
- Sangue Aceso — revele ao chegar a 15 de Vida ou menos. Depois disso, o primeiro Ataque de cada turno em que gastar Momentum recebe +1 D.
- Leitura de Combate — revele quando o adversário declarar a terceira Ação do turno. Depois disso, a primeira Reação contra a terceira Ação de cada turno inimigo custa 1 R a menos, mínimo 0.
- Predador de Ruptura — revele na primeira Ruptura causada. Depois disso, o primeiro Ataque de cada turno jogado enquanto a Guarda inimiga está 0 recebe +1 D.
- Dor em Força — revele ao perder 4 ou mais de Vida de um Ataque e ganhe 2 Momentum. Depois disso, na primeira vez por turno inimigo que isso ocorrer, ganhe 1 Momentum.
- Mestre da Defesa — revele quando uma Reação reduzir o Dano final a 0. Depois disso, na primeira vez por turno inimigo que isso ocorrer, restaure 1 Guarda.
- Pressão de Veterano — revele no início do seu turno se o inimigo estiver com Reserva 0. Depois disso, enquanto ele estiver com Reserva 0, seu primeiro Ataque do turno recebe +1 I.
- Mão Pesada — revele quando jogar um Ataque de 3 AP. Depois disso, seu primeiro Ataque de 3 AP de cada turno recebe +1 I.
- Olho na Abertura — revele quando o inimigo usar sua segunda carta de Reação no mesmo turno. Depois disso, sempre que isso ocorrer, recupere 1 AP.
- Guarda de Veterano — revele quando terminar seu turno com Reserva 2. Depois disso, sua primeira carta de Reação de cada turno inimigo reduz +1 D ou +1 I.

## Seis Cartas de Classe

### Postura da Fortaleza

Ativar: quando estiver recebendo um Ataque, Guarda Marcial reduz 1 D e 1 I nesta ação.

Exaurir: quando um Ataque causaria Ruptura, impeça a Ruptura. Depois da resolução, ajuste sua Guarda para 3.

### Postura da Vanguarda

Ativar: ao declarar um Ataque, ele recebe +1 D e +1 I.

Exaurir: ao declarar um Ataque, ele recebe +3 I. Se causar Ruptura, ganhe 2 Momentum.

### Postura do Duelista

Ativar: depois que o adversário usar uma carta de Reação contra seu Ataque, ganhe 1 Momentum.

Exaurir: depois que o adversário usar uma carta de Reação, seu Ataque recebe +3 D depois que a redução da Reação for aplicada.

### Cerco Metódico

Ativar: quando causar Ruptura, recupere 1 AP.

Exaurir: quando causar Ruptura, seu próximo Ataque neste turno recebe +3 D.

### Contraofensiva

Ativar: depois que sua carta de Reação resolver, ganhe 1 Momentum.

Exaurir: quando jogar uma Reação, ela reduz +2 D e +2 I. Depois da resolução, ganhe 2 Momentum.

### Ritmo de Batalha

Ativar: quando jogar um Ataque imediatamente depois de outro Ataque, o segundo recebe +1 D e +1 I.

Exaurir: quando jogar um Ataque imediatamente depois de outro Ataque, ele custa 1 AP a menos, mínimo 1, e recebe +2 D e +1 I.

## Três Ultimates

- Quebra-Reinos — Ataque. 3 AP e 3 Momentum. 7 D / 3 I.
- Última Palavra — Reação. 2 R e 3 Momentum. O Dano final daquele Ataque se torna 0 e reduza 2 I. Depois da resolução, o adversário perde 4 de Vida.
- Sequência do Campeão — Ataque. 3 AP e 2 Momentum. 4 D / 2 I. Recebe +2 D por Ataque que você já realizou neste turno, máximo +4 D.

---

# MAGO

## Mecânica

Mana vai de 0 a 6. Começa com 4. No início do próprio turno, recupere 2 Mana, até o máximo.

Defesa Inata — Barreira Arcana: uma vez por turno inimigo, gaste 1 Mana para reduzir 1 D e 1 I.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| M01 | Dardo Arcano | Ataque/Feitiço | 1 AP | 2 D / 1 I | 1 | Se pelo menos uma Runa estiver Ativada ao declarar, recebe +1 D. |
| M02 | Bola de Fogo | Ataque/Feitiço | 2 AP + 1 Mana | 4 D / 1 I | 2 | Se o inimigo tiver Queimadura, recebe +1 D. |
| M03 | Chama Persistente | Ataque/Feitiço | 2 AP + 1 Mana | 2 D / 1 I | 2 | Se causar Dano à Vida, aplique Queimadura 2. |
| M04 | Pulso Cinético | Ataque/Feitiço | 2 AP + 1 Mana | 2 D / 3 I | 2 | Se causar Ruptura, recupere 1 Mana. |
| M05 | Lança Arcana | Ataque/Feitiço | 3 AP + 2 Mana | 5 D / 2 I | 2 | Se for sua terceira Ação do turno, recebe +1 D. |
| M06 | Estilhaço de Gelo | Ataque/Feitiço | 2 AP + 1 Mana | 3 D / 1 I | 2 | Se causar Dano à Vida, aplique Lento 1. |
| M07 | Onda Glacial | Ataque/Feitiço | 3 AP + 2 Mana | 3 D / 3 I | 3 | Se causar Ruptura, aplique Lento 1. |
| M08 | Rajada Prismática | Ataque/Feitiço | 2 AP + 1 Mana | 3 D / 1 I | 1 | Você pode Ativar uma Runa Pronta ao declarar. Se fizer isso, escolha +1 D ou +1 I. |
| M09 | Orbe Instável | Ataque/Feitiço | 1 AP + 1 Mana | 1 D / 2 I | 2 | Se for sua segunda Ação, escolha +1 D ou +1 I. |
| M10 | Explosão de Mana | Ataque/Feitiço | 2 AP + 1 a 3 Mana | 2 D / 1 I | 2 | Recebe +1 D por Mana adicional gasta nesta carta. |
| M11 | Canalizar | Técnica/Feitiço | 1 AP | — | 1 | Ganhe 2 Mana, até o máximo. |
| M12 | Concentração Prismática | Técnica/Feitiço | 1 AP | — | 2 | Seu próximo Ataque/Feitiço neste turno recebe +1 D e +1 I. |
| M13 | Distorção Temporal | Técnica/Feitiço | 2 AP + 2 Mana | — | 3 | Escolha uma carta sua em CD1 e devolva-a imediatamente à mão. |
| M14 | Recalibrar Runa | Técnica/Feitiço | 1 AP + 1 Mana | — | 2 | Deixe Pronta uma de suas Runas Ativadas. |
| M15 | Barreira de Mana | Reação/Feitiço | 1 R + 1 Mana | — | 1 | Reduza 3 D. |
| M16 | Imagem Espelhada | Reação/Feitiço | 2 R + 1 Mana | — | 2 | O Dano final deste Ataque se torna 0. O Impacto não é alterado. |
| M17 | Égide Cinética | Reação/Feitiço | 1 R + 1 Mana | — | 1 | Reduza 3 I. |
| M18 | Armadura de Gelo | Reação/Feitiço | 1 R + 1 Mana | — | 2 | Reduza 2 D e 1 I. Se o Dano final for 0, aplique Lento 1 ao atacante. |
| M19 | Contrafeitiço | Reação/Feitiço | 2 R + 2 Mana | — | 3 | Quando o adversário jogar uma Técnica, cancele o texto dela. Custos e espaço de Ação continuam gastos. |
| M20 | Barreira Prismática | Reação/Feitiço | 2 R + 2 Mana | — | 2 | Reduza 2 D e 2 I. Depois, deixe Pronta uma Runa Ativada. |

## Dez passivas

- Reserva Arcana — revele quando sua Mana chegar a 1 ou menos e ganhe 2 Mana. Depois, se começar seu turno com 1 Mana ou menos, recupere 3 em vez de 2.
- Mente Calculista — revele ao completar sua terceira Ação. Depois disso, quando sua terceira Ação for um Feitiço, coloque a carta uma zona de cooldown mais próxima da mão após resolver.
- Véu Prismático — revele quando um Ataque causaria Ruptura e reduza 2 I. Depois disso, uma vez por turno inimigo, Ative e gaste 1 Mana para reduzir 1 I de um Ataque que causaria Ruptura.
- Eco Rúnico — revele quando Ativar suas duas Runas no mesmo turno e ganhe 1 Mana. Depois disso, na primeira vez por turno que as duas ficarem Ativadas, ganhe 1 Mana.
- Concentração sob Pressão — revele ao perder 4 ou mais de Vida de um Ataque e devolva uma carta de CD1 à mão. Depois disso, na primeira vez por turno inimigo que perder 4 ou mais, mova uma carta de CD2 para CD1.
- Combustão Controlada — revele quando um inimigo alcançar Queimadura 2. Depois disso, seu primeiro Ataque/Feitiço de cada turno contra inimigo com Queimadura recebe +1 I.
- Frio Calculado — revele quando o inimigo pagar AP adicional por Lento e ganhe 1 Mana. Depois disso, na primeira vez por turno que isso ocorrer, ganhe 1 Mana.
- Geometria Rúnica — revele na primeira vez que Ativar uma Runa para modificar um Feitiço. Depois disso, uma vez por turno, o Feitiço que fizer a primeira Runa ser Ativada recebe +1 D ou +1 I.
- Reserva de Contramedidas — revele quando terminar seu turno com Reserva 2. Depois disso, sua primeira Reação de cada turno inimigo custa 1 Mana a menos, mínimo 0.
- Núcleo Sobrecarregado — revele quando jogar uma Ação que custe pelo menos 2 Mana. Depois disso, seu primeiro Ataque/Feitiço de cada turno que custe 2 ou mais Mana recebe +1 D ou +1 I.

## Seis Cartas de Classe

### Runa de Cinzas

Ativar: depois que um Feitiço causar Dano à Vida, aplique Queimadura 1.

Exaurir: quando a Queimadura do adversário fosse causar Dano, remova toda a Queimadura e faça esse evento causar 3 de Dano em vez do valor normal.

### Runa da Geada

Ativar: depois que um Feitiço causar pelo menos 2 I, aplique Lento 1.

Exaurir: antes de resolver um Feitiço, ele recebe +3 I. Se causar Ruptura, aplique Lento 2.

### Runa do Eco

Ativar: quando um Feitiço seu iria entrar em CD2 ou CD3, coloque-o uma zona de cooldown mais próxima da mão.

Exaurir: escolha um Feitiço seu em qualquer zona de cooldown e devolva-o à mão. Se for utilizado novamente neste turno, custa +1 AP.

### Runa da Égide

Ativar: quando usar uma Resposta, reduza mais 1 D ou 1 I daquela ação.

Exaurir: quando responder a um Ataque, o Dano final se torna 0 e reduza 2 I.

### Runa do Conduíte

Ativar: depois de pagar Mana por uma Ação, recupere 1 Mana depois da resolução.

Exaurir: antes de conjurar um Feitiço, ignore todo o custo de Mana dele. Se o custo impresso de Mana for 2 ou mais, recupere 1 AP depois da resolução.

### Runa Prismática

Ativar: depois que sua segunda Ação de Feitiço do turno resolver, sua terceira Ação, se também for um Feitiço, custa 1 AP a menos, mínimo 1.

Exaurir: depois que sua terceira Ação resolver, você pode realizar uma quarta Ação naquele turno. Ela deve ser um Feitiço e todos os custos ainda precisam ser pagos.

## Três Ultimates

- Meteoro — Ataque/Feitiço. 3 AP + 4 Mana. 7 D / 2 I. Se causar Dano à Vida, aplique Queimadura 2.
- Zero Absoluto — Ataque/Feitiço. 3 AP + 4 Mana. 4 D / 4 I. Se causar Ruptura, aplique Lento 2.
- Sobrecarga Temporal — Técnica/Feitiço. 2 AP + 3 Mana. Deixe suas duas Runas Prontas, devolva até duas cartas de CD1 à mão e recupere 1 AP.

---
# CLÉRIGO

## Mecânica

A Devoção possui quatro estágios: Vigília, Graça, Fervor e Milagre. O Clérigo começa em Vigília.

Na primeira vez em cada próprio turno em que restaurar Vida ou provocar Ruptura, avance um estágio.

Na primeira vez em cada turno adversário em que uma única Resposta reduzir pelo menos 3 pontos somados entre Dano e Impacto, avance um estágio.

Algumas cartas exigem Graça ou Fervor. Cartas mais poderosas podem fazer o Clérigo descer um estágio. Ultimates ligadas a Milagre consomem Milagre e devolvem a Devoção para Vigília.

Defesa Inata — Prece Protetora: uma vez por turno inimigo, se estiver em Graça, Fervor ou Milagre, reduza 1 D e 1 I.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| C01 | Golpe Consagrado | Ataque | 1 AP | 2 D / 1 I | 1 | Se o adversário estiver com 3 ou menos de Guarda, recebe +1 I. |
| C02 | Martelo do Julgamento | Ataque | 2 AP | 3 D / 2 I | 1 | Se o adversário usar uma carta de Reação e este Ataque ainda causar Dano à Vida, avance 1 estágio de Devoção depois da resolução. Esse avanço é adicional ao avanço normal do turno. |
| C03 | Luz Punitiva | Ataque | 2 AP | 4 D / 1 I | 2 | Requer Graça ou mais. Se o inimigo já estava com Guarda 0 e o Ataque causar Dano à Vida, restaure 1 Vida. |
| C04 | Veredito Solar | Ataque | 2 AP | 2 D / 3 I | 2 | Requer Graça ou mais. Se causar Ruptura, restaure 1 Vida depois da resolução. |
| C05 | Lança da Aurora | Ataque | 1 AP | 3 D / 0 I | 1 | Requer Graça ou mais. Se você restaurou Vida neste turno, recebe +2 D. |
| C06 | Julgamento Maior | Ataque | 3 AP | 5 D / 2 I | 2 | Requer Fervor ou Milagre. Se for sua terceira Ação e o inimigo estiver com Guarda 0, recebe +2 D. Depois da resolução, desça 1 estágio de Devoção. |
| C07 | Cinzas do Pecado | Ataque | 2 AP | 3 D / 2 I | 2 | Requer Graça ou mais. Se causar Dano à Vida, remova 1 Condição negativa sua. |
| C08 | Oração Silenciosa | Técnica | 1 AP | — | 2 | Avance 1 estágio de Devoção. |
| C09 | Prece Restauradora | Técnica | 2 AP | — | 2 | Requer Graça ou mais. Restaure 3 Vida. |
| C10 | Imposição das Mãos | Técnica | 3 AP | — | 3 | Só pode ser usada com 15 de Vida ou menos e requer Fervor ou Milagre. Restaure 5 Vida. Depois da resolução, desça 1 estágio de Devoção. |
| C11 | Bênção da Coragem | Técnica | 1 AP | — | 1 | Requer Graça ou mais. Seu próximo Ataque neste turno recebe +1 D e +1 I. |
| C12 | Vigília | Técnica | 1 AP | — | 2 | No fim deste turno, ganhe +1 Reserva além da conversão normal, respeitando o máximo de 2. Se terminar com 2 de Reserva, avance 1 estágio de Devoção. |
| C13 | Purificação | Técnica | 1 AP | — | 2 | Requer Graça ou mais. Remova 1 Condição negativa. Se não houver nenhuma, restaure 2 Vida. |
| C14 | Escudo da Fé | Reação | 1 R | — | 1 | Requer Graça ou mais. Reduza 2 D e 2 I. |
| C15 | Âncora Sagrada | Reação | 1 R | — | 1 | Requer Graça ou mais. Reduza 3 I. |
| C16 | Intercessão | Reação | 2 R | — | 2 | Requer Fervor ou Milagre. Reduza 4 D. Depois da resolução, desça 1 estágio de Devoção. |
| C17 | Martírio | Reação | 1 R | — | 2 | Reduza 3 I. Se impedir uma Ruptura, perca 1 Vida que não pode ser reduzida e avance 1 estágio de Devoção. |
| C18 | Luz Refletida | Reação | 2 R | — | 2 | Requer Fervor ou Milagre. Reduza 2 D e 2 I. Se o Dano final for 0, o adversário perde 2 de Vida. Depois da resolução, desça 1 estágio de Devoção. |
| C19 | Absolvição | Reação | 1 R | — | 2 | Requer Graça ou mais. Reduza 1 D e 1 I. Condições que esta ação aplicaria a você não são aplicadas. |
| C20 | Última Prece | Reação | 2 R | — | 3 | Só pode ser usada com 10 de Vida ou menos e requer Fervor ou Milagre. Reduza 5 D e depois restaure 1 Vida. Depois da resolução, desça 1 estágio de Devoção. |

## Dez passivas

- Coração Misericordioso — revele quando restaurar Vida enquanto estiver com 15 de Vida ou menos. Depois disso, a primeira habilidade que restaurar Vida em cada próprio turno restaura +1.
- Olho do Julgamento — revele quando causar sua primeira Ruptura. Depois disso, o primeiro Ataque de cada turno jogado enquanto o adversário estiver com Guarda 0 recebe +1 D.
- Devoção Imóvel — revele quando terminar um turno com 2 de Reserva. Depois disso, a primeira Reação de cada turno inimigo que exigir Graça pode ser usada mesmo se você estiver em Vigília.
- Mártir Voluntário — revele quando perder Vida por um efeito próprio. Avance 1 estágio de Devoção. Depois disso, na primeira vez em cada turno que perder Vida por um efeito próprio, avance 1 estágio.
- Pureza Interior — revele quando uma Condição negativa for aplicada a você. Remova aquela Condição. Depois disso, na primeira vez em cada turno que uma Condição negativa for aplicada, reduza sua quantidade ou duração em 1.
- Milagre Guardado — revele ao alcançar Milagre. Depois disso, uma vez por turno, Ative quando jogar uma habilidade que exija Fervor ou Milagre para ela receber +1 D, +1 I ou +1 de cura, conforme o que fizer.
- Liturgia Contínua — revele quando realizar 3 Ações num mesmo turno. Depois disso, sempre que sua terceira Ação for uma Técnica, ela entra em uma zona de cooldown mais próxima da mão.
- Escudo dos Fiéis — revele quando uma Reação reduzir o Dano final de um Ataque a 0. Depois disso, na primeira vez em cada turno inimigo que isso acontecer, restaure 1 Vida.
- Justiça Restauradora — revele quando provocar Ruptura estando abaixo da Vida máxima. Restaure 1 Vida. Depois disso, a primeira Ruptura causada em cada próprio turno restaura 1 Vida.
- Segunda Luz — revele quando chegar a 5 de Vida ou menos. Avance imediatamente 1 estágio de Devoção. Depois disso, enquanto permanecer com 5 de Vida ou menos, sua primeira habilidade de cada próprio turno pode ser tratada como se sua Devoção estivesse 1 estágio acima para verificar requisitos.

## Seis Cartas de Classe

O Clérigo escolhe 1 Doutrina e 1 Relíquia.

### Doutrina da Misericórdia

Ativar: quando uma habilidade restaurar Vida, restaure +1.

Exaurir: quando uma habilidade restaurar Vida, restaure +3 adicionais.

### Doutrina do Julgamento

Ativar: ao declarar um Ataque contra um adversário com 3 ou menos de Guarda, ele recebe +1 D e +1 I.

Exaurir: ao declarar um Ataque, ele recebe +3 D. Se causar Ruptura, avance 1 estágio de Devoção depois da resolução.

### Doutrina do Martírio

Ativar: depois que perder pelo menos 3 de Vida de um único Ataque, avance 1 estágio de Devoção.

Exaurir: quando um Ataque fosse reduzir sua Vida a 0, deixe a ação resolver normalmente e depois ajuste sua Vida para 1.

### Incensário da Aurora

Ativar: depois que uma Técnica resolver, seu próximo Ataque neste turno recebe +1 D.

Exaurir: depois que uma Técnica resolver, seu próximo Ataque neste turno recebe +2 D e +2 I.

### Sino do Santuário

Ativar: quando usar uma Reação, ela reduz +1 I.

Exaurir: quando usar uma Reação, o Impacto final da ação se torna 0 e a Reação reduz +2 D.

### Relicário dos Santos

Ativar: quando jogar uma habilidade que exija Fervor ou Milagre, escolha uma carta sua em CD2 e mova para CD1.

Exaurir: devolva imediatamente uma carta sua de qualquer zona de cooldown para a mão. Se usá-la neste turno, ela custa +1 AP.

## Três Ultimates

- Julgamento Celeste — Ataque. 3 AP. Requer Milagre e consome Milagre, retornando a Vigília. 7 D / 3 I. Se causar Ruptura, restaure 3 Vida.
- Milagre da Aurora — Técnica. 2 AP. Requer Milagre e consome Milagre. Restaure 6 Vida e remova todas as Condições negativas.
- Intercessão Divina — Reação. 2 R. Requer Milagre e consome Milagre. O Dano e o Impacto finais daquela ação se tornam 0. Depois, restaure 2 Vida.

---

# NECROMANTE

## Mecânica

O Necromante possui 4 fichas de Alma. Começa controlando 2 e com 2 no Cemitério de Almas. Almas gastas voltam para o Cemitério.

A primeira vez em cada próprio turno que um Ataque do Necromante causar Dano à Vida, colha 1 Alma do Cemitério, se houver.

A primeira vez em cada turno inimigo que o Necromante perder Vida por Ataque ou Condição, colha 1 Alma do Cemitério, se houver.

No início do próprio turno, antes de receber AP, o Necromante pode colocar 1 Alma controlada sobre um Servo que ainda não possua Alma. Uma Alma anexada permanece até ser usada por aquele Servo ou até o Servo ser Exaurido. Se o Servo for Exaurido com uma Alma anexada, a Alma retorna ao Cemitério.

Defesa Inata — Ossos Guardiões: uma vez por turno inimigo, devolva 1 Alma controlada ao Cemitério para reduzir 2 I.

Murchar: máximo 2. No início do turno do personagem afetado, depois de a Guarda voltar para 6, reduza a Guarda pela quantidade de Murchar e remova todo o Murchar.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| N01 | Flecha Óssea | Ataque | 1 AP | 2 D / 1 I | 1 | — |
| N02 | Lança de Ossos | Ataque | 2 AP + 1 Alma | 3 D / 3 I | 2 | A Alma gasta volta ao Cemitério. |
| N03 | Toque Murchante | Ataque | 2 AP + 1 Alma | 3 D / 1 I | 2 | Se causar Dano à Vida, aplique Murchar 1. |
| N04 | Drenar Vitalidade | Ataque | 2 AP + 1 Alma | 3 D / 1 I | 2 | Se causar Dano à Vida, restaure 1 Vida. |
| N05 | Onda dos Mortos | Ataque | 3 AP + 2 Almas | 4 D / 3 I | 3 | Se seus 2 Servos estiverem Prontos ao declarar, recebe +1 I. |
| N06 | Ceifa Funesta | Ataque | 2 AP + 1 Alma | 4 D / 1 I | 2 | Ao declarar, você pode remover 1 Murchar do adversário. Se fizer isso, recebe +2 D. |
| N07 | Mão do Túmulo | Ataque | 2 AP | 2 D / 2 I | 1 | Se o adversário estiver com 3 ou menos de Guarda, colha 1 Alma depois da resolução. |
| N08 | Roubo de Memória | Ataque | 2 AP + 2 Almas | 2 D / 1 I | 3 | Se causar Dano à Vida, escolha uma habilidade adversária em CD1 e mova para CD2. |
| N09 | Ruína Sepulcral | Ataque | 1 AP + 1 Alma | 1 D / 2 I | 1 | Se causar Ruptura, colha até 2 Almas do Cemitério. |
| N10 | Colheita Profana | Técnica | 1 AP | — | 2 | Escolha uma habilidade sua em CD1 e mova para CD2. Colha até 2 Almas do Cemitério. |
| N11 | Oferenda ao Túmulo | Técnica | 1 AP | — | 2 | Escolha outra habilidade em sua mão e coloque-a em CD2. Colha até 3 Almas do Cemitério. |
| N12 | Desenterrar | Técnica | 2 AP + 2 Almas | — | 2 | Escolha uma carta sua em CD2 ou CD3 e mova uma etapa em direção à mão. |
| N13 | Comandar os Mortos | Técnica | 1 AP + 1 Alma | — | 2 | Deixe Pronto um Servo Ativado. |
| N14 | Selo Fúnebre | Técnica | 1 AP + 1 Alma | — | 2 | Aplique Murchar 1 ao adversário. |
| N15 | Rito de Ossos | Técnica | 1 AP + 1 Alma | — | 2 | Seu próximo Ataque neste turno recebe +2 I. Se provocar Ruptura, deixe Pronto um Servo Ativado. |
| N16 | Muralha de Ossos | Reação | 1 R + 1 Alma | — | 1 | Reduza 3 I. |
| N17 | Véu dos Mortos | Reação | 1 R + 1 Alma | — | 1 | Reduza 3 D. |
| N18 | Retorno Sepulcral | Reação | 2 R + 2 Almas | — | 2 | Reduza 2 D e 2 I. Depois da resolução, devolva uma carta sua de CD1 à mão. |
| N19 | Recusar a Morte | Reação | 2 R + 3 Almas | — | 3 | Só contra um Ataque que reduziria sua Vida a 0. A ação resolve e depois sua Vida fica em 1. |
| N20 | Maldição Reflexa | Reação | 1 R + 1 Alma | — | 2 | Reduza 1 D e 1 I. Se ainda perder Vida, aplique Murchar 1 ao adversário. |

## Dez passivas

- Colecionador de Almas — revele quando controlar as 4 Almas. Depois disso, a primeira vez em cada turno que colher uma Alma estando com 1 ou menos controlada, colha 1 adicional se houver no Cemitério.
- Mestre do Murchar — revele na primeira vez que aplicar Murchar. Depois disso, o primeiro Ataque de cada turno contra um inimigo com Murchar recebe +1 I.
- Memória dos Mortos — revele quando mover voluntariamente uma carta própria para uma zona de cooldown mais distante da mão. Colha 1 Alma. Depois disso, a primeira vez em cada próprio turno que fizer isso, colha 1 Alma.
- Senhor dos Servos — revele quando Ativar os 2 Servos dentro da mesma rodada completa. Depois disso, a primeira vez em cada próprio turno que deixar um Servo Pronto novamente, colha 1 Alma.
- Fome da Cripta — revele quando restaurar Vida por habilidade ou Servo. Depois disso, a primeira vez em cada próprio turno que restaurar Vida dessa forma, restaure +1.
- Guardião do Túmulo — revele quando uma Reação impedir Ruptura. Colha 1 Alma. Depois disso, na primeira vez em cada turno inimigo que uma Reação impedir Ruptura, colha 1 Alma.
- Último Suspiro — revele quando chegar a 5 de Vida ou menos. Colha até 2 Almas. Depois disso, enquanto estiver com 5 ou menos, a primeira habilidade de cada turno que gaste Almas custa 1 Alma a menos, mínimo 0.
- Sacrifício Calculado — revele quando Exaurir seu primeiro Servo. Depois que o efeito resolver, colha até 2 Almas. Quando Exaurir o segundo Servo, colha 1 Alma.
- Paciência Sepulcral — revele quando terminar um turno com 2 de Reserva. Depois disso, sua primeira Reação de cada turno inimigo custa 1 Alma a menos, mínimo 0.
- Eco do Cemitério — revele quando possuir cartas em pelo menos 2 zonas diferentes de cooldown. Depois disso, uma vez por próprio turno, quando uma carta voltar normalmente de CD1 para sua mão, colha 1 Alma.

## Seis Cartas de Classe

O Necromante escolhe 2 Servos diferentes.

### Guardião Esquelético

Ativar: quando usar uma Reação, ela reduz +1 I. Se houver uma Alma anexada, você pode devolvê-la ao Cemitério para a Reação reduzir também +1 D e +1 I.

Exaurir: quando responder a um Ataque, o Impacto final daquela ação se torna 0.

### Cão Tumular

Ativar: depois que um Ataque seu causar Dano à Vida, o adversário perde 1 Vida. Se houver Alma anexada, você pode devolvê-la ao Cemitério para ele perder +1 Vida.

Exaurir: depois que um Ataque seu causar Dano à Vida, o adversário perde 3 Vida.

### Espectro Faminto

Ativar: quando o adversário usar uma carta de Reação contra seu Ataque, ignore 1 ponto de redução de Dano ou Impacto daquela Reação. Se houver Alma anexada, você pode devolvê-la ao Cemitério para ignorar 1 ponto adicional.

Exaurir: quando o adversário declarar uma Reação, ignore até 3 pontos de redução produzidos por ela, divididos entre Dano e Impacto.

### Mago Ósseo

Ativar: quando jogar uma habilidade que custe Almas, reduza o custo em 1 Alma, mínimo 0. Se houver Alma anexada, você pode devolvê-la ao Cemitério para reduzir o custo em mais 1.

Exaurir: reduza o custo em Almas de uma habilidade em até 3. Se for um Ataque, ele recebe +1 D e +1 I.

### Ghoul Devorador

Ativar: quando colher uma Alma, restaure 1 Vida. Se houver Alma anexada, você pode devolvê-la ao Cemitério para restaurar +1.

Exaurir: quando colher uma Alma, restaure 3 Vida e colha 1 Alma adicional se houver no Cemitério.

### Abominação Costurada

Ativar: quando declarar um Ataque de 3 AP, ele recebe +1 D e +1 I. Se houver Alma anexada, você pode devolvê-la ao Cemitério para receber +1 D adicional.

Exaurir: quando declarar qualquer Ataque, ele recebe +3 D e +2 I.

## Três Ultimates

- Ceifador de Almas — Ataque. 3 AP + 4 Almas. 7 D / 2 I. Ao declarar, você pode remover todo o Murchar do adversário. Para cada ponto removido, recebe +1 D e +1 I.
- Rito da Segunda Morte — Técnica. 2 AP + 3 Almas. Exaura 1 Servo Pronto e resolva seu efeito de Exaurir. Depois, devolva até 2 habilidades suas em cooldown para a mão. Cada uma custa +1 AP se for usada neste turno.
- Morte Negada — Reação. 2 R + 4 Almas. Só contra um Ataque que derrotaria você. Depois de toda a resolução, sua Vida fica em 1. Em seguida, mova uma carta sua de qualquer zona de cooldown uma etapa em direção à mão.

---
# PALADINO

## Mecânica

O Paladino possui três estados de Convicção: Vacilante, Resoluto e Inabalável. Começa Resoluto.

O Juramento escolhido define como o Paladino sobe de estado. Algumas habilidades exigem um estado mínimo. Algumas habilidades fazem o Paladino descer um estado para ganhar poder.

Defesa Inata — Escudo Consagrado:

- Vacilante: reduza 1 I;
- Resoluto: reduza 1 D e 1 I;
- Inabalável: reduza 1 D e 2 I.

Pode ser usada uma vez por turno inimigo como Resposta.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| P01 | Pancada de Escudo | Ataque | 1 AP | 1 D / 2 I | 1 | Se sua Guarda estiver em 6 ao declarar, recebe +1 I. |
| P02 | Corte Radiante | Ataque | 2 AP | 3 D / 1 I | 1 | Se estiver Resoluto ou Inabalável, você pode descer 1 estado ao declarar para receber +2 D. |
| P03 | Martelo do Juramento | Ataque | 2 AP | 2 D / 3 I | 2 | Se começou este turno com 2 de Reserva, recebe +1 D. |
| P04 | Golpe Consagrado | Ataque | 2 AP | 4 D / 2 I | 2 | Requer Resoluto ou Inabalável. Se causar Ruptura, cumpra o requisito de avanço do seu Juramento uma vez, se ainda não o cumpriu neste ciclo. |
| P05 | Reprimenda | Ataque | 1 AP | 2 D / 1 I | 2 | Se o adversário usou uma carta de Reação contra uma ação anterior neste turno, recebe +2 D. |
| P06 | Investida do Bastião | Ataque | 3 AP | 4 D / 3 I | 2 | Se sua Guarda estiver em 4 ou mais, recebe +1 D. |
| P07 | Sentença Sagrada | Ataque | 3 AP | 5 D / 2 I | 3 | Requer Inabalável. Ao declarar, você pode descer para Resoluto. Se fizer isso e o adversário estiver com Guarda 0, recebe +2 D. |
| P08 | Golpe de Retaliação | Ataque | 2 AP | 3 D / 1 I | 2 | Se você usou uma carta de Reação desde o fim do seu último turno, recebe +1 D e +1 I. |
| P09 | Romper a Linha | Ataque | 2 AP | 2 D / 4 I | 3 | Requer Resoluto ou Inabalável. Se estiver Inabalável, você pode descer para Resoluto para receber +1 D. |
| P10 | Lâmina da Aurora | Ataque | 1 AP | 3 D / 0 I | 1 | Se for sua terceira Ação do turno e você estiver Resoluto ou Inabalável, recebe +2 D. |
| P11 | Preparar o Bastião | Técnica | 1 AP | — | 1 | No fim deste turno, ganhe +1 Reserva além da conversão normal, respeitando o máximo de 2. |
| P12 | Consagrar Arma | Técnica | 1 AP | — | 2 | Requer Resoluto ou Inabalável. Seu próximo Ataque neste turno recebe +1 D e +2 I. |
| P13 | Renovar o Juramento | Técnica | 1 AP | — | 2 | Suba 1 estado de Convicção, máximo Inabalável. Você não pode realizar outra Técnica neste turno. |
| P14 | Marcha Implacável | Técnica | 1 AP | — | 2 | Seu próximo Ataque de custo impresso 2 AP ou mais custa 1 AP a menos, mínimo 1. |
| P15 | Bloqueio de Torre | Reação | 1 R | — | 1 | Reduza 3 I. Se impedir Ruptura, aplique normalmente a condição de avanço do Juramento da Proteção caso seja o seu Juramento. |
| P16 | Égide Sagrada | Reação | 1 R | — | 1 | Requer Resoluto ou Inabalável. Reduza 2 D e 2 I. |
| P17 | Repreensão Divina | Reação | 2 R | — | 2 | Requer Resoluto ou Inabalável. Reduza 3 D. Se o Dano final for 0, o adversário perde 2 de Vida. |
| P18 | Permanecer de Pé | Reação | 2 R | — | 2 | Só contra um Ataque que causaria Ruptura. Reduza 4 I. |
| P19 | Escudo e Espada | Reação | 1 R | — | 2 | Requer Resoluto ou Inabalável. Reduza 2 D e 1 I. Se ainda perder Vida, seu primeiro Ataque no próximo turno recebe +1 D. |
| P20 | Não Passará | Reação | 2 R | — | 3 | Requer Inabalável. Reduza 3 D e 3 I. Depois da resolução, desça para Resoluto. |

## Dez passivas

- Muralha Viva — revele quando impedir sua primeira Ruptura. Depois disso, na primeira vez de cada turno inimigo em que impedir Ruptura, se estiver Vacilante, suba para Resoluto.
- Fé no Aço — revele quando terminar um turno com Guarda 6 e Reserva 2. Depois disso, enquanto começar o turno com Guarda 6, seu primeiro Ataque recebe +1 I.
- Justiça Imediata — revele quando perder 4 ou mais de Vida de um Ataque. Depois disso, seu primeiro Ataque no próximo turno pode ser usado como se seu estado estivesse 1 nível acima para verificar requisito.
- Escudo do Justo — revele quando uma Reação reduzir Dano e Impacto ao mesmo tempo. Depois disso, na primeira vez de cada turno inimigo que isso acontecer, se estiver Vacilante, suba para Resoluto.
- Convicção Ardente — revele ao alcançar Inabalável pela primeira vez. Depois disso, o primeiro Ataque de cada turno usado enquanto estiver Inabalável recebe +1 D.
- Avanço Sagrado — revele quando provocar sua primeira Ruptura. Depois disso, o primeiro Ataque de cada turno contra Guarda 0 recebe +1 D.
- Sem Recuo — revele quando terminar um turno sem Reserva depois de realizar 3 Ações. Depois disso, quando repetir essa situação, seu primeiro Ataque no próximo turno recebe +1 D.
- Voto Cumprido — revele quando cumprir o requisito de avanço do seu Juramento pela segunda vez. Depois disso, a primeira vez em cada rodada que cumprir esse requisito, sua próxima ação recebe +1 D ou +1 I se for ofensiva.
- Guardião da Luz — revele ao chegar a 10 de Vida ou menos. Depois disso, sua Defesa Inata usa o valor de Resoluto mesmo se você estiver Vacilante.
- Peso da Sentença — revele quando descer voluntariamente um estado para fortalecer uma habilidade ofensiva. Depois disso, a primeira vez em cada turno que fizer isso, a habilidade recebe +1 D ou +1 I.

## Seis Cartas de Classe

O Paladino escolhe 1 Juramento e 1 Aura.

### Juramento da Proteção

Cumprimento: a primeira vez em cada rodada que impedir Ruptura com uma Resposta, suba 1 estado.

Ativar: quando usar uma Reação, ela reduz +1 D e +1 I.

Exaurir: quando um Ataque causaria Ruptura, o Impacto final se torna 0 e reduza +2 D.

### Juramento da Retribuição

Cumprimento: a primeira vez em cada próprio turno que um Ataque seu causar Dano à Vida depois de você ter perdido Vida de um Ataque desde o fim do seu último turno, suba 1 estado.

Ativar: depois que perder Vida de um Ataque, seu próximo Ataque recebe +1 D.

Exaurir: depois que perder Vida de um Ataque, o adversário perde 3 de Vida e você sobe 1 estado.

### Juramento da Conquista

Cumprimento: a primeira vez em cada próprio turno que provocar Ruptura, suba 1 estado.

Ativar: ao declarar um Ataque contra um adversário com 3 ou menos de Guarda, ele recebe +1 I.

Exaurir: ao declarar um Ataque, ele recebe +2 D e +3 I.

### Aura do Santuário

Ativar: quando terminar seu turno com 2 de Reserva, suba 1 estado se estiver Vacilante.

Exaurir: durante o turno adversário, antes de jogar uma Reação, ajuste sua Reserva para 2.

### Aura da Coragem

Ativar: quando declarar seu primeiro Ataque do turno, ele recebe +1 D.

Exaurir: seu próximo Ataque neste turno custa 1 AP a menos, mínimo 1, e recebe +2 D.

### Aura do Julgamento

Ativar: quando declarar uma habilidade ofensiva enquanto estiver Resoluto ou Inabalável, ela recebe +1 I.

Exaurir: ao declarar um Ataque, desça 1 estado. Ele recebe +3 D. Se a descida foi de Inabalável para Resoluto, recebe também +1 I.

## Três Ultimates

- Veredito do Sol — Ataque. 3 AP. Requer Inabalável. 7 D / 3 I. Depois da resolução, desça para Resoluto. Se causar Ruptura, permaneça Inabalável em vez disso.
- Fortaleza Inquebrável — Reação. 2 R. Requer Inabalável. Dano e Impacto finais da ação se tornam 0. Depois da resolução, ajuste sua Guarda para 6 e desça para Resoluto.
- Cruzada Final — Técnica. 2 AP. Requer Resoluto ou Inabalável. Durante o restante do turno, depois que até 2 Ataques seus resolverem, recupere 1 AP. O limite normal de 3 Ações continua valendo. Depois do turno, desça 1 estado.

---

# LADINO

## Mecânica

O Ladino pode criar até 3 fichas de Brecha sobre o adversário. Brecha não é Condição.

Brechas criadas durante o turno inimigo permanecem até o fim do próximo turno do Ladino. No fim do turno do Ladino, todas as Brechas não consumidas desaparecem.

Defesa Inata — Esquiva Calculada: uma vez por turno inimigo, reduza 2 D e 1 I. Se o Dano final se tornar 0, crie 1 Brecha.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| L01 | Corte Rápido | Ataque | 1 AP | 2 D / 1 I | 1 | Se for sua primeira Ação, recebe +1 D. |
| L02 | Finta | Ataque | 1 AP | 1 D / 1 I | 1 | Se o adversário usar uma carta de Reação, recupere 1 AP. Se não usar e este Ataque causar Dano à Vida, crie 1 Brecha. |
| L03 | Corte Serrilhado | Ataque | 2 AP | 3 D / 1 I | 2 | Se causar Dano à Vida, aplique Sangramento 1. |
| L04 | Golpe nos Rins | Ataque | 2 AP + consuma 1 Brecha | 2 D / 2 I | 2 | Se for sua segunda Ação, recebe +1 D. Se causar Dano à Vida, aplique Sangramento 1. |
| L05 | Estocada Sombria | Ataque | 2 AP + consuma 1 Brecha | 4 D / 1 I | 2 | Se for sua primeira Ação e o adversário não usar carta de Reação, recebe +2 D. |
| L06 | Punhalada Oportunista | Ataque | 1 AP | 3 D / 0 I | 2 | Só pode ser usada contra Guarda 0. |
| L07 | Corte de Tendão | Ataque | 2 AP | 2 D / 2 I | 2 | Se o adversário já tiver Sangramento, recebe +1 I. |
| L08 | Execução Precisa | Ataque | 3 AP | 4 D / 1 I | 3 | Ao declarar, consuma até 3 Brechas. Recebe +1 D por Brecha consumida. |
| L09 | Ataque de Desarme | Ataque | 2 AP + consuma 1 Brecha | 3 D / 1 I | 3 | Se causar Dano à Vida, escolha uma carta de Reação adversária em CD1 e mova para CD2. |
| L10 | Golpe Final | Ataque | 2 AP + consuma 2 Brechas | 4 D / 0 I | 2 | Se for sua terceira Ação, recebe +2 D. |
| L11 | Preparar a Brecha | Técnica | 1 AP | — | 1 | Crie 1 Brecha. Seu próximo Ataque neste turno recebe +1 I. |
| L12 | Marcar o Alvo | Técnica | 1 AP | — | 2 | Coloque uma Marca de Golpe sobre o adversário. A próxima vez que um Ataque do Ladino causar Dano à Vida, remova a Marca e cause +2 D. Só pode existir 1 Marca de Golpe. |
| L13 | Sabotagem | Técnica | 2 AP + consuma 1 Brecha | — | 3 | Escolha: mova uma habilidade adversária de CD1 para CD2; ou escolha uma Carta de Classe inimiga Pronta e deixe-a Ativada sem resolver seu efeito. |
| L14 | Passo Falso | Técnica | 1 AP | — | 2 | Seu próximo Ataque neste turno recebe +2 D se o adversário usar uma carta de Reação. Se não usar, crie 1 Brecha depois da resolução. |
| L15 | Esquiva | Reação | 1 R | — | 1 | Reduza 3 D. Se o Dano final for 0, crie 1 Brecha. |
| L16 | Adaga de Aparar | Reação | 1 R | — | 1 | Reduza 2 D e 1 I. Se o Dano final for 0, o adversário perde 1 Vida e crie 1 Brecha se ainda houver espaço. |
| L17 | Bomba de Fumaça | Reação | 2 R | — | 2 | Reduza 2 D e 3 I. Efeitos de Cartas de Classe inimigas não podem aumentar esta ação depois que Bomba de Fumaça resolver. |
| L18 | Escapar pelas Sombras | Reação | 2 R + consuma 1 Brecha | — | 3 | Reduza 4 D. Depois da resolução, devolva uma habilidade sua de CD1 à mão. |
| L19 | Contra-ataque Sujo | Reação | 1 R + consuma 1 Brecha | — | 2 | Reduza 2 D. Se o Dano final for 0, aplique Sangramento 1 ao adversário. |
| L20 | Instinto de Sobrevivência | Reação | 2 R + consuma 2 Brechas | — | 3 | Só contra um Ataque que reduziria sua Vida a 0. Reduza 5 D. |

## Dez passivas

- Primeiro Sangue — revele quando causar o primeiro Dano à Vida da partida. Crie 1 Brecha. Depois disso, o primeiro Ataque de cada turno que atingir Vida sem receber Reação recebe +1 D.
- Passos Invisíveis — revele quando o adversário terminar um turno sem causar Dano à sua Vida. No início do seu próximo turno, seu primeiro Ataque custa 1 AP a menos, mínimo 1. Depois disso, esse efeito pode ocorrer novamente uma vez por rodada.
- Predador da Brecha — revele quando o adversário sofrer sua primeira Ruptura. Depois disso, o primeiro Ataque de cada turno contra Guarda 0 recebe +1 D.
- Mãos Rápidas — revele quando realizar 3 Ações pela primeira vez. Depois disso, quando sua terceira Ação custar originalmente 1 AP e for Ataque, ela recebe +1 D ou +1 I.
- Sangue Frio — revele quando chegar a 10 de Vida ou menos. Crie 2 Brechas. Depois disso, enquanto permanecer nessa faixa, sua primeira habilidade de cada turno que consuma Brecha consome 1 a menos, mínimo 0.
- Olho para Reações — revele quando o adversário usar sua segunda carta de Reação na mesma rodada. Depois disso, a primeira vez em cada turno que o adversário usar uma carta de Reação contra seu Ataque, crie 1 Brecha depois da resolução.
- Ferida Aberta — revele quando o adversário alcançar Sangramento 2. Depois disso, seu primeiro Ataque de cada turno contra alguém com Sangramento recebe +1 D.
- Improvisador — revele quando uma habilidade sua voltar da recarga para a mão antes do momento normal. Depois disso, a primeira habilidade que retornar dessa forma em cada turno custa 1 AP a menos se usada no mesmo turno, mínimo 1.
- Sem Testemunhas — revele quando o adversário estiver com Guarda 0 e Sangramento ao mesmo tempo. Depois disso, o primeiro Ataque de cada turno nessa situação recebe +1 D.
- Plano de Fuga — revele quando terminar um turno com 2 de Reserva. Depois disso, a primeira Reação de cada turno inimigo que criaria Brecha cria 1 Brecha adicional, respeitando o máximo de 3.

## Seis Cartas de Classe

O Ladino escolhe 1 Método e 1 Ferramenta.

### Método do Assassino

Ativar: ao atacar um adversário com Guarda 0, o Ataque recebe +1 D.

Exaurir: um Ataque contra Guarda 0 recebe +4 D.

### Método do Duelista

Ativar: quando uma Reação sua reduzir Dano a 0, crie 1 Brecha.

Exaurir: quando responder a um Ataque, reduza +3 D. Se o Dano final for 0, o adversário perde 3 Vida e crie 1 Brecha.

### Método do Sabotador

Ativar: quando uma habilidade sua mover uma carta adversária para um cooldown mais distante ou deixar uma Carta de Classe inimiga Ativada por Sabotagem, crie 1 Brecha.

Exaurir: escolha até 2 habilidades adversárias atualmente em cooldown e mova cada uma 1 etapa para mais longe da mão.

### Lâminas Serrilhadas

Ativar: quando um Ataque causar Dano à Vida, aplique Sangramento 1.

Exaurir: o Ataque recebe +1 D e, se causar Dano à Vida, aplique Sangramento 2.

### Frasco de Fumaça

Ativar: quando usar uma Reação, ela reduz +1 D ou +1 I.

Exaurir: quando usar uma Reação, ela reduz +2 D e +2 I.

### Fio Oculto

Ativar: quando sua segunda ou terceira Ação for um Ataque, ele recebe +1 I.

Exaurir: aquele Ataque recebe +2 D e +2 I. Se causar Ruptura, crie 2 Brechas.

## Três Ultimates

- Golpe Perfeito — Ataque. 3 AP. Consuma até 3 Brechas. 8 D / 0 I. Se o adversário estiver com Guarda 0, recebe +2 D. Exige ao menos 2 Brechas para ser declarado.
- Mil Cortes — Ataque. 3 AP. Consuma 2 Brechas. 4 D / 2 I. Depois da resolução, recebe +2 D por Ação anterior realizada neste turno, até +4 D.
- Desaparecer — Reação. 2 R. Consuma 3 Brechas. O Dano final se torna 0. Depois da resolução, devolva imediatamente até 2 habilidades suas de CD1 para a mão.

---
# BARDO

## Mecânica

O Bardo não possui recurso numérico. Cada Ação possui uma Nota: Pulso, Melodia ou Harmonia.

Quando duas Ações consecutivas do Bardo possuem Notas diferentes, ocorre Cadência.

Diversas cartas verificam a Nota anterior, quantas Notas diferentes apareceram no turno ou se o Bardo produziu uma ou duas Cadências.

Defesa Inata — Contratempo: uma vez por turno inimigo, reduza 1 D e 1 I.

## Vinte habilidades

| ID | Carta | Nota | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---|---:|---:|---:|---|
| B01 | Batida Marcial | Pulso | Ataque | 1 AP | 2 D / 1 I | 1 | Se for sua primeira Ação, recebe +1 I. |
| B02 | Corda Cortante | Melodia | Ataque | 2 AP | 3 D / 1 I | 1 | Se a Ação imediatamente anterior foi Pulso, recebe +1 D. |
| B03 | Acorde Estridente | Harmonia | Ataque | 2 AP | 3 D / 2 I | 2 | Só recebe o bônus se você já produziu Cadência neste turno. Se a Ação anterior foi Melodia, recebe +1 I. |
| B04 | Crescendo | Pulso | Ataque | 3 AP | 4 D / 2 I | 2 | Recebe +1 D por Nota diferente usada anteriormente neste turno, máximo +2 D. |
| B05 | Nota Perfurante | Melodia | Ataque | 2 AP | 2 D / 3 I | 2 | Se causar Ruptura, sua próxima Ação neste turno custa 1 AP a menos, mínimo 1. |
| B06 | Refrão Cortante | Harmonia | Ataque | 1 AP | 3 D / 0 I | 2 | Só pode ser usado se você já produziu Cadência neste turno. Se for sua terceira Ação, recebe +1 D. |
| B07 | Dissonância | Harmonia | Ataque | 2 AP | 3 D / 1 I | 2 | Se o adversário usar uma carta de Reação e este Ataque ainda causar Dano à Vida, sua próxima Ação neste turno recebe +1 D ou +1 I se for Ataque. |
| B08 | Pancada de Compasso | Pulso | Ataque | 2 AP | 3 D / 2 I | 2 | Se o adversário estiver com Reserva 0 ao declarar, recebe +1 D. |
| B09 | Arpejo de Guerra | Melodia | Ataque | 3 AP | 5 D / 1 I | 3 | Se as 2 Ações anteriores tiveram Notas diferentes entre si, recebe +1 D e +1 I. |
| B10 | Afinar | Melodia | Técnica | 1 AP | — | 1 | Escolha a Nota de sua próxima Ação neste turno apenas para verificar Cadência. O texto e o tipo da próxima carta não mudam. |
| B11 | Improviso | escolha ao jogar | Técnica | 1 AP | — | 2 | Escolha Pulso, Melodia ou Harmonia. Se a próxima Ação tiver Nota diferente, ela recebe +1 D ou +1 I se for Ataque. |
| B12 | Preparar o Refrão | Harmonia | Técnica | 1 AP | — | 2 | A próxima Ação neste turno com Nota diferente custa 1 AP a menos, mínimo 1. |
| B13 | Mudança de Tom | Melodia | Técnica | 1 AP | — | 2 | Só pode ser usada se você já produziu Cadência neste turno. Mova uma habilidade sua de CD2 para CD1. |
| B14 | Pausa Dramática | Pulso | Técnica | 1 AP | — | 2 | No fim deste turno, ganhe +1 Reserva além da conversão normal, respeitando o máximo de 2. |
| B15 | Desafinar | Harmonia | Técnica | 2 AP | — | 3 | Requer que você tenha produzido Cadência neste turno. A próxima carta de Reação adversária neste turno reduz 1 D e 1 I a menos. Se não houver Reação, sua terceira Ação, se for Ataque, recebe +1 D. |
| B16 | Contracanto | — | Reação | 1 R | — | 1 | Reduza 2 D e 1 I. Se estiver respondendo à segunda ou terceira Ação inimiga, deixe Pronta uma Passiva sua Ativada, se houver. |
| B17 | Quebra de Ritmo | — | Reação | 1 R | — | 1 | Reduza 3 I. Se impedir Ruptura, sua primeira Ação no próximo turno recebe +1 I se for Ataque. |
| B18 | Nota Sustentada | — | Reação | 2 R | — | 2 | Reduza 4 D. |
| B19 | Resposta Improvisada | — | Reação | 1 R | — | 2 | Reduza 2 D. Se estiver respondendo à terceira Ação inimiga, sua primeira Ação do próximo turno custa 1 AP a menos, mínimo 1. |
| B20 | Coda Defensiva | — | Reação | 2 R | — | 3 | Reduza 3 D e 3 I. Depois, deixe Pronta 1 de suas Cartas de Classe Ativadas. |

## Dez passivas

- Ouvido Absoluto — revele quando produzir 2 Cadências no mesmo turno. Depois disso, na primeira vez em cada turno que produzir a segunda Cadência, sua terceira Ação recebe +1 D ou +1 I se for Ataque.
- Crescendo Natural — revele quando realizar 3 Ações com 3 Notas diferentes. Depois disso, a terceira Ação de cada turno, se for Ataque e completar 3 Notas diferentes, recebe +1 D.
- Público Cativo — revele quando o adversário usar cartas de Reação contra 2 Ataques diferentes seus na mesma rodada. Depois disso, a primeira vez em cada próprio turno que o adversário usar uma Reação e o Ataque ainda causar Dano à Vida, sua próxima Ação recebe +1 D se for Ataque.
- Harmonia Defensiva — revele quando uma Reação sua reduzir Dano e Impacto ao mesmo tempo. Depois disso, na primeira vez em cada turno inimigo que isso ocorrer, a Reação reduz +1 D ou +1 I.
- Memória Musical — revele quando uma habilidade sua voltar à mão antes do momento normal. Depois disso, a primeira habilidade de cada próprio turno que retornar dessa forma custa 1 AP a menos se usada no mesmo turno, mínimo 1.
- Ritmo Sustentado — revele quando terminar um turno com 2 de Reserva. Depois disso, na primeira vez em cada turno que produzir Cadência tendo começado aquele turno com 2 de Reserva, sua próxima Ação recebe +1 D ou +1 I se for Ataque.
- Virtuose — revele quando Ativar seu Instrumento pela terceira vez. Depois disso, a primeira vez em cada rodada que Ativar o Instrumento, sua próxima Ação recebe +1 D ou +1 I se for Ataque.
- Canção Inesquecível — revele quando Ativar sua Canção pela terceira vez. Depois disso, a primeira Ativação da Canção a cada rodada aumenta em 1 um valor numérico adequado do efeito.
- Último Refrão — revele quando chegar a 10 de Vida ou menos. Depois disso, sua terceira Ação de cada turno custa 1 AP a menos se você já produziu 2 Cadências naquele turno, mínimo 1.
- Silêncio Antes do Aplauso — revele quando realizar apenas 1 Ação num turno e terminar com 2 de Reserva. No próximo turno, seu primeiro Ataque recebe +2 D. Depois disso, quando repetir a preparação, recebe +1 D em vez de +2.

## Seis Cartas de Classe

O Bardo escolhe 1 Canção e 1 Instrumento.

### Canção da Marcha

Ativar: quando produzir Cadência, seu próximo Ataque neste turno recebe +1 I.

Exaurir: ao declarar sua terceira Ação depois de ter produzido 2 Cadências neste turno, se ela for Ataque, recebe +2 D e +2 I.

### Canção do Lamento

Ativar: quando um Ataque inimigo for causar pelo menos 3 D antes das reduções, reduza 1 D.

Exaurir: nas mesmas condições, reduza 4 D.

### Canção da Discórdia

Ativar: quando o adversário usar uma carta de Reação contra seu Ataque, depois da resolução, se o Ataque ainda causar Dano à Vida, sua próxima Ação neste turno recebe +1 D ou +1 I se for Ataque.

Exaurir: quando uma Reação for declarada contra seu Ataque, depois de aplicar a redução da Reação, o Ataque recebe +3 D.

### Tambor de Guerra

Ativar: quando jogar um Ataque de Pulso, ele recebe +1 I.

Exaurir: o Ataque de Pulso recebe +3 I. Se causar Ruptura, sua próxima Ação neste turno custa 1 AP a menos, mínimo 1.

### Alaúde de Cristal

Ativar: depois que uma Ação de Melodia resolver, mova uma habilidade sua de CD2 para CD1.

Exaurir: depois que uma Ação de Melodia resolver, devolva qualquer habilidade sua em cooldown para a mão. Se usar neste turno, custa +1 AP.

### Flauta de Prata

Ativar: depois que uma Ação de Harmonia resolver no seu turno, no fim daquele turno ganhe +1 Reserva além da conversão normal, máximo 2.

Exaurir: durante o turno adversário, antes de responder a uma Ação, ajuste sua Reserva para 2.

## Três Ultimates

- Grande Finale — Ataque. 3 AP. 5 D / 2 I. Só pode ser declarado como terceira Ação se as 2 Ações anteriores tiverem Notas diferentes. Recebe +2 D para cada uma dessas Notas que ainda não se repetiu no turno, máximo +4 D.
- Bis — Técnica. 2 AP. Deixe Prontas sua Canção e seu Instrumento. Devolva 1 habilidade sua de CD1 para a mão e recupere 1 AP. O limite normal de 3 Ações permanece.
- Silêncio da Plateia — Reação. 2 R. O Dano e o Impacto finais da ação se tornam 0. Depois, deixe Prontas sua Canção e seu Instrumento.

---

# MONGE

## Mecânica

O Monge possui 3 pedras de Chi. Todas começam Prontas.

Gastar Chi vira pedras para o lado Gasto.

A primeira vez em cada turno que uma Ação de Fluxo vier imediatamente depois de uma Abertura, recupere 1 Chi Gasto.

Quando completar Abertura, Fluxo e Finalização nessa ordem, recupere 1 Chi Gasto adicional.

Defesa Inata — Desvio Circular: uma vez por turno inimigo, gaste 1 Chi para reduzir 1 D e 2 I.

Disciplina do Passo: uma vez por próprio turno, quando um efeito adversário aumentar o custo em AP de uma habilidade do Monge, gaste 1 Chi para ignorar 1 ponto desse aumento.

## Vinte habilidades

| ID | Carta | Etapa | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---|---:|---:|---:|---|
| MO01 | Palma de Ferro | Abertura | Ataque | 1 AP | 2 D / 1 I | 1 | Se for sua primeira Ação, recebe +1 I. |
| MO02 | Chute do Calcanhar | Abertura | Ataque | 2 AP | 3 D / 2 I | 1 | Se o adversário estiver com Guarda 6, recebe +1 I. |
| MO03 | Toque dos Nervos | Abertura | Ataque | 2 AP + 1 Chi | 2 D / 2 I | 2 | Sua próxima Ação de Fluxo neste turno recebe +1 D. |
| MO04 | Passo do Vento | Fluxo | Ataque | 1 AP | 2 D / 1 I | 1 | Se vier imediatamente depois de Abertura, recebe +1 D. |
| MO05 | Joelhada Ascendente | Fluxo | Ataque | 2 AP | 3 D / 2 I | 2 | Se vier imediatamente depois de Abertura, recebe +1 I. |
| MO06 | Cotovelo Giratório | Fluxo | Ataque | 2 AP + 1 Chi | 4 D / 1 I | 2 | Se o adversário usar uma carta de Reação, recupere 1 Chi Gasto depois da resolução. |
| MO07 | Punho do Dragão | Finalização | Ataque | 2 AP + 1 Chi | 4 D / 2 I | 2 | Se vier imediatamente depois de Fluxo, recebe +1 D. |
| MO08 | Martelo Descendente | Finalização | Ataque | 3 AP | 5 D / 2 I | 2 | Se provocar Ruptura depois de Fluxo, recupere 1 Chi Gasto. |
| MO09 | Punho do Vazio | Finalização | Ataque | 2 AP + 2 Chi | 4 D / 1 I | 2 | Se completar um Kata neste turno, recebe +2 D. |
| MO10 | Varredura Final | Finalização | Ataque | 1 AP | 2 D / 2 I | 2 | Se completar um Kata e provocar Ruptura, seu primeiro Ataque no próximo turno recebe +1 D. |
| MO11 | Respiração Centrada | Abertura | Técnica | 1 AP | — | 2 | Recupere até 2 Chi Gastos. |
| MO12 | Passo sem Sombra | Fluxo | Técnica | 1 AP | — | 2 | Se vier depois de Abertura, sua próxima Finalização neste turno custa 1 AP a menos, mínimo 1. |
| MO13 | Quebrar o Ritmo | Abertura | Técnica | 1 AP | — | 2 | Seu próximo Ataque de Fluxo neste turno recebe +2 I. |
| MO14 | Circular Energia | Fluxo | Técnica | 1 AP + 1 Chi | — | 2 | Sua próxima Finalização recebe +1 D e +1 I. Se completar Kata, a Finalização entra em uma zona de cooldown mais próxima da mão. |
| MO15 | Selar o Kata | Finalização | Técnica | 1 AP | — | 3 | Só depois de Fluxo. Se a Ação anterior ao Fluxo foi Abertura, complete o Kata e devolva 1 habilidade sua de CD1 à mão. |
| MO16 | Antebraço de Pedra | — | Reação | 1 R | — | 1 | Reduza 2 D e 2 I. Se impedir Ruptura, recupere 1 Chi Gasto. |
| MO17 | Desvio Lateral | — | Reação | 1 R | — | 1 | Reduza 3 D. |
| MO18 | Redirecionar Força | — | Reação | 1 R + 1 Chi | — | 1 | Reduza 3 I. Se o Impacto final se tornar 0, seu próximo Ataque de Abertura recebe +1 I. |
| MO19 | Contra-Golpe | — | Reação | 2 R + 1 Chi | — | 2 | Reduza 2 D. Se o Dano final for 0, o adversário perde 2 Vida. |
| MO20 | Corpo Vazio | — | Reação | 2 R + 2 Chi | — | 3 | Reduza 3 D e 3 I. |

## Dez passivas

- Disciplina Perfeita — revele ao completar seu primeiro Kata. Depois disso, a primeira vez em cada próprio turno que completar um Kata, recupere 1 Chi Gasto adicional.
- Primeiro Passo — revele quando uma Abertura produzir pelo menos 3 pontos somados entre Dano e Impacto depois das reduções. Depois disso, sua primeira Abertura de cada turno recebe +1 I.
- Fluxo Contínuo — revele quando uma Ação de Fluxo recuperar Chi pelo Fluxo Interior. Depois disso, a primeira Ação de Fluxo de cada turno que vier depois de Abertura recebe +1 D ou +1 I.
- Golpe Derradeiro — revele quando uma Finalização provocar Ruptura. Depois disso, a primeira Finalização de cada turno jogada depois de Fluxo recebe +1 D.
- Mente Imóvel — revele quando terminar um turno com 2 de Reserva. Depois disso, sua primeira Reação de cada turno inimigo que custe Chi custa 1 Chi a menos, mínimo 0.
- Dor como Mestre — revele quando perder 4 ou mais de Vida de um Ataque. Recupere até 2 Chi Gastos. Depois disso, na primeira vez por turno inimigo que perder 4 ou mais, recupere 1 Chi Gasto.
- Respiração Profunda — revele quando começar um turno com as 3 pedras de Chi Gastas. Recupere 2. Depois disso, sempre que começar um turno sem Chi Pronto, recupere 1.
- Forma Adaptável — revele quando Postura do Rio modificar uma sequência pela primeira vez. Depois disso, uma vez por próprio turno, gaste 1 Chi para considerar uma Ação que quebraria a sequência como a etapa correta apenas para recuperar Chi do Fluxo Interior. Isso não completa Kata sozinho.
- Corpo e Espírito — revele quando uma Reação impedir Ruptura e reduzir o Dano final a 0 ao mesmo tempo. Depois disso, na primeira vez em cada turno inimigo que isso ocorrer, recupere 1 Chi Gasto e restaure 1 Guarda.
- Último Mestre — revele quando chegar a 10 de Vida ou menos. Recupere até 2 Chi Gastos. Depois disso, sua primeira Finalização de cada turno custa 1 Chi a menos, mínimo 0.

## Seis Cartas de Classe

O Monge escolhe 1 Postura e 1 Mantra.

### Postura do Tigre

Ativar: quando uma Finalização for jogada imediatamente depois de Fluxo, se for Ataque, recebe +1 D.

Exaurir: nas mesmas condições, o Ataque recebe +3 D e +1 I.

### Postura da Garça

Ativar: quando uma Reação reduzir o Dano final a 0, recupere 1 Chi Gasto.

Exaurir: quando usar uma Reação, ela reduz +3 D e +2 I.

### Postura do Rio

Ativar: quando uma Ação quebraria sua sequência, trate-a como a etapa necessária naquele momento apenas para determinar a sequência do Kata. O texto e os valores não mudam.

Exaurir: antes de jogar uma Ação, escolha Abertura, Fluxo ou Finalização. Aquela Ação conta como a etapa escolhida e, se for Ataque, recebe +1 D e +1 I.

### Mantra do Fôlego

Ativar: quando recuperar Chi por Fluxo Interior, recupere 1 Chi Gasto adicional.

Exaurir: deixe as 3 pedras de Chi Prontas.

### Mantra do Vazio

Ativar: quando gastar Chi em uma Reação, ela reduz +1 D ou +1 I.

Exaurir: quando usar uma Reação, ela reduz +2 D e +2 I.

### Mantra do Retorno

Ativar: depois de completar um Kata, escolha 1 das 3 cartas usadas. Quando entrar em cooldown, coloque-a uma etapa mais próxima da mão.

Exaurir: depois de completar um Kata, escolha 1 das cartas usadas e devolva-a diretamente à mão em vez de colocá-la em cooldown.

## Três Ultimates

- Punho dos Cem Ecos — Finalização/Ataque. 3 AP + 3 Chi. 6 D / 2 I. Se as 2 Ações imediatamente anteriores foram Abertura seguida de Fluxo, recebe +3 D e +2 I.
- Mente Vazia — Reação. 2 R + 3 Chi. O Dano e o Impacto finais do Ataque se tornam 0. Depois da resolução, recupere 1 Chi Gasto.
- Três Portões — Abertura/Técnica. 1 AP + 3 Chi. Durante o restante do turno, a primeira Ação de Fluxo e a primeira Finalização custam 1 AP a menos, mínimo 1. Se completar Kata, as 3 cartas entram no cooldown uma etapa mais próxima da mão.

---
# PATRULHEIRO

## Mecânica

O Patrulheiro possui uma única Marca da Presa. Ela fica sobre o adversário. Algumas cartas usam a Marca sem consumi-la. Outras Exploram a Marca e a removem depois da resolução.

Defesa Inata — Recuo Tático: uma vez por turno inimigo, reduza 1 D e 1 I.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| R01 | Flecha de Sondagem | Ataque | 1 AP | 2 D / 1 I | 1 | Se causar Dano à Vida e o adversário ainda não estiver Marcado, aplique a Marca da Presa. |
| R02 | Tiro Preciso | Ataque | 2 AP | 4 D / 0 I | 2 | Se o alvo estiver Marcado, pode Explorar a Marca para receber +2 D. |
| R03 | Flecha de Caça | Ataque | 2 AP | 3 D / 2 I | 1 | Contra alvo Marcado, recebe +1 I sem consumir a Marca. |
| R04 | Tiro Rompe-Guarda | Ataque | 2 AP | 2 D / 3 I | 2 | Pode Explorar a Marca antes da resolução para receber +2 I. |
| R05 | Disparo Serrilhado | Ataque | 2 AP | 3 D / 1 I | 2 | Se atingir a Vida de um alvo Marcado, aplique Sangramento 1. A Marca não é consumida. |
| R06 | Disparo em Movimento | Ataque | 1 AP | 2 D / 0 I | 1 | Se for sua segunda ou terceira Ação e o alvo estiver Marcado, recebe +1 D. |
| R07 | Flecha de Impacto | Ataque | 3 AP | 4 D / 3 I | 3 | Pode Explorar a Marca para receber +2 I. |
| R08 | Tiro de Execução | Ataque | 3 AP | 6 D / 0 I | 3 | Só contra alvo Marcado com Guarda 0. Explora obrigatoriamente a Marca e recebe +2 D. |
| R09 | Disparo de Cobertura | Ataque | 2 AP | 3 D / 1 I | 2 | Se o adversário usar uma carta de Reação, no fim do turno ganhe +1 Reserva, máximo 2. |
| R10 | Flecha Rápida | Ataque | 1 AP | 2 D / 1 I | 1 | Se a Ação imediatamente anterior foi Técnica, recebe +1 D. |
| R11 | Marcar a Presa | Técnica | 1 AP | — | 1 | Aplique a Marca da Presa. Se o alvo já estiver Marcado, seu próximo Ataque neste turno recebe +1 I. |
| R12 | Ajustar a Mira | Técnica | 1 AP | — | 1 | Seu próximo Ataque contra alvo Marcado recebe +1 D e +1 I. |
| R13 | Preparar Emboscada | Técnica | 1 AP | — | 2 | Escolha 1 Ataque da mão e coloque face-down no terceiro espaço de Ação. No próximo turno, ele está reservado para ser a terceira Ação e custa 1 AP a menos, mínimo 1. Se não for usado até o fim daquele turno, volta à mão. |
| R14 | Reposicionar Armadilha | Técnica | 1 AP | — | 3 | Deixe Pronta sua Carta de Classe do tipo Armadilha se estiver Ativada. |
| R15 | Paciência do Caçador | Técnica | 1 AP | — | 2 | Se o adversário estiver Marcado e você não Explorar a Marca neste turno, seu primeiro Ataque no próximo turno custa 1 AP a menos, mínimo 1. |
| R16 | Esquiva Lateral | Reação | 1 R | — | 1 | Reduza 3 D. |
| R17 | Aparar com o Arco | Reação | 1 R | — | 1 | Reduza 1 D e 2 I. |
| R18 | Retirada Calculada | Reação | 2 R | — | 2 | Reduza 2 D e 2 I. Se o adversário ainda não estiver Marcado, aplique a Marca. |
| R19 | Disparo de Reação | Reação | 2 R | — | 2 | Reduza 2 D. Se o Dano final for 0, o adversário perde 2 Vida. Se ainda não estiver Marcado, aplique a Marca. |
| R20 | Instinto de Caça | Reação | 1 R | — | 2 | Reduza 2 I. Se impedir Ruptura, aplique a Marca se ela ainda não existir. |

## Dez passivas

- Predador Paciente — revele quando passar um turno completo mantendo a Marca sem Explorar. Depois disso, o primeiro Ataque que Explorar uma Marca mantida por pelo menos um turno inteiro recebe +1 D.
- Olho Firme — revele quando um Ataque preparado por Emboscada acertar a Vida. Depois disso, a próxima vez que usar um Ataque preparado por Emboscada, ele recebe +1 D. Esse bônus ocorre apenas uma vez após a revelação.
- Pista Fresca — revele quando aplicar a Marca pela segunda vez na partida. Depois disso, sempre que uma nova Marca for aplicada, o próximo Ataque contra aquele alvo recebe +1 I.
- Sem Escapatória — revele quando começar seu turno com o adversário Marcado e sem Reserva. Seu primeiro Ataque recebe +1 D. Depois disso, Ative uma vez por turno sempre que a mesma condição ocorrer para repetir o bônus.
- Mestre das Armadilhas — revele quando uma Armadilha for Ativada pela segunda vez. Depois disso, na primeira vez a cada rodada em que uma Armadilha for Ativada, mova uma Técnica sua de CD2 para CD1.
- Respiração Controlada — revele quando realizar apenas 1 Ataque num turno e terminar com 2 de Reserva. No próximo turno, seu primeiro Ataque recebe +1 D e +1 I.
- Caçador Incansável — revele quando a Marca for Explorada pela terceira vez. Depois disso, a primeira habilidade de cada turno que aplicar nova Marca custa 1 AP a menos, mínimo 1.
- Flecha Guardada — revele quando uma habilidade sua voltar à mão antes do momento normal. Depois disso, a primeira habilidade que retornar dessa forma em cada turno recebe +1 D se for Ataque.
- Sobrevivente do Ermo — revele quando impedir Ruptura com uma Reação. Depois disso, na primeira vez em cada turno inimigo que impedir Ruptura, seu próximo Ataque recebe +1 I.
- Última Caçada — revele quando chegar a 10 de Vida ou menos. Aplique imediatamente a Marca se ela não estiver presente. Depois disso, a primeira vez em cada turno que Explorar uma Marca, o Ataque recebe +1 D.

## Seis Cartas de Classe

O Patrulheiro escolhe 1 Estilo de Caça e 1 Armadilha.

### Estilo do Atirador

Ativar: quando Explorar uma Marca com um Ataque, ele recebe +1 D.

Exaurir: durante uma Exploração de Marca, o Ataque recebe +3 D.

### Estilo do Rastreador

Ativar: depois que Explorar uma Marca, no fim daquele turno aplique novamente a Marca da Presa.

Exaurir: depois que Explorar uma Marca, aplique imediatamente uma nova Marca. Isso permite Explorar de novo no mesmo turno por outro efeito.

### Estilo do Emboscador

Ativar: quando usar um Ataque colocado por Preparar Emboscada, ele recebe +1 D e +1 I.

Exaurir: aquele Ataque recebe +3 D e +1 I.

### Laço de Caça

Ativar: quando o adversário declarar a terceira Ação do turno, se for Ataque, ela recebe -1 D e -2 I. Se for Técnica, ela resolve e depois entra 1 etapa de cooldown mais distante.

Exaurir: contra a terceira Ação, se for Ataque, recebe -3 D e -3 I. Se for Técnica, resolve e depois vai para CD3.

### Estacas Ocultas

Ativar: depois que o adversário concluir o segundo Ataque no mesmo turno, ele perde 1 Vida.

Exaurir: depois do segundo Ataque, ele perde 3 Vida e recebe a Marca da Presa se ainda não estiver Marcado.

### Fio de Tropeço

Ativar: quando um Ataque inimigo com pelo menos 3 I for declarado, reduza 2 I.

Exaurir: reduza 4 I daquele Ataque.

## Três Ultimates

- Olho do Predador — Ataque. 3 AP. 7 D / 1 I. Só contra alvo Marcado. Explora obrigatoriamente a Marca. Se o adversário estiver com Guarda 0, recebe +3 D.
- Chuva de Flechas — Ataque. 3 AP. 5 D / 4 I. Se o adversário estiver Marcado, recebe +1 D e +1 I, sem consumir a Marca.
- Caçada sem Saída — Técnica. 2 AP. Se o adversário não estiver Marcado, aplique a Marca. Deixe Pronta sua Armadilha se estiver Ativada. Seu próximo Ataque neste turno custa 1 AP a menos, recebe +1 D e +1 I. O limite normal de 3 Ações permanece.

---

# BÁRBARO

## Mecânica

A própria Guarda é o combustível do Bárbaro.

Com Guarda entre 4 e 6, está Contido. Com Guarda entre 1 e 3, está Enfurecido. Com Guarda 0, está Desencadeado.

Habilidades normais podem reduzir voluntariamente no máximo 2 pontos da própria Guarda durante o próprio turno. Ultimates e efeitos de Exaurir Cartas de Classe podem ultrapassar esse limite.

Reduzir a própria Guarda como custo não causa Ruptura.

Defesa Inata — Aguentar na Carne: uma vez por turno inimigo, se possuir pelo menos 1 Guarda, reduza voluntariamente sua Guarda em 1 para reduzir 2 D de um Ataque.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| BA01 | Machado Curto | Ataque | 1 AP | 2 D / 1 I | 1 | Se estiver Enfurecido, recebe +1 D. |
| BA02 | Ombro Selvagem | Ataque | 2 AP | 3 D / 2 I | 1 | Pode reduzir voluntariamente a própria Guarda em 1 para receber +1 I. |
| BA03 | Golpe Temerário | Ataque | 2 AP | 4 D / 1 I | 2 | Pode reduzir voluntariamente a própria Guarda em 2 para receber +2 D. |
| BA04 | Investida Bestial | Ataque | 2 AP | 3 D / 3 I | 2 | Se estiver Enfurecido ou Desencadeado, recebe +1 I. |
| BA05 | Quebra-Crânio | Ataque | 3 AP | 5 D / 2 I | 2 | Se estiver Desencadeado, recebe +2 D. |
| BA06 | Corte em Frenesi | Ataque | 1 AP | 2 D / 0 I | 1 | Se a Ação anterior foi Ataque e você estiver Enfurecido ou Desencadeado, recebe +2 D. |
| BA07 | Machado Arremessado | Ataque | 2 AP | 4 D / 0 I | 2 | Não depende de sacrificar Guarda. |
| BA08 | Golpe de Sangue | Ataque | 2 AP | 3 D / 1 I | 2 | Se estiver com 15 de Vida ou menos, recebe +2 D. |
| BA09 | Martelo da Fera | Ataque | 3 AP | 4 D / 4 I | 3 | Pode reduzir voluntariamente a própria Guarda em 2 para receber +1 D e +1 I. |
| BA10 | Fúria Final | Ataque | 3 AP | 6 D / 1 I | 3 | Só pode ser usada enquanto estiver Desencadeado. Recebe +1 D por Ataque anterior neste turno, máximo +2 D. |
| BA11 | Rugido de Guerra | Técnica | 1 AP | — | 1 | Seu próximo Ataque recebe +1 D e +1 I. Se estiver Enfurecido ou Desencadeado, recebe +1 D adicional. |
| BA12 | Quebrar Limites | Técnica | 1 AP | — | 2 | Reduza voluntariamente sua Guarda em 2. Seu próximo Ataque custa 1 AP a menos, mínimo 1. |
| BA13 | Frenesi | Técnica | 1 AP | — | 2 | Os próximos 2 Ataques deste turno recebem +1 D. Depois que cada um resolver, reduza voluntariamente sua Guarda em 1, respeitando o limite normal de 2 por turno. |
| BA14 | Desafiar a Dor | Técnica | 1 AP | — | 2 | Só com 15 de Vida ou menos. Seu próximo Ataque recebe +2 D. Você não pode restaurar Guarda por efeitos próprios neste turno. |
| BA15 | Grito Ameaçador | Técnica | 1 AP | — | 2 | A próxima carta de Reação contra um Ataque seu reduz 1 D e 1 I a menos. |
| BA16 | Pele Grossa | Reação | 1 R | — | 1 | Reduza 3 D. |
| BA17 | Aparar com o Machado | Reação | 1 R | — | 1 | Reduza 3 I. Se impedir Ruptura, seu primeiro Ataque no próximo turno recebe +1 I. |
| BA18 | Aceitar o Golpe | Reação | 1 R | — | 2 | Reduza 1 D. Depois da resolução, reduza voluntariamente a própria Guarda em até 2. Para cada ponto perdido, seu primeiro Ataque no próximo turno recebe +1 D. |
| BA19 | Rugido de Retaliação | Reação | 2 R | — | 2 | Reduza 2 D e 2 I. Se ainda perder Vida, seu primeiro Ataque no próximo turno recebe +1 D. |
| BA20 | Último Fôlego | Reação | 2 R | — | 3 | Só contra um Ataque que reduziria sua Vida a 0. Reduza 4 D. Depois da resolução, ajuste sua Guarda para 0. |

## Dez passivas

- Sangue Quente — revele na primeira vez que entrar em Enfurecido por reduzir voluntariamente a própria Guarda. Depois disso, a primeira vez em cada próprio turno que fizer essa transição, seu próximo Ataque recebe +1 D.
- Sem Medo — revele na primeira vez que terminar o próprio turno com Guarda 0. Depois disso, sempre que terminar Desencadeado, seu primeiro Ataque no próximo turno recebe +1 D.
- Dor é Combustível — revele quando perder pelo menos 4 de Vida de um único Ataque. Seu primeiro Ataque no próximo turno recebe +2 D. Depois disso, o mesmo evento concede +1 D.
- Quebra-Ossos — revele quando provocar sua primeira Ruptura. Depois disso, seu primeiro Ataque de cada turno contra Guarda 0 recebe +1 D.
- Fera Acuada — revele quando chegar a 10 de Vida ou menos. Depois disso, enquanto permanecer nessa faixa, Ataques usados enquanto Enfurecido ou Desencadeado recebem +1 I.
- Sem Reserva — revele quando terminar um turno depois de realizar 3 Ações e ficar sem Reserva. Depois disso, sempre que repetir a situação, seu primeiro Ataque do próximo turno recebe +1 D.
- Pele de Ferro — revele quando uma Reação impedir Ruptura. Depois disso, na primeira vez em cada turno inimigo que isso acontecer, reduza +1 D daquele Ataque.
- Frenesi Crescente — revele quando realizar 3 Ataques no mesmo turno pela primeira vez. Depois disso, o terceiro Ataque de cada turno recebe +1 D enquanto Enfurecido ou Desencadeado.
- Coração Selvagem — revele quando usar voluntariamente a própria Guarda como custo 3 vezes na partida. Depois disso, a primeira vez em cada próprio turno que reduzir Guarda como custo, reduza 1 ponto a menos, mínimo 1.
- Não Vou Cair — revele quando sobreviver a um Ataque com 3 de Vida ou menos. No próximo turno, seu primeiro Ataque recebe +2 D. Depois disso, quando começar um turno com 3 ou menos de Vida, o primeiro Ataque recebe +1 D.

## Seis Cartas de Classe

O Bárbaro escolhe 1 Instinto e 1 Totem.

### Instinto do Berserker

Ativar: quando reduzir voluntariamente a própria Guarda e entrar em Enfurecido, seu próximo Ataque neste turno recebe +1 D.

Exaurir: quando reduzir voluntariamente a própria Guarda até 0, seu próximo Ataque neste turno recebe +4 D.

### Instinto do Colosso

Ativar: quando jogar um Ataque de pelo menos 3 AP enquanto Enfurecido ou Desencadeado, ele recebe +1 I.

Exaurir: aquele Ataque recebe +2 D e +3 I.

### Instinto do Sobrevivente

Ativar: durante o turno inimigo, se estiver Desencadeado, ao receber um Ataque reduza 1 D e 1 I.

Exaurir: quando um Ataque fosse reduzir sua Vida a 0, depois de toda a resolução ajuste sua Vida para 1.

### Totem do Urso

Ativar: quando reduzir voluntariamente a própria Guarda, o próximo Ataque inimigo que causar Dano antes do seu próximo turno causa 1 D a menos.

Exaurir: durante o turno inimigo, reduza 4 D de um único Ataque.

### Totem do Lobo

Ativar: quando jogar um Ataque imediatamente depois de outro Ataque, o segundo recebe +1 D.

Exaurir: um Ataque que seja sua terceira Ação depois de pelo menos 1 Ataque anterior recebe +3 D e +1 I.

### Totem da Tempestade

Ativar: quando provocar Ruptura, aquele Ataque recebe +1 D depois do bônus normal da Ruptura.

Exaurir: quando um Ataque estiver prestes a provocar Ruptura, recebe +2 I antes da resolução. Se a Ruptura acontecer, recebe +2 D adicionais.

## Três Ultimates

- Fim do Mundo — Ataque. 3 AP. 6 D / 3 I. Antes da resolução, pode reduzir voluntariamente toda a própria Guarda restante a 0. Se fizer isso, recebe +4 D e +1 I.
- Frenesi sem Freio — Técnica. 1 AP. Durante o restante do turno, os próximos 2 Ataques custam 1 AP a menos, mínimo 1. Depois que cada um resolver, reduza voluntariamente a Guarda em 2. Este efeito pode ultrapassar o limite normal de sacrifício de Guarda. O limite de 3 Ações permanece.
- Recusar a Morte — Reação. 2 R. Só contra um Ataque que derrotaria você. Depois de toda a resolução, sua Vida fica em 1 e sua Guarda em 0.

---
# DRUIDA

## Mecânica

O Druida começa em Forma Humana.

No início do próprio turno, antes da primeira Ação, pode usar Metamorfose gratuitamente e mudar entre Forma Humana e Forma Selvagem.

Mudanças adicionais no mesmo turno exigem cartas específicas.

Defesa Inata — Instinto Mutável:

- Forma Humana: reduza 1 D e 1 I;
- Forma Selvagem: escolha reduzir 2 D ou 2 I.

Pode ser usada uma vez por turno inimigo como Resposta.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| D01 | Chicote de Raízes | Ataque | 1 AP | 2 D / 1 I | 1 | Na Forma Humana, se for sua primeira Ação, recebe +1 I. |
| D02 | Espinhos Vivos | Ataque | 2 AP | 3 D / 2 I | 2 | Na Forma Humana, se o adversário usar uma carta de Reação, recebe +1 D depois da redução. |
| D03 | Raio da Tempestade | Ataque | 2 AP | 4 D / 1 I | 2 | Na Forma Humana, se for usado imediatamente depois de uma Técnica, recebe +1 I. |
| D04 | Garra Selvagem | Ataque | 1 AP | 2 D / 1 I | 1 | Na Forma Selvagem, recebe +1 D. |
| D05 | Mordida Predatória | Ataque | 2 AP | 4 D / 1 I | 2 | Na Forma Selvagem, se o adversário estiver com 3 ou menos de Guarda ao declarar, recebe +1 D. |
| D06 | Investida Bestial | Ataque | 2 AP | 3 D / 3 I | 2 | Na Forma Selvagem, recebe +1 I se for sua primeira Ação ofensiva do turno. |
| D07 | Garras Gêmeas | Ataque | 2 AP | 3 D / 1 I | 2 | Se uma ação anterior neste turno ocorreu em Forma Humana e depois você se transformou, recebe +2 D. |
| D08 | Golpe Totêmico | Ataque | 3 AP | 5 D / 2 I | 2 | Se mudou de forma neste turno, recebe +1 D e +1 I. |
| D09 | Fúria da Tempestade | Ataque | 3 AP | 4 D / 4 I | 3 | Na Forma Humana, recebe +1 I. Na Forma Selvagem, recebe +1 D. |
| D10 | Predador da Lua | Ataque | 2 AP | 4 D / 0 I | 2 | Na Forma Selvagem, se for sua terceira Ação, recebe +2 D. |
| D11 | Crescimento Súbito | Técnica | 1 AP | — | 1 | Seu próximo Ataque neste turno recebe +1 D e +1 I. Na Forma Humana, também restaure 1 Guarda. |
| D12 | Metamorfose Instintiva | Técnica | 1 AP | — | 2 | Mude de forma. Essa mudança não conta como a Metamorfose gratuita do início do turno. Depois, sua próxima Ação neste turno custa 1 AP a menos, mínimo 1. |
| D13 | Renovo Natural | Técnica | 2 AP | — | 2 | Restaure 2 Vida. Na Forma Humana, restaure 3 em vez disso. |
| D14 | Casca de Carvalho | Técnica | 1 AP | — | 2 | Até o início do seu próximo turno, sua primeira Resposta reduz +1 D e +1 I. |
| D15 | Lua Crescente | Técnica | 1 AP | — | 2 | Se estiver Humano, transforme-se em Selvagem. Seu próximo Ataque Selvagem neste turno recebe +2 D. Se já estiver Selvagem, apenas recebe o bônus. |
| D16 | Casca Reflexa | Reação | 1 R | — | 1 | Reduza 2 D e 2 I. Na Forma Humana, se impedir Ruptura, restaure 1 Guarda. |
| D17 | Instinto Feral | Reação | 1 R | — | 1 | Reduza 3 D. Na Forma Selvagem, reduza 4 D em vez disso. |
| D18 | Raízes Protetoras | Reação | 1 R | — | 1 | Reduza 3 I. Na Forma Humana, se o Impacto final for 0, seu próximo Ataque recebe +1 I. |
| D19 | Salto da Fera | Reação | 2 R | — | 2 | Reduza 2 D e 2 I. Na Forma Selvagem, se o Dano final for 0, seu próximo Ataque recebe +1 D. |
| D20 | Mudar com o Golpe | Reação | 2 R | — | 2 | Reduza 3 D e 1 I. Depois da resolução, você pode mudar de forma. Essa mudança não consome a Metamorfose gratuita do início do seu próximo turno. |

## Dez passivas

- Duas Naturezas — revele na primeira vez que realizar uma Ação em Forma Humana e outra em Forma Selvagem no mesmo turno. Depois disso, na primeira vez em cada próprio turno que fizer isso, sua próxima Ação ofensiva recebe +1 D ou +1 I.
- Sangue da Fera — revele quando um Ataque Selvagem provocar sua primeira Ruptura. Depois disso, o primeiro Ataque Selvagem de cada turno contra Guarda 0 recebe +1 D.
- Sabedoria Ancestral — revele quando uma Técnica em Forma Humana preparar diretamente uma ação posterior. Depois disso, a primeira Técnica de cada turno em Forma Humana que alterar valor numérico da ação seguinte aumenta esse valor em 1.
- Pele Renovada — revele quando mudar de Forma Selvagem para Humana com 15 de Vida ou menos. Restaure 2 Vida. Depois disso, a próxima vez na partida que repetir essa transformação abaixo de 15, restaure 1 Vida.
- Instinto Predatório — revele quando o segundo Ataque do mesmo turno causar Dano à Vida. Depois disso, o segundo Ataque de cada turno em Forma Selvagem recebe +1 D.
- Raízes Profundas — revele quando uma Reação impedir Ruptura em Forma Humana. Depois disso, na primeira vez em cada turno inimigo que isso ocorrer, restaure 1 Guarda.
- Olho da Tempestade — revele quando um Ataque causar pelo menos 3 I depois das reduções. Depois disso, na primeira vez em cada turno que isso ocorrer, seu próximo Ataque recebe +1 D.
- Metamorfose Perfeita — revele quando mudar de forma 2 vezes no mesmo turno. Depois disso, na primeira vez em cada próprio turno que usar Metamorfose Instintiva, sua próxima ação ofensiva recebe +1 D ou +1 I.
- Sobrevivência Selvagem — revele quando chegar a 10 de Vida ou menos em Forma Selvagem. Depois disso, sua Defesa Inata na Forma Selvagem reduz 1 ponto adicional do tipo escolhido.
- Equilíbrio Natural — revele quando terminar um turno tendo realizado pelo menos 1 Ação em cada forma e ainda possuir Reserva. Depois disso, sempre que repetir essa situação, restaure 1 Vida.

## Seis Cartas de Classe

O Druida escolhe 1 Forma Selvagem e 1 Círculo Natural.

### Forma do Urso

Enquanto Selvagem, o primeiro Ataque de cada turno com pelo menos 2 I recebe +1 I.

Ativar: enquanto Selvagem e ao receber um Ataque, reduza +1 D e +1 I.

Exaurir: durante uma Resposta enquanto Selvagem, reduza +4 D e +2 I. Depois, volte para Forma Humana e não poderá mais entrar em Forma Selvagem pelo restante da partida.

### Forma do Lobo

Enquanto Selvagem, o segundo Ataque do mesmo turno recebe +1 D.

Ativar: quando declarar esse segundo Ataque, ele recebe +1 I.

Exaurir: ao declarar seu segundo ou terceiro Ataque do turno, ele recebe +3 D e +1 I. Depois, volte para Forma Humana e não poderá mais entrar em Forma Selvagem.

### Forma do Corvo

Enquanto Selvagem, a primeira Técnica de cada turno pode mover uma habilidade sua de CD2 para CD1 depois da resolução.

Ativar: use o efeito acima.

Exaurir: depois que uma Técnica resolver, devolva 1 habilidade sua de CD1 para a mão. Depois, volte para Forma Humana e não poderá mais entrar em Forma Selvagem.

### Círculo do Bosque

Ativar: quando uma habilidade restaurar Vida ou Guarda, aumente a restauração em 1.

Exaurir: quando uma habilidade restaurar Vida ou Guarda, restaure +3 do mesmo tipo.

### Círculo da Tempestade

Ativar: quando um Ataque possuir pelo menos 3 I antes das reduções, ele recebe +1 D.

Exaurir: ao declarar um Ataque, ele recebe +2 D e +2 I.

### Círculo da Lua

Ativar: quando mudar de forma, sua primeira ação depois da transformação recebe +1 D se for Ataque ou reduz +1 D se for Reação.

Exaurir: quando mudar de forma, deixe Pronta sua Carta de Forma se estiver Ativada. Sua próxima ação ofensiva neste turno recebe +2 D e +1 I.

## Três Ultimates

- Avatar Selvagem — Ataque. 3 AP. 6 D / 3 I. Se estiver em Forma Selvagem, recebe +2 D. Se mudou de Humana para Selvagem neste turno, recebe também +1 I.
- Fúria da Natureza — Ataque. 3 AP. 5 D / 4 I. Antes da resolução, pode mudar de forma gratuitamente mesmo que já tenha usado Metamorfose. Depois da transformação, se estiver Humano recebe +2 I; se estiver Selvagem recebe +2 D.
- Renascimento Primal — Técnica. 2 AP. Restaure 4 Vida e 2 Guarda. Depois, pode mudar de forma. Se uma Carta de Classe estiver Ativada, deixe-a Pronta. Não recupera Carta de Classe Exaurida.

---

# BRUXO

## Mecânica

O Bruxo usa a própria Vida como preço.

Preço Proibido: uma vez por próprio turno, quando for jogar uma habilidade normal cujo custo impresso seja de pelo menos 2 AP, pode perder 1 Vida para reduzir o custo em 1 AP, mínimo 1.

Perder Vida como custo não é Dano, não pode ser reduzido e não ativa efeitos que exigem ter recebido um Ataque.

Defesa Inata — Véu Profano: uma vez por turno inimigo, perca 1 Vida para reduzir 1 D e 2 I.

## Vinte habilidades

| ID | Carta | Tipo | Custo | Valores | CD | Texto |
|---|---|---|---:|---:|---:|---|
| BR01 | Seta Sombria | Ataque | 1 AP | 2 D / 1 I | 1 | Se já perdeu Vida por efeito próprio neste turno, recebe +1 D. |
| BR02 | Chama Profana | Ataque | 2 AP | 3 D / 1 I | 2 | Ao declarar, pode perder 1 Vida para receber +2 D. Esse preço é separado de Preço Proibido. |
| BR03 | Correntes do Abismo | Ataque | 2 AP | 2 D / 3 I | 2 | Ao declarar, pode perder 1 Vida para receber +2 I. |
| BR04 | Dreno Vital | Ataque | 2 AP | 3 D / 1 I | 2 | Se causar Dano à Vida, restaure 1 Vida. Se perdeu Vida por efeito próprio neste turno, restaure 2 em vez disso. |
| BR05 | Lança Profana | Ataque | 3 AP | 5 D / 2 I | 2 | Se Preço Proibido foi usado para jogar esta carta, recebe +1 D. |
| BR06 | Fogo Infernal | Ataque | 3 AP | 5 D / 2 I | 3 | Pode perder até 3 Vida adicionais ao declarar. Recebe +1 D por Vida perdida dessa forma. |
| BR07 | Marca Dolorosa | Ataque | 2 AP | 3 D / 1 I | 2 | Se sua Maldição foi Ativada neste turno, recebe +2 D. |
| BR08 | Ruptura do Pacto | Ataque | 2 AP | 3 D / 3 I | 2 | Se seu Pacto estiver Ativado, recebe +1 I. |
| BR09 | Cobrar o Preço | Ataque | 1 AP | 2 D / 0 I | 1 | Se já perdeu pelo menos 2 Vida por efeitos próprios neste turno, recebe +2 D. |
| BR10 | Boca do Abismo | Ataque | 3 AP | 4 D / 4 I | 3 | Se causar Ruptura, restaure 1 Vida ou deixe Pronta sua Maldição Ativada. |
| BR11 | Assinar com Sangue | Técnica | 1 AP | — | 2 | Perca 2 Vida. Seu próximo Ataque neste turno recebe +2 D e +1 I. |
| BR12 | Invocar o Pacto | Técnica | 1 AP | — | 2 | Deixe Pronto seu Pacto Ativado. Depois, perca 1 Vida. |
| BR13 | Apertar a Maldição | Técnica | 1 AP | — | 2 | Deixe Pronta sua Maldição Ativada. Sua próxima habilidade ofensiva neste turno recebe +1 I. |
| BR14 | Roubar Fôlego | Técnica | 2 AP | — | 2 | Se perdeu Vida por efeito próprio neste turno, restaure 3 Vida. Caso contrário, restaure 1. |
| BR15 | Pacto Apressado | Técnica | 1 AP | — | 3 | Sua próxima habilidade de custo impresso 2 AP ou mais pode usar Preço Proibido mesmo se ele já foi usado neste turno. |
| BR16 | Escudo Sombrio | Reação | 1 R | — | 1 | Reduza 3 D. |
| BR17 | Correntes Defensivas | Reação | 1 R | — | 1 | Reduza 3 I. |
| BR18 | Transferir a Dor | Reação | 1 R | — | 2 | Reduza 3 D. Depois, você perde 1 Vida e o adversário perde 1 Vida. Essas perdas não podem ser reduzidas. |
| BR19 | Pele do Abismo | Reação | 2 R | — | 2 | Reduza 2 D e 3 I. Pode perder 1 Vida para reduzir +2 D. |
| BR20 | Sobreviver ao Preço | Reação | 2 R | — | 3 | Só contra um Ataque que derrotaria você. Reduza 4 D. Se sobreviver com 3 ou menos de Vida, deixe Pronto seu Pacto. |

## Dez passivas

- Sangue por Poder — revele na primeira vez que usar Preço Proibido. Depois disso, a primeira habilidade ofensiva de cada turno jogada por Preço Proibido recebe +1 I.
- Dor Familiar — revele quando perder pelo menos 3 Vida por efeitos próprios no mesmo turno. Depois disso, a primeira vez por turno que chegar a 3 ou mais perdidos dessa forma, seu próximo Ataque recebe +1 D.
- Pacto Profundo — revele quando Ativar o Pacto pela terceira vez. Depois disso, na primeira Ativação do Pacto em cada rodada, restaure 1 Vida depois do efeito, se ainda estiver vivo.
- Maldição Persistente — revele quando Ativar a Maldição pela terceira vez. Depois disso, na primeira Ativação da Maldição em cada rodada, sua próxima habilidade ofensiva recebe +1 I.
- Tudo Tem um Preço — revele quando terminar um turno tendo usado Preço Proibido e ainda possuir 2 de Reserva. Depois disso, quando repetir a situação, restaure 1 Vida.
- Cicatriz do Abismo — revele quando chegar a 15 de Vida ou menos devido a custo próprio. Depois disso, enquanto estiver com 15 ou menos, a primeira habilidade de cada turno que fizer você perder Vida como custo recebe +1 D ou +1 I.
- Não Há Retorno — revele quando chegar a 10 de Vida ou menos. Depois disso, uma vez por turno, pode perder 1 Vida adicional ao declarar um Ataque para receber +1 D.
- Dor Compartilhada — revele quando Transferir a Dor fizer ambos os personagens perderem Vida. Depois disso, na primeira vez em cada turno inimigo que perder Vida por uma Reação própria, o adversário também perde 1 Vida.
- Mestre das Barganhas — revele quando usar 2 custos diferentes de Vida no mesmo turno. Depois disso, na primeira vez em cada próprio turno que fizer isso, deixe Pronta 1 Carta de Classe sua Ativada.
- Último Contrato — revele quando começar o turno com 5 de Vida ou menos. Na primeira revelação, restaure 2 Vida. Depois disso, enquanto começar nessa faixa, seu primeiro Ataque jogado por Preço Proibido recebe +2 D.

## Seis Cartas de Classe

O Bruxo escolhe 1 Pacto e 1 Maldição.

### Pacto de Sangue

Ativar: quando perder Vida por efeito próprio durante uma ação ofensiva, aquela ação recebe +1 D.

Exaurir: ao declarar um Ataque, perca 3 Vida e o Ataque recebe +4 D.

### Pacto das Sombras

Ativar: quando usar uma Reação, pode perder 1 Vida para ela reduzir +1 D e +1 I.

Exaurir: durante uma Reação, ela reduz +4 D e +2 I.

### Pacto do Abismo

Ativar: quando provocar Ruptura, depois da resolução restaure 1 Vida.

Exaurir: ao declarar um Ataque, ele recebe +3 I. Se provocar Ruptura, restaure 3 Vida depois da resolução.

### Maldição da Fragilidade

Ativar: quando o adversário estiver com 3 ou menos de Guarda e receber um Ataque seu, o Ataque recebe +1 I.

Exaurir: ao declarar um Ataque contra um adversário com 3 ou menos de Guarda, ele recebe +2 D e +3 I.

### Maldição da Fome

Ativar: quando o adversário restaurar Vida, reduza a restauração em 1.

Exaurir: quando o adversário fosse restaurar Vida, reduza aquela restauração em 4, mínimo 0, e ele perde 1 Vida.

### Maldição da Agonia

Ativar: quando o adversário concluir sua segunda Ação no mesmo turno, se aquela Ação causou Dano a você ou consumiu uma Reação sua, ele perde 1 Vida.

Exaurir: depois que o adversário concluir a segunda Ação, ele perde 2 Vida. Se ainda realizar uma terceira Ação neste turno, perde mais 2 depois que ela resolver.

## Três Ultimates

- Condenação — Ataque. 3 AP. 7 D / 2 I. Antes da resolução, pode perder até 4 Vida. Para cada 2 Vida perdidos dessa forma, recebe +2 D.
- Contrato Final — Técnica. 2 AP. Até o fim do turno, pode usar Preço Proibido em até 2 habilidades diferentes, mesmo que já tenha usado. Na primeira vez que perder Vida por efeito próprio neste turno, deixe Pronta uma Carta de Classe sua Ativada.
- O Preço Não é Meu — Reação. 2 R. Dano e Impacto finais daquele Ataque se tornam 0. Depois da resolução, perca 3 Vida que não podem ser reduzidos. Se essa perda fosse derrotá-lo, a Ultimate não pode ser usada.

---

# OBSERVAÇÕES DE BALANCEAMENTO

Este catálogo é Alpha. Valores devem ser tratados como dados versionados e cobertos por testes automatizados. Nenhuma mudança de balanceamento deve ser feita diretamente na interface gráfica.

O limite inicial aceito para matchup em baterias comparáveis é 60 contra 40. Matchups não precisam ser exatamente 50 contra 50.
