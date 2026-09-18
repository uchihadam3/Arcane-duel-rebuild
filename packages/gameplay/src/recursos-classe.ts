import type {
  CardId,
  EstadoDeFuria,
  EstadoDeJogador,
  EstadoDeJuramento,
  EstagioDeDevocao,
  FormaDoDruida,
  Nota,
  PassoDeKata,
  PlayerId,
} from '@arcane-duel/shared-types';
import { ESTADOS_DE_JURAMENTO, ESTAGIOS_DE_DEVOCAO } from '@arcane-duel/shared-types';

import type { Contexto } from './contexto.js';
import { emitir, gravarJogador, jogadorDo } from './contexto.js';

/*
 * Os componentes próprios das doze classes.
 *
 * Cada classe tem a sua forma — trilha, fichas, estados, sequência, marca,
 * Guarda, Vida — e nenhuma delas vira uma barra numérica genérica. Este arquivo
 * é a única porta entre o texto das cartas e o campo certo do recurso certo,
 * e cada função recusa em silêncio quando a classe não é a dona daquele
 * recurso: quem precisa impedir a jogada já impediu antes, na legalidade.
 */

/* ------------------------------------------------------------------ */
/* Clérigo — Devoção                                                   */
/* ------------------------------------------------------------------ */

export const devocaoDe = (jogador: EstadoDeJogador): EstagioDeDevocao | null =>
  jogador.recurso.classe === 'clerigo' ? jogador.recurso.devocao : null;

const indiceDaDevocao = (estagio: EstagioDeDevocao): number => ESTAGIOS_DE_DEVOCAO.indexOf(estagio);

/** A Devoção está em `minimo` ou acima? É o que "Requer Graça ou mais" pergunta. */
export const atendeDevocao = (jogador: EstadoDeJogador, minimo: EstagioDeDevocao): boolean => {
  const atual = devocaoDe(jogador);
  return atual !== null && indiceDaDevocao(atual) >= indiceDaDevocao(minimo);
};

const gravarDevocao = (ctx: Contexto, jogador: PlayerId, destino: EstagioDeDevocao): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'clerigo') return;
  const de = atual.recurso.devocao;
  if (de === destino) return;

  gravarJogador(ctx, { ...atual, recurso: { ...atual.recurso, devocao: destino } });
  emitir(ctx, { tipo: 'devocao-alterada', jogador, de, para: destino });
};

/** "Avance 1 estágio de Devoção." Milagre é o teto. */
export const avancarDevocao = (ctx: Contexto, jogador: PlayerId, passos = 1): void => {
  const atual = devocaoDe(jogadorDo(ctx, jogador));
  if (atual === null) return;
  const destino =
    ESTAGIOS_DE_DEVOCAO[
      Math.min(indiceDaDevocao(atual) + passos, ESTAGIOS_DE_DEVOCAO.length - 1)
    ] ?? atual;
  gravarDevocao(ctx, jogador, destino);
};

/** "Desça 1 estágio de Devoção." Vigília é o piso. */
export const descerDevocao = (ctx: Contexto, jogador: PlayerId, passos = 1): void => {
  const atual = devocaoDe(jogadorDo(ctx, jogador));
  if (atual === null) return;
  const destino = ESTAGIOS_DE_DEVOCAO[Math.max(indiceDaDevocao(atual) - passos, 0)] ?? atual;
  gravarDevocao(ctx, jogador, destino);
};

/** "Consome Milagre, retornando a Vigília." */
export const consumirMilagre = (ctx: Contexto, jogador: PlayerId): void => {
  gravarDevocao(ctx, jogador, 'vigilia');
};

/* ------------------------------------------------------------------ */
/* Necromante — Almas                                                  */
/* ------------------------------------------------------------------ */

export interface Almas {
  readonly controladas: number;
  readonly cemiterio: number;
  readonly anexadas: readonly CardId[];
}

export const almasDe = (jogador: EstadoDeJogador): Almas | null =>
  jogador.recurso.classe === 'necromante'
    ? {
        controladas: jogador.recurso.almasControladas,
        cemiterio: jogador.recurso.almasNoCemiterio,
        anexadas: jogador.recurso.almasAnexadas,
      }
    : null;

const gravarAlmas = (ctx: Contexto, jogador: PlayerId, almas: Almas): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'necromante') return;
  gravarJogador(ctx, {
    ...atual,
    recurso: {
      ...atual.recurso,
      almasControladas: almas.controladas,
      almasNoCemiterio: almas.cemiterio,
      almasAnexadas: almas.anexadas,
    },
  });
};

