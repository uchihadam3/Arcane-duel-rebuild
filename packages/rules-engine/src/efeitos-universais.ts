import type {
  AnotacaoDeEfeito,
  CardId,
  CondicaoId,
  EstadoDeJogador,
  Resultado,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';
import { ZONAS_DE_COOLDOWN, comAnotacao, falha, sucesso } from '@arcane-duel/shared-types';

import { REGRAS_UNIVERSAIS } from './constants.js';
import type { ErroDeDominio } from './erros.js';
import { semNegativo } from './interno.js';

/*
 * Operações que o texto das cartas usa, mas que continuam sendo mecânica
 * universal: mover carta entre zonas, recuperar ponto de Ação, perder Vida por
 * fora de um Ataque, anotar um estado temporário.
 *
 * Nenhuma delas conhece carta nenhuma. Quem sabe **quando** chamar é a camada
 * de composição; o que cada uma faz é regra de tabuleiro.
 */

/** Em qual zona de cooldown a carta está, se estiver em alguma. */
export const zonaDaCarta = (jogador: EstadoDeJogador, carta: CardId): ZonaDeCooldown | null => {
  for (const zona of ZONAS_DE_COOLDOWN) {
    if (jogador.cooldown[zona].includes(carta)) return zona;
  }
  return null;
};

const semACarta = (
  jogador: EstadoDeJogador,
  zona: ZonaDeCooldown,
  carta: CardId,
): EstadoDeJogador => ({
  ...jogador,
  cooldown: {
    ...jogador.cooldown,
    [zona]: jogador.cooldown[zona].filter((atual) => atual !== carta),
  },
});

export interface MovimentoDeCarta {
  readonly jogador: EstadoDeJogador;
  readonly de: ZonaDeCooldown;
}

/** Devolve uma carta do cooldown direto para a mão. */
export const devolverCartaAMao = (
  jogador: EstadoDeJogador,
  carta: CardId,
): Resultado<MovimentoDeCarta, ErroDeDominio> => {
  const zona = zonaDaCarta(jogador, carta);
  if (zona === null) return falha({ tipo: 'carta-fora-do-cooldown', carta });

  const semEla = semACarta(jogador, zona, carta);
  return sucesso({ jogador: { ...semEla, mao: [...semEla.mao, carta] }, de: zona });
};

export interface AdiantamentoDeCarta {
  readonly jogador: EstadoDeJogador;
  readonly de: ZonaDeCooldown;
  readonly para: ZonaDeCooldown;
  /** A carta saiu de CD1 e portanto voltou para a mão. */
  readonly voltouParaAMao: boolean;
}

/**
 * Move uma carta uma zona de cooldown para mais perto da mão.
 *
 * Sair de CD1 é chegar à mão: não existe zona anterior a CD1, e a carta que
 * "avança uma zona" a partir dali fica disponível de novo.
 */
export const adiantarCartaNoCooldown = (
  jogador: EstadoDeJogador,
  carta: CardId,
): Resultado<AdiantamentoDeCarta, ErroDeDominio> => {
  const zona = zonaDaCarta(jogador, carta);
  if (zona === null) return falha({ tipo: 'carta-fora-do-cooldown', carta });

  const semEla = semACarta(jogador, zona, carta);
  if (zona === 1) {
    return sucesso({
      jogador: { ...semEla, mao: [...semEla.mao, carta] },
      de: 1,
      para: 1,
      voltouParaAMao: true,
    });
  }

  const destino: ZonaDeCooldown = zona === 3 ? 2 : 1;
  return sucesso({
    jogador: {
      ...semEla,
      cooldown: { ...semEla.cooldown, [destino]: [...semEla.cooldown[destino], carta] },
    },
    de: zona,
    para: destino,
    voltouParaAMao: false,
  });
};

/** Zona de cooldown para onde a carta iria, uma zona mais perto da mão. */
export const zonaAdiantada = (zona: ZonaDeCooldown): ZonaDeCooldown =>
  zona === 3 ? 2 : zona === 2 ? 1 : 1;

/** Recupera pontos de Ação, sem passar do total do turno. */
export const recuperarPontosDeAcao = (
  jogador: EstadoDeJogador,
  quantidade: number,
): EstadoDeJogador => ({
  ...jogador,
  pontosDeAcao: Math.min(jogador.pontosDeAcao + quantidade, REGRAS_UNIVERSAIS.pontosDeAcaoPorTurno),
});

/** Ganha Reserva respeitando o máximo de dois (§6). */
export const ganharReserva = (jogador: EstadoDeJogador, quantidade: number): EstadoDeJogador => ({
  ...jogador,
  reserva: Math.min(jogador.reserva + quantidade, REGRAS_UNIVERSAIS.maximoDeReserva),
});

/** Restaura Guarda sem passar do valor inicial de seis (§9). */
export const restaurarGuarda = (jogador: EstadoDeJogador, quantidade: number): EstadoDeJogador => ({
  ...jogador,
  guarda: Math.min(jogador.guarda + quantidade, REGRAS_UNIVERSAIS.guardaInicial),
});

/**
 * Perda de Vida direta.
 *
 * Não é Dano de Ataque: não abre espaço de Resposta, não interage com Guarda e
 * não provoca Ruptura. É o que cartas como "o adversário perde 4 de Vida"
 * fazem.
 */
export const perderVida = (jogador: EstadoDeJogador, quantidade: number): EstadoDeJogador => ({
  ...jogador,
  vida: jogador.vida - semNegativo(quantidade),
});

/** Remove acúmulo de uma Condição, sem passar de zero. */
export const removerCondicao = (
  jogador: EstadoDeJogador,
  condicao: CondicaoId,
  quantidade: number,
): EstadoDeJogador => ({
  ...jogador,
  condicoes: {
    ...jogador.condicoes,
    [condicao]: semNegativo(jogador.condicoes[condicao] - quantidade),
  },
});

/** Remove todo o acúmulo de uma Condição e informa quanto havia. */
export const limparCondicao = (
  jogador: EstadoDeJogador,
  condicao: CondicaoId,
): { readonly jogador: EstadoDeJogador; readonly removido: number } => ({
  jogador: { ...jogador, condicoes: { ...jogador.condicoes, [condicao]: 0 } },
  removido: jogador.condicoes[condicao],
});

/** Acrescenta uma anotação de efeito ao jogador. */
export const anotar = (jogador: EstadoDeJogador, anotacao: AnotacaoDeEfeito): EstadoDeJogador => ({
  ...jogador,
  anotacoes: comAnotacao(jogador.anotacoes, anotacao),
});

/** Libera a quarta Ação do turno — exceção impressa, nunca regra universal. */
export const liberarAcaoExtra = (jogador: EstadoDeJogador): EstadoDeJogador => ({
  ...jogador,
  acoesPermitidasNoTurno: REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno + 1,
  acoes: [
    jogador.acoes[0],
    jogador.acoes[1],
    jogador.acoes[2],
    jogador.acoes[3].situacao === 'indisponivel'
      ? { ...jogador.acoes[3], situacao: 'vazio' as const }
      : jogador.acoes[3],
  ],
});
