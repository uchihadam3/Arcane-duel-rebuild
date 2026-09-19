import type { CardId } from '@arcane-duel/shared-types';

import type { Metade } from '../arena/planta.js';

import type { BeatNaFila, PedidoDeBeat } from './fila.js';
import { duracaoDaFila, enfileirar } from './fila.js';
import type { Andamento, EspecieDeBeat } from './ritmo.js';

/*
 * O diretor de apresentação.
 *
 * O motor é autoritativo e resolve na hora: comando entra, estado novo sai. Se
 * a tela seguisse o estado diretamente, a carta desapareceria da mão e
 * apareceria no pedestal no mesmo quadro — que é teleporte, e teleporte não
 * conta história nenhuma.
 *
 * Este módulo é a diferença entre as duas coisas. Ele compara o estado velho
 * com o novo, descobre **o que se moveu**, e emite um movimento para cada
 * mudança. Enquanto o movimento roda, a peça real fica invisível na origem e no
 * destino, e um clone viaja na camada de cima. A regra nunca espera pela
 * animação: o motor já terminou quando o primeiro quadro é desenhado.
 *
 * O arquivo é puro — comparação de listas, sem DOM e sem React —, e é por isso
 * que dá para conferir por teste que jogar uma carta produz um voo da mão para
 * a Ação, e que o avanço do cooldown produz três deslizes e não um salto.
 */

export type EspecieDeMovimento =
  /** Da mão para um pedestal de Ação, ou para a bandeja de Resposta. */
  | 'mao-para-campo'
  /** Da mão da máquina para o campo dela: vira no meio do caminho. */
  | 'maquina-para-campo'
  /** Do slot de Ultimate para o centro, e de lá para fora. */
  | 'ultimate-apresentada'
  /** Do pedestal de Ação para um compartimento de cooldown. */
  | 'campo-para-cooldown'
  /** De um compartimento para o vizinho: CD3→CD2, CD2→CD1. */
  | 'cooldown-avanca'
  /** De CD1 de volta para a mão. */
  | 'cooldown-para-mao'
  /** A Passiva girando para mostrar a frente. */
  | 'passiva-revela'
  /** A Carta de Classe girando para horizontal. */
  | 'classe-ativa'
  /** A Carta de Classe saindo do campo para sempre. */
  | 'classe-exaure';

/** Onde uma peça está, para o diretor achar a âncora dela na tela. */
export interface Ancora {
  readonly tipo: 'mao' | 'mao-da-maquina' | 'campo' | 'fora';
  /** A chave da peça no campo, ou o índice na mão. */
  readonly chave: string;
}

export interface Movimento {
  /** Identidade do movimento, para não reemitir o mesmo. */
  readonly id: string;
  readonly especie: EspecieDeMovimento;
  readonly de: Ancora;
  readonly para: Ancora;
  /**
   * A carta que viaja, quando o observador pode conhecê-la.
   *
   * `null` é verso. Um movimento da máquina sai com `null` e só ganha
   * identidade quando a regra torna a carta pública — e aí o clone vira.
   */
  readonly carta: CardId | null;
  /** Vira no meio do caminho? Só quando a carta se torna pública ao chegar. */
  readonly vira: boolean;
  readonly metade: Metade;
  /** Atraso antes de começar: o instante em que a fila chama este movimento. */
  readonly atrasoMs: number;
  /**
   * Quanto este movimento leva, vindo da fila.
   *
   * Não é uma constante do voo: um voo da mão para o campo é contado em cinco
   * beats e leva mais de um segundo e meio; um deslize de cooldown é um beat
   * só. Amarrar os dois à mesma duração era o que fazia o tabuleiro se
   * rearrumar num piscar no fim do turno.
   */
  readonly duracaoMs: number;
}

/* ---------------------------------------------------------------------------
 * A diferença entre dois instantes.
 * ------------------------------------------------------------------------- */

/** Um retrato do que importa para comparar dois estados. */
export interface Retrato {
  /** Chave da peça → onde ela está. */
  readonly lugares: ReadonlyMap<string, Ancora>;
  /** As cartas na mão do humano, por chave. */
  readonly mao: readonly string[];
  /** Quantas cartas a máquina tem. */
  readonly maoDaMaquina: number;
}

const ancoraDoCampo = (chave: string): Ancora => ({ tipo: 'campo', chave });

export const retratar = (
  pecas: readonly { readonly chave: string; readonly lugar: string }[],
  mao: readonly string[],
  maoDaMaquina: number,
): Retrato => {
  const lugares = new Map<string, Ancora>();
  for (const peca of pecas) lugares.set(peca.chave, ancoraDoCampo(peca.chave));
  for (const chave of mao) lugares.set(chave, { tipo: 'mao', chave });
  return { lugares, mao, maoDaMaquina };
};

