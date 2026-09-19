import type { CardId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { CAMERA, TABULEIRO, pedestalDeAcao } from './arena/planta.js';
import { montarCena } from './cena/montar.js';
import { HUMANO, MAQUINA, criarControladorDaDemo } from './sessao.js';

/*
 * A sessão da demo, conferida no que a tarefa chamou de regra mais importante.
 *
 * Perspectiva fixa não é uma promessa de quem desenha: é uma propriedade do
 * dado. A sessão calcula **uma** projeção, a do humano, e a metade de baixo é
 * dele em toda chamada. Estes testes exercitam uma partida inteira, turno da
 * máquina incluído, e conferem que nada disso muda.
 */

const criar = (): ReturnType<typeof criarControladorDaDemo> =>
  criarControladorDaDemo(
    { classeDoHumano: 'guerreiro', classeDaIa: 'mago', comeca: HUMANO },
    'teste-demo',
  );

/** Leva a partida adiante até a vez voltar ao humano, ou até o fim. */
const deixarAMaquinaJogar = (
  controlador: ReturnType<typeof criarControladorDaDemo>,
  passos = 120,
): void => {
  for (let passo = 0; passo < passos; passo += 1) {
    const estado = controlador.estado();
    if (estado.etapa.tipo === 'fim') return;
    if (estado.aguardando === HUMANO) return;
    controlador.passoDaIa();
  }
};

describe('a perspectiva é fixa', () => {
  it('a projeção é sempre a do humano, inclusive no turno da máquina', () => {
    const controlador = criar();
    for (let rodada = 0; rodada < 40; rodada += 1) {
      const estado = controlador.estado();
      expect(estado.perspectiva).toBe(HUMANO);
      expect(estado.visao.perspectiva).toBe(HUMANO);
      if (estado.etapa.tipo === 'fim') break;
      if (estado.aguardando === MAQUINA) {
        controlador.passoDaIa();
        continue;
      }
      controlador.encerrarTurno();
    }
  });

  it('a metade de baixo é do humano em toda chamada da planta', () => {
    for (const indice of [0, 1, 2, 3] as const) {
      const meu = pedestalDeAcao('jogador', indice);
      const dela = pedestalDeAcao('maquina', indice);
      expect(meu.y).toBeGreaterThan(TABULEIRO.altura / 2);
      expect(dela.y).toBeLessThan(TABULEIRO.altura / 2);
    }
  });

  it('a câmera é uma constante: não existe função que a mova', () => {
    const antes = { ...CAMERA };
    const controlador = criar();
    deixarAMaquinaJogar(controlador);
    controlador.encerrarTurno();
    deixarAMaquinaJogar(controlador);
    expect({ ...CAMERA }).toEqual(antes);
  });

  it('a mão do humano fica embaixo e a da máquina em cima, sempre', () => {
    const controlador = criar();
    for (let rodada = 0; rodada < 12; rodada += 1) {
      const estado = controlador.estado();
      if (estado.etapa.tipo === 'fim') break;
      const cena = montarCena(estado.visao, String(HUMANO), -CAMERA.inclinacaoEmGraus);
      const minhas = cena.pecas.filter((peca) => peca.lugar === 'mao' && peca.metade === 'jogador');
      const dela = cena.pecas.filter((peca) => peca.lugar === 'mao' && peca.metade === 'maquina');
      for (const peca of minhas) expect(peca.y).toBeGreaterThan(TABULEIRO.altura);
      for (const peca of dela) expect(peca.y).toBeLessThan(0);

      if (estado.aguardando === MAQUINA) controlador.passoDaIa();
      else controlador.encerrarTurno();
    }
  });
});

describe('a informação privada da máquina não chega à tela', () => {
  it('a mão dela vira peça sem carta e sem identificador', () => {
    const controlador = criar();
    const cena = montarCena(controlador.estado().visao, String(HUMANO), -CAMERA.inclinacaoEmGraus);
    const daMaquina = cena.pecas.filter(
      (peca) => peca.lugar === 'mao' && peca.metade === 'maquina',
    );
    expect(daMaquina.length).toBeGreaterThan(0);
    for (const peca of daMaquina) {
      expect(peca.carta).toBeNull();
      // A chave também não pode carregar identidade: ela vai para o DOM.
      expect(peca.chave).not.toMatch(/^c:/);
    }
  });

  it('as Passivas ocultas dela também', () => {
    const controlador = criar();
    const cena = montarCena(controlador.estado().visao, String(HUMANO), -CAMERA.inclinacaoEmGraus);
    const ocultas = cena.pecas.filter(
      (peca) => peca.lugar === 'passiva' && peca.metade === 'maquina' && peca.carta === null,
    );
    for (const peca of ocultas) expect(peca.chave).not.toMatch(/^c:/);
  });

  /*
   * A prova mais forte: procurar as cartas da máquina no que a tela recebe.
   *
   * A projeção do humano não traz a mão dela, então nenhum identificador dela
   * pode aparecer nas peças — nem como carta, nem como chave, nem como rótulo.
   */
  it('nenhum identificador da mão dela aparece nas peças da cena', () => {
    const controlador = criar();
    deixarAMaquinaJogar(controlador);
    const estado = controlador.estado();
    const cena = montarCena(estado.visao, String(HUMANO), -CAMERA.inclinacaoEmGraus);

    const publicos = new Set<string>();
    const ela = estado.visao.jogadores.find((jogador) => jogador.id === MAQUINA);
    for (const zona of [1, 2, 3] as const) {
      for (const carta of ela?.cooldown[zona] ?? []) publicos.add(String(carta));
    }
    for (const slot of ela?.acoes ?? []) {
      const carta = slot.perfil?.carta;
      if (carta !== undefined) publicos.add(String(carta));
    }
    for (const equipada of ela?.cartasDeClasse ?? []) publicos.add(String(equipada.carta));
    if (ela?.ultimate.estado === 'disponivel') publicos.add(String(ela.ultimate.carta));
    if (ela !== undefined) publicos.add(String(ela.personagem));
    for (const passiva of ela?.passivas ?? []) {
      if (passiva.carta.visivel) publicos.add(String(passiva.carta.carta));
    }

    const daMaquinaNaCena = cena.pecas
      .filter((peca) => peca.metade === 'maquina' && peca.carta !== null)
      .map((peca) => String((peca.carta as { readonly id: CardId }).id));

    for (const identificador of daMaquinaNaCena) {
      expect(publicos.has(identificador), `${identificador} não é público`).toBe(true);
    }
  });
});

describe('a partida corre até o fim sem a apresentação', () => {
  /*
   * O estado não depende do desenho.
   *
   * Este teste roda a partida inteira chamando só `passoDaIa` e `encerrarTurno`,
   * sem nenhum quadro desenhado e sem nenhum relógio de animação. Se um dia a
   * regra começar a esperar a animação, ele quebra — e é para quebrar.
   */
  it('chega a um desfecho sem nenhum quadro desenhado', () => {
    const controlador = criar();
    for (let passo = 0; passo < 4000; passo += 1) {
      const estado = controlador.estado();
      if (estado.etapa.tipo === 'fim') break;
      if (estado.aguardando === MAQUINA) {
        controlador.passoDaIa();
        continue;
      }
      if (estado.etapa.tipo === 'resposta') {
        controlador.responder({ tipo: 'sem-resposta' });
        continue;
      }
      if (estado.etapa.tipo === 'escolha-pendente') {
        const opcao = estado.etapa.escolha.opcoes[0];
        if (opcao === undefined) break;
        controlador.resolverEscolha(opcao);
        continue;
      }
      controlador.encerrarTurno();
    }
    expect(controlador.estado().etapa.tipo).toBe('fim');
  });

  it('o tempo de pensamento fica na faixa curta', () => {
    const controlador = criar();
    controlador.encerrarTurno();
    for (let passo = 0; passo < 6; passo += 1) {
      const tempo = controlador.pensamentoMs();
      expect(tempo).toBeGreaterThanOrEqual(300);
      expect(tempo).toBeLessThanOrEqual(900);
      controlador.passoDaIa();
    }
  });
});

describe('não existe hot-seat nesta sessão', () => {
  /*
   * O protótipo anterior era de dois humanos, e por isso precisava esconder o
   * campo e pedir a troca do aparelho. A ausência das duas coisas é o que se
   * confere aqui: não há etapa de troca, e o estado nunca deixa de ter uma
   * projeção.
   */
  it('o estado nunca fica sem projeção, e não há etapa de troca', () => {
    const controlador = criar();
    const etapas = new Set<string>();
    for (let passo = 0; passo < 80; passo += 1) {
      const estado = controlador.estado();
      etapas.add(estado.etapa.tipo);
      expect(estado.visao.jogadores).toHaveLength(2);
      if (estado.etapa.tipo === 'fim') break;
      if (estado.aguardando === MAQUINA) controlador.passoDaIa();
      else if (estado.etapa.tipo === 'resposta') {
        controlador.responder({ tipo: 'sem-resposta' });
      } else controlador.encerrarTurno();
    }
    expect([...etapas]).not.toContain('troca');
    expect([...etapas]).not.toContain('handoff');
  });
});
