import type { CardId, VisaoDaPartida, VisaoDeJogador } from '@arcane-duel/shared-types';
import type { EstadoDeSelecao, LadoDoCampo } from '@arcane-duel/ui';
import { chaveDaAncora } from '@arcane-duel/ui';

import type { CartaNaArena, EstadoVisualDaArena } from '../arena/estado-visual.js';
import { pecaDaZona, posicaoNoLeque } from '../arena/layout.js';
import { cartaVisivel } from '../partida/apresentacao.js';

/*
 * Da projeção ao mundo.
 *
 * Este arquivo transforma a visão do jogador — o que aquele observador tem
 * direito de conhecer — nas peças que a arena desenha. Ele nunca lê o estado
 * canônico, e é daí que a privacidade vem de graça: uma Passiva oculta do
 * adversário chega como `{ visivel: false }`, sem identidade nenhuma, e sai
 * daqui como uma carta de verso. Nada é montado e depois escondido com
 * `opacity`.
 */

const ZONAS_DE_COOLDOWN = [
  { zona: 'cd1', numero: 1 },
  { zona: 'cd2', numero: 2 },
  { zona: 'cd3', numero: 3 },
] as const;

export interface EntradaVisual {
  readonly visao: VisaoDaPartida;
  readonly eu: VisaoDeJogador;
  readonly adversario: VisaoDeJogador;
  readonly focada: CardId | null;
  /** Cartas da mão que o motor aceita jogar agora. */
  readonly jogaveis: ReadonlySet<string>;
  readonly enfaseProprio: number;
  readonly enfaseAdversario: number;
  /** A zona que está esperando alguém agir: a Resposta pendente, por exemplo. */
  readonly slotEmEspera: string | null;
}

const selecaoDaCarta = (
  carta: CardId,
  focada: CardId | null,
  jogaveis: ReadonlySet<string>,
): EstadoDeSelecao => {
  if (focada === carta) return 'selecionada';
  return jogaveis.has(String(carta)) ? 'selecionavel' : 'nenhum';
};

/** A carta de uma zona, quando há uma e quando este observador pode vê-la. */
const naZona = (
  lado: LadoDoCampo,
  zona: Parameters<typeof pecaDaZona>[1],
  indice: number,
  carta: CardId | null,
  entrada: EntradaVisual,
  extras: {
    readonly deitada?: boolean;
    readonly escala?: number;
    readonly interativa?: boolean;
  } = {},
): CartaNaArena | null => {
  const peca = pecaDaZona(lado, zona, indice);
  if (peca === undefined) return null;
  return {
    chave: chaveDaAncora({ lado, zona, indice }),
    carta: carta === null ? null : cartaVisivel(carta),
    posicao: peca.centro,
    giro: 0,
    deitada: extras.deitada ?? false,
    escala: extras.escala ?? Math.min(1, peca.largura / 2.2),
    noLeque: false,
    foco: carta !== null && entrada.focada === carta,
    selecao: carta === null ? 'nenhum' : selecaoDaCarta(carta, entrada.focada, entrada.jogaveis),
    ordem: 0,
    interativa: extras.interativa ?? true,
  };
};