export interface DiferencaDeCena {
  readonly antes: {
    readonly pecas: readonly { readonly chave: string; readonly lugar: string }[];
    readonly mao: readonly string[];
    readonly maoDaMaquina: number;
  };
  readonly depois: {
    readonly pecas: readonly { readonly chave: string; readonly lugar: string }[];
    readonly mao: readonly string[];
    readonly maoDaMaquina: number;
  };
}

const ESPECIE_POR_DESTINO: Readonly<Record<string, EspecieDeMovimento>> = {
  acao: 'mao-para-campo',
  'acao-extra': 'mao-para-campo',
  resposta: 'mao-para-campo',
  passiva: 'mao-para-campo',
  classe: 'mao-para-campo',
  cooldown: 'campo-para-cooldown',
};

/**
 * De que espécie é um movimento dentro do campo.
 *
 * O lugar de uma carta no cooldown carrega a **zona**: `cooldown:2`. Sem isso
 * CD3 → CD2 seria "continuou no cooldown" e o avanço viraria um redesenho — o
 * jogador veria as cartas trocarem de casa sem nada se mover, que é
 * exatamente o que a tarefa proibiu.
 */
const especieDoMovimento = (de: string, para: string): EspecieDeMovimento => {
  if (de.startsWith('cooldown:') && para.startsWith('cooldown:')) return 'cooldown-avanca';
  const raiz = para.split(':')[0] ?? para;
  return ESPECIE_POR_DESTINO[raiz] ?? 'campo-para-cooldown';
};

/**
 * Os movimentos que explicam a diferença entre dois instantes.
 *
 * A ordem importa: o que sai da mão vai primeiro, o que vai para o cooldown
 * depois, e o avanço do cooldown por último. É a ordem em que as coisas
 * acontecem na regra, e apresentar fora de ordem confunde mais do que
 * teleportar.
 */
export const movimentosDaDiferenca = (diferenca: DiferencaDeCena): readonly Movimento[] => {
  const { antes, depois } = diferenca;
  const movimentos: Movimento[] = [];
  const antesPorChave = new Map(antes.pecas.map((peca) => [peca.chave, peca.lugar]));
  const naMaoAntes = new Set(antes.mao);
  const naMaoDepois = new Set(depois.mao);
  /** As peças viradas já consumidas por uma revelação. */
  const vistas = new Set<string>();

  for (const peca of depois.pecas) {
    const lugarAntes = antesPorChave.get(peca.chave);

    /* Saiu da mão e apareceu no campo: o voo principal. */
    if (lugarAntes === undefined && naMaoAntes.has(peca.chave)) {
      movimentos.push({
        id: `voo:${peca.chave}:${peca.lugar}`,
        especie: peca.lugar.startsWith('ultimate') ? 'ultimate-apresentada' : 'mao-para-campo',
        de: { tipo: 'mao', chave: peca.chave },
        para: ancoraDoCampo(peca.chave),
        carta: null,
        vira: false,
        metade: 'jogador',
        atrasoMs: 0,
        duracaoMs: 0,
      });
      continue;
    }

    /*
     * Uma Passiva que revela **não voa**: ela gira no lugar.
     *
     * A carta já estava no encaixe, virada. Quando a regra a torna pública, a
     * chave muda de `v:…passiva:N` para `c:…` — e, para quem só compara
     * chaves, isso parece uma carta nova aparecendo no campo. Sem esta
     * exceção, revelar uma Passiva dispararia um voo vindo da mão da máquina,
     * que é uma mentira sobre o que aconteceu.
     */
    if (lugarAntes === undefined && peca.lugar.startsWith('passiva')) {
      const virada = antes.pecas.find(
        (anterior) =>
          anterior.lugar === peca.lugar &&
          anterior.chave.startsWith('v:') &&
          !vistas.has(anterior.chave),
      );
      if (virada !== undefined) {
        vistas.add(virada.chave);
        movimentos.push({
          id: `revela:${peca.chave}`,
          especie: 'passiva-revela',
          de: ancoraDoCampo(virada.chave),
          para: ancoraDoCampo(peca.chave),
          carta: null,
          vira: true,
          metade: 'jogador',
          atrasoMs: 0,
          duracaoMs: 0,
        });
        continue;
      }
    }

    /*
     * Apareceu no campo sem estar na mão do humano: é da máquina.
     *
     * A carta nasce virada e **vira** quando chega, porque foi a regra que a
     * tornou pública. O jogador vê de onde ela veio sem que a câmera se mexa.
     */
    if (lugarAntes === undefined && !naMaoAntes.has(peca.chave)) {
      movimentos.push({
        id: `voo-ia:${peca.chave}:${peca.lugar}`,
        especie: 'maquina-para-campo',
        de: { tipo: 'mao-da-maquina', chave: peca.chave },
        para: ancoraDoCampo(peca.chave),
        carta: null,
        vira: true,
        metade: 'maquina',
        atrasoMs: 0,
        duracaoMs: 0,
      });
      continue;
    }

    /* Mudou de lugar dentro do campo. */
    if (lugarAntes !== undefined && lugarAntes !== peca.lugar) {
      movimentos.push({
        id: `move:${peca.chave}:${lugarAntes}>${peca.lugar}`,
        especie: especieDoMovimento(lugarAntes, peca.lugar),
        de: ancoraDoCampo(peca.chave),
        para: ancoraDoCampo(peca.chave),
        carta: null,
        vira: false,
        metade: 'jogador',
        atrasoMs: 0,
        duracaoMs: 0,
      });
    }
  }

  /* Voltou para a mão: veio de CD1. */
  for (const chave of depois.mao) {
    if (naMaoAntes.has(chave)) continue;
    if (antesPorChave.get(chave)?.startsWith('cooldown') !== true) continue;
    movimentos.push({
      id: `volta:${chave}`,
      especie: 'cooldown-para-mao',
      de: ancoraDoCampo(chave),
      para: { tipo: 'mao', chave },
      carta: null,
      vira: false,
      metade: 'jogador',
      atrasoMs: 0,
      duracaoMs: 0,
    });
  }

  /* Sumiu de vez: Exaurir, ou carta removida. */
  for (const peca of antes.pecas) {
    if (depois.pecas.some((atual) => atual.chave === peca.chave)) continue;
    if (naMaoDepois.has(peca.chave)) continue;
    if (!peca.lugar.startsWith('classe')) continue;
    movimentos.push({
      id: `exaure:${peca.chave}`,
      especie: 'classe-exaure',
      de: ancoraDoCampo(peca.chave),
      para: { tipo: 'fora', chave: peca.chave },
      carta: null,
      vira: false,
      metade: 'jogador',
      atrasoMs: 0,
      duracaoMs: 0,
    });
  }

  return movimentos;
};

