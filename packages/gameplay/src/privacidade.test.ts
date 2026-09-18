import { describe, expect, it } from 'vitest';
import type {
  CardId,
  EstadoDaPartida,
  PlayerId,
  SlotDeAcao,
  VisaoDaPartida,
} from '@arcane-duel/shared-types';
import type { EventoUniversal } from '@arcane-duel/rules-engine';
import { ORIGEM_DAS_ESCOLHAS } from '@arcane-duel/shared-types';
import { projetarParaEspectador, projetarParaJogador } from '@arcane-duel/rules-engine';

import { RECEITAS_INICIAIS } from './receitas.js';
import { JOGADOR_A, JOGADOR_B, simularPartida } from './simulador/motor.js';
import {
  build,
  carta,
  com,
  duelo,
  emboscadaDeTeste,
  jogador,
  jogar,
  virarTurno,
} from './teste-apoio.js';

/*
 * Privacidade da projeção, nas doze classes.
 *
 * `projecao.test.ts` já prova a regra no motor, com um estado montado à mão.
 * O que falta é a regressão transversal: rodar partidas de verdade com as doze
 * Receitas 1 e conferir, em **todo** estado que elas produzem, que nada
 * privado atravessa a projeção.
 *
 * Esta tarefa não muda a regra de visibilidade — ela a fixa:
 *
 * - a identidade das cartas na mão é privada (§20, §32);
 * - a identidade de uma Passiva ainda oculta é privada (§12);
 * - o cooldown é zona física à vista, e continua público (§11);
 * - Cartas de Classe e Ultimate começam face-up, e continuam públicas (§13, §14);
 * - os componentes de classe são fichas e trilhas na mesa, e continuam públicos (§16).
 */

const CLASSES = Object.keys(RECEITAS_INICIAIS) as readonly (keyof typeof RECEITAS_INICIAIS)[];

/**
 * O identificador aparece na string como valor ou como parte de uma chave?
 *
 * A fronteira importa: `C01` é carta do Clérigo e também sufixo de `NC01`, do
 * Necromante. Procurar substring solta acusaria vazamento onde não há.
 */
const apareceEm = (texto: string, id: CardId): boolean =>
  new RegExp(`(?<![A-Za-z0-9_-])${id}(?![A-Za-z0-9_-])`).test(texto);

/**
 * Identificadores citados por um evento.
 *
 * Uma carta citada no log é uma carta que saiu da mão para uma zona à vista —
 * declarada, respondida, mandada ao cooldown, revelada. É essa a fronteira
 * certa entre privado e público, e não "está na mão agora": uma habilidade
 * jogada, resolvida e depois devolvida à mão continua sendo uma carta que o
 * adversário assistiu ser jogada.
 *
 * O critério é deliberadamente generoso com o que conta como público, para que
 * a conferência não acuse falso positivo. Ele por isso **não** é a prova de
 * que o log inteiro poderia ser entregue ao adversário: o log canônico é o
 * registro do replay e carrega até a semente, que projeção nenhuma mostra.
 */
const citadosPor = (evento: EventoUniversal): readonly string[] => {
  // Um evento que registra anotação privada não torna nada público: ele é
  // registro de replay, e o que ele carrega é justamente o segredo.
  if ('visibilidade' in evento && evento.visibilidade === 'privada-do-dono') return [];
  const citados: string[] = [];
  for (const valor of Object.values(evento as Record<string, unknown>)) {
    if (typeof valor === 'string') citados.push(valor);
    else if (Array.isArray(valor)) {
      for (const item of valor) if (typeof item === 'string') citados.push(item);
    }
  }
  return citados;
};

/** Um passo da partida: o estado produzido e o que o adversário já viu até ali. */
interface Passo {
  readonly partida: EstadoDaPartida;
  readonly publicas: ReadonlySet<string>;
}

/**
 * As cartas cuja identidade ainda é privada neste passo, para este jogador.
 *
 * Passiva oculta nunca foi jogada, então nunca é pública. Carta na mão só é
 * privada enquanto o log não a tiver citado.
 */
const privadasDe = (passo: Passo, dono: PlayerId): readonly CardId[] => {
  const jogador = passo.partida.jogadores.find((atual) => atual.id === dono);
  if (jogador === undefined) return [];
  const ocultas = jogador.passivas
    .filter((passiva) => passiva.estado === 'oculta')
    .map((passiva) => passiva.carta);
  return [...jogador.mao, ...ocultas].filter((carta) => !passo.publicas.has(carta));
};

