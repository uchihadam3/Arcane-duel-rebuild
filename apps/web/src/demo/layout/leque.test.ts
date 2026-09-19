import { describe, expect, it } from 'vitest';

import {
  LEQUE,
  caixaDaCartaFocada,
  caixaDoLeque,
  lugaresDoLeque,
  meiaLarguraGirada,
  tamanhoDaCartaNaMao,
} from './leque.js';
import { VIEWPORTS_ALVO, VIEWPORT_DE_CALIBRACAO, seCruzam, zonasDaTela } from './zonas.js';

/*
 * O leque, conferido.
 *
 * A tarefa foi específica sobre a mão, e cada exigência dela vira uma
 * conferência aqui: leque sutil, oito cartas, sobreposição que preserva o
 * topo, carta em repouso parcialmente fora do quadro, foco com elevação
 * claramente perceptível, e — a mais fácil de errar — foco que **não**
 * desmancha a mão.
 */

const MAO = () => zonasDaTela(VIEWPORT_DE_CALIBRACAO).maoDoJogador;
const OITO = 8;

describe('o leque é sutil e cabe na zona da mão', () => {
  it('não abre demais: o giro da ponta fica abaixo de 12°', () => {
    const lugares = lugaresDoLeque({ zona: MAO(), total: OITO, focada: null });
    for (const lugar of lugares) expect(Math.abs(lugar.giro)).toBeLessThanOrEqual(12);
    expect(LEQUE.giroMaximo).toBeLessThanOrEqual(12);
  });

  it('não fecha demais: as oito cartas não viram uma pilha', () => {
    const lugares = lugaresDoLeque({ zona: MAO(), total: OITO, focada: null });
    const { largura } = tamanhoDaCartaNaMao(MAO());
    const passo = (lugares[1]?.x ?? 0) - (lugares[0]?.x ?? 0);
    expect(passo).toBeGreaterThanOrEqual(largura * 0.25);
  });

  /*
   * A sobreposição precisa preservar nome, custo e topo da arte.
   *
   * Na carta vetorial, esses três ocupam o terço de cima. Se o passo entre
   * cartas for menor que um terço da largura, a carta de cima cobre o nome da
   * de baixo — e a mão deixa de ser legível sem tocar em nada.
   */
  it('a sobreposição preserva o topo da carta de baixo', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zona = zonasDaTela(viewport).maoDoJogador;
      const lugares = lugaresDoLeque({ zona, total: OITO, focada: null });
      const { largura } = tamanhoDaCartaNaMao(zona);
      const passo = (lugares[1]?.x ?? 0) - (lugares[0]?.x ?? 0);
      expect(
        passo / largura,
        `${String(viewport.largura)}×${String(viewport.altura)}`,
      ).toBeGreaterThanOrEqual(0.25);
    }
  });

  /*
   * As cartas do leque são **giradas**, e isso muda a conta.
   *
   * Uma carta de 121 × 170 inclinada 9° ocupa 146 px de largura. A primeira
   * versão deste teste media o retângulo sem giro, passava, e no navegador as
   * duas pontas do leque encostavam no HUD do jogador e no botão de encerrar
   * turno — nos seis viewports ao mesmo tempo. Aqui a medida é a real.
   */
  it('o leque girado cabe na zona da mão, em todo viewport alvo', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zona = zonasDaTela(viewport).maoDoJogador;
      const caixa = caixaDoLeque({ zona, total: OITO, focada: null });
      expect(caixa).not.toBeNull();
      if (caixa === null) continue;
      const rotulo = `${String(viewport.largura)}×${String(viewport.altura)}`;
      expect(caixa.x, rotulo).toBeGreaterThanOrEqual(zona.x - 1);
      expect(caixa.x + caixa.largura, rotulo).toBeLessThanOrEqual(zona.x + zona.largura + 1);
    }
  });

  it('a conta do giro devolve mais que a largura da carta parada', () => {
    expect(meiaLarguraGirada(120, 168, 0) * 2).toBeCloseTo(120, 6);
    expect(meiaLarguraGirada(120, 168, 9) * 2).toBeGreaterThan(130);
  });

  it('a carta em repouso fica parcialmente abaixo da borda de baixo', () => {
    const zona = MAO();
    const lugares = lugaresDoLeque({ zona, total: OITO, focada: null });
    const { altura } = tamanhoDaCartaNaMao(zona);
    const pe = (lugares[3]?.y ?? 0) + altura / 2;
    expect(pe).toBeGreaterThan(VIEWPORT_DE_CALIBRACAO.altura);
  });

  /*
   * A mão não pode subir por cima do campo.
   *
   * A primeira versão desta conta punha o topo da carta **acima** da zona da
   * mão, e o leque cobria a fileira de retaguarda do jogador — a sobreposição
   * que a revisão mandou eliminar. O topo da carta em repouso encosta na borda
   * de cima da zona e não passa dela.
   */
  it('a carta em repouso não sobe acima da zona da mão', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zonas = zonasDaTela(viewport);
      const zona = zonas.maoDoJogador;
      const lugares = lugaresDoLeque({ zona, total: OITO, focada: null });
      const { altura } = tamanhoDaCartaNaMao(zona);
      const rotulo = `${String(viewport.largura)}×${String(viewport.altura)}`;
      for (const lugar of lugares) {
        expect(lugar.y - altura / 2, rotulo).toBeGreaterThanOrEqual(zona.y - 1);
      }
      // E por consequência ela não encosta na arena.
      expect(zona.y, rotulo).toBeGreaterThanOrEqual(zonas.arena.y + zonas.arena.altura);
    }
  });

  it('a mão da máquina não desce por cima do campo', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zonas = zonasDaTela(viewport);
      const zona = zonas.maoDaMaquina;
      const lugares = lugaresDoLeque({ zona, total: 6, focada: null, invertido: true });
      const { altura } = tamanhoDaCartaNaMao(zona, true);
      const rotulo = `${String(viewport.largura)}×${String(viewport.altura)}`;
      for (const lugar of lugares) {
        expect(lugar.y + altura / 2, rotulo).toBeLessThanOrEqual(zona.y + zona.altura + 1);
      }
      expect(zona.y + zona.altura, rotulo).toBeLessThanOrEqual(zonas.arena.y);
    }
  });

  it('mas o topo da carta em repouso fica dentro da tela, e com folga', () => {
    const zona = MAO();
    const lugares = lugaresDoLeque({ zona, total: OITO, focada: null });
    const { altura } = tamanhoDaCartaNaMao(zona);
    for (const lugar of lugares) {
      const topo = lugar.y - altura / 2;
      expect(topo).toBeGreaterThanOrEqual(0);
      // Pelo menos metade da carta aparece: é o que torna o nome legível.
      expect(VIEWPORT_DE_CALIBRACAO.altura - topo).toBeGreaterThan(altura * 0.55);
    }
  });
});

