import type {
  CardId,
  ClassId,
  EscolhaPendente,
  IndiceDeAcao,
  PlayerId,
  VisaoDaPartida,
  VisaoDeJogador,
} from '@arcane-duel/shared-types';
import type { Aleatorio } from '@arcane-duel/rules-engine';
import type {
  AcaoCandidata,
  AmeacaNaMesa,
  PedidoDeAcao,
  PedidoDeResposta,
  Politica,
  RespostaCandidata,
} from '@arcane-duel/gameplay';
import {
  acoesLegais,
  ameacaDaAcao,
  defesaInataDisponivel,
  escolhasDaResposta,
  respostasLegais,
} from '@arcane-duel/gameplay';

/*
 * A IA do vertical slice: Guerreiro contra Mago.
 *
 * Ela não é a IA da campanha — as doze dificuldades entram na etapa oito. O
 * que ela precisa ser é **coerente e convincente**: jogar como alguém que
 * entende a própria classe, e nunca como um sorteio entre cartas legais.
 *
 * Três coisas são estruturais, e não confiam em disciplina de quem escreve:
 *
 * 1. Ela decide lendo `VisaoDaPartida`, que é a **projeção** — a mesma que um
 *    cliente receberia. A mão do adversário simplesmente não está nesse dado,
 *    nem a identidade de uma Passiva ainda oculta. Não existe caminho por onde
 *    esta IA conheça carta escondida: não é que ela se abstenha de olhar, é que
 *    não há o que olhar.
 *
 * 2. Ela só propõe comandos que a enumeração de legalidade do `gameplay`
 *    devolveu. Custo, condição impressa e escolhas obrigatórias vêm de lá. Ela
 *    pontua candidatas; não inventa candidatas.
 *
 * 3. Ela não recebe bônus nenhum. O motor trata o comando dela exatamente como
 *    trata o de um humano, e recusa do mesmo jeito.
 *
 * A ordem de prioridade é a do documento: vitória imediata, impedir derrota,
 * Ruptura favorável, uso eficiente do recurso da classe, ataque com boa relação
 * custo/resultado, condição útil, preparação, reserva defensiva, fim do turno.
 * Ela está codificada nos pesos de `pontuar`, e cada peso é comentado com o que
 * ele representa.
 */

/** Quanto um ponto de Vida do adversário vale na pontuação de uma Ação. */
const VALOR_DO_DANO = 10;

/** O bônus impresso de Ruptura. Vale saber para não subestimar o Impacto. */
const BONUS_DE_RUPTURA = 2;

const meuEstado = (visao: VisaoDaPartida, eu: PlayerId): VisaoDeJogador | undefined =>
  visao.jogadores.find((jogador) => jogador.id === eu);

const oAdversario = (visao: VisaoDaPartida, eu: PlayerId): VisaoDeJogador | undefined =>
  visao.jogadores.find((jogador) => jogador.id !== eu);

/** Momentum do Guerreiro, Mana do Mago, zero para quem não tem moeda. */
const recursoDaClasse = (jogador: VisaoDeJogador): number => {
  const recurso = jogador.recurso;
  if (recurso.classe === 'guerreiro') return recurso.momentum;
  if (recurso.classe === 'mago') return recurso.mana;
  return 0;
};

/**
 * O Dano que esta Ação entrega à Vida, contando Guarda e Ruptura.
 *
 * Guarda absorve Dano até acabar; Impacto que iguala ou passa a Guarda causa
 * Ruptura, que derruba a Guarda e ainda soma o bônus impresso. Esta é a conta
 * que decide se um Ataque de 3 D vale mais que um de 4 D contra 6 de Guarda —
 * e é ela que faz a IA parecer que entende o jogo em vez de somar números.
 *
 * É uma **estimativa**: quem calcula de verdade é o motor, com Reação, Passiva
 * e Carta de Classe no meio. Serve para ordenar candidatas, não para prometer
 * resultado.
 */
interface Previsao {
  /** Dano que chega à Vida. */
  readonly naVida: number;
  readonly causaRuptura: boolean;
  /** Guarda que sobra do adversário depois desta Ação. */
  readonly guardaRestante: number;
}

