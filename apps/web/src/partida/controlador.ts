import type {
  CardId,
  ClassId,
  EscolhaPendente,
  EscolhasDaAcao,
  EstadoDaPartida,
  FormaDoDruida,
  IndiceDeAcao,
  PlayerId,
} from '@arcane-duel/shared-types';
import { matchId, playerId } from '@arcane-duel/shared-types';
import type { ErroDeDominio, EventoUniversal } from '@arcane-duel/rules-engine';
import type {
  PedidoDeAcao,
  PedidoDeResposta,
  UsoDeCartaDeClasse,
} from '@arcane-duel/gameplay/jogo';
import {
  RECEITAS_INICIAIS,
  abrirTurno,
  ativarPassivaNaAcao,
  declarar,
  fecharTurno,
  iniciar,
  montarPartida,
  resolver,
  resolverEscolhaPendente,
  responder,
  usarCartaDeClasseNaAcao,
  usarMetamorfose,
} from '@arcane-duel/gameplay/jogo';

/*
 * O controlador da partida local.
 *
 * Ele é o **host** do protótipo, e nada além disso. No PvP da Etapa 10 quem
 * guarda o estado canônico e executa comandos é o servidor; aqui isso mora no
 * cliente porque os dois jogadores estão no mesmo aparelho e não há rede no
 * meio. A fronteira não muda: a interface continua falando por comandos e
 * lendo projeções, então trocar este controlador por um cliente de rede não
 * mexe em componente nenhum.
 *
 * Nenhuma regra de combate é decidida aqui. Todas as transições chamam
 * `@arcane-duel/gameplay`; o que este arquivo sabe é a **ordem** em que a
 * interface precisa pedi-las, e de quem é a vez de estar com o aparelho.
 */

export const JOGADOR_1: PlayerId = playerId('jogador-1');
export const JOGADOR_2: PlayerId = playerId('jogador-2');

export interface ConfiguracaoLocal {
  readonly classeDoJogador1: ClassId;
  readonly classeDoJogador2: ClassId;
  readonly comeca: PlayerId;
}

/**
 * Em que ponto do fluxo a partida local está.
 *
 * É estado de **apresentação**: ele diz o que a tela deve pedir agora. O
 * estado do jogo continua inteiro em `EstadoDaPartida`, e nada daqui entra
 * lá.
 */
export type EtapaLocal =
  /** O jogador da vez escolhe e declara uma Ação, ou encerra o turno. */
  | { readonly tipo: 'acao' }
  /**
   * A Ação já está no espaço e quem atacou ainda pode somar a ela.
   *
   * Ativar uma Carta de Classe e Ativar uma Passiva são comandos que o motor
   * aplica **sobre uma Ação declarada**. Sem esta parada o atacante nunca
   * alcançaria nenhum dos dois: a Resposta entra logo depois.
   */
  | { readonly tipo: 'complementos'; readonly indice: IndiceDeAcao }
  /** A Ação foi declarada e espera a Resposta do defensor. */
  | { readonly tipo: 'resposta'; readonly indice: IndiceDeAcao; readonly atacante: PlayerId }
  /** Um efeito criou uma escolha que o dono precisa resolver antes de seguir. */
  | { readonly tipo: 'escolha-pendente'; readonly escolha: EscolhaPendente }
  | { readonly tipo: 'fim' };

export interface EstadoDaSessao {
  readonly partida: EstadoDaPartida;
  readonly etapa: EtapaLocal;
  /** Quem a etapa atual exige diante do aparelho. */
  readonly aguardando: PlayerId;
  /**
   * Quem está com o aparelho agora. `null` é a tela de troca — e enquanto for
   * `null` **nenhuma** projeção privada é calculada, muito menos renderizada.
   */
  readonly noAparelho: PlayerId | null;
  /** Ruptura, Dano e fim de turno, para os avisos curtos da batalha. */
  readonly avisos: readonly AvisoDaPartida[];
  /** A última recusa do motor, para virar texto humano na tela. */
  readonly ultimoErro: ErroDeDominio | null;
}

