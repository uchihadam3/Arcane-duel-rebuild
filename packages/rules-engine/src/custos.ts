import type { EstadoDeJogador, Resultado } from '@arcane-duel/shared-types';
import { falha, sucesso } from '@arcane-duel/shared-types';

import { REGRAS_UNIVERSAIS } from './constants.js';
import { custoAdicionalDeLento } from './condicoes.js';
import type { ErroDeDominio } from './erros.js';

/*
 * Pagamento de custos.
 *
 * Ações do próprio turno são pagas com pontos de Ação; Reações no turno
 * inimigo são pagas com Reserva. O Impulso Inicial é um caso à parte e vive
 * só aqui.
 */

export interface PagamentoEmAP {
  readonly jogador: EstadoDeJogador;
  readonly custoFinal: number;
  readonly ap: number;
  readonly impulso: number;
  readonly consumiuLento: boolean;
}

/**
 * Paga uma Ação com pontos de Ação, usando o Impulso Inicial quando ele é
 * legal.
 *
 * O Impulso fornece **exatamente um** ponto e só quando os pontos restantes
 * não bastam: todos os pontos normais são gastos primeiro (§7). Ele nunca
 * cobre uma diferença de dois ou mais.
 *
 * Lento soma um ponto ao custo enquanto houver acúmulo, e o acúmulo só é
 * consumido quando a Ação de fato paga esse aumento (§15).
 */
export const pagarComPontosDeAcao = (
  jogador: EstadoDeJogador,
  custoImpresso: number,
): Resultado<PagamentoEmAP, ErroDeDominio> => {
  const adicionalDeLento = custoAdicionalDeLento(jogador);
  const custoFinal = custoImpresso + adicionalDeLento;

  if (jogador.pontosDeAcao >= custoFinal) {
    return sucesso({
      jogador: { ...jogador, pontosDeAcao: jogador.pontosDeAcao - custoFinal },
      custoFinal,
      ap: custoFinal,
      impulso: 0,
      consumiuLento: adicionalDeLento > 0,
    });
  }

  const semImpulso = falha<ErroDeDominio>({
    tipo: 'ap-insuficiente',
    necessario: custoFinal,
    disponivel: jogador.pontosDeAcao + (jogador.impulsoInicial ? 1 : 0),
  });

  if (!jogador.impulsoInicial) return semImpulso;

  if (adicionalDeLento > 0) {
    // O documento não diz se o "custo" que o Impulso completa é o impresso ou
    // o já aumentado por Lento, e as duas leituras dão respostas diferentes.
    // Quando elas divergem, escolher em silêncio criaria uma regra que ninguém
    // escreveu: o motor recusa, e o caso fica registrado em
    // docs/AMBIGUIDADES.md. Quando nenhuma das leituras permitiria o Impulso,
    // não há ambiguidade nenhuma — falta AP e pronto.
    const faltandoPeloImpresso = custoImpresso - jogador.pontosDeAcao;
    const faltandoPeloFinal = custoFinal - jogador.pontosDeAcao;
    const algumaLeituraPermite =
      faltandoPeloImpresso === REGRAS_UNIVERSAIS.impulsoInicial ||
      faltandoPeloFinal === REGRAS_UNIVERSAIS.impulsoInicial;

    return algumaLeituraPermite
      ? falha({ tipo: 'interacao-nao-definida', detalhe: 'lento-com-impulso-inicial' })
      : semImpulso;
  }

  if (custoFinal - jogador.pontosDeAcao !== REGRAS_UNIVERSAIS.impulsoInicial) return semImpulso;

  return sucesso({
    jogador: { ...jogador, pontosDeAcao: 0, impulsoInicial: false },
    custoFinal,
    ap: jogador.pontosDeAcao,
    impulso: REGRAS_UNIVERSAIS.impulsoInicial,
    consumiuLento: false,
  });
};

/** Paga uma carta de Reação com Reserva, no turno inimigo. */
export const pagarComReserva = (
  jogador: EstadoDeJogador,
  custo: number,
): Resultado<EstadoDeJogador, ErroDeDominio> =>
  jogador.reserva >= custo
    ? sucesso({ ...jogador, reserva: jogador.reserva - custo })
    : falha({ tipo: 'reserva-insuficiente', necessario: custo, disponivel: jogador.reserva });

/**
 * Converte pontos de Ação não usados em Reserva, no fim do próprio turno.
 *
 * No máximo dois. O Impulso Inicial nunca entra nessa conta: ele não é ponto
 * de Ação guardável e some no fim do turno.
 */
export const converterEmReserva = (
  jogador: EstadoDeJogador,
): { readonly jogador: EstadoDeJogador; readonly reserva: number } => {
  const convertido = Math.min(jogador.pontosDeAcao, REGRAS_UNIVERSAIS.maximoDeReserva);
  return {
    jogador: { ...jogador, reserva: convertido, pontosDeAcao: 0 },
    reserva: convertido,
  };
};