/** "Colha 1 Alma do Cemitério, se houver." */
export const colherAlma = (ctx: Contexto, jogador: PlayerId, quantidade = 1): number => {
  const almas = almasDe(jogadorDo(ctx, jogador));
  if (almas === null) return 0;

  const colhidas = Math.min(quantidade, almas.cemiterio);
  if (colhidas === 0) return 0;

  gravarAlmas(ctx, jogador, {
    ...almas,
    controladas: almas.controladas + colhidas,
    cemiterio: almas.cemiterio - colhidas,
  });
  for (let vez = 0; vez < colhidas; vez += 1) {
    emitir(ctx, { tipo: 'alma-movida', jogador, de: 'cemiterio', para: 'controlada', servo: null });
  }
  return colhidas;
};

/** "Gaste N Almas." Almas gastas voltam para o Cemitério. */
export const gastarAlmas = (ctx: Contexto, jogador: PlayerId, quantidade: number): number => {
  const almas = almasDe(jogadorDo(ctx, jogador));
  if (almas === null) return 0;

  const gastas = Math.min(quantidade, almas.controladas);
  if (gastas === 0) return 0;

  gravarAlmas(ctx, jogador, {
    ...almas,
    controladas: almas.controladas - gastas,
    cemiterio: almas.cemiterio + gastas,
  });
  for (let vez = 0; vez < gastas; vez += 1) {
    emitir(ctx, { tipo: 'alma-movida', jogador, de: 'controlada', para: 'cemiterio', servo: null });
  }
  return gastas;
};

/** Coloca 1 Alma controlada sobre um Servo que ainda não tenha Alma. */
export const anexarAlma = (ctx: Contexto, jogador: PlayerId, servo: CardId): boolean => {
  const almas = almasDe(jogadorDo(ctx, jogador));
  if (almas === null || almas.controladas <= 0 || almas.anexadas.includes(servo)) return false;

  gravarAlmas(ctx, jogador, {
    controladas: almas.controladas - 1,
    cemiterio: almas.cemiterio,
    anexadas: [...almas.anexadas, servo],
  });
  emitir(ctx, { tipo: 'alma-movida', jogador, de: 'controlada', para: 'servo', servo });
  return true;
};

/**
 * Tira a Alma de um Servo.
 *
 * "Uma Alma anexada permanece até ser usada por aquele Servo ou até o Servo ser
 * Exaurido. Se o Servo for Exaurido com uma Alma anexada, a Alma retorna ao
 * Cemitério." Usar e Exaurir mandam a ficha para o mesmo lugar.
 */
export const liberarAlmaDoServo = (ctx: Contexto, jogador: PlayerId, servo: CardId): boolean => {
  const almas = almasDe(jogadorDo(ctx, jogador));
  if (almas?.anexadas.includes(servo) !== true) return false;

  gravarAlmas(ctx, jogador, {
    controladas: almas.controladas,
    cemiterio: almas.cemiterio + 1,
    anexadas: almas.anexadas.filter((carta) => carta !== servo),
  });
  emitir(ctx, { tipo: 'alma-movida', jogador, de: 'servo', para: 'cemiterio', servo });
  return true;
};

/* ------------------------------------------------------------------ */
/* Paladino — Juramento                                                */
/* ------------------------------------------------------------------ */

export const juramentoDe = (jogador: EstadoDeJogador): EstadoDeJuramento | null =>
  jogador.recurso.classe === 'paladino' ? jogador.recurso.juramento : null;

const indiceDoJuramento = (estado: EstadoDeJuramento): number =>
  ESTADOS_DE_JURAMENTO.indexOf(estado);

/** O Juramento está em `minimo` ou acima? */
export const atendeJuramento = (jogador: EstadoDeJogador, minimo: EstadoDeJuramento): boolean => {
  const atual = juramentoDe(jogador);
  return atual !== null && indiceDoJuramento(atual) >= indiceDoJuramento(minimo);
};

const gravarJuramento = (ctx: Contexto, jogador: PlayerId, destino: EstadoDeJuramento): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'paladino') return;
  const de = atual.recurso.juramento;
  if (de === destino) return;

  gravarJogador(ctx, { ...atual, recurso: { ...atual.recurso, juramento: destino } });
  emitir(ctx, { tipo: 'juramento-alterado', jogador, de, para: destino });
};

