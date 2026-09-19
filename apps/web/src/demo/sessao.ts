import type {
  CardId,
  ClassId,
  EscolhaPendente,
  EscolhasDaAcao,
  EstadoDaPartida,
  IndiceDeAcao,
  PlayerId,
  VisaoDaPartida,
} from '@arcane-duel/shared-types';
import { matchId, playerId } from '@arcane-duel/shared-types';
import type { ErroDeDominio, EventoUniversal } from '@arcane-duel/rules-engine';
import { criarAleatorio, projetarParaJogador } from '@arcane-duel/rules-engine';
import type { PedidoDeAcao, PedidoDeResposta } from '@arcane-duel/gameplay/jogo';
import {
  RECEITAS_INICIAIS,
  abrirTurno,
  declarar,
  fecharTurno,
  iniciar,
  montarPartida,
  resolver,
  resolverEscolhaPendente,
  responder,
} from '@arcane-duel/gameplay/jogo';
import type { IaDoSlice } from '@arcane-duel/ai';
import { criarIaDoSlice, tempoDePensamento } from '@arcane-duel/ai';

/*
 * A sessão da Demo Visual V2: uma pessoa contra a IA.
 *
 * A diferença que manda em tudo o mais é esta: **não existe troca de aparelho**.
 * O protótipo anterior era hot-seat, e por isso precisava esconder o campo,
 * pedir "passe o aparelho" e recalcular a projeção do outro lado a cada turno.
 * Aqui há um humano só, sentado de um lado, e ele fica lá.
 *
 * Isso tem uma consequência estrutural, e não cosmética: existe **uma**
 * perspectiva, fixada na criação da sessão, e ela é a única projeção que este
 * módulo calcula. A visão do lado da IA nunca é produzida para a tela. Não é
 * que a interface evite mostrá-la — é que ela não é calculada. Virar a câmera
 * seria preciso inventar um dado que não existe aqui.
 *
 * A IA decide **antes** da apresentação e por fora dela. Ela recebe a projeção
 * dela, devolve um comando, o motor valida, e só então a fila visual conta o
 * que aconteceu. Nenhuma animação decide regra, e nenhuma regra espera
 * animação.
 */

export const HUMANO: PlayerId = playerId('humano');
export const MAQUINA: PlayerId = playerId('maquina');

export interface ConfiguracaoDaDemo {
  /** A classe que a pessoa escolheu jogar. A outra fica com a IA. */
  readonly classeDoHumano: ClassId;
  readonly classeDaIa: ClassId;
  /** Quem começa. O padrão da demo é a pessoa, para ela agir antes de assistir. */
  readonly comeca: PlayerId;
}

/**
 * O que a tela deve pedir agora.
 *
 * `pensando` é o único estado que não existe no protótipo hot-seat: é a janela
 * curta em que a IA já decidiu e a apresentação ainda não começou a mover a
 * carta. Ele existe para o jogador entender que houve uma decisão, e não para
 * fingir esforço.
 */
export type EtapaDaDemo =
  | { readonly tipo: 'acao' }
  | { readonly tipo: 'resposta'; readonly indice: IndiceDeAcao; readonly atacante: PlayerId }
  | { readonly tipo: 'escolha-pendente'; readonly escolha: EscolhaPendente }
  | { readonly tipo: 'pensando' }
  | { readonly tipo: 'fim' };

export interface EstadoDaDemo {
  /**
   * A projeção do humano, e só dela.
   *
   * O estado canônico não sai deste módulo. Quem desenha recebe esta visão —
   * exatamente o que um cliente de rede receberia — e por isso a mão da IA
   * chega sem identidade nenhuma, sem precisar de nenhuma checagem na tela.
   */
  readonly visao: VisaoDaPartida;
  readonly etapa: EtapaDaDemo;
  /** De quem a etapa espera um comando. */
  readonly aguardando: PlayerId;
  readonly eventos: readonly EventoUniversal[];
  readonly lote: number;
  readonly ultimoErro: ErroDeDominio | null;
  /** O lado do humano. Fixo desde a criação, e nunca reatribuído. */
  readonly perspectiva: PlayerId;
}

