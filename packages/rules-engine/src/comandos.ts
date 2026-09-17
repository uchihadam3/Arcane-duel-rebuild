import type {
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  PerfilDeHabilidade,
  PlayerId,
  RespostaVoluntaria,
  SlotDeAcao,
} from '@arcane-duel/shared-types';
import { falha, sucesso } from '@arcane-duel/shared-types';

import type { RespostaDeComando } from './comando.js';
import { encerrarSeVidaZerou, exigirJogadorDaPartida, exigirTurnoEmAndamento } from './comando.js';
import { REGRAS_UNIVERSAIS } from './constants.js';
import { concluiuASegundaAcao, consumirLento, resolverSangramento } from './condicoes.js';
import { resolverAtaque } from './combate.js';
import { enviarParaCooldown } from './cooldown.js';
import { pagarComPontosDeAcao, pagarComReserva } from './custos.js';
import type { EventoUniversal } from './eventos.js';
import { adversarioDe, substituirJogador, substituirSlot } from './interno.js';

/*
 * Comandos universais do motor.
 *
 * Cada comando é puro: recebe o estado, devolve estado novo mais eventos, ou
 * um erro de domínio tipado. Nenhum deles conhece carta, classe ou interface.
 */

/**
 * Inicia a partida.
 *
 * Quem começa vem de fora: o documento não define o critério, e o motor não
 * sorteia. O segundo jogador entra com duas Reservas, para poder responder ao
 * primeiro turno do adversário (§7).
 */
export const iniciarPartida = (
  partida: EstadoDaPartida,
  primeiroJogador: PlayerId,
): RespostaDeComando => {
  if (partida.situacao !== 'aguardando-inicio') return falha({ tipo: 'partida-ja-iniciada' });

  const encontrado = exigirJogadorDaPartida(partida, primeiroJogador);
  if (!encontrado.ok) return encontrado;

  const segundo = adversarioDe(partida, primeiroJogador);
  const comReserva: EstadoDeJogador = {
    ...segundo,
    reserva: REGRAS_UNIVERSAIS.reservaInicialDoSegundoJogador,
  };

  return sucesso({
    partida: {
      ...substituirJogador(partida, comReserva),
      situacao: 'em-andamento',
      primeiroJogador,
      turno: { numero: 1, jogadorAtivo: primeiroJogador, iniciado: false },
    },
    eventos: [{ tipo: 'partida-iniciada', primeiroJogador }],
  });
};

const proximoSlotLivre = (jogador: EstadoDeJogador): SlotDeAcao | undefined =>
  jogador.acoes.find((slot) => slot.situacao === 'vazio');

const buscarSlot = (jogador: EstadoDeJogador, indice: IndiceDeAcao): SlotDeAcao | undefined =>
  jogador.acoes.find((slot) => slot.indice === indice);

/**
 * Declara uma Ação.
 *
 * Paga os custos, tira a carta da mão e ocupa o próximo espaço de Ação. A
 * carta ainda não resolve nem vai para o cooldown: ela fica no espaço até a
 * resolução, para o defensor poder responder.
 */
export const declararAcao = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  perfil: PerfilDeHabilidade,
): RespostaDeComando => {
  const ativo = exigirTurnoEmAndamento(partida, jogador);
  if (!ativo.ok) return ativo;

  const atacante = ativo.valor;
  if (atacante.acoesRealizadasNoTurno >= REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno) {
    return falha({
      tipo: 'limite-de-acoes-atingido',
      limite: REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno,
    });
  }
  if (perfil.custo.moeda !== 'ap')
    return falha({ tipo: 'moeda-de-custo-invalida', esperada: 'ap' });
  if (!atacante.mao.includes(perfil.carta)) {
    return falha({ tipo: 'carta-fora-da-mao', carta: perfil.carta });
  }

  const slot = proximoSlotLivre(atacante);
  if (slot === undefined) {
    return falha({
      tipo: 'limite-de-acoes-atingido',
      limite: REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno,
    });
  }

  const pagamento = pagarComPontosDeAcao(atacante, perfil.custo.valor);
  if (!pagamento.ok) return pagamento;

  const eventos: EventoUniversal[] = [
    { tipo: 'acao-declarada', jogador, indice: slot.indice, carta: perfil.carta },
    {
      tipo: 'custo-pago',
      jogador,
      ap: pagamento.valor.ap,
      reserva: 0,
      impulso: pagamento.valor.impulso,
    },
  ];

  let atualizado = pagamento.valor.jogador;
  if (pagamento.valor.consumiuLento) {
    atualizado = consumirLento(atualizado);
    eventos.push({ tipo: 'lento-consumido', jogador, restante: atualizado.condicoes.lento });
  }

  atualizado = {
    ...atualizado,
    mao: atualizado.mao.filter((carta) => carta !== perfil.carta),
  };
  atualizado = substituirSlot(atualizado, { ...slot, situacao: 'declarada', perfil });

  return sucesso({ partida: substituirJogador(partida, atualizado), eventos });
};