/**
 * Identificadores privados que escaparam para dentro de uma visão.
 *
 * A conferência é feita sobre a visão serializada porque o vazamento que
 * importa é o que chega ao cliente: não adianta o campo certo estar oculto se
 * o mesmo identificador sai por uma anotação, por um espaço de Ação ou por um
 * campo que ninguém lembrou de filtrar.
 */
const vazamentos = (visao: VisaoDaPartida, passo: Passo, dono: PlayerId): readonly CardId[] => {
  const texto = JSON.stringify(visao);
  return privadasDe(passo, dono).filter((id) => apareceEm(texto, id));
};

/** Roda uma partida de verdade e devolve cada passo com o log acumulado. */
const passosDe = (classe: string, adversaria: string, semente: string): readonly Passo[] => {
  const passos: Passo[] = [];
  const publicas = new Set<string>();
  simularPartida({
    semente,
    buildA: RECEITAS_INICIAIS[classe as keyof typeof RECEITAS_INICIAIS],
    buildB: RECEITAS_INICIAIS[adversaria as keyof typeof RECEITAS_INICIAIS],
    primeiroJogador: 'a',
    observador: (partida, eventos) => {
      for (const evento of eventos) for (const id of citadosPor(evento)) publicas.add(id);
      passos.push({ partida, publicas: new Set(publicas) });
    },
  });
  return passos;
};

