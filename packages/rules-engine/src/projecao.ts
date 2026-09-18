import type {
  Anotacoes,
  CardId,
  CartaProjetada,
  EscolhasDaAcao,
  EscolhasProjetadas,
  EstadoDaPartida,
  EstadoDeJogador,
  PassivaProjetada,
  PlayerId,
  RecursoProjetado,
  SlotDeAcao,
  SlotDeAcaoProjetado,
  SlotsDeAcaoProjetados,
  VisaoDaPartida,
  VisaoDeJogador,
} from '@arcane-duel/shared-types';
import { ORIGEM_DAS_ESCOLHAS, anotacoesPublicas } from '@arcane-duel/shared-types';
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

/** As Passivas deste jogador que ainda estão viradas para baixo. */
const passivasOcultas = (jogador: EstadoDeJogador): ReadonlySet<CardId> =>
  new Set(
    jogador.passivas
      .filter((passiva) => passiva.estado === 'oculta')
      .map((passiva) => passiva.carta),
  );

/**
 * Filtra as escolhas de uma jogada para um observador que não as fez.
 *
 * O critério é semântico e vem de `ORIGEM_DAS_ESCOLHAS`: o que aponta para
 * zona secreta não atravessa, e o que aponta para uma Passiva própria só
 * atravessa depois de ela se revelar. O campo **não existe** na saída — não é
 * mascarado, não é substituído por um marcador com o identificador dentro.
 */
const projetarEscolhas = (
  escolhas: EscolhasDaAcao,
  dono: boolean,
  ocultasDeQuemEscolheu: ReadonlySet<CardId>,
): EscolhasProjetadas => {
  if (dono) return { ...escolhas };

  const filtradas: EscolhasProjetadas = {};
  for (const [campo, valor] of Object.entries(escolhas)) {
    if (valor === undefined) continue;
    const origem = ORIGEM_DAS_ESCOLHAS[campo as keyof EscolhasDaAcao];
    if (origem === 'zona-secreta') continue;
    if (origem === 'passiva-propria' && ocultasDeQuemEscolheu.has(valor as CardId)) continue;
    // Campo sem classificação é campo novo que ninguém classificou: na dúvida,
    // ele não atravessa. A tabela é exaustiva por tipo, então isto é a rede de
    // segurança para um campo que chegue por outro caminho.
    if (origem === undefined) continue;
    (filtradas as Record<string, unknown>)[campo] = valor;
  }
  return filtradas;
};

/**
 * Projeta um espaço de Ação.
 *
 * As duas metades têm donos diferentes: as escolhas da Ação são de quem
 * declarou, e as da Resposta são de quem respondeu — que é o adversário dele.
 * Por isso os dois flags são separados, e o espectador não recebe nenhuma das
 * duas.
 */
const projetarSlot = (
  slot: SlotDeAcao,
  quemDeclarou: boolean,
  quemRespondeu: boolean,
  ocultasDeQuemDeclarou: ReadonlySet<CardId>,
  ocultasDeQuemRespondeu: ReadonlySet<CardId>,
): SlotDeAcaoProjetado => ({
  indice: slot.indice,
  situacao: slot.situacao,
  perfil: slot.perfil,
  escolhas: projetarEscolhas(slot.escolhas, quemDeclarou, ocultasDeQuemDeclarou),
  resposta: {
    voluntaria: slot.resposta.voluntaria,
    escolhas: projetarEscolhas(slot.resposta.escolhas, quemRespondeu, ocultasDeQuemRespondeu),
  },
  modificadores: { ...slot.modificadores },
  reducaoDaResposta: { ...slot.reducaoDaResposta },
  danoFinalDefinido: slot.danoFinalDefinido,
  impactoFinalDefinido: slot.impactoFinalDefinido,
  impedirRuptura: slot.impedirRuptura,
  bonusDeRupturaSubstituto: slot.bonusDeRupturaSubstituto,
  bonusAposReducao: slot.bonusAposReducao,
  textoCancelado: slot.textoCancelado,
  recursoGasto: slot.recursoGasto,
  cartasDeClasseUsadas: slot.cartasDeClasseUsadas.map((uso) => ({ ...uso })),
});

