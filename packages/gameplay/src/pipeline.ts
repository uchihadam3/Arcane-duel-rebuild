import type { CardId, EstadoDeJogador, PlayerId, SlotDeAcao } from '@arcane-duel/shared-types';
import type { DescontosDeCusto, ErroDeDominio } from '@arcane-duel/rules-engine';
import { revelarPassiva } from '@arcane-duel/rules-engine';

import type { Contexto } from './contexto.js';
import { aplicarObrigatorio, jogadorDo, slotDe } from './contexto.js';
import type {
  AlvoDoEfeito,
  ConsultaDeCusto,
  ContextoDeRevelacao,
  EfeitoDeCarta,
  GatilhoDeRevelacao,
  Janela,
  ResumoDaResolucao,
} from './ganchos.js';
import { efeitoDeCartaDeClasse, efeitoDePassiva, efeitoJogavel } from './registro.js';

/*
 * O despachante do pipeline.
 *
 * Em cada janela ele percorre, em ordem fixa, as fontes de efeito daquela Ação:
 *
 *  1. a carta declarada;
 *  2. as Cartas de Classe usadas naquela Ação, na ordem em que foram usadas;
 *  3. a carta de Reação, quando houver;
 *  4. as Passivas reveladas do atacante e depois as do defensor.
 *
 * A ordem é fixa para que o resultado seja o mesmo em toda reprodução do log.
 */

interface Fonte {
  readonly origem: CardId;
  readonly dono: PlayerId;
  readonly efeito: EfeitoDeCarta;
  /** A carta declarada é a única cujo texto o Contrafeitiço pode cancelar. */
  readonly ehACartaDeclarada: boolean;
}

const donoDaCartaDeClasse = (ctx: Contexto, carta: CardId): PlayerId | null => {
  for (const jogador of ctx.partida.jogadores) {
    if (jogador.cartasDeClasse.some((item) => item.carta === carta)) return jogador.id;
    if (jogador.removidas.includes(carta)) return jogador.id;
  }
  return null;
};

const passivasReveladas = (jogador: EstadoDeJogador): readonly CardId[] =>
  jogador.passivas.filter((passiva) => passiva.estado !== 'oculta').map((passiva) => passiva.carta);

export const fontesDaAcao = (ctx: Contexto, alvo: AlvoDoEfeito): readonly Fonte[] => {
  const fontes: Fonte[] = [
    {
      origem: alvo.perfil.carta,
      dono: alvo.atacante,
      efeito: efeitoJogavel(alvo.perfil.carta),
      ehACartaDeclarada: true,
    },
  ];

  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  for (const uso of slot?.cartasDeClasseUsadas ?? []) {
    const dono = donoDaCartaDeClasse(ctx, uso.carta);
    const par = efeitoDeCartaDeClasse(uso.carta);
    if (dono === null || par === undefined) continue;
    fontes.push({
      origem: uso.carta,
      dono,
      efeito: uso.modo === 'ativar' ? par.ativar : par.exaurir,
      ehACartaDeclarada: false,
    });
  }

  if (alvo.reacao !== null) {
    fontes.push({
      origem: alvo.reacao.carta,
      dono: alvo.defensor,
      efeito: efeitoJogavel(alvo.reacao.carta),
      ehACartaDeclarada: false,
    });
  }

  for (const jogador of [jogadorDo(ctx, alvo.atacante), jogadorDo(ctx, alvo.defensor)]) {
    for (const carta of passivasReveladas(jogador)) {
      const efeito = efeitoDePassiva(carta);
      if (efeito === undefined) continue;
      fontes.push({ origem: carta, dono: jogador.id, efeito, ehACartaDeclarada: false });
    }
  }

  return fontes;
};

const textoCancelado = (ctx: Contexto, alvo: AlvoDoEfeito): boolean =>
  slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice)?.textoCancelado === true;

/** Roda uma janela do pipeline sobre todas as fontes da Ação. */
export const despachar = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  janela: Exclude<Janela, 'legalidade' | 'descontos' | 'inicio-do-turno' | 'fim-do-turno'>,
  resumo?: ResumoDaResolucao,
): void => {
  const cancelado = textoCancelado(ctx, alvo);

  for (const fonte of fontesDaAcao(ctx, alvo)) {
    // Contrafeitiço cancela o texto da Técnica declarada — e só dele. Custos,
    // espaço de Ação, Passivas e Cartas de Classe seguem valendo.
    if (fonte.ehACartaDeclarada && cancelado) continue;

    const comDono: AlvoDoEfeito = { ...alvo, dono: fonte.dono, origem: fonte.origem };
    if (janela === 'ao-declarar') fonte.efeito.aoDeclarar?.(ctx, comDono);
    else if (janela === 'ao-responder') fonte.efeito.aoResponder?.(ctx, comDono);
    else if (janela === 'antes-de-resolver') fonte.efeito.antesDeResolver?.(ctx, comDono);
    else if (resumo !== undefined) fonte.efeito.aposResolver?.(ctx, comDono, resumo);
  }
};

/**
 * Descontos e acréscimos de custo, somados antes de o custo ser pago.
 *
 * Consulta as Passivas reveladas do jogador e as Cartas de Classe que ele pediu
 * para usar nesta Ação. A carta declarada também pode alterar o próprio custo.
 */
