import type {
  CardId,
  IndiceDeAcao,
  VisaoDaPartida,
  VisaoDeJogador,
} from '@arcane-duel/shared-types';

import type { CartaVisivel } from '../../partida/apresentacao.js';
import { cartaVisivel } from '../../partida/apresentacao.js';
import type { Metade, Retangulo } from '../arena/planta.js';
import {
  CARTA,
  TABULEIRO,
  ZONAS_DE_COOLDOWN,
  centroDe,
  encaixeDePassiva,
  gavetaDeCooldown,
  pedestalDeAcao,
  pedestalDeClasse,
  pedestalDePersonagem,
  pedestalDeResposta,
  posicaoNoLeque,
  slotDeUltimate,
} from '../arena/planta.js';

/*
 * De uma projeção para as peças que existem na mesa.
 *
 * Este arquivo é a ponte entre "o que o jogador tem direito de saber" e "o que
 * aparece na tela", e a ponte é de mão única: ele lê `VisaoDaPartida` e nunca
 * o estado canônico. É daí que a privacidade vem de graça — uma carta que o
 * observador não pode ver chega com `visivel: false` e sai daqui como um verso,
 * **sem identificador**. Não existe uma carta escondida por trás de uma flag:
 * o dado não chegou.
 *
 * A perspectiva é fixa: `jogador` é sempre a metade de baixo. Não há parâmetro
 * para inverter, e nenhuma função aqui aceita "de quem é a vez".
 */

/** Onde a mão do jogador mora, em unidades de tabuleiro, abaixo do campo. */
/*
 * Onde a mão do jogador mora.
 *
 * Ela fica **em pé** sobre a mesa — a inclinação da câmera é desfeita nela —,
 * e uma carta em pé na borda da frente projeta muito para baixo. Nas primeiras
 * medições em 915 × 412 só o topo do nome aparecia. Aproximá-la da borda do
 * campo sobe o leque na tela; ela passa a cobrir um pedaço da própria fileira
 * de apoio do jogador, que é o que acontece quando alguém segura cartas na
 * frente do próprio lado da mesa.
 */
export const MAO_DO_JOGADOR = { y: TABULEIRO.altura + 60, larguraUtil: 880 } as const;

/** A mão da máquina, acima do campo. Sempre virada. */
export const MAO_DA_MAQUINA = { y: -84, larguraUtil: 520 } as const;

export interface PecaAlvo {
  /** Identidade estável da peça entre um estado e o outro. */
  readonly chave: string;
  /**
   * A carta, quando o observador pode conhecê-la.
   *
   * `null` é verso de verdade. Nenhum campo desta peça carrega o identificador
   * de uma carta que o observador não viu.
   */
  readonly carta: CartaVisivel | null;
  readonly x: number;
  readonly y: number;
  readonly escala: number;
  readonly giro: number;
  /** −inclinação da câmera para ficar de frente; 0 para deitar no campo. */
  readonly inclinacao: number;
  /** Ordem de empilhamento. */
  readonly ordem: number;
  /** A peça aceita toque? Cooldown e Personagem são informação, não comando. */
  readonly interativa: boolean;
  /** De qual metade ela é. Só para efeito e cor; nunca para posicionar. */
  readonly metade: Metade;
  /** Onde ela está: decide o que o toque faz. */
  readonly lugar:
    'mao' | 'acao' | 'resposta' | 'passiva' | 'classe' | 'ultimate' | 'cooldown' | 'personagem';
  /** O índice do espaço, quando o lugar tem índice. */
  readonly indice: number;
}

const escalaPara = (caixa: Retangulo): number =>
  Math.min(caixa.largura / CARTA.largura, caixa.altura / CARTA.altura) * 0.9;

const noEncaixe = (
  chave: string,
  caixa: Retangulo,
  carta: CartaVisivel | null,
  metade: Metade,
  lugar: PecaAlvo['lugar'],
  indice: number,
  extras: { readonly interativa?: boolean; readonly ordem?: number; readonly giro?: number } = {},
): PecaAlvo => {
  const centro = centroDe(caixa);
  return {
    chave,
    carta,
    x: centro.x,
    y: centro.y,
    escala: escalaPara(caixa),
    giro: extras.giro ?? 0,
    inclinacao: 0,
    ordem: extras.ordem ?? 10,
    interativa: extras.interativa ?? true,
    metade,
    lugar,
    indice,
  };
};

