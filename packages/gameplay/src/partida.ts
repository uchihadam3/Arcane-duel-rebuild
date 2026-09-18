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
  TipoDeCarta,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';
import { falha, sucesso, temTag, valorDaAnotacao } from '@arcane-duel/shared-types';
import type { FormaDoDruida } from '@arcane-duel/shared-types';
import type {
  BuildEquipada,
  DescontosDeCusto,
  ErroDeDominio,
  EventoUniversal,
  ResultadoDoComando,
  SlotDaBuild,
} from '@arcane-duel/rules-engine';
import {
  COMPOSICAO_DA_BUILD,
  adiantarCartaNoCooldown,
  ativarCartaDeClasse,
  ativarPassiva,
  consumirUltimate,
  devolverCartaAMao,
  encerrarSeVidaZerou,
  expirarAnotacoesDaAcao,
  criarPartida,
  declararAcao,
  encerrarTurno,
  exaurirCartaDeClasse,
  iniciarPartida,
  iniciarTurno,
  preverRuptura,
  registrarResposta,
  resolverAcao,
} from '@arcane-duel/rules-engine';
import {
  CARD_DATA_VERSION,
  CATALOGO,
  PERSONAGEM_DA_CLASSE,
  ehPersonagem,
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
  registrarAnotacao,
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
import { efeitoDeCartaDeClasse, efeitoDePassiva, efeitoJogavel } from './registro.js';
import { descontoDaMarcha } from './efeitos/paladino.js';
import { acaoTrancadaPelaFumaca, descontoDoPrimeiroAtaque } from './efeitos/ladino.js';
import { descontoDoBardo } from './efeitos/bardo.js';
import { cobrarDisciplinaDoPasso, descontoDoMonge, disciplinaDoPasso } from './efeitos/monge.js';
import { descontoDoPatrulheiro } from './efeitos/patrulheiro.js';
import { descontoDoBarbaro } from './efeitos/barbaro.js';
import { podeUsarMetamorfoseGratuita, transformar } from './efeitos/druida.js';
import {
  mecanicasDeClasseAoAbrirTurno,
  mecanicasDeClasseAoDeclarar,
  descontoGuardado,
  mecanicasDeClasseAntesDeResolver,
  mecanicasDeClasseAoResolver,
  legalidadeDeClasse,
  mecanicasDeClasseAoFecharTurno,
  mecanicasDeClasseDepoisDaConversao,
  mecanicasDeClasseAposResolver,
} from './efeitos/mecanicas-classes.js';
import { anexarAlma, avancarDevocao, gastarChi } from './recursos-classe.js';
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
  escolhaExigidaPelaDefesaInata,
  motivoParaNaoUsarDefesaInata,
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

/** Os quatro slots da build, na ordem em que a composição os descreve (§3). */
const SLOTS_DA_BUILD: readonly SlotDaBuild[] = [
  'habilidades',
  'passivas',
  'cartas-de-classe',
  'ultimate',
];

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

/*
 * Validação da build.
 *
 * Esta é uma fronteira autoritativa: a build vai chegar do cliente ou de um
 * servidor, e nada garante que ela respeite os tipos do TypeScript quando
 * atravessa a rede. Por isso a conferência é de execução, não de compilação, e
 * cobre a composição inteira — quantidade por slot, tipo de cada carta, classe,
 * repetição e Personagem (FULL_GAME_SPEC.md §3).
 */

/** Os tipos de carta que cada slot da build aceita. */
const TIPOS_POR_SLOT: Readonly<Record<SlotDaBuild, readonly TipoDeCarta[]>> = {
  habilidades: ['ataque', 'tecnica', 'reacao'],
  passivas: ['passiva'],
  'cartas-de-classe': ['carta-de-classe'],
  ultimate: ['ultimate'],
};

/** Quantas cartas cada slot exige, exatamente. */
const QUANTIDADE_POR_SLOT: Readonly<Record<SlotDaBuild, number>> = {
  habilidades: COMPOSICAO_DA_BUILD.habilidades,
  passivas: COMPOSICAO_DA_BUILD.passivas,
  'cartas-de-classe': COMPOSICAO_DA_BUILD.cartasDeClasse,
  ultimate: COMPOSICAO_DA_BUILD.ultimates,
};

/**
 * Confere a build inteira e devolve todos os problemas encontrados.
 *
 * Devolve a lista completa em vez de parar no primeiro: quem montou a build
 * merece ver tudo o que está errado de uma vez.
 */
export const validarBuild = (build: BuildEquipada): readonly ErroDeDominio[] => {
  const problemas: ErroDeDominio[] = [];

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

  const porSlot: Readonly<Record<SlotDaBuild, readonly CardId[]>> = {
    habilidades: build.habilidades,
    passivas: build.passivas,
    'cartas-de-classe': build.cartasDeClasse,
    ultimate: [build.ultimate],
  };

  const vistas = new Set<CardId>();

  for (const slot of SLOTS_DA_BUILD) {
    const cartas = porSlot[slot];

    if (cartas.length !== QUANTIDADE_POR_SLOT[slot]) {
      problemas.push({
        tipo: 'composicao-invalida',
        slot,
        esperado: QUANTIDADE_POR_SLOT[slot],
        recebido: cartas.length,
      });
    }

    for (const carta of cartas) {
      if (vistas.has(carta)) {
        problemas.push({ tipo: 'carta-repetida-na-build', carta });
        continue;
      }
      vistas.add(carta);

      // O Personagem técnico não é jogável: ele não ocupa slot nenhum.
      if (ehPersonagem(carta)) {
        problemas.push({ tipo: 'personagem-em-slot-jogavel', carta, slot });
        continue;
      }

      const definicao = CATALOGO.porId(carta);
      if (definicao === undefined) {
        problemas.push({ tipo: 'carta-desconhecida', carta });
        continue;
      }
      if (definicao.classe !== build.classe) {
        problemas.push({ tipo: 'carta-de-outra-classe', carta, classe: build.classe });
        continue;
      }
      if (!TIPOS_POR_SLOT[slot].includes(definicao.tipo)) {
        problemas.push({
          tipo: 'tipo-invalido-no-slot',
          carta,
          slot,
          recebido: definicao.tipo,
        });
      }
    }
  }

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
  const reservaAntes = jogadorDo(ctx, jogador).reserva;
  const erro = aplicar(ctx, iniciarTurno(ctx.partida, jogador));
  if (erro !== null) return falha(erro);

  reporManaNoInicioDoTurno(ctx, jogador);
  const voltaram = ctx.eventos.reduce(
    (total, evento) =>
      evento.tipo === 'cooldown-avancado' && evento.jogador === jogador
        ? total + evento.paraAMao.length
        : total,
    0,
  );
  mecanicasDeClasseAoAbrirTurno(ctx, jogador, voltaram, reservaAntes);
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
  mecanicasDeClasseAoFecharTurno(ctx, jogador);
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

  // "Vigília: se terminar com 2 de Reserva, avance 1 estágio de Devoção."
  const devocaoPrometida = lerPromessa(ctx, jogador, CHAVE.devocaoSeTerminarComReserva2);
  if (devocaoPrometida > 0 && jogadorDo(ctx, jogador).reserva === 2) {
    avancarDevocao(ctx, jogador, devocaoPrometida);
  }

  mecanicasDeClasseDepoisDaConversao(ctx, jogador);

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
  escolhas: EscolhasDaAcao = {},
): DescontosDeCusto => {
  const encarecida =
    valorDaAnotacao(jogador.anotacoes, `${CHAVE.ecoEncarece}:${perfil.carta}`) > 0 ||
    valorDaAnotacao(jogador.anotacoes, `${CHAVE.relicarioEncarece}:${perfil.carta}`) > 0 ||
    valorDaAnotacao(jogador.anotacoes, `${CHAVE.ritoEncarece}:${perfil.carta}`) > 0;
  const prismatica =
    ordem === 3 &&
    temTag(perfil, 'feitico') &&
    valorDaAnotacao(jogador.anotacoes, CHAVE.prismaticaDesconto) > 0;

  // "Marcha Implacável: seu próximo Ataque de custo impresso 2 AP ou mais custa
  // 1 AP a menos, mínimo 1."
  const marcha = perfil.valores !== null && descontoDaMarcha(jogador, perfil.custo.valor);

  // "Passos Invisíveis: no início do seu próximo turno, seu primeiro Ataque
  // custa 1 AP a menos, mínimo 1."
  const passos = perfil.valores !== null && descontoDoPrimeiroAtaque(jogador, ordem);

  // O Bardo guarda descontos para "a próxima Ação", com ou sem Ataque.
  const bardo = descontoDoBardo(jogador, perfil);

  // O Monge guarda descontos por etapa de Kata.
  const monge = descontoDoMonge(jogador, perfil, escolhas);

  // O Patrulheiro guarda desconto para o Ataque emboscado e para o primeiro
  // Ataque depois de um turno inteiro de Marca mantida.
  const patrulheiro = descontoDoPatrulheiro(jogador, perfil);

  // Descontos guardados para "a próxima Ação", sem dono de classe.
  const guardado = descontoGuardado(jogador, ordem);

  // Bárbaro: o Frenesi sem Freio barateia os dois Ataques seguintes.
  const barbaro = descontoDoBarbaro(jogador, perfil);

  return {
    ...(encarecida ? { apAdicional: 1 } : {}),
    ...(prismatica || marcha || passos || bardo || monge || patrulheiro || guardado || barbaro
      ? { ap: 1, apMinimo: 1 }
      : {}),
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
    acaoRespondida: null,
  };

  const recusa = legalidadeDeClasse(consulta) ?? recusaDeLegalidade(consulta, usos);
  if (recusa !== null) {
    return falha({ tipo: 'condicao-de-uso-nao-satisfeita', carta: pedido.carta, detalhe: recusa });
  }

  const escolhaFaltando = recusaDeEscolhas(consulta, usos);
  if (escolhaFaltando !== null) return falha(escolhaFaltando);

  const doEstado = descontosDoEstado(atual, perfil.valor, ordem, escolhas);
  const somados = somar(descontosDaDeclaracao(consulta, usos), doEstado);

  // "Disciplina do Passo": o Monge gasta 1 Chi para ignorar 1 ponto de aumento
  // de custo. Ela é lida depois de o aumento estar somado, e só quando ele
  // existe de verdade.
  const ignorado = disciplinaDoPasso(consulta, somados.apAdicional ?? 0);
  const descontos =
    ignorado === 0 ? somados : { ...somados, apAdicional: (somados.apAdicional ?? 0) - ignorado };

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
  if (ignorado > 0) {
    gastarChi(ctx, jogador, ignorado);
    cobrarDisciplinaDoPasso(ctx, jogador, true);
  }
  mecanicasDeClasseAoDeclarar(ctx, jogador, perfil.valor, ordem);
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
    // Cada classe cobra um preço diferente pela Defesa Inata — Mana, Alma,
    // Chi, Guarda, Vida, ou um estado exigido. Uma Defesa impagável não é
    // "já usada": é recusada com o motivo impresso dela.
    const impedimento = motivoParaNaoUsarDefesaInata(ctx, defensor);
    if (impedimento !== null) return falha(impedimento);

    const usosDaDefesa = pedido.cartasDeClasse ?? [];
    const problemaDaDefesa = conferirCartasDeClasse(doDefensor, usosDaDefesa);
    if (problemaDaDefesa !== null) return falha(problemaDaDefesa);

    // Duas Defesas Inatas oferecem escolha — "1 D **ou** 1 I" do Guerreiro e
    // "2 D **ou** 2 I" do Druida Selvagem. O "ou" é do jogador, e o motor não
    // decide por ele; as outras dez reduzem o que está impresso e não perguntam.
    const faltaEscolha = escolhaExigidaPelaDefesaInata(ctx, defensor, pedido.reducao);
    if (faltaEscolha !== null) return falha(faltaEscolha);

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
      acaoRespondida: perfilDaAcao,
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
    acaoRespondida: perfilDaAcao,
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

  const consultaDaReacao: ConsultaDeCusto = {
    ...consulta,
    perfil: perfil.valor,
    acaoRespondida: perfilDaAcao,
  };
  // As Cartas de Classe usadas na Resposta opinam sobre a **Reação**, não
  // sobre a Ação que ela enfrenta: é o perfil dela que elas leem.
  const recusaDaReacao = recusaDeLegalidade(consultaDaReacao, usos);
  // A condição impressa na própria carta de Reação — "Requer Graça ou mais",
  // "só pode ser usada com 10 de Vida ou menos" — é avaliada com o perfil dela,
  // não com o da Ação que ela enfrenta.
  const recusaDaCarta = efeitoJogavel(pedido.carta).legalidade?.(consultaDaReacao) ?? null;
  const recusa = recusaDaCarta ?? recusaDaReacao;
  if (recusa !== null) {
    return falha({ tipo: 'condicao-de-uso-nao-satisfeita', carta: pedido.carta, detalhe: recusa });
  }

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

  // "Bomba de Fumaça: efeitos de Cartas de Classe inimigas não podem aumentar
  // esta ação depois que ela resolver." Quem responde é o dono da Ação, e a
  // trava vale para o outro lado.
  if (jogador === atacante.id && acaoTrancadaPelaFumaca(atacante)) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta: uso.carta,
      detalhe: 'a Bomba de Fumaça trancou as Cartas de Classe nesta ação',
    });
  }

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
/**
 * Necromante: põe uma Alma controlada sobre um Servo.
 *
 * "No início do próprio turno, antes de receber AP, o Necromante **pode**
 * colocar 1 Alma controlada sobre um Servo que ainda não possua Alma." É
 * decisão dele e de mais ninguém, então existe um comando só para ela — e a
 * janela é estreita de propósito: uma vez por turno, antes da primeira Ação.
 */
