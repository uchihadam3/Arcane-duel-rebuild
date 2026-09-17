# Ambiguidades e pontos em aberto

Levantados na leitura dos documentos de design durante a montagem da fundação.
Nenhum deles foi resolvido por conta própria: onde não havia regra, nada foi
inventado.

## Material que não chegou

1. **Vídeo de referência.** `VIDEO_VISUAL_TARGET.md` descreve o vídeo, mas
   nenhum arquivo ou link de vídeo foi entregue ao repositório. A direção
   visual desta fundação vem do documento escrito, não do vídeo em si.
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

## Divergências entre documentos

6. **Lista de pacotes.** `FULL_GAME_SPEC.md` §30 recomenda também `/audio` e
   `/vfx`; a Etapa zero do `ROADMAP_CODEX.md` cita apenas rules-engine,
   card-data, ai, shared-types e ui. Pela regra de precedência, arquitetura é
   decidida pelo `FULL_GAME_SPEC.md`, então os sete pacotes existem.
7. **Nome do arquivo de especificação.** O arquivo foi entregue como
   `FULL_GAME_SPEC2.md`, mas todos os documentos o referenciam como
   `FULL_GAME_SPEC.md`. Ele está no repositório com o nome canônico e conteúdo
   idêntico ao entregue.
8. **Posição da Resposta.** `FULL_GAME_SPEC.md` §24 diz que a Reação entra
   "abaixo da Ação"; `VIDEO_VISUAL_TARGET.md` diz "logo abaixo ou sobreposta
   parcialmente". Fica em aberto para a etapa visual.

## Pontos de regra que precisarão de decisão explícita

9. **Composição da build.** O documento fala em "quinze componentes"
   (§35), mas a lista é 8 habilidades + 4 passivas + 2 Cartas de Classe +
   1 Ultimate + 1 Personagem = 16. A leitura mais provável é que a carta de
   Personagem não conta como componente montável, já que ela é determinada pela
   classe. A fundação registra os cinco números separadamente e não força um
   total.
10. **Impulso Inicial e Lento.** O Impulso completa exatamente 1 AP quando o AP
    restante não basta (§7), e Lento aumenta o custo da ação em 1 (§15). Não
    está dito se o custo considerado pelo Impulso é o impresso ou o já
    aumentado por Lento. Precisa de decisão antes das regras universais.
11. **Ruptura e redução voluntária.** Reduzir a própria Guarda como custo não
    causa Ruptura (§9), e o Bárbaro vive disso. Falta dizer o que acontece
    quando um Ataque inimigo leva a Guarda a zero no mesmo turno em que o
    Bárbaro já a reduziu voluntariamente até 1 — a leitura direta é que há
    Ruptura, por ser ação inimiga, mas vale confirmar.
12. **Título provisório.** "Arcane Duel" é explicitamente provisório (§1) e não
    deve ser tratado como nome comercial até a etapa de identidade da marca.