/** A chave de uma carta pública. Estável enquanto a carta for a mesma. */
const chaveDaCarta = (carta: CardId): string => `c:${String(carta)}`;

/** A chave de uma peça virada. Não carrega identidade: ela não existe aqui. */
const chaveVirada = (metade: Metade, lugar: string, indice: number): string =>
  `v:${metade}:${lugar}:${String(indice)}`;

const INDICES: readonly IndiceDeAcao[] = [0, 1, 2, 3];

/*
 * As peças do campo não recebem inclinação.
 *
 * Tudo o que está **sobre a mesa** fica deitado nela; só a mão desfaz a
 * inclinação da câmera para olhar de frente. Por isso esta função não toma o
 * ângulo como argumento: não há decisão a tomar.
 */
const pecasDoCampo = (jogador: VisaoDeJogador, metade: Metade): readonly PecaAlvo[] => {
  const pecas: PecaAlvo[] = [];

  for (const indice of INDICES) {
    const slot = jogador.acoes.find((atual) => atual.indice === indice);
    if (slot === undefined) continue;

    const carta = slot.perfil?.carta ?? null;
    if (carta !== null) {
      pecas.push(
        noEncaixe(
          chaveDaCarta(carta),
          pedestalDeAcao(metade, indice),
          cartaVisivel(carta),
          metade,
          'acao',
          indice,
          { ordem: 20 },
        ),
      );
    }

    const resposta = slot.resposta.voluntaria;
    if (resposta !== null && resposta.tipo === 'carta-de-reacao') {
      const daResposta = resposta.perfil.carta;
      pecas.push(
        noEncaixe(
          chaveDaCarta(daResposta),
          // A Resposta a um Ataque desta metade pertence à **outra** metade.
          pedestalDeResposta(metade, indice),
          cartaVisivel(daResposta),
          metade === 'jogador' ? 'maquina' : 'jogador',
          'resposta',
          indice,
          { ordem: 22 },
        ),
      );
    }
  }

  jogador.passivas.forEach((passiva, indice) => {
    const caixa = encaixeDePassiva(metade, indice);
    if (passiva.carta.visivel) {
      pecas.push(
        noEncaixe(
          chaveDaCarta(passiva.carta.carta),
          caixa,
          cartaVisivel(passiva.carta.carta),
          metade,
          'passiva',
          indice,
          { giro: passiva.estado === 'ativada' ? 90 : 0, interativa: metade === 'jogador' },
        ),
      );
      return;
    }
    // Oculta é oculta: verso, e nenhum identificador em lugar nenhum.
    pecas.push(
      noEncaixe(chaveVirada(metade, 'passiva', indice), caixa, null, metade, 'passiva', indice, {
        interativa: false,
      }),
    );
  });

  jogador.cartasDeClasse.forEach((equipada, indice) => {
    // Exaurida sai fisicamente do campo, e fica fora para sempre.
    if (equipada.estado === 'exaurida') return;
    pecas.push(
      noEncaixe(
        chaveDaCarta(equipada.carta),
        pedestalDeClasse(metade, indice),
        cartaVisivel(equipada.carta),
        metade,
        'classe',
        indice,
        { giro: equipada.estado === 'ativada' ? 90 : 0, interativa: metade === 'jogador' },
      ),
    );
  });

  if (jogador.ultimate.estado === 'disponivel') {
    pecas.push(
      noEncaixe(
        chaveDaCarta(jogador.ultimate.carta),
        slotDeUltimate(metade),
        cartaVisivel(jogador.ultimate.carta),
        metade,
        'ultimate',
        0,
        { interativa: metade === 'jogador', ordem: 14 },
      ),
    );
  }

  pecas.push(
    noEncaixe(
      chaveDaCarta(jogador.personagem),
      pedestalDePersonagem(metade),
      cartaVisivel(jogador.personagem),
      metade,
      'personagem',
      0,
      { interativa: false },
    ),
  );

  for (const zona of ZONAS_DE_COOLDOWN) {
    const primeira = jogador.cooldown[zona][0];
    if (primeira === undefined) continue;
    pecas.push(
      noEncaixe(
        chaveDaCarta(primeira),
        gavetaDeCooldown(metade, zona),
        cartaVisivel(primeira),
        metade,
        'cooldown',
        zona,
        { interativa: false, ordem: 8 },
      ),
    );
  }

  return pecas;
};

