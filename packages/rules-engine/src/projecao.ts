import type {
  CardId,
  CartaProjetada,
  EstadoDaPartida,
  EstadoDeJogador,
  PassivaProjetada,
  PlayerId,
  VisaoDaPartida,
  VisaoDeJogador,
} from '@arcane-duel/shared-types';
/*
 * Projeção do estado canônico para quem está olhando.
 *
 * O cliente nunca recebe o estado canônico: ele recebe uma visão. O que está
 * escondido não é marcado como escondido — ele simplesmente não é copiado para
 * dentro da visão, de modo que não existe campo nenhum de onde vazar
 * (FULL_GAME_SPEC.md §20 e §32).
 *
 * O que fica escondido do adversário:
 *
 * - a identidade das cartas na mão, porque a mão é informação privada e a IA
 *   não pode conhecer "habilidades escondidas do adversário" (§18);
 * - a identidade das Passivas ainda face-down, que só se revelam quando a
 *   condição delas acontece (§12);
 * - a semente do replay, que não pertence a jogador nenhum.
 *
 * O que é público, e por quê:
 *
 * - Cartas de Classe começam face-up no campo (§13);
 * - a Ultimate começa face-up e o adversário sabe qual foi escolhida (§14);
 * - Condições ficam na área de Condições, visíveis na mesa (§15);
 * - os componentes de classe são fichas, trilhas e marcadores físicos (§16);
 * - Vida, Guarda, pontos de Ação e Reserva são valores visíveis;
 * - cartas em cooldown já foram jogadas publicamente, então continuam
 *   conhecidas — o cooldown é uma zona física à vista (§11).
 */

const ocultar = (): CartaProjetada => ({ visivel: false });
const revelar = (carta: CardId): CartaProjetada => ({ visivel: true, carta });

const projetarCooldown = (jogador: EstadoDeJogador): VisaoDeJogador['cooldown'] => ({
  1: [...jogador.cooldown[1]],
  2: [...jogador.cooldown[2]],
  3: [...jogador.cooldown[3]],
});

const projetarPassivas = (jogador: EstadoDeJogador, dono: boolean): readonly PassivaProjetada[] =>
  jogador.passivas.map((passiva) => ({
    estado: passiva.estado,
    carta: dono || passiva.estado !== 'oculta' ? revelar(passiva.carta) : ocultar(),
  }));

/**
 * Projeta um jogador. `dono` é verdadeiro quando quem olha é o próprio dono
 * daquele estado — só ele enxerga a própria mão e as próprias Passivas ainda
 * não reveladas.
 */
export const projetarJogador = (jogador: EstadoDeJogador, dono: boolean): VisaoDeJogador => ({
  id: jogador.id,
  classe: jogador.classe,
  personagem: jogador.personagem,

  vida: jogador.vida,
  guarda: jogador.guarda,
  pontosDeAcao: jogador.pontosDeAcao,
  reserva: jogador.reserva,
  impulsoInicial: jogador.impulsoInicial,
  acoesRealizadasNoTurno: jogador.acoesRealizadasNoTurno,

  // A quantidade continua visível; a identidade, não.
  mao: jogador.mao.map((carta) => (dono ? revelar(carta) : ocultar())),
  cooldown: projetarCooldown(jogador),

  passivas: projetarPassivas(jogador, dono),
  cartasDeClasse: jogador.cartasDeClasse.map((item) => ({ ...item })),
  ultimate: { ...jogador.ultimate },

  acoes: [
    { ...jogador.acoes[0], resposta: { ...jogador.acoes[0].resposta } },
    { ...jogador.acoes[1], resposta: { ...jogador.acoes[1].resposta } },
    { ...jogador.acoes[2], resposta: { ...jogador.acoes[2].resposta } },
    { ...jogador.acoes[3], resposta: { ...jogador.acoes[3].resposta } },
  ],
  acoesPermitidasNoTurno: jogador.acoesPermitidasNoTurno,
  condicoes: { ...jogador.condicoes },
  recurso: { ...jogador.recurso },
  // Anotações só nascem quando o texto de uma carta resolve em público, então
  // não há identidade escondida para vazar por aqui.
  anotacoes: jogador.anotacoes.map((anotacao) => ({ ...anotacao })),
  removidas: [...jogador.removidas],
});

const projetar = (partida: EstadoDaPartida, perspectiva: PlayerId | null): VisaoDaPartida => ({
  id: partida.id,
  versoes: { ...partida.versoes },
  situacao: partida.situacao,
  turno: partida.turno === null ? null : { ...partida.turno },
  desfecho: partida.desfecho === null ? null : { ...partida.desfecho },
  jogadores: [
    projetarJogador(partida.jogadores[0], partida.jogadores[0].id === perspectiva),
    projetarJogador(partida.jogadores[1], partida.jogadores[1].id === perspectiva),
  ],
  perspectiva,
});

/**
 * Visão de um jogador: o próprio estado por inteiro, o do adversário filtrado.
 *
 * Um identificador que não pertence à partida produz uma visão de espectador,
 * e não uma visão privilegiada por engano.
 */
export const projetarParaJogador = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
): VisaoDaPartida => {
  const pertence = partida.jogadores.some((atual) => atual.id === jogador);
  return projetar(partida, pertence ? jogador : null);
};

/** Visão de espectador: nada de informação escondida de nenhum dos dois lados. */
export const projetarParaEspectador = (partida: EstadoDaPartida): VisaoDaPartida =>
  projetar(partida, null);
