import type { MomentoDeApresentacao } from './ritmo.js';

/*
 * O vocabulário da apresentação.
 *
 * Um evento de apresentação é o que a tela **mostra**; ele nasce de um evento
 * canônico do motor e nunca volta para lá. A regra já foi decidida quando isto
 * existe: o estado canônico não espera a animação, a apresentação é que o
 * alcança (VIDEO_ANALYSIS.md §5 e §11).
 *
 * Por isso nada aqui decide Dano, Impacto, Ruptura, condição ou custo. Os
 * valores chegam prontos, e este pacote só sabe quanto tempo cada beat dura,
 * de onde para onde ele viaja e qual é a família visual dele.
 *
 * As zonas são referenciadas por **chave de âncora** — a mesma string que
 * `packages/ui/src/composicao/ancoras.ts` produz. É de propósito: assim a
 * camada de efeitos não precisa importar a camada de interface, e a mesma
 * referência serve para o campo em DOM e para a arena tridimensional.
 */

export type LadoVisual = 'proprio' | 'adversario';

/**
 * As famílias visuais.
 *
 * Elas existem para que trinta cartas não virem trinta cutscenes. Uma família
 * define o material do efeito — do que ele é feito — e o momento define o que
 * ele faz. Guerreiro e Mago têm famílias separadas de propósito: é assim que
 * as duas classes ficam reconhecíveis sem nenhum texto na tela.
 */
export type FamiliaDeVfx =
  /* Guerreiro: massa, pressão e metal. Nada de magia. */
  | 'golpe-pesado'
  | 'pressao'
  | 'fragmentos'
  | 'guarda-marcial'
  | 'momentum'
  /* Mago: geometria, energia concentrada e elemento declarado pela carta. */
  | 'dardo-arcano'
  | 'fogo'
  | 'gelo'
  | 'runa'
  | 'prisma'
  | 'barreira-arcana'
  | 'mana'
  /* Comum às doze classes, para tudo que ainda não tem tratamento próprio. */
  | 'neutro';

export type TipoDeMomento =
  | 'banner-de-turno'
  | 'declaracao'
  | 'resposta'
  | 'viagem'
  | 'impacto'
  | 'numero-flutuante'
  | 'ruptura'
  | 'apresentacao-de-carta'
  | 'passiva-revelada'
  | 'passiva-ativada'
  | 'classe-ativada'
  | 'classe-exaurida'
  | 'ultimate'
  | 'condicao-aplicada'
  | 'condicao-tick'
  | 'recurso'
  | 'cooldown'
  | 'vitoria';

/**
 * Duração base de cada beat, em milissegundos.
 *
 * As faixas vêm do ritmo medido no vídeo de referência e do orçamento do
 * projeto: foco 80–160, mover carta 180–350, faixa 700–1000, impacto 120–250.
 * Nenhum valor passa de `ORCAMENTO_DE_APRESENTACAO_MS.momento`; a Ultimate
 * chega perto do teto de sequência somando vários momentos, não esticando um.
 */
export const DURACAO_BASE_MS: Readonly<Record<TipoDeMomento, number>> = {
  'banner-de-turno': 850,
  declaracao: 280,
  resposta: 260,
  viagem: 420,
  impacto: 180,
  'numero-flutuante': 800,
  ruptura: 900,
  'apresentacao-de-carta': 850,
  'passiva-revelada': 780,
  'passiva-ativada': 320,
  'classe-ativada': 420,
  'classe-exaurida': 950,
  ultimate: 1100,
  'condicao-aplicada': 320,
  'condicao-tick': 420,
  recurso: 300,
  cooldown: 260,
  vitoria: 1000,
};

/**
 * Quais beats seguram o dedo do jogador.
 *
 * Segurar a entrada **não** é segurar a regra: o estado já mudou. É só para
 * ninguém tocar num campo que ainda está se rearranjando. Números flutuantes,
 * fichas de recurso e ticks de condição correm por cima do beat seguinte, como
 * no vídeo, onde o contador cai enquanto a carta ainda está grande no centro.
 */