export const anexarAlmaNoServo = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  servo: CardId,
): Resposta => {
  const ctx = criarContexto(partida);
  const dono = ctx.partida.jogadores.find((item) => item.id === jogador);
  if (dono === undefined) return falha({ tipo: 'jogador-desconhecido', jogador });
  if (ctx.partida.turno?.jogadorAtivo !== jogador) return falha({ tipo: 'fora-do-turno', jogador });
  if (dono.acoesRealizadasNoTurno > 0) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta: servo,
      detalhe: 'a Alma só é anexada antes da primeira Ação do turno',
    });
  }
  if (valorDaAnotacao(dono.anotacoes, CHAVE.almaAnexadaNoTurno) > 0) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta: servo,
      detalhe: 'você já anexou uma Alma neste turno',
    });
  }
  if (!dono.cartasDeClasse.some((item) => item.carta === servo)) {
    return falha({ tipo: 'carta-de-classe-desconhecida', carta: servo });
  }

  if (!anexarAlma(ctx, jogador, servo)) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta: servo,
      detalhe: 'não há Alma controlada livre, ou este Servo já tem uma',
    });
  }
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.almaAnexadaNoTurno,
    origem: servo,
    escopo: 'turno',
    valor: 1,
  });
  return entregar(ctx);
};