describe('privacidade da projeção nas doze classes', () => {
  it('cobre as doze classes', () => {
    expect(CLASSES).toHaveLength(12);
  });

  for (const classe of CLASSES) {
    describe(classe, () => {
      const adversaria = classe === 'guerreiro' ? 'mago' : 'guerreiro';
      const passos = passosDe(classe, adversaria, `privacidade-${classe}`);
      const ultimo = passos[passos.length - 1];

      it('produz passos para conferir', () => {
        expect(passos.length).toBeGreaterThan(3);
        expect(ultimo).toBeDefined();
      });

      it('nunca cita ao adversário uma carta que ele ainda não viu', () => {
        for (const passo of passos) {
          const visaoDoB = projetarParaJogador(passo.partida, JOGADOR_B);
          expect(vazamentos(visaoDoB, passo, JOGADOR_A), `${classe} vaza para B`).toEqual([]);

          const visaoDoA = projetarParaJogador(passo.partida, JOGADOR_A);
          expect(vazamentos(visaoDoA, passo, JOGADOR_B), `${classe} vaza para A`).toEqual([]);
        }
      });

      it('nunca cita ao espectador uma carta ainda escondida, dos dois lados', () => {
        for (const passo of passos) {
          const visao = projetarParaEspectador(passo.partida);
          expect(vazamentos(visao, passo, JOGADOR_A), `${classe} vaza no espectador`).toEqual([]);
          expect(vazamentos(visao, passo, JOGADOR_B), `${classe} vaza no espectador`).toEqual([]);
        }
      });

      it('nunca revela o identificador de uma Passiva ainda oculta', () => {
        // Passiva oculta é o caso absoluto: ela nunca foi jogada, então o log
        // jamais a citou e ela não pode aparecer em canto nenhum da visão.
        for (const passo of passos) {
          const dono = passo.partida.jogadores.find((atual) => atual.id === JOGADOR_A);
          const ocultas = (dono?.passivas ?? [])
            .filter((passiva) => passiva.estado === 'oculta')
            .map((passiva) => passiva.carta);

          for (const visao of [
            projetarParaJogador(passo.partida, JOGADOR_B),
            projetarParaEspectador(passo.partida),
          ]) {
            const texto = JSON.stringify(visao);
            for (const oculta of ocultas) {
              expect(apareceEm(texto, oculta), `${classe}: ${oculta} vazou`).toBe(false);
            }
          }
        }
      });

      it('mostra ao dono a própria mão e as próprias Passivas ocultas', () => {
        const visao = projetarParaJogador(ultimo!.partida, JOGADOR_A);
        const dono = visao.jogadores.find((atual) => atual.id === JOGADOR_A);
        expect(dono).toBeDefined();
        for (const carta of dono?.mao ?? []) expect(carta.visivel).toBe(true);
        for (const passiva of dono?.passivas ?? []) expect(passiva.carta.visivel).toBe(true);
      });

      it('mantém o cooldown do adversário à vista, como zona física', () => {
        const visao = projetarParaJogador(ultimo!.partida, JOGADOR_B);
        const adversario = visao.jogadores.find((atual) => atual.id === JOGADOR_A);
        const canonico = ultimo!.partida.jogadores.find((atual) => atual.id === JOGADOR_A);
        expect(adversario?.cooldown).toEqual(canonico?.cooldown);
      });

      it('mantém público o componente de classe do adversário', () => {
        const visao = projetarParaJogador(ultimo!.partida, JOGADOR_B);
        const adversario = visao.jogadores.find((atual) => atual.id === JOGADOR_A);
        const canonico = ultimo!.partida.jogadores.find((atual) => atual.id === JOGADOR_A);

        // Fichas, trilhas e marcadores são componentes na mesa (§16).
        expect(adversario?.recurso).toEqual(canonico?.recurso);
        expect(adversario?.recurso.classe).toBe(classe);
        // Cartas de Classe e Ultimate começam face-up (§13, §14).
        expect(adversario?.cartasDeClasse).toEqual(canonico?.cartasDeClasse);
        expect(adversario?.ultimate).toEqual(canonico?.ultimate);
        // Vida, Guarda, AP e Reserva são valores visíveis (§5, §6).
        expect(adversario?.vida).toBe(canonico?.vida);
        expect(adversario?.guarda).toBe(canonico?.guarda);
        expect(adversario?.pontosDeAcao).toBe(canonico?.pontosDeAcao);
        expect(adversario?.reserva).toBe(canonico?.reserva);
      });

      it('esconde a identidade da mão, nunca a quantidade', () => {
        const visao = projetarParaJogador(ultimo!.partida, JOGADOR_B);
        const adversario = visao.jogadores.find((atual) => atual.id === JOGADOR_A);
        const canonico = ultimo!.partida.jogadores.find((atual) => atual.id === JOGADOR_A);
        expect(adversario?.mao).toHaveLength(canonico?.mao.length ?? -1);
        for (const carta of adversario?.mao ?? []) expect(carta.visivel).toBe(false);
      });

      it('não carrega a semente do replay para dentro da visão', () => {
        // O identificador da partida é público; a semente não entra em campo
        // nenhum da projeção, e é isso que se confere aqui.
        for (const passo of passos) {
          for (const visao of [
            projetarParaJogador(passo.partida, JOGADOR_B),
            projetarParaEspectador(passo.partida),
          ]) {
            expect(Object.keys(visao)).not.toContain('semente');
            expect((visao as unknown as { semente?: string }).semente).toBeUndefined();
          }
        }
      });
    });
  }
});

/*
 * Preparar Emboscada preserva a identidade face-down.
 *
 * "Coloque face-down" não é enfeite de texto: o dono sabe qual Ataque
 * reservou, o adversário não, o espectador não, e o estado canônico precisa
 * saber para o desconto funcionar. Esta regressão cobre as três visões e a
 * mecânica inteira, porque esconder a carta não pode custar o funcionamento
 * dela.
 */