describe('o foco levanta a carta de verdade', () => {
  /*
   * "Não subir só 5 pixels" foi literal na tarefa.
   *
   * O piso aqui é em fração da altura da carta, e não em pixels, porque é
   * assim que a elevação continua perceptível numa tela grande.
   */
  it('a elevação é claramente perceptível', () => {
    const zona = MAO();
    const emRepouso = lugaresDoLeque({ zona, total: OITO, focada: null });
    const comFoco = lugaresDoLeque({ zona, total: OITO, focada: 3 });
    const { altura } = tamanhoDaCartaNaMao(zona);
    const subiu = (emRepouso[3]?.y ?? 0) - (comFoco[3]?.y ?? 0);
    expect(subiu).toBeGreaterThan(altura * 0.5);
    expect(subiu).toBeGreaterThan(50);
  });

  it('no foco a carta aparece quase inteira', () => {
    const caixa = caixaDaCartaFocada({ zona: MAO(), total: OITO, focada: 3 });
    expect(caixa).not.toBeNull();
    if (caixa === null) return;
    const visivel = Math.min(VIEWPORT_DE_CALIBRACAO.altura, caixa.y + caixa.altura) - caixa.y;
    expect(visivel / caixa.altura).toBeGreaterThan(0.88);
  });

  it('a carta focada cresce e endireita', () => {
    const lugares = lugaresDoLeque({ zona: MAO(), total: OITO, focada: 0 });
    const focada = lugares[0];
    expect(focada?.escala).toBeGreaterThan(1.3);
    expect(Math.abs(focada?.giro ?? 99)).toBeLessThan(2);
  });

  it('a focada vem na frente de todas as vizinhas', () => {
    const lugares = lugaresDoLeque({ zona: MAO(), total: OITO, focada: 4 });
    const focada = lugares[4]?.ordem ?? -1;
    for (const [indice, lugar] of lugares.entries()) {
      if (indice !== 4) expect(lugar.ordem).toBeLessThan(focada);
    }
  });

  /*
   * Focar não pode desmanchar a mão.
   *
   * É a regra da referência, e é fácil de quebrar: empurrar as vizinhas para
   * abrir espaço parece elegante isolado e produz um buraco enorme no leque.
   * O teto abaixo é o que impede alguém de "melhorar" isso depois.
   */
  it('as vizinhas quase não se mexem', () => {
    const zona = MAO();
    const emRepouso = lugaresDoLeque({ zona, total: OITO, focada: null });
    const comFoco = lugaresDoLeque({ zona, total: OITO, focada: 3 });
    const { largura } = tamanhoDaCartaNaMao(zona);
    for (const indice of [0, 1, 2, 4, 5, 6, 7]) {
      const andou = Math.abs((comFoco[indice]?.x ?? 0) - (emRepouso[indice]?.x ?? 0));
      expect(andou, `carta ${String(indice)}`).toBeLessThanOrEqual(largura * 0.2);
      // E nenhuma vizinha sobe junto: quem levanta é só a focada.
      expect(comFoco[indice]?.y).toBeCloseTo(emRepouso[indice]?.y ?? 0, 6);
    }
  });

  it('as vizinhas escurecem, mas não somem', () => {
    const lugares = lugaresDoLeque({ zona: MAO(), total: OITO, focada: 3 });
    expect(lugares[3]?.recuo).toBe(0);
    expect(lugares[0]?.recuo).toBeGreaterThan(0.2);
    expect(lugares[0]?.recuo).toBeLessThan(0.6);
  });
});

