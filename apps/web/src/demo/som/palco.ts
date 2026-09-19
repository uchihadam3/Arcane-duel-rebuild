import type { EventoUniversal } from '@arcane-duel/rules-engine';

import type { EstadoDaDemo } from '../sessao.js';
import { HUMANO } from '../sessao.js';

import type { MusicaAdaptativa } from './musica.js';
import { criarMusica, tensaoDaPartida } from './musica.js';
import type { Destino } from './sintese.js';
import { criarAmbienteDeArena } from './sintese.js';
import type { Barramento, EventoDaDemo } from './vozes.js';
import { BARRAMENTO_DO_EVENTO, DUCKING_DO_EVENTO, tocarVoz } from './vozes.js';

/*
 * O palco sonoro.
 *
 * Ele mantém a arquitetura do `AudioDirector`: um grafo só, três barramentos
 * com volume independente — música, interface, efeitos —, e o som saindo no
 * mesmo instante em que o estado muda. O que mudou em relação à Etapa 6 é o
 * que sai: camadas em vez de um oscilador, e uma reverberação de arena por
 * onde as caudas passam.
 *
 * Ele lê o **estado publicado**, que é a projeção do humano. A música não
 * conhece carta escondida, e por isso não pode vazar informação por som — o
 * que seria uma forma silenciosa de trapaça.
 *
 * O navegador só libera áudio depois de um gesto. Enquanto não houver gesto,
 * tudo aqui é silêncio — nunca erro.
 */

export interface PalcoSonoro {
  readonly tocarInterface: (evento: EventoDaDemo) => void;
  readonly tocarEfeito: (evento: EventoDaDemo) => void;
  /** Lê o estado novo e toca o que ele significa. */
  readonly reagir: (estado: EstadoDaDemo) => void;
  readonly silenciar: (silencioso: boolean) => void;
  readonly silencioso: () => boolean;
  readonly descartar: () => void;
}

interface Grafo {
  readonly contexto: AudioContext;
  readonly barramentos: Readonly<Record<Barramento | 'musica', GainNode>>;
  readonly ambiente: GainNode;
  readonly musica: MusicaAdaptativa;
}

const criarContexto = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Construtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (Construtor === undefined) return null;
  try {
    return new Construtor();
  } catch {
    // Política de autoplay, aba sem permissão, navegador sem Web Audio: som é
    // acessório, e a partida nunca pode cair por causa dele.
    return null;
  }
};

const montarGrafo = (): Grafo | null => {
  const contexto = criarContexto();
  if (contexto === null) return null;

  /*
   * Um compressor no fim da cadeia.
   *
   * Uma Ultimate soma explosão, grave longo e música: sem compressão isso
   * satura no alto-falante do telefone e vira chiado justamente no momento que
   * deveria impressionar.
   */
  const mestre = contexto.createDynamicsCompressor();
  mestre.threshold.value = -14;
  mestre.knee.value = 24;
  mestre.ratio.value = 4;
  mestre.attack.value = 0.004;
  mestre.release.value = 0.22;
  mestre.connect(contexto.destination);

  const reverberacao = contexto.createConvolver();
  reverberacao.buffer = criarAmbienteDeArena(contexto);
  const ambiente = contexto.createGain();
  ambiente.gain.value = 0.9;
  ambiente.connect(reverberacao);
  reverberacao.connect(mestre);

  const barramentos = {
    musica: contexto.createGain(),
    interface: contexto.createGain(),
    efeitos: contexto.createGain(),
  } as const;
  barramentos.musica.gain.value = 1;
  barramentos.interface.gain.value = 0.85;
  barramentos.efeitos.gain.value = 0.95;
  for (const chave of ['musica', 'interface', 'efeitos'] as const) {
    barramentos[chave].connect(mestre);
  }

  const musica = criarMusica(contexto, barramentos.musica);
  return { contexto, barramentos, ambiente, musica };
};

/*
 * Do evento canônico ao som.
 *
 * O log de eventos é o registro público da partida — é ele que diz o que
 * aconteceu, e não o desenho. Cada tipo vira uma ou mais vozes; o que não tem
 * tradução fica em silêncio, o que é melhor do que inventar um som genérico
 * para tudo.
 */
