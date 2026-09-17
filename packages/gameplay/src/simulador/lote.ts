import type { BuildEquipada } from '@arcane-duel/rules-engine';

import { PIROMANTE, QUEBRA_MURALHAS } from '../receitas.js';
import { criarPoliticaDeBase } from './politica.js';
import type { RelatorioDaPartida } from './motor.js';
import { JOGADOR_A, JOGADOR_B, LIMITE_TECNICO_DE_TURNOS, simularPartida } from './motor.js';

/*
 * Lotes reproduzíveis.
 *
 * O lote é dividido por quem começou, porque começar é uma vantagem estrutural
 * conhecida (o segundo jogador recebe duas Reservas e o Impulso Inicial como
 * compensação, §7). Misturar os dois lados em um número só esconderia
 * exatamente aquilo que o lote existe para medir.
 */

export interface ResumoDeLado {
  readonly partidas: number;
  readonly vitoriasDeQuemComecou: number;
  readonly vitoriasDeQuemRespondeu: number;
  readonly indefinidas: number;
  readonly interrompidasPorLimiteTecnico: number;
  readonly bloqueiosDeRegra: number;
}

export interface ResumoDoLote {
  readonly semente: string;
  readonly partidas: number;
  readonly limiteTecnicoDeTurnos: number;
  readonly exploracao: number;
  /**
   * Quantas partidas distintas o lote realmente produziu.
   *
   * Com a política de base pura, o PRNG só desempata: partidas com a mesma
   * configuração inicial se repetem, e este número mostra isso em vez de
   * escondê-lo atrás de médias.
   */
  readonly linhasDistintas: number;
  readonly comA: ResumoDeLado;
  readonly comB: ResumoDeLado;
  readonly turnoMedio: number;
  readonly acoesPorPartida: number;
  readonly rupturasPorPartida: number;
  readonly respostasComCartaPorPartida: number;
  readonly respostasComDefesaInataPorPartida: number;
  readonly ultimatesPorPartida: number;
  readonly vitoriasDoGuerreiro: number;
  readonly vitoriasDoMago: number;
  readonly bloqueiosDeLentoComImpulso: number;
}

export interface ConfiguracaoDoLote {
  readonly semente: string;
  readonly partidas: number;
  readonly buildA?: BuildEquipada;
  readonly buildB?: BuildEquipada;
  readonly limiteDeTurnos?: number;
  /** Fração de decisões escolhidas ao acaso. Zero é a linha de base oficial. */
  readonly exploracao?: number;
}

const ladoVazio = (): {
  partidas: number;
  vitoriasDeQuemComecou: number;
  vitoriasDeQuemRespondeu: number;
  indefinidas: number;
  interrompidasPorLimiteTecnico: number;
  bloqueiosDeRegra: number;
} => ({
  partidas: 0,
  vitoriasDeQuemComecou: 0,
  vitoriasDeQuemRespondeu: 0,
  indefinidas: 0,
  interrompidasPorLimiteTecnico: 0,
  bloqueiosDeRegra: 0,
});

/**
 * Roda um lote determinístico.
 *
 * Cada partida recebe uma semente derivada da semente do lote, então o lote
 * inteiro se reproduz a partir de uma string só.
 */
export const rodarLote = (configuracao: ConfiguracaoDoLote): ResumoDoLote => {
  const buildA = configuracao.buildA ?? QUEBRA_MURALHAS;
  const buildB = configuracao.buildB ?? PIROMANTE;
  const limite = configuracao.limiteDeTurnos ?? LIMITE_TECNICO_DE_TURNOS;
  const exploracao = configuracao.exploracao ?? 0;
  const politica = criarPoliticaDeBase(exploracao);
  const assinaturas = new Set<string>();

  const comA = ladoVazio();
  const comB = ladoVazio();

  let turnos = 0;
  let acoes = 0;
  let rupturas = 0;
  let respostasComCarta = 0;
  let respostasComDefesaInata = 0;
  let ultimates = 0;
  let bloqueios = 0;
  let vitoriasDoGuerreiro = 0;
  let vitoriasDoMago = 0;

  for (let indice = 0; indice < configuracao.partidas; indice += 1) {
    const comecaComA = indice % 2 === 0;
    const relatorio: RelatorioDaPartida = simularPartida({
      semente: `${configuracao.semente}#${String(indice)}`,
      buildA,
      buildB,
      primeiroJogador: comecaComA ? 'a' : 'b',
      limiteDeTurnos: limite,
      politicaA: politica,
      politicaB: politica,
    });

    assinaturas.add(
      `${comecaComA ? 'a' : 'b'}|${String(relatorio.turnos)}|${String(relatorio.acoes)}|${String(relatorio.rupturas)}|${JSON.stringify(relatorio.vidaFinal)}|${relatorio.desfecho.tipo}`,
    );

    const lado = comecaComA ? comA : comB;
    lado.partidas += 1;

    if (relatorio.desfecho.tipo === 'vitoria') {
      const venceuQuemComecou = relatorio.desfecho.vencedor === relatorio.primeiroJogador;
      if (venceuQuemComecou) lado.vitoriasDeQuemComecou += 1;
      else lado.vitoriasDeQuemRespondeu += 1;

      if (relatorio.desfecho.vencedor === JOGADOR_A) vitoriasDoGuerreiro += 1;
      if (relatorio.desfecho.vencedor === JOGADOR_B) vitoriasDoMago += 1;
    } else if (relatorio.desfecho.tipo === 'indefinido') lado.indefinidas += 1;
    else if (relatorio.desfecho.tipo === 'limite-tecnico-de-turnos') {
      lado.interrompidasPorLimiteTecnico += 1;
    } else lado.bloqueiosDeRegra += 1;

    turnos += relatorio.turnos;
    acoes += relatorio.acoes;
    rupturas += relatorio.rupturas;
    respostasComCarta += relatorio.respostasComCarta;
    respostasComDefesaInata += relatorio.respostasComDefesaInata;
    ultimates += relatorio.ultimatesUsadas;
    bloqueios += relatorio.bloqueiosDeLentoComImpulso;
  }

  const total = Math.max(configuracao.partidas, 1);
  return {
    semente: configuracao.semente,
    partidas: configuracao.partidas,
    limiteTecnicoDeTurnos: limite,
    exploracao,
    linhasDistintas: assinaturas.size,
    comA,
    comB,
    turnoMedio: turnos / total,
    acoesPorPartida: acoes / total,
    rupturasPorPartida: rupturas / total,
    respostasComCartaPorPartida: respostasComCarta / total,
    respostasComDefesaInataPorPartida: respostasComDefesaInata / total,
    ultimatesPorPartida: ultimates / total,
    vitoriasDoGuerreiro,
    vitoriasDoMago,
    bloqueiosDeLentoComImpulso: bloqueios,
  };
};

export { JOGADOR_A, JOGADOR_B, LIMITE_TECNICO_DE_TURNOS };