/* ---------------------------------------------------------------------------
 * A fila: um beat principal por vez.
 * ------------------------------------------------------------------------- */

/** O que resolveu neste lote, além do que se moveu. */
export type EfeitoDoLote = 'nenhum' | 'comum' | 'ultimate';

export interface OpcoesDaApresentacao {
  readonly efeito?: EfeitoDoLote;
  readonly andamento?: Andamento;
}

export interface Apresentacao {
  /** Os movimentos, agora com começo e duração vindos da fila. */
  readonly movimentos: readonly Movimento[];
  readonly fila: readonly BeatNaFila[];
  /**
   * Quando o efeito da carta pode começar.
   *
   * Depois do encaixe **e** da pausa de leitura: a carta assenta, o jogador
   * lê o que foi jogado, e só então o efeito acontece. Começar o efeito junto
   * com o pouso foi o que tornou a jogada ilegível no aparelho.
   */
  readonly inicioDoEfeitoMs: number | null;
  /**
   * Quando o resultado assenta.
   *
   * É o beat em que o número do HUD tem permissão de se mexer. Antes disso
   * ele estaria contando o fim da história durante a primeira frase.
   */
  readonly inicioDoResultadoMs: number | null;
  /**
   * Quanto tempo a fila reservou para o efeito inteiro.
   *
   * O roteiro da carta é esticado para caber exatamente aqui. Assim o efeito
   * não precisa correr para terminar antes do próximo beat, nem sobra parado
   * enquanto a fila já seguiu — e o Meteoro continua sendo o momento longo
   * que ele é, porque a faixa dele é outra.
   */
  readonly janelaDoEfeitoMs: number;
  readonly duracaoMs: number;
}

/**
 * A ordem dos acontecimentos.
 *
 * Ela é narrativa, e por isso está escrita aqui em vez de ser deduzida de uma
 * tabela de prioridade: a carta entra, o efeito dela acontece, o que o efeito
 * revelou se revela, e só no fim o tabuleiro se arruma.
 */
const ORDEM: Readonly<Record<EspecieDeMovimento, number>> = {
  'mao-para-campo': 0,
  'maquina-para-campo': 0,
  'ultimate-apresentada': 0,
  'passiva-revela': 2,
  'classe-ativa': 3,
  'classe-exaure': 4,
  'campo-para-cooldown': 5,
  'cooldown-avanca': 6,
  'cooldown-para-mao': 7,
};

/** Um voo de entrada é contado em cinco beats; o resto é um beat só. */
const ehEntrada = (especie: EspecieDeMovimento): boolean =>
  especie === 'mao-para-campo' || especie === 'maquina-para-campo';