export interface ControladorDaDemo {
  readonly estado: () => EstadoDaDemo;
  readonly declarar: (pedido: PedidoDeAcao) => void;
  readonly responder: (pedido: PedidoDeResposta) => void;
  readonly resolverEscolha: (carta: CardId) => void;
  readonly encerrarTurno: () => void;
  readonly limparErro: () => void;
  readonly aoMudar: (ouvinte: (estado: EstadoDaDemo) => void) => () => void;
  /**
   * Deixa a IA jogar um passo, se for a vez dela.
   *
   * Quem chama é a apresentação, quando terminou de mostrar o passo anterior.
   * Assim a fila visual nunca corre atrás do estado — mas note que o estado
   * **não depende** dela: chamar isto em sequência, sem desenhar nada, leva a
   * partida ao fim do mesmo jeito. É o que o teste headless faz.
   */
  readonly passoDaIa: () => void;
  /** Quanto a IA deve "pensar" antes do próximo passo, em ms. */
  readonly pensamentoMs: () => number;
  readonly descartar: () => void;
}

const adversarioDe = (jogador: PlayerId): PlayerId => (jogador === HUMANO ? MAQUINA : HUMANO);

export const montarPartidaDaDemo = (
  configuracao: ConfiguracaoDaDemo,
  semente: string,
): EstadoDaPartida => {
  const montada = montarPartida({
    id: matchId(`demo-${semente}`),
    semente,
    jogadores: [
      { id: HUMANO, build: RECEITAS_INICIAIS[configuracao.classeDoHumano] },
      { id: MAQUINA, build: RECEITAS_INICIAIS[configuracao.classeDaIa] },
    ],
  });
  if (!montada.ok) throw new Error('Receita oficial inválida');
  return montada.valor;
};

const escolhaPendenteDe = (partida: EstadoDaPartida): EscolhaPendente | undefined =>
  partida.escolhasPendentes[0];

const indiceDeclarado = (partida: EstadoDaPartida, jogador: PlayerId): IndiceDeAcao | null => {
  const dono = partida.jogadores.find((item) => item.id === jogador);
  return dono?.acoes.find((item) => item.situacao === 'declarada')?.indice ?? null;
};

