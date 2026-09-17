import type {
  CardId,
  EscolhaPendente,
  EscolhasDaAcao,
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  MatchId,
  ModoDeUso,
  PerfilDeHabilidade,
  PlayerId,
  ReforcoEscolhido,
  Resultado,
  SlotDeAcao,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';
import { falha, sucesso, temTag, valorDaAnotacao } from '@arcane-duel/shared-types';
import type {
  BuildEquipada,
  DescontosDeCusto,
  ErroDeDominio,
  EventoUniversal,
  ResultadoDoComando,
} from '@arcane-duel/rules-engine';
import {
  adiantarCartaNoCooldown,
  ativarCartaDeClasse,
  ativarPassiva,
  consumirUltimate,
  devolverCartaAMao,
  encerrarSeVidaZerou,
  criarPartida,
  declararAcao,
  encerrarTurno,
  exaurirCartaDeClasse,
  iniciarPartida,
  iniciarTurno,
  preverRuptura,
  registrarResposta,
  resolverAcao,
  valorDoRecurso,
} from '@arcane-duel/rules-engine';
import {
  CARD_DATA_VERSION,
  CATALOGO,
  PERSONAGEM_DA_CLASSE,
  perfilDaCarta,
} from '@arcane-duel/card-data';

import { ganharReservaExtra, ganharRecurso, perderVidaDireta } from './apoio.js';
import { CHAVE } from './chaves.js';
import type { Contexto } from './contexto.js';
import {
  adversarioDo,
  aplicar,
  aplicarObrigatorio,
  criarContexto,
  gravarJogador,
  jogadorDo,
  slotDe,
} from './contexto.js';
import type { AlvoDoEfeito, ConsultaDeCusto, ResumoDaResolucao } from './ganchos.js';
import {
  descontosDaDeclaracao,
  despachar,
  recusaDeEscolhas,
  recusaDeLegalidade,
  verificarRevelacoes,
} from './pipeline.js';
import { efeitoDeCartaDeClasse, efeitoDePassiva } from './registro.js';
import {
  aplicarPromessasDoAtaque,
  definirPromessa,
  lerPromessa,
  prometerAoProximoAtaque,
} from './efeitos/comum.js';
import {
  ORIGEM_MOMENTUM,
  aplicarDefesaInata,
  defesaInataJaUsada,
  momentumNoFimDoTurno,
  momentumPorAnularDano,
  momentumPorRemoverGuarda,
  podeUsarDefesaInata,
  registrarPegadaDoTurno,
  reporManaNoInicioDoTurno,
} from './efeitos/mecanicas.js';
import { podeUsarUltimoBastiao } from './efeitos/guerreiro.js';

/*
 * A API autoritativa da partida.
 *
 * É por aqui que uma partida real acontece. O cliente informa **identidade de
 * carta e escolhas legais**; custo, tipo, Dano, Impacto e cooldown são
 * buscados no catálogo. Não existe caminho por onde um cliente possa afirmar
 * que a carta dele custa menos ou causa mais.
 */

export interface UsoDeCartaDeClasse {
  readonly carta: CardId;
  readonly modo: ModoDeUso;
}

export interface PedidoDeAcao {
  readonly carta: CardId;
  readonly escolhas?: EscolhasDaAcao;
  readonly cartasDeClasse?: readonly UsoDeCartaDeClasse[];
}

export type PedidoDeResposta =
  | {
      readonly tipo: 'carta-de-reacao';
      readonly carta: CardId;
      readonly escolhas?: EscolhasDaAcao;
      readonly cartasDeClasse?: readonly UsoDeCartaDeClasse[];
    }
  | {
      readonly tipo: 'defesa-inata';
      /**
       * Guarda Marcial reduz 1 D **ou** 1 I, e a escolha é do Guerreiro.
       * A Barreira Arcana do Mago reduz os dois e não pede escolha.
       */
      readonly reducao?: ReforcoEscolhido;
      readonly escolhas?: EscolhasDaAcao;
      readonly cartasDeClasse?: readonly UsoDeCartaDeClasse[];
    }
  | { readonly tipo: 'sem-resposta' };

export type Resposta = Resultado<ResultadoDoComando, ErroDeDominio>;

const entregar = (ctx: Contexto): Resposta =>
  sucesso({ partida: ctx.partida, eventos: [...ctx.eventos] });

/**
 * Guarda as escolhas do defensor no espaço de Resposta da Ação.
 *
 * Elas ficam separadas das escolhas de quem atacou porque são de outro jogador:
 * "deixe Pronta uma Runa Ativada" e "reduza +1 D ou +1 I" são decisões de quem
 * responde.
 */
const gravarEscolhasNoSlot = (
  ctx: Contexto,
  atacante: PlayerId,
  indice: IndiceDeAcao,
  escolhas: EscolhasDaAcao,
): void => {
  const dono = jogadorDo(ctx, atacante);
  const comEscolhas = (slot: SlotDeAcao): SlotDeAcao =>
    slot.indice === indice ? { ...slot, resposta: { ...slot.resposta, escolhas } } : slot;

  gravarJogador(ctx, {
    ...dono,
    acoes: [
      comEscolhas(dono.acoes[0]),
      comEscolhas(dono.acoes[1]),
      comEscolhas(dono.acoes[2]),
      comEscolhas(dono.acoes[3]),
    ],
  });
};

/* ------------------------------------------------------------------ */
/* Montagem                                                            */
/* ------------------------------------------------------------------ */

export interface ConfiguracaoDeJogadorDoCatalogo {
  readonly id: PlayerId;
  readonly build: BuildEquipada;
}

export interface ConfiguracaoDePartidaDoCatalogo {
  readonly id: MatchId;
  readonly semente: string;
  readonly jogadores: readonly [ConfiguracaoDeJogadorDoCatalogo, ConfiguracaoDeJogadorDoCatalogo];
}

/** Confere que toda carta da build existe no catálogo e é da classe certa. */
export const validarBuild = (build: BuildEquipada): readonly ErroDeDominio[] => {
  const problemas: ErroDeDominio[] = [];
  const conferir = (carta: CardId): void => {
    const definicao = CATALOGO.porId(carta);
    if (definicao === undefined) {
      problemas.push({ tipo: 'carta-desconhecida', carta });
      return;
    }
    if (definicao.classe !== build.classe) {
      problemas.push({ tipo: 'carta-de-outra-classe', carta, classe: build.classe });
    }
  };

  // O Personagem não é carta do catálogo: ele é a identidade técnica da classe,
  // e a única coisa a conferir é se é o da classe escolhida.
  const personagemDaClasse = PERSONAGEM_DA_CLASSE[build.classe];
  if (build.personagem !== personagemDaClasse) {
    problemas.push({
      tipo: 'personagem-invalido',
      esperado: personagemDaClasse,
      recebido: build.personagem,
      classe: build.classe,
    });
  }

  for (const carta of build.habilidades) conferir(carta);
  for (const carta of build.passivas) conferir(carta);
  for (const carta of build.cartasDeClasse) conferir(carta);
  conferir(build.ultimate);
  return problemas;
};

/** Monta a partida a partir do catálogo oficial, carimbando a versão dele. */
export const montarPartida = (
  configuracao: ConfiguracaoDePartidaDoCatalogo,
): Resultado<EstadoDaPartida, readonly ErroDeDominio[]> => {
  const problemas = [
    ...validarBuild(configuracao.jogadores[0].build),
    ...validarBuild(configuracao.jogadores[1].build),
  ];
  if (problemas.length > 0) return falha(problemas);

  return sucesso(
    criarPartida({
      id: configuracao.id,
      semente: configuracao.semente,
      cardDataVersion: CARD_DATA_VERSION,
      jogadores: [
        { id: configuracao.jogadores[0].id, build: configuracao.jogadores[0].build },
        { id: configuracao.jogadores[1].id, build: configuracao.jogadores[1].build },
      ],
    }),
  );
};

/* ------------------------------------------------------------------ */
/* Turnos                                                              */
/* ------------------------------------------------------------------ */

export const iniciar = (partida: EstadoDaPartida, primeiro: PlayerId): Resposta => {
  const ctx = criarContexto(partida);
  const erro = aplicar(ctx, iniciarPartida(ctx.partida, primeiro));
  return erro === null ? entregar(ctx) : falha(erro);
};

/** Abre o turno: rotina universal, reposição de recurso de classe e Passivas. */
export const abrirTurno = (partida: EstadoDaPartida, jogador: PlayerId): Resposta => {
  const ctx = criarContexto(partida);
  const erro = aplicar(ctx, iniciarTurno(ctx.partida, jogador));
  if (erro !== null) return falha(erro);

  reporManaNoInicioDoTurno(ctx, jogador);
  verificarRevelacoes(ctx, 'inicio-do-turno', null, null);
  return entregar(ctx);
};

/**
 * Fecha o turno: o que as cartas prometeram para o fim, depois a rotina
 * universal, depois o que depende do estado já fechado.
 */
export const fecharTurno = (partida: EstadoDaPartida, jogador: PlayerId): Resposta => {
  const ctx = criarContexto(partida);

  momentumNoFimDoTurno(ctx, jogador);
  resolverCinzasExaurida(ctx, jogador);

  const erro = aplicar(ctx, encerrarTurno(ctx.partida, jogador));
  if (erro !== null) return falha(erro);

  // "No fim deste turno, ganhe +1 Reserva além da conversão normal": a
  // conversão já aconteceu, então o bônus entra agora.
  const extra = lerPromessa(ctx, jogador, CHAVE.reservaExtraNoFim);
  if (extra > 0) ganharReservaExtra(ctx, jogador, extra);

  // "Se terminar o turno com 2 de Reserva, ganhe mais 1 Momentum."
  const prometido = lerPromessa(ctx, jogador, CHAVE.momentumSeTerminarComReserva2);
  if (prometido > 0 && jogadorDo(ctx, jogador).reserva === 2) {
    ganharRecurso(ctx, jogador, 'momentum', prometido);
  }

  verificarRevelacoes(ctx, 'fim-do-turno', null, null);
  return entregar(ctx);
};

/**
 * Runa de Cinzas Exaurida: "quando a Queimadura do adversário fosse causar
 * Dano, remova toda a Queimadura e faça esse evento causar 3 de Dano em vez do
 * valor normal."
 *
 * A Queimadura tica no fim do turno de quem a carrega, então o efeito entra
 * aqui, antes da rotina universal — que depois encontra a Condição já zerada e
 * não tica de novo.
 */
const resolverCinzasExaurida = (ctx: Contexto, jogador: PlayerId): void => {
  const afetado = jogadorDo(ctx, jogador);
  if (afetado.condicoes.queimadura <= 0) return;

  const inimigo = adversarioDo(ctx, jogador);
  const armada = valorDaAnotacao(inimigo.anotacoes, CHAVE.cinzasArmada);
  if (armada <= 0) return;

  const removido = afetado.condicoes.queimadura;
  gravarJogador(ctx, {
    ...afetado,
    condicoes: { ...afetado.condicoes, queimadura: 0 },
  });
  ctx.eventos.push({
    tipo: 'condicao-removida',
    alvo: jogador,
    condicao: 'queimadura',
    quantidade: removido,
  });

  perderVidaDireta(ctx, jogador, 3, RUNA_DE_CINZAS);
  definirPromessa(ctx, inimigo.id, RUNA_DE_CINZAS, CHAVE.cinzasArmada, 0, 'partida');
};

const RUNA_DE_CINZAS: CardId = 'MC01' as CardId;

/* ------------------------------------------------------------------ */
/* Declaração                                                          */
/* ------------------------------------------------------------------ */

const perfilAutoritativo = (
  jogador: EstadoDeJogador,
  carta: CardId,
): Resultado<PerfilDeHabilidade, ErroDeDominio> => {
  const definicao = CATALOGO.porId(carta);
  if (definicao === undefined) return falha({ tipo: 'carta-desconhecida', carta });
  if (definicao.classe !== jogador.classe) {
    return falha({ tipo: 'carta-de-outra-classe', carta, classe: jogador.classe });
  }
  const perfil = perfilDaCarta(carta);
  if (perfil === undefined) {
    return falha({
      tipo: 'escolha-invalida',
      carta,
      detalhe: 'esta carta não é jogada de um espaço de Ação ou de Resposta',
    });
  }
  return sucesso(perfil);
};

const conferirCartasDeClasse = (
  jogador: EstadoDeJogador,
  usos: readonly UsoDeCartaDeClasse[],
): ErroDeDominio | null => {
  for (const uso of usos) {
    const equipada = jogador.cartasDeClasse.find((item) => item.carta === uso.carta);
    if (equipada === undefined) {
      return jogador.removidas.includes(uso.carta)
        ? { tipo: 'carta-de-classe-ja-exaurida', carta: uso.carta }
        : { tipo: 'carta-de-classe-desconhecida', carta: uso.carta };
    }
    if (uso.modo === 'exaurir' && equipada.estado !== 'pronta') {
      return { tipo: 'carta-de-classe-nao-esta-pronta', carta: uso.carta };
    }
    if (uso.modo === 'ativar' && equipada.estado !== 'pronta') {
      return { tipo: 'carta-de-classe-nao-esta-pronta', carta: uso.carta };
    }
  }
  return null;
};

/** Quanto de recurso de classe a jogada vai gastar, com a parcela variável. */
const recursoPrevistoDe = (perfil: PerfilDeHabilidade, escolhas: EscolhasDaAcao): number => {
  const fixa = perfil.custo.recurso?.quantidade ?? 0;
  const variavel = perfil.custo.variavel;
  if (variavel === undefined) return fixa;
  return fixa + (escolhas.recursoAdicional ?? variavel.minimo);
};

/** Descontos que vêm do estado, e não de uma carta específica em jogo. */
const descontosDoEstado = (
  jogador: EstadoDeJogador,
  perfil: PerfilDeHabilidade,
  ordem: number,
): DescontosDeCusto => {
  const encarecida = valorDaAnotacao(jogador.anotacoes, `${CHAVE.ecoEncarece}:${perfil.carta}`) > 0;
  const prismatica =
    ordem === 3 &&
    temTag(perfil, 'feitico') &&
    valorDaAnotacao(jogador.anotacoes, CHAVE.prismaticaDesconto) > 0;

  return {
    ...(encarecida ? { apAdicional: 1 } : {}),
    ...(prismatica ? { ap: 1, apMinimo: 1 } : {}),
  };
};

const alvoDaAcao = (
  atacante: PlayerId,
  defensor: PlayerId,
  indice: IndiceDeAcao,
  perfil: PerfilDeHabilidade,
  reacao: PerfilDeHabilidade | null,
): AlvoDoEfeito => ({
  dono: atacante,
  atacante,
  defensor,
  indice,
  origem: perfil.carta,
  perfil,
  reacao,
  ordem: indice + 1,
});

/**
 * Declara uma Ação a partir da identidade da carta.
 *
 * O cliente manda o identificador e as escolhas legais. O custo cobrado, os
 * valores usados e a zona de cooldown vêm do catálogo.
 */
export const declarar = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  pedido: PedidoDeAcao,
): Resposta => {
  const ctx = criarContexto(partida);
  const atual = ctx.partida.jogadores.find((item) => item.id === jogador);
  if (atual === undefined) return falha({ tipo: 'jogador-desconhecido', jogador });

  const travado = travadoPorEscolha(ctx.partida, jogador);
  if (travado !== null) return falha(travado);

  const perfil = perfilAutoritativo(atual, pedido.carta);
  if (!perfil.ok) return perfil;
  if (perfil.valor.tipo === 'reacao') {
    return falha({
      tipo: 'tipo-de-carta-invalido',
      carta: pedido.carta,
      esperado: 'ataque',
      recebido: 'reacao',
    });
  }

  const usos = pedido.cartasDeClasse ?? [];
  const problemaDeClasse = conferirCartasDeClasse(atual, usos);
  if (problemaDeClasse !== null) return falha(problemaDeClasse);

  const ehUltimate = atual.ultimate.carta === pedido.carta;
  if (ehUltimate) {
    if (atual.ultimate.estado !== 'disponivel') return falha({ tipo: 'ultimate-ja-consumida' });
  } else if (!atual.mao.includes(pedido.carta)) {
    return falha({ tipo: 'carta-fora-da-mao', carta: pedido.carta });
  }

  const ordem = atual.acoesRealizadasNoTurno + 1;
  const escolhas = pedido.escolhas ?? {};
  const consulta: ConsultaDeCusto = {
    partida: ctx.partida,
    jogador: atual,
    adversario: adversarioDo(ctx, jogador),
    perfil: perfil.valor,
    ordem,
    escolhas,
    cartasDeClasse: usos,
    recursoPrevisto: recursoPrevistoDe(perfil.valor, escolhas),
  };

  const recusa = recusaDeLegalidade(consulta, usos);
  if (recusa !== null) {
    return falha({ tipo: 'condicao-de-uso-nao-satisfeita', carta: pedido.carta, detalhe: recusa });
  }

  const escolhaFaltando = recusaDeEscolhas(consulta, usos);
  if (escolhaFaltando !== null) return falha(escolhaFaltando);

  const descontos = somar(
    descontosDaDeclaracao(consulta, usos),
    descontosDoEstado(atual, perfil.valor, ordem),
  );

  if (ehUltimate) {
    // A Ultimate é consumida ao ser jogada e entra no espaço de Ação sem passar
    // pela mão: ela não é uma das oito habilidades e não volta por cooldown.
    aplicarObrigatorio(ctx, consumirUltimate(ctx.partida, jogador));
    const comUltimate = jogadorDo(ctx, jogador);
    ctx.partida = {
      ...ctx.partida,
      jogadores: [
        ctx.partida.jogadores[0].id === jogador
          ? { ...comUltimate, mao: [...comUltimate.mao, pedido.carta] }
          : ctx.partida.jogadores[0],
        ctx.partida.jogadores[1].id === jogador
          ? { ...comUltimate, mao: [...comUltimate.mao, pedido.carta] }
          : ctx.partida.jogadores[1],
      ],
    };
  }

  const erro = aplicar(
    ctx,
    declararAcao(ctx.partida, jogador, perfil.valor, pedido.escolhas ?? {}, descontos),
  );
  if (erro !== null) return falha(erro);

  const indice = (ordem - 1) as IndiceDeAcao;
  for (const uso of usos) {
    const comando =
      uso.modo === 'ativar'
        ? ativarCartaDeClasse(ctx.partida, jogador, uso.carta, indice)
        : exaurirCartaDeClasse(ctx.partida, jogador, uso.carta, indice);
    const problema = aplicar(ctx, comando);
    if (problema !== null) return falha(problema);
    if (uso.modo === 'ativar') {
      prometerAoProximoAtaque(ctx, jogador, uso.carta, CHAVE.runasAtivadasNoTurno, 1);
    }
  }

  const defensor = adversarioDo(ctx, jogador).id;
  const alvo = alvoDaAcao(jogador, defensor, indice, perfil.valor, null);

  despachar(ctx, alvo, 'ao-declarar');
  verificarRevelacoes(ctx, 'ao-declarar', alvo, null);
  // "Revele quando um Ataque causaria Ruptura" passa a valer assim que o Ataque
  // é declarado: é dessa ameaça que o texto fala, e é antes de ela resolver que
  // o defensor precisa poder decidir se Ativa a Passiva.
  verificarRevelacoes(ctx, 'antes-de-resolver', alvo, null);

  return entregar(ctx);
};

