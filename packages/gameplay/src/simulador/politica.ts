import type {
  CardId,
  EscolhaPendente,
  EscolhasDaAcao,
  IndiceDeAcao,
  Nota,
  PlayerId,
  ReforcoEscolhido,
  VisaoDaPartida,
  VisaoDeJogador,
} from '@arcane-duel/shared-types';
import type { Aleatorio } from '@arcane-duel/rules-engine';
import { valorDaAnotacao } from '@arcane-duel/shared-types';
import { CATALOGO } from '@arcane-duel/card-data';
import type { DefinicaoDeCarta } from '@arcane-duel/card-data';

import { CHAVE } from '../chaves.js';

import type { PedidoDeAcao, PedidoDeResposta } from '../partida.js';

/*
 * A política de base do simulador.
 *
 * Ela decide olhando **apenas** a visão do próprio jogador — a mesma projeção
 * que um cliente receberia. A mão do adversário não está lá, e por isso não há
 * como a política trapacear: ela não tem acesso ao estado canônico.
 *
 * O que ela conhece do catálogo é informação pública: o que está impresso nas
 * cartas é conhecido por todo mundo antes da partida começar.
 *
 * O RNG entra só para desempatar opções de mesma pontuação. Combate não tem
 * aleatoriedade nenhuma.
 */

/**
 * Uma jogada legal, já com as escolhas que o motor vai exigir.
 *
 * É o que separa "o que é possível" de "o que é bom". A enumeração abaixo
 * responde a primeira pergunta lendo só a projeção do jogador; quem responde a
 * segunda é quem pontua — a política de base, a IA do vertical slice, ou
 * qualquer outra. Ter uma fonte só de legalidade é o que impede uma IA nova de
 * propor comando ilegal por ter esquecido uma condição impressa.
 */
export interface AcaoCandidata {
  readonly pedido: PedidoDeAcao;
  readonly definicao: DefinicaoDeCarta;
  /** Verdadeiro quando a carta veio do slot de Ultimate, e não da mão. */
  readonly ehUltimate: boolean;
}

/** Uma Resposta legal, com o que se sabe publicamente sobre o que ela apara. */
export interface RespostaCandidata {
  readonly pedido: PedidoDeResposta;
  readonly definicao: DefinicaoDeCarta;
  /** O quanto o texto impresso desta Reação reduz. */
  readonly reducao: { readonly dano: number; readonly impacto: number };
}

/** O que se sabe da Ação que está para resolver contra quem vai responder. */
export interface AmeacaNaMesa {
  readonly dano: number;
  readonly impacto: number;
  readonly ehTecnica: boolean;
  /** O Impacto derruba a Guarda de quem responde? */
  readonly causaRuptura: boolean;
}

export interface Politica {
  readonly nome: string;
  readonly escolherAcao: (
    visao: VisaoDaPartida,
    eu: PlayerId,
    rng: Aleatorio,
  ) => PedidoDeAcao | null;
  readonly escolherResposta: (
    visao: VisaoDaPartida,
    eu: PlayerId,
    indice: IndiceDeAcao,
    rng: Aleatorio,
  ) => PedidoDeResposta;
  /** Responde uma escolha que ficou pendente, entre as opções legais dela. */
  readonly escolherPendencia: (
    visao: VisaoDaPartida,
    eu: PlayerId,
    pendente: EscolhaPendente,
    rng: Aleatorio,
  ) => CardId | undefined;
}

const meuEstado = (visao: VisaoDaPartida, eu: PlayerId): VisaoDeJogador | undefined =>
  visao.jogadores.find((jogador) => jogador.id === eu);

const oAdversario = (visao: VisaoDaPartida, eu: PlayerId): VisaoDeJogador | undefined =>
  visao.jogadores.find((jogador) => jogador.id !== eu);

const minhasCartas = (jogador: VisaoDeJogador): readonly CardId[] =>
  jogador.mao.flatMap((carta) => (carta.visivel ? [carta.carta] : []));

