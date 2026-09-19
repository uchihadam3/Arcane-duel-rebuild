/*
 * A trilha original da Demo V2.
 *
 * Objetivo declarado na tarefa: **ser agradável por vários minutos**, e não um
 * loop de oito segundos. Três coisas resolvem isso, e nenhuma delas é volume:
 *
 * 1. **Harmonia que anda.** Oito compassos de progressão em Ré menor, não um
 *    acorde só. O ouvido acompanha uma cadência; ele desiste de um bordão.
 * 2. **Variação determinística.** O arpejo escolhe a nota por um gerador
 *    pseudoaleatório semeado: ele nunca repete exatamente o mesmo compasso
 *    dentro de um ciclo longo, e mesmo assim é reproduzível.
 * 3. **Camadas que entram pela partida.** Exploração, pressão e clímax não são
 *    faixas diferentes: são vozes da mesma música, com ganhos que a tensão
 *    move. A transição é sempre uma rampa de segundos, nunca um corte.
 *
 * Nada aqui é sampleado e nada vem de terceiros. São osciladores e ruído,
 * escritos aqui, com a progressão e o desenho melódico definidos abaixo.
 *
 * O que **não** foi resolvido, e fica registrado em vez de vendido: síntese
 * subtrativa simples não produz timbre de cordas de verdade. O que existe aqui
 * é uma cama sintética convincente para um protótipo, e não uma trilha
 * orquestral. Trocar estas vozes por gravação original é trabalho próprio, e a
 * arquitetura já separa as duas coisas.
 */

export type CamadaMusical = 'exploracao' | 'pressao' | 'climax';

export const CAMADAS: readonly CamadaMusical[] = ['exploracao', 'pressao', 'climax'];

/** 76 batidas por minuto: passo de marcha lenta, não de perseguição. */
const ANDAMENTO = 76;
const SEGUNDOS_POR_BATIDA = 60 / ANDAMENTO;
const BATIDAS_POR_COMPASSO = 4;

/*
 * A progressão, em graus de Ré menor natural.
 *
 * Dm – Bb – F – C – Dm – Gm – Aadd9 – Dm
 *
 * Os dois compassos finais são o que sustenta a repetição: o A prepara a volta
 * ao Dm, e o ouvido aceita recomeçar porque foi conduzido até lá.
 */
interface Acorde {
  /** Fundamental em hertz, já na oitava grave da cama. */
  readonly fundamental: number;
  /** Os intervalos do acorde, em semitons acima da fundamental. */
  readonly intervalos: readonly number[];
}

const SEMITOM = 2 ** (1 / 12);
const nota = (base: number, semitons: number): number => base * SEMITOM ** semitons;

const RE = 73.42; // D2

const DM: Acorde = { fundamental: RE, intervalos: [0, 3, 7] };

const PROGRESSAO: readonly Acorde[] = [
  { fundamental: RE, intervalos: [0, 3, 7] }, // Dm
  { fundamental: nota(RE, -4), intervalos: [0, 4, 7] }, // Bb
  { fundamental: nota(RE, 3), intervalos: [0, 4, 7] }, // F
  { fundamental: nota(RE, -2), intervalos: [0, 4, 7] }, // C
  { fundamental: RE, intervalos: [0, 3, 7] }, // Dm
  { fundamental: nota(RE, 5), intervalos: [0, 3, 7] }, // Gm
  { fundamental: nota(RE, 7), intervalos: [0, 4, 7, 14] }, // A add9
  { fundamental: RE, intervalos: [0, 3, 7] }, // Dm
];

/** A escala de onde o arpejo tira as notas: Ré menor natural, duas oitavas. */
const ESCALA: readonly number[] = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19];

/** Gerador determinístico: a mesma partida soa igual, e nenhum compasso repete. */
const criarSorteio = (semente: number): (() => number) => {
  let estado = semente >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x1_0000_0000;
  };
};

export interface MusicaAdaptativa {
  readonly iniciar: () => void;
  /** Define a tensão da partida, de 0 a 1. As camadas seguem. */
  readonly definirTensao: (tensao: number) => void;
  /** Abaixa a música por um tempo, para um momento grande respirar. */
  readonly abafar: (quanto: number, duracaoMs: number) => void;
  readonly definirVolume: (volume: number) => void;
  readonly parar: () => void;
  /** O ganho atual de cada camada. Exposto para o teste medir a mixagem. */
  readonly ganhoDaCamada: (camada: CamadaMusical) => number;
}

