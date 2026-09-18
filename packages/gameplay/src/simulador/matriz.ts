import type { EstadoDaPartida } from '@arcane-duel/shared-types';
import type { BuildEquipada } from '@arcane-duel/rules-engine';

import { RECEITAS_INICIAIS } from '../receitas.js';
import { conferirInvariantes } from './invariantes.js';
import type { ComandoIlegal } from './motor.js';
import { JOGADOR_A, LIMITE_TECNICO_DE_TURNOS, simularPartida } from './motor.js';

/*
 * A matriz de doze por doze.
 *
 * Cada par não ordenado de classes — incluindo os doze espelhos — é rodado nas
 * duas posições iniciais, porque começar é uma vantagem estrutural conhecida
 * (§7) e misturar as duas posições em um número só esconderia exatamente o que
 * a matriz existe para mostrar.
 *
 * 12 classes → 78 pares não ordenados → 156 configurações.
 *
 * A matriz é **descritiva**. Ela não rebalanceia nada, não ajusta número
 * nenhum e não recomenda mudança de carta: ela mede o que o catálogo atual
 * produz sob a política de base.
 */

export const CLASSES_DA_MATRIZ = Object.keys(
  RECEITAS_INICIAIS,
) as readonly (keyof typeof RECEITAS_INICIAIS)[];

export interface ConfiguracaoDaMatriz {
  readonly semente: string;
  /** Partidas por configuração; 156 configurações no total. */
  readonly partidasPorConfiguracao: number;
  readonly limiteDeTurnos?: number;
}

export interface ResultadoDoPar {
  readonly classeA: string;
  readonly classeB: string;
  readonly partidas: number;
  readonly vitoriasDeA: number;
  readonly vitoriasDeB: number;
  readonly indefinidas: number;
  readonly interrompidas: number;
  /** Vitórias de quem começou, somando as duas posições iniciais. */
  readonly vitoriasDeQuemComecou: number;
  readonly turnoMedio: number;
}

export interface ResumoDaMatriz {
  readonly semente: string;
  readonly classes: readonly string[];
  readonly configuracoes: number;
  readonly partidas: number;
  readonly pares: readonly ResultadoDoPar[];
  /** Vitórias por classe no conjunto inteiro, contando os dois lados. */
  readonly vitoriasPorClasse: Readonly<Record<string, number>>;
  readonly partidasPorClasse: Readonly<Record<string, number>>;
  readonly turnoMedio: number;
  readonly indefinidas: number;
  readonly interrompidasPorLimiteTecnico: number;
  readonly bloqueiosDeRegra: number;
  /** Precisa ser zero: um comando ilegal invalida a matriz inteira. */
  readonly comandosIlegais: number;
  readonly exemplosDeComandoIlegal: readonly ComandoIlegal[];
  /** Precisa ser vazia: qualquer linha aqui é invariante quebrada. */
  readonly invariantesQuebradas: readonly string[];
}

const receita = (classe: string): BuildEquipada =>
  RECEITAS_INICIAIS[classe as keyof typeof RECEITAS_INICIAIS];

/** Os 78 pares não ordenados das doze classes, mirrors incluídos. */
export const paresDaMatriz = (
  classes: readonly string[],
): readonly { readonly a: string; readonly b: string }[] => {
  const pares: { readonly a: string; readonly b: string }[] = [];
  for (let i = 0; i < classes.length; i += 1) {
    for (let j = i; j < classes.length; j += 1) {
      const a = classes[i];
      const b = classes[j];
      if (a === undefined || b === undefined) continue;
      pares.push({ a, b });
    }
  }
  return pares;
};

/**
 * Roda a matriz inteira e devolve o resumo descritivo dela.
 *
 * A semente do lote deriva a semente de cada partida, então a matriz inteira
 * se reproduz a partir de uma string só.
 */