/**
 * Quanto do recurso de classe este jogador tem agora.
 *
 * As classes sem moeda — as que têm estado, sequência ou marcador em vez de
 * ficha — devolvem zero: nenhuma carta delas cobra recurso, e as condições que
 * o estado delas impõe são conferidas por `CONDICOES_IMPRESSAS`.
 */
const recursoDisponivel = (jogador: VisaoDeJogador): number => {
  const recurso = jogador.recurso;
  switch (recurso.classe) {
    case 'guerreiro':
      return recurso.momentum;
    case 'mago':
      return recurso.mana;
    case 'necromante':
      return recurso.almasControladas;
    case 'ladino':
      return recurso.brechasNoAdversario;
    case 'monge':
      return recurso.chi.filter((pedra) => pedra === 'pronta').length;
    default:
      return 0;
  }
};

const DEVOCAO: readonly string[] = ['vigilia', 'graca', 'fervor', 'milagre'];

/** O Clérigo está em Graça ou acima? */
const emGraca = (jogador: VisaoDeJogador): boolean =>
  jogador.recurso.classe === 'clerigo' && DEVOCAO.indexOf(jogador.recurso.devocao) >= 1;

const emMilagre = (jogador: VisaoDeJogador): boolean =>
  jogador.recurso.classe === 'clerigo' && jogador.recurso.devocao === 'milagre';

/** O Paladino está Resoluto ou Inabalável? */
const resoluto = (jogador: VisaoDeJogador): boolean =>
  jogador.recurso.classe === 'paladino' && jogador.recurso.juramento !== 'vacilante';

const marcado = (jogador: VisaoDeJogador): boolean =>
  jogador.recurso.classe === 'patrulheiro' && jogador.recurso.marcaDaPresa;

/** O jogador consegue pagar o custo impresso desta carta agora? */
const cabeNoOrcamento = (
  definicao: DefinicaoDeCarta,
  jogador: VisaoDeJogador,
  lento: number,
): boolean => {
  const custo = definicao.custo;
  if (custo === undefined) return false;

  // A parcela fixa e a parcela variável cobram do mesmo recurso, e o mínimo
  // impresso da variável é obrigatório.
  const recurso = (custo.recurso?.quantidade ?? 0) + (custo.variavel?.minimo ?? 0);
  if (recurso > recursoDisponivel(jogador)) return false;

  if (custo.moeda === 'reserva') return jogador.reserva >= custo.valor;

  const adicional = lento > 0 ? 1 : 0;
  const disponivel = jogador.pontosDeAcao + (jogador.impulsoInicial ? 1 : 0);
  return disponivel >= custo.valor + adicional;
};

/**
 * Pontuação de uma Ação candidata.
 *
 * Deliberadamente simples: Impacto vale mais quando a Guarda inimiga ainda
 * segura o Ataque, e Dano vale mais quando ela já caiu. É uma linha de base
 * para medir o jogo, não uma tentativa de jogar bem.
 */
const pontuarAcao = (definicao: DefinicaoDeCarta, adversario: VisaoDeJogador): number => {
  if (definicao.tipo === 'tecnica') return 3;
  const valores = definicao.valores;
  if (valores === undefined) return 0;

  const guardaEmPe = adversario.guarda > 0;
  const pesoDeImpacto = guardaEmPe ? 2 : 0;
  const quebraAGuarda = guardaEmPe && valores.impacto >= adversario.guarda ? 4 : 0;
  const bonusDeUltimate = definicao.tipo === 'ultimate' ? 6 : 0;

  return valores.dano * 3 + valores.impacto * pesoDeImpacto + quebraAGuarda + bonusDeUltimate;
};

/*
 * Restrições impressas que a política confere sozinha.
 *
 * Tudo aqui é informação pública — o que está escrito na carta e o que está
 * visível na mesa. A tabela cobre as cartas das doze Receitas 1 que impõem
 * condição de uso: sem ela, a política proporia comandos que o motor recusaria,
 * e um comando ilegal invalida o lote inteiro.
 */