describe('Preparar Emboscada (R13) preserva a identidade face-down', () => {
  const RESERVADA = carta('R05');

  interface Emboscada {
    readonly partida: EstadoDaPartida;
    readonly antes: EstadoDaPartida;
  }

  const emboscar = (): Emboscada => {
    const patrulheiro = build('patrulheiro', { habilidades: ['R13', 'R05', 'R02', 'R01'] });
    const antes = duelo(patrulheiro, build('guerreiro'), JOGADOR_A);
    expect(jogador(antes, JOGADOR_A).mao).toContain(RESERVADA);
    const { partida } = jogar(antes, JOGADOR_A, {
      pedido: { carta: carta('R13'), escolhas: { cartaDaMao: RESERVADA } },
    });
    return { partida, antes };
  };

  /**
   * Leva a partida até o terceiro espaço do turno em que a Emboscada está
   * armada: a carta reservada só pode ser declarada ali.
   */
  const terceiraAcao = (partida: EstadoDaPartida): EstadoDaPartida => {
    const proximo = virarTurno(virarTurno(partida, JOGADOR_A), JOGADOR_B);
    const uma = jogar(proximo, JOGADOR_A, { pedido: { carta: carta('R02') } }).partida;
    return jogar(uma, JOGADOR_A, { pedido: { carta: carta('R01') } }).partida;
  };

  const visaoDe = (partida: EstadoDaPartida, quem: PlayerId | null): string =>
    JSON.stringify(
      quem === null ? projetarParaEspectador(partida) : projetarParaJogador(partida, quem),
    );

  it('1. o Patrulheiro usa R13 e reserva R05', () => {
    const { partida } = emboscar();
    expect(jogador(partida, JOGADOR_A).acoes[0].escolhas.cartaDaMao).toBe(RESERVADA);
  });

  it('2. o estado canônico sabe que R05 foi reservado', () => {
    const { partida } = emboscar();
    // A reserva é uma zona do componente de classe, e não uma anotação: a
    // carta saiu da mão e está face-down sobre o terceiro espaço.
    expect(emboscadaDeTeste(partida, JOGADOR_A)).toEqual({
      carta: RESERVADA,
      estado: 'preparada',
    });
    expect(jogador(partida, JOGADOR_A).mao).not.toContain(RESERVADA);
  });

  it('3. a visão do dono contém a identidade R05, na escolha e na reserva', () => {
    const { partida } = emboscar();
    const visao = projetarParaJogador(partida, JOGADOR_A);
    const dono = visao.jogadores.find((atual) => atual.id === JOGADOR_A);

    expect(dono?.acoes[0].escolhas.cartaDaMao).toBe(RESERVADA);
    const recurso = dono?.recurso;
    expect(recurso?.classe).toBe('patrulheiro');
    const reserva = recurso?.classe === 'patrulheiro' ? recurso.emboscada : null;
    expect(reserva?.estado).toBe('preparada');
    expect(reserva?.carta).toEqual({ visivel: true, carta: RESERVADA });
  });

  it('4. a visão do adversário não contém R05 pela escolha', () => {
    const { partida } = emboscar();
    const visao = projetarParaJogador(partida, JOGADOR_B);
    const patrulheiro = visao.jogadores.find((atual) => atual.id === JOGADOR_A);

    // O campo não existe — não é uma flag com o identificador ainda dentro.
    expect(patrulheiro?.acoes[0].escolhas.cartaDaMao).toBeUndefined();
    expect(Object.keys(patrulheiro?.acoes[0].escolhas ?? {})).not.toContain('cartaDaMao');
  });

  it('5. a visão do adversário não contém a chave ataque-emboscado:R05', () => {
    const { partida } = emboscar();
    const visao = projetarParaJogador(partida, JOGADOR_B);
    const patrulheiro = visao.jogadores.find((atual) => atual.id === JOGADOR_A);

    expect(patrulheiro?.anotacoes.some((atual) => atual.chave.includes(RESERVADA))).toBe(false);
    expect(visaoDe(partida, JOGADOR_B)).not.toContain('ataque-emboscado:');
  });

  it('6. o JSON inteiro da visão adversária não contém o identificador privado', () => {
    const { partida } = emboscar();
    expect(apareceEm(visaoDe(partida, JOGADOR_B), RESERVADA)).toBe(false);
  });

  it('7. a visão de espectador também não contém o identificador privado', () => {
    const { partida } = emboscar();
    expect(apareceEm(visaoDe(partida, null), RESERVADA)).toBe(false);
  });

  it('8. a quantidade da mão continua correta', () => {
    const { partida } = emboscar();
    const canonico = jogador(partida, JOGADOR_A);
    const visao = projetarParaJogador(partida, JOGADOR_B);
    const patrulheiro = visao.jogadores.find((atual) => atual.id === JOGADOR_A);

    expect(patrulheiro?.mao).toHaveLength(canonico.mao.length);
    for (const item of patrulheiro?.mao ?? []) expect(item.visivel).toBe(false);
  });

  it('9. o adversário continua vendo a Ação pública R13', () => {
    const { partida } = emboscar();
    const visao = projetarParaJogador(partida, JOGADOR_B);
    const patrulheiro = visao.jogadores.find((atual) => atual.id === JOGADOR_A);

    expect(patrulheiro?.acoes[0].perfil?.carta).toBe(carta('R13'));
    expect(patrulheiro?.acoes[0].situacao).toBe('resolvida');
  });

  it('10. o adversário não aprende qual Ataque está face-down', () => {
    const { partida, antes } = emboscar();
    const texto = visaoDe(partida, JOGADOR_B);

    // Nenhuma das cartas que estavam na mão e continuam nela pode aparecer.
    const naMao = jogador(partida, JOGADOR_A).mao;
    for (const escondida of naMao) {
      expect(apareceEm(texto, escondida), `${escondida} vazou`).toBe(false);
    }
    // Nem a reservada, que saiu da mão sem virar pública.
    expect(naMao).not.toContain(RESERVADA);
    expect(jogador(antes, JOGADOR_A).mao).toContain(RESERVADA);

    // O que ele vê é que existe uma carta face-down, e só isso.
    const visao = projetarParaJogador(partida, JOGADOR_B);
    const recurso = visao.jogadores.find((atual) => atual.id === JOGADOR_A)?.recurso;
    const reserva = recurso?.classe === 'patrulheiro' ? recurso.emboscada : null;
    expect(reserva).not.toBeNull();
    expect(reserva?.carta).toEqual({ visivel: false });
  });

  it('11. jogado depois, o Ataque reservado passa a ser público normalmente', () => {
    const { partida } = emboscar();
    const { partida: atacou } = jogar(terceiraAcao(partida), JOGADOR_A, {
      pedido: { carta: RESERVADA },
    });

    const visao = projetarParaJogador(atacou, JOGADOR_B);
    const patrulheiro = visao.jogadores.find((atual) => atual.id === JOGADOR_A);
    // Agora ele é uma Ação declarada à vista de todos, no terceiro espaço.
    expect(patrulheiro?.acoes[2].perfil?.carta).toBe(RESERVADA);
    expect(apareceEm(JSON.stringify(visao), RESERVADA)).toBe(true);
    // E a reserva deixou de existir: nada de emboscada eterna.
    expect(emboscadaDeTeste(atacou, JOGADOR_A)).toBeNull();
  });

  it('12. o desconto de 1 AP continua sendo aplicado à carta reservada', () => {
    const { partida } = emboscar();
    const pronto = terceiraAcao(partida);
    const apAntes = jogador(pronto, JOGADOR_A).pontosDeAcao;
    const { partida: depois } = jogar(pronto, JOGADOR_A, { pedido: { carta: RESERVADA } });
    // R05 custa 2 AP impressos e sai por 1.
    expect(apAntes - jogador(depois, JOGADOR_A).pontosDeAcao).toBe(1);
  });

  it('13. outra carta da mão não recebe o desconto', () => {
    const { partida } = emboscar();
    const proximo = virarTurno(virarTurno(partida, JOGADOR_A), JOGADOR_B);
    const apAntes = jogador(proximo, JOGADOR_A).pontosDeAcao;
    // R02 também custa 2 AP impressos, e não foi a reservada.
    const { partida: depois } = jogar(proximo, JOGADOR_A, { pedido: { carta: carta('R02') } });
    expect(apAntes - jogador(depois, JOGADOR_A).pontosDeAcao).toBe(2);
  });

  it('14. sem ser usado, o Ataque reservado volta à mão sem virar público', () => {
    const { partida } = emboscar();
    const armada = virarTurno(virarTurno(partida, JOGADOR_A), JOGADOR_B);
    expect(jogador(armada, JOGADOR_A).mao).not.toContain(RESERVADA);

    // "Se não for usado até o fim daquele turno, volta à mão."
    const virada = virarTurno(armada, JOGADOR_A);
    expect(jogador(virada, JOGADOR_A).mao).toContain(RESERVADA);
    expect(emboscadaDeTeste(virada, JOGADOR_A)).toBeNull();
    expect(apareceEm(visaoDe(virada, JOGADOR_B), RESERVADA)).toBe(false);
  });

  it('15. o replay continua determinístico com a anotação privada', () => {
    const uma = emboscar().partida;
    const outra = emboscar().partida;
    expect(JSON.stringify(outra)).toEqual(JSON.stringify(uma));
    // E a visão de cada observador também é estável.
    expect(visaoDe(outra, JOGADOR_B)).toEqual(visaoDe(uma, JOGADOR_B));
    expect(visaoDe(outra, null)).toEqual(visaoDe(uma, null));
  });
});