const somar = (a: DescontosDeCusto, b: DescontosDeCusto): DescontosDeCusto => {
  const apMinimo = [a.apMinimo, b.apMinimo].filter((valor): valor is number => valor !== undefined);
  return {
    ...((a.ap ?? 0) + (b.ap ?? 0) === 0 ? {} : { ap: (a.ap ?? 0) + (b.ap ?? 0) }),
    ...((a.apAdicional ?? 0) + (b.apAdicional ?? 0) === 0
      ? {}
      : { apAdicional: (a.apAdicional ?? 0) + (b.apAdicional ?? 0) }),
    ...((a.reserva ?? 0) + (b.reserva ?? 0) === 0
      ? {}
      : { reserva: (a.reserva ?? 0) + (b.reserva ?? 0) }),
    ...((a.recurso ?? 0) + (b.recurso ?? 0) === 0
      ? {}
      : { recurso: (a.recurso ?? 0) + (b.recurso ?? 0) }),
    ...(a.ignorarRecurso === true || b.ignorarRecurso === true ? { ignorarRecurso: true } : {}),
    ...(apMinimo.length === 0 ? {} : { apMinimo: Math.max(...apMinimo) }),
  };
};

/* ------------------------------------------------------------------ */
/* Resposta                                                            */
/* ------------------------------------------------------------------ */