const CONDICOES_IMPRESSAS: Readonly<
  Record<string, (eu: VisaoDeJogador, adversario: VisaoDeJogador) => boolean>
> = {
  // "Só pode ser usado se o inimigo estiver com Guarda 0."
  W10: (_eu, adversario) => adversario.guarda === 0,
  L06: (_eu, adversario) => adversario.guarda === 0,
  // "Requer Graça ou mais."
  C03: emGraca,
  C04: emGraca,
  C11: emGraca,
  C13: emGraca,
  C14: emGraca,
  C15: emGraca,
  // "Requer Milagre e consome Milagre."
  CU01: emMilagre,
  // "Requer Resoluto ou Inabalável."
  P16: resoluto,
  P19: resoluto,
  // "Só contra alvo Marcado."
  RU01: marcado,
};

/** A carta respeita as condições impressas que a política sabe conferir? */
const respeitaOTexto = (
  definicao: DefinicaoDeCarta,
  jogador: VisaoDeJogador,
  adversario: VisaoDeJogador,
): boolean => CONDICOES_IMPRESSAS[definicao.id]?.(jogador, adversario) ?? true;

/*
 * Cartas cuja condição impressa a política não sabe satisfazer.
 *
 * A Última Canção exige "a terceira Ação com as 2 anteriores de Notas
 * diferentes", e o Último Bastião do Paladino é uma Reação-Ultimate. Em vez de
 * arriscar um comando ilegal, a política simplesmente não as joga — e o
 * relatório diz que elas ficaram de fora.
 */
const FORA_DO_ALCANCE: readonly string[] = ['BU01'];

const desempatar = <T>(opcoes: readonly T[], rng: Aleatorio): T | undefined => {
  if (opcoes.length <= 1) return opcoes[0];
  return opcoes[rng.inteiro(opcoes.length)];
};

/** Quanto uma carta de Reação reduz, pelo texto impresso dela. */
const REDUCAO_DE_REACAO: Readonly<
  Record<string, { readonly dano: number; readonly impacto: number }>
> = {
  W15: { dano: 3, impacto: 0 },
  W16: { dano: 0, impacto: 3 },
  W17: { dano: 2, impacto: 2 },
  W18: { dano: 2, impacto: 0 },
  W19: { dano: 1, impacto: 2 },
  W20: { dano: 1, impacto: 3 },
  M15: { dano: 3, impacto: 0 },
  M16: { dano: 99, impacto: 0 },
  M17: { dano: 0, impacto: 3 },
  M18: { dano: 2, impacto: 1 },
  M19: { dano: 0, impacto: 0 },
  M20: { dano: 2, impacto: 2 },
  C14: { dano: 2, impacto: 2 },
  C15: { dano: 0, impacto: 3 },
  N16: { dano: 0, impacto: 3 },
  N17: { dano: 3, impacto: 0 },
  P15: { dano: 0, impacto: 3 },
  P16: { dano: 2, impacto: 2 },
  P18: { dano: 0, impacto: 4 },
  P19: { dano: 2, impacto: 1 },
  L15: { dano: 3, impacto: 0 },
  L17: { dano: 2, impacto: 3 },
  B16: { dano: 2, impacto: 1 },
  B17: { dano: 0, impacto: 3 },
  MO16: { dano: 2, impacto: 2 },
  MO17: { dano: 3, impacto: 0 },
  R16: { dano: 3, impacto: 0 },
  R17: { dano: 1, impacto: 2 },
  BA16: { dano: 3, impacto: 0 },
  BA17: { dano: 0, impacto: 3 },
  D16: { dano: 2, impacto: 2 },
  D17: { dano: 3, impacto: 0 },
  BR16: { dano: 3, impacto: 0 },
  BR17: { dano: 0, impacto: 3 },
};