export const subirJuramento = (ctx: Contexto, jogador: PlayerId, passos = 1): void => {
  const atual = juramentoDe(jogadorDo(ctx, jogador));
  if (atual === null) return;
  const destino =
    ESTADOS_DE_JURAMENTO[
      Math.min(indiceDoJuramento(atual) + passos, ESTADOS_DE_JURAMENTO.length - 1)
    ] ?? atual;
  gravarJuramento(ctx, jogador, destino);
};

export const descerJuramento = (ctx: Contexto, jogador: PlayerId, passos = 1): void => {
  const atual = juramentoDe(jogadorDo(ctx, jogador));
  if (atual === null) return;
  const destino = ESTADOS_DE_JURAMENTO[Math.max(indiceDoJuramento(atual) - passos, 0)] ?? atual;
  gravarJuramento(ctx, jogador, destino);
};

/* ------------------------------------------------------------------ */
/* Ladino — Brechas                                                    */
/* ------------------------------------------------------------------ */

/** Teto documentado: "pode criar até 3 fichas de Brecha sobre o adversário". */
export const MAXIMO_DE_BRECHAS = 3;

export const brechasDe = (jogador: EstadoDeJogador): number | null =>
  jogador.recurso.classe === 'ladino' ? jogador.recurso.brechasNoAdversario : null;

const gravarBrechas = (ctx: Contexto, jogador: PlayerId, total: number): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'ladino') return;
  const antes = atual.recurso.brechasNoAdversario;
  if (antes === total) return;

  gravarJogador(ctx, { ...atual, recurso: { ...atual.recurso, brechasNoAdversario: total } });
  emitir(ctx, { tipo: 'brechas-alteradas', jogador, delta: total - antes, total });
};

/** "Crie N Brechas", respeitando o teto de três. */
export const criarBrechas = (ctx: Contexto, jogador: PlayerId, quantidade = 1): number => {
  const atual = brechasDe(jogadorDo(ctx, jogador));
  if (atual === null) return 0;
  const total = Math.min(atual + quantidade, MAXIMO_DE_BRECHAS);
  gravarBrechas(ctx, jogador, total);
  return total - atual;
};

/** "Consuma N Brechas." Devolve quantas foram de fato consumidas. */
export const consumirBrechas = (ctx: Contexto, jogador: PlayerId, quantidade: number): number => {
  const atual = brechasDe(jogadorDo(ctx, jogador));
  if (atual === null) return 0;
  const consumidas = Math.min(quantidade, atual);
  gravarBrechas(ctx, jogador, atual - consumidas);
  return consumidas;
};

/** "No fim do turno do Ladino, todas as Brechas não consumidas desaparecem." */
export const limparBrechas = (ctx: Contexto, jogador: PlayerId): void => {
  gravarBrechas(ctx, jogador, 0);
};

/* ------------------------------------------------------------------ */
/* Bardo — Notas e Cadência                                            */
/* ------------------------------------------------------------------ */

export const notasDe = (jogador: EstadoDeJogador): readonly Nota[] | null =>
  jogador.recurso.classe === 'bardo' ? jogador.recurso.sequenciaDeNotas : null;

export const notaAnterior = (jogador: EstadoDeJogador): Nota | null => {
  const notas = notasDe(jogador);
  return notas === null || notas.length === 0 ? null : (notas[notas.length - 1] ?? null);
};

export const cadenciasDoTurno = (jogador: EstadoDeJogador): number =>
  jogador.recurso.classe === 'bardo' ? jogador.recurso.cadenciasNoTurno : 0;

export const notasDistintasNoTurno = (jogador: EstadoDeJogador): number =>
  new Set(notasDe(jogador) ?? []).size;

/**
 * Registra a Nota de uma Ação e diz se ela produziu Cadência.
 *
 * "Quando duas Ações consecutivas do Bardo possuem Notas diferentes, ocorre
 * Cadência." A primeira Ação do turno não tem anterior, então não cria Cadência.
 */
export const registrarNota = (ctx: Contexto, jogador: PlayerId, nota: Nota): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'bardo') return false;

  const anterior = notaAnterior(atual);
  const cadencia = anterior !== null && anterior !== nota;

  gravarJogador(ctx, {
    ...atual,
    recurso: {
      ...atual.recurso,
      sequenciaDeNotas: [...atual.recurso.sequenciaDeNotas, nota],
      cadenciasNoTurno: atual.recurso.cadenciasNoTurno + (cadencia ? 1 : 0),
    },
  });
  emitir(ctx, { tipo: 'nota-executada', jogador, nota, cadencia });
  return cadencia;
};

