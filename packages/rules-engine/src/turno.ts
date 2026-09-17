import type { EstadoDaPartida, EstadoDeJogador, PlayerId } from '@arcane-duel/shared-types';
import { expirarAnotacoes, falha, sucesso } from '@arcane-duel/shared-types';

import type { RespostaDeComando, ResultadoDoComando } from './comando.js';
import { encerrarSeVidaZerou, exigirJogadorDaPartida } from './comando.js';
import { REGRAS_UNIVERSAIS } from './constants.js';
import { aplicarMurchar, resolverQueimadura } from './condicoes.js';
import { converterEmReserva } from './custos.js';
import type { EventoUniversal } from './eventos.js';
import { avancarCooldown } from './cooldown.js';
import { adversarioDe, slotsVazios, substituirJogador } from './interno.js';

/*
 * Início e fim de turno.
 *
 * As duas rotinas são únicas e determinísticas, e cada uma roda no máximo uma
 * vez por turno — o campo `iniciado` do turno é a trava.
 */

/**
 * Início do turno do jogador, na ordem documentada:
 *
 * 1. a Reserva que sobrou desaparece (§6);
 * 2. os cinco pontos de Ação chegam (§6);
 * 3. o segundo jogador recebe o Impulso Inicial no primeiro turno dele (§7);
 * 4. a Guarda volta para seis (§9);
 * 5. Murchar é aplicado **depois** da recuperação e é removido por inteiro (§15);
 * 6. o cooldown avança: CD1 para a mão, CD2 para CD1, CD3 para CD2 (§11);
 * 7. Passivas e Cartas de Classe Ativadas voltam a ficar Prontas (§12 e §13);
 * 8. o contador de Ações do turno zera e os três espaços voltam a ser três.
 *
 * As anotações de escopo `turno` dos **dois** jogadores expiram aqui. É isso
 * que faz "uma vez por turno" e "uma vez por turno inimigo" funcionarem com uma
 * regra só: cada limite é contado durante o turno a que ele se refere, e todo
 * turno novo limpa a contagem dos dois lados.
 */
export const iniciarTurno = (partida: EstadoDaPartida, jogador: PlayerId): RespostaDeComando => {
  if (partida.situacao === 'aguardando-inicio') return falha({ tipo: 'partida-nao-iniciada' });
  if (partida.situacao === 'encerrada') return falha({ tipo: 'partida-encerrada' });
  if (partida.turno === null) return falha({ tipo: 'partida-nao-iniciada' });
  if (partida.turno.iniciado) return falha({ tipo: 'turno-ja-iniciado' });
  if (partida.turno.jogadorAtivo !== jogador) return falha({ tipo: 'fora-do-turno', jogador });

  const encontrado = exigirJogadorDaPartida(partida, jogador);
  if (!encontrado.ok) return encontrado;

  const eventos: EventoUniversal[] = [
    { tipo: 'turno-iniciado', jogador, numero: partida.turno.numero },
  ];
  let atual: EstadoDeJogador = encontrado.valor;

  if (atual.reserva > 0) {
    eventos.push({ tipo: 'reserva-descartada', jogador, valor: atual.reserva });
    atual = { ...atual, reserva: 0 };
  }

  atual = { ...atual, pontosDeAcao: REGRAS_UNIVERSAIS.pontosDeAcaoPorTurno };
  eventos.push({ tipo: 'ap-restaurado', jogador, valor: REGRAS_UNIVERSAIS.pontosDeAcaoPorTurno });

  // O Impulso é do segundo jogador e só existe no primeiro turno próprio dele.
  const ehSegundoJogador = partida.primeiroJogador !== null && partida.primeiroJogador !== jogador;
  if (ehSegundoJogador && partida.turno.numero === 2) {
    atual = { ...atual, impulsoInicial: true };
    eventos.push({ tipo: 'impulso-inicial-recebido', jogador });
  }

  atual = { ...atual, guarda: REGRAS_UNIVERSAIS.guardaInicial };
  eventos.push({ tipo: 'guarda-restaurada', jogador, valor: REGRAS_UNIVERSAIS.guardaInicial });

  const murchar = aplicarMurchar(atual);
  if (murchar.reducao > 0) {
    atual = murchar.jogador;
    eventos.push({
      tipo: 'murchar-aplicado',
      jogador,
      reducao: murchar.reducao,
      guardaFinal: atual.guarda,
    });
  }

  const avanco = avancarCooldown(atual.cooldown);
  atual = { ...atual, cooldown: avanco.cooldown, mao: [...atual.mao, ...avanco.paraAMao] };
  eventos.push({ tipo: 'cooldown-avancado', jogador, paraAMao: avanco.paraAMao });

  for (const passiva of atual.passivas) {
    if (passiva.estado === 'ativada') {
      eventos.push({ tipo: 'passiva-prontificada', jogador, carta: passiva.carta });
    }
  }
  atual = {
    ...atual,
    passivas: atual.passivas.map((passiva) =>
      passiva.estado === 'ativada' ? { ...passiva, estado: 'pronta' as const } : passiva,
    ),
  };

  for (const carta of atual.cartasDeClasse) {
    if (carta.estado === 'ativada') {
      eventos.push({ tipo: 'carta-de-classe-prontificada', jogador, carta: carta.carta });
    }
  }
  atual = {
    ...atual,
    cartasDeClasse: atual.cartasDeClasse.map((carta) =>
      carta.estado === 'ativada' ? { ...carta, estado: 'pronta' as const } : carta,
    ),
  };

  atual = {
    ...atual,
    acoesRealizadasNoTurno: 0,
    acoes: slotsVazios(),
    acoesPermitidasNoTurno: REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno,
    anotacoes: expirarAnotacoes(atual.anotacoes, 'turno'),
  };

  const oponente = adversarioDe(partida, jogador);
  const oponenteLimpo: EstadoDeJogador = {
    ...oponente,
    anotacoes: expirarAnotacoes(oponente.anotacoes, 'turno'),
  };

  const comJogador = substituirJogador(substituirJogador(partida, oponenteLimpo), atual);
  return sucesso({
    partida: { ...comJogador, turno: { ...partida.turno, iniciado: true } },
    eventos,
  });
};

