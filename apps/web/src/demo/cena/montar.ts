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
  ZONAS_DE_COOLDOWN,
  bandejaDeResposta,
  centroDe,
  compartimentoDeCooldown,
  ehAcaoExtra,
  encaixeDePassiva,
  pedestalDeAcao,
  pedestalDeClasse,
  slotDeUltimate,
} from '../arena/planta.js';

/*
 * De uma projeção para as peças que existem **na mesa**.
 *
 * Este arquivo é a ponte entre "o que o jogador tem direito de saber" e "o que
 * aparece na mesa", e a ponte é de mão única: ele lê `VisaoDaPartida` e nunca o
 * estado canônico. É daí que a privacidade vem de graça — uma carta que o
 * observador não pode ver chega com `visivel: false` e sai daqui como um verso,
 * **sem identificador**. Não existe carta escondida atrás de uma flag: o dado
 * não chegou.
 *
 * O tabuleiro físico contém **somente cartas**. Mão, HUD e controles vivem em
 * coordenadas de tela, em outros módulos. Personagem e pilha de removidas
 * deixaram de ser peças físicas — eram informação ocupando lugar de carta.
 *
 * A perspectiva é fixa: `jogador` é sempre a metade de baixo. Não há parâmetro
 * para inverter, e nenhuma função aqui aceita "de quem é a vez".
 */

export type LugarDaPeca =
  'acao' | 'acao-extra' | 'resposta' | 'passiva' | 'classe' | 'ultimate' | 'cooldown';

export interface PecaDoCampo {
  /** Identidade estável da peça entre um estado e o outro. */
  readonly chave: string;
  /**
   * A carta, quando o observador pode conhecê-la.
   *
   * `null` é verso de verdade. Nenhum campo desta peça carrega o identificador
   * de uma carta que o observador não viu.
   */
  readonly carta: CartaVisivel | null;
  /** A caixa que ela ocupa, em unidades de tabuleiro. */
  readonly caixa: Retangulo;
  readonly x: number;
  readonly y: number;
  readonly escala: number;
  readonly giro: number;
  readonly ordem: number;
  /*
   * As três perguntas que substituíram `interativa`.
   *
   * Um único booleano misturava coisas diferentes, e a mistura produziu o
   * defeito que a revisão pegou: a carta do adversário virada para cima —
   * cuja identidade o jogador **conhece** — não aceitava toque, porque "não é
   * minha" tinha sido escrito como "não é interativa". Conhecer uma carta e
   * poder comandá-la são fatos distintos, e agora são campos distintos.
   */
  /** O observador conhece a identidade desta carta? */
  readonly identidadePublica: boolean;
  /** Dá para abrir a inspeção dela? Só quando a identidade é pública. */
  readonly podeInspecionar: boolean;
  /**
   * Dá para comandar esta peça daqui?
   *
   * Hoje nenhum comando nasce do tabuleiro nesta demo — jogar acontece na
   * mão, e Ativar/Exaurir ainda não têm gesto próprio. O campo existe mesmo
   * assim porque é ele que impede a volta do erro: inspecionável não implica
   * comandável, e é preciso um lugar para dizer isso.
   */
  readonly podeJogar: boolean;
  /** De qual metade ela é. Só para efeito e cor; nunca para posicionar. */
  readonly metade: Metade;
  readonly lugar: LugarDaPeca;
  readonly indice: number;
}

const escalaPara = (caixa: Retangulo): number =>
  Math.min(caixa.largura / CARTA.largura, caixa.altura / CARTA.altura) * 0.9;

/*
 * A orientação física da carta.
 *
 * Uma carta assentada no campo está virada para o dono dela, como estaria numa
 * mesa de verdade. As da máquina ficam a 180°: de cabeça para baixo para quem
 * olha daqui. Isto não é decoração — é a informação de **quem pôs a carta ali**,
 * e desenhá-las todas a 0° fazia as duas metades parecerem uma coleção só.
 *
 * O critério é o dono, e não a metade geométrica do tabuleiro. A bandeja de
 * Resposta é o caso que obriga a distinguir os dois: ela fica encostada no
 * pedestal do **atacante**, mas a carta que entra nela é do defensor — e ela
 * fica virada para o defensor, que foi quem a jogou.
 *
 * Ativar continua sendo o giro de um quarto de volta, e ele se **soma** a esta
 * base: a Carta de Classe ativada da máquina fica a 270°, que é o quarto de
 * volta visto do lado dela.
 */