export const rodarMatriz = (configuracao: ConfiguracaoDaMatriz): ResumoDaMatriz => {
  const classes = [...CLASSES_DA_MATRIZ];
  const limite = configuracao.limiteDeTurnos ?? LIMITE_TECNICO_DE_TURNOS;

  const vitoriasPorClasse: Record<string, number> = {};
  const partidasPorClasse: Record<string, number> = {};
  for (const classe of classes) {
    vitoriasPorClasse[classe] = 0;
    partidasPorClasse[classe] = 0;
  }

  const pares: ResultadoDoPar[] = [];
  const ilegais: ComandoIlegal[] = [];
  const quebras = new Set<string>();
  let comandosIlegais = 0;
  let indefinidas = 0;
  let interrompidas = 0;
  let bloqueios = 0;
  let turnos = 0;
  let partidas = 0;
  let configuracoes = 0;

  const observador = (estado: EstadoDaPartida): void => {
    for (const quebra of conferirInvariantes(estado)) quebras.add(quebra);
  };

  for (const par of paresDaMatriz(classes)) {
    let vitoriasDeA = 0;
    let vitoriasDeB = 0;
    let indefinidasDoPar = 0;
    let interrompidasDoPar = 0;
    let turnosDoPar = 0;
    let partidasDoPar = 0;
    let comecouVenceu = 0;

    for (const primeiro of ['a', 'b'] as const) {
      configuracoes += 1;
      for (let n = 0; n < configuracao.partidasPorConfiguracao; n += 1) {
        const relatorio = simularPartida({
          semente: `${configuracao.semente}:${par.a}:${par.b}:${primeiro}:${String(n)}`,
          buildA: receita(par.a),
          buildB: receita(par.b),
          primeiroJogador: primeiro,
          limiteDeTurnos: limite,
          observador,
        });

        partidasDoPar += 1;
        turnosDoPar += relatorio.turnos;

        switch (relatorio.desfecho.tipo) {
          case 'vitoria': {
            const venceuA = relatorio.desfecho.vencedor === JOGADOR_A;
            if (venceuA) vitoriasDeA += 1;
            else vitoriasDeB += 1;
            if ((primeiro === 'a') === venceuA) comecouVenceu += 1;
            break;
          }
          case 'indefinido':
            indefinidasDoPar += 1;
            break;
          case 'limite-tecnico-de-turnos':
            interrompidasDoPar += 1;
            break;
          case 'bloqueio-de-regra':
            bloqueios += 1;
            break;
          case 'comando-ilegal':
            comandosIlegais += 1;
            if (ilegais.length < 5) ilegais.push(relatorio.desfecho.primeiro);
            break;
        }
      }
    }

    vitoriasPorClasse[par.a] = (vitoriasPorClasse[par.a] ?? 0) + vitoriasDeA;
    vitoriasPorClasse[par.b] = (vitoriasPorClasse[par.b] ?? 0) + vitoriasDeB;
    partidasPorClasse[par.a] = (partidasPorClasse[par.a] ?? 0) + partidasDoPar;
    if (par.a !== par.b) {
      partidasPorClasse[par.b] = (partidasPorClasse[par.b] ?? 0) + partidasDoPar;
    }

    partidas += partidasDoPar;
    turnos += turnosDoPar;
    indefinidas += indefinidasDoPar;
    interrompidas += interrompidasDoPar;

    pares.push({
      classeA: par.a,
      classeB: par.b,
      partidas: partidasDoPar,
      vitoriasDeA,
      vitoriasDeB,
      indefinidas: indefinidasDoPar,
      interrompidas: interrompidasDoPar,
      vitoriasDeQuemComecou: comecouVenceu,
      turnoMedio: partidasDoPar === 0 ? 0 : turnosDoPar / partidasDoPar,
    });
  }

  return {
    semente: configuracao.semente,
    classes,
    configuracoes,
    partidas,
    pares,
    vitoriasPorClasse,
    partidasPorClasse,
    turnoMedio: partidas === 0 ? 0 : turnos / partidas,
    indefinidas,
    interrompidasPorLimiteTecnico: interrompidas,
    bloqueiosDeRegra: bloqueios,
    comandosIlegais,
    exemplosDeComandoIlegal: ilegais,
    invariantesQuebradas: [...quebras],
  };
};