const preverAtaque = (
  dano: number,
  impacto: number,
  guardaDoAlvo: number,
  bonusDeRupturaExtra = 0,
): Previsao => {
  const causaRuptura = guardaDoAlvo > 0 && impacto >= guardaDoAlvo;
  if (causaRuptura) {
    return {
      naVida: dano + BONUS_DE_RUPTURA + bonusDeRupturaExtra,
      causaRuptura: true,
      guardaRestante: 0,
    };
  }
  const absorvido = Math.min(dano, guardaDoAlvo);
  return {
    naVida: dano - absorvido,
    causaRuptura: false,
    guardaRestante: Math.max(0, guardaDoAlvo - Math.max(dano, impacto)),
  };
};

/*
 * O que o texto impresso das quatro cartas-modelo acrescenta à previsão.
 *
 * Só o que está impresso e é público entra aqui. Nada disso altera regra: é a
 * IA lendo a carta como um jogador leria antes de decidir.
 */
const BONUS_DE_RUPTURA_IMPRESSO: Readonly<Record<string, number>> = {
  // "Se causar Ruptura, o bônus de Ruptura deste Ataque é +3 D em vez de +2 D."
  W08: 1,
};

/** Cartas cujo Dano sobe quando o alvo já está Queimando. */
const BONUS_CONTRA_QUEIMADURA: readonly string[] = ['M02'];

/** Cartas que aplicam Queimadura quando o Dano chega à Vida. */
const APLICA_QUEIMADURA: readonly string[] = ['M03', 'MU01'];

/** Cartas que aplicam Lento. */
const APLICA_LENTO: readonly string[] = ['M06', 'MU02'];

export interface PesosDaIa {
  /** Quanto vale derrubar a Guarda, por ponto de Guarda removido. */
  readonly guarda: number;
  /** Quanto vale a própria Ruptura, além do Dano que ela libera. */
  readonly ruptura: number;
  /** Quanto vale cada ponto de recurso da classe guardado para depois. */
  readonly recursoPoupado: number;
  /** Quanto vale aplicar uma condição nova no adversário. */
  readonly condicao: number;
  /** Quanto vale uma Técnica, que prepara em vez de machucar. */
  readonly preparacao: number;
  /** Penalidade por AP gasto, que é o que força escolher bem. */
  readonly custoDeAp: number;
}

/**
 * O Guerreiro joga pela Ruptura.
 *
 * Momentum nasce de derrubar Guarda e de anular Dano, então gastá-lo cedo é
 * barato: ele volta. O que decide a partida dele é quebrar a Guarda e
 * transformar a janela em Dano — por isso Ruptura pesa muito e recurso poupado
 * pesa pouco.
 */
const PESOS_DO_GUERREIRO: PesosDaIa = {
  guarda: 3.2,
  ruptura: 14,
  recursoPoupado: 1.2,
  condicao: 3,
  preparacao: 6,
  custoDeAp: 2.5,
};

/**
 * O Mago joga pela Mana e pela condição.
 *
 * A Mana dele repõe devagar e as cartas grandes cobram quatro de uma vez, então
 * queimá-la num Ataque médio é o erro clássico da classe: recurso poupado pesa
 * mais que no Guerreiro. Em compensação Queimadura e Lento rendem ao longo do
 * tempo, e por isso condição pesa mais.
 */
const PESOS_DO_MAGO: PesosDaIa = {
  guarda: 2.4,
  ruptura: 9,
  recursoPoupado: 3.4,
  condicao: 7,
  preparacao: 7,
  custoDeAp: 2.5,
};

const PESOS_NEUTROS: PesosDaIa = {
  guarda: 2.8,
  ruptura: 11,
  recursoPoupado: 2,
  condicao: 5,
  preparacao: 6,
  custoDeAp: 2.5,
};

export const pesosDaClasse = (classe: ClassId): PesosDaIa => {
  if (classe === 'guerreiro') return PESOS_DO_GUERREIRO;
  if (classe === 'mago') return PESOS_DO_MAGO;
  return PESOS_NEUTROS;
};

