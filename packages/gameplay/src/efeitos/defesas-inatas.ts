import type {
  CardId,
  EstadoDeJogador,
  PlayerId,
  ReforcoEscolhido,
} from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';
import type { ErroDeDominio } from '@arcane-duel/rules-engine';
import { podePagarComVida, valorDoRecurso } from '@arcane-duel/rules-engine';

import { ganharRecurso, pagarComGuarda, pagarComVida, reduzirNaResposta } from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { consumirLimitePorTurno, jogadorDo, registrarAnotacao } from '../contexto.js';
import type { AlvoDoEfeito } from '../ganchos.js';
import {
  almasDe,
  atendeDevocao,
  chiProntas,
  formaDe,
  gastarAlmas,
  gastarChi,
  juramentoDe,
} from '../recursos-classe.js';
import { lerPromessa } from './comum.js';

/*
 * As doze Defesas Inatas.
 *
 * Cada classe tem a sua, sempre uma vez por turno inimigo e sempre como
 * Resposta. Elas não são cartas: não estão no catálogo, não vão para cooldown
 * e não gastam Reserva. O preço de cada uma é o que o CARD_CATALOG imprime —
 * Mana, Alma, Chi, Guarda, Vida, ou preço nenhum.
 *
 * Nenhuma classe cai em um comportamento padrão: uma classe sem entrada aqui
 * simplesmente não tem Defesa Inata, e o comando é recusado.
 */

const origem = (nome: string): CardId => cardId(`sistema:${nome}`);

export const ORIGEM_GUARDA_MARCIAL = origem('guarda-marcial');
export const ORIGEM_BARREIRA_ARCANA = origem('barreira-arcana');
export const ORIGEM_PRECE_PROTETORA = origem('prece-protetora');
export const ORIGEM_OSSOS_GUARDIOES = origem('ossos-guardioes');
export const ORIGEM_ESCUDO_CONSAGRADO = origem('escudo-consagrado');
export const ORIGEM_ESQUIVA_CALCULADA = origem('esquiva-calculada');
export const ORIGEM_CONTRATEMPO = origem('contratempo');
export const ORIGEM_DESVIO_CIRCULAR = origem('desvio-circular');
export const ORIGEM_RECUO_TATICO = origem('recuo-tatico');
export const ORIGEM_AGUENTAR_NA_CARNE = origem('aguentar-na-carne');
export const ORIGEM_INSTINTO_MUTAVEL = origem('instinto-mutavel');
export const ORIGEM_VEU_PROFANO = origem('veu-profano');

const POSTURA_DA_FORTALEZA = cardId('WC01');

const NOMES: Readonly<Record<string, string>> = {
  guerreiro: 'Guarda Marcial',
  mago: 'Barreira Arcana',
  clerigo: 'Prece Protetora',
  necromante: 'Ossos Guardiões',
  paladino: 'Escudo Consagrado',
  ladino: 'Esquiva Calculada',
  bardo: 'Contratempo',
  monge: 'Desvio Circular',
  patrulheiro: 'Recuo Tático',
  barbaro: 'Aguentar na Carne',
  druida: 'Instinto Mutável',
  bruxo: 'Véu Profano',
};

export const nomeDaDefesaInata = (jogador: EstadoDeJogador): string | null =>
  NOMES[jogador.classe] ?? null;

/** A Defesa Inata já foi usada neste turno? */
export const defesaInataJaUsada = (ctx: Contexto, jogador: PlayerId): boolean =>
  lerPromessa(ctx, jogador, CHAVE.defesaInataUsada) > 0;

const recusa = (jogador: EstadoDeJogador, detalhe: string): ErroDeDominio => ({
  tipo: 'condicao-de-uso-nao-satisfeita',
  carta: jogador.personagem,
  detalhe,
});

/**
 * Por que a Defesa Inata deste jogador não pode ser usada agora?
 *
 * Devolve `null` quando ela pode. O preço impresso é conferido aqui, antes de
 * qualquer coisa ser gasta: uma Defesa Inata impagável é recusada, não é
 * "já usada".
 */
export const motivoParaNaoUsarDefesaInata = (
  ctx: Contexto,
  jogador: PlayerId,
): ErroDeDominio | null => {
  const atual = jogadorDo(ctx, jogador);

  switch (atual.classe) {
    case 'guerreiro':
    case 'paladino':
    case 'ladino':
    case 'bardo':
    case 'patrulheiro':
    case 'druida':
      return null;
    case 'mago': {
      const mana = valorDoRecurso(atual, 'mana') ?? 0;
      return mana >= 1
        ? null
        : { tipo: 'recurso-insuficiente', recurso: 'mana', necessario: 1, disponivel: mana };
    }
    case 'clerigo':
      // "se estiver em Graça, Fervor ou Milagre": em Vigília a Prece Protetora
      // simplesmente não existe.
      return atendeDevocao(atual, 'graca')
        ? null
        : recusa(atual, 'Prece Protetora exige Graça, Fervor ou Milagre');
    case 'necromante':
      return (almasDe(atual)?.controladas ?? 0) >= 1
        ? null
        : recusa(atual, 'Ossos Guardiões exige 1 Alma controlada');
    case 'monge':
      return chiProntas(atual) >= 1
        ? null
        : recusa(atual, 'Desvio Circular exige 1 pedra de Chi Pronta');
    case 'barbaro':
      return atual.guarda >= 1
        ? null
        : recusa(atual, 'Aguentar na Carne exige pelo menos 1 de Guarda');
    case 'bruxo':
      return podePagarComVida(atual, 1)
        ? null
        : recusa(atual, 'Véu Profano cobra 1 de Vida e você não tem como pagar');
  }
};