/**
 * Registra a Resposta do defensor.
 *
 * A Resposta é uma só por Ação: carta de Reação **ou** Defesa Inata (§8). O
 * perfil da Reação vem do catálogo, então o custo em Reserva e a zona de
 * cooldown são os impressos nela.
 */
export const responder = (
  partida: EstadoDaPartida,
  defensor: PlayerId,
  indice: IndiceDeAcao,
  pedido: PedidoDeResposta,
): Resposta => {
  if (pedido.tipo === 'sem-resposta') return sucesso({ partida, eventos: [] });

  const ctx = criarContexto(partida);
  const doDefensor = ctx.partida.jogadores.find((item) => item.id === defensor);
  if (doDefensor === undefined) return falha({ tipo: 'jogador-desconhecido', jogador: defensor });

  const travado = travadoPorEscolha(ctx.partida, defensor);
  if (travado !== null) return falha(travado);

  const atacante = adversarioDo(ctx, defensor);
  const slot = slotDe(atacante, indice);
  if (slot === undefined) return falha({ tipo: 'acao-nao-declarada', indice });
  const perfilDaAcao = slot.perfil;
  if (perfilDaAcao === null || slot.situacao !== 'declarada') {
    return falha({ tipo: 'acao-nao-declarada', indice });
  }
  // Uma segunda Resposta voluntária é ilegal seja qual for a escolha, então a
  // recusa vem antes de cobrar qualquer decisão do jogador (§8).
  if (slot.resposta.voluntaria !== null) {
    return falha({ tipo: 'segunda-resposta-voluntaria', indice });
  }

  if (pedido.tipo === 'defesa-inata') {
    if (defesaInataJaUsada(ctx, defensor)) return falha({ tipo: 'defesa-inata-ja-usada' });
    if (!podeUsarDefesaInata(ctx, defensor)) {
      // A Barreira Arcana do Mago cobra 1 Mana: sem Mana, a Defesa Inata não é
      // "já usada", é impagável — e o erro precisa dizer isso.
      return falha({
        tipo: 'recurso-insuficiente',
        recurso: 'mana',
        necessario: 1,
        disponivel: valorDoRecurso(doDefensor, 'mana') ?? 0,
      });
    }

    const usosDaDefesa = pedido.cartasDeClasse ?? [];
    const problemaDaDefesa = conferirCartasDeClasse(doDefensor, usosDaDefesa);
    if (problemaDaDefesa !== null) return falha(problemaDaDefesa);

    // "Guarda Marcial: reduza 1 D ou 1 I." O "ou" é do jogador, e o motor não
    // decide por ele. A Barreira Arcana do Mago reduz os dois e não pergunta.
    if (doDefensor.classe === 'guerreiro' && pedido.reducao === undefined) {
      return falha({
        tipo: 'escolha-obrigatoria',
        carta: doDefensor.personagem,
        detalhe: 'Guarda Marcial reduz 1 D ou 1 I: informe qual',
      });
    }

    const escolhasDaDefesa = pedido.escolhas ?? {};
    const consultaDaDefesa: ConsultaDeCusto = {
      partida: ctx.partida,
      jogador: doDefensor,
      adversario: atacante,
      perfil: perfilDaAcao,
      ordem: indice + 1,
      escolhas: escolhasDaDefesa,
      cartasDeClasse: usosDaDefesa,
      recursoPrevisto: 0,
    };
    const faltaNaDefesa = recusaDeEscolhas(consultaDaDefesa, usosDaDefesa);
    if (faltaNaDefesa !== null) return falha(faltaNaDefesa);

    const erro = aplicar(
      ctx,
      registrarResposta(ctx.partida, defensor, indice, { tipo: 'defesa-inata' }),
    );
    if (erro !== null) return falha(erro);

    // As Cartas de Classe entram antes da Defesa Inata porque algumas delas
    // mudam o que a própria Defesa Inata faz.
    for (const uso of usosDaDefesa) {
      const comando =
        uso.modo === 'ativar'
          ? ativarCartaDeClasse(ctx.partida, defensor, uso.carta, indice)
          : exaurirCartaDeClasse(ctx.partida, defensor, uso.carta, indice);
      const problema = aplicar(ctx, comando);
      if (problema !== null) return falha(problema);
    }

    const alvo = alvoDaAcao(atacante.id, defensor, indice, perfilDaAcao, null);
    gravarEscolhasNoSlot(ctx, atacante.id, indice, escolhasDaDefesa);
    const usada = aplicarDefesaInata(ctx, alvo, pedido.reducao ?? 'dano');
    if (usada !== null) ctx.eventos.push({ tipo: 'defesa-inata-usada', jogador: defensor });

    despachar(ctx, alvo, 'ao-responder');
    verificarRevelacoes(ctx, 'ao-responder', alvo, null);
    verificarRevelacoes(ctx, 'antes-de-resolver', alvo, null);
    return entregar(ctx);
  }

  const perfil = perfilAutoritativo(doDefensor, pedido.carta);
  if (!perfil.ok) return perfil;
  if (perfil.valor.tipo !== 'reacao') {
    return falha({
      tipo: 'tipo-de-carta-invalido',
      carta: pedido.carta,
      esperado: 'reacao',
      recebido: perfil.valor.tipo,
    });
  }

  const ehUltimate = doDefensor.ultimate.carta === pedido.carta;
  if (ehUltimate && doDefensor.ultimate.estado !== 'disponivel') {
    return falha({ tipo: 'ultimate-ja-consumida' });
  }

  const usos = pedido.cartasDeClasse ?? [];
  const problemaDeClasse = conferirCartasDeClasse(doDefensor, usos);
  if (problemaDeClasse !== null) return falha(problemaDeClasse);

  const escolhasDaResposta = pedido.escolhas ?? {};
  const consulta: ConsultaDeCusto = {
    partida: ctx.partida,
    jogador: doDefensor,
    adversario: atacante,
    perfil: perfilDaAcao,
    ordem: indice + 1,
    escolhas: escolhasDaResposta,
    cartasDeClasse: usos,
    recursoPrevisto: recursoPrevistoDe(perfil.valor, escolhasDaResposta),
  };

  // Último Bastião só responde a um Ataque que causaria Ruptura, e isso depende
  // do estado da Ação — por isso a checagem é aqui, com a previsão em mãos.
  if (pedido.carta === ULTIMO_BASTIAO) {
    const previsao = podeUsarUltimoBastiao(ctx, {
      atacante: atacante.id,
      defensor,
      indice,
    });
    if (!previsao) {
      return falha({
        tipo: 'condicao-de-uso-nao-satisfeita',
        carta: pedido.carta,
        detalhe: 'só contra um Ataque que causaria Ruptura',
      });
    }
  }

  const recusaDaReacao = recusaDeLegalidade({ ...consulta, perfil: perfilDaAcao }, usos);
  const recusaPropria = efeitoDaReacao(pedido.carta, consulta);
  const recusa = recusaPropria ?? recusaDaReacao;
  if (recusa !== null) {
    return falha({ tipo: 'condicao-de-uso-nao-satisfeita', carta: pedido.carta, detalhe: recusa });
  }

  const consultaDaReacao: ConsultaDeCusto = { ...consulta, perfil: perfil.valor };
  const faltaNaResposta = recusaDeEscolhas(consultaDaReacao, usos);
  if (faltaNaResposta !== null) return falha(faltaNaResposta);

  const descontos = descontosDaDeclaracao(consultaDaReacao, usos);

  if (ehUltimate) {
    aplicarObrigatorio(ctx, consumirUltimate(ctx.partida, defensor));
    const comUltimate = jogadorDo(ctx, defensor);
    ctx.partida = {
      ...ctx.partida,
      jogadores: [
        ctx.partida.jogadores[0].id === defensor
          ? { ...comUltimate, mao: [...comUltimate.mao, pedido.carta] }
          : ctx.partida.jogadores[0],
        ctx.partida.jogadores[1].id === defensor
          ? { ...comUltimate, mao: [...comUltimate.mao, pedido.carta] }
          : ctx.partida.jogadores[1],
      ],
    };
  }

  const erro = aplicar(
    ctx,
    registrarResposta(
      ctx.partida,
      defensor,
      indice,
      { tipo: 'carta-de-reacao', perfil: perfil.valor },
      descontos,
    ),
  );
  if (erro !== null) return falha(erro);

  gravarEscolhasNoSlot(ctx, atacante.id, indice, escolhasDaResposta);
  prometerAoProximoAtaque(ctx, defensor, pedido.carta, CHAVE.reacoesUsadas, 1);

  for (const uso of usos) {
    const comando =
      uso.modo === 'ativar'
        ? ativarCartaDeClasse(ctx.partida, defensor, uso.carta, indice)
        : exaurirCartaDeClasse(ctx.partida, defensor, uso.carta, indice);
    const problema = aplicar(ctx, comando);
    if (problema !== null) return falha(problema);
    if (uso.modo === 'ativar') {
      prometerAoProximoAtaque(ctx, defensor, uso.carta, CHAVE.runasAtivadasNoTurno, 1);
    }
  }

  const alvo = alvoDaAcao(atacante.id, defensor, indice, perfilDaAcao, perfil.valor);
  despachar(ctx, alvo, 'ao-responder');
  verificarRevelacoes(ctx, 'ao-responder', alvo, null);
  verificarRevelacoes(ctx, 'antes-de-resolver', alvo, null);

  return entregar(ctx);
};