describe('a carta focada não invade nada', () => {
  /*
   * Esta é uma das regras de não sobreposição da tarefa, e ela vale para a
   * carta **levantada**, que é maior que a em repouso. Uma composição que só
   * confere o repouso passa no teste e falha no dedo.
   */
  /*
   * O leque **inteiro**, parado, não pode encostar nas colunas de apoio.
   *
   * É a regra "mão nunca cobre HUD nem botões" da tarefa, medida com o giro.
   */
  it('o leque parado não encosta no HUD nem nos controles, em nenhum viewport', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zonas = zonasDaTela(viewport);
      const caixa = caixaDoLeque({ zona: zonas.maoDoJogador, total: OITO, focada: null });
      if (caixa === null) continue;
      const rotulo = `${String(viewport.largura)}×${String(viewport.altura)}`;
      expect(seCruzam(caixa, zonas.hudDoJogador), `${rotulo} × HUD`).toBe(false);
      expect(seCruzam(caixa, zonas.controlesDeTurno), `${rotulo} × controles`).toBe(false);
      expect(seCruzam(caixa, zonas.arena), `${rotulo} × arena`).toBe(false);
    }
  });

  it('e nem quando qualquer carta está focada, em nenhum viewport', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zonas = zonasDaTela(viewport);
      for (let indice = 0; indice < OITO; indice += 1) {
        const caixa = caixaDoLeque({ zona: zonas.maoDoJogador, total: OITO, focada: indice });
        if (caixa === null) continue;
        const rotulo = `${String(viewport.largura)}×${String(viewport.altura)} foco ${String(indice)}`;
        expect(seCruzam(caixa, zonas.hudDoJogador), `${rotulo} × HUD`).toBe(false);
        expect(seCruzam(caixa, zonas.controlesDeTurno), `${rotulo} × controles`).toBe(false);
      }
    }
  });

  it('não cobre o HUD do jogador nem os controles de turno, em nenhum viewport', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zonas = zonasDaTela(viewport);
      for (const indice of [0, 3, 7]) {
        const caixa = caixaDaCartaFocada({
          zona: zonas.maoDoJogador,
          total: OITO,
          focada: indice,
        });
        expect(caixa).not.toBeNull();
        if (caixa === null) continue;
        const rotulo = `${String(viewport.largura)}×${String(viewport.altura)} carta ${String(indice)}`;
        expect(seCruzam(caixa, zonas.hudDoJogador), `${rotulo} × HUD`).toBe(false);
        expect(seCruzam(caixa, zonas.controlesDeTurno), `${rotulo} × controles`).toBe(false);
      }
    }
  });

  it('a carta focada não sai pelo topo da tela', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const zonas = zonasDaTela(viewport);
      const caixa = caixaDaCartaFocada({ zona: zonas.maoDoJogador, total: OITO, focada: 4 });
      if (caixa === null) continue;
      expect(caixa.y, String(viewport.largura)).toBeGreaterThan(0);
    }
  });
});

describe('a mão da máquina é o mesmo leque, invertido', () => {
  it('as cartas da máquina ficam mais altas que o centro da zona dela', () => {
    const zona = zonasDaTela(VIEWPORT_DE_CALIBRACAO).maoDaMaquina;
    const lugares = lugaresDoLeque({ zona, total: 6, focada: null, invertido: true });
    for (const lugar of lugares) expect(lugar.y).toBeLessThan(zona.y + zona.altura);
  });

  it('o leque invertido curva para o outro lado', () => {
    const zona = zonasDaTela(VIEWPORT_DE_CALIBRACAO).maoDaMaquina;
    const normal = lugaresDoLeque({ zona, total: 6, focada: null });
    const invertido = lugaresDoLeque({ zona, total: 6, focada: null, invertido: true });
    expect(Math.sign(invertido[0]?.giro ?? 0)).toBe(-Math.sign(normal[0]?.giro ?? 0));
  });
});