export const BLOQUEIA_ENTRADA: Readonly<Record<TipoDeMomento, boolean>> = {
  'banner-de-turno': true,
  declaracao: true,
  resposta: true,
  viagem: true,
  impacto: true,
  'numero-flutuante': false,
  ruptura: true,
  'apresentacao-de-carta': true,
  'passiva-revelada': true,
  'passiva-ativada': true,
  'classe-ativada': true,
  'classe-exaurida': true,
  ultimate: true,
  'condicao-aplicada': false,
  'condicao-tick': false,
  recurso: false,
  cooldown: false,
  vitoria: true,
};

/** Um número que sobe do ponto do impacto: "-3 VIDA", "-2 GUARDA". */
export interface ValorFlutuante {
  readonly rotulo: string;
  readonly valor: number;
  readonly tom: 'vida' | 'guarda' | 'recurso' | 'ruptura' | 'cura';
}

/**
 * Um beat da apresentação.
 *
 * `origem` e `destino` são chaves de âncora; quem renderiza resolve a posição.
 * Nenhum efeito escreve coordenada de tela em lugar nenhum — foi exatamente
 * para isso que o registro de âncoras existe.
 */
export interface EventoDeApresentacao extends MomentoDeApresentacao {
  readonly tipo: TipoDeMomento;
  readonly familia: FamiliaDeVfx;
  readonly lado: LadoVisual;
  readonly origem: string | null;
  readonly destino: string | null;
  /** O identificador da carta, como texto. Este pacote não conhece `CardId`. */
  readonly carta: string | null;
  readonly rotulo: string | null;
  readonly valores: readonly ValorFlutuante[];
  /** 0..1 — quanto do orçamento visual do beat usar. */
  readonly intensidade: number;
  /** O som que nasce **no mesmo quadro** em que o beat começa (§41). */
  readonly som: string | null;
}

export interface EsbocoDeEvento {
  readonly tipo: TipoDeMomento;
  readonly lado: LadoVisual;
  readonly familia?: FamiliaDeVfx;
  readonly origem?: string | null;
  readonly destino?: string | null;
  readonly carta?: string | null;
  readonly rotulo?: string | null;
  readonly valores?: readonly ValorFlutuante[];
  readonly intensidade?: number;
  readonly som?: string | null;
  /** Só para os poucos beats que precisam fugir da duração padrão do tipo. */
  readonly duracaoBaseMs?: number;
}

/**
 * Monta um evento completo a partir do esboço, preenchendo o que o tipo já
 * sabe: duração, bloqueio de entrada e família neutra.
 */
export const eventoDeApresentacao = (
  identificador: string,
  esboco: EsbocoDeEvento,
): EventoDeApresentacao => ({
  id: identificador,
  duracaoBaseMs: esboco.duracaoBaseMs ?? DURACAO_BASE_MS[esboco.tipo],
  bloqueiaEntrada: BLOQUEIA_ENTRADA[esboco.tipo],
  tipo: esboco.tipo,
  familia: esboco.familia ?? 'neutro',
  lado: esboco.lado,
  origem: esboco.origem ?? null,
  destino: esboco.destino ?? null,
  carta: esboco.carta ?? null,
  rotulo: esboco.rotulo ?? null,
  valores: esboco.valores ?? [],
  intensidade: esboco.intensidade ?? 1,
  som: esboco.som ?? null,
});

/**
 * As famílias de cada classe do vertical slice.
 *
 * A lista existe para o teste poder afirmar o que o olho precisa enxergar: que
 * Guerreiro e Mago **não compartilham** nenhuma família. Duas classes com a
 * mesma linguagem visual seriam a mesma classe na tela.
 */
export const FAMILIAS_DO_GUERREIRO: readonly FamiliaDeVfx[] = [
  'golpe-pesado',
  'pressao',
  'fragmentos',
  'guarda-marcial',
  'momentum',
];

export const FAMILIAS_DO_MAGO: readonly FamiliaDeVfx[] = [
  'dardo-arcano',
  'fogo',
  'gelo',
  'runa',
  'prisma',
  'barreira-arcana',
  'mana',
];
