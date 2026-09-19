import type {
  EscolhasDaAcao,
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  PerfilDeHabilidade,
  PlayerId,
  RespostaVoluntaria,
  SlotDeAcao,
} from '@arcane-duel/shared-types';
import { expirarAnotacoes, falha, sucesso } from '@arcane-duel/shared-types';

import type { RespostaDeComando } from './comando.js';
import { encerrarSeVidaZerou, exigirJogadorDaPartida, exigirTurnoEmAndamento } from './comando.js';
import { REGRAS_UNIVERSAIS } from './constants.js';
import { emboscadaArmadaCom, semEmboscada } from './recursos.js';
import { concluiuASegundaAcao, consumirLento, resolverSangramento } from './condicoes.js';
import { resolverAtaque } from './combate.js';
import { agendarCooldown } from './cooldown.js';
import type { DescontosDeCusto } from './custos.js';
import { pagarCustoCompleto } from './custos.js';
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
  escolhas: EscolhasDaAcao = {},
  descontos: DescontosDeCusto = {},
): RespostaDeComando => {
  const ativo = exigirTurnoEmAndamento(partida, jogador);
  if (!ativo.ok) return ativo;

  const atacante = ativo.valor;
  if (atacante.acoesRealizadasNoTurno >= atacante.acoesPermitidasNoTurno) {
    return falha({
      tipo: 'limite-de-acoes-atingido',
      limite: atacante.acoesPermitidasNoTurno,
    });
  }
  if (perfil.custo.moeda !== 'ap')
    return falha({ tipo: 'moeda-de-custo-invalida', esperada: 'ap' });
  /*
   * A carta pode vir de duas zonas próprias: a mão, que é o caso de sempre, e
   * a Emboscada armada, onde ela está face-down aguardando a terceira Ação. A
   * reserva é a única zona além da mão de onde se declara uma Ação, e por isso
   * é conferida aqui, junto da mão, e não por uma exceção espalhada.
   */
  const daEmboscada = emboscadaArmadaCom(atacante, perfil.carta);
  if (!atacante.mao.includes(perfil.carta) && !daEmboscada) {
    return falha({ tipo: 'carta-fora-da-mao', carta: perfil.carta });
  }

  const slot = proximoSlotLivre(atacante);
  if (slot === undefined) {
    return falha({
      tipo: 'limite-de-acoes-atingido',
      limite: atacante.acoesPermitidasNoTurno,
    });
  }

  const pagamento = pagarCustoCompleto(atacante, perfil.carta, perfil.custo, escolhas, descontos);
  if (!pagamento.ok) return pagamento;

  const eventos: EventoUniversal[] = [
    { tipo: 'acao-declarada', jogador, indice: slot.indice, carta: perfil.carta },
    {
      tipo: 'custo-pago',
      jogador,
      ap: pagamento.valor.ap,
      reserva: 0,
      impulso: pagamento.valor.impulso,
      recurso: pagamento.valor.recurso,
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
    // Declarada, a carta reservada deixa de estar face-down: a Emboscada
    // termina aqui, e a identidade passa a ser pública como a de qualquer Ação.
    ...(daEmboscada ? { recurso: semEmboscada(atualizado) } : {}),
  };
  atualizado = substituirSlot(atualizado, {
    ...slot,
    situacao: 'declarada',
    perfil,
    escolhas,
    recursoGasto: pagamento.valor.recurso,
  });

  return sucesso({ partida: substituirJogador(partida, atualizado), eventos });
};

/**
 * Ajustes de resolução que o texto de uma carta impõe a uma Ação declarada.
 *
 * Cada campo corresponde a uma frase impressa em alguma carta; nenhum deles é
 * um modificador numérico disfarçado. Um Dano final de zero é `danoFinal: 0`,
 * e não um modificador de menos novecentos e noventa e nove.
 */
export interface AjusteDeResolucao {
  readonly reducaoDeDano?: number;
  readonly reducaoDeImpacto?: number;
  readonly bonusAposReducao?: number;
  readonly danoFinal?: number;
  readonly impactoFinal?: number;
  readonly impedirRuptura?: boolean;
  readonly bonusDeRupturaSubstituto?: number;
  readonly cancelarTexto?: boolean;
}

/**
 * Aplica um ajuste de resolução ao espaço de Ação.
 *
 * O ajuste vive no espaço da Ação até a resolução, junto com os modificadores,
 * para que a conta inteira aconteça uma vez só e na ordem documentada.
 */
export const ajustarResolucao = (
  partida: EstadoDaPartida,
  atacante: PlayerId,
  indice: IndiceDeAcao,
  ajuste: AjusteDeResolucao,
): RespostaDeComando => {
  const encontrado = exigirJogadorDaPartida(partida, atacante);
  if (!encontrado.ok) return encontrado;

  const slot = buscarSlot(encontrado.valor, indice);
  if (slot === undefined) return falha({ tipo: 'acao-inexistente', indice });
  if (slot.situacao === 'vazio' || slot.situacao === 'indisponivel' || slot.perfil === null) {
    return falha({ tipo: 'acao-nao-declarada', indice });
  }
  if (slot.situacao === 'resolvida') return falha({ tipo: 'acao-ja-resolvida', indice });

  const eventos: EventoUniversal[] = [];
  const reducaoDeDano = ajuste.reducaoDeDano ?? 0;
  const reducaoDeImpacto = ajuste.reducaoDeImpacto ?? 0;
  if (reducaoDeDano !== 0 || reducaoDeImpacto !== 0) {
    eventos.push({
      tipo: 'reducao-da-resposta',
      jogador: adversarioDe(partida, atacante).id,
      indice,
      dano: reducaoDeDano,
      impacto: reducaoDeImpacto,
    });
  }
  if (ajuste.danoFinal !== undefined) {
    eventos.push({ tipo: 'dano-final-definido', indice, valor: ajuste.danoFinal });
  }
  if (ajuste.impactoFinal !== undefined) {
    eventos.push({ tipo: 'impacto-final-definido', indice, valor: ajuste.impactoFinal });
  }
  if (ajuste.impedirRuptura === true) {
    eventos.push({ tipo: 'ruptura-impedida', alvo: adversarioDe(partida, atacante).id });
  }
  if (ajuste.cancelarTexto === true) {
    eventos.push({ tipo: 'texto-cancelado', indice, carta: slot.perfil.carta });
  }

  const atualizado = substituirSlot(encontrado.valor, {
    ...slot,
    reducaoDaResposta: {
      dano: slot.reducaoDaResposta.dano + reducaoDeDano,
      impacto: slot.reducaoDaResposta.impacto + reducaoDeImpacto,
    },
    bonusAposReducao: slot.bonusAposReducao + (ajuste.bonusAposReducao ?? 0),
    danoFinalDefinido: ajuste.danoFinal ?? slot.danoFinalDefinido,
    impactoFinalDefinido: ajuste.impactoFinal ?? slot.impactoFinalDefinido,
    impedirRuptura: slot.impedirRuptura || ajuste.impedirRuptura === true,
    bonusDeRupturaSubstituto: ajuste.bonusDeRupturaSubstituto ?? slot.bonusDeRupturaSubstituto,
    textoCancelado: slot.textoCancelado || ajuste.cancelarTexto === true,
  });

  return sucesso({ partida: substituirJogador(partida, atualizado), eventos });
};

/**
 * Registra a Resposta voluntária do defensor a uma Ação declarada.
 *
 * No máximo uma por Ação: a Defesa Inata da classe **ou** uma carta de
 * Reação, nunca as duas como Respostas separadas (§8). Passivas automáticas e
 * ativações de Carta de Classe modificam a Resposta sem ocupar este espaço.
 *
 * Quando é carta de Reação, o custo cobrado é o **impresso na própria carta**:
 * a Resposta carrega o perfil dela, e não há como o chamador informar um
 * número que contradiga a carta. O tipo precisa ser `reacao` e a moeda precisa
 * ser Reserva, porque Reação se paga no turno inimigo (§6).
 *
 * O efeito numérico da Resposta é texto de carta e entra pelos modificadores;
 * aqui só a Resposta em si é registrada e paga.
 */
export const registrarResposta = (
  partida: EstadoDaPartida,
  defensor: PlayerId,
  indice: IndiceDeAcao,
  resposta: RespostaVoluntaria,
  descontos: DescontosDeCusto = {},
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
  if (slot.situacao === 'vazio' || slot.situacao === 'indisponivel') {
    return falha({ tipo: 'acao-nao-declarada', indice });
  }
  if (slot.situacao === 'resolvida') return falha({ tipo: 'acao-ja-resolvida', indice });
  if (slot.resposta.voluntaria !== null) {
    return falha({ tipo: 'segunda-resposta-voluntaria', indice });
  }

  let atualizado = doDefensor.valor;
  const eventos: EventoUniversal[] = [];

  if (resposta.tipo === 'carta-de-reacao') {
    const { perfil } = resposta;

    if (perfil.tipo !== 'reacao') {
      return falha({
        tipo: 'tipo-de-carta-invalido',
        carta: perfil.carta,
        esperado: 'reacao',
        recebido: perfil.tipo,
      });
    }
    if (perfil.custo.moeda !== 'reserva') {
      return falha({ tipo: 'moeda-de-custo-invalida', esperada: 'reserva' });
    }
    if (!atualizado.mao.includes(perfil.carta)) {
      return falha({ tipo: 'carta-fora-da-mao', carta: perfil.carta });
    }

    const pagamento = pagarCustoCompleto(atualizado, perfil.carta, perfil.custo, {}, descontos);
    if (!pagamento.ok) return pagamento;
    atualizado = {
      ...pagamento.valor.jogador,
      mao: pagamento.valor.jogador.mao.filter((carta) => carta !== perfil.carta),
    };
    eventos.push({
      tipo: 'custo-pago',
      jogador: defensor,
      ap: 0,
      reserva: pagamento.valor.reserva,
      impulso: 0,
      recurso: pagamento.valor.recurso,
    });
  }

  eventos.push({ tipo: 'resposta-registrada', jogador: defensor, indice, resposta });

  const comAtacante = substituirJogador(
    partida,
    substituirSlot(atacante, { ...slot, resposta: { ...slot.resposta, voluntaria: resposta } }),
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
  if (slot.situacao === 'vazio' || slot.situacao === 'indisponivel') {
    return falha({ tipo: 'acao-nao-declarada', indice });
  }
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
export interface OpcoesDeResolverAcao {
  /**
   * Adia a verificação de fim de partida para quem chamou.
   *
   * Existe porque várias cartas tiram Vida **depois** da resolução — "o
   * adversário perde 2 de Vida", "depois da resolução, o adversário perde 4 de
   * Vida". Verificar aqui e de novo lá fora daria duas respostas para a mesma
   * Ação e esconderia morte simultânea. Quem adia fica obrigado a chamar
   * `encerrarSeVidaZerou` uma vez, no fim de tudo.
   */
  readonly adiarDesfecho?: boolean;
}

export const resolverAcao = (
  partida: EstadoDaPartida,
  atacanteId: PlayerId,
  indice: IndiceDeAcao,
  opcoes: OpcoesDeResolverAcao = {},
): RespostaDeComando => {
  const ativo = exigirTurnoEmAndamento(partida, atacanteId);
  if (!ativo.ok) return ativo;

  const slot = buscarSlot(ativo.valor, indice);
  if (slot === undefined) return falha({ tipo: 'acao-inexistente', indice });
  if (slot.situacao === 'vazio' || slot.situacao === 'indisponivel' || slot.perfil === null) {
    return falha({ tipo: 'acao-nao-declarada', indice });
  }
  if (slot.situacao === 'resolvida') return falha({ tipo: 'acao-ja-resolvida', indice });

  const perfil = slot.perfil;
  const eventos: EventoUniversal[] = [];
  let atacante = ativo.valor;
  let defensor = adversarioDe(partida, atacanteId);

  if (perfil.valores !== null) {
    const resolucao = resolverAtaque(defensor, perfil.valores, slot.modificadores, {
      reducaoDaResposta: slot.reducaoDaResposta,
      bonusAposReducao: slot.bonusAposReducao,
      impedirRuptura: slot.impedirRuptura,
      bonusDeRupturaSubstituto: slot.bonusDeRupturaSubstituto,
      danoFinalDefinido: slot.danoFinalDefinido,
      impactoFinalDefinido: slot.impactoFinalDefinido,
    });
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
    if (resolucao.rupturaImpedida) {
      eventos.push({ tipo: 'ruptura-impedida', alvo: defensor.id });
    }
    eventos.push({
      tipo: 'dano-aplicado',
      alvo: defensor.id,
      valor: resolucao.dano,
      vidaAntes: resolucao.vidaAntes,
      vidaDepois: resolucao.vidaDepois,
    });
  }

  /*
   * A habilidade usada **não** entra no cooldown agora.
   *
   * Ela permanece fisicamente no espaço de Ação até o encerramento do turno
   * (§11), e o que acontece aqui é o **agendamento**: a carta continua no slot
   * e ganha um destino de cooldown. Quem move de fato é `encerrarTurno`.
   *
   * Uma carta sem zona impressa não é agendada: ela foi consumida e sai da
   * partida, como a Ultimate (§14).
   */
  if (perfil.cooldown !== null) {
    atacante = agendarCooldown(atacante, {
      carta: perfil.carta,
      zona: perfil.cooldown,
      turno: partida.turno?.numero ?? 0,
      origem: { tipo: 'acao', indice },
    });
    eventos.push({
      tipo: 'cooldown-agendado',
      jogador: atacanteId,
      carta: perfil.carta,
      zona: perfil.cooldown,
    });
  }

  const respostaComCarta = slot.resposta.voluntaria;
  if (respostaComCarta?.tipo === 'carta-de-reacao') {
    // A Reação também é uma das oito habilidades, e vai para a zona impressa
    // **nela** — não na Ação a que respondeu. Cada carta tem o próprio
    // cooldown (§11).
    const perfilDaReacao = respostaComCarta.perfil;
    if (perfilDaReacao.cooldown !== null) {
      defensor = agendarCooldown(defensor, {
        carta: perfilDaReacao.carta,
        zona: perfilDaReacao.cooldown,
        turno: partida.turno?.numero ?? 0,
        origem: { tipo: 'resposta', indice },
      });
      eventos.push({
        tipo: 'cooldown-agendado',
        jogador: defensor.id,
        carta: perfilDaReacao.carta,
        zona: perfilDaReacao.cooldown,
      });
    }
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
  if (opcoes.adiarDesfecho === true) return sucesso({ partida: comAmbos, eventos });

  const fim = encerrarSeVidaZerou(comAmbos);
  return sucesso({ partida: fim.partida, eventos: [...eventos, ...fim.eventos] });
};

/**
 * Apaga as anotações de escopo de Ação dos dois jogadores.
 *
 * Uma Ação só termina depois que o texto pós-resolução dela rodou: "Condições
 * que esta ação aplicaria a você não são aplicadas" precisa continuar de pé
 * enquanto a própria ação ainda está aplicando Condições. Por isso a expiração
 * é um passo explícito, dado por quem orquestra as janelas, e não um efeito
 * colateral do cálculo de combate.
 */
export const expirarAnotacoesDaAcao = (partida: EstadoDaPartida): EstadoDaPartida => ({
  ...partida,
  jogadores: [
    {
      ...partida.jogadores[0],
      anotacoes: expirarAnotacoes(partida.jogadores[0].anotacoes, 'acao'),
    },
    {
      ...partida.jogadores[1],
      anotacoes: expirarAnotacoes(partida.jogadores[1].anotacoes, 'acao'),
    },
  ],
});
