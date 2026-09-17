import type {
  CardId,
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  PlayerId,
  SlotDeAcao,
} from '@arcane-duel/shared-types';
import { falha, sucesso } from '@arcane-duel/shared-types';

import type { RespostaDeComando } from './comando.js';
import { exigirJogadorDaPartida } from './comando.js';
import {
  transicaoAtivarCartaDeClasse,
  transicaoAtivarPassiva,
  transicaoConsumirUltimate,
  transicaoExaurirCartaDeClasse,
  transicaoRevelarPassiva,
} from './estado-de-carta.js';
import { adversarioDe, substituirJogador, substituirSlot } from './interno.js';

/*
 * Passivas, Cartas de Classe e Ultimate.
 *
 * Ativar e Exaurir continuam conceitos diferentes, e a diferença mora nas
 * transições de `estado-de-carta.ts`. Estes comandos só ligam essas
 * transições ao estado da partida.
 */

/** Revela uma Passiva face-down. Depois de revelada, ela permanece revelada. */
export const revelarPassiva = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  carta: CardId,
): RespostaDeComando => {
  const encontrado = exigirJogadorDaPartida(partida, jogador);
  if (!encontrado.ok) return encontrado;

  const passiva = encontrado.valor.passivas.find((atual) => atual.carta === carta);
  if (passiva === undefined) return falha({ tipo: 'passiva-desconhecida', carta });

  const transicao = transicaoRevelarPassiva(passiva.estado);
  if (!transicao.ok) return falha({ tipo: 'passiva-ja-revelada', carta });

  return sucesso({
    partida: substituirJogador(partida, {
      ...encontrado.valor,
      passivas: encontrado.valor.passivas.map((atual) =>
        atual.carta === carta ? { ...atual, estado: transicao.valor } : atual,
      ),
    }),
    eventos: [{ tipo: 'passiva-revelada', jogador, carta }],
  });
};

/**
 * Ativa uma Passiva já revelada: efeito renovável, carta girada para a
 * horizontal. Passiva nunca é Exaurida — não existe comando para isso.
 */
export const ativarPassiva = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  carta: CardId,
): RespostaDeComando => {
  const encontrado = exigirJogadorDaPartida(partida, jogador);
  if (!encontrado.ok) return encontrado;

  const passiva = encontrado.valor.passivas.find((atual) => atual.carta === carta);
  if (passiva === undefined) return falha({ tipo: 'passiva-desconhecida', carta });

  const transicao = transicaoAtivarPassiva(passiva.estado);
  if (!transicao.ok) {
    return falha(
      transicao.erro === 'passiva-ainda-oculta'
        ? { tipo: 'passiva-ainda-oculta', carta }
        : { tipo: 'passiva-nao-esta-pronta', carta },
    );
  }

  return sucesso({
    partida: substituirJogador(partida, {
      ...encontrado.valor,
      passivas: encontrado.valor.passivas.map((atual) =>
        atual.carta === carta ? { ...atual, estado: transicao.valor } : atual,
      ),
    }),
    eventos: [{ tipo: 'passiva-ativada', jogador, carta }],
  });
};

/**
 * Localiza o espaço de Ação onde uma Carta de Classe está sendo usada.
 *
 * A Ação pode ser do próprio jogador — quando ele reforça o próprio Ataque —
 * ou do adversário, quando ele reforça a própria Resposta.
 */
const localizarAcao = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  indice: IndiceDeAcao,
): { readonly dono: EstadoDeJogador; readonly slot: SlotDeAcao } | undefined => {
  for (const dono of [
    partida.jogadores.find((atual) => atual.id === jogador),
    adversarioDe(partida, jogador),
  ]) {
    const slot = dono?.acoes.find(
      (atual) => atual.indice === indice && atual.situacao === 'declarada',
    );
    if (dono !== undefined && slot !== undefined) return { dono, slot };
  }
  return undefined;
};

type UsoDeCartaDeClasse = 'ativar' | 'exaurir';

