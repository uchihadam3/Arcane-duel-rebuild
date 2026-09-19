/*
 * A oficina de síntese da Demo V2.
 *
 * O áudio da Etapa 6 era um oscilador com envelope por evento — a auditoria o
 * registrou como bipe, e era. O que falta a um bipe não é volume: é **camada**.
 * Um impacto de metal real tem um transiente de ruído filtrado, um corpo
 * ressonante com altura, e uma cauda que some no ambiente. Três coisas, com
 * tempos diferentes.
 *
 * Este arquivo dá os tijolos dessas camadas. Nada aqui conhece o jogo.
 */

export interface Destino {
  readonly contexto: AudioContext;
  /** Onde o som entra. Cada barramento tem o seu. */
  readonly entrada: AudioNode;
  /** O envio para a reverberação, para a cauda existir. */
  readonly ambiente: AudioNode;
}

const agoraCom = (contexto: AudioContext, atrasoMs: number): number =>
  contexto.currentTime + atrasoMs / 1000;

/**
 * Um envelope percussivo.
 *
 * Ataque quase instantâneo e queda exponencial: é a forma de qualquer coisa
 * que bate. O `sustento` estica o corpo sem mexer no transiente, que é o que
 * separa um sino de um estalo.
 */
const envelope = (
  contexto: AudioContext,
  inicio: number,
  ganho: number,
  ataqueMs: number,
  decaimentoMs: number,
  sustentoMs = 0,
): GainNode => {
  const no = contexto.createGain();
  const pico = Math.max(0.0001, ganho);
  no.gain.setValueAtTime(0.0001, inicio);
  no.gain.exponentialRampToValueAtTime(pico, inicio + ataqueMs / 1000);
  if (sustentoMs > 0) {
    no.gain.setValueAtTime(pico, inicio + (ataqueMs + sustentoMs) / 1000);
  }
  no.gain.exponentialRampToValueAtTime(
    0.0001,
    inicio + (ataqueMs + sustentoMs + decaimentoMs) / 1000,
  );
  return no;
};

/** Ruído branco num buffer curto. A base de todo transiente. */
const bufferDeRuido = (contexto: AudioContext, duracaoMs: number): AudioBuffer => {
  const quadros = Math.max(1, Math.floor((contexto.sampleRate * duracaoMs) / 1000));
  const buffer = contexto.createBuffer(1, quadros, contexto.sampleRate);
  const canal = buffer.getChannelData(0);
  let anterior = 0;
  for (let indice = 0; indice < quadros; indice += 1) {
    const branco = Math.random() * 2 - 1;
    // Um filtro de primeira ordem já tira o brilho de vidro do ruído puro.
    anterior = anterior * 0.36 + branco * 0.64;
    canal[indice] = anterior;
  }
  return buffer;
};

export interface CamadaDeRuido {
  readonly atrasoMs?: number;
  readonly duracaoMs: number;
  readonly ganho: number;
  readonly tipoDeFiltro?: BiquadFilterType;
  readonly frequenciaInicial: number;
  readonly frequenciaFinal?: number;
  readonly ressonancia?: number;
  readonly ataqueMs?: number;
  readonly enviarAoAmbiente?: number;
}

/** Uma camada de ruído filtrado: o transiente, o sopro, o detrito. */
export const ruido = (destino: Destino, camada: CamadaDeRuido): void => {
  const { contexto } = destino;
  const inicio = agoraCom(contexto, camada.atrasoMs ?? 0);

  const fonte = contexto.createBufferSource();
  fonte.buffer = bufferDeRuido(contexto, camada.duracaoMs);

  const filtro = contexto.createBiquadFilter();
  filtro.type = camada.tipoDeFiltro ?? 'bandpass';
  filtro.frequency.setValueAtTime(camada.frequenciaInicial, inicio);
  if (camada.frequenciaFinal !== undefined) {
    filtro.frequency.exponentialRampToValueAtTime(
      Math.max(30, camada.frequenciaFinal),
      inicio + camada.duracaoMs / 1000,
    );
  }
  filtro.Q.setValueAtTime(camada.ressonancia ?? 1, inicio);

  const saida = envelope(contexto, inicio, camada.ganho, camada.ataqueMs ?? 2, camada.duracaoMs);

  fonte.connect(filtro);
  filtro.connect(saida);
  saida.connect(destino.entrada);
  if ((camada.enviarAoAmbiente ?? 0) > 0) {
    const envio = contexto.createGain();
    envio.gain.value = camada.enviarAoAmbiente ?? 0;
    saida.connect(envio);
    envio.connect(destino.ambiente);
  }

  fonte.start(inicio);
  fonte.stop(inicio + camada.duracaoMs / 1000 + 0.05);
};

