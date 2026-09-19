import type { ClassId, TipoDeCarta } from '@arcane-duel/shared-types';

/*
 * A paleta da linguagem V2.
 *
 * Fantasia sombria elegante: ferro escuro, ouro velho, e uma cor de energia
 * que muda com a classe. O ouro nunca é amarelo puro e o preto nunca é preto —
 * as duas coisas são o que separa metal de retângulo.
 *
 * Três tons por material, sempre: luz, corpo e sombra. É com eles que os
 * gradientes de bisel são montados, e é por isso que a moldura tem relevo sem
 * uma única imagem.
 */

export interface Material {
  /** O brilho que pega a luz, no canto superior esquerdo. */
  readonly luz: string;
  readonly corpo: string;
  /** A sombra do lado oposto, que fecha o bisel. */
  readonly sombra: string;
}

/** Ferro escuro. É o corpo da moldura e das placas. */
export const FERRO: Material = {
  luz: '#4a4b57',
  corpo: '#23242c',
  sombra: '#0c0d11',
};

/** Ouro velho, com vermelho no corpo para não virar amarelo de plástico. */
export const OURO: Material = {
  luz: '#f4e3ad',
  corpo: '#b8912f',
  sombra: '#5d4310',
};

/** A pedra do fundo do texto: quente, gasta, legível. */
export const PEDRA: Material = {
  luz: '#3a3630',
  corpo: '#211f1c',
  sombra: '#0e0d0c',
};

export interface CorDaClasse {
  /** A cor da energia da classe: sulcos, gemas e brilho. */
  readonly energia: string;
  readonly energiaClara: string;
  readonly energiaEscura: string;
}

const NEUTRA: CorDaClasse = {
  energia: '#c9a227',
  energiaClara: '#f0dda6',
  energiaEscura: '#6b5313',
};

const POR_CLASSE: Readonly<Partial<Record<ClassId, CorDaClasse>>> = {
  guerreiro: { energia: '#e2622a', energiaClara: '#ffc08a', energiaEscura: '#6d2408' },
  mago: { energia: '#6f6bff', energiaClara: '#c3bcff', energiaEscura: '#241f78' },
};

export const corDaClasse = (classe: ClassId): CorDaClasse => POR_CLASSE[classe] ?? NEUTRA;

/**
 * A cor da faixa de tipo.
 *
 * Ela é o que o olho lê primeiro depois do nome: Ataque é sangue, Técnica é
 * aço frio, Reação é verde de parada, Ultimate é ouro em brasa. Nenhum tipo
 * usa a cor da classe, de propósito — senão duas cartas de Mago de tipos
 * diferentes leriam iguais.
 */
export const COR_DO_TIPO: Readonly<Record<TipoDeCarta, Material>> = {
  ataque: { luz: '#e07a63', corpo: '#8e2418', sombra: '#3a0c06' },
  tecnica: { luz: '#7fb0e0', corpo: '#1e5187', sombra: '#0a1f36' },
  reacao: { luz: '#7fd6a0', corpo: '#1c6b42', sombra: '#082a19' },
  passiva: { luz: '#e6c977', corpo: '#8a6b19', sombra: '#342706' },
  'carta-de-classe': { luz: '#c49ae8', corpo: '#5b2e8e', sombra: '#210f36' },
  ultimate: { luz: '#ffc978', corpo: '#c06a10', sombra: '#4a2304' },
  personagem: { luz: '#c49ae8', corpo: '#5b2e8e', sombra: '#210f36' },
};

export const ROTULO_DO_TIPO: Readonly<Record<TipoDeCarta, string>> = {
  ataque: 'ATAQUE',
  tecnica: 'TÉCNICA',
  reacao: 'REAÇÃO',
  passiva: 'PASSIVA',
  'carta-de-classe': 'CARTA DE CLASSE',
  ultimate: 'ULTIMATE',
  personagem: 'PERSONAGEM',
};

/*
 * A tipografia.
 *
 * Nada de webfont: um PWA que precisa abrir offline não pode depender de uma
 * requisição para o nome da carta aparecer, e uma fonte que chega atrasada
 * reflui a carta inteira na frente do jogador. As duas pilhas abaixo resolvem
 * para uma serifada clássica em todo aparelho que importa, e degradam para a
 * serifada do sistema no resto.
 */
export const FONTE_TITULO =
  "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, 'Times New Roman', serif";

export const FONTE_TEXTO = "'Iowan Old Style', Palatino, Georgia, 'Times New Roman', serif";

/** Os números querem largura fixa: 10 e 11 não podem dançar na placa. */
export const FONTE_NUMERO =
  "'SF Mono', 'Segoe UI', 'Noto Sans', system-ui, -apple-system, sans-serif";
