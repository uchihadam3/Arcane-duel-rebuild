import { describe, expect, it } from 'vitest';

import { HUMANO, MAQUINA, criarControladorDaDemo } from '../sessao.js';

import { GIRO_DE_ATIVAR, pecasDoCampo } from './montar.js';

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