const usarCartaDeClasse = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  carta: CardId,
  uso: UsoDeCartaDeClasse,
  acao?: IndiceDeAcao,
): RespostaDeComando => {
  const encontrado = exigirJogadorDaPartida(partida, jogador);
  if (!encontrado.ok) return encontrado;

  const equipada = encontrado.valor.cartasDeClasse.find((atual) => atual.carta === carta);
  if (equipada === undefined) {
    const jaRemovida = encontrado.valor.removidas.includes(carta);
    return falha(
      jaRemovida
        ? { tipo: 'carta-de-classe-ja-exaurida', carta }
        : { tipo: 'carta-de-classe-desconhecida', carta },
    );
  }

  // Uma Carta de Classe só pode ser usada uma vez na mesma Ação, seja por
  // Ativação ou por Exaustão (§8).
  const localizada = acao === undefined ? undefined : localizarAcao(partida, jogador, acao);
  if (acao !== undefined && localizada === undefined) {
    return falha({ tipo: 'acao-nao-declarada', indice: acao });
  }
  if (localizada?.slot.cartasDeClasseUsadas.some((uso) => uso.carta === carta) === true) {
    return falha({ tipo: 'carta-de-classe-ja-usada-nesta-acao', carta });
  }

  const transicao =
    uso === 'ativar'
      ? transicaoAtivarCartaDeClasse(equipada.estado)
      : transicaoExaurirCartaDeClasse(equipada.estado);
  if (!transicao.ok) {
    return falha(
      transicao.erro === 'carta-ja-exaurida'
        ? { tipo: 'carta-de-classe-ja-exaurida', carta }
        : { tipo: 'carta-de-classe-nao-esta-pronta', carta },
    );
  }

  const estadoFinal = transicao.valor;
  let atualizado: EstadoDeJogador =
    estadoFinal === 'exaurida'
      ? {
          ...encontrado.valor,
          // Exaurida sai do campo em definitivo, mas continua rastreável.
          cartasDeClasse: encontrado.valor.cartasDeClasse.filter((atual) => atual.carta !== carta),
          removidas: [...encontrado.valor.removidas, carta],
        }
      : {
          ...encontrado.valor,
          cartasDeClasse: encontrado.valor.cartasDeClasse.map((atual) =>
            atual.carta === carta ? { ...atual, estado: estadoFinal } : atual,
          ),
        };

  let proxima = substituirJogador(partida, atualizado);

  if (localizada !== undefined) {
    const donoAtualizado = localizada.dono.id === jogador ? atualizado : localizada.dono;
    const comUso = substituirSlot(donoAtualizado, {
      ...localizada.slot,
      cartasDeClasseUsadas: [...localizada.slot.cartasDeClasseUsadas, { carta, modo: uso }],
    });
    atualizado = comUso.id === jogador ? comUso : atualizado;
    proxima = substituirJogador(proxima, comUso);
  }

  return sucesso({
    partida: proxima,
    eventos: [
      {
        tipo: uso === 'ativar' ? 'carta-de-classe-ativada' : 'carta-de-classe-exaurida',
        jogador,
        carta,
      },
    ],
  });
};

/**
 * Ativa uma Carta de Classe: efeito renovável, carta girada para a
 * horizontal. Ela volta a ficar Pronta no início do próprio turno.
 */
export const ativarCartaDeClasse = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  carta: CardId,
  acao?: IndiceDeAcao,
): RespostaDeComando => usarCartaDeClasse(partida, jogador, carta, 'ativar', acao);

/**
 * Exaure uma Carta de Classe: efeito extremo e remoção permanente da partida.
 *
 * Só é legal enquanto a carta está Pronta — uma carta Ativada precisa voltar a
 * ficar Pronta antes. Nenhuma regra universal recupera uma carta Exaurida.
 */
export const exaurirCartaDeClasse = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  carta: CardId,
  acao?: IndiceDeAcao,
): RespostaDeComando => usarCartaDeClasse(partida, jogador, carta, 'exaurir', acao);

/** Consome a Ultimate. Ela só pode ser usada uma vez por partida (§14). */
export const consumirUltimate = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
): RespostaDeComando => {
  const encontrado = exigirJogadorDaPartida(partida, jogador);
  if (!encontrado.ok) return encontrado;

  const transicao = transicaoConsumirUltimate(encontrado.valor.ultimate.estado);
  if (!transicao.ok) return falha({ tipo: 'ultimate-ja-consumida' });

  return sucesso({
    partida: substituirJogador(partida, {
      ...encontrado.valor,
      ultimate: { ...encontrado.valor.ultimate, estado: transicao.valor },
    }),
    eventos: [{ tipo: 'ultimate-consumida', jogador, carta: encontrado.valor.ultimate.carta }],
  });
};
