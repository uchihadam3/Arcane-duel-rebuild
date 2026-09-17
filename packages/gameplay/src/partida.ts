import type {
  CardId,
  EscolhasDaAcao,
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  MatchId,
  ModoDeUso,
  PerfilDeHabilidade,
  PlayerId,
  Resultado,
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
  ativarCartaDeClasse,
  consumirUltimate,
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
import { CARD_DATA_VERSION, CATALOGO, perfilDaCarta } from '@arcane-duel/card-data';

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
  recusaDeLegalidade,
  verificarRevelacoes,
} from './pipeline.js';
import { efeitoDeCartaDeClasse } from './registro.js';
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
      readonly cartasDeClasse?: readonly UsoDeCartaDeClasse[];
    }
  | {
      readonly tipo: 'defesa-inata';
      readonly reforcarImpacto?: boolean;
      readonly cartasDeClasse?: readonly UsoDeCartaDeClasse[];
    }
  | { readonly tipo: 'sem-resposta' };

export type Resposta = Resultado<ResultadoDoComando, ErroDeDominio>;

const entregar = (ctx: Contexto): Resposta =>
  sucesso({ partida: ctx.partida, eventos: [...ctx.eventos] });

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

  conferir(build.personagem);
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
  const consulta: ConsultaDeCusto = {
    partida: ctx.partida,
    jogador: atual,
    adversario: adversarioDo(ctx, jogador),
    perfil: perfil.valor,
    ordem,
  };

  const recusa = recusaDeLegalidade(consulta, usos);
  if (recusa !== null) {
    return falha({ tipo: 'condicao-de-uso-nao-satisfeita', carta: pedido.carta, detalhe: recusa });
  }

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

  const atacante = adversarioDo(ctx, defensor);
  const slot = slotDe(atacante, indice);
  if (slot === undefined) return falha({ tipo: 'acao-nao-declarada', indice });
  const perfilDaAcao = slot.perfil;
  if (perfilDaAcao === null || slot.situacao !== 'declarada') {
    return falha({ tipo: 'acao-nao-declarada', indice });
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
    const usada = aplicarDefesaInata(ctx, alvo, pedido.reforcarImpacto === true);
    if (usada !== null) ctx.eventos.push({ tipo: 'defesa-inata-usada', jogador: defensor });

    despachar(ctx, alvo, 'ao-responder');
    verificarRevelacoes(ctx, 'ao-responder', alvo, null);
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

  const consulta: ConsultaDeCusto = {
    partida: ctx.partida,
    jogador: doDefensor,
    adversario: atacante,
    perfil: perfilDaAcao,
    ordem: indice + 1,
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

  const descontos = descontosDaDeclaracao({ ...consulta, perfil: perfil.valor }, usos);

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

  const antesDaResolucao = ctx.eventos.length;
  const erro = aplicar(ctx, resolverAcao(ctx.partida, atacante, indice));
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