export const criarControladorDaDemo = (
  configuracao: ConfiguracaoDaDemo,
  semente = 'demo-v2',
): ControladorDaDemo => {
  const montada = montarPartidaDaDemo(configuracao, semente);
  const iniciada = iniciar(montada, configuracao.comeca);
  if (!iniciada.ok) throw new Error('não foi possível iniciar a demo');
  const aberta = abrirTurno(iniciada.valor.partida, configuracao.comeca);
  if (!aberta.ok) throw new Error('não foi possível abrir o primeiro turno');

  const ia: IaDoSlice = criarIaDoSlice(configuracao.classeDaIa);
  const rng = criarAleatorio(`ia-${semente}`);

  /*
   * O estado canônico vive aqui dentro, e não sai.
   *
   * A única coisa que atravessa a fronteira é `projetarParaJogador(…, HUMANO)`.
   * É a mesma fronteira do PvP da etapa dez: trocar este controlador por um
   * cliente de rede não muda nenhum componente de tela.
   */
  let partida = aberta.valor.partida;
  let pendenteDeResposta: { readonly indice: IndiceDeAcao; readonly atacante: PlayerId } | null =
    null;
  let lote = 1;
  let ultimoErro: ErroDeDominio | null = null;
  let eventosDoPasso: readonly EventoUniversal[] = [
    ...iniciada.valor.eventos,
    ...aberta.valor.eventos,
  ];
  let vivo = true;

  const ouvintes = new Set<(estado: EstadoDaDemo) => void>();

  const calcularEtapa = (): { readonly etapa: EtapaDaDemo; readonly aguardando: PlayerId } => {
    if (partida.situacao === 'encerrada') {
      return { etapa: { tipo: 'fim' }, aguardando: HUMANO };
    }
    const pendente = escolhaPendenteDe(partida);
    if (pendente !== undefined) {
      return {
        etapa: { tipo: 'escolha-pendente', escolha: pendente },
        aguardando: pendente.jogador,
      };
    }
    if (pendenteDeResposta !== null) {
      return {
        etapa: { tipo: 'resposta', ...pendenteDeResposta },
        aguardando: adversarioDe(pendenteDeResposta.atacante),
      };
    }
    const ativo = partida.turno?.jogadorAtivo ?? HUMANO;
    return { etapa: { tipo: 'acao' }, aguardando: ativo };
  };

  const montarEstado = (): EstadoDaDemo => {
    const { etapa, aguardando } = calcularEtapa();
    return {
      // Uma projeção só, sempre a mesma, sempre do humano.
      visao: projetarParaJogador(partida, HUMANO),
      etapa,
      aguardando,
      eventos: eventosDoPasso,
      lote,
      ultimoErro,
      perspectiva: HUMANO,
    };
  };

  let estado = montarEstado();

  const publicar = (): void => {
    estado = montarEstado();
    for (const ouvinte of ouvintes) ouvinte(estado);
  };

  const avancar = (
    proxima: EstadoDaPartida,
    eventos: readonly EventoUniversal[],
    resposta: { readonly indice: IndiceDeAcao; readonly atacante: PlayerId } | null,
  ): void => {
    partida = proxima;
    pendenteDeResposta = resposta;
    eventosDoPasso = eventos;
    lote += 1;
    ultimoErro = null;
    publicar();
  };

  const recusar = (erro: ErroDeDominio): void => {
    // Uma recusa não é evento de partida: nada aconteceu e a fila não tem o que
    // tocar. O lote fica onde estava.
    eventosDoPasso = [];
    ultimoErro = erro;
    publicar();
  };

  /** Declara uma Ação por um dos dois lados, e entrega a vez a quem responde. */
  const declararPor = (jogador: PlayerId, pedido: PedidoDeAcao): boolean => {
    const dada = declarar(partida, jogador, pedido);
    if (!dada.ok) {
      recusar(dada.erro);
      return false;
    }
    const indice = indiceDeclarado(dada.valor.partida, jogador);
    /*
     * Não há janela de complementos nesta demo.
     *
     * Ativar Carta de Classe e Passiva sobre uma Ação declarada continua sendo
     * comando do motor e continua existindo no protótipo hot-seat. Aqui a
     * Ação vai direto para a Resposta, porque o que este slice está testando é
     * a gramática de movimento e a IA — e uma parada a mais entre a carta
     * encaixar e o efeito sair mataria exatamente o que se quer avaliar.
     */
    avancar(
      dada.valor.partida,
      dada.valor.eventos,
      indice === null ? null : { indice, atacante: jogador },
    );
    return true;
  };

  /** Responde e resolve a Ação que está na mesa. */
  const responderPor = (defensor: PlayerId, pedido: PedidoDeResposta): boolean => {
    if (pendenteDeResposta === null) return false;
    const { indice, atacante } = pendenteDeResposta;
    let proxima = partida;
    const eventos: EventoUniversal[] = [];

    if (pedido.tipo !== 'sem-resposta') {
      const dada = responder(proxima, defensor, indice, pedido);
      if (!dada.ok) {
        recusar(dada.erro);
        return false;
      }
      proxima = dada.valor.partida;
      eventos.push(...dada.valor.eventos);
    }

    const resolvida = resolver(proxima, atacante, indice);
    if (!resolvida.ok) {
      recusar(resolvida.erro);
      return false;
    }
    eventos.push(...resolvida.valor.eventos);
    avancar(resolvida.valor.partida, eventos, null);
    return true;
  };

  const encerrarTurnoDe = (jogador: PlayerId): boolean => {
    const fechada = fecharTurno(partida, jogador);
    if (!fechada.ok) {
      recusar(fechada.erro);
      return false;
    }
    const proximo = fechada.valor.partida.turno?.jogadorAtivo;
    if (fechada.valor.partida.situacao === 'encerrada' || proximo === undefined) {
      avancar(fechada.valor.partida, fechada.valor.eventos, null);
      return true;
    }
    const aberta2 = abrirTurno(fechada.valor.partida, proximo);
    if (!aberta2.ok) {
      recusar(aberta2.erro);
      return false;
    }
    avancar(aberta2.valor.partida, [...fechada.valor.eventos, ...aberta2.valor.eventos], null);
    return true;
  };

  /**
   * Um passo da IA.
   *
   * Ela age nas três situações em que a vez é dela: declarar uma Ação, responder
   * a uma Ação do humano, ou resolver uma escolha pendente sua. Quando não tem
   * o que fazer com o turno, encerra — e encerrar é uma decisão, não desistência:
   * guardar AP para o turno seguinte é jogada legítima.
   *
   * A visão que ela recebe é `projetarParaJogador(…, MAQUINA)`. Ela é calculada
   * aqui, entregue à IA e descartada; nada dela chega ao estado publicado.
   */
  const passoDaIa = (): void => {
    if (!vivo) return;
    if (partida.situacao === 'encerrada') return;

    const pendente = escolhaPendenteDe(partida);
    if (pendente !== undefined) {
      if (pendente.jogador !== MAQUINA) return;
      const visaoDaIa = projetarParaJogador(partida, MAQUINA);
      const escolha = ia.escolherPendencia(visaoDaIa, MAQUINA, pendente, rng);
      if (escolha === undefined) return;
      const dada = resolverEscolhaPendente(partida, MAQUINA, escolha);
      if (!dada.ok) {
        recusar(dada.erro);
        return;
      }
      avancar(dada.valor.partida, dada.valor.eventos, pendenteDeResposta);
      return;
    }

    if (pendenteDeResposta !== null) {
      if (adversarioDe(pendenteDeResposta.atacante) !== MAQUINA) return;
      const visaoDaIa = projetarParaJogador(partida, MAQUINA);
      const resposta = ia.escolherResposta(visaoDaIa, MAQUINA, pendenteDeResposta.indice, rng);
      responderPor(MAQUINA, resposta);
      return;
    }

    if (partida.turno?.jogadorAtivo !== MAQUINA) return;

    const visaoDaIa = projetarParaJogador(partida, MAQUINA);
    const acao = ia.escolherAcao(visaoDaIa, MAQUINA, rng);
    if (acao === null) {
      encerrarTurnoDe(MAQUINA);
      return;
    }
    if (!declararPor(MAQUINA, acao)) {
      // Se o motor recusou, a IA não insiste: encerrar o turno é sempre legal e
      // impede que uma recusa trave a partida inteira.
      encerrarTurnoDe(MAQUINA);
    }
  };

  return {
    estado: () => estado,

    declarar: (pedido) => {
      if (estado.etapa.tipo !== 'acao' || estado.aguardando !== HUMANO) return;
      declararPor(HUMANO, pedido);
    },

    responder: (pedido) => {
      if (estado.etapa.tipo !== 'resposta' || estado.aguardando !== HUMANO) return;
      responderPor(HUMANO, pedido);
    },

    resolverEscolha: (carta) => {
      if (estado.etapa.tipo !== 'escolha-pendente') return;
      if (estado.etapa.escolha.jogador !== HUMANO) return;
      const dada = resolverEscolhaPendente(partida, HUMANO, carta);
      if (!dada.ok) {
        recusar(dada.erro);
        return;
      }
      avancar(dada.valor.partida, dada.valor.eventos, pendenteDeResposta);
    },

    encerrarTurno: () => {
      if (estado.aguardando !== HUMANO || estado.etapa.tipo !== 'acao') return;
      encerrarTurnoDe(HUMANO);
    },

    limparErro: () => {
      ultimoErro = null;
      publicar();
    },

    aoMudar: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },

    passoDaIa,
    pensamentoMs: () => tempoDePensamento(ia.ultimaCarga()),

    descartar: () => {
      vivo = false;
      ouvintes.clear();
    },
  };
};

/** Escolhas vazias, para quem chama `declarar` sem nada a acrescentar. */
export const SEM_ESCOLHAS: EscolhasDaAcao = {};
