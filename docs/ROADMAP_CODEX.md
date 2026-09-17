# ROADMAP PARA CODEX

## Regra principal

Não começar pela arte final das centenas de cartas. Primeiro construir um motor de regras determinístico e testável. Depois construir um vertical slice com qualidade visual final. Somente então escalar arte e conteúdo.

## Etapa zero

- criar monorepo TypeScript;
- criar apps web e game-server;
- criar packages rules-engine, card-data, ai, shared-types e ui;
- configurar lint, formatter, testes e CI;
- adicionar FULL_GAME_SPEC.md ao repositório;
- adicionar CARD_CATALOG.md ao repositório;
- versionar rules_version e card_data_version desde o primeiro commit.

## Etapa um

Implementar tipos fundamentais:

- PlayerId;
- ClassId;
- CardId;
- MatchState;
- PlayerState;
- Zone;
- ActionSlot;
- ResponseSlot;
- CooldownZone;
- Condition;
- ClassCardState;
- PassiveState;
- UltimateState;
- public view e private view do estado.

## Etapa dois

Implementar regras universais:

- Vida;
- Guarda;
- AP;
- Reserva;
- Impulso Inicial;
- máximo de três Ações;
- Resposta voluntária;
- Dano;
- Impacto;
- Ruptura;
- cooldown;
- Passivas;
- Ativar;
- Exaurir;
- Ultimate;
- fim e início de turno.

## Etapa três

Implementar Guerreiro e Mago completos com testes unitários.

Criar simulador headless capaz de rodar milhares de partidas sem interface.

## Etapa quatro

Implementar as outras dez classes uma por uma. Cada carta precisa entrar com teste.

## Etapa cinco

Criar protótipo local simples. Não gastar tempo com arte final ainda.

O objetivo é provar que uma pessoa consegue jogar toda a partida pela interface.

## Etapa seis

Criar vertical slice de Guerreiro contra Mago com aparência final.

- arena tridimensional;
- mão em leque;
- animações de carta;
- hover;
- zoom;
- Passiva revelando;
- Carta de Classe girando;
- Exaustão;
- Ruptura;
- Ultimate;
- sons;
- VFX;
- tela de vitória.

## Etapa sete

Criar Construtor de Build e Receitas oficiais.

## Etapa oito

Criar IA e Desafio de doze adversários.

Primeiro fazer um agente legal e consistente. Depois criar os doze níveis de qualidade.

## Etapa nove

Criar Supabase:

- autenticação;
- confirmação de e-mail;
- recuperação de senha;
- profiles;
- saved_builds;
- preset_unlocks;
- match history.

## Etapa dez

Criar game-server autoritativo e PvP.

- criação de sala;
- matchmaking casual;
- validação de jogada;
- máscaras de informação privada;
- timers;
- reconexão;
- surrender;
- log de eventos.

## Etapa onze

Criar ranqueado, MMR, leaderboard e temporadas.

## Etapa doze

Produzir arte em escala.

Antes disso a moldura de carta precisa estar congelada.

Pipeline recomendado por carta:

- briefing visual gerado a partir da habilidade;
- concept art;
- revisão de consistência da classe;
- arte final;
- export digital;
- export físico;
- entrada no catálogo de assets.

## Etapa treze

Áudio e música.

- biblioteca de eventos de interface;
- assinatura sonora por classe;
- impactos;
- condições;
- Ruptura;
- Ultimates;
- música de menu;
- música de batalha adaptativa.

## Etapa quatorze

QA de lançamento.

- testes de regra;
- testes de rede;
- reconexão;
- segurança;
- performance;
- mobile landscape;
- acessibilidade;
- testes de cada Receita;
- testes dos doze níveis de IA;
- matriz de matchup;
- regressão de ranking;
- replay determinístico.

## Critério de conclusão de uma fase

Nenhuma fase é considerada concluída apenas porque a tela existe. Ela precisa ter testes, tratamento de erro e comportamento definido para os casos de borda daquele escopo.