const vozesDoEvento = (evento: EventoUniversal): readonly EventoDaDemo[] => {
  switch (evento.tipo) {
    case 'ruptura':
      return ['ruptura'];
    case 'dano-aplicado':
      return evento.valor >= 5 ? ['impacto-pesado'] : ['metal'];
    case 'impacto-aplicado':
      // Guarda que cai faz barulho de pedra: é o feedback de que o escudo
      // cedeu, e ele precisa existir mesmo quando não houve Ruptura.
      return evento.guardaDepois < evento.guardaAntes ? ['detrito'] : [];
    case 'carta-para-cooldown':
      return ['deslizar'];
    case 'turno-iniciado':
      return ['virar-turno'];
    case 'partida-encerrada':
      return [];
    default:
      return [];
  }
};

const VIDA_INICIAL = 30;

export const criarPalco = (): PalcoSonoro => {
  let grafo: Grafo | null = null;
  let destravado = false;
  let mudo = false;
  let ultimoLote = 0;
  let musicaNoAr = false;

  const ativo = (): Grafo | null => {
    if (grafo !== null) return grafo;
    grafo = montarGrafo();
    return grafo;
  };

  const destinoDe = (barramento: Barramento): Destino | null => {
    const atual = ativo();
    if (atual === null) return null;
    return {
      contexto: atual.contexto,
      entrada: atual.barramentos[barramento],
      ambiente: atual.ambiente,
    };
  };

  const destravar = (): void => {
    const atual = ativo();
    if (atual === null) return;
    if (atual.contexto.state === 'suspended') void atual.contexto.resume();
    destravado = true;
    if (!musicaNoAr && !mudo) {
      atual.musica.iniciar();
      musicaNoAr = true;
    }
  };

  const tocar = (evento: EventoDaDemo): void => {
    if (mudo) return;
    const barramento = BARRAMENTO_DO_EVENTO[evento];
    const destino = destinoDe(barramento);
    if (destino === null) return;
    tocarVoz(destino, evento);

    /*
     * A música cede o espaço, e volta.
     *
     * Nenhum momento grande pode ser engolido pela trilha — a tarefa é
     * explícita nisso. O abafamento é proporcional ao evento e a volta é
     * lenta, para o jogador não perceber o mecanismo.
     */
    const quanto = DUCKING_DO_EVENTO[evento];
    if (quanto !== undefined) {
      const atual = ativo();
      atual?.musica.abafar(quanto, evento.startsWith('ultimate') ? 1400 : 700);
    }
  };

  return {
    tocarInterface: (evento) => {
      // O primeiro toque do jogador é o que libera o áudio no navegador.
      if (!destravado) destravar();
      tocar(evento);
    },

    tocarEfeito: (evento) => {
      tocar(evento);
    },

    reagir: (estado) => {
      const atual = ativo();
      if (atual === null) return;

      const eu = estado.visao.jogadores.find((jogador) => jogador.id === HUMANO);
      const ela = estado.visao.jogadores.find((jogador) => jogador.id !== HUMANO);
      if (eu !== undefined && ela !== undefined) {
        atual.musica.definirTensao(
          tensaoDaPartida({
            vidaDoJogador: eu.vida,
            vidaDaMaquina: ela.vida,
            vidaInicial: VIDA_INICIAL,
            guardaDoJogador: eu.guarda,
            guardaDaMaquina: ela.guarda,
            ultimateDisponivel:
              eu.ultimate.estado === 'disponivel' || ela.ultimate.estado === 'disponivel',
          }),
        );
      }

      // Um lote só toca uma vez: o estado é republicado a cada render.
      if (estado.lote === ultimoLote) return;
      ultimoLote = estado.lote;

      const vistos = new Set<EventoDaDemo>();
      for (const evento of estado.eventos) {
        for (const voz of vozesDoEvento(evento)) {
          if (vistos.has(voz)) continue;
          vistos.add(voz);
          tocar(voz);
        }
      }

      if (estado.etapa.tipo === 'fim') {
        tocar(estado.visao.desfecho?.vencedor === HUMANO ? 'vitoria' : 'derrota');
      }
    },

    silenciar: (silencioso) => {
      mudo = silencioso;
      const atual = ativo();
      if (atual === null) return;
      atual.musica.definirVolume(silencioso ? 0.0001 : 0.34);
    },

    silencioso: () => mudo,

    descartar: () => {
      const atual = grafo;
      grafo = null;
      musicaNoAr = false;
      if (atual === null) return;
      atual.musica.parar();
      // Um encerramento seco cortaria a cauda no meio; a espera deixa a sala
      // terminar de soar antes de o contexto sumir.
      setTimeout(() => {
        void atual.contexto.close();
      }, 1400);
    },
  };
};