/*
 * A guarda estrutural.
 *
 * A regressão das doze classes e a do R13 provam casos; esta prova a regra.
 * Ela injeta informação privada diretamente no estado — em escolha de Ação, em
 * escolha de Resposta e em anotação — e confere que a projeção a retém, sem
 * depender de qual carta a teria criado nem de ela estar em alguma Receita.
 */
describe('guarda estrutural da projeção', () => {
  const SEGREDO = carta('R05');

  const mesa = (): EstadoDaPartida => duelo(build('patrulheiro'), build('guerreiro'), JOGADOR_A);

  /** Escreve escolhas cruas em um espaço de Ação, como só o motor faria. */
  const comEscolhas = (
    partida: EstadoDaPartida,
    dono: PlayerId,
    indice: 0 | 1 | 2 | 3,
    daAcao: Record<string, unknown>,
    daResposta: Record<string, unknown> = {},
  ): EstadoDaPartida => {
    const atual = jogador(partida, dono);
    const reescrever = (slot: SlotDeAcao, posicao: number): SlotDeAcao =>
      posicao === indice
        ? {
            ...slot,
            escolhas: { ...slot.escolhas, ...daAcao },
            resposta: { ...slot.resposta, escolhas: { ...slot.resposta.escolhas, ...daResposta } },
          }
        : slot;
    return com(partida, dono, {
      acoes: [
        reescrever(atual.acoes[0], 0),
        reescrever(atual.acoes[1], 1),
        reescrever(atual.acoes[2], 2),
        reescrever(atual.acoes[3], 3),
      ],
    });
  };

  it('classifica todo campo de EscolhasDaAcao, sem deixar nenhum sem origem', () => {
    // A exaustividade é garantida pelo tipo; este teste pega o caso em que
    // alguém contorna o tipo e acrescenta um campo sem classificá-lo.
    const classificados = Object.keys(ORIGEM_DAS_ESCOLHAS);
    expect(classificados.length).toBeGreaterThan(20);
    for (const origem of Object.values(ORIGEM_DAS_ESCOLHAS)) {
      expect(['publica', 'zona-secreta', 'passiva-propria']).toContain(origem);
    }
  });

  it('retém escolha de zona secreta em qualquer um dos quatro espaços', () => {
    for (const indice of [0, 1, 2, 3] as const) {
      const partida = comEscolhas(mesa(), JOGADOR_A, indice, { cartaDaMao: SEGREDO });

      const doDono = JSON.stringify(projetarParaJogador(partida, JOGADOR_A));
      expect(apareceEm(doDono, SEGREDO), `espaço ${String(indice)}: o dono precisa ver`).toBe(true);

      for (const observador of [JOGADOR_B, null]) {
        const texto = JSON.stringify(
          observador === null
            ? projetarParaEspectador(partida)
            : projetarParaJogador(partida, observador),
        );
        expect(apareceEm(texto, SEGREDO), `espaço ${String(indice)} vazou`).toBe(false);
      }
    }
  });

  it('retém escolha de zona secreta feita na Resposta, que é de quem responde', () => {
    const partida = comEscolhas(mesa(), JOGADOR_A, 0, {}, { cartaDaMao: SEGREDO });

    // A escolha da Resposta é de B, então B pode vê-la; A e o espectador, não.
    expect(apareceEm(JSON.stringify(projetarParaJogador(partida, JOGADOR_B)), SEGREDO)).toBe(true);
    expect(apareceEm(JSON.stringify(projetarParaJogador(partida, JOGADOR_A)), SEGREDO)).toBe(false);
    expect(apareceEm(JSON.stringify(projetarParaEspectador(partida)), SEGREDO)).toBe(false);
  });

  it('retém anotação privada, com o identificador na chave ou na origem', () => {
    const partida = com(mesa(), JOGADOR_A, {
      anotacoes: [
        {
          chave: `partida:qualquer-coisa:${SEGREDO}`,
          origem: SEGREDO,
          escopo: 'partida' as const,
          valor: 1,
          visibilidade: 'privada-do-dono' as const,
        },
      ],
    });

    expect(apareceEm(JSON.stringify(projetarParaJogador(partida, JOGADOR_A)), SEGREDO)).toBe(true);
    expect(apareceEm(JSON.stringify(projetarParaJogador(partida, JOGADOR_B)), SEGREDO)).toBe(false);
    expect(apareceEm(JSON.stringify(projetarParaEspectador(partida)), SEGREDO)).toBe(false);
  });

  it('deixa passar anotação pública, porque esconder o que é público não é privacidade', () => {
    const publica = carta('R01');
    const partida = com(mesa(), JOGADOR_A, {
      anotacoes: [{ chave: 'turno:qualquer', origem: publica, escopo: 'turno' as const, valor: 1 }],
    });
    expect(apareceEm(JSON.stringify(projetarParaJogador(partida, JOGADOR_B)), publica)).toBe(true);
  });

  it('esconde a escolha que aponta para Passiva oculta, e mostra a revelada', () => {
    const base = mesa();
    const passivas = jogador(base, JOGADOR_A).passivas;
    const oculta = passivas[0]?.carta;
    const revelada = passivas[1]?.carta;
    expect(oculta).toBeDefined();
    expect(revelada).toBeDefined();

    const comRevelada = com(base, JOGADOR_A, {
      passivas: passivas.map((passiva) =>
        passiva.carta === revelada ? { ...passiva, estado: 'pronta' as const } : passiva,
      ),
    });
    const partida = comEscolhas(comRevelada, JOGADOR_A, 0, { passiva: oculta });
    const comAReveladaEscolhida = comEscolhas(comRevelada, JOGADOR_A, 1, { passiva: revelada });

    const doAdversario = JSON.stringify(projetarParaJogador(partida, JOGADOR_B));
    expect(apareceEm(doAdversario, oculta!), 'Passiva oculta não pode vazar pela escolha').toBe(
      false,
    );

    const comRev = JSON.stringify(projetarParaJogador(comAReveladaEscolhida, JOGADOR_B));
    expect(apareceEm(comRev, revelada!), 'Passiva revelada é pública: não se esconde').toBe(true);
  });

  it('não esconde escolha pública sem motivo', () => {
    const emCooldown = carta('R02');
    const partida = comEscolhas(mesa(), JOGADOR_A, 0, {
      cartaEmCooldown: emCooldown,
      reforco: 'dano',
      guardaReduzida: 2,
    });
    const visao = projetarParaJogador(partida, JOGADOR_B);
    const patrulheiro = visao.jogadores.find((atual) => atual.id === JOGADOR_A);

    expect(patrulheiro?.acoes[0].escolhas.cartaEmCooldown).toBe(emCooldown);
    expect(patrulheiro?.acoes[0].escolhas.reforco).toBe('dano');
    expect(patrulheiro?.acoes[0].escolhas.guardaReduzida).toBe(2);
  });
});