const REPOUSO: Readonly<Record<Metade, number>> = { jogador: 0, maquina: 180 };

/** O giro de Ativar: um quarto de volta, a partir do repouso do dono. */
export const GIRO_DE_ATIVAR = 90;

const noEncaixe = (
  chave: string,
  caixa: Retangulo,
  carta: CartaVisivel | null,
  metade: Metade,
  lugar: LugarDaPeca,
  indice: number,
  extras: {
    readonly ordem?: number;
    readonly giro?: number;
    readonly deslocamentoX?: number;
  } = {},
): PecaDoCampo => {
  const centro = centroDe(caixa);
  const publica = carta !== null;
  return {
    chave,
    carta,
    caixa: { ...caixa, x: caixa.x + (extras.deslocamentoX ?? 0) },
    x: centro.x + (extras.deslocamentoX ?? 0),
    y: centro.y,
    escala: escalaPara(caixa),
    giro: REPOUSO[metade] + (extras.giro ?? 0),
    ordem: extras.ordem ?? 10,
    /*
     * A identidade vem do **dado**, e não de uma decisão de tela.
     *
     * Quando a projeção não trouxe a carta, `carta` é `null` e não existe
     * identificador nenhum nesta peça. Por isso "é pública" e "dá para
     * inspecionar" são a mesma pergunta: não há como abrir o que não chegou.
     */
    identidadePublica: publica,
    podeInspecionar: publica,
    podeJogar: false,
    metade,
    lugar,
    indice,
  };
};

/**
 * O desvio de uma carta dentro da pilha de um compartimento.
 *
 * Uma carta só fica centrada. Duas ou mais abrem em leque horizontal, e a
 * abertura é proporcional: o que importa é que cada carta deixe uma faixa
 * visível larga o bastante para ser tocada e reconhecida. A ordem segue a
 * metade, porque a pilha da máquina é a mesma pilha vista do outro lado.
 */
export const ABERTURA_DA_PILHA = 30;

export const desvioNaPilha = (posicao: number, total: number, metade: Metade): number => {
  if (total <= 1) return 0;
  const centro = (total - 1) / 2;
  const sentido = metade === 'jogador' ? 1 : -1;
  return (posicao - centro) * ABERTURA_DA_PILHA * sentido;
};

/** A chave de uma carta pública. Estável enquanto a carta for a mesma. */
export const chaveDaCarta = (carta: CardId): string => `c:${String(carta)}`;

/** A chave de uma peça virada. Não carrega identidade: ela não existe aqui. */
export const chaveVirada = (metade: Metade, lugar: string, indice: number): string =>
  `v:${metade}:${lugar}:${String(indice)}`;

const INDICES: readonly IndiceDeAcao[] = [0, 1, 2, 3];