export interface CamadaDeTom {
  readonly atrasoMs?: number;
  readonly duracaoMs: number;
  readonly ganho: number;
  readonly onda?: OscillatorType;
  readonly de: number;
  readonly para?: number;
  /** Modulação de frequência: dá metal, sino e voz arcana. */
  readonly moduladora?: { readonly razao: number; readonly profundidade: number };
  /** Desafinação em cents de uma segunda voz. Dá largura sem coro. */
  readonly largura?: number;
  readonly ataqueMs?: number;
  readonly sustentoMs?: number;
  readonly corte?: number;
  readonly enviarAoAmbiente?: number;
}

/**
 * Uma camada de tom, com modulação de frequência opcional.
 *
 * A FM é o que dá timbre metálico sem amostra: uma moduladora numa razão não
 * inteira produz parciais inarmônicas, que é exatamente o que uma lâmina
 * batendo tem e um seno não.
 */
export const tom = (destino: Destino, camada: CamadaDeTom): void => {
  const { contexto } = destino;
  const inicio = agoraCom(contexto, camada.atrasoMs ?? 0);
  const fim = inicio + camada.duracaoMs / 1000;

  const saida = envelope(
    contexto,
    inicio,
    camada.ganho,
    camada.ataqueMs ?? 4,
    camada.duracaoMs,
    camada.sustentoMs ?? 0,
  );

  const filtro = contexto.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(camada.corte ?? 12000, inicio);
  filtro.connect(saida);
  saida.connect(destino.entrada);
  if ((camada.enviarAoAmbiente ?? 0) > 0) {
    const envio = contexto.createGain();
    envio.gain.value = camada.enviarAoAmbiente ?? 0;
    saida.connect(envio);
    envio.connect(destino.ambiente);
  }

  const vozes = camada.largura === undefined ? [0] : [-camada.largura, camada.largura];
  for (const desvio of vozes) {
    const oscilador = contexto.createOscillator();
    oscilador.type = camada.onda ?? 'sine';
    const fator = 2 ** (desvio / 1200);
    oscilador.frequency.setValueAtTime(camada.de * fator, inicio);
    if (camada.para !== undefined) {
      oscilador.frequency.exponentialRampToValueAtTime(Math.max(20, camada.para * fator), fim);
    }

    if (camada.moduladora !== undefined) {
      const moduladora = contexto.createOscillator();
      moduladora.type = 'sine';
      moduladora.frequency.setValueAtTime(camada.de * camada.moduladora.razao, inicio);
      const profundidade = contexto.createGain();
      profundidade.gain.setValueAtTime(camada.de * camada.moduladora.profundidade, inicio);
      profundidade.gain.exponentialRampToValueAtTime(1, fim);
      moduladora.connect(profundidade);
      profundidade.connect(oscilador.frequency);
      moduladora.start(inicio);
      moduladora.stop(fim);
    }

    oscilador.connect(filtro);
    oscilador.start(inicio);
    oscilador.stop(fim);
  }
};

/**
 * A resposta ao impulso da arena, gerada por código.
 *
 * Ruído decaindo exponencialmente, com as primeiras reflexões um pouco mais
 * altas. Não é a medição de uma sala real — é o suficiente para que um impacto
 * tenha para onde ir. Sem cauda, todo som fica colado no alto-falante, e foi
 * essa a sensação de "bipe" da etapa anterior tanto quanto a falta de camada.
 */
export const criarAmbienteDeArena = (contexto: AudioContext): AudioBuffer => {
  const duracao = 2.1;
  const quadros = Math.floor(contexto.sampleRate * duracao);
  const buffer = contexto.createBuffer(2, quadros, contexto.sampleRate);

  for (let canal = 0; canal < 2; canal += 1) {
    const dados = buffer.getChannelData(canal);
    for (let indice = 0; indice < quadros; indice += 1) {
      const t = indice / quadros;
      const decaimento = (1 - t) ** 2.6;
      // Reflexões iniciais: a pedra perto, antes da cauda da sala.
      const reflexao = indice < contexto.sampleRate * 0.06 ? 1.8 : 1;
      dados[indice] = (Math.random() * 2 - 1) * decaimento * reflexao * 0.42;
    }
  }
  return buffer;
};