/**
 * A Defesa Inata desta classe exige que o jogador escolha o que reduzir?
 *
 * Só duas exigem: a Guarda Marcial do Guerreiro ("1 D **ou** 1 I") e o
 * Instinto Mutável do Druida em Forma Selvagem ("2 D **ou** 2 I"). O motor
 * nunca decide por eles.
 */
export const escolhaExigidaPelaDefesaInata = (
  ctx: Contexto,
  jogador: PlayerId,
  reducao: ReforcoEscolhido | undefined,
): ErroDeDominio | null => {
  if (reducao !== undefined) return null;
  const atual = jogadorDo(ctx, jogador);

  if (atual.classe === 'guerreiro') {
    return {
      tipo: 'escolha-obrigatoria',
      carta: atual.personagem,
      detalhe: 'Guarda Marcial reduz 1 D ou 1 I: informe qual',
    };
  }
  if (atual.classe === 'druida' && formaDe(atual) === 'selvagem') {
    return {
      tipo: 'escolha-obrigatoria',
      carta: atual.personagem,
      detalhe: 'Instinto Mutável em Forma Selvagem reduz 2 D ou 2 I: informe qual',
    };
  }
  return null;
};

/**
 * Resolve a Defesa Inata escolhida como Resposta e devolve a origem dela.
 *
 * O limite de uma vez por turno inimigo é consumido aqui, e só aqui.
 */
export const aplicarDefesaInata = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  reducao: ReforcoEscolhido,
): CardId | null => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  const marca = (): boolean =>
    consumirLimitePorTurno(ctx, alvo.defensor, CHAVE.defesaInataUsada, ORIGEM_GUARDA_MARCIAL);

  const reduzir = (dano: number, impacto: number): void => {
    reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano, impacto });
  };

  switch (defensor.classe) {
    case 'guerreiro': {
      if (!marca()) return null;
      // "Postura da Fortaleza — Ativar: Guarda Marcial reduz 1 D e 1 I nesta
      // ação." A carta não soma redução própria: ela troca o "ou" por um "e".
      const fortaleza = defensor.cartasDeClasse.some(
        (item) => item.carta === POSTURA_DA_FORTALEZA && item.estado === 'ativada',
      );
      if (fortaleza) reduzir(1, 1);
      else if (reducao === 'impacto') reduzir(0, 1);
      else reduzir(1, 0);
      return ORIGEM_GUARDA_MARCIAL;
    }
    case 'mago': {
      if (!marca()) return null;
      ganharRecurso(ctx, alvo.defensor, 'mana', -1);
      reduzir(1, 1);
      return ORIGEM_BARREIRA_ARCANA;
    }
    case 'clerigo': {
      if (!marca()) return null;
      reduzir(1, 1);
      return ORIGEM_PRECE_PROTETORA;
    }
    case 'necromante': {
      if (!marca()) return null;
      // "devolva 1 Alma controlada ao Cemitério para reduzir 2 I."
      gastarAlmas(ctx, alvo.defensor, 1);
      reduzir(0, 2);
      return ORIGEM_OSSOS_GUARDIOES;
    }
    case 'paladino': {
      if (!marca()) return null;
      const estado = juramentoDe(defensor);
      if (estado === 'inabalavel') reduzir(1, 2);
      else if (estado === 'resoluto') reduzir(1, 1);
      else reduzir(0, 1);
      return ORIGEM_ESCUDO_CONSAGRADO;
    }
    case 'ladino': {
      if (!marca()) return null;
      reduzir(2, 1);
      // "Se o Dano final se tornar 0, crie 1 Brecha": o Dano final só existe
      // depois da resolução, então a marca fica na Ação e a Brecha é criada lá.
      registrarAnotacao(ctx, alvo.defensor, {
        chave: CHAVE.defesaInataNestaAcao,
        origem: ORIGEM_ESQUIVA_CALCULADA,
        escopo: 'acao',
        valor: 1,
      });
      return ORIGEM_ESQUIVA_CALCULADA;
    }
    case 'bardo': {
      if (!marca()) return null;
      reduzir(1, 1);
      return ORIGEM_CONTRATEMPO;
    }
    case 'monge': {
      if (!marca()) return null;
      gastarChi(ctx, alvo.defensor, 1);
      reduzir(1, 2);
      return ORIGEM_DESVIO_CIRCULAR;
    }
    case 'patrulheiro': {
      if (!marca()) return null;
      reduzir(1, 1);
      return ORIGEM_RECUO_TATICO;
    }
    case 'barbaro': {
      if (!marca()) return null;
      // "reduza voluntariamente 1 de Guarda para reduzir 2 D." A redução
      // voluntária nunca provoca Ruptura.
      pagarComGuarda(ctx, alvo.defensor, 1, ORIGEM_AGUENTAR_NA_CARNE);
      reduzir(2, 0);
      return ORIGEM_AGUENTAR_NA_CARNE;
    }
    case 'druida': {
      if (!marca()) return null;
      if (formaDe(defensor) === 'selvagem') {
        if (reducao === 'impacto') reduzir(0, 2);
        else reduzir(2, 0);
      } else {
        reduzir(1, 1);
      }
      return ORIGEM_INSTINTO_MUTAVEL;
    }
    case 'bruxo': {
      if (!marca()) return null;
      pagarComVida(ctx, alvo.defensor, 1, ORIGEM_VEU_PROFANO);
      reduzir(1, 2);
      return ORIGEM_VEU_PROFANO;
    }
  }
};