const ULTIMO_BASTIAO: CardId = 'W20' as CardId;

/** Recusa própria da carta de Reação, avaliada contra a Ação a que ela responde. */
const efeitoDaReacao = (carta: CardId, consulta: ConsultaDeCusto): string | null => {
  if (carta === ('M19' as CardId)) {
    return consulta.perfil.tipo === 'tecnica' ? null : 'só responde a uma Técnica';
  }
  return null;
};

/**
 * Usa uma Carta de Classe sobre uma Ação já declarada.
 *
 * Existe porque várias Cartas de Classe agem **depois** de ver a Resposta do
 * adversário — "depois que o adversário usar uma carta de Reação, seu Ataque
 * recebe +3 D". Sem este comando, o dono do Ataque não teria momento nenhum
 * para reagir ao que viu.
 */
export const usarCartaDeClasseNaAcao = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  indice: IndiceDeAcao,
  uso: UsoDeCartaDeClasse,
): Resposta => {
  const ctx = criarContexto(partida);
  const dono = ctx.partida.jogadores.find((item) => item.id === jogador);
  if (dono === undefined) return falha({ tipo: 'jogador-desconhecido', jogador });

  const problema = conferirCartasDeClasse(dono, [uso]);
  if (problema !== null) return falha(problema);

  const atacante = ctx.partida.jogadores.find((item) =>
    item.acoes.some((slot) => slot.indice === indice && slot.situacao === 'declarada'),
  );
  if (atacante === undefined) return falha({ tipo: 'acao-nao-declarada', indice });

  const slot = slotDe(atacante, indice);
  if (slot === undefined) return falha({ tipo: 'acao-nao-declarada', indice });
  const perfilDaAcao = slot.perfil;
  if (perfilDaAcao === null) return falha({ tipo: 'acao-nao-declarada', indice });

  const comando =
    uso.modo === 'ativar'
      ? ativarCartaDeClasse(ctx.partida, jogador, uso.carta, indice)
      : exaurirCartaDeClasse(ctx.partida, jogador, uso.carta, indice);
  const erro = aplicar(ctx, comando);
  if (erro !== null) return falha(erro);

  const defensor = adversarioDo(ctx, atacante.id).id;
  const voluntaria = slot.resposta.voluntaria;
  const reacao = voluntaria?.tipo === 'carta-de-reacao' ? voluntaria.perfil : null;
  const alvo = alvoDaAcao(atacante.id, defensor, indice, perfilDaAcao, reacao);

  // Só o texto desta carta roda: as demais fontes da Ação já tiveram a janela
  // de Resposta delas e repeti-las aplicaria a redução da Reação duas vezes.
  const par = efeitoDeCartaDeClasse(uso.carta);
  const efeito = uso.modo === 'ativar' ? par?.ativar : par?.exaurir;
  efeito?.aoResponder?.(ctx, { ...alvo, dono: jogador, origem: uso.carta });

  return entregar(ctx);
};

