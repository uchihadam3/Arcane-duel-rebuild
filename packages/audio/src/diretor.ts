import type { BarramentoDeAudio, EventoSonoro, VolumesDeAudio } from './vocabulario.js';
import { VOLUMES_PADRAO } from './vocabulario.js';

/*
 * O diretor de áudio.
 *
 * Um ponto único por onde todo som passa. A razão é prática: `new Audio()`
 * espalhado por componente torna impossível mixar, silenciar, respeitar a
 * preferência do jogador e — o que mais importa nesta etapa — garantir que o
 * som do impacto nasça no **mesmo quadro** que o impacto visual (§41).
 *
 * A síntese é procedural, por Web Audio, e é temporária. Não há um único
 * arquivo de som baixado da internet no repositório: a Etapa 13 produz a
 * biblioteca final e substitui `sintetizar` sem tocar em quem chama.
 */

/** Uma voz sintetizada: o mínimo para caracterizar um som sem amostra. */
interface Voz {
  readonly onda: OscillatorType;
  /** Frequência inicial e final, em hertz. O deslize dá peso ou brilho. */
  readonly de: number;
  readonly para: number;
  readonly duracaoMs: number;
  readonly ganho: number;
  /** Ruído somado ao tom: é o que separa um impacto de um sino. */
  readonly ruido: number;
  /** Corte do filtro passa-baixa, em hertz. Grave = pesado. */
  readonly corte: number;
  readonly atraso: number;
}

const voz = (parcial: Partial<Voz>): Voz => ({
  onda: 'sine',
  de: 440,
  para: 440,
  duracaoMs: 160,
  ganho: 0.5,
  ruido: 0,
  corte: 8000,
  atraso: 0,
  ...parcial,
});

/**
 * A assinatura de cada evento.
 *
 * O Guerreiro puxa para grave, curto e com ruído — massa batendo em metal. O
 * Mago puxa para agudo, com deslize de frequência e pouco ruído — energia
 * concentrada. Os eventos neutros ficam no meio.
 */
const ASSINATURAS: Readonly<Record<EventoSonoro, readonly Voz[]>> = {
  'selecionar-carta': [voz({ onda: 'triangle', de: 620, para: 780, duracaoMs: 70, ganho: 0.18 })],
  'colocar-carta-em-acao': [
    voz({ onda: 'triangle', de: 300, para: 180, duracaoMs: 130, ganho: 0.3, ruido: 0.25 }),
  ],
  'declarar-reacao': [
    voz({ onda: 'sawtooth', de: 240, para: 420, duracaoMs: 150, ganho: 0.28, corte: 3200 }),
  ],
  'aplicar-dano': [
    voz({
      onda: 'square',
      de: 180,
      para: 70,
      duracaoMs: 180,
      ganho: 0.42,
      ruido: 0.55,
      corte: 1800,
    }),
  ],
  'aplicar-impacto': [
    voz({ onda: 'triangle', de: 420, para: 150, duracaoMs: 150, ganho: 0.34, ruido: 0.2 }),
  ],
  ruptura: [
    voz({ onda: 'square', de: 140, para: 48, duracaoMs: 260, ganho: 0.5, ruido: 0.7, corte: 1200 }),
    voz({ onda: 'sawtooth', de: 1400, para: 320, duracaoMs: 320, ganho: 0.22, atraso: 40 }),
  ],
  'revelar-passiva': [
    voz({ onda: 'sine', de: 520, para: 880, duracaoMs: 240, ganho: 0.26 }),
    voz({ onda: 'sine', de: 1320, para: 1320, duracaoMs: 180, ganho: 0.12, atraso: 90 }),
  ],
  'ativar-carta-de-classe': [
    voz({ onda: 'triangle', de: 360, para: 540, duracaoMs: 180, ganho: 0.3 }),
  ],
  'exaurir-carta-de-classe': [
    voz({
      onda: 'sawtooth',
      de: 300,
      para: 60,
      duracaoMs: 420,
      ganho: 0.42,
      ruido: 0.4,
      corte: 1600,
    }),
  ],
  'usar-ultimate': [
    voz({ onda: 'sawtooth', de: 90, para: 240, duracaoMs: 520, ganho: 0.4, corte: 2400 }),
    voz({
      onda: 'square',
      de: 700,
      para: 180,
      duracaoMs: 360,
      ganho: 0.26,
      ruido: 0.3,
      atraso: 180,
    }),
  ],
  'mudar-turno': [voz({ onda: 'sine', de: 300, para: 460, duracaoMs: 260, ganho: 0.24 })],
  vitoria: [
    voz({ onda: 'triangle', de: 440, para: 660, duracaoMs: 420, ganho: 0.3 }),
    voz({ onda: 'triangle', de: 660, para: 880, duracaoMs: 460, ganho: 0.24, atraso: 200 }),
  ],
  derrota: [voz({ onda: 'sine', de: 280, para: 120, duracaoMs: 560, ganho: 0.28, corte: 1400 })],
  'desbloquear-receita': [
    voz({ onda: 'triangle', de: 520, para: 1040, duracaoMs: 380, ganho: 0.28 }),
  ],
};