/** Contexto que a projeção dos espaços de Ação precisa além do próprio jogador. */
export interface ContextoDaProjecao {
  /** O observador é quem respondeu às Ações deste jogador? */
  readonly respondeAsAcoes: boolean;
  /** Passivas ainda ocultas de quem respondeu às Ações deste jogador. */
  readonly ocultasDeQuemRespondeu: ReadonlySet<CardId>;
}

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
export const projetarJogador = (
  jogador: EstadoDeJogador,
  dono: boolean,
  contexto: ContextoDaProjecao = { respondeAsAcoes: false, ocultasDeQuemRespondeu: new Set() },
): VisaoDeJogador => ({
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

  acoes: projetarSlots(jogador, dono, contexto),
  acoesPermitidasNoTurno: jogador.acoesPermitidasNoTurno,
  condicoes: { ...jogador.condicoes },
  recurso: projetarRecurso(jogador, dono),
  // Quase toda anotação nasce de texto que resolveu em público. As poucas que
  // guardam informação de zona secreta se declaram `privada-do-dono`, e essas
  // não são copiadas para quem não é o dono.
  anotacoes: projetarAnotacoes(jogador.anotacoes, dono),
  removidas: [...jogador.removidas],
});

const projetarSlots = (
  jogador: EstadoDeJogador,
  dono: boolean,
  contexto: ContextoDaProjecao,
): SlotsDeAcaoProjetados => {
  const minhas = passivasOcultas(jogador);
  const projetarIndice = (indice: 0 | 1 | 2 | 3): SlotDeAcaoProjetado =>
    projetarSlot(
      jogador.acoes[indice],
      dono,
      contexto.respondeAsAcoes,
      minhas,
      contexto.ocultasDeQuemRespondeu,
    );
  return [projetarIndice(0), projetarIndice(1), projetarIndice(2), projetarIndice(3)];
};

/**
 * Projeta o componente de classe.
 *
 * Onze classes têm componente inteiramente público — fichas, trilhas e
 * marcadores na mesa (§16) — e atravessam como estão. O Patrulheiro é a
 * exceção: a Emboscada guarda um Ataque **face-down**, e o que o adversário
 * pode saber é que ela existe, não qual carta é.
 */
const projetarRecurso = (jogador: EstadoDeJogador, dono: boolean): RecursoProjetado => {
  const recurso = jogador.recurso;
  if (recurso.classe !== 'patrulheiro') return { ...recurso };

  // Lida com `?? null` de propósito: a projeção é o que o cliente recebe e não
  // pode lançar exceção por causa de um estado malformado vindo de um replay.
  const emboscada = recurso.emboscada ?? null;
  return {
    classe: 'patrulheiro',
    marcaDaPresa: recurso.marcaDaPresa,
    emboscada:
      emboscada === null
        ? null
        : {
            estado: emboscada.estado,
            carta: dono ? revelar(emboscada.carta) : ocultar(),
          },
  };
};

const projetarAnotacoes = (anotacoes: Anotacoes, dono: boolean): Anotacoes =>
  (dono ? anotacoes : anotacoesPublicas(anotacoes)).map((anotacao) => ({ ...anotacao }));

const projetar = (partida: EstadoDaPartida, perspectiva: PlayerId | null): VisaoDaPartida => ({
  id: partida.id,
  versoes: { ...partida.versoes },
  situacao: partida.situacao,
  turno: partida.turno === null ? null : { ...partida.turno },
  desfecho: partida.desfecho === null ? null : { ...partida.desfecho },
  jogadores: [
    projetarJogador(partida.jogadores[0], partida.jogadores[0].id === perspectiva, {
      // Quem responde às Ações do primeiro jogador é o segundo: as escolhas da
      // Resposta são dele, e é ele quem pode vê-las.
      respondeAsAcoes: perspectiva !== null && partida.jogadores[1].id === perspectiva,
      ocultasDeQuemRespondeu: passivasOcultas(partida.jogadores[1]),
    }),
    projetarJogador(partida.jogadores[1], partida.jogadores[1].id === perspectiva, {
      respondeAsAcoes: perspectiva !== null && partida.jogadores[0].id === perspectiva,
      ocultasDeQuemRespondeu: passivasOcultas(partida.jogadores[0]),
    }),
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