/** O custo em AP que esta carta vai cobrar, contando Lento. */
const apCobrado = (candidata: AcaoCandidata, jogador: VisaoDeJogador): number => {
  const custo = candidata.definicao.custo;
  if (custo?.moeda !== 'ap') return 0;
  return custo.valor + (jogador.condicoes.lento > 0 ? 1 : 0);
};

/** O recurso de classe que esta carta vai cobrar. */
const recursoCobrado = (candidata: AcaoCandidata): number => {
  const custo = candidata.definicao.custo;
  if (custo === undefined) return 0;
  return (custo.recurso?.quantidade ?? 0) + (custo.variavel?.minimo ?? 0);
};

export interface NotaDaAcao {
  readonly candidata: AcaoCandidata;
  readonly nota: number;
  /** A previsão que gerou a nota, útil para explicar a decisão num teste. */
  readonly previsao: Previsao;
  /** Verdadeiro quando esta Ação sozinha encerra a partida. */
  readonly encerra: boolean;
}

/**
 * Pontua uma Ação candidata.
 *
 * A ordem de prioridade do documento está aqui, e nesta ordem de grandeza:
 *
 * 1. **Vitória imediata** — um valor que nenhuma outra soma alcança.
 * 2. **Ruptura favorável** — peso próprio, somado ao Dano que ela libera.
 * 3. **Recurso da classe** — poupar o que ainda vai ser preciso.
 * 4. **Ataque com boa relação custo/resultado** — Dano dividido pelo AP.
 * 5. **Condição útil** — Queimadura e Lento, que rendem depois.
 * 6. **Preparação** — Técnica, que não machuca agora.
 *
 * "Impedir derrota provável" não mora aqui: ela é decisão de Resposta, e está
 * em `pontuarResposta`.
 */
const pontuarAcao = (
  candidata: AcaoCandidata,
  jogador: VisaoDeJogador,
  adversario: VisaoDeJogador,
  pesos: PesosDaIa,
): NotaDaAcao => {
  const definicao = candidata.definicao;
  const valores = definicao.valores;
  const ehAtaque = definicao.tipo === 'ataque' || definicao.comportaComo === 'ataque';

  const bonusImpresso = BONUS_DE_RUPTURA_IMPRESSO[definicao.id] ?? 0;
  const queimando = adversario.condicoes.queimadura > 0;
  const danoImpresso =
    (valores?.dano ?? 0) + (BONUS_CONTRA_QUEIMADURA.includes(definicao.id) && queimando ? 1 : 0);

  const previsao =
    ehAtaque && valores !== undefined
      ? preverAtaque(danoImpresso, valores.impacto, adversario.guarda, bonusImpresso)
      : { naVida: 0, causaRuptura: false, guardaRestante: adversario.guarda };

  const encerra = previsao.naVida >= adversario.vida;
  if (encerra) return { candidata, nota: 1_000_000, previsao, encerra: true };

  let nota = previsao.naVida * VALOR_DO_DANO;

  // A Guarda que cai vale por si: ela é o que abre a próxima Ação.
  nota += (adversario.guarda - previsao.guardaRestante) * pesos.guarda;
  if (previsao.causaRuptura) nota += pesos.ruptura;

  // Condição rende ao longo do tempo, e só vale quando ainda não está lá.
  if (APLICA_QUEIMADURA.includes(definicao.id) && !queimando && previsao.naVida > 0) {
    nota += pesos.condicao;
  }
  if (APLICA_LENTO.includes(definicao.id) && adversario.condicoes.lento === 0) {
    nota += pesos.condicao;
  }

  // Técnica não machuca agora: ela vale como preparação, e menos que um Ataque
  // que já resolve. Sem este piso, a IA nunca prepararia nada.
  if (definicao.tipo === 'tecnica' || definicao.comportaComo === 'tecnica') {
    nota += pesos.preparacao;
  }

  // Custo. O AP é o recurso escasso do turno; o recurso de classe é o escasso
  // da partida. Cobrar os dois é o que produz "boa relação custo/resultado".
  nota -= apCobrado(candidata, jogador) * pesos.custoDeAp;
  nota -= recursoCobrado(candidata) * pesos.recursoPoupado;

  /*
   * A Ultimate não é uma carta cara: é a única.
   *
   * Ela vem uma vez por partida e sai do jogo. Gastá-la num alvo com Vida alta
   * e Guarda cheia desperdiça o momento, então ela só compete de verdade quando
   * o Dano previsto é grande em relação ao que resta de Vida.
   */
  if (candidata.ehUltimate) {
    const fatia = adversario.vida <= 0 ? 1 : previsao.naVida / adversario.vida;
    nota += fatia >= 0.4 ? 18 : -22;
  }

  return { candidata, nota, previsao, encerra: false };
};