/**
 * Ativa uma Passiva sobre uma Ação declarada.
 *
 * Existe porque duas Passivas dizem "Ative e gaste...": Ativar é escolha do
 * jogador, e ela acontece durante a Ação do adversário. Sem este comando, o
 * motor teria de decidir por ele — que é exatamente o que não pode fazer.
 *
 * A Ativação é a transição normal de Passiva: Pronta vira Ativada, com o evento
 * `passiva-ativada`, e ela só volta a ficar Pronta no início do turno do dono.
 * É esse estado que faz valer o "uma vez por turno inimigo" — não um contador
 * paralelo.
 */
export const ativarPassivaNaAcao = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  indice: IndiceDeAcao,
  carta: CardId,
): Resposta => {
  const ctx = criarContexto(partida);
  const dono = ctx.partida.jogadores.find((item) => item.id === jogador);
  if (dono === undefined) return falha({ tipo: 'jogador-desconhecido', jogador });

  const equipada = dono.passivas.find((passiva) => passiva.carta === carta);
  if (equipada === undefined) return falha({ tipo: 'passiva-desconhecida', carta });

  const efeito = efeitoDePassiva(carta);
  const ativacao = efeito?.ativacao;
  if (ativacao === undefined) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta,
      detalhe: 'esta Passiva não tem efeito de Ativação',
    });
  }

  const atacante = ctx.partida.jogadores.find((item) =>
    item.acoes.some((slot) => slot.indice === indice && slot.situacao === 'declarada'),
  );
  if (atacante === undefined) return falha({ tipo: 'acao-nao-declarada', indice });

  const slot = slotDe(atacante, indice);
  const perfilDaAcao = slot?.perfil ?? null;
  if (slot === undefined || perfilDaAcao === null) {
    return falha({ tipo: 'acao-nao-declarada', indice });
  }

  const defensor = adversarioDo(ctx, atacante.id).id;
  const voluntaria = slot.resposta.voluntaria;
  const reacao = voluntaria?.tipo === 'carta-de-reacao' ? voluntaria.perfil : null;
  const alvo: AlvoDoEfeito = {
    ...alvoDaAcao(atacante.id, defensor, indice, perfilDaAcao, reacao),
    dono: jogador,
    origem: carta,
  };

  // O estado vem primeiro: "ainda oculta" e "não está Pronta" são recusas mais
  // precisas do que "as condições do texto não valem".
  const erro = aplicar(ctx, ativarPassiva(ctx.partida, jogador, carta));
  if (erro !== null) return falha(erro);

  if (!ativacao.podeAtivar(ctx, alvo)) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta,
      detalhe: 'as condições impressas para Ativar não estão satisfeitas agora',
    });
  }

  ativacao.aplicar(ctx, alvo);
  return entregar(ctx);
};

