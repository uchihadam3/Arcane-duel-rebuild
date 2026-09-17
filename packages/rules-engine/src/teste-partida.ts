import type {
  CardId,
  EstadoDaPartida,
  EstadoDeJogador,
  ParcelaDeRecurso,
  ParcelaVariavelDeRecurso,
  PerfilDeHabilidade,
  PlayerId,
  TagDeCarta,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';
import { cardId, matchId } from '@arcane-duel/shared-types';

import type { RespostaDeComando, ResultadoDoComando } from './comando.js';
import { criarPartida } from './criacao.js';
import { iniciarPartida } from './comandos.js';
import { iniciarTurno } from './turno.js';
import { ID_A, ID_B, jogadorDeApoio } from './teste-apoio.js';

/** Monta uma partida de apoio ainda não iniciada. */
export const partidaNova = (): EstadoDaPartida =>
  criarPartida({
    id: matchId('partida-de-teste'),
    semente: 'semente',
    cardDataVersion: '0.1.0-alpha',
    jogadores: [jogadorDeApoio('jogador-a', 'guerreiro'), jogadorDeApoio('jogador-b', 'mago')],
  });

/** Extrai o valor de um comando que deveria ter dado certo. */
export const exigirSucesso = (resposta: RespostaDeComando): ResultadoDoComando => {
  if (!resposta.ok) {
    throw new Error(`comando falhou: ${JSON.stringify(resposta.erro)}`);
  }
  return resposta.valor;
};

/** Partida iniciada com o jogador A começando, e o turno 1 já aberto. */
export const partidaEmAndamento = (primeiro: PlayerId = ID_A): EstadoDaPartida => {
  const iniciada = exigirSucesso(iniciarPartida(partidaNova(), primeiro)).partida;
  return exigirSucesso(iniciarTurno(iniciada, primeiro)).partida;
};

export const jogadorDe = (partida: EstadoDaPartida, id: PlayerId): EstadoDeJogador => {
  const encontrado = partida.jogadores.find((jogador) => jogador.id === id);
  if (encontrado === undefined) throw new Error(`jogador ${id} não está na partida`);
  return encontrado;
};

export interface OpcoesDePerfil {
  readonly custo?: number;
  readonly dano?: number;
  readonly impacto?: number;
  readonly cooldown?: ZonaDeCooldown;
  readonly tipo?: PerfilDeHabilidade['tipo'];
  readonly tags?: readonly TagDeCarta[];
  readonly recurso?: ParcelaDeRecurso;
  readonly variavel?: ParcelaVariavelDeRecurso;
}

/** Perfil impresso de uma habilidade sintética, para os testes universais. */
export const perfil = (carta: CardId, opcoes: OpcoesDePerfil = {}): PerfilDeHabilidade => ({
  carta,
  tipo: opcoes.tipo ?? 'ataque',
  tags: opcoes.tags ?? [],
  custo: {
    moeda: 'ap',
    valor: opcoes.custo ?? 1,
    ...(opcoes.recurso === undefined ? {} : { recurso: opcoes.recurso }),
    ...(opcoes.variavel === undefined ? {} : { variavel: opcoes.variavel }),
  },
  cooldown: opcoes.cooldown ?? 1,
  valores:
    opcoes.tipo === 'tecnica' ? null : { dano: opcoes.dano ?? 0, impacto: opcoes.impacto ?? 0 },
});

/** A n-ésima habilidade da build de apoio de um jogador. */
export const habilidade = (jogador: 'jogador-a' | 'jogador-b', numero: number): CardId =>
  cardId(`${jogador}-hab-${String(numero)}`);

export const CARTA_A1 = habilidade('jogador-a', 1);
export const CARTA_A2 = habilidade('jogador-a', 2);
export const CARTA_A3 = habilidade('jogador-a', 3);
export const CARTA_A4 = habilidade('jogador-a', 4);
export const CARTA_B1 = habilidade('jogador-b', 1);

export { ID_A, ID_B };

/**
 * Perfil impresso de uma carta de Reação sintética.
 *
 * Reação se paga com Reserva e tem o próprio cooldown — os dois vêm daqui, e
 * não da Ação a que ela responde.
 */
export const perfilDeReacao = (
  carta: CardId,
  opcoes: {
    readonly custo?: number;
    readonly cooldown?: ZonaDeCooldown;
    readonly recurso?: ParcelaDeRecurso;
    readonly tags?: readonly TagDeCarta[];
  } = {},
): PerfilDeHabilidade => ({
  carta,
  tipo: 'reacao',
  tags: opcoes.tags ?? [],
  custo: {
    moeda: 'reserva',
    valor: opcoes.custo ?? 1,
    ...(opcoes.recurso === undefined ? {} : { recurso: opcoes.recurso }),
  },
  cooldown: opcoes.cooldown ?? 1,
  valores: null,
});