const BEAT_DO_MOVIMENTO: Readonly<Record<EspecieDeMovimento, EspecieDeBeat>> = {
  'mao-para-campo': 'viagem',
  'maquina-para-campo': 'viagem',
  'ultimate-apresentada': 'ultimate',
  'passiva-revela': 'passiva-revela',
  'classe-ativa': 'classe-ativa',
  'classe-exaure': 'exaurir',
  'campo-para-cooldown': 'cooldown-migra',
  'cooldown-avanca': 'cooldown-avanca',
  'cooldown-para-mao': 'cooldown-para-mao',
};

/** As espécies que saem em cascata quando se repetem. */
const EM_CASCATA: ReadonlySet<EspecieDeMovimento> = new Set<EspecieDeMovimento>([
  'campo-para-cooldown',
  'cooldown-avanca',
]);

/**
 * Põe o lote inteiro no tempo.
 *
 * O motor já terminou quando esta função roda — ela não decide nada, só diz
 * em que instante cada coisa é contada. É a diferença entre "o estado mudou"
 * e "o jogador entendeu que o estado mudou".
 */
export const apresentar = (
  movimentos: readonly Movimento[],
  opcoes: OpcoesDaApresentacao = {},
): Apresentacao => {
  const andamento = opcoes.andamento ?? 'normal';
  const efeito = opcoes.efeito ?? 'nenhum';

  const ordenados = [...movimentos].sort((a, b) => ORDEM[a.especie] - ORDEM[b.especie]);
  const pedidos: PedidoDeBeat[] = [];
  /** Movimento → [id do primeiro beat, id do último beat] dele. */
  const janelas = new Map<string, readonly [string, string]>();

  const antesDoEfeito = ordenados.filter((movimento) => ORDEM[movimento.especie] === 0);
  const depoisDoEfeito = ordenados.filter((movimento) => ORDEM[movimento.especie] > 0);

  const enfileirarMovimento = (movimento: Movimento, anterior: Movimento | undefined): void => {
    if (ehEntrada(movimento.especie)) {
      for (const especie of ['foco', 'levantar', 'viagem', 'encaixe', 'leitura'] as const) {
        pedidos.push({ id: `${especie}:${movimento.id}`, especie });
      }
      // O voo termina no encaixe: a leitura é pausa, e a carta já está parada.
      janelas.set(movimento.id, [`foco:${movimento.id}`, `encaixe:${movimento.id}`]);
      return;
    }
    const especie = BEAT_DO_MOVIMENTO[movimento.especie];
    const id = `${especie}:${movimento.id}`;
    const emCascata = EM_CASCATA.has(movimento.especie) && anterior?.especie === movimento.especie;
    pedidos.push(emCascata ? { id, especie, emCascata: true } : { id, especie });
    janelas.set(movimento.id, [id, id]);
  };

  antesDoEfeito.forEach((movimento, indice) => {
    enfileirarMovimento(movimento, antesDoEfeito[indice - 1]);
  });

  if (efeito === 'comum') {
    for (const especie of ['telegrafo', 'efeito', 'impacto', 'resultado'] as const) {
      pedidos.push({ id: especie, especie });
    }
  } else if (efeito === 'ultimate') {
    // A Ultimate **é** o efeito: ela não ganha telégrafo antes de si mesma.
    for (const especie of ['ultimate', 'impacto', 'resultado'] as const) {
      pedidos.push({ id: `efeito:${especie}`, especie });
    }
  }

  depoisDoEfeito.forEach((movimento, indice) => {
    enfileirarMovimento(movimento, depoisDoEfeito[indice - 1]);
  });

  const fila = enfileirar(pedidos, andamento);
  const porId = new Map(fila.map((beat) => [beat.id, beat]));

  const agendados = ordenados.map((movimento) => {
    const janela = janelas.get(movimento.id);
    const comeco = janela === undefined ? undefined : porId.get(janela[0]);
    const fim = janela === undefined ? undefined : porId.get(janela[1]);
    if (comeco === undefined || fim === undefined) return movimento;
    return {
      ...movimento,
      atrasoMs: comeco.inicioMs,
      duracaoMs: fim.fimMs - comeco.inicioMs,
    };
  });

  const primeiroDoEfeito =
    efeito === 'comum'
      ? (porId.get('telegrafo') ?? null)
      : efeito === 'ultimate'
        ? (porId.get('efeito:ultimate') ?? null)
        : null;

  const resultado = fila.find((beat) => beat.especie === 'resultado') ?? null;

  const janelaDoEfeitoMs =
    primeiroDoEfeito === null || resultado === null
      ? 0
      : resultado.fimMs - primeiroDoEfeito.inicioMs;

  return {
    movimentos: agendados,
    fila,
    inicioDoEfeitoMs: primeiroDoEfeito?.inicioMs ?? null,
    inicioDoResultadoMs: resultado?.inicioMs ?? null,
    janelaDoEfeitoMs,
    duracaoMs: duracaoDaFila(fila),
  };
};
