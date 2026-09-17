# CODEX_START_HERE.md
## Leia isto antes de criar qualquer código

Você está recebendo um projeto **ainda não iniciado**. Não existe base de código que deva ser preservada.

Seu trabalho é construir o jogo descrito nos documentos deste pacote por fases, começando pela fundação correta. Não tente implementar o produto inteiro em uma única tarefa.

## Ordem obrigatória de leitura

1. `FULL_GAME_SPEC.md`
2. `CARD_CATALOG.md`
3. `PRESET_BUILDS.md`
4. `ASSET_CATALOG.md`
5. `VIDEO_VISUAL_TARGET.md`
6. `ROADMAP_CODEX.md`

## Regra de precedência

Se documentos divergirem:

- regras universais, estado e arquitetura: `FULL_GAME_SPEC.md`;
- cartas: `CARD_CATALOG.md`;
- Receitas: `PRESET_BUILDS.md`;
- imagens/assets: `ASSET_CATALOG.md`;
- apresentação visual: `VIDEO_VISUAL_TARGET.md`;
- sequência de desenvolvimento: `ROADMAP_CODEX.md`.

## Muito importante

Qualquer `FULL_GAME_SPEC.md` antigo referente a duelo automático de 15 cartas, baralho comum, boosters ou coleção de centenas de cartas **não pertence a este projeto** e deve ser ignorado.

Este projeto é o card battler de classes com:

- 12 classes;
- 30 Vida;
- 6 Guarda;
- 5 AP;
- 3 Ações por turno;
- Reserva;
- Dano/Impacto/Ruptura;
- cooldown CD1/CD2/CD3;
- 4 Passivas;
- 2 Cartas de Classe;
- 1 Ultimate;
- 8 habilidades ativas na mão;
- Respostas associadas às Ações.

## Primeira tarefa permitida

Execute apenas a Etapa zero do `ROADMAP_CODEX.md`, adaptada ao fato de o repositório estar vazio:

- criar o projeto/monorepo;
- configurar TypeScript, lint, formatter e testes;
- criar os pacotes fundamentais;
- copiar os documentos de design para `/docs`;
- criar estrutura `/assets` sem alterar os PNGs aprovados;
- criar versionamento de rules/card data;
- não implementar ainda classes completas, IA, banco, PvP ou ranking.

Ao terminar, forneça:

- árvore de arquivos criada;
- decisões técnicas tomadas;
- comandos para rodar/testar;
- testes da fundação;
- lista do que ficou explicitamente fora desta fase.

Pare ao final da Etapa zero e aguarde a próxima instrução.

## Assets

Os PNGs entregues são assets aprovados. Não redesenhe, não recrie e não incorpore texto permanente neles.

Monte a interface em camadas:

1. arena;
2. slots/painéis;
3. cartas;
4. texto/valores dinâmicos;
5. overlays;
6. VFX.

O módulo Ação + Resposta deve ser composto em código usando `board_action_slot.png` e `board_response_slot.png`. Não é necessário um PNG composto.

## Escopo do primeiro vertical slice

Quando o roadmap chegar à etapa visual final, o primeiro vertical slice deve ser **Guerreiro vs Mago**, com regras reais e assets reais. Não usar mock de regra para mascarar comportamento ainda não implementado.
