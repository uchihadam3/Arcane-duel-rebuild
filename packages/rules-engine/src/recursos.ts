import type {
  CardId,
  EmboscadaPreparada,
  EstadoDeJogador,
  RecursoDeCusto,
} from '@arcane-duel/shared-types';

/*
 * Leitura e escrita do componente próprio de classe.
 *
 * O recurso é uma união discriminada por classe: o Momentum do Guerreiro e a
 * Mana do Mago não são o mesmo campo com outro nome. Estas funções são a única
 * ponte entre o custo impresso — que fala "1 Mana", "3 Momentum" — e o campo
 * certo do jogador certo, e recusam quando a classe não tem aquele recurso.
 */

/** Limites documentados de cada recurso (CARD_CATALOG.md, seções de mecânica). */
export const LIMITES_DE_RECURSO: Readonly<
  Record<RecursoDeCusto, { readonly minimo: number; readonly maximo: number }>
> = {
  mana: { minimo: 0, maximo: 6 },
  momentum: { minimo: 0, maximo: 3 },
  alma: { minimo: 0, maximo: 4 },
  brecha: { minimo: 0, maximo: 3 },
  chi: { minimo: 0, maximo: 3 },
};

/** Quanto o jogador tem, ou `null` quando a classe dele não usa esse recurso. */
export const valorDoRecurso = (
  jogador: EstadoDeJogador,
  recurso: RecursoDeCusto,
): number | null => {
  const atual = jogador.recurso;
  if (recurso === 'mana') return atual.classe === 'mago' ? atual.mana : null;
  if (recurso === 'alma') return atual.classe === 'necromante' ? atual.almasControladas : null;
  // As Brechas ficam sobre o adversário, mas são do Ladino: quem as cria e quem
  // as consome é ele, então o custo impresso lê o número aqui.
  if (recurso === 'brecha') return atual.classe === 'ladino' ? atual.brechasNoAdversario : null;
  // O Chi não é um número guardado: são três pedras, e o que o custo lê é
  // quantas delas estão Prontas.
  if (recurso === 'chi') {
    return atual.classe === 'monge' ? atual.chi.filter((pedra) => pedra === 'pronta').length : null;
  }
  return atual.classe === 'guerreiro' ? atual.momentum : null;
};

const limitar = (recurso: RecursoDeCusto, valor: number): number => {
  const limite = LIMITES_DE_RECURSO[recurso];
  if (valor < limite.minimo) return limite.minimo;
  return valor > limite.maximo ? limite.maximo : valor;
};

/**
 * Grava um novo valor de recurso, respeitando o teto e o piso impressos.
 *
 * Quando a classe não usa o recurso, o jogador volta inalterado: quem precisa
 * recusar a jogada já recusou antes, no pagamento do custo.
 */
export const definirRecurso = (
  jogador: EstadoDeJogador,
  recurso: RecursoDeCusto,
  valor: number,
): EstadoDeJogador => {
  const atual = jogador.recurso;
  const limitado = limitar(recurso, valor);
  if (recurso === 'mana' && atual.classe === 'mago') {
    return { ...jogador, recurso: { ...atual, mana: limitado } };
  }
  if (recurso === 'momentum' && atual.classe === 'guerreiro') {
    return { ...jogador, recurso: { ...atual, momentum: limitado } };
  }
  if (recurso === 'chi' && atual.classe === 'monge') {
    const chi = [0, 1, 2].map((indice) => (indice < limitado ? 'pronta' : 'gasta')) as [
      'pronta' | 'gasta',
      'pronta' | 'gasta',
      'pronta' | 'gasta',
    ];
    return { ...jogador, recurso: { ...atual, chi } };
  }
  if (recurso === 'brecha' && atual.classe === 'ladino') {
    return { ...jogador, recurso: { ...atual, brechasNoAdversario: limitado } };
  }
  if (recurso === 'alma' && atual.classe === 'necromante') {
    // As quatro fichas de Alma são conservadas: gastar move a ficha para o
    // Cemitério e colher a traz de volta. O que está anexado a um Servo não
    // participa desta troca — a ficha está sobre a carta, não em nenhuma pilha.
    const disponiveis = atual.almasControladas + atual.almasNoCemiterio;
    const controladas = Math.min(Math.max(limitado, 0), disponiveis);
    return {
      ...jogador,
      recurso: {
        ...atual,
        almasControladas: controladas,
        almasNoCemiterio: disponiveis - controladas,
      },
    };
  }
  return jogador;
};

/** Soma (ou subtrai, com valor negativo) respeitando teto e piso. */
export const somarRecurso = (
  jogador: EstadoDeJogador,
  recurso: RecursoDeCusto,
  delta: number,
): EstadoDeJogador => {
  const atual = valorDoRecurso(jogador, recurso);
  return atual === null ? jogador : definirRecurso(jogador, recurso, atual + delta);
};

/** O recurso próprio da classe, quando ela tem um que serve de custo. */
export const recursoDaClasse = (jogador: EstadoDeJogador): RecursoDeCusto | null => {
  if (jogador.recurso.classe === 'mago') return 'mana';
  if (jogador.recurso.classe === 'necromante') return 'alma';
  if (jogador.recurso.classe === 'ladino') return 'brecha';
  if (jogador.recurso.classe === 'monge') return 'chi';
  return jogador.recurso.classe === 'guerreiro' ? 'momentum' : null;
};

/* ------------------------------------------------------------------ */
/* Patrulheiro — a Emboscada face-down                                 */
/* ------------------------------------------------------------------ */

/*
 * A reserva de Preparar Emboscada.
 *
 * Ela mora no componente de classe do Patrulheiro porque é isso que ela é: uma
 * carta guardada face-down sobre o terceiro espaço de Ação. O motor precisa
 * saber dela para três coisas — aceitar a declaração vinda daquela zona,
 * recusar outra carta naquele espaço e devolver a carta à mão quando o turno
 * passar sem ela ser usada.
 */

/** A Emboscada deste jogador, ou `null` quando não há nenhuma. */
export const emboscadaDe = (jogador: EstadoDeJogador): EmboscadaPreparada | null =>
  jogador.recurso.classe === 'patrulheiro' ? jogador.recurso.emboscada : null;

/** A Emboscada está armada — isto é, é o turno em que ela vale? */
export const emboscadaArmada = (jogador: EstadoDeJogador): EmboscadaPreparada | null => {
  const emboscada = emboscadaDe(jogador);
  return emboscada?.estado === 'armada' ? emboscada : null;
};

/** Esta carta é a que está armada na Emboscada? */
export const emboscadaArmadaCom = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  emboscadaArmada(jogador)?.carta === carta;

/** Grava a Emboscada, respeitando a classe. */
export const comEmboscada = (
  jogador: EstadoDeJogador,
  emboscada: EmboscadaPreparada | null,
): EstadoDeJogador =>
  jogador.recurso.classe === 'patrulheiro'
    ? { ...jogador, recurso: { ...jogador.recurso, emboscada } }
    : jogador;

/** O componente de classe sem Emboscada nenhuma. */
export const semEmboscada = (jogador: EstadoDeJogador): EstadoDeJogador['recurso'] =>
  jogador.recurso.classe === 'patrulheiro'
    ? { ...jogador.recurso, emboscada: null }
    : jogador.recurso;
