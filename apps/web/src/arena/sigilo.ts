import type { ClassId, TipoDeCarta } from '@arcane-duel/shared-types';

import { COR_DO_TIPO, paletaDaClasse } from './paleta.js';

/*
 * O sigilo da carta.
 *
 * A janela de arte das 468 cartas é a Etapa 12. Até lá ela não pode ser um
 * retângulo vazio — e também não pode fingir ser ilustração final. A saída é
 * um sigilo **procedural**: uma composição geométrica derivada do próprio
 * identificador da carta, que dá densidade e identidade sem inventar cena,
 * figura ou tema.
 *
 * Ele é determinístico de propósito. A mesma carta desenha sempre o mesmo
 * sigilo, em qualquer aparelho e em qualquer build — senão as capturas de
 * regressão visual não teriam sentido.
 *
 * Quando a ilustração aprovada existir, ela entra no lugar do sigilo e este
 * arquivo some. Nada mais depende dele.
 */

export interface NoDoSigilo {
  readonly x: number;
  readonly y: number;
  readonly raio: number;
}

export interface Sigilo {
  readonly raios: number;
  readonly aneis: number;
  readonly rotacao: number;
  readonly corPrimaria: string;
  readonly corSecundaria: string;
  readonly nos: readonly NoDoSigilo[];
  /** Quão anguloso é o traço: 0 é circular, 1 é totalmente poligonal. */
  readonly dureza: number;
}

/** Hash estável de 32 bits. Sem `Math.random` em lugar nenhum daqui. */
const semear = (texto: string): number => {
  let valor = 0x811c9dc5;
  for (let indice = 0; indice < texto.length; indice += 1) {
    valor ^= texto.charCodeAt(indice);
    valor = Math.imul(valor, 0x01000193) >>> 0;
  }
  return valor;
};

const gerador = (semente: number): (() => number) => {
  let estado = semente >>> 0 || 1;
  return () => {
    estado ^= estado << 13;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    estado >>>= 0;
    return estado / 0xffffffff;
  };
};

/**
 * A dureza do traço separa as duas classes do vertical slice.
 *
 * O Guerreiro desenha polígonos e cunhas — massa e metal. O Mago desenha
 * círculos, arcos e runas — geometria arcana. É a mesma diferença que os VFX
 * usam, aplicada à arte da carta, para as duas mãos não parecerem a mesma mão.
 */
const DUREZA: Readonly<Partial<Record<ClassId, number>>> = {
  guerreiro: 0.92,
  mago: 0.12,
};

export const sigiloDaCarta = (id: string, tipo: TipoDeCarta, classe: ClassId): Sigilo => {
  const sorteio = gerador(semear(`${classe}:${tipo}:${id}`));
  const raios = 5 + Math.floor(sorteio() * 4);
  const aneis = 1 + Math.floor(sorteio() * 3);
  const paleta = paletaDaClasse(classe);

  const nos: NoDoSigilo[] = [];
  const quantidade = raios + Math.floor(sorteio() * 3);
  for (let indice = 0; indice < quantidade; indice += 1) {
    const angulo = (indice / quantidade) * Math.PI * 2 + sorteio() * 0.4;
    const distancia = 0.2 + sorteio() * 0.28;
    nos.push({
      x: 0.5 + Math.cos(angulo) * distancia,
      y: 0.5 + Math.sin(angulo) * distancia * 0.82,
      raio: 0.012 + sorteio() * 0.022,
    });
  }

  return {
    raios,
    aneis,
    rotacao: sorteio() * Math.PI,
    corPrimaria: COR_DO_TIPO[tipo],
    corSecundaria: paleta.cssRealce,
    nos,
    dureza: DUREZA[classe] ?? 0.5,
  };
};