/** A sequência de Notas é do turno: ela recomeça quando o turno recomeça. */
export const reiniciarNotas = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'bardo') return;
  gravarJogador(ctx, {
    ...atual,
    recurso: { ...atual.recurso, sequenciaDeNotas: [], cadenciasNoTurno: 0 },
  });
};

/* ------------------------------------------------------------------ */
/* Monge — Chi e Kata                                                  */
/* ------------------------------------------------------------------ */

/** Exatamente três pedras: não existe uma quarta. */
export const PEDRAS_DE_CHI = 3;

export const chiProntas = (jogador: EstadoDeJogador): number =>
  jogador.recurso.classe === 'monge'
    ? jogador.recurso.chi.filter((pedra) => pedra === 'pronta').length
    : 0;

const gravarChi = (ctx: Contexto, jogador: PlayerId, prontas: number): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'monge') return;

  const antes = chiProntas(atual);
  const alvo = Math.max(0, Math.min(prontas, PEDRAS_DE_CHI));
  if (antes === alvo) return;

  gravarJogador(ctx, {
    ...atual,
    recurso: {
      ...atual.recurso,
      chi: [
        alvo >= 1 ? 'pronta' : 'gasta',
        alvo >= 2 ? 'pronta' : 'gasta',
        alvo >= 3 ? 'pronta' : 'gasta',
      ],
    },
  });
  emitir(ctx, { tipo: 'chi-alterado', jogador, delta: alvo - antes, prontas: alvo });
};

/** "Gaste N Chi." Vira as pedras para o lado Gasto. */
export const gastarChi = (ctx: Contexto, jogador: PlayerId, quantidade: number): number => {
  const prontas = chiProntas(jogadorDo(ctx, jogador));
  const gastas = Math.min(quantidade, prontas);
  if (gastas === 0) return 0;
  gravarChi(ctx, jogador, prontas - gastas);
  return gastas;
};

/** "Recupere N Chi Gasto." Nunca passa de três pedras. */
export const recuperarChi = (ctx: Contexto, jogador: PlayerId, quantidade = 1): number => {
  const prontas = chiProntas(jogadorDo(ctx, jogador));
  const recuperadas = Math.min(quantidade, PEDRAS_DE_CHI - prontas);
  if (recuperadas === 0) return 0;
  gravarChi(ctx, jogador, prontas + recuperadas);
  return recuperadas;
};

export const kataDe = (jogador: EstadoDeJogador): readonly PassoDeKata[] =>
  jogador.recurso.classe === 'monge' ? jogador.recurso.sequenciaDeKata : [];

export const passoAnteriorDoKata = (jogador: EstadoDeJogador): PassoDeKata | null => {
  const passos = kataDe(jogador);
  return passos.length === 0 ? null : (passos[passos.length - 1] ?? null);
};

/** A ordem Abertura, Fluxo, Finalização foi completada nesta sequência? */
export const kataCompleto = (passos: readonly PassoDeKata[]): boolean => {
  const ultimos = passos.slice(-3);
  return (
    ultimos.length === 3 &&
    ultimos[0] === 'abertura' &&
    ultimos[1] === 'fluxo' &&
    ultimos[2] === 'finalizacao'
  );
};

export const registrarPassoDeKata = (
  ctx: Contexto,
  jogador: PlayerId,
  passo: PassoDeKata,
): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'monge') return false;

  const sequencia = [...atual.recurso.sequenciaDeKata, passo];
  gravarJogador(ctx, { ...atual, recurso: { ...atual.recurso, sequenciaDeKata: sequencia } });
  emitir(ctx, { tipo: 'kata-avancado', jogador, passo });

  const completou = kataCompleto(sequencia);
  if (completou) emitir(ctx, { tipo: 'kata-completado', jogador });
  return completou;
};

export const reiniciarKata = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'monge') return;
  gravarJogador(ctx, { ...atual, recurso: { ...atual.recurso, sequenciaDeKata: [] } });
};

/* ------------------------------------------------------------------ */
/* Patrulheiro — Marca da Presa                                        */
/* ------------------------------------------------------------------ */

export const temMarca = (jogador: EstadoDeJogador): boolean =>
  jogador.recurso.classe === 'patrulheiro' && jogador.recurso.marcaDaPresa;

