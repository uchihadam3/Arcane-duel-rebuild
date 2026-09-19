/*
 * O compasso da apresentação.
 *
 * O motor resolve na hora: comando entra, estado novo sai, e o log inteiro do
 * lance chega num único lote. Se a tela lesse esse lote como uma instrução de
 * desenho, tudo aconteceria ao mesmo tempo — o voo, o efeito, o número do HUD
 * e três sons empilhados no mesmo quadro. Foi exatamente isso que o aparelho
 * real mostrou: rápido demais para acompanhar, e portanto ilegível.
 *
 * Este arquivo é o vocabulário do tempo. Ele não anima nada; ele diz **quanto
 * dura cada coisa que a tela precisa contar**. Cada espécie de beat tem uma
 * faixa — a faixa pedida na revisão, e não um número inventado aqui — e uma
 * duração NORMAL escolhida dentro dela. O teste confere as duas coisas, então
 * um ajuste futuro que caia fora da faixa quebra o build em vez de passar.
 *
 * NORMAL é o padrão, e é deliberadamente lento: é o andamento em que o jogo
 * deve ser jogado. RÁPIDO existe para quem já conhece as cartas, e precisa ser
 * **visivelmente** outro andamento — se ele apenas se parecesse com o NORMAL,
 * seria só uma preferência sem efeito, e a pessoa continuaria sem entender o
 * que acabou de acontecer.
 */

export type EspecieDeBeat =
  /** A carta se destaca onde está, ainda parada: virou o assunto da tela. */
  | 'foco'
  /** Ela se descola da mão ou do encaixe. */
  | 'levantar'
  /** A travessia da mão até o campo. */
  | 'viagem'
  /** O encaixe no pedestal, com o recuo curto. */
  | 'encaixe'
  /** A pausa de leitura depois de assentar: nada se move, e dá para ler. */
  | 'leitura'
  /** O aviso de que o efeito vem: a energia se junta antes do golpe. */
  | 'telegrafo'
  /** O efeito principal da carta. */
  | 'efeito'
  /** A pancada no alvo. */
  | 'impacto'
  /** O resultado assentando: é aqui que o número do HUD se mexe. */
  | 'resultado'
  /** Uma Passiva girando para mostrar a frente. Uma por vez. */
  | 'passiva-revela'
  /** A Carta de Classe sendo Ativada. */
  | 'classe-ativa'
  /** Exaurir: a carta saindo do campo para sempre. */
  | 'exaurir'
  /** A apresentação da Ultimate. */
  | 'ultimate'
  /** Uma habilidade descendo do campo para o cooldown, no fim do turno. */
  | 'cooldown-migra'
  /** Um compartimento avançando para o vizinho: CD3 → CD2. */
  | 'cooldown-avanca'
  /** De CD1 de volta para a mão. */
  | 'cooldown-para-mao';

export interface Faixa {
  readonly minimo: number;
  readonly maximo: number;
}

/**
 * As faixas pedidas na revisão de ritmo.
 *
 * Elas são o contrato: qualquer duração NORMAL precisa cair aqui dentro, e o
 * teste falha se alguém "otimizar" um beat para fora da faixa.
 */
export const FAIXA: Readonly<Record<EspecieDeBeat, Faixa>> = {
  foco: { minimo: 280, maximo: 420 },
  levantar: { minimo: 180, maximo: 260 },
  viagem: { minimo: 650, maximo: 950 },
  encaixe: { minimo: 180, maximo: 280 },
  leitura: { minimo: 250, maximo: 450 },
  telegrafo: { minimo: 350, maximo: 700 },
  efeito: { minimo: 600, maximo: 1200 },
  impacto: { minimo: 250, maximo: 500 },
  resultado: { minimo: 350, maximo: 650 },
  'passiva-revela': { minimo: 800, maximo: 1300 },
  'classe-ativa': { minimo: 600, maximo: 900 },
  exaurir: { minimo: 1000, maximo: 1600 },
  ultimate: { minimo: 2500, maximo: 4500 },
  /* A migração do fim do turno: cada carta desce no seu próprio tempo. */
  'cooldown-migra': { minimo: 650, maximo: 1000 },
  /* O avanço é um deslize curto de uma casa para a vizinha, não um voo. */
  'cooldown-avanca': { minimo: 520, maximo: 780 },
  'cooldown-para-mao': { minimo: 520, maximo: 820 },
};

/**
 * As durações NORMAIS.
 *
 * Escolhidas na metade de cima de cada faixa. A revisão foi explícita: o
 * NORMAL tem de ser o andamento deliberado, quase cinematográfico — não o
 * meio-termo entre o cinema e a pressa.
 */
export const DURACAO_NORMAL: Readonly<Record<EspecieDeBeat, number>> = {
  foco: 340,
  levantar: 220,
  viagem: 730,
  encaixe: 230,
  leitura: 340,
  telegrafo: 520,
  efeito: 900,
  impacto: 360,
  resultado: 480,
  'passiva-revela': 1050,
  'classe-ativa': 740,
  exaurir: 1280,
  ultimate: 3200,
  'cooldown-migra': 820,
  'cooldown-avanca': 640,
  'cooldown-para-mao': 620,
};

export type Andamento = 'normal' | 'rapido';

/**
 * Quanto o RÁPIDO encurta.
 *
 * Não é "um pouco mais rápido". É outro andamento: perto de dois terços do
 * tempo desaparece pelo caminho, e mesmo assim cada beat continua existindo —
 * o que a revisão proibiu foi teleporte, não pressa.
 */
export const FATOR_RAPIDO = 0.58;

export const duracaoDoBeat = (especie: EspecieDeBeat, andamento: Andamento = 'normal'): number => {
  const base = DURACAO_NORMAL[especie];
  return andamento === 'rapido' ? Math.round(base * FATOR_RAPIDO) : base;
};

/**
 * O passo da cascata.
 *
 * Quando várias cartas fazem a mesma coisa — as habilidades descendo para o
 * cooldown no fim do turno —, elas não descem todas no mesmo quadro nem uma
 * depois da outra inteira. Elas saem em cascata, com este intervalo curto
 * entre os começos, e o conjunto lê como uma única ação do tabuleiro.
 */
export const PASSO_DA_CASCATA_MS = 210;

export const passoDaCascata = (andamento: Andamento = 'normal'): number =>
  andamento === 'rapido' ? Math.round(PASSO_DA_CASCATA_MS * FATOR_RAPIDO) : PASSO_DA_CASCATA_MS;