/** Em que barramento cada evento toca. */
const BARRAMENTO: Readonly<Record<EventoSonoro, BarramentoDeAudio>> = {
  'selecionar-carta': 'interface',
  'colocar-carta-em-acao': 'interface',
  'declarar-reacao': 'interface',
  'aplicar-dano': 'efeitos',
  'aplicar-impacto': 'efeitos',
  ruptura: 'efeitos',
  'revelar-passiva': 'efeitos',
  'ativar-carta-de-classe': 'efeitos',
  'exaurir-carta-de-classe': 'efeitos',
  'usar-ultimate': 'efeitos',
  'mudar-turno': 'interface',
  vitoria: 'musica',
  derrota: 'musica',
  'desbloquear-receita': 'interface',
};

export const barramentoDoEvento = (evento: EventoSonoro): BarramentoDeAudio => BARRAMENTO[evento];

/** As vozes de um evento, expostas para teste — nenhum evento fica sem som. */
export const assinaturaDoEvento = (evento: EventoSonoro): readonly Voz[] => ASSINATURAS[evento];

export interface DiretorDeAudio {
  /** Toca agora. Chamar sem contexto de áudio disponível é um silêncio, não um erro. */
  readonly tocar: (evento: EventoSonoro) => void;
  readonly definirVolumes: (volumes: VolumesDeAudio) => void;
  readonly silenciar: (silencioso: boolean) => void;
  readonly silencioso: () => boolean;
  /** O navegador só libera áudio depois de um gesto; isto é chamado no primeiro toque. */
  readonly destravar: () => void;
  readonly encerrar: () => void;
}

/** O que o diretor precisa do navegador. Injetável, para o teste não precisar de um. */
export interface FabricaDeContexto {
  readonly criar: () => AudioContext | null;
}

const CONTEXTO_INDISPONIVEL: FabricaDeContexto = { criar: () => null };

const ruidoBranco = (contexto: AudioContext, duracaoMs: number): AudioBufferSourceNode => {
  const quadros = Math.max(1, Math.floor((contexto.sampleRate * duracaoMs) / 1000));
  const buffer = contexto.createBuffer(1, quadros, contexto.sampleRate);
  const canal = buffer.getChannelData(0);
  for (let i = 0; i < quadros; i += 1) canal[i] = Math.random() * 2 - 1;
  const fonte = contexto.createBufferSource();
  fonte.buffer = buffer;
  return fonte;
};

export const criarDiretorDeAudio = (
  fabrica: FabricaDeContexto = CONTEXTO_INDISPONIVEL,
): DiretorDeAudio => {
  let contexto: AudioContext | null = null;
  let volumes = VOLUMES_PADRAO;
  let mudo = false;

  const contextoAtivo = (): AudioContext | null => {
    if (contexto !== null) return contexto;
    try {
      contexto = fabrica.criar();
    } catch {
      // Navegador sem áudio, política de autoplay, aba sem permissão: som é
      // acessório e a partida nunca pode cair por causa dele.
      contexto = null;
    }
    return contexto;
  };

  const tocarVoz = (ctx: AudioContext, v: Voz, ganhoDoBarramento: number): void => {
    const inicio = ctx.currentTime + v.atraso / 1000;
    const fim = inicio + v.duracaoMs / 1000;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, inicio);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, v.ganho * ganhoDoBarramento),
      inicio + 0.008,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, fim);

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(v.corte, inicio);

    envelope.connect(filtro);
    filtro.connect(ctx.destination);

    const oscilador = ctx.createOscillator();
    oscilador.type = v.onda;
    oscilador.frequency.setValueAtTime(v.de, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(Math.max(20, v.para), fim);
    oscilador.connect(envelope);
    oscilador.start(inicio);
    oscilador.stop(fim);

    if (v.ruido > 0) {
      const fonte = ruidoBranco(ctx, v.duracaoMs);
      const ganhoDoRuido = ctx.createGain();
      ganhoDoRuido.gain.setValueAtTime(v.ruido * v.ganho * ganhoDoBarramento, inicio);
      ganhoDoRuido.gain.exponentialRampToValueAtTime(0.0001, fim);
      fonte.connect(ganhoDoRuido);
      ganhoDoRuido.connect(filtro);
      fonte.start(inicio);
      fonte.stop(fim);
    }
  };

  return {
    tocar: (evento) => {
      if (mudo) return;
      const ctx = contextoAtivo();
      if (ctx === null) return;
      const ganho = volumes[BARRAMENTO[evento]];
      if (ganho <= 0) return;
      try {
        for (const v of ASSINATURAS[evento]) tocarVoz(ctx, v, ganho);
      } catch {
        // Áudio é acessório: uma falha aqui nunca pode derrubar a partida.
      }
    },

    definirVolumes: (proximos) => {
      volumes = proximos;
    },

    silenciar: (silencioso) => {
      mudo = silencioso;
    },

    silencioso: () => mudo,

    destravar: () => {
      const ctx = contextoAtivo();
      if (ctx !== null && ctx.state === 'suspended') void ctx.resume();
    },

    encerrar: () => {
      if (contexto !== null) void contexto.close();
      contexto = null;
    },
  };
};