/**
 * Resolve uma escolha que ficou pendente.
 *
 * O jogador informa qual das opções legais quer, e o efeito acontece sobre ela.
 * Enquanto a pendência existir, ele não declara Ação nem responde.
 */
export const resolverEscolhaPendente = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  carta: CardId,
): Resposta => {
  const ctx = criarContexto(partida);
  const pendente = ctx.partida.escolhasPendentes.find((escolha) => escolha.jogador === jogador);
  if (pendente === undefined) return falha({ tipo: 'sem-escolha-pendente', jogador });

  if (!pendente.opcoes.includes(carta)) {
    return falha({
      tipo: 'escolha-invalida',
      carta,
      detalhe: 'a carta escolhida não está entre as opções da escolha pendente',
    });
  }

  const dono = jogadorDo(ctx, jogador);

  // A escolha pode ser respondida depois de a carta já ter saído do cooldown
  // sozinha — o avanço do início de turno faz isso. Nesse caso a decisão do
  // jogador continua valendo e a pendência se encerra; o que não existe mais é
  // o movimento. Registrado em docs/AMBIGUIDADES.md.
  if (pendente.efeito === 'devolver-a-mao') {
    const movimento = devolverCartaAMao(dono, carta);
    if (movimento.ok) {
      gravarJogador(ctx, movimento.valor.jogador);
      ctx.eventos.push({ tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de });
    } else if (movimento.erro.tipo !== 'carta-fora-do-cooldown') {
      return falha(movimento.erro);
    }
  } else {
    const movimento = adiantarCartaNoCooldown(dono, carta);
    if (!movimento.ok) {
      if (movimento.erro.tipo !== 'carta-fora-do-cooldown') return falha(movimento.erro);
      return encerrarPendencia(ctx, pendente, jogador, carta);
    }
    gravarJogador(ctx, movimento.valor.jogador);
    ctx.eventos.push(
      movimento.valor.voltouParaAMao
        ? { tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de }
        : {
            tipo: 'carta-adiantada-no-cooldown',
            jogador,
            carta,
            de: movimento.valor.de,
            para: movimento.valor.para,
          },
    );
  }

  return encerrarPendencia(ctx, pendente, jogador, carta);
};