/*
 * Reações que só valem contra uma ameaça específica.
 *
 * "Só contra um Ataque que causaria Ruptura" é condição impressa: oferecer a
 * carta fora dela seria comando ilegal.
 */
const REACOES_SO_CONTRA_RUPTURA: readonly string[] = ['W20', 'P18'];

/**
 * Todas as Ações que o motor aceitaria deste jogador agora.
 *
 * Lê **apenas** a projeção — a mesma que um cliente receberia — e o catálogo,
 * que é público. Não há caminho por onde esta função conheça a mão do
 * adversário, uma Passiva ainda oculta ou o estado canônico.
 *
 * A Ultimate entra na lista quando está disponível, porque ela é uma Ação como
 * as outras do ponto de vista do comando.
 */
export const acoesLegais = (visao: VisaoDaPartida, eu: PlayerId): readonly AcaoCandidata[] => {
  const jogador = meuEstado(visao, eu);
  const adversario = oAdversario(visao, eu);
  if (jogador === undefined || adversario === undefined) return [];

  const candidatas: AcaoCandidata[] = [];

  const considerar = (carta: CardId, ehUltimate: boolean): void => {
    const definicao = CATALOGO.porId(carta);
    if (definicao === undefined) return;
    if (
      definicao.tipo !== 'ataque' &&
      definicao.tipo !== 'tecnica' &&
      definicao.tipo !== 'ultimate'
    ) {
      return;
    }
    if (definicao.comportaComo === 'reacao') return;
    if (!cabeNoOrcamento(definicao, jogador, jogador.condicoes.lento)) return;
    if (FORA_DO_ALCANCE.includes(definicao.id)) return;
    if (!respeitaOTexto(definicao, jogador, adversario)) return;

    const escolhas = escolhasParaAcao(definicao, jogador);
    if (escolhas === null) return;
    candidatas.push({
      pedido: Object.keys(escolhas).length === 0 ? { carta } : { carta, escolhas },
      definicao,
      ehUltimate,
    });
  };

  for (const carta of minhasCartas(jogador)) considerar(carta, false);
  if (jogador.ultimate.estado === 'disponivel') considerar(jogador.ultimate.carta, true);

  return candidatas;
};

/**
 * O que a Ação declarada ameaça contra quem vai responder.
 *
 * Tudo aqui é público: o perfil de uma Ação declarada está na projeção dos dois
 * lados, e a Guarda de quem responde também. `null` quando não há Ação nenhuma
 * naquele espaço.
 */
export const ameacaDaAcao = (
  visao: VisaoDaPartida,
  eu: PlayerId,
  indice: IndiceDeAcao,
): AmeacaNaMesa | null => {
  const jogador = meuEstado(visao, eu);
  const atacante = oAdversario(visao, eu);
  if (jogador === undefined || atacante === undefined) return null;

  const perfil = atacante.acoes.find((atual) => atual.indice === indice)?.perfil ?? null;
  if (perfil === null) return null;

  const valores = perfil.valores;
  return {
    dano: valores?.dano ?? 0,
    impacto: valores?.impacto ?? 0,
    ehTecnica: perfil.tipo === 'tecnica',
    causaRuptura: valores !== null && jogador.guarda > 0 && valores.impacto >= jogador.guarda,
  };
};

/**
 * Todas as Reações que o motor aceitaria contra esta ameaça.
 *
 * A Defesa Inata **não** entra aqui: ela não é carta, tem regra própria de uma
 * vez por turno inimigo, e quem decide usá-la precisa consultar
 * `defesaInataDisponivel`.
 */
