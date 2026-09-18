import { describe, expect, it } from 'vitest';
import type { CardId, EstadoDaPartida, PlayerId, VisaoDaPartida } from '@arcane-duel/shared-types';
import type { EventoUniversal } from '@arcane-duel/rules-engine';
import { projetarParaEspectador, projetarParaJogador } from '@arcane-duel/rules-engine';

import { RECEITAS_INICIAIS } from './receitas.js';
import { JOGADOR_A, JOGADOR_B, simularPartida } from './simulador/motor.js';
import { build, carta, duelo, jogador, jogar } from './teste-apoio.js';

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
 * Defeito conhecido, provado aqui em vez de descrito.
 *
 * A regra de visibilidade não foi alterada nesta tarefa — o escopo pedia
 * justamente que ela ficasse como está. O que este bloco faz é fixar o
 * comportamento atual para que a correção não passe despercebida: quando o
 * vazamento for fechado, estes testes quebram e obrigam a atualização.
 *
 * A regressão das doze classes acima não o encontra porque ela roda as
 * Receitas 1, e `R13` não está na Receita 1 do Patrulheiro.
 */
describe('vazamento conhecido: Preparar Emboscada (R13)', () => {
  const reservar = (): { readonly partida: EstadoDaPartida; readonly reservada: CardId } => {
    const patrulheiro = build('patrulheiro', { habilidades: ['R13', 'R05', 'R01'] });
    const base = duelo(patrulheiro, build('guerreiro'), JOGADOR_A);
    const reservada = jogador(base, JOGADOR_A).mao.find(
      (id) => id !== carta('R13') && id !== carta('R01'),
    );
    if (reservada === undefined) throw new Error('a mão do Patrulheiro não tem o que reservar');
    const { partida } = jogar(base, JOGADOR_A, {
      pedido: { carta: carta('R13'), escolhas: { cartaDaMao: reservada } },
    });
    return { partida, reservada };
  };

  it('a carta reservada continua na mão, como o motor a modela', () => {
    const { partida, reservada } = reservar();
    expect(jogador(partida, JOGADOR_A).mao).toContain(reservada);
  });

  it('mas o adversário a enxerga, contra o "face-down" impresso na carta', () => {
    const { partida, reservada } = reservar();
    const texto = JSON.stringify(projetarParaJogador(partida, JOGADOR_B));

    // Duas portas, as duas reais:
    // 1. as escolhas do espaço de Ação vão inteiras para a projeção;
    expect(texto).toContain(`"cartaDaMao":"${reservada}"`);
    // 2. a chave da anotação carrega o identificador da carta reservada.
    expect(texto).toContain(`ataque-emboscado:${reservada}`);

    // Enquanto isso valer, a conferência geral acusaria aqui — e é esse o
    // ponto: o defeito está provado, não escondido.
    expect(apareceEm(texto, reservada)).toBe(true);
  });
});