export type AvisoDaPartida =
  | { readonly tipo: 'ruptura'; readonly alvo: PlayerId; readonly bonus: number }
  | { readonly tipo: 'turno'; readonly jogador: PlayerId; readonly numero: number }
  | { readonly tipo: 'fim'; readonly vencedor: PlayerId | null };

const adversarioDe = (jogador: PlayerId): PlayerId =>
  jogador === JOGADOR_1 ? JOGADOR_2 : JOGADOR_1;

/** Monta a partida com a Receita 1 oficial de cada classe escolhida. */
export const montarPartidaLocal = (
  configuracao: ConfiguracaoLocal,
  semente = 'partida-local',
): EstadoDaPartida => {
  const montada = montarPartida({
    id: matchId(`local-${semente}`),
    semente,
    jogadores: [
      { id: JOGADOR_1, build: RECEITAS_INICIAIS[configuracao.classeDoJogador1] },
      { id: JOGADOR_2, build: RECEITAS_INICIAIS[configuracao.classeDoJogador2] },
    ],
  });
  if (!montada.ok) {
    // As Receitas oficiais são validadas por teste; chegar aqui é bug de
    // programação, não jogada inválida.
    throw new Error('Receita oficial inválida');
  }
  return montada.valor;
};

const escolhaPendenteDe = (partida: EstadoDaPartida): EscolhaPendente | undefined =>
  partida.escolhasPendentes[0];

/** O espaço de Ação em jogo na etapa atual, quando há um. */
const indiceDaEtapa = (etapa: EtapaLocal): IndiceDeAcao | null =>
  etapa.tipo === 'complementos' || etapa.tipo === 'resposta' ? etapa.indice : null;

/** O espaço de Ação que está declarado e ainda espera Resposta e resolução. */
const indiceDeclarado = (partida: EstadoDaPartida, jogador: PlayerId): IndiceDeAcao | null => {
  const dono = partida.jogadores.find((item) => item.id === jogador);
  const slot = dono?.acoes.find((item) => item.situacao === 'declarada');
  return slot?.indice ?? null;
};

/**
 * De quem é a vez, depois de um comando.
 *
 * A ordem é fixa: escolha pendente trava tudo; partida encerrada encerra; uma
 * Ação declarada e ainda não resolvida pertence a quem responde; fora disso,
 * é do jogador ativo.
 */
const proximaEtapa = (
  partida: EstadoDaPartida,
  pendenteDeResposta: { readonly indice: IndiceDeAcao; readonly atacante: PlayerId } | null,
): { readonly etapa: EtapaLocal; readonly aguardando: PlayerId } => {
  if (partida.situacao === 'encerrada') {
    return { etapa: { tipo: 'fim' }, aguardando: partida.jogadores[0].id };
  }

  const pendente = escolhaPendenteDe(partida);
  if (pendente !== undefined) {
    return { etapa: { tipo: 'escolha-pendente', escolha: pendente }, aguardando: pendente.jogador };
  }

  if (pendenteDeResposta !== null) {
    return {
      etapa: { tipo: 'resposta', ...pendenteDeResposta },
      aguardando: adversarioDe(pendenteDeResposta.atacante),
    };
  }

  const ativo = partida.turno?.jogadorAtivo ?? partida.jogadores[0].id;
  return { etapa: { tipo: 'acao' }, aguardando: ativo };
};

const avisosDosEventos = (eventos: readonly EventoUniversal[]): readonly AvisoDaPartida[] =>
  eventos
    .filter((evento) => evento.tipo === 'ruptura')
    .map((evento) => ({ tipo: 'ruptura', alvo: evento.alvo, bonus: evento.danoAdicional }));

