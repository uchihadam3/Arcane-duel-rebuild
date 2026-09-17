import type {
  CardId,
  EscolhasDaAcao,
  EstadoDaPartida,
  EstadoDeJogador,
  IndiceDeAcao,
  PerfilDeHabilidade,
  PlayerId,
  UsoDeCartaDeClasseNaAcao,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';
import type { DescontosDeCusto, ErroDeDominio } from '@arcane-duel/rules-engine';

import type { Contexto } from './contexto.js';

/*
 * As janelas do pipeline de efeitos.
 *
 * Cada janela existe porque o texto de alguma carta acontece exatamente nela.
 * Uma carta declara só as janelas que usa; o despachante percorre, em ordem
 * fixa, a carta da Ação, as Passivas reveladas e as Cartas de Classe usadas
 * naquela Ação.
 *
 * Ordem canônica de uma Ação:
 *
 *  1. `legalidade`      — a carta pode ser declarada agora?
 *  2. `descontos`       — o custo impresso é alterado antes de ser pago;
 *  3. `aoDeclarar`      — custo já pago, Ação ocupando o espaço;
 *  4. `aoResponder`     — o defensor colocou a Resposta dele;
 *  5. `antesDeResolver` — última chance de somar Dano, Impacto ou trava;
 *  6. resolução do motor;
 *  7. `aposResolver`    — Ruptura, Dano e cooldown já são fatos consumados.
 */
export type Janela =
  | 'legalidade'
  | 'descontos'
  | 'ao-declarar'
  | 'ao-responder'
  | 'antes-de-resolver'
  | 'apos-resolver'
  | 'inicio-do-turno'
  | 'fim-do-turno';

/** Quem é quem na Ação em que o efeito está rodando. */
export interface AlvoDoEfeito {
  /** Quem controla a carta cujo texto está rodando. */
  readonly dono: PlayerId;
  readonly atacante: PlayerId;
  readonly defensor: PlayerId;
  readonly indice: IndiceDeAcao;
  /** A carta cujo texto está rodando. */
  readonly origem: CardId;
  /** A carta declarada na Ação. */
  readonly perfil: PerfilDeHabilidade;
  /** A carta de Reação usada como Resposta, quando houve uma. */
  readonly reacao: PerfilDeHabilidade | null;
  /** Posição desta Ação no turno, começando em 1. */
  readonly ordem: number;
}

/** O que aconteceu de fato quando a Ação resolveu. */
export interface ResumoDaResolucao {
  readonly houveAtaque: boolean;
  readonly dano: number;
  readonly impacto: number;
  /** Quanto de Guarda o Ataque realmente tirou — nunca mais do que havia. */
  readonly guardaRemovida: number;
  readonly ruptura: boolean;
  readonly rupturaImpedida: boolean;
  readonly houveReacao: boolean;
  readonly zonaDeCooldown: ZonaDeCooldown | null;
  readonly vidaPerdidaPeloDefensor: number;
  /**
   * O Ataque teria causado Ruptura sem a redução da Resposta?
   *
   * É a contrafactual que cartas como Base Firme perguntam ("se isso impedir
   * uma Ruptura"). Ela é calculada por previsão antes da resolução, e não
   * resolvendo a Ação duas vezes.
   */
  readonly teriaRompidoSemResposta: boolean;
}

/**
 * Tudo que um efeito pode consultar antes de a jogada acontecer, sem alterar
 * nada.
 *
 * As escolhas informadas entram aqui porque é **antes** de pagar o custo que se
 * decide se uma escolha obrigatória veio ou não. Depois de pagar já é tarde: o
 * comando teria alterado o estado para então descobrir que falta uma decisão.
 */
export interface ConsultaDeCusto {
  readonly partida: EstadoDaPartida;
  readonly jogador: EstadoDeJogador;
  readonly adversario: EstadoDeJogador;
  readonly perfil: PerfilDeHabilidade;
  readonly ordem: number;
  /** As escolhas que o jogador mandou junto com o comando. */
  readonly escolhas: EscolhasDaAcao;
  /** As Cartas de Classe que ele pediu para usar nesta jogada. */
  readonly cartasDeClasse: readonly UsoDeCartaDeClasseNaAcao[];
  /** Quanto de recurso de classe esta jogada vai gastar, com a parcela variável. */
  readonly recursoPrevisto: number;
}

/** Tudo que uma checagem de legalidade pode consultar. */
export type ConsultaDeLegalidade = ConsultaDeCusto;

export type Gancho = (ctx: Contexto, alvo: AlvoDoEfeito) => void;
export type GanchoDeResolucao = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  resumo: ResumoDaResolucao,
) => void;

