import type {
  CardId,
  CustoDeCarta,
  EscolhasDaAcao,
  EstadoDeJogador,
  Resultado,
} from '@arcane-duel/shared-types';
import { falha, sucesso } from '@arcane-duel/shared-types';

import { REGRAS_UNIVERSAIS } from './constants.js';
import { custoAdicionalDeLento } from './condicoes.js';
import type { ErroDeDominio } from './erros.js';
import { somarRecurso, valorDoRecurso } from './recursos.js';

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

/*
 * Custo completo, com parcela de recurso de classe.
 *
 * O pagamento é atômico: as parcelas são conferidas todas antes de qualquer uma
 * ser debitada, e o jogador só é substituído quando todas passam. Não existe
 * estado intermediário em que os pontos de Ação já saíram e a Mana faltou.
 */

export interface PagamentoCompleto {
  readonly jogador: EstadoDeJogador;
  readonly ap: number;
  readonly reserva: number;
  readonly impulso: number;
  readonly recurso: number;
  readonly consumiuLento: boolean;
}

export interface DescontosDeCusto {
  /** Redução no custo em pontos de Ação, aplicada antes do mínimo impresso. */
  readonly ap?: number;
  /** Piso do custo em pontos de Ação depois do desconto ("mínimo 1"). */
  readonly apMinimo?: number;
  /** Redução no custo em Reserva, com piso zero. */
  readonly reserva?: number;
  /** Redução na parcela de recurso de classe, com piso zero. */
  readonly recurso?: number;
  /** O custo de recurso de classe é inteiramente ignorado (Runa do Conduíte). */
  readonly ignorarRecurso?: boolean;
  /** Acréscimo no custo em pontos de Ação (Runa do Eco Exaurida). */
  readonly apAdicional?: number;
}

const semNegativoLocal = (valor: number): number => (valor < 0 ? 0 : valor);

/** Quanto da parcela variável o jogador escolheu gastar, validado contra a carta. */
export const quantidadeVariavelEscolhida = (
  carta: CardId,
  custo: CustoDeCarta,
  escolhas: EscolhasDaAcao,
): Resultado<number, ErroDeDominio> => {
  const variavel = custo.variavel;
  if (variavel === undefined) {
    return escolhas.recursoAdicional === undefined || escolhas.recursoAdicional === 0
      ? sucesso(0)
      : falha({
          tipo: 'escolha-invalida',
          carta,
          detalhe: 'a carta não tem parcela variável de custo',
        });
  }
  const escolhido = escolhas.recursoAdicional ?? variavel.minimo;
  if (!Number.isInteger(escolhido) || escolhido < variavel.minimo || escolhido > variavel.maximo) {
    return falha({
      tipo: 'escolha-invalida',
      carta,
      detalhe: `parcela variável fora do intervalo impresso ${String(variavel.minimo)}–${String(variavel.maximo)}`,
    });
  }
  return sucesso(escolhido);
};

/**
 * Paga o custo impresso inteiro de uma carta.
 *
 * A moeda decide o caminho: pontos de Ação no próprio turno, Reserva no turno
 * inimigo. A parcela de recurso de classe é somada à conta e conferida junto
 * com as outras — é isso que torna o custo atômico.
 */
export const pagarCustoCompleto = (
  jogador: EstadoDeJogador,
  carta: CardId,
  custo: CustoDeCarta,
  escolhas: EscolhasDaAcao = {},
  descontos: DescontosDeCusto = {},
): Resultado<PagamentoCompleto, ErroDeDominio> => {
  const variavel = quantidadeVariavelEscolhida(carta, custo, escolhas);
  if (!variavel.ok) return variavel;

  const parcelaFixa = custo.recurso?.quantidade ?? 0;
  const recursoAlvo = custo.recurso?.recurso ?? custo.variavel?.recurso ?? null;
  const totalDeRecurso =
    descontos.ignorarRecurso === true
      ? 0
      : semNegativoLocal(parcelaFixa + variavel.valor - (descontos.recurso ?? 0));

  if (recursoAlvo !== null && totalDeRecurso > 0) {
    const disponivel = valorDoRecurso(jogador, recursoAlvo);
    if (disponivel === null) {
      return falha({ tipo: 'recurso-indisponivel', recurso: recursoAlvo, classe: jogador.classe });
    }
    if (disponivel < totalDeRecurso) {
      return falha({
        tipo: 'recurso-insuficiente',
        recurso: recursoAlvo,
        necessario: totalDeRecurso,
        disponivel,
      });
    }
  }

  const debitarRecurso = (alvo: EstadoDeJogador): EstadoDeJogador =>
    recursoAlvo === null || totalDeRecurso === 0
      ? alvo
      : somarRecurso(alvo, recursoAlvo, -totalDeRecurso);

  if (custo.moeda === 'reserva') {
    const valor = semNegativoLocal(custo.valor - (descontos.reserva ?? 0));
    const pago = pagarComReserva(jogador, valor);
    if (!pago.ok) return pago;
    return sucesso({
      jogador: debitarRecurso(pago.valor),
      ap: 0,
      reserva: valor,
      impulso: 0,
      recurso: totalDeRecurso,
      consumiuLento: false,
    });
  }

  const comDesconto = semNegativoLocal(custo.valor - (descontos.ap ?? 0));
  const comPiso = Math.max(comDesconto, descontos.apMinimo ?? 0);
  const valorDeAp = comPiso + (descontos.apAdicional ?? 0);

  const pago = pagarComPontosDeAcao(jogador, valorDeAp);
  if (!pago.ok) return pago;

  return sucesso({
    jogador: debitarRecurso(pago.valor.jogador),
    ap: pago.valor.ap,
    reserva: 0,
    impulso: pago.valor.impulso,
    recurso: totalDeRecurso,
    consumiuLento: pago.valor.consumiuLento,
  });
};