interface Vozes {
  readonly saida: GainNode;
  readonly porCamada: Readonly<Record<CamadaMusical, GainNode>>;
}

const montarVozes = (contexto: AudioContext, destino: AudioNode): Vozes => {
  const saida = contexto.createGain();
  saida.gain.value = 0.0001;
  saida.connect(destino);

  const porCamada = {
    exploracao: contexto.createGain(),
    pressao: contexto.createGain(),
    climax: contexto.createGain(),
  } as const;

  porCamada.exploracao.gain.value = 1;
  porCamada.pressao.gain.value = 0.0001;
  porCamada.climax.gain.value = 0.0001;
  for (const camada of CAMADAS) porCamada[camada].connect(saida);

  return { saida, porCamada };
};

/**
 * Quanto cada camada soa, dada a tensão.
 *
 * As faixas se sobrepõem de propósito: entre 0,35 e 0,5 as duas primeiras
 * tocam juntas, e é nessa sobreposição que a música parece crescer em vez de
 * trocar. Corte seco entre camadas é o que denuncia música adaptativa mal
 * feita.
 */
export const mixagemDaTensao = (tensao: number): Readonly<Record<CamadaMusical, number>> => {
  const t = Math.max(0, Math.min(1, tensao));
  return {
    exploracao: 1,
    pressao: Math.max(0, Math.min(1, (t - 0.3) / 0.3)),
    climax: Math.max(0, Math.min(1, (t - 0.68) / 0.22)),
  };
};