/**
 * O comportamento impresso de uma carta.
 *
 * Todas as janelas são opcionais: a maioria das cartas usa uma ou duas. O texto
 * transcrito fica no catálogo; aqui fica só o que ele faz.
 */
export interface EfeitoDeCarta {
  /** Devolve o motivo da recusa, ou `null` quando a carta pode ser jogada. */
  readonly legalidade?: (consulta: ConsultaDeLegalidade) => string | null;
  /**
   * Confere as escolhas que o texto da carta exige.
   *
   * Devolve um erro tipado quando falta uma escolha obrigatória ou quando a
   * escolha informada não é uma das opções impressas. O motor **nunca** escolhe
   * no lugar do jogador: sem a escolha, a jogada é recusada.
   */
  readonly validarEscolhas?: (consulta: ConsultaDeCusto) => ErroDeDominio | null;
  readonly descontos?: (consulta: ConsultaDeCusto) => DescontosDeCusto;
  readonly aoDeclarar?: Gancho;
  readonly aoResponder?: Gancho;
  readonly antesDeResolver?: Gancho;
  readonly aposResolver?: GanchoDeResolucao;
}

/** Os dois efeitos distintos de uma Carta de Classe (§13). */
export interface EfeitoDeCartaDeClasse {
  /** Efeito renovável: a carta gira e volta a ficar Pronta no início do turno. */
  readonly ativar: EfeitoDeCarta;
  /** Efeito extremo: a carta sai da partida em definitivo. */
  readonly exaurir: EfeitoDeCarta;
}

/** Gatilhos em que uma Passiva pode se revelar (§12). */
export type GatilhoDeRevelacao =
  | 'inicio-do-turno'
  | 'fim-do-turno'
  | 'ao-declarar'
  | 'ao-responder'
  | 'antes-de-resolver'
  | 'apos-resolver'
  | 'ao-mudar-recurso';

export interface ContextoDeRevelacao {
  readonly gatilho: GatilhoDeRevelacao;
  readonly dono: PlayerId;
  readonly alvo: AlvoDoEfeito | null;
  readonly resumo: ResumoDaResolucao | null;
}

/**
 * O efeito renovável de uma Passiva cujo texto diz "Ative e gaste...".
 *
 * Ativar é escolha do jogador, e ele a faz com um comando próprio durante a
 * Ação inimiga. O motor nunca Ativa sozinho nem gasta recurso por ele.
 */
export interface AtivacaoDePassiva {
  /** As condições impressas para a Ativação valerem alguma coisa agora. */
  readonly podeAtivar: (ctx: Contexto, alvo: AlvoDoEfeito) => boolean;
  /** O que a Ativação faz, já com o custo dela. */
  readonly aplicar: (ctx: Contexto, alvo: AlvoDoEfeito) => void;
}

export interface EfeitoDePassiva extends EfeitoDeCarta {
  /** A condição impressa de revelação aconteceu agora? */
  readonly revelaEm: (ctx: Contexto, revelacao: ContextoDeRevelacao) => boolean;
  /** O que a revelação em si faz, além de virar a carta. */
  readonly aoRevelar?: (ctx: Contexto, revelacao: ContextoDeRevelacao) => void;
  /** Presente só nas Passivas que o jogador Ativa explicitamente. */
  readonly ativacao?: AtivacaoDePassiva;
}

export const SEM_DESCONTO: DescontosDeCusto = {};