/**
 * Pontua uma Reação candidata.
 *
 * Aqui mora "impedir derrota provável": quando o Dano que vem encerra a
 * partida, qualquer redução vale mais que qualquer economia. Fora disso, a
 * conta é quanto de Vida a Reação salva de verdade — reduzir 3 D de um Ataque
 * de 1 D não salva três pontos, salva um.
 */
const pontuarResposta = (
  item: RespostaCandidata,
  ameaca: AmeacaNaMesa,
  jogador: VisaoDeJogador,
  pesos: PesosDaIa,
): number => {
  if (ameaca.ehTecnica) return 5;

  const previsaoSem = preverAtaque(ameaca.dano, ameaca.impacto, jogador.guarda);
  const previsaoCom = preverAtaque(
    Math.max(0, ameaca.dano - item.reducao.dano),
    Math.max(0, ameaca.impacto - item.reducao.impacto),
    jogador.guarda,
  );

  const vidaSalva = previsaoSem.naVida - previsaoCom.naVida;
  const rupturaEvitada = previsaoSem.causaRuptura && !previsaoCom.causaRuptura;

  // Morrer é pior que gastar tudo. Este ramo é a prioridade 2 do documento.
  if (previsaoSem.naVida >= jogador.vida && previsaoCom.naVida < jogador.vida) {
    return 1_000_000;
  }

  let nota = vidaSalva * VALOR_DO_DANO;
  if (rupturaEvitada) nota += pesos.ruptura;
  // A Reação custa Reserva, que é a defesa dos próximos turnos.
  nota -= (item.definicao.custo?.valor ?? 0) * 4;
  return nota;
};

const desempatar = <T>(opcoes: readonly T[], rng: Aleatorio): T | undefined => {
  if (opcoes.length <= 1) return opcoes[0];
  return opcoes[rng.inteiro(opcoes.length)];
};

const melhor = <T extends { readonly nota: number }>(
  itens: readonly T[],
  rng: Aleatorio,
): T | undefined => {
  if (itens.length === 0) return undefined;
  const maior = Math.max(...itens.map((item) => item.nota));
  return desempatar(
    itens.filter((item) => item.nota === maior),
    rng,
  );
};

/**
 * Quanto a IA "pensa" antes de agir, em milissegundos.
 *
 * Não é atraso decorativo e não é aleatório: é proporcional ao tamanho da
 * decisão que ela acabou de tomar. Uma escolha entre duas cartas resolve rápido;
 * uma entre dez, com Ultimate na mesa, demora um pouco mais. A faixa é curta de
 * propósito — 300 a 900 ms —, porque esperar segundos por um adversário que já
 * decidiu é tempo roubado de quem está jogando.
 */
export const TEMPO_DE_PENSAMENTO_MS = { minimo: 300, maximo: 900 } as const;

export const tempoDePensamento = (opcoesConsideradas: number): number => {
  const faixa = TEMPO_DE_PENSAMENTO_MS.maximo - TEMPO_DE_PENSAMENTO_MS.minimo;
  const carga = Math.min(1, Math.max(0, (opcoesConsideradas - 1) / 9));
  return Math.round(TEMPO_DE_PENSAMENTO_MS.minimo + faixa * carga);
};

export interface IaDoSlice extends Politica {
  /**
   * Quantas opções a IA considerou na última decisão.
   *
   * A apresentação usa este número para dimensionar o "Adversário pensando…".
   * Ele é sobre a decisão, e não sobre o relógio.
   */
  readonly ultimaCarga: () => number;
}

