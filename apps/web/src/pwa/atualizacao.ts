import type { SituacaoDoCliente } from './politica-de-atualizacao.js';
import { decidirAtualizacao, podeAplicarPendente } from './politica-de-atualizacao.js';

/*
 * O coordenador de atualização.
 *
 * Ele sabe **quando** perguntar por uma versão nova e o que fazer quando ela
 * chega. O que ele não sabe é como falar com o service worker: isso entra por
 * portas injetadas, e é o que torna todo este comportamento testável sem
 * navegador, sem service worker e sem recarregar nada.
 *
 * Quando perguntar:
 *
 * - ao abrir o aplicativo, imediatamente;
 * - quando o aplicativo volta do segundo plano;
 * - quando a conexão volta;
 * - de tempos em tempos enquanto ele está aberto, com intervalo folgado.
 *
 * Não há polling agressivo: a verificação periódica é a rede de segurança para
 * quem deixa o aplicativo aberto por horas, não o mecanismo principal.
 */

export type EstadoDaAtualizacao =
  /** Nada pendente: este é o build mais recente que o cliente conhece. */
  | 'em-dia'
  /** Perguntando ao servidor se existe versão nova. */
  | 'verificando'
  /** Versão nova encontrada: ativando e recarregando. */
  | 'aplicando'
  /** Versão nova pronta, mas a política mandou esperar (partida em andamento). */
  | 'pendente';

/** Intervalo da verificação periódica: folgado de propósito. */
export const INTERVALO_DE_VERIFICACAO_EM_MS = 30 * 60 * 1000;

export interface AlvoDeEventos {
  readonly addEventListener: (tipo: string, ouvinte: () => void) => void;
  readonly removeEventListener: (tipo: string, ouvinte: () => void) => void;
}

export interface FonteDeVisibilidade extends AlvoDeEventos {
  readonly visibilityState: DocumentVisibilityState;
}

export interface PortasDeAtualizacao {
  /** Pede ao navegador que procure um service worker mais recente. */
  readonly verificar: () => void | Promise<void>;
  /** Ativa o worker em espera e recarrega o cliente na versão nova. */
  readonly aplicar: () => void | Promise<void>;
  /** O que o jogador está fazendo agora. */
  readonly situacaoDoCliente: () => SituacaoDoCliente;
  /** Avisa quem desenha a tela que o estado mudou. */
  readonly aoMudarEstado: (estado: EstadoDaAtualizacao) => void;
  readonly janela: AlvoDeEventos;
  readonly documento: FonteDeVisibilidade;
  /** Agenda a verificação periódica e devolve como cancelá-la. */
  readonly agendar: (callback: () => void, intervaloEmMs: number) => () => void;
  readonly intervaloEmMs?: number;
}

export interface CoordenadorDeAtualizacao {
  /** Liga tudo e devolve como desligar. Já faz a primeira verificação. */
  readonly iniciar: () => () => void;
  /** O service worker avisou que existe uma versão nova pronta. */
  readonly aoEncontrarAtualizacao: () => void;
  /** Aplica uma atualização que ficou pendente, se já for seguro. */
  readonly aplicarPendente: () => void;
  /** Força a aplicação, para o botão de emergência da interface. */
  readonly aplicarAgora: () => void;
  /** Pergunta por uma versão nova fora dos gatilhos automáticos. */
  readonly verificarAgora: () => void;
  readonly estado: () => EstadoDaAtualizacao;
}

export const criarCoordenadorDeAtualizacao = (
  portas: PortasDeAtualizacao,
): CoordenadorDeAtualizacao => {
  let estado: EstadoDaAtualizacao = 'em-dia';
  /** Uma versão nova já está pronta em espera? */
  let temVersaoEmEspera = false;

  const mudarPara = (novo: EstadoDaAtualizacao): void => {
    if (estado === novo) return;
    estado = novo;
    portas.aoMudarEstado(novo);
  };

  /** O estado de repouso depende de haver ou não versão nova guardada. */
  const repousar = (): void => {
    mudarPara(temVersaoEmEspera ? 'pendente' : 'em-dia');
  };

  const aplicar = (): void => {
    mudarPara('aplicando');
    void Promise.resolve(portas.aplicar()).catch(() => {
      // Se a troca falhar, a versão nova continua em espera e o botão de
      // emergência continua valendo: o cliente não fica preso em "aplicando".
      repousar();
    });
  };

  const verificarAgora = (): void => {
    // Já está trocando de versão: perguntar de novo não muda nada.
    if (estado === 'aplicando') return;
    mudarPara('verificando');
    void Promise.resolve(portas.verificar())
      .catch(() => undefined)
      .then(() => {
        // `aoEncontrarAtualizacao` pode ter rodado no meio da verificação.
        if (estado === 'verificando') repousar();
      });
  };

  const aoEncontrarAtualizacao = (): void => {
    temVersaoEmEspera = true;
    if (decidirAtualizacao(portas.situacaoDoCliente()) === 'aplicar') {
      aplicar();
      return;
    }
    mudarPara('pendente');
  };

  const aplicarPendente = (): void => {
    if (!temVersaoEmEspera) return;
    if (!podeAplicarPendente(portas.situacaoDoCliente())) return;
    aplicar();
  };

  const aplicarAgora = (): void => {
    aplicar();
  };

  const iniciar = (): (() => void) => {
    const aoVoltarAoPrimeiroPlano = (): void => {
      if (portas.documento.visibilityState !== 'visible') return;
      // Voltar do segundo plano é o momento mais provável de existir build
      // nova: o aplicativo instalado costuma ficar semanas aberto em aba.
      verificarAgora();
      aplicarPendente();
    };
    const aoVoltarAConexao = (): void => {
      verificarAgora();
    };

    portas.documento.addEventListener('visibilitychange', aoVoltarAoPrimeiroPlano);
    portas.janela.addEventListener('focus', aoVoltarAoPrimeiroPlano);
    portas.janela.addEventListener('online', aoVoltarAConexao);

    const cancelarPeriodica = portas.agendar(
      verificarAgora,
      portas.intervaloEmMs ?? INTERVALO_DE_VERIFICACAO_EM_MS,
    );

    // A primeira verificação é agora, na abertura: é ela que faz o aplicativo
    // instalado deixar de mostrar a tela antiga.
    verificarAgora();

    return () => {
      portas.documento.removeEventListener('visibilitychange', aoVoltarAoPrimeiroPlano);
      portas.janela.removeEventListener('focus', aoVoltarAoPrimeiroPlano);
      portas.janela.removeEventListener('online', aoVoltarAConexao);
      cancelarPeriodica();
    };
  };

  return {
    iniciar,
    aoEncontrarAtualizacao,
    aplicarPendente,
    aplicarAgora,
    verificarAgora,
    estado: () => estado,
  };
};