export interface ControladorDePartidaLocal {
  readonly estado: () => EstadoDaSessao;
  /** Confirma que quem a etapa exige está com o aparelho. */
  readonly confirmarTroca: () => void;
  readonly declarar: (pedido: PedidoDeAcao) => void;
  /** Fecha a janela de complementos e entrega a Ação a quem responde. */
  readonly enviarAcao: () => void;
  readonly usarCartaDeClasse: (uso: UsoDeCartaDeClasse) => void;
  readonly ativarPassiva: (carta: CardId, escolhas?: EscolhasDaAcao) => void;
  readonly metamorfosear: (forma: FormaDoDruida) => void;
  readonly responder: (pedido: PedidoDeResposta) => void;
  readonly resolverEscolha: (carta: CardId) => void;
  readonly encerrarTurno: () => void;
  readonly limparErro: () => void;
  readonly aoMudar: (ouvinte: (estado: EstadoDaSessao) => void) => () => void;
}

export const criarControladorLocal = (
  configuracao: ConfiguracaoLocal,
  semente = 'partida-local',
): ControladorDePartidaLocal => {
  const montada = montarPartidaLocal(configuracao, semente);
  const iniciada = iniciar(montada, configuracao.comeca);
  if (!iniciada.ok) throw new Error('não foi possível iniciar a partida local');
  const aberta = abrirTurno(iniciada.valor.partida, configuracao.comeca);
  if (!aberta.ok) throw new Error('não foi possível abrir o primeiro turno');

  let sessao: EstadoDaSessao = {
    partida: aberta.valor.partida,
    etapa: { tipo: 'acao' },
    aguardando: configuracao.comeca,
    noAparelho: configuracao.comeca,
    avisos: [{ tipo: 'turno', jogador: configuracao.comeca, numero: 1 }],
    ultimoErro: null,
  };

  const ouvintes = new Set<(estado: EstadoDaSessao) => void>();
  const publicar = (proximo: EstadoDaSessao): void => {
    sessao = proximo;
    for (const ouvinte of ouvintes) ouvinte(sessao);
  };

  /** Aplica o resultado de um comando, recalculando de quem é a vez. */
  const avancar = (
    partida: EstadoDaPartida,
    eventos: readonly EventoUniversal[],
    pendenteDeResposta: { readonly indice: IndiceDeAcao; readonly atacante: PlayerId } | null,
    avisosExtras: readonly AvisoDaPartida[] = [],
    etapaForcada: EtapaLocal | null = null,
    donoDaEtapaForcada: PlayerId | null = null,
  ): void => {
    const calculada = proximaEtapa(partida, pendenteDeResposta);
    const { etapa, aguardando } =
      etapaForcada !== null &&
      donoDaEtapaForcada !== null &&
      partida.situacao !== 'encerrada' &&
      escolhaPendenteDe(partida) === undefined
        ? { etapa: etapaForcada, aguardando: donoDaEtapaForcada }
        : calculada;
    const novos = [...avisosDosEventos(eventos), ...avisosExtras];
    const fim: readonly AvisoDaPartida[] =
      partida.situacao === 'encerrada'
        ? [{ tipo: 'fim', vencedor: partida.desfecho?.vencedor ?? null }]
        : [];

    publicar({
      partida,
      etapa,
      aguardando,
      // Trocar de jogador tira o aparelho das mãos de quem estava com ele: a
      // cobertura entra antes de qualquer projeção nova ser calculada.
      noAparelho: aguardando === sessao.noAparelho ? sessao.noAparelho : null,
      avisos: [...novos, ...fim],
      ultimoErro: null,
    });
  };

  const recusar = (erro: ErroDeDominio): void => {
    publicar({ ...sessao, ultimoErro: erro });
  };

  return {
    estado: () => sessao,

    confirmarTroca: () => {
      publicar({ ...sessao, noAparelho: sessao.aguardando });
    },

    declarar: (pedido) => {
      const jogador = sessao.aguardando;
      const resposta = declarar(sessao.partida, jogador, pedido);
      if (!resposta.ok) {
        recusar(resposta.erro);
        return;
      }
      const depois = resposta.valor.partida;
      // O espaço é lido do estado, e não contado à parte: quem sabe onde a
      // carta entrou é o motor, e a contagem de Ações só avança na resolução.
      const indice = indiceDeclarado(depois, jogador);
      if (indice === null) {
        avancar(depois, resposta.valor.eventos, null);
        return;
      }
      // Quem atacou continua com o aparelho: é a janela dele para Ativar uma
      // Carta de Classe ou uma Passiva sobre a Ação que acabou de declarar.
      avancar(depois, resposta.valor.eventos, null, [], { tipo: 'complementos', indice }, jogador);
    },

    enviarAcao: () => {
      if (sessao.etapa.tipo !== 'complementos') return;
      const atacante = sessao.aguardando;
      avancar(sessao.partida, [], { indice: sessao.etapa.indice, atacante });
    },

    usarCartaDeClasse: (uso) => {
      const indice = indiceDaEtapa(sessao.etapa);
      if (indice === null) return;
      const resposta = usarCartaDeClasseNaAcao(sessao.partida, sessao.aguardando, indice, uso);
      if (!resposta.ok) {
        recusar(resposta.erro);
        return;
      }
      publicar({ ...sessao, partida: resposta.valor.partida, ultimoErro: null });
    },

    ativarPassiva: (carta, escolhas) => {
      const indice = indiceDaEtapa(sessao.etapa);
      if (indice === null) return;
      const resposta = ativarPassivaNaAcao(
        sessao.partida,
        sessao.aguardando,
        indice,
        carta,
        escolhas,
      );
      if (!resposta.ok) {
        recusar(resposta.erro);
        return;
      }
      publicar({ ...sessao, partida: resposta.valor.partida, ultimoErro: null });
    },

    metamorfosear: (forma) => {
      if (sessao.etapa.tipo !== 'acao') return;
      const resposta = usarMetamorfose(sessao.partida, sessao.aguardando, forma);
      if (!resposta.ok) {
        recusar(resposta.erro);
        return;
      }
      publicar({ ...sessao, partida: resposta.valor.partida, ultimoErro: null });
    },

    responder: (pedido) => {
      if (sessao.etapa.tipo !== 'resposta') return;
      const { indice, atacante } = sessao.etapa;
      const defensor = adversarioDe(atacante);

      let partida = sessao.partida;
      const eventos: EventoUniversal[] = [];

      if (pedido.tipo !== 'sem-resposta') {
        const dada = responder(partida, defensor, indice, pedido);
        if (!dada.ok) {
          recusar(dada.erro);
          return;
        }
        partida = dada.valor.partida;
        eventos.push(...dada.valor.eventos);
      }

      const resolvida = resolver(partida, atacante, indice);
      if (!resolvida.ok) {
        recusar(resolvida.erro);
        return;
      }
      eventos.push(...resolvida.valor.eventos);
      avancar(resolvida.valor.partida, eventos, null);
    },

    resolverEscolha: (carta) => {
      if (sessao.etapa.tipo !== 'escolha-pendente') return;
      const resposta = resolverEscolhaPendente(sessao.partida, sessao.etapa.escolha.jogador, carta);
      if (!resposta.ok) {
        recusar(resposta.erro);
        return;
      }
      avancar(resposta.valor.partida, resposta.valor.eventos, null);
    },

    encerrarTurno: () => {
      const jogador = sessao.aguardando;
      const fechada = fecharTurno(sessao.partida, jogador);
      if (!fechada.ok) {
        recusar(fechada.erro);
        return;
      }
      const proximo = fechada.valor.partida.turno?.jogadorAtivo;
      if (fechada.valor.partida.situacao === 'encerrada' || proximo === undefined) {
        avancar(fechada.valor.partida, fechada.valor.eventos, null);
        return;
      }

      const aberta2 = abrirTurno(fechada.valor.partida, proximo);
      if (!aberta2.ok) {
        recusar(aberta2.erro);
        return;
      }
      const numero = aberta2.valor.partida.turno?.numero ?? 0;
      avancar(aberta2.valor.partida, [...fechada.valor.eventos, ...aberta2.valor.eventos], null, [
        { tipo: 'turno', jogador: proximo, numero },
      ]);
    },

    limparErro: () => {
      publicar({ ...sessao, ultimoErro: null });
    },

    aoMudar: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
  };
};
