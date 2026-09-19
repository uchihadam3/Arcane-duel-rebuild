import { describe, expect, it } from 'vitest';

import { cameraParaViewport, projetar, projetarCaixa } from './camera.js';
import { PECAS_DA_ARENA, pecaDaZona, posicaoNoLeque } from './layout.js';

/*
 * A planta da arena e o enquadramento.
 *
 * Estes testes são a versão calculável de duas promessas da Etapa 6: "nada
 * competitivo cortado em nenhuma resolução alvo" e "a câmera não se mexe".
 * Ambas eram, até aqui, coisas que só se descobriam olhando um print.
 */

/** As resoluções que o documento manda atender, mais as duas de tela grande. */
const VIEWPORTS = [
  { nome: '720x360', largura: 720, altura: 360 },
  { nome: '800x360', largura: 800, altura: 360 },
  { nome: '844x390', largura: 844, altura: 390 },
  { nome: '915x412', largura: 915, altura: 412 },
  { nome: '1280x720', largura: 1280, altura: 720 },
  { nome: '1560x720', largura: 1560, altura: 720 },
] as const;

describe('planta da arena', () => {
  it('espelha os dois lados em Z e mantém as colunas de Ação alinhadas em X', () => {
    for (const indice of [0, 1, 2, 3]) {
      const meu = pecaDaZona('proprio', 'acao', indice);
      const dele = pecaDaZona('adversario', 'acao', indice);
      expect(meu).toBeDefined();
      expect(dele).toBeDefined();
      // Mesma coluna: é o que deixa comparar as duas Ações de relance.
      expect(dele?.centro.x).toBe(meu?.centro.x);
      expect(dele?.centro.z).toBe(-(meu?.centro.z ?? 0));
    }
  });

  it('dá às três Ações a maior laje do campo', () => {
    const acao = pecaDaZona('proprio', 'acao', 1);
    const area = (chave: ReturnType<typeof pecaDaZona>): number =>
      chave === undefined ? 0 : chave.largura * chave.profundidade;

    for (const zona of ['passiva', 'carta-de-classe', 'cd1', 'condicoes', 'ultimate'] as const) {
      expect(area(acao)).toBeGreaterThan(area(pecaDaZona('proprio', zona)));
    }
  });

  it('não deixa duas peças do mesmo lado ocuparem o mesmo lugar', () => {
    const chaves = PECAS_DA_ARENA.map((peca) => peca.chave);
    expect(new Set(chaves).size).toBe(chaves.length);

    for (const a of PECAS_DA_ARENA) {
      for (const b of PECAS_DA_ARENA) {
        if (a.chave === b.chave || a.lado !== b.lado) continue;
        if (a.centro.y !== b.centro.y) continue;
        const separaEmX = Math.abs(a.centro.x - b.centro.x) >= (a.largura + b.largura) / 2 - 0.01;
        const separaEmZ =
          Math.abs(a.centro.z - b.centro.z) >= (a.profundidade + b.profundidade) / 2 - 0.01;
        expect(separaEmX || separaEmZ, `${a.chave} encosta em ${b.chave}`).toBe(true);
      }
    }
  });

  it('não dá lugar no mundo à mão do adversário', () => {
    // Zona que este observador não pode conhecer não tem posição: é a mesma
    // regra da projeção, aplicada à geometria.
    expect(pecaDaZona('adversario', 'mao')).toBeUndefined();
    expect(pecaDaZona('proprio', 'mao')).toBeDefined();
  });
});