/**
 * Cria a IA do vertical slice.
 *
 * `classe` só escolhe os **pesos**. Ela não abre acesso a nada: a IA do
 * Guerreiro e a do Mago leem exatamente a mesma projeção e passam pela mesma
 * enumeração de legalidade.
 */
export const criarIaDoSlice = (classe: ClassId): IaDoSlice => {
  const pesos = pesosDaClasse(classe);
  let carga = 1;

  return {
    nome: `slice-${classe}`,

    ultimaCarga: () => carga,

    escolherAcao: (visao: VisaoDaPartida, eu: PlayerId, rng: Aleatorio): PedidoDeAcao | null => {
      const jogador = meuEstado(visao, eu);
      const adversario = oAdversario(visao, eu);
      if (jogador === undefined || adversario === undefined) return null;

      const candidatas = acoesLegais(visao, eu);
      carga = Math.max(1, candidatas.length);
      if (candidatas.length === 0) return null;

      const notas = candidatas.map((candidata) =>
        pontuarAcao(candidata, jogador, adversario, pesos),
      );

      /*
       * Uma nota negativa é uma jogada que a IA considera pior que não jogar.
       *
       * Ela existe: gastar a Ultimate contra Vida cheia, queimar as últimas
       * Manas num Ataque que a Guarda absorve inteiro. Encerrar o turno com AP
       * na mão é uma decisão legítima, e ignorar isso é o que faz uma IA
       * parecer que está só esvaziando a mão.
       */
      const escolhida = melhor(notas, rng);
      if (escolhida === undefined || escolhida.nota < 0) return null;
      return escolhida.candidata.pedido;
    },

    escolherResposta: (
      visao: VisaoDaPartida,
      eu: PlayerId,
      indice: IndiceDeAcao,
      rng: Aleatorio,
    ): PedidoDeResposta => {
      const jogador = meuEstado(visao, eu);
      if (jogador === undefined) return { tipo: 'sem-resposta' };

      const ameaca = ameacaDaAcao(visao, eu, indice);
      if (ameaca === null) return { tipo: 'sem-resposta' };

      const candidatas = respostasLegais(visao, eu, ameaca);
      const notas = candidatas.map((item) => ({
        item,
        nota: pontuarResposta(item, ameaca, jogador, pesos),
      }));
      carga = Math.max(1, notas.length + 1);

      const escolhida = melhor(notas, rng);
      if (escolhida !== undefined && escolhida.nota > 0) return escolhida.item.pedido;

      if (ameaca.ehTecnica) return { tipo: 'sem-resposta' };
      if (!defesaInataDisponivel(visao, eu)) return { tipo: 'sem-resposta' };

      /*
       * A Defesa Inata é de graça em Reserva, mas vale uma vez por turno
       * inimigo: gastá-la no primeiro arranhão deixa o golpe grande sem
       * resposta. Ela entra quando há Ruptura para impedir ou Dano que
       * realmente chega à Vida.
       */
      const previsao = preverAtaque(ameaca.dano, ameaca.impacto, jogador.guarda);
      if (!ameaca.causaRuptura && previsao.naVida < 2) return { tipo: 'sem-resposta' };

      return {
        tipo: 'defesa-inata',
        reducao: ameaca.causaRuptura ? 'impacto' : 'dano',
        escolhas: escolhasDaResposta(visao, eu),
      };
    },

    escolherPendencia: (
      _visao: VisaoDaPartida,
      _eu: PlayerId,
      pendente: EscolhaPendente,
      rng: Aleatorio,
    ): CardId | undefined => {
      carga = Math.max(1, pendente.opcoes.length);
      return desempatar(pendente.opcoes, rng);
    },
  };
};

/** Quanto recurso de classe a IA tem agora. Exposto para os testes medirem. */
export const recursoVisivel = (visao: VisaoDaPartida, eu: PlayerId): number => {
  const jogador = meuEstado(visao, eu);
  return jogador === undefined ? 0 : recursoDaClasse(jogador);
};