/*
 * O log é registro de replay, não a visão do cliente.
 *
 * Ele pode guardar o que a partida precisa para ser reconstruída — inclusive a
 * carta reservada face-down. O que não pode é ser entregue inteiro ao cliente
 * adversário como atalho, e para isso o evento precisa dizer o que é privado.
 */
describe('o log distingue replay de visão entregue ao cliente', () => {
  it('marca como privado o evento que registra anotação privada', () => {
    const patrulheiro = build('patrulheiro', { habilidades: ['R13', 'R05', 'R01'] });
    const base = duelo(patrulheiro, build('guerreiro'), JOGADOR_A);
    const { eventos } = jogar(base, JOGADOR_A, {
      pedido: { carta: carta('R13'), escolhas: { cartaDaMao: carta('R05') } },
    });

    const daEmboscada = eventos.find((evento) => evento.tipo === 'emboscada-preparada');
    expect(daEmboscada).toBeDefined();
    expect(
      daEmboscada && 'visibilidade' in daEmboscada ? daEmboscada.visibilidade : undefined,
    ).toBe('privada-do-dono');
  });

  it('não marca como privado um evento de anotação comum', () => {
    const base = duelo(build('guerreiro', { habilidades: ['W11'] }), build('mago'), JOGADOR_A);
    const { eventos } = jogar(base, JOGADOR_A, { pedido: { carta: carta('W11') } });
    const comuns = eventos.filter((evento) => evento.tipo === 'anotacao-registrada');
    expect(comuns.length).toBeGreaterThan(0);
    for (const evento of comuns) {
      expect('visibilidade' in evento ? evento.visibilidade : undefined).toBeUndefined();
    }
  });
});