const gravarMarca = (ctx: Contexto, jogador: PlayerId, presente: boolean): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'patrulheiro') return;
  if (atual.recurso.marcaDaPresa === presente) return;

  gravarJogador(ctx, { ...atual, recurso: { ...atual.recurso, marcaDaPresa: presente } });
  emitir(ctx, { tipo: 'marca-da-presa-alterada', jogador, presente });
};

/** "Marque a presa." É uma Marca só: marcar de novo não acumula. */
export const marcarPresa = (ctx: Contexto, jogador: PlayerId): void => {
  gravarMarca(ctx, jogador, true);
};

/** "Explore a Marca": ela é removida depois da resolução. */
export const removerMarca = (ctx: Contexto, jogador: PlayerId): void => {
  gravarMarca(ctx, jogador, false);
};

/* ------------------------------------------------------------------ */
/* Bárbaro — a própria Guarda                                          */
/* ------------------------------------------------------------------ */

/** Teto de redução voluntária de uma habilidade normal, por turno próprio. */
export const LIMITE_DE_REDUCAO_VOLUNTARIA = 2;

/** Contido de 4 a 6, Enfurecido de 1 a 3, Desencadeado em 0. */
export const estadoDeFuria = (jogador: EstadoDeJogador): EstadoDeFuria => {
  if (jogador.guarda === 0) return 'desencadeado';
  return jogador.guarda <= 3 ? 'enfurecido' : 'contido';
};

export const guardaJaReduzidaNoTurno = (jogador: EstadoDeJogador): number =>
  jogador.recurso.classe === 'barbaro' ? jogador.recurso.guardaReduzidaVoluntariamenteNoTurno : 0;

/** Registra quanto da própria Guarda foi reduzida voluntariamente neste turno. */
export const somarReducaoVoluntaria = (
  ctx: Contexto,
  jogador: PlayerId,
  quantidade: number,
): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'barbaro' || quantidade === 0) return;
  gravarJogador(ctx, {
    ...atual,
    recurso: {
      ...atual.recurso,
      guardaReduzidaVoluntariamenteNoTurno:
        atual.recurso.guardaReduzidaVoluntariamenteNoTurno + quantidade,
    },
  });
};

export const reiniciarReducaoVoluntaria = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'barbaro') return;
  gravarJogador(ctx, {
    ...atual,
    recurso: { ...atual.recurso, guardaReduzidaVoluntariamenteNoTurno: 0 },
  });
};

/* ------------------------------------------------------------------ */
/* Druida — Forma                                                      */
/* ------------------------------------------------------------------ */

export const formaDe = (jogador: EstadoDeJogador): FormaDoDruida | null =>
  jogador.recurso.classe === 'druida' ? jogador.recurso.forma : null;

export const metamorfoseGratuitaDisponivel = (jogador: EstadoDeJogador): boolean =>
  jogador.recurso.classe === 'druida' && !jogador.recurso.metamorfoseGratuitaUsadaNoTurno;

/** Muda de Forma. `gratuita` marca a troca do início do turno. */
export const mudarForma = (
  ctx: Contexto,
  jogador: PlayerId,
  destino: FormaDoDruida,
  gratuita: boolean,
): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'druida') return false;
  const de = atual.recurso.forma;

  gravarJogador(ctx, {
    ...atual,
    recurso: {
      ...atual.recurso,
      forma: destino,
      metamorfoseGratuitaUsadaNoTurno: gratuita
        ? true
        : atual.recurso.metamorfoseGratuitaUsadaNoTurno,
    },
  });
  if (de !== destino) emitir(ctx, { tipo: 'forma-alterada', jogador, de, para: destino, gratuita });
  return de !== destino;
};

export const reiniciarMetamorfose = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'druida') return;
  gravarJogador(ctx, {
    ...atual,
    recurso: { ...atual.recurso, metamorfoseGratuitaUsadaNoTurno: false },
  });
};

/* ------------------------------------------------------------------ */
/* Bruxo — Preço Proibido                                              */
/* ------------------------------------------------------------------ */

export const precoProibidoDisponivel = (jogador: EstadoDeJogador): boolean =>
  jogador.recurso.classe === 'bruxo' && !jogador.recurso.precoProibidoUsadoNoTurno;

export const marcarPrecoProibidoUsado = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'bruxo') return;
  gravarJogador(ctx, {
    ...atual,
    recurso: { ...atual.recurso, precoProibidoUsadoNoTurno: true },
  });
};

export const reiniciarPrecoProibido = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'bruxo') return;
  gravarJogador(ctx, {
    ...atual,
    recurso: { ...atual.recurso, precoProibidoUsadoNoTurno: false },
  });
};