export const respostasLegais = (
  visao: VisaoDaPartida,
  eu: PlayerId,
  ameaca: AmeacaNaMesa,
): readonly RespostaCandidata[] => {
  const jogador = meuEstado(visao, eu);
  const adversario = oAdversario(visao, eu);
  if (jogador === undefined || adversario === undefined) return [];

  const candidatas: RespostaCandidata[] = [];
  for (const carta of minhasCartas(jogador)) {
    const definicao = CATALOGO.porId(carta);
    if (definicao?.tipo !== 'reacao') continue;
    if (!cabeNoOrcamento(definicao, jogador, 0)) continue;
    // Contrafeitiço só responde a Técnica; Último Bastião só a um Ataque que
    // causaria Ruptura. As duas restrições estão impressas e são públicas.
    if (carta === ('M19' as CardId) && !ameaca.ehTecnica) continue;
    if (REACOES_SO_CONTRA_RUPTURA.includes(carta) && !ameaca.causaRuptura) continue;
    if (ameaca.ehTecnica && carta !== ('M19' as CardId)) continue;
    if (!respeitaOTexto(definicao, jogador, adversario)) continue;

    candidatas.push({
      pedido: { tipo: 'carta-de-reacao', carta, escolhas: escolhasParaResposta(jogador) },
      definicao,
      reducao: REDUCAO_DE_REACAO[carta] ?? { dano: 0, impacto: 0 },
    });
  }
  return candidatas;
};

/** A Defesa Inata está disponível e pagável agora? Só projeção decide. */
export const defesaInataDisponivel = (visao: VisaoDaPartida, eu: PlayerId): boolean => {
  const jogador = meuEstado(visao, eu);
  if (jogador === undefined) return false;
  if (valorDaAnotacao(jogador.anotacoes, CHAVE.defesaInataUsada) > 0) return false;
  return defesaInataPagavel(jogador);
};

/** As escolhas que uma Resposta precisa carregar, para quem monta o comando. */
export const escolhasDaResposta = (visao: VisaoDaPartida, eu: PlayerId): EscolhasDaAcao => {
  const jogador = meuEstado(visao, eu);
  return jogador === undefined ? { reforco: 'dano' } : escolhasParaResposta(jogador);
};

/**
 * Cria a política de base.
 *
 * `exploracao` é a fração de decisões em que a política escolhe uniformemente
 * entre as opções legais em vez da melhor pontuada. O padrão é **zero**: com
 * zero, o PRNG é usado só para desempatar, exatamente como pedido, e o lote
 * inteiro é uma repetição das poucas linhas de jogo que a política sabe seguir.
 * Um valor acima de zero serve para medir distribuição e precisa ser pedido
 * explicitamente — ele não faz parte da linha de base.
 */