export interface AreaDoSigilo {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

/**
 * Desenha o sigilo dentro da janela de arte.
 *
 * `fase` anima: ela gira o anel externo devagar, o que dá vida à carta em foco
 * sem custar partícula nenhuma. Em modo de movimento reduzido quem chama passa
 * sempre a mesma fase e o sigilo fica parado.
 */
export const desenharSigilo = (
  contexto: CanvasRenderingContext2D,
  sigilo: Sigilo,
  area: AreaDoSigilo,
  fase = 0,
): void => {
  const centroX = area.x + area.largura / 2;
  const centroY = area.y + area.altura / 2;
  const raioBase = Math.min(area.largura, area.altura) / 2;

  contexto.save();
  contexto.beginPath();
  contexto.rect(area.x, area.y, area.largura, area.altura);
  contexto.clip();

  const fundo = contexto.createRadialGradient(
    centroX,
    centroY - raioBase * 0.2,
    raioBase * 0.1,
    centroX,
    centroY,
    raioBase * 1.6,
  );
  fundo.addColorStop(0, '#2b3247');
  fundo.addColorStop(1, '#0d1018');
  contexto.fillStyle = fundo;
  contexto.fillRect(area.x, area.y, area.largura, area.altura);

  contexto.translate(centroX, centroY);
  contexto.rotate(sigilo.rotacao + fase * 0.35);

  /* Os anéis. Duros viram polígonos; macios ficam circulares. */
  for (let anel = 0; anel < sigilo.aneis; anel += 1) {
    const raio = raioBase * (0.36 + anel * 0.22);
    const lados = sigilo.dureza > 0.5 ? sigilo.raios : 64;
    contexto.beginPath();
    for (let lado = 0; lado <= lados; lado += 1) {
      const angulo = (lado / lados) * Math.PI * 2;
      const ponto = raio * (1 - sigilo.dureza * 0.06 * Math.cos(angulo * sigilo.raios));
      const x = Math.cos(angulo) * ponto;
      const y = Math.sin(angulo) * ponto * 0.9;
      if (lado === 0) contexto.moveTo(x, y);
      else contexto.lineTo(x, y);
    }
    contexto.strokeStyle = anel === 0 ? sigilo.corPrimaria : sigilo.corSecundaria;
    contexto.globalAlpha = 0.34 + 0.2 * (sigilo.aneis - anel);
    contexto.lineWidth = raioBase * (anel === 0 ? 0.055 : 0.028);
    contexto.stroke();
  }

  /* Os raios que saem do centro. */
  contexto.globalAlpha = 0.5;
  contexto.strokeStyle = sigilo.corSecundaria;
  contexto.lineWidth = raioBase * 0.022;
  for (let raio = 0; raio < sigilo.raios; raio += 1) {
    const angulo = (raio / sigilo.raios) * Math.PI * 2;
    contexto.beginPath();
    contexto.moveTo(Math.cos(angulo) * raioBase * 0.16, Math.sin(angulo) * raioBase * 0.14);
    contexto.lineTo(Math.cos(angulo) * raioBase * 0.94, Math.sin(angulo) * raioBase * 0.84);
    contexto.stroke();
  }

  /* Os nós: pontos de luz que quebram a simetria perfeita. */
  for (const no of sigilo.nos) {
    const x = (no.x - 0.5) * area.largura;
    const y = (no.y - 0.5) * area.altura;
    contexto.beginPath();
    contexto.arc(x, y, no.raio * raioBase * 2.4, 0, Math.PI * 2);
    contexto.globalAlpha = 0.85;
    contexto.fillStyle = sigilo.corSecundaria;
    contexto.fill();
  }

  /* Um núcleo quente, que puxa o olho para o meio da janela. */
  contexto.globalAlpha = 1;
  const nucleo = contexto.createRadialGradient(0, 0, 0, 0, 0, raioBase * 0.42);
  nucleo.addColorStop(0, sigilo.corPrimaria);
  nucleo.addColorStop(0.45, `${sigilo.corPrimaria}66`);
  nucleo.addColorStop(1, 'transparent');
  contexto.fillStyle = nucleo;
  contexto.beginPath();
  contexto.arc(0, 0, raioBase * 0.42, 0, Math.PI * 2);
  contexto.fill();

  contexto.restore();
};

/** O caminho SVG dos anéis, para o sigilo aparecer também fora do canvas. */
export const caminhoDoSigilo = (sigilo: Sigilo, anel: number): string => {
  const raio = 0.36 + anel * 0.22;
  const lados = sigilo.dureza > 0.5 ? sigilo.raios : 48;
  const pontos: string[] = [];
  for (let lado = 0; lado <= lados; lado += 1) {
    const angulo = (lado / lados) * Math.PI * 2 + sigilo.rotacao;
    const ponto = raio * (1 - sigilo.dureza * 0.06 * Math.cos(angulo * sigilo.raios));
    const x = (0.5 + Math.cos(angulo) * ponto).toFixed(4);
    const y = (0.5 + Math.sin(angulo) * ponto * 0.9).toFixed(4);
    pontos.push(`${lado === 0 ? 'M' : 'L'}${x} ${y}`);
  }
  return `${pontos.join(' ')} Z`;
};