/** A mão do observador, aberta em leque e de frente para ele. */
const maoDoJogador = (jogador: VisaoDeJogador, inclinacao: number): readonly PecaAlvo[] => {
  const total = jogador.mao.length;
  const passo = total <= 1 ? 0 : Math.min(150, MAO_DO_JOGADOR.larguraUtil / total);

  return jogador.mao.map((projetada, indice) => {
    const posicao = posicaoNoLeque(indice, total);
    const carta = projetada.visivel ? cartaVisivel(projetada.carta) : null;
    const chave = projetada.visivel
      ? chaveDaCarta(projetada.carta)
      : chaveVirada('jogador', 'mao', indice);
    return {
      chave,
      carta,
      x: TABULEIRO.largura / 2 + posicao.deslocamento * ((total - 1) / 2) * passo,
      y: MAO_DO_JOGADOR.y + posicao.queda * CARTA.altura,
      /*
       * A carta da mão é a maior da tela, e de propósito: é nela que se lê
       * nome, custo e tipo antes de decidir. A borda inferior da tela corta o
       * pé dela, como na referência — o que precisa estar visível é o topo.
       */
      escala: 1.3,
      giro: posicao.giro,
      inclinacao,
      ordem: 60 + indice,
      interativa: true,
      metade: 'jogador' as const,
      lugar: 'mao' as const,
      indice,
    };
  });
};

/**
 * A mão da máquina: só versos, no topo, num leque invertido e menor.
 *
 * Nenhum identificador entra aqui, porque nenhum chegou: a projeção do humano
 * traz a mão do adversário como contagem, e é a contagem que esta função lê.
 */
const maoDaMaquina = (jogador: VisaoDeJogador, inclinacao: number): readonly PecaAlvo[] => {
  const total = jogador.mao.length;
  const passo = total <= 1 ? 0 : Math.min(86, MAO_DA_MAQUINA.larguraUtil / total);

  return jogador.mao.map((_, indice) => {
    const posicao = posicaoNoLeque(indice, total);
    return {
      chave: chaveVirada('maquina', 'mao', indice),
      carta: null,
      x: TABULEIRO.largura / 2 + posicao.deslocamento * ((total - 1) / 2) * passo,
      y: MAO_DA_MAQUINA.y - posicao.queda * CARTA.altura,
      escala: 0.7,
      // Leque invertido: a curvatura aponta para cima, como uma mão vista de
      // costas do outro lado da mesa.
      giro: -posicao.giro,
      inclinacao,
      ordem: 50 + indice,
      interativa: false,
      metade: 'maquina' as const,
      lugar: 'mao' as const,
      indice,
    };
  });
};

export interface CenaAlvo {
  readonly pecas: readonly PecaAlvo[];
  /** O centro da mão da máquina: a origem do voo das cartas dela. */
  readonly origemDaMaquina: { readonly x: number; readonly y: number };
}

/**
 * Monta a cena inteira a partir da projeção do humano.
 *
 * `humano` e `maquina` são identidades de jogador; `jogador` e `maquina` são
 * **metades do tabuleiro**. A correspondência entre as duas é fixada aqui, uma
 * vez, e nunca mais consultada: é esta linha que garante que a perspectiva não
 * vira.
 */
export const montarCena = (
  visao: VisaoDaPartida,
  humano: string,
  inclinacaoDaMao: number,
): CenaAlvo => {
  const eu = visao.jogadores.find((jogador) => String(jogador.id) === humano);
  const ela = visao.jogadores.find((jogador) => String(jogador.id) !== humano);
  if (eu === undefined || ela === undefined) {
    return { pecas: [], origemDaMaquina: { x: TABULEIRO.largura / 2, y: MAO_DA_MAQUINA.y } };
  }

  return {
    pecas: [
      ...pecasDoCampo(ela, 'maquina'),
      ...pecasDoCampo(eu, 'jogador'),
      ...maoDaMaquina(ela, inclinacaoDaMao),
      ...maoDoJogador(eu, inclinacaoDaMao),
    ],
    origemDaMaquina: { x: TABULEIRO.largura / 2, y: MAO_DA_MAQUINA.y },
  };
};