/**
 * Druida: a Metamorfose gratuita do início do próprio turno.
 *
 * "No início do próprio turno, antes da primeira Ação, **pode** usar
 * Metamorfose gratuitamente." É decisão dele, uma vez por turno, e a janela é
 * estreita de propósito.
 */
export const usarMetamorfose = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  forma: FormaDoDruida,
): Resposta => {
  const ctx = criarContexto(partida);
  const dono = ctx.partida.jogadores.find((item) => item.id === jogador);
  if (dono === undefined) return falha({ tipo: 'jogador-desconhecido', jogador });
  if (ctx.partida.turno?.jogadorAtivo !== jogador) return falha({ tipo: 'fora-do-turno', jogador });

  if (!podeUsarMetamorfoseGratuita(dono)) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta: dono.personagem,
      detalhe: 'a Metamorfose gratuita vale uma vez, antes da primeira Ação do turno',
    });
  }
  if (!transformar(ctx, jogador, forma, true, dono.personagem)) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta: dono.personagem,
      detalhe: 'você já está nessa Forma, ou a Forma Selvagem está trancada',
    });
  }
  return entregar(ctx);
};

export const ativarPassivaNaAcao = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  indice: IndiceDeAcao,
  carta: CardId,
  escolhas: EscolhasDaAcao = {},
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

  if (!ativacao.podeAtivar(ctx, alvo, escolhas)) {
    return falha({
      tipo: 'condicao-de-uso-nao-satisfeita',
      carta,
      detalhe: 'as condições impressas para Ativar não estão satisfeitas agora',
    });
  }

  ativacao.aplicar(ctx, alvo, escolhas);
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
  if (pendente.efeito === 'prontificar-carta-de-classe') {
    const equipada = dono.cartasDeClasse.find((item) => item.carta === carta);
    if (equipada?.estado === 'ativada') {
      gravarJogador(ctx, {
        ...dono,
        cartasDeClasse: dono.cartasDeClasse.map((item) =>
          item.carta === carta ? { ...item, estado: 'pronta' as const } : item,
        ),
      });
      ctx.eventos.push({
        tipo: 'carta-de-classe-prontificada-por-efeito',
        jogador,
        carta,
        origem: pendente.origem,
      });
    }
    return encerrarPendencia(ctx, pendente, jogador, carta);
  }

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
  mecanicasDeClasseAntesDeResolver(ctx, alvo);
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

  mecanicasDeClasseAoResolver(ctx, alvo);
  despachar(ctx, alvo, 'apos-resolver', resumo);

  if (resumo.ruptura && promessas.momentumNaRuptura > 0) {
    ganharRecurso(ctx, atacante, 'momentum', promessas.momentumNaRuptura);
  }

  momentumPorRemoverGuarda(ctx, alvo, resumo);
  momentumPorAnularDano(ctx, alvo, resumo);
  mecanicasDeClasseAposResolver(ctx, alvo, resumo);
  registrarPegadaDoTurno(ctx, alvo, resumo);
  atualizarTrilhaDoTurno(ctx, alvo, resumo);

  verificarRevelacoes(ctx, 'apos-resolver', alvo, resumo);

  // Só agora a Ação acabou de verdade: as anotações de escopo de Ação saem
  // depois que todo o texto pós-resolução dela já rodou.
  ctx.partida = expirarAnotacoesDaAcao(ctx.partida);

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