export const criarPoliticaDeBase = (exploracao = 0): Politica => ({
  nome: exploracao === 0 ? 'base' : `base+exploracao-${exploracao.toFixed(2)}`,

  escolherAcao: (visao, eu, rng) => {
    const adversario = oAdversario(visao, eu);
    if (adversario === undefined) return null;

    const candidatas = acoesLegais(visao, eu).map((item) => ({
      pedido: item.pedido,
      nota: pontuarAcao(item.definicao, adversario),
    }));

    if (candidatas.length === 0) return null;

    if (exploracao > 0 && rng.proximo() < exploracao) {
      return desempatar(candidatas, rng)?.pedido ?? null;
    }

    const melhorNota = Math.max(...candidatas.map((item) => item.nota));
    const empatadas = candidatas.filter((item) => item.nota === melhorNota);
    return desempatar(empatadas, rng)?.pedido ?? null;
  },

  escolherResposta: (visao, eu, indice, rng) => {
    const jogador = meuEstado(visao, eu);
    if (jogador === undefined) return { tipo: 'sem-resposta' };

    const ameaca = ameacaDaAcao(visao, eu, indice);
    if (ameaca === null) return { tipo: 'sem-resposta' };

    const ehTecnica = ameaca.ehTecnica;
    const ameacaDeRuptura = ameaca.causaRuptura;
    const ameacaDeDano = ameaca.dano >= 3;
    if (!ameacaDeRuptura && !ameacaDeDano && !ehTecnica) return { tipo: 'sem-resposta' };

    const candidatas: { readonly pedido: PedidoDeResposta; readonly nota: number }[] = [];

    for (const item of respostasLegais(visao, eu, ameaca)) {
      const util = ehTecnica
        ? 5
        : Math.min(item.reducao.dano, ameaca.dano) * 2 +
          (ameacaDeRuptura ? Math.min(item.reducao.impacto, ameaca.impacto) * 3 : 0);
      if (util <= 0) continue;
      candidatas.push({ pedido: item.pedido, nota: util });
    }

    if (candidatas.length > 0) {
      if (exploracao > 0 && rng.proximo() < exploracao) {
        const qualquer = desempatar(candidatas, rng);
        if (qualquer !== undefined) return qualquer.pedido;
      }
      const melhor = Math.max(...candidatas.map((item) => item.nota));
      const empatadas = candidatas.filter((item) => item.nota === melhor);
      const escolhida = desempatar(empatadas, rng);
      if (escolhida !== undefined) return escolhida.pedido;
    }

    if (ehTecnica) return { tipo: 'sem-resposta' };

    // Sem carta que compense, resta a Defesa Inata da classe. Ela vale uma vez
    // por turno inimigo, e isso está visível na própria projeção: oferecer de
    // novo seria um comando ilegal.
    if (!defesaInataDisponivel(visao, eu)) return { tipo: 'sem-resposta' };

    // A Guarda Marcial reduz 1 D **ou** 1 I, e a escolha é do jogador: a
    // política a manda explicitamente, como um cliente faria.
    return {
      tipo: 'defesa-inata',
      reducao: ameacaDeRuptura ? 'impacto' : 'dano',
      escolhas: escolhasParaResposta(jogador),
    };
  },

  escolherPendencia: (_visao, _eu, pendente, rng) => desempatar(pendente.opcoes, rng),
});

/**
 * A Defesa Inata desta classe pode ser paga agora?
 *
 * Cada uma cobra o que está impresso: Mana, Alma, Chi, Guarda, Vida, Devoção —
 * ou preço nenhum. Oferecê-la sem poder pagar seria comando ilegal.
 */
const defesaInataPagavel = (jogador: VisaoDeJogador): boolean => {
  const recurso = jogador.recurso;
  switch (recurso.classe) {
    case 'mago':
      return recurso.mana >= 1;
    case 'clerigo':
      return emGraca(jogador);
    case 'necromante':
      return recurso.almasControladas >= 1;
    case 'monge':
      return recurso.chi.some((pedra) => pedra === 'pronta');
    case 'barbaro':
      return jogador.guarda >= 1;
    case 'bruxo':
      return jogador.vida > 1;
    default:
      return true;
  }
};

/** A linha de base oficial: PRNG só para desempate. */
export const POLITICA_DE_BASE: Politica = criarPoliticaDeBase(0);

/*
 * As escolhas que cada carta pede.
 *
 * A política decide como um jogador decidiria: ela lê o que está impresso — que
 * é informação pública — e manda a escolha junto com o comando. O motor não
 * escolhe por ela, e uma carta cuja escolha ela não sabe tomar simplesmente não
 * entra entre as candidatas.
 */

const RUNAS_DO_MAGO: readonly string[] = ['MC01', 'MC02', 'MC03', 'MC04', 'MC05', 'MC06'];

/** Cartas que imprimem "colha até N Almas", com o N impresso. */
const ALMAS_COLHIDAS: Readonly<Record<string, number>> = {
  N09: 2,
  N10: 2,
  NU03: 3,
};

const NOTAS: readonly Nota[] = ['pulso', 'melodia', 'harmonia'];

/** A primeira Nota diferente da última tocada neste turno. */
const notaQueMudaACadencia = (jogador: VisaoDeJogador): Nota => {
  const sequencia = jogador.recurso.classe === 'bardo' ? jogador.recurso.sequenciaDeNotas : [];
  const ultima = sequencia[sequencia.length - 1];
  return NOTAS.find((nota) => nota !== ultima) ?? 'pulso';
};