export const criarMusica = (
  contexto: AudioContext,
  destino: AudioNode,
  semente = 20260919,
): MusicaAdaptativa => {
  const vozes = montarVozes(contexto, destino);
  const sorteio = criarSorteio(semente);

  let tocando = false;
  let volume = 0.34;
  let compasso = 0;
  let proximoInicio = 0;
  let relogio: ReturnType<typeof setInterval> | null = null;
  let mixagem = mixagemDaTensao(0);

  /** Uma nota sustentada da cama harmônica: duas serras desafinadas. */
  const pad = (frequencia: number, inicio: number, duracao: number, ganho: number): void => {
    const envelope = contexto.createGain();
    envelope.gain.setValueAtTime(0.0001, inicio);
    envelope.gain.exponentialRampToValueAtTime(ganho, inicio + duracao * 0.35);
    envelope.gain.setValueAtTime(ganho, inicio + duracao * 0.6);
    envelope.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

    const filtro = contexto.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(420, inicio);
    filtro.frequency.linearRampToValueAtTime(900, inicio + duracao * 0.5);
    filtro.frequency.linearRampToValueAtTime(380, inicio + duracao);
    filtro.Q.value = 0.8;

    filtro.connect(envelope);
    envelope.connect(vozes.porCamada.exploracao);

    for (const desvio of [-7, 7]) {
      const oscilador = contexto.createOscillator();
      oscilador.type = 'sawtooth';
      oscilador.frequency.value = frequencia * 2 ** (desvio / 1200);
      oscilador.connect(filtro);
      oscilador.start(inicio);
      oscilador.stop(inicio + duracao + 0.1);
    }
  };

  /** O arpejo: nota curta, com cauda, tirada da escala. */
  const pluck = (
    frequencia: number,
    inicio: number,
    ganho: number,
    camada: CamadaMusical,
  ): void => {
    const envelope = contexto.createGain();
    envelope.gain.setValueAtTime(0.0001, inicio);
    envelope.gain.exponentialRampToValueAtTime(ganho, inicio + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, inicio + 1.5);

    const filtro = contexto.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(5200, inicio);
    filtro.frequency.exponentialRampToValueAtTime(700, inicio + 1.2);

    filtro.connect(envelope);
    envelope.connect(vozes.porCamada[camada]);

    const oscilador = contexto.createOscillator();
    oscilador.type = 'triangle';
    oscilador.frequency.value = frequencia;
    oscilador.connect(filtro);
    oscilador.start(inicio);
    oscilador.stop(inicio + 1.7);
  };

  /** A percussão controlada: um golpe grave e curto, sem prato nenhum. */
  const tambor = (inicio: number, ganho: number, camada: CamadaMusical): void => {
    const envelope = contexto.createGain();
    envelope.gain.setValueAtTime(0.0001, inicio);
    envelope.gain.exponentialRampToValueAtTime(ganho, inicio + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.42);
    envelope.connect(vozes.porCamada[camada]);

    const oscilador = contexto.createOscillator();
    oscilador.type = 'sine';
    oscilador.frequency.setValueAtTime(96, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(42, inicio + 0.2);
    oscilador.connect(envelope);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.5);

    // O couro: um estalo curtíssimo de ruído, que dá o ataque.
    const quadros = Math.floor(contexto.sampleRate * 0.03);
    const buffer = contexto.createBuffer(1, quadros, contexto.sampleRate);
    const canal = buffer.getChannelData(0);
    for (let indice = 0; indice < quadros; indice += 1) {
      canal[indice] = (Math.random() * 2 - 1) * (1 - indice / quadros) ** 3;
    }
    const fonte = contexto.createBufferSource();
    fonte.buffer = buffer;
    const ganhoDoCouro = contexto.createGain();
    ganhoDoCouro.gain.value = ganho * 0.5;
    fonte.connect(ganhoDoCouro);
    ganhoDoCouro.connect(vozes.porCamada[camada]);
    fonte.start(inicio);
  };

  /** Uma nota longa e aguda: o sopro que só aparece no clímax. */
  const sopro = (frequencia: number, inicio: number, duracao: number): void => {
    const envelope = contexto.createGain();
    envelope.gain.setValueAtTime(0.0001, inicio);
    envelope.gain.exponentialRampToValueAtTime(0.08, inicio + duracao * 0.45);
    envelope.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

    const filtro = contexto.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = frequencia * 2;
    filtro.Q.value = 2.4;
    filtro.connect(envelope);
    envelope.connect(vozes.porCamada.climax);

    for (const desvio of [-11, 0, 11]) {
      const oscilador = contexto.createOscillator();
      oscilador.type = 'sawtooth';
      oscilador.frequency.value = frequencia * 2 ** (desvio / 1200);
      oscilador.connect(filtro);
      oscilador.start(inicio);
      oscilador.stop(inicio + duracao + 0.1);
    }
  };

  /** Agenda um compasso inteiro. */
  const agendarCompasso = (indice: number, inicio: number): void => {
    const acorde: Acorde = PROGRESSAO[indice % PROGRESSAO.length] ?? DM;
    const duracao = SEGUNDOS_POR_BATIDA * BATIDAS_POR_COMPASSO;

    /* Camada 1 — a cama harmônica. Sempre presente. */
    for (const intervalo of acorde.intervalos) {
      pad(nota(acorde.fundamental, intervalo), inicio, duracao, 0.05);
    }

    /* Camada 1 — o arpejo esparso, que é o que muda de compasso a compasso. */
    const quantas = 2 + Math.floor(sorteio() * 3);
    for (let passo = 0; passo < quantas; passo += 1) {
      const batida = Math.floor(sorteio() * BATIDAS_POR_COMPASSO);
      const grau = ESCALA[Math.floor(sorteio() * ESCALA.length)] ?? 0;
      pluck(
        nota(acorde.fundamental, grau + 24),
        inicio + batida * SEGUNDOS_POR_BATIDA + sorteio() * 0.1,
        0.055,
        'exploracao',
      );
    }

    /* Camada 2 — pressão: o tambor nas batidas 1 e 3, e a terça sustentada. */
    tambor(inicio, 0.16, 'pressao');
    tambor(inicio + 2 * SEGUNDOS_POR_BATIDA, 0.12, 'pressao');
    pluck(
      nota(acorde.fundamental, (acorde.intervalos[1] ?? 3) + 12),
      inicio + SEGUNDOS_POR_BATIDA * 1.5,
      0.05,
      'pressao',
    );

    /* Camada 3 — clímax: tambor em colcheias na segunda metade, e o sopro. */
    for (let passo = 4; passo < 8; passo += 1) {
      tambor(inicio + passo * SEGUNDOS_POR_BATIDA * 0.5, 0.1, 'climax');
    }
    sopro(nota(acorde.fundamental, (acorde.intervalos[2] ?? 7) + 12), inicio, duracao);
  };

  /*
   * O agendador olha para frente.
   *
   * O relógio do JavaScript não é preciso o bastante para disparar nota a
   * nota; o do áudio é. Então o intervalo só decide **o que** agendar, e o
   * agendamento acontece no relógio do áudio, com meio segundo de folga.
   */
  const passo = (): void => {
    if (!tocando) return;
    const horizonte = contexto.currentTime + 0.6;
    while (proximoInicio < horizonte) {
      agendarCompasso(compasso, proximoInicio);
      compasso += 1;
      proximoInicio += SEGUNDOS_POR_BATIDA * BATIDAS_POR_COMPASSO;
    }
  };

  return {
    iniciar: () => {
      if (tocando) return;
      tocando = true;
      compasso = 0;
      proximoInicio = contexto.currentTime + 0.25;
      vozes.saida.gain.cancelScheduledValues(contexto.currentTime);
      vozes.saida.gain.setValueAtTime(0.0001, contexto.currentTime);
      // Entrada longa: a música não começa, ela aparece.
      vozes.saida.gain.exponentialRampToValueAtTime(volume, contexto.currentTime + 3.5);
      passo();
      relogio = setInterval(passo, 200);
    },

    definirTensao: (tensao) => {
      mixagem = mixagemDaTensao(tensao);
      for (const camada of CAMADAS) {
        const alvo = Math.max(0.0001, mixagem[camada]);
        const no = vozes.porCamada[camada].gain;
        no.cancelScheduledValues(contexto.currentTime);
        no.setValueAtTime(Math.max(0.0001, no.value), contexto.currentTime);
        // Rampa longa: a camada entra ao longo de compassos, não de quadros.
        no.exponentialRampToValueAtTime(alvo, contexto.currentTime + 4);
      }
    },

    abafar: (quanto, duracaoMs) => {
      const agora = contexto.currentTime;
      const abaixado = Math.max(0.0001, volume * (1 - Math.max(0, Math.min(1, quanto))));
      const no = vozes.saida.gain;
      no.cancelScheduledValues(agora);
      no.setValueAtTime(Math.max(0.0001, no.value), agora);
      no.exponentialRampToValueAtTime(abaixado, agora + 0.12);
      no.setValueAtTime(abaixado, agora + duracaoMs / 1000);
      // A volta é lenta de propósito: subir rápido chama atenção para o truque.
      no.exponentialRampToValueAtTime(volume, agora + duracaoMs / 1000 + 1.6);
    },

    definirVolume: (novo) => {
      volume = Math.max(0.0001, novo);
      if (!tocando) return;
      const no = vozes.saida.gain;
      no.cancelScheduledValues(contexto.currentTime);
      no.setValueAtTime(Math.max(0.0001, no.value), contexto.currentTime);
      no.exponentialRampToValueAtTime(volume, contexto.currentTime + 0.4);
    },

    parar: () => {
      tocando = false;
      if (relogio !== null) clearInterval(relogio);
      relogio = null;
      const no = vozes.saida.gain;
      no.cancelScheduledValues(contexto.currentTime);
      no.setValueAtTime(Math.max(0.0001, no.value), contexto.currentTime);
      no.exponentialRampToValueAtTime(0.0001, contexto.currentTime + 1.2);
    },

    ganhoDaCamada: (camada) => mixagem[camada],
  };
};

/**
 * A tensão de uma partida, de 0 a 1.
 *
 * Ela sobe quando alguém está perto de perder, quando uma Guarda caiu, e
 * quando uma Ultimate está disponível. A conta é pública e determinística — a
 * música não conhece carta escondida, do mesmo jeito que a IA não conhece.
 */
export const tensaoDaPartida = (entrada: {
  readonly vidaDoJogador: number;
  readonly vidaDaMaquina: number;
  readonly vidaInicial: number;
  readonly guardaDoJogador: number;
  readonly guardaDaMaquina: number;
  readonly ultimateDisponivel: boolean;
}): number => {
  const menorVida = Math.min(entrada.vidaDoJogador, entrada.vidaDaMaquina);
  const perigo = 1 - menorVida / Math.max(1, entrada.vidaInicial);
  const guardaCaida =
    (entrada.guardaDoJogador === 0 ? 0.12 : 0) + (entrada.guardaDaMaquina === 0 ? 0.12 : 0);
  const ultimate = entrada.ultimateDisponivel ? 0.1 : 0;
  return Math.max(0, Math.min(1, perigo * 0.82 + guardaCaida + ultimate));
};
