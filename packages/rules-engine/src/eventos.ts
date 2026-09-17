import type {
  CardId,
  CondicaoId,
  EscopoDaAnotacao,
  IndiceDeAcao,
  PlayerId,
  RecursoDeCusto,
  RespostaVoluntaria,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';

/*
 * Eventos canônicos do combate universal.
 *
 * O log registra comandos e resultados canônicos, não animações (§23). A
 * ordem dos eventos dentro de um comando é fixa e vem da ordem de resolução
 * documentada, de modo que reproduzir o log reconstrói o mesmo estado.
 */

export type EventoUniversal =
  | { readonly tipo: 'partida-iniciada'; readonly primeiroJogador: PlayerId }
  | { readonly tipo: 'turno-iniciado'; readonly jogador: PlayerId; readonly numero: number }
  | { readonly tipo: 'reserva-descartada'; readonly jogador: PlayerId; readonly valor: number }
  | { readonly tipo: 'ap-restaurado'; readonly jogador: PlayerId; readonly valor: number }
  | { readonly tipo: 'impulso-inicial-recebido'; readonly jogador: PlayerId }
  | { readonly tipo: 'guarda-restaurada'; readonly jogador: PlayerId; readonly valor: number }
  | {
      readonly tipo: 'murchar-aplicado';
      readonly jogador: PlayerId;
      readonly reducao: number;
      readonly guardaFinal: number;
    }
  | {
      readonly tipo: 'cooldown-avancado';
      readonly jogador: PlayerId;
      readonly paraAMao: readonly CardId[];
    }
  | { readonly tipo: 'passiva-prontificada'; readonly jogador: PlayerId; readonly carta: CardId }
  | {
      readonly tipo: 'carta-de-classe-prontificada';
      readonly jogador: PlayerId;
      readonly carta: CardId;
    }
  | {
      readonly tipo: 'acao-declarada';
      readonly jogador: PlayerId;
      readonly indice: IndiceDeAcao;
      readonly carta: CardId;
    }
  | {
      readonly tipo: 'custo-pago';
      readonly jogador: PlayerId;
      readonly ap: number;
      readonly reserva: number;
      readonly impulso: number;
      readonly recurso: number;
    }
  | { readonly tipo: 'lento-consumido'; readonly jogador: PlayerId; readonly restante: number }
  | {
      readonly tipo: 'resposta-registrada';
      readonly jogador: PlayerId;
      readonly indice: IndiceDeAcao;
      readonly resposta: RespostaVoluntaria;
    }
  | {
      readonly tipo: 'modificador-registrado';
      readonly indice: IndiceDeAcao;
      readonly dano: number;
      readonly impacto: number;
    }
  | {
      readonly tipo: 'impacto-aplicado';
      readonly alvo: PlayerId;
      readonly valor: number;
      readonly guardaAntes: number;
      readonly guardaDepois: number;
    }
  | { readonly tipo: 'ruptura'; readonly alvo: PlayerId; readonly danoAdicional: number }
  | { readonly tipo: 'ruptura-impedida'; readonly alvo: PlayerId }
  | {
      readonly tipo: 'dano-aplicado';
      readonly alvo: PlayerId;
      readonly valor: number;
      readonly vidaAntes: number;
      readonly vidaDepois: number;
    }
  | {
      readonly tipo: 'carta-para-cooldown';
      readonly jogador: PlayerId;
      readonly carta: CardId;
      readonly zona: ZonaDeCooldown;
    }
  | { readonly tipo: 'acao-resolvida'; readonly indice: IndiceDeAcao }
  | {
      readonly tipo: 'condicao-resolvida';
      readonly alvo: PlayerId;
      readonly condicao: CondicaoId;
      readonly vidaPerdida: number;
      readonly restante: number;
    }
  | { readonly tipo: 'passiva-revelada'; readonly jogador: PlayerId; readonly carta: CardId }
  | { readonly tipo: 'passiva-ativada'; readonly jogador: PlayerId; readonly carta: CardId }
  | {
      readonly tipo: 'carta-de-classe-ativada';
      readonly jogador: PlayerId;
      readonly carta: CardId;
    }
  | {
      readonly tipo: 'carta-de-classe-exaurida';
      readonly jogador: PlayerId;
      readonly carta: CardId;
    }
  | { readonly tipo: 'ultimate-consumida'; readonly jogador: PlayerId; readonly carta: CardId }
  | { readonly tipo: 'reserva-convertida'; readonly jogador: PlayerId; readonly valor: number }
  | { readonly tipo: 'impulso-inicial-descartado'; readonly jogador: PlayerId }
  | { readonly tipo: 'turno-encerrado'; readonly jogador: PlayerId; readonly numero: number }
  | {
      readonly tipo: 'recurso-alterado';
      readonly jogador: PlayerId;
      readonly recurso: RecursoDeCusto;
      readonly delta: number;
      readonly valor: number;
    }
  | {
      readonly tipo: 'anotacao-registrada';
      readonly jogador: PlayerId;
      readonly chave: string;
      readonly origem: CardId;
      readonly escopo: EscopoDaAnotacao;
      readonly valor: number;
    }
  | { readonly tipo: 'acao-extra-liberada'; readonly jogador: PlayerId; readonly origem: CardId }
  | { readonly tipo: 'defesa-inata-usada'; readonly jogador: PlayerId }
  | {
      readonly tipo: 'reducao-da-resposta';
      readonly jogador: PlayerId;
      readonly indice: IndiceDeAcao;
      readonly dano: number;
      readonly impacto: number;
    }
  | {
      readonly tipo: 'dano-final-definido';
      readonly indice: IndiceDeAcao;
      readonly valor: number;
    }
  | { readonly tipo: 'texto-cancelado'; readonly indice: IndiceDeAcao; readonly carta: CardId }
  | {
      readonly tipo: 'condicao-aplicada';
      readonly alvo: PlayerId;
      readonly condicao: CondicaoId;
      readonly quantidade: number;
      readonly total: number;
    }
  | {
      readonly tipo: 'condicao-removida';
      readonly alvo: PlayerId;
      readonly condicao: CondicaoId;
      readonly quantidade: number;
    }
  | {
      readonly tipo: 'carta-devolvida-a-mao';
      readonly jogador: PlayerId;
      readonly carta: CardId;
      readonly de: ZonaDeCooldown;
    }
  | {
      readonly tipo: 'carta-adiantada-no-cooldown';
      readonly jogador: PlayerId;
      readonly carta: CardId;
      readonly de: ZonaDeCooldown;
      readonly para: ZonaDeCooldown;
    }
  | {
      readonly tipo: 'guarda-ajustada';
      readonly jogador: PlayerId;
      readonly valor: number;
    }
  | {
      readonly tipo: 'vida-perdida';
      readonly alvo: PlayerId;
      readonly valor: number;
      readonly vidaDepois: number;
      readonly origem: CardId;
    }
  | { readonly tipo: 'ap-recuperado'; readonly jogador: PlayerId; readonly valor: number }
  | { readonly tipo: 'reserva-ganha'; readonly jogador: PlayerId; readonly valor: number }
  | {
      readonly tipo: 'carta-de-classe-prontificada-por-efeito';
      readonly jogador: PlayerId;
      readonly carta: CardId;
      readonly origem: CardId;
    }
  | {
      readonly tipo: 'partida-encerrada';
      readonly vencedor: PlayerId | null;
      readonly motivo: 'vida-zerada' | 'indefinido';
    };