/**
 * Registra a Resposta voluntária do defensor a uma Ação declarada.
 *
 * No máximo uma por Ação: a Defesa Inata da classe **ou** uma carta de
 * Reação, nunca as duas como Respostas separadas (§8). Passivas automáticas e
 * ativações de Carta de Classe modificam a Resposta sem ocupar este espaço.
 *
 * O efeito numérico da Resposta é texto de carta e entra pelos modificadores;
 * aqui só a Resposta em si é registrada e paga.
 */
export const registrarResposta = (
  partida: EstadoDaPartida,
  defensor: PlayerId,
  indice: IndiceDeAcao,
  resposta: RespostaVoluntaria,
  custoEmReserva = 0,
): RespostaDeComando => {
  if (partida.situacao !== 'em-andamento' || partida.turno === null) {
    return falha({ tipo: 'partida-nao-iniciada' });
  }
  if (partida.turno.jogadorAtivo === defensor)
    return falha({ tipo: 'fora-do-turno', jogador: defensor });

  const doDefensor = exigirJogadorDaPartida(partida, defensor);
  if (!doDefensor.ok) return doDefensor;

  const atacante = adversarioDe(partida, defensor);
  const slot = buscarSlot(atacante, indice);
  if (slot === undefined) return falha({ tipo: 'acao-inexistente', indice });
  if (slot.situacao === 'vazio') return falha({ tipo: 'acao-nao-declarada', indice });
  if (slot.situacao === 'resolvida') return falha({ tipo: 'acao-ja-resolvida', indice });
  if (slot.resposta.voluntaria !== null) {
    return falha({ tipo: 'segunda-resposta-voluntaria', indice });
  }

  let atualizado = doDefensor.valor;
  const eventos: EventoUniversal[] = [];

  if (resposta.tipo === 'carta-de-reacao') {
    if (!atualizado.mao.includes(resposta.carta)) {
      return falha({ tipo: 'carta-fora-da-mao', carta: resposta.carta });
    }
    const pagamento = pagarComReserva(atualizado, custoEmReserva);
    if (!pagamento.ok) return pagamento;
    atualizado = {
      ...pagamento.valor,
      mao: pagamento.valor.mao.filter((carta) => carta !== resposta.carta),
    };
    eventos.push({
      tipo: 'custo-pago',
      jogador: defensor,
      ap: 0,
      reserva: custoEmReserva,
      impulso: 0,
    });
  }

  eventos.push({ tipo: 'resposta-registrada', jogador: defensor, indice, resposta });

  const comAtacante = substituirJogador(
    partida,
    substituirSlot(atacante, { ...slot, resposta: { voluntaria: resposta } }),
  );
  return sucesso({ partida: substituirJogador(comAtacante, atualizado), eventos });
};

/**
 * Registra um modificador de Dano ou de Impacto sobre uma Ação declarada.
 *
 * É por aqui que Passivas, Cartas de Classe e o efeito de uma Resposta entram
 * na conta, sem que o motor universal precise conhecer nenhuma delas. Os
 * valores se acumulam e são aplicados de uma vez na resolução.
 */
export const registrarModificador = (
  partida: EstadoDaPartida,
  atacante: PlayerId,
  indice: IndiceDeAcao,
  modificador: { readonly dano?: number; readonly impacto?: number },
): RespostaDeComando => {
  const encontrado = exigirJogadorDaPartida(partida, atacante);
  if (!encontrado.ok) return encontrado;

  const slot = buscarSlot(encontrado.valor, indice);
  if (slot === undefined) return falha({ tipo: 'acao-inexistente', indice });
  if (slot.situacao === 'vazio') return falha({ tipo: 'acao-nao-declarada', indice });
  if (slot.situacao === 'resolvida') return falha({ tipo: 'acao-ja-resolvida', indice });

  const dano = modificador.dano ?? 0;
  const impacto = modificador.impacto ?? 0;
  const atualizado = substituirSlot(encontrado.valor, {
    ...slot,
    modificadores: {
      dano: slot.modificadores.dano + dano,
      impacto: slot.modificadores.impacto + impacto,
    },
  });

  return sucesso({
    partida: substituirJogador(partida, atualizado),
    eventos: [{ tipo: 'modificador-registrado', indice, dano, impacto }],
  });
};