export const descontosDaDeclaracao = (
  consulta: ConsultaDeCusto,
  cartasDeClasse: readonly { readonly carta: CardId; readonly modo: 'ativar' | 'exaurir' }[],
): DescontosDeCusto => {
  const partes: DescontosDeCusto[] = [
    efeitoJogavel(consulta.perfil.carta).descontos?.(consulta) ?? {},
  ];

  for (const uso of cartasDeClasse) {
    const par = efeitoDeCartaDeClasse(uso.carta);
    if (par === undefined) continue;
    const efeito = uso.modo === 'ativar' ? par.ativar : par.exaurir;
    partes.push(efeito.descontos?.(consulta) ?? {});
  }

  for (const carta of passivasReveladas(consulta.jogador)) {
    partes.push(efeitoDePassiva(carta)?.descontos?.(consulta) ?? {});
  }

  return somarDescontos(partes);
};

export const somarDescontos = (partes: readonly DescontosDeCusto[]): DescontosDeCusto => {
  let ap = 0;
  let apAdicional = 0;
  let reserva = 0;
  let recurso = 0;
  let ignorarRecurso = false;
  let apMinimo: number | undefined;

  for (const parte of partes) {
    ap += parte.ap ?? 0;
    apAdicional += parte.apAdicional ?? 0;
    reserva += parte.reserva ?? 0;
    recurso += parte.recurso ?? 0;
    ignorarRecurso = ignorarRecurso || parte.ignorarRecurso === true;
    if (parte.apMinimo !== undefined) {
      apMinimo = apMinimo === undefined ? parte.apMinimo : Math.max(apMinimo, parte.apMinimo);
    }
  }

  return {
    ...(ap === 0 ? {} : { ap }),
    ...(apAdicional === 0 ? {} : { apAdicional }),
    ...(reserva === 0 ? {} : { reserva }),
    ...(recurso === 0 ? {} : { recurso }),
    ...(ignorarRecurso ? { ignorarRecurso } : {}),
    ...(apMinimo === undefined ? {} : { apMinimo }),
  };
};

/**
 * Junta a conferência de escolhas de todas as fontes da jogada.
 *
 * A carta declarada, as Cartas de Classe pedidas e as Passivas reveladas podem
 * exigir escolha. A primeira que faltar recusa a jogada inteira, antes de
 * qualquer custo ser pago.
 */
export const recusaDeEscolhas = (
  consulta: ConsultaDeCusto,
  cartasDeClasse: readonly { readonly carta: CardId; readonly modo: 'ativar' | 'exaurir' }[],
): ErroDeDominio | null => {
  const daCarta = efeitoJogavel(consulta.perfil.carta).validarEscolhas?.(consulta) ?? null;
  if (daCarta !== null) return daCarta;

  for (const uso of cartasDeClasse) {
    const par = efeitoDeCartaDeClasse(uso.carta);
    if (par === undefined) continue;
    const efeito = uso.modo === 'ativar' ? par.ativar : par.exaurir;
    const recusa = efeito.validarEscolhas?.(consulta) ?? null;
    if (recusa !== null) return recusa;
  }

  for (const carta of passivasReveladas(consulta.jogador)) {
    const recusa = efeitoDePassiva(carta)?.validarEscolhas?.(consulta) ?? null;
    if (recusa !== null) return recusa;
  }

  return null;
};

/** Junta as recusas de legalidade das fontes que opinam sobre a jogada. */
export const recusaDeLegalidade = (
  consulta: ConsultaDeCusto,
  cartasDeClasse: readonly { readonly carta: CardId; readonly modo: 'ativar' | 'exaurir' }[],
): string | null => {
  const daCarta = efeitoJogavel(consulta.perfil.carta).legalidade?.(consulta) ?? null;
  if (daCarta !== null) return daCarta;

  for (const uso of cartasDeClasse) {
    const par = efeitoDeCartaDeClasse(uso.carta);
    if (par === undefined) continue;
    const efeito = uso.modo === 'ativar' ? par.ativar : par.exaurir;
    const recusa = efeito.legalidade?.(consulta) ?? null;
    if (recusa !== null) return recusa;
  }

  return null;
};

/**
 * Revela as Passivas cuja condição impressa acabou de acontecer.
 *
 * Uma Passiva se revela no momento do gatilho dela e permanece revelada (§12).
 * A varredura é feita nos dois jogadores porque a condição de uma Passiva pode
 * depender do que o adversário fez.
 */
export const verificarRevelacoes = (
  ctx: Contexto,
  gatilho: GatilhoDeRevelacao,
  alvo: AlvoDoEfeito | null,
  resumo: ResumoDaResolucao | null,
): void => {
  for (const jogador of [...ctx.partida.jogadores]) {
    const ocultas = jogador.passivas
      .filter((passiva) => passiva.estado === 'oculta')
      .map((passiva) => passiva.carta);

    for (const carta of ocultas) {
      const efeito = efeitoDePassiva(carta);
      if (efeito === undefined) continue;

      const revelacao: ContextoDeRevelacao = {
        gatilho,
        dono: jogador.id,
        alvo: alvo === null ? null : { ...alvo, dono: jogador.id, origem: carta },
        resumo,
      };
      if (!efeito.revelaEm(ctx, revelacao)) continue;

      aplicarObrigatorio(ctx, revelarPassiva(ctx.partida, jogador.id, carta));
      efeito.aoRevelar?.(ctx, revelacao);
    }
  }
};

/** O espaço de Ação onde a carta declarada está, já resolvida ou não. */
export const slotDaAcao = (
  ctx: Contexto,
  atacante: PlayerId,
  indice: 0 | 1 | 2 | 3,
): SlotDeAcao | undefined => slotDe(jogadorDo(ctx, atacante), indice);