/** Tira a pendência da mesa e registra que ela foi respondida. */
const encerrarPendencia = (
  ctx: Contexto,
  pendente: EscolhaPendente,
  jogador: PlayerId,
  carta: CardId,
): Resposta => {
  ctx.partida = {
    ...ctx.partida,
    escolhasPendentes: ctx.partida.escolhasPendentes.filter((escolha) => escolha !== pendente),
  };
  ctx.eventos.push({
    tipo: 'escolha-pendente-resolvida',
    jogador,
    origem: pendente.origem,
    carta,
  });
  return entregar(ctx);
};

/** Recusa a jogada enquanto o jogador tiver escolha pendente. */
const travadoPorEscolha = (partida: EstadoDaPartida, jogador: PlayerId): ErroDeDominio | null => {
  const pendente = partida.escolhasPendentes.find((escolha) => escolha.jogador === jogador);
  return pendente === undefined
    ? null
    : { tipo: 'escolha-pendente', origem: pendente.origem, jogador };
};

/* ------------------------------------------------------------------ */
/* Resolução                                                           */
/* ------------------------------------------------------------------ */

const resumirEventos = (
  eventos: readonly EventoUniversal[],
  teriaRompidoSemResposta: boolean,
  houveReacao: boolean,
  houveAtaque: boolean,
): ResumoDaResolucao => {
  let dano = 0;
  let impacto = 0;
  let guardaRemovida = 0;
  let ruptura = false;
  let rupturaImpedida = false;
  let zona: ZonaDeCooldown | null = null;
  let vidaPerdida = 0;

  for (const evento of eventos) {
    if (evento.tipo === 'dano-aplicado') {
      dano = evento.valor;
      vidaPerdida = evento.vidaAntes - evento.vidaDepois;
    } else if (evento.tipo === 'impacto-aplicado') {
      impacto = evento.valor;
      guardaRemovida = evento.guardaAntes - evento.guardaDepois;
    } else if (evento.tipo === 'ruptura') ruptura = true;
    else if (evento.tipo === 'ruptura-impedida') rupturaImpedida = true;
    else if (evento.tipo === 'carta-para-cooldown' && zona === null) zona = evento.zona;
  }

  return {
    houveAtaque,
    dano,
    impacto,
    guardaRemovida,
    ruptura,
    rupturaImpedida,
    houveReacao,
    zonaDeCooldown: zona,
    vidaPerdidaPeloDefensor: vidaPerdida,
    teriaRompidoSemResposta,
  };
};

