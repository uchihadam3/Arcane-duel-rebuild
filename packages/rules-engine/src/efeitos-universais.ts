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

export interface AtrasoDeCarta {
  readonly jogador: EstadoDeJogador;
  readonly de: ZonaDeCooldown;
  readonly para: ZonaDeCooldown;
}

/**
 * Move uma carta uma zona de cooldown para mais longe da mão.
 *
 * CD3 é o fundo: uma carta que já está lá não tem para onde ir, e o movimento
 * devolve CD3 em CD3 em vez de inventar uma quarta zona.
 */
export const atrasarCartaNoCooldown = (
  jogador: EstadoDeJogador,
  carta: CardId,
): Resultado<AtrasoDeCarta, ErroDeDominio> => {
  const zona = zonaDaCarta(jogador, carta);
  if (zona === null) return falha({ tipo: 'carta-fora-do-cooldown', carta });

  const destino: ZonaDeCooldown = zona === 1 ? 2 : 3;
  if (destino === zona) return sucesso({ jogador, de: zona, para: zona });

  const semEla = semACarta(jogador, zona, carta);
  return sucesso({
    jogador: {
      ...semEla,
      cooldown: { ...semEla.cooldown, [destino]: [...semEla.cooldown[destino], carta] },
    },
    de: zona,
    para: destino,
  });
};

/**
 * Tira uma carta da mão e a coloca direto em uma zona de cooldown.
 *
 * "Escolha outra habilidade em sua mão e coloque-a em CD2": a carta não foi
 * jogada, não pagou custo e não ocupou espaço de Ação — ela só saiu de cena.
 */
export const enviarDaMaoParaCooldown = (
  jogador: EstadoDeJogador,
  carta: CardId,
  zona: ZonaDeCooldown,
): Resultado<EstadoDeJogador, ErroDeDominio> => {
  if (!jogador.mao.includes(carta)) return falha({ tipo: 'carta-fora-da-mao', carta });
  return sucesso({
    ...jogador,
    mao: jogador.mao.filter((atual) => atual !== carta),
    cooldown: { ...jogador.cooldown, [zona]: [...jogador.cooldown[zona], carta] },
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
  vida: semNegativo(jogador.vida - semNegativo(quantidade)),
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

/*
 * Vida: quatro coisas diferentes que não são sinônimos.
 *
 * - **Dano** é o que um Ataque aplica. Passa por Resposta, por modificadores e
 *   pela Ruptura, e é o único que responde a "receber um Ataque".
 * - **Perda direta de Vida** é o que uma carta faz fora de um Ataque ("o
 *   adversário perde 2 de Vida"). Não abre Resposta e não é Dano.
 * - **Perda de Vida como custo** é o preço que o próprio jogador paga para
 *   jogar algo. Não é Dano, não pode ser reduzida e não dispara efeitos que
 *   exigem ter recebido um Ataque.
 * - **Restauração** devolve Vida, até o máximo.
 *
 * Cada uma tem função e evento próprios para que nenhuma carta precise
 * comparar texto para saber com qual está lidando.
 */

export interface RestauracaoDeVida {
  readonly jogador: EstadoDeJogador;
  /** Quanto o texto mandou restaurar. */
  readonly pedido: number;
  /** Quanto entrou de fato, depois do teto. É este que os gatilhos leem. */
  readonly restaurado: number;
}

/**
 * Restaura Vida até o máximo documentado.
 *
 * O valor **efetivo** é o que vale: um jogador com 29 de Vida que restaura 3
 * restaurou 1, e um gatilho que pergunte "quando restaurar Vida" precisa ver 1,
 * não 3.
 */
export const restaurarVida = (jogador: EstadoDeJogador, quantidade: number): RestauracaoDeVida => {
  const pedido = semNegativo(quantidade);
  const teto = REGRAS_UNIVERSAIS.vidaInicial;
  const restaurado = Math.max(Math.min(pedido, teto - jogador.vida), 0);
  return {
    jogador: restaurado === 0 ? jogador : { ...jogador, vida: jogador.vida + restaurado },
    pedido,
    restaurado,
  };
};

export interface PerdaDeVidaComoCusto {
  readonly jogador: EstadoDeJogador;
  readonly perdido: number;
}

/**
 * Perde Vida como preço de uma jogada.
 *
 * Não é Dano e não pode ser reduzida. Quem paga é sempre o próprio jogador, e o
 * pagamento é conferido antes por quem monta o custo: chegar aqui significa que
 * a Vida já foi verificada.
 */
export const perderVidaComoCusto = (
  jogador: EstadoDeJogador,
  quantidade: number,
): PerdaDeVidaComoCusto => {
  // A Vida não desce abaixo de zero: o estado com Vida negativa é inválido
  // (validacao.ts) e o desfecho já se decide em zero.
  const perdido = Math.min(semNegativo(quantidade), jogador.vida);
  return { jogador: { ...jogador, vida: jogador.vida - perdido }, perdido };
};

/** O jogador consegue pagar este preço em Vida e continuar de pé? */
export const podePagarComVida = (jogador: EstadoDeJogador, quantidade: number): boolean =>
  jogador.vida > semNegativo(quantidade);

export interface ReducaoVoluntariaDeGuarda {
  readonly jogador: EstadoDeJogador;
  readonly reduzido: number;
}

/**
 * Reduz a própria Guarda como custo.
 *
 * Nunca provoca Ruptura — a regra está congelada desde a Etapa 2. O que a
 * redução faz é deixar a Guarda mais baixa, e um Ataque inimigo posterior que
 * leve o que sobrou a zero provoca Ruptura normalmente.
 */
export const reduzirGuardaComoCusto = (
  jogador: EstadoDeJogador,
  quantidade: number,
): ReducaoVoluntariaDeGuarda => {
  const reduzido = Math.min(semNegativo(quantidade), jogador.guarda);
  return { jogador: { ...jogador, guarda: jogador.guarda - reduzido }, reduzido };
};

/** As Condições que um texto chama de "negativas" — as quatro do jogo-base. */
export const CONDICOES_NEGATIVAS: readonly CondicaoId[] = [
  'queimadura',
  'lento',
  'murchar',
  'sangramento',
];

/** As Condições negativas que o jogador tem acumuladas agora. */
export const condicoesAtivas = (jogador: EstadoDeJogador): readonly CondicaoId[] =>
  CONDICOES_NEGATIVAS.filter((condicao) => jogador.condicoes[condicao] > 0);