/**
 * Resolve uma Ação declarada, na ordem canônica do documento (§10).
 *
 * Aplica modificadores, Impacto sobre a Guarda, detecta a Ruptura e soma o
 * Dano adicional dela ao mesmo Ataque, aplica o Dano à Vida, manda a carta
 * usada e a carta de Reação para os cooldowns delas, conta a Ação do turno e
 * resolve o Sangramento quando é a segunda Ação.
 */
export const resolverAcao = (
  partida: EstadoDaPartida,
  atacanteId: PlayerId,
  indice: IndiceDeAcao,
): RespostaDeComando => {
  const ativo = exigirTurnoEmAndamento(partida, atacanteId);
  if (!ativo.ok) return ativo;

  const slot = buscarSlot(ativo.valor, indice);
  if (slot === undefined) return falha({ tipo: 'acao-inexistente', indice });
  if (slot.situacao === 'vazio' || slot.perfil === null) {
    return falha({ tipo: 'acao-nao-declarada', indice });
  }
  if (slot.situacao === 'resolvida') return falha({ tipo: 'acao-ja-resolvida', indice });

  const perfil = slot.perfil;
  const eventos: EventoUniversal[] = [];
  let atacante = ativo.valor;
  let defensor = adversarioDe(partida, atacanteId);

  if (perfil.valores !== null) {
    const resolucao = resolverAtaque(defensor, perfil.valores, slot.modificadores);
    defensor = resolucao.alvo;

    eventos.push({
      tipo: 'impacto-aplicado',
      alvo: defensor.id,
      valor: resolucao.impacto,
      guardaAntes: resolucao.guardaAntes,
      guardaDepois: resolucao.guardaDepois,
    });
    if (resolucao.ruptura) {
      eventos.push({
        tipo: 'ruptura',
        alvo: defensor.id,
        danoAdicional: resolucao.danoAdicionalDeRuptura,
      });
    }
    eventos.push({
      tipo: 'dano-aplicado',
      alvo: defensor.id,
      valor: resolucao.dano,
      vidaAntes: resolucao.vidaAntes,
      vidaDepois: resolucao.vidaDepois,
    });
  }

  atacante = enviarParaCooldown(atacante, perfil.carta, perfil.cooldown);
  eventos.push({
    tipo: 'carta-para-cooldown',
    jogador: atacanteId,
    carta: perfil.carta,
    zona: perfil.cooldown,
  });

  const respostaComCarta = slot.resposta.voluntaria;
  if (respostaComCarta?.tipo === 'carta-de-reacao') {
    // A Reação também é uma das oito habilidades: ela vai para o cooldown
    // dela quando a Ação a que respondeu termina.
    defensor = enviarParaCooldown(defensor, respostaComCarta.carta, perfil.cooldown);
    eventos.push({
      tipo: 'carta-para-cooldown',
      jogador: defensor.id,
      carta: respostaComCarta.carta,
      zona: perfil.cooldown,
    });
  }

  atacante = {
    ...atacante,
    acoesRealizadasNoTurno: atacante.acoesRealizadasNoTurno + 1,
  };

  if (concluiuASegundaAcao(atacante.acoesRealizadasNoTurno)) {
    const sangramento = resolverSangramento(atacante);
    if (sangramento.vidaPerdida > 0) {
      atacante = sangramento.jogador;
      eventos.push({
        tipo: 'condicao-resolvida',
        alvo: atacanteId,
        condicao: 'sangramento',
        vidaPerdida: sangramento.vidaPerdida,
        restante: sangramento.restante,
      });
    }
  }

  atacante = substituirSlot(atacante, { ...slot, situacao: 'resolvida' });
  eventos.push({ tipo: 'acao-resolvida', indice });

  const comAmbos = substituirJogador(substituirJogador(partida, defensor), atacante);
  const fim = encerrarSeVidaZerou(comAmbos);
  return sucesso({ partida: fim.partida, eventos: [...eventos, ...fim.eventos] });
};