/**
 * Resolve a Ação declarada, com as janelas de efeito em volta da resolução
 * universal.
 */
export const resolver = (
  partida: EstadoDaPartida,
  atacante: PlayerId,
  indice: IndiceDeAcao,
): Resposta => {
  const ctx = criarContexto(partida);
  const doAtacante = ctx.partida.jogadores.find((item) => item.id === atacante);
  if (doAtacante === undefined) return falha({ tipo: 'jogador-desconhecido', jogador: atacante });

  const slot = slotDe(doAtacante, indice);
  if (slot === undefined) return falha({ tipo: 'acao-nao-declarada', indice });
  const perfilDaAcao = slot.perfil;
  if (perfilDaAcao === null || slot.situacao !== 'declarada') {
    return falha({ tipo: 'acao-nao-declarada', indice });
  }

  const defensor = adversarioDo(ctx, atacante).id;
  const respostaVoluntaria = slot.resposta.voluntaria;
  const reacao = respostaVoluntaria?.tipo === 'carta-de-reacao' ? respostaVoluntaria.perfil : null;
  const alvo = alvoDaAcao(atacante, defensor, indice, perfilDaAcao, reacao);

  // O que ficou prometido ao "próximo Ataque neste turno" entra antes de tudo:
  // ele faz parte dos valores com que a Ação chega à resolução.
  const promessas = aplicarPromessasDoAtaque(ctx, alvo);

  despachar(ctx, alvo, 'antes-de-resolver');
  verificarRevelacoes(ctx, 'antes-de-resolver', alvo, null);

  // A contrafactual de Ruptura é medida agora, com tudo que já foi somado e sem
  // a redução da Resposta. Medir por previsão evita resolver a Ação duas vezes.
  const antes = slotDe(jogadorDo(ctx, atacante), indice);
  const valores = antes?.perfil?.valores ?? null;
  const teriaRompido =
    valores !== null &&
    preverRuptura(
      jogadorDo(ctx, defensor).guarda,
      valores,
      antes?.modificadores ?? {
        dano: 0,
        impacto: 0,
      },
    );

  // O desfecho fica adiado: várias cartas tiram Vida depois da resolução, e o
  // fim da partida precisa ser decidido com a Ação inteira já resolvida.
  const antesDaResolucao = ctx.eventos.length;
  const erro = aplicar(ctx, resolverAcao(ctx.partida, atacante, indice, { adiarDesfecho: true }));
  if (erro !== null) return falha(erro);

  const resumo = resumirEventos(
    ctx.eventos.slice(antesDaResolucao),
    teriaRompido,
    reacao !== null,
    valores !== null,
  );

  despachar(ctx, alvo, 'apos-resolver', resumo);

  if (resumo.ruptura && promessas.momentumNaRuptura > 0) {
    ganharRecurso(ctx, atacante, 'momentum', promessas.momentumNaRuptura);
  }

  momentumPorRemoverGuarda(ctx, alvo, resumo);
  momentumPorAnularDano(ctx, alvo, resumo);
  registrarPegadaDoTurno(ctx, alvo, resumo);
  atualizarTrilhaDoTurno(ctx, alvo, resumo);

  verificarRevelacoes(ctx, 'apos-resolver', alvo, resumo);

  // Agora, e só agora, a regra de vitória é aplicada — uma vez, pela mesma
  // função do motor que a define. Morte simultânea continua encerrando com
  // vencedor `null` e motivo `indefinido`, sem regra inventada.
  const fim = encerrarSeVidaZerou(ctx.partida);
  ctx.partida = fim.partida;
  ctx.eventos.push(...fim.eventos);

  return entregar(ctx);
};

/** Contadores que a próxima Ação do mesmo turno vai consultar. */
const atualizarTrilhaDoTurno = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  resumo: ResumoDaResolucao,
): void => {
  if (resumo.houveAtaque) {
    prometerAoProximoAtaque(ctx, alvo.atacante, alvo.perfil.carta, CHAVE.ataquesResolvidos, 1);
  }
  if (temTag(alvo.perfil, 'feitico')) {
    prometerAoProximoAtaque(ctx, alvo.atacante, alvo.perfil.carta, CHAVE.feiticosResolvidos, 1);
  }

  definirPromessa(
    ctx,
    alvo.atacante,
    alvo.perfil.carta,
    CHAVE.acaoAnteriorFoiAtaque,
    resumo.houveAtaque ? 1 : 0,
  );
  definirPromessa(
    ctx,
    alvo.atacante,
    alvo.perfil.carta,
    CHAVE.acaoAnteriorFoiAtaqueDe1Ap,
    resumo.houveAtaque && alvo.perfil.custo.valor === 1 ? 1 : 0,
  );
};

export { ORIGEM_MOMENTUM };