describe('enquadramento', () => {
  it('mantém todas as zonas do tabuleiro dentro da tela nas seis resoluções alvo', () => {
    /*
     * A mão fica de fora desta conta, e de propósito.
     *
     * As cartas da mão são grandes o bastante para serem lidas num telefone e,
     * por isso, o pé delas sai pela borda de baixo — como na referência. O que
     * não pode sair é o topo, que é onde ficam nome, custo e tipo, e isso o
     * teste seguinte confere.
     */
    for (const viewport of VIEWPORTS) {
      const camera = cameraParaViewport(viewport);
      for (const peca of PECAS_DA_ARENA.filter((item) => item.zona !== 'mao')) {
        const caixa = projetarCaixa(camera, peca.centro, peca.largura, peca.profundidade, viewport);
        expect(caixa.dentroDaTela, `${peca.chave} fora da tela em ${viewport.nome}`).toBe(true);
        expect(caixa.x - caixa.largura / 2, `${peca.chave} corta à esquerda`).toBeGreaterThan(-1);
        expect(
          caixa.x + caixa.largura / 2,
          `${peca.chave} corta à direita em ${viewport.nome}`,
        ).toBeLessThan(viewport.largura + 1);
        expect(caixa.y - caixa.altura / 2, `${peca.chave} corta em cima`).toBeGreaterThan(-1);
        expect(
          caixa.y + caixa.altura / 2,
          `${peca.chave} corta embaixo em ${viewport.nome}`,
        ).toBeLessThan(viewport.altura + 1);
      }
    }
  });

  it('nunca deixa o topo da mão sair da tela', () => {
    for (const viewport of VIEWPORTS) {
      const camera = cameraParaViewport(viewport);
      const mao = pecaDaZona('proprio', 'mao');
      if (mao === undefined) throw new Error('planta incompleta');

      // A borda de trás do leque é o topo das cartas: ela precisa caber.
      const topo = projetar(
        camera,
        { x: mao.centro.x, y: mao.centro.y, z: mao.centro.z - mao.profundidade / 2 },
        viewport,
      );
      expect(topo.dentroDaTela, `topo da mão fora em ${viewport.nome}`).toBe(true);
      expect(topo.y, `mão baixa demais em ${viewport.nome}`).toBeLessThan(viewport.altura - 40);
    }
  });

  it('põe o jogador embaixo e o adversário em cima, e não o contrário', () => {
    const viewport = VIEWPORTS[2];
    const camera = cameraParaViewport(viewport);
    const meu = pecaDaZona('proprio', 'acao', 1);
    const dele = pecaDaZona('adversario', 'acao', 1);
    if (meu === undefined || dele === undefined) throw new Error('planta incompleta');

    expect(projetar(camera, meu.centro, viewport).y).toBeGreaterThan(
      projetar(camera, dele.centro, viewport).y,
    );
  });

  it('faz o lado do jogador aparecer maior que o do adversário', () => {
    const viewport = VIEWPORTS[4];
    const camera = cameraParaViewport(viewport);
    const meu = pecaDaZona('proprio', 'acao', 1);
    const dele = pecaDaZona('adversario', 'acao', 1);
    if (meu === undefined || dele === undefined) throw new Error('planta incompleta');

    const minha = projetarCaixa(camera, meu.centro, meu.largura, meu.profundidade, viewport);
    const dela = projetarCaixa(camera, dele.centro, dele.largura, dele.profundidade, viewport);
    expect(minha.largura).toBeGreaterThan(dela.largura);
    expect(minha.escala).toBeGreaterThan(dela.escala);
  });

  it('não move a câmera: a mesma tela produz sempre o mesmo enquadramento', () => {
    const viewport = VIEWPORTS[3];
    const primeira = cameraParaViewport(viewport);
    const segunda = cameraParaViewport(viewport);
    expect(segunda.fov).toBe(primeira.fov);
    expect(segunda.position.toArray()).toEqual(primeira.position.toArray());
  });
});

describe('leque da mão', () => {
  it('mantém o leque discreto: nenhuma carta passa de oito graus', () => {
    for (let indice = 0; indice < 8; indice += 1) {
      const posicao = posicaoNoLeque(indice, 8);
      expect(Math.abs((posicao.giro * 180) / Math.PI)).toBeLessThanOrEqual(8.1);
    }
  });

  it('ordena as cartas da esquerda para a direita, sem duas no mesmo lugar', () => {
    const posicoes = Array.from({ length: 8 }, (_, indice) => posicaoNoLeque(indice, 8));
    for (let indice = 1; indice < posicoes.length; indice += 1) {
      expect(posicoes[indice]!.x).toBeGreaterThan(posicoes[indice - 1]!.x);
    }
  });

  it('aperta o passo quando a mão cresce, e o leque nunca passa da zona da mão', () => {
    /*
     * O limite é a própria zona, e não um número escrito à parte: assim
     * reproporcionar o tabuleiro não deixa o teste para trás — ele passa a
     * medir o leque contra a largura nova.
     */
    const zona = pecaDaZona('proprio', 'mao');
    if (zona === undefined) throw new Error('planta incompleta');

    const larguraDe = (total: number): number => {
      const primeira = posicaoNoLeque(0, total);
      const ultima = posicaoNoLeque(total - 1, total);
      return ultima.x - primeira.x;
    };
    expect(larguraDe(12)).toBeLessThanOrEqual(zona.largura);
    expect(larguraDe(8)).toBeLessThan(larguraDe(12) + 0.01);
  });

  it('centraliza uma mão de uma carta só na zona da mão', () => {
    // O centro da mão não é o centro do tabuleiro: ele é deslocado para a
    // direita para o leque não passar por baixo do HUD do jogador.
    const zona = pecaDaZona('proprio', 'mao');
    expect(posicaoNoLeque(0, 1).x).toBe(zona?.centro.x);
  });
});
