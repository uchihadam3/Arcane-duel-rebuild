import type {
  CardId,
  ClassId,
  PlayerId,
  RecursoDeCusto,
  TipoDeHabilidade,
} from '@arcane-duel/shared-types';

/*
 * Erros de domínio.
 *
 * São valores, não exceções: uma jogada ilegal é um resultado previsto do
 * motor, não um acidente. A união é discriminada por `tipo`, então quem trata
 * o erro consegue distinguir cada caso sem comparar texto solto.
 */

export type ErroDeDominio =
  | { readonly tipo: 'partida-nao-iniciada' }
  | { readonly tipo: 'partida-ja-iniciada' }
  | { readonly tipo: 'partida-encerrada' }
  | { readonly tipo: 'jogador-desconhecido'; readonly jogador: PlayerId }
  | { readonly tipo: 'turno-nao-iniciado' }
  | { readonly tipo: 'turno-ja-iniciado' }
  | { readonly tipo: 'fora-do-turno'; readonly jogador: PlayerId }
  | { readonly tipo: 'limite-de-acoes-atingido'; readonly limite: number }
  | { readonly tipo: 'ap-insuficiente'; readonly necessario: number; readonly disponivel: number }
  | {
      readonly tipo: 'reserva-insuficiente';
      readonly necessario: number;
      readonly disponivel: number;
    }
  | { readonly tipo: 'carta-fora-da-mao'; readonly carta: CardId }
  | { readonly tipo: 'moeda-de-custo-invalida'; readonly esperada: 'ap' | 'reserva' }
  | {
      readonly tipo: 'tipo-de-carta-invalido';
      readonly carta: CardId;
      readonly esperado: TipoDeHabilidade;
      readonly recebido: TipoDeHabilidade;
    }
  | { readonly tipo: 'acao-inexistente'; readonly indice: number }
  | { readonly tipo: 'acao-nao-declarada'; readonly indice: number }
  | { readonly tipo: 'acao-ja-resolvida'; readonly indice: number }
  | { readonly tipo: 'segunda-resposta-voluntaria'; readonly indice: number }
  | { readonly tipo: 'passiva-desconhecida'; readonly carta: CardId }
  | { readonly tipo: 'passiva-ainda-oculta'; readonly carta: CardId }
  | { readonly tipo: 'passiva-ja-revelada'; readonly carta: CardId }
  | { readonly tipo: 'passiva-nao-esta-pronta'; readonly carta: CardId }
  | { readonly tipo: 'carta-de-classe-desconhecida'; readonly carta: CardId }
  | { readonly tipo: 'carta-de-classe-nao-esta-pronta'; readonly carta: CardId }
  | { readonly tipo: 'carta-de-classe-ja-exaurida'; readonly carta: CardId }
  | { readonly tipo: 'carta-de-classe-ja-usada-nesta-acao'; readonly carta: CardId }
  | { readonly tipo: 'ultimate-ja-consumida' }
  | {
      readonly tipo: 'recurso-insuficiente';
      readonly recurso: RecursoDeCusto;
      readonly necessario: number;
      readonly disponivel: number;
    }
  | {
      readonly tipo: 'recurso-indisponivel';
      readonly recurso: RecursoDeCusto;
      readonly classe: ClassId;
    }
  /** A carta não existe no catálogo oficial. */
  | { readonly tipo: 'carta-desconhecida'; readonly carta: CardId }
  /** A carta existe, mas não pertence à build deste jogador. */
  | { readonly tipo: 'carta-fora-da-build'; readonly carta: CardId }
  /** A carta existe, mas não é da classe do jogador. */
  | { readonly tipo: 'carta-de-outra-classe'; readonly carta: CardId; readonly classe: ClassId }
  /** A escolha informada não é uma das opções impressas na carta. */
  | { readonly tipo: 'escolha-invalida'; readonly carta: CardId; readonly detalhe: string }
  /** A carta exige uma escolha que não veio. */
  | { readonly tipo: 'escolha-obrigatoria'; readonly carta: CardId; readonly detalhe: string }
  /** A condição impressa para jogar a carta não está satisfeita. */
  | {
      readonly tipo: 'condicao-de-uso-nao-satisfeita';
      readonly carta: CardId;
      readonly detalhe: string;
    }
  /** A quarta Ação só existe depois que uma carta a libera. */
  | { readonly tipo: 'acao-extra-nao-liberada' }
  /** A Defesa Inata já foi usada neste turno inimigo. */
  | { readonly tipo: 'defesa-inata-ja-usada' }
  | { readonly tipo: 'carta-fora-do-cooldown'; readonly carta: CardId }
  | { readonly tipo: 'condicao-acima-do-limite'; readonly limite: number }
  /**
   * A regra existe, mas o documento não define como duas regras interagem.
   * O motor recusa em vez de escolher uma interpretação por conta própria.
   */
  | { readonly tipo: 'interacao-nao-definida'; readonly detalhe: InteracaoNaoDefinida };

/** Interações que o FULL_GAME_SPEC.md ainda não resolve. */
export type InteracaoNaoDefinida = 'lento-com-impulso-inicial';