/**
 * Fim do turno do jogador, na ordem documentada:
 *
 * 1. a Queimadura tica: perde um de Vida e diminui em um (§15);
 * 2. até dois pontos de Ação não usados viram Reserva (§6);
 * 3. o Impulso Inicial não usado desaparece e nunca vira Reserva (§7);
 * 4. o turno passa para o adversário, ainda **não iniciado**.
 *
 * A troca de jogador é preparada, não executada: quem chama decide quando
 * rodar o início do turno seguinte, e a trava `iniciado` impede rodar duas
 * vezes.
 */
export const encerrarTurno = (partida: EstadoDaPartida, jogador: PlayerId): RespostaDeComando => {
  if (partida.situacao === 'aguardando-inicio') return falha({ tipo: 'partida-nao-iniciada' });
  if (partida.situacao === 'encerrada') return falha({ tipo: 'partida-encerrada' });
  if (partida.turno === null) return falha({ tipo: 'partida-nao-iniciada' });
  if (!partida.turno.iniciado) return falha({ tipo: 'turno-nao-iniciado' });
  if (partida.turno.jogadorAtivo !== jogador) return falha({ tipo: 'fora-do-turno', jogador });

  const encontrado = exigirJogadorDaPartida(partida, jogador);
  if (!encontrado.ok) return encontrado;

  const eventos: EventoUniversal[] = [];
  let atual = encontrado.valor;

  const queimadura = resolverQueimadura(atual);
  if (queimadura.vidaPerdida > 0) {
    atual = queimadura.jogador;
    eventos.push({
      tipo: 'condicao-resolvida',
      alvo: jogador,
      condicao: 'queimadura',
      vidaPerdida: queimadura.vidaPerdida,
      restante: queimadura.restante,
    });
  }

  const conversao = converterEmReserva(atual);
  atual = conversao.jogador;
  eventos.push({ tipo: 'reserva-convertida', jogador, valor: conversao.reserva });

  if (atual.impulsoInicial) {
    atual = { ...atual, impulsoInicial: false };
    eventos.push({ tipo: 'impulso-inicial-descartado', jogador });
  }

  atual = { ...atual, acoes: slotsVazios() };
  eventos.push({ tipo: 'turno-encerrado', jogador, numero: partida.turno.numero });

  const comJogador = substituirJogador(partida, atual);
  const proximo = adversarioDe(comJogador, jogador);
  const comProximoTurno: EstadoDaPartida = {
    ...comJogador,
    turno: { numero: partida.turno.numero + 1, jogadorAtivo: proximo.id, iniciado: false },
  };

  const fim: ResultadoDoComando = encerrarSeVidaZerou(comProximoTurno);
  return sucesso({ partida: fim.partida, eventos: [...eventos, ...fim.eventos] });
};