const runasAtivadasNaVisao = (jogador: VisaoDeJogador): readonly CardId[] =>
  jogador.cartasDeClasse
    .filter((item) => item.estado === 'ativada' && RUNAS_DO_MAGO.includes(item.carta))
    .map((item) => item.carta);

/**
 * Devolve as escolhas da Ação, ou `null` quando a política prefere não jogar a
 * carta por não ter opção legal para oferecer.
 */
const escolhasParaAcao = (
  definicao: DefinicaoDeCarta,
  jogador: VisaoDeJogador,
): EscolhasDaAcao | null => {
  const escolhas: {
    recursoAdicional?: number;
    reforco?: ReforcoEscolhido;
    cartaDeClasse?: CardId;
    cartaEmCooldown?: CardId;
    cartasEmCooldown?: readonly CardId[];
    almasColhidas?: number;
    nota?: Nota;
  } = {};

  // "gaste até N" e "1 a 3": a linha de base gasta o mínimo impresso, sempre o
  // mesmo valor, para não embutir uma decisão de balanceamento no número.
  const variavel = definicao.custo?.variavel;
  if (variavel !== undefined) escolhas.recursoAdicional = variavel.minimo;

  if (definicao.id === ('M13' as CardId)) {
    const alvo = jogador.cooldown[1][0];
    if (alvo === undefined) return null;
    escolhas.cartaEmCooldown = alvo;
  }

  if (definicao.id === ('M14' as CardId)) {
    const runa = runasAtivadasNaVisao(jogador)[0];
    if (runa === undefined) return null;
    escolhas.cartaDeClasse = runa;
  }

  if (definicao.id === ('MU03' as CardId)) {
    escolhas.cartasEmCooldown = jogador.cooldown[1].slice(0, 2);
  }

  // "Escolha uma carta sua em CD2 ou CD3": sem carta lá, a Técnica não tem o
  // que fazer e a política não a joga.
  if (definicao.id === ('N12' as CardId)) {
    const alvo = jogador.cooldown[2][0] ?? jogador.cooldown[3][0];
    if (alvo === undefined) return null;
    escolhas.cartaEmCooldown = alvo;
  }

  // "Colha até N Almas": colher é ganho sem contrapartida, então a linha de
  // base colhe o máximo que o Cemitério permite — o mesmo critério das
  // Passivas que colhem na revelação.
  const colheita = ALMAS_COLHIDAS[definicao.id];
  if (colheita !== undefined) {
    const cemiterio =
      jogador.recurso.classe === 'necromante' ? jogador.recurso.almasNoCemiterio : 0;
    escolhas.almasColhidas = Math.min(colheita, cemiterio);
  }

  // "Escolha Pulso, Melodia ou Harmonia": a Nota que rende Cadência é a que
  // difere da última tocada, e a sequência do turno é pública.
  if (definicao.id === ('B11' as CardId)) {
    escolhas.nota = notaQueMudaACadencia(jogador);
  }

  // O reforço é exigido por várias cartas e Passivas, e recusado por duas —
  // Rajada Prismática sem Runa Ativada e Orbe Instável fora da segunda Ação.
  const proibeReforco =
    (definicao.id === ('M08' as CardId) && true) ||
    (definicao.id === ('M09' as CardId) && jogador.acoesRealizadasNoTurno !== 1);
  if (!proibeReforco) escolhas.reforco = 'dano';

  return escolhas;
};

/** As escolhas que uma Resposta pode precisar carregar. */
const escolhasParaResposta = (jogador: VisaoDeJogador): EscolhasDaAcao => {
  const runa = runasAtivadasNaVisao(jogador)[0];
  return runa === undefined ? { reforco: 'dano' } : { reforco: 'dano', cartaDeClasse: runa };
};