const pecasDoLado = (
  jogador: VisaoDeJogador,
  lado: LadoDoCampo,
  entrada: EntradaVisual,
): readonly CartaNaArena[] => {
  const cartas: CartaNaArena[] = [];
  const somar = (item: CartaNaArena | null): void => {
    if (item !== null) cartas.push(item);
  };

  for (const slot of jogador.acoes) {
    const carta = slot.perfil?.carta ?? null;
    if (carta !== null) somar(naZona(lado, 'acao', slot.indice, carta, entrada));
    const resposta = slot.resposta.voluntaria;
    if (resposta !== null && resposta.tipo === 'carta-de-reacao') {
      somar(naZona(lado, 'resposta', slot.indice, resposta.perfil.carta, entrada));
    }
  }

  jogador.passivas.forEach((passiva, indice) => {
    somar(
      naZona(
        lado,
        'passiva',
        indice,
        // Oculta significa oculta: sem `carta`, o verso é tudo que existe.
        passiva.carta.visivel ? passiva.carta.carta : null,
        entrada,
        { deitada: passiva.estado === 'ativada' },
      ),
    );
  });

  jogador.cartasDeClasse.forEach((equipada, indice) => {
    // Exaurida sai fisicamente do campo: o slot fica vazio, e fica para sempre.
    if (equipada.estado === 'exaurida') return;
    somar(
      naZona(lado, 'carta-de-classe', indice, equipada.carta, entrada, {
        deitada: equipada.estado === 'ativada',
      }),
    );
  });

  if (jogador.ultimate.estado === 'disponivel') {
    somar(naZona(lado, 'ultimate', 0, jogador.ultimate.carta, entrada, { escala: 1.1 }));
  }

  for (const { zona, numero } of ZONAS_DE_COOLDOWN) {
    const primeira = jogador.cooldown[numero][0];
    // Cooldown é informação: não há nada a fazer com uma carta que está
    // esfriando, e um alvo de toque que não faz nada só atrapalha o dedo.
    if (primeira !== undefined) {
      somar(naZona(lado, zona, 0, primeira, entrada, { escala: 0.8, interativa: false }));
    }
  }

  somar(
    naZona(lado, 'personagem', 0, jogador.personagem, entrada, {
      escala: 0.95,
      interativa: false,
    }),
  );
  return cartas;
};

/** A mão do observador, aberta em leque. Só a dele: a do outro não existe aqui. */
const maoEmLeque = (entrada: EntradaVisual): readonly CartaNaArena[] => {
  const total = entrada.eu.mao.length;
  return entrada.eu.mao.map((projetada, indice) => {
    const posicao = posicaoNoLeque(indice, total);
    const carta = projetada.visivel ? projetada.carta : null;
    return {
      chave: `mao:${String(indice)}`,
      carta: carta === null ? null : cartaVisivel(carta),
      posicao: { x: posicao.x, y: posicao.y, z: posicao.z },
      giro: posicao.giro,
      deitada: false,
      /*
       * A carta da mão é a maior da tela, e de propósito.
       *
       * É nela que o jogador lê nome, custo e tipo antes de decidir. Num
       * telefone deitado, uma carta inteira dentro da tela sairia pequena
       * demais para isso — então ela cresce e a borda inferior corta o pé,
       * como na referência.
       */
      escala: 1.56,
      noLeque: true,
      foco: carta !== null && entrada.focada === carta,
      selecao: carta === null ? 'nenhum' : selecaoDaCarta(carta, entrada.focada, entrada.jogaveis),
      ordem: posicao.ordem,
      interativa: true,
    };
  });
};

/** As zonas que devem receber contorno de "pode jogar aqui". */
const slotsEmDestaque = (entrada: EntradaVisual): readonly string[] => {
  if (entrada.jogaveis.size === 0) return [];
  return entrada.eu.acoes
    .filter((slot) => slot.situacao === 'vazio')
    .map((slot) => chaveDaAncora({ lado: 'proprio', zona: 'acao', indice: slot.indice }));
};

export const montarEstadoVisual = (entrada: EntradaVisual): EstadoVisualDaArena => ({
  cartas: [
    ...pecasDoLado(entrada.eu, 'proprio', entrada),
    ...pecasDoLado(entrada.adversario, 'adversario', entrada),
    ...maoEmLeque(entrada),
  ],
  enfaseProprio: entrada.enfaseProprio,
  enfaseAdversario: entrada.enfaseAdversario,
  classeDoProprio: entrada.eu.classe,
  classeDoAdversario: entrada.adversario.classe,
  slotsEmDestaque: slotsEmDestaque(entrada),
  slotEmEspera: entrada.slotEmEspera,
});