const pecasDeUmLado = (jogador: VisaoDeJogador, metade: Metade): readonly PecaDoCampo[] => {
  const pecas: PecaDoCampo[] = [];

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
          ehAcaoExtra(indice) ? 'acao-extra' : 'acao',
          indice,
          { ordem: 20 },
        ),
      );
    }

    /*
     * A Resposta não tem lugar permanente.
     *
     * A bandeja só existe quando há uma Resposta nela, e ela pertence ao
     * **defensor**: a Resposta a um Ataque desta metade entra na bandeja do
     * outro lado. Depois da resolução a peça some, e a bandeja com ela.
     */
    const resposta = slot.resposta.voluntaria;
    if (resposta !== null && resposta.tipo === 'carta-de-reacao') {
      const daResposta = resposta.perfil.carta;
      pecas.push(
        noEncaixe(
          chaveDaCarta(daResposta),
          bandejaDeResposta(metade, indice),
          cartaVisivel(daResposta),
          metade === 'jogador' ? 'maquina' : 'jogador',
          'resposta',
          indice,
          { ordem: 26 },
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
          { giro: passiva.estado === 'ativada' ? GIRO_DE_ATIVAR : 0 },
        ),
      );
      return;
    }
    // Oculta é oculta: verso, e nenhum identificador em lugar nenhum.
    pecas.push(
      noEncaixe(chaveVirada(metade, 'passiva', indice), caixa, null, metade, 'passiva', indice),
    );
  });

  jogador.cartasDeClasse.forEach((equipada, indice) => {
    // Exaurida sai fisicamente do campo, e o encaixe fica vazio para sempre.
    if (equipada.estado === 'exaurida') return;
    pecas.push(
      noEncaixe(
        chaveDaCarta(equipada.carta),
        pedestalDeClasse(metade, indice),
        cartaVisivel(equipada.carta),
        metade,
        'classe',
        indice,
        { giro: equipada.estado === 'ativada' ? GIRO_DE_ATIVAR : 0 },
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
        { ordem: 14 },
      ),
    );
  }

  /*
   * O cooldown mostra a pilha **inteira**, e não só a primeira carta.
   *
   * Todas elas são públicas — o cooldown é informação aberta —, e desenhar
   * uma só escondia as outras atrás de um número que não existia. A revisão
   * foi explícita: cada carta pública precisa poder ser lida. Elas abrem em
   * leque dentro do compartimento, com uma faixa visível de cada uma, e cada
   * faixa é um alvo de toque.
   */
  for (const zona of ZONAS_DE_COOLDOWN) {
    const naZona = jogador.cooldown[zona];
    naZona.forEach((carta, posicao) => {
      pecas.push(
        noEncaixe(
          chaveDaCarta(carta),
          compartimentoDeCooldown(metade, zona),
          cartaVisivel(carta),
          metade,
          'cooldown',
          zona,
          {
            ordem: 8 + posicao,
            deslocamentoX: desvioNaPilha(posicao, naZona.length, metade),
          },
        ),
      );
    });
  }

  return pecas;
};

/**
 * As peças da mesa, a partir da projeção do humano.
 *
 * `humano` e `maquina` são identidades de jogador; `jogador` e `maquina` são
 * **metades do tabuleiro**. A correspondência entre as duas é fixada aqui, uma
 * vez, e nunca mais consultada: é esta linha que garante que a perspectiva não
 * vira.
 */
export const pecasDoCampo = (visao: VisaoDaPartida, humano: string): readonly PecaDoCampo[] => {
  const eu = visao.jogadores.find((jogador) => String(jogador.id) === humano);
  const ela = visao.jogadores.find((jogador) => String(jogador.id) !== humano);
  if (eu === undefined || ela === undefined) return [];
  return [...pecasDeUmLado(ela, 'maquina'), ...pecasDeUmLado(eu, 'jogador')];
};

/* ---------------------------------------------------------------------------
 * A mão: contagem e identidade, sem posição.
 * ------------------------------------------------------------------------- */

export interface CartaNaMao {
  readonly chave: string;
  readonly carta: CartaVisivel | null;
  readonly indice: number;
}

/** A mão do observador, na ordem em que ele a vê. */
export const maoDoJogador = (visao: VisaoDaPartida, humano: string): readonly CartaNaMao[] => {
  const eu = visao.jogadores.find((jogador) => String(jogador.id) === humano);
  if (eu === undefined) return [];
  return eu.mao.map((projetada, indice) => ({
    chave: projetada.visivel
      ? chaveDaCarta(projetada.carta)
      : chaveVirada('jogador', 'mao', indice),
    carta: projetada.visivel ? cartaVisivel(projetada.carta) : null,
    indice,
  }));
};

/**
 * Quantas cartas a máquina tem na mão.
 *
 * Contagem, e só. Nenhum identificador entra aqui porque nenhum chegou: a
 * projeção do humano traz a mão do adversário como uma lista de cartas
 * invisíveis, e é o tamanho dela que esta função lê. Não há como vazar uma
 * identidade que o dado não carrega.
 */
export const cartasNaMaoDaMaquina = (visao: VisaoDaPartida, humano: string): number => {
  const ela = visao.jogadores.find((jogador) => String(jogador.id) !== humano);
  return ela?.mao.length ?? 0;
};
