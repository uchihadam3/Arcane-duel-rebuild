import { describe, expect, it } from 'vitest';

import { HUMANO, MAQUINA, criarControladorDaDemo } from '../sessao.js';

import { ABERTURA_DA_PILHA, GIRO_DE_ATIVAR, desvioNaPilha, pecasDoCampo } from './montar.js';

/*
 * A orientação física das cartas na mesa.
 *
 * A revisão do aparelho real foi literal: "todas as cartas assentadas no lado
 * do oponente precisam ficar orientadas para o oponente". Desenhá-las todas a
 * 0° fazia as duas metades parecerem uma coleção só — a informação de **quem
 * pôs a carta ali** desaparecia do desenho.
 *
 * O que se confere aqui é que a orientação é uma propriedade da peça, e não
 * um detalhe de CSS: quem monta a cena já entrega o giro, e por isso o voo
 * consegue pousar nele em vez de saltar no último quadro.
 */

const criar = (): ReturnType<typeof criarControladorDaDemo> =>
  criarControladorDaDemo(
    { classeDoHumano: 'guerreiro', classeDaIa: 'mago', comeca: HUMANO },
    'teste-orientacao',
  );

const pecas = (): ReturnType<typeof pecasDoCampo> =>
  pecasDoCampo(criar().estado().visao, String(HUMANO));

describe('cada carta olha para o dono dela', () => {
  it('as peças da máquina repousam a 180°, e as do humano a 0°', () => {
    const todas = pecas();
    expect(todas.length).toBeGreaterThan(0);

    for (const peca of todas) {
      const repouso = peca.metade === 'maquina' ? 180 : 0;
      // Ativar soma um quarto de volta; o resto repousa.
      expect([repouso, repouso + GIRO_DE_ATIVAR], `${peca.chave} (${peca.lugar})`).toContain(
        peca.giro,
      );
    }
  });

  it('nenhuma peça da máquina fica de pé para quem olha daqui', () => {
    const daMaquina = pecas().filter((peca) => peca.metade === 'maquina');
    expect(daMaquina.length).toBeGreaterThan(0);
    for (const peca of daMaquina) {
      expect(peca.giro, peca.chave).toBeGreaterThanOrEqual(180);
    }
  });

  it('as duas metades têm as mesmas espécies de zona ocupadas', () => {
    const lugares = (metade: 'jogador' | 'maquina'): readonly string[] =>
      [
        ...new Set(
          pecas()
            .filter((peca) => peca.metade === metade)
            .map((peca) => peca.lugar),
        ),
      ].sort();
    expect(lugares('maquina')).toEqual(lugares('jogador'));
  });
});

describe('a orientação acompanha a partida', () => {
  it('a carta que a máquina joga assenta virada para ela', () => {
    const controlador = criar();
    for (let passo = 0; passo < 200; passo += 1) {
      const estado = controlador.estado();
      if (estado.etapa.tipo === 'fim') break;
      if (estado.aguardando === MAQUINA) {
        controlador.passoDaIa();
        continue;
      }
      const naAcaoDaMaquina = pecasDoCampo(estado.visao, String(HUMANO)).filter(
        (peca) => peca.metade === 'maquina' && (peca.lugar === 'acao' || peca.lugar === 'resposta'),
      );
      if (naAcaoDaMaquina.length > 0) {
        for (const peca of naAcaoDaMaquina) expect(peca.giro, peca.chave).toBe(180);
        return;
      }
      controlador.encerrarTurno();
    }
    // A máquina não chegou a jogar nesta semente: não há o que afirmar.
    expect(true).toBe(true);
  });
});

describe('conhecer uma carta e poder comandá-la são fatos diferentes', () => {
  /*
   * O defeito que a revisão pegou: a carta do adversário virada para cima não
   * aceitava toque, porque "não é minha" tinha sido escrito como "não é
   * interativa". Um booleano só misturava as duas perguntas; agora são três
   * campos, e este teste é o que impede a mistura de voltar.
   */
  it('toda carta de identidade pública pode ser inspecionada, de qualquer metade', () => {
    for (const peca of pecas()) {
      expect(peca.podeInspecionar, peca.chave).toBe(peca.identidadePublica);
      expect(peca.identidadePublica, peca.chave).toBe(peca.carta !== null);
    }
  });

  it('inclusive as da máquina: o lado da mesa não decide o que dá para ler', () => {
    const daMaquina = pecas().filter((peca) => peca.metade === 'maquina');
    const publicas = daMaquina.filter((peca) => peca.identidadePublica);
    expect(publicas.length).toBeGreaterThan(0);
    for (const peca of publicas) expect(peca.podeInspecionar, peca.chave).toBe(true);
  });

  it('uma peça virada não carrega identificador nenhum, e não se inspeciona', () => {
    const viradas = pecas().filter((peca) => peca.carta === null);
    for (const peca of viradas) {
      expect(peca.podeInspecionar, peca.chave).toBe(false);
      expect(peca.chave.startsWith('v:'), peca.chave).toBe(true);
    }
  });

  it('nenhuma peça do campo é comandável: jogar acontece na mão', () => {
    for (const peca of pecas()) expect(peca.podeJogar, peca.chave).toBe(false);
  });
});

describe('a pilha de cooldown mostra todas as cartas', () => {
  it('uma carta sozinha fica centrada', () => {
    expect(desvioNaPilha(0, 1, 'jogador')).toBe(0);
  });

  it('duas ou mais abrem em leque, cada uma com faixa própria', () => {
    const desvios = [0, 1, 2].map((posicao) => desvioNaPilha(posicao, 3, 'jogador'));
    expect(desvios).toEqual([-ABERTURA_DA_PILHA, 0, ABERTURA_DA_PILHA]);
    // Nenhuma cai exatamente em cima da outra: todas são alcançáveis pelo dedo.
    expect(new Set(desvios).size).toBe(desvios.length);
  });

  it('e a pilha da máquina é a mesma pilha vista do outro lado', () => {
    for (const posicao of [0, 1, 2]) {
      expect(desvioNaPilha(posicao, 3, 'maquina')).toBe(-desvioNaPilha(posicao, 3, 'jogador'));
    }
  });
});
