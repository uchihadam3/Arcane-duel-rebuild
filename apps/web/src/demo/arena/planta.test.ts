import { describe, expect, it } from 'vitest';

import {
  type Metade,
  type Retangulo,
  TABULEIRO,
  TODAS_AS_ZONAS,
  bandejaDeResposta,
  centroDe,
  compartimentoDeCooldown,
  encaixeDePassiva,
  girar,
  pecaDeCooldown,
  pedestalDeAcao,
  pedestalDeClasse,
  slotDeUltimate,
  zonasPermanentes,
} from './planta.js';

/*
 * A planta congelada, conferida.
 *
 * A organização do campo foi escolhida pelo usuário e está congelada. O que
 * este arquivo faz é impedir que ela derive: se alguém acrescentar uma zona
 * permanente, tirar uma, ou quebrar a simetria de 180°, o build para.
 */

const METADES: readonly Metade[] = ['jogador', 'maquina'];

const seCruzam = (a: Retangulo, b: Retangulo): boolean =>
  a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;

describe('treze zonas permanentes por jogador, e mais nada', () => {
  it('cada metade tem exatamente treze zonas', () => {
    for (const metade of METADES) expect(zonasPermanentes(metade).length, metade).toBe(13);
    expect(TODAS_AS_ZONAS.length).toBe(26);
  });

  it('a contagem por espécie é 3 Ações, 4 Passivas, 2 Classe, 3 Cooldown, 1 Ultimate', () => {
    for (const metade of METADES) {
      const porEspecie = new Map<string, number>();
      for (const zona of zonasPermanentes(metade)) {
        porEspecie.set(zona.especie, (porEspecie.get(zona.especie) ?? 0) + 1);
      }
      expect(Object.fromEntries(porEspecie), metade).toEqual({
        acao: 3,
        passiva: 4,
        classe: 2,
        cooldown: 3,
        ultimate: 1,
      });
    }
  });

  /*
   * O que foi removido do tabuleiro não pode voltar por descuido.
   *
   * Personagem, removidas, Resposta permanente e a quarta Ação permanente
   * eram peças físicas da composição reprovada. Se alguém as reintroduzir como
   * zona permanente, a contagem acima já falha — mas esta conferência diz o
   * **nome** do que apareceu, que é o que ajuda quem for ler o erro.
   */
  it('nenhuma zona permanente é Personagem, removidas, Resposta ou Ação extra', () => {
    const especies = new Set(TODAS_AS_ZONAS.map((zona) => zona.especie));
    expect([...especies].sort()).toEqual(['acao', 'classe', 'cooldown', 'passiva', 'ultimate']);
  });

  it('nenhuma zona permanente encosta em outra', () => {
    for (let i = 0; i < TODAS_AS_ZONAS.length; i += 1) {
      for (let j = i + 1; j < TODAS_AS_ZONAS.length; j += 1) {
        const a = TODAS_AS_ZONAS[i];
        const b = TODAS_AS_ZONAS[j];
        if (a === undefined || b === undefined) continue;
        expect(
          seCruzam(a.caixa, b.caixa),
          `${a.metade}/${a.especie}${String(a.indice)} cruza ${b.metade}/${b.especie}${String(b.indice)}`,
        ).toBe(false);
      }
    }
  });

  it('toda zona permanente cabe dentro do tabuleiro', () => {
    for (const zona of TODAS_AS_ZONAS) {
      const rotulo = `${zona.metade}/${zona.especie}${String(zona.indice)}`;
      expect(zona.caixa.x, rotulo).toBeGreaterThanOrEqual(0);
      expect(zona.caixa.y, rotulo).toBeGreaterThanOrEqual(0);
      expect(zona.caixa.x + zona.caixa.largura, rotulo).toBeLessThanOrEqual(TABULEIRO.largura);
      expect(zona.caixa.y + zona.caixa.altura, rotulo).toBeLessThanOrEqual(TABULEIRO.altura);
    }
  });
});

describe('a simetria de 180° é exata, e é exata por construção', () => {
  /*
   * Esta é a conferência central da tarefa.
   *
   * A metade da máquina não é escrita: ela é a do jogador girada. O teste
   * percorre as treze zonas e confere que cada uma da máquina é **exatamente**
   * a do jogador refletida por (x, y) → (L − x, A − y). Não há tolerância
   * porque não deveria haver diferença nenhuma: é o mesmo número.
   */
  it('cada zona da máquina é a do jogador girada em torno do centro', () => {
    const doJogador = zonasPermanentes('jogador');
    const daMaquina = zonasPermanentes('maquina');
    expect(daMaquina.length).toBe(doJogador.length);
    for (let i = 0; i < doJogador.length; i += 1) {
      const jogador = doJogador[i];
      const maquina = daMaquina[i];
      if (jogador === undefined || maquina === undefined) continue;
      expect(maquina.especie).toBe(jogador.especie);
      expect(maquina.indice).toBe(jogador.indice);
      expect(maquina.caixa, `${jogador.especie}${String(jogador.indice)}`).toEqual(
        girar(jogador.caixa),
      );
    }
  });

  it('girar duas vezes devolve a peça original', () => {
    for (const zona of zonasPermanentes('jogador')) {
      expect(girar(girar(zona.caixa))).toEqual(zona.caixa);
    }
  });

  it('os centros das duas metades somam o centro do tabuleiro, sempre', () => {
    const doJogador = zonasPermanentes('jogador');
    const daMaquina = zonasPermanentes('maquina');
    for (let i = 0; i < doJogador.length; i += 1) {
      const a = doJogador[i];
      const b = daMaquina[i];
      if (a === undefined || b === undefined) continue;
      const ca = centroDe(a.caixa);
      const cb = centroDe(b.caixa);
      expect(ca.x + cb.x).toBeCloseTo(TABULEIRO.largura, 10);
      expect(ca.y + cb.y).toBeCloseTo(TABULEIRO.altura, 10);
    }
  });

  /*
   * As margens das duas bordas são iguais porque uma é a outra.
   *
   * Uma composição desleixada se denuncia justamente aqui: 38 de um lado, 41
   * do outro. Com a derivação isso é impossível, e este teste é o que prova
   * que a derivação está de fato sendo usada.
   */
  it('a margem da borda de trás é igual dos dois lados', () => {
    const maiorYdoJogador = Math.max(
      ...zonasPermanentes('jogador').map((zona) => zona.caixa.y + zona.caixa.altura),
    );
    const menorYdaMaquina = Math.min(...zonasPermanentes('maquina').map((zona) => zona.caixa.y));
    expect(TABULEIRO.altura - maiorYdoJogador).toBe(menorYdaMaquina);
  });

  it('a margem lateral é igual nos dois lados', () => {
    const menorX = Math.min(...TODAS_AS_ZONAS.map((zona) => zona.caixa.x));
    const maiorX = Math.max(...TODAS_AS_ZONAS.map((zona) => zona.caixa.x + zona.caixa.largura));
    expect(menorX).toBe(TABULEIRO.largura - maiorX);
  });
});

describe('a planta congelada fica onde o usuário mandou', () => {
  it('o jogador fica embaixo e a máquina em cima, em toda espécie', () => {
    for (const zona of zonasPermanentes('jogador')) {
      expect(centroDe(zona.caixa).y, zona.especie).toBeGreaterThan(TABULEIRO.altura / 2);
    }
    for (const zona of zonasPermanentes('maquina')) {
      expect(centroDe(zona.caixa).y, zona.especie).toBeLessThan(TABULEIRO.altura / 2);
    }
  });

  it('do lado do jogador: Classe à esquerda, Ações ao centro, Cooldown à direita', () => {
    const classe = centroDe(pedestalDeClasse('jogador', 1)).x;
    const acaoEsquerda = centroDe(pedestalDeAcao('jogador', 0)).x;
    const acaoDireita = centroDe(pedestalDeAcao('jogador', 2)).x;
    const cooldown = centroDe(compartimentoDeCooldown('jogador', 1)).x;
    expect(classe).toBeLessThan(acaoEsquerda);
    expect(acaoDireita).toBeLessThan(cooldown);
  });

  it('do lado da máquina a rotação inverte a leitura: Cooldown à esquerda, Classe à direita', () => {
    const classe = centroDe(pedestalDeClasse('maquina', 1)).x;
    const cooldown = centroDe(compartimentoDeCooldown('maquina', 1)).x;
    expect(cooldown).toBeLessThan(centroDe(pedestalDeAcao('maquina', 0)).x);
    expect(centroDe(pedestalDeAcao('maquina', 2)).x).toBeLessThan(classe);
  });

  it('a Ultimate do jogador fica no canto inferior esquerdo e a da máquina no superior direito', () => {
    const doJogador = centroDe(slotDeUltimate('jogador'));
    const daMaquina = centroDe(slotDeUltimate('maquina'));
    expect(doJogador.x).toBeLessThan(TABULEIRO.largura / 2);
    expect(doJogador.y).toBeGreaterThan(TABULEIRO.altura / 2);
    expect(daMaquina.x).toBeGreaterThan(TABULEIRO.largura / 2);
    expect(daMaquina.y).toBeLessThan(TABULEIRO.altura / 2);
  });

  it('as quatro Passivas ficam na retaguarda, atrás das Ações', () => {
    for (const indice of [0, 1, 2, 3]) {
      expect(centroDe(encaixeDePassiva('jogador', indice)).y).toBeGreaterThan(
        centroDe(pedestalDeAcao('jogador', 1)).y,
      );
    }
  });

  it('as três Ações são as maiores peças da arena e estão igualmente espaçadas', () => {
    const acao = pedestalDeAcao('jogador', 1);
    for (const zona of TODAS_AS_ZONAS) {
      if (zona.especie === 'acao') continue;
      expect(zona.caixa.largura * zona.caixa.altura, zona.especie).toBeLessThan(
        acao.largura * acao.altura,
      );
    }
    const centros = ([0, 1, 2] as const).map((i) => centroDe(pedestalDeAcao('jogador', i)).x);
    expect(centros[1]! - centros[0]!).toBe(centros[2]! - centros[1]!);
  });

  it('as três Ações ficam alinhadas entre si, logo depois do corredor', () => {
    const topos = ([0, 1, 2] as const).map((i) => pedestalDeAcao('jogador', i).y);
    expect(new Set(topos).size).toBe(1);
    expect(topos[0]).toBeGreaterThan(TABULEIRO.altura / 2);
  });

  /*
   * O corredor central é funcional, e por isso tem medida.
   *
   * Não basta "nenhuma zona cruza a linha": os seis pedestais de Ação
   * encostados nela formam um bloco único e o corredor desaparece na prática.
   * Foi exatamente o que a primeira prova mostrou. O piso abaixo é o que
   * garante espaço para o efeito atravessar.
   */
  it('sobra um corredor de verdade entre as Ações dos dois lados', () => {
    const doJogador = pedestalDeAcao('jogador', 1);
    const daMaquina = pedestalDeAcao('maquina', 1);
    const corredor = doJogador.y - (daMaquina.y + daMaquina.altura);
    expect(corredor).toBeGreaterThanOrEqual(TABULEIRO.altura * 0.07);
  });

  it('nenhuma zona fica debaixo da moldura', () => {
    // A moldura tem 34 de espessura mais ornamento de canto. Com menos de 40
    // de margem a peça some sob ela — foi o caso da Ultimate na primeira prova.
    const MARGEM_MINIMA = 40;
    for (const zona of TODAS_AS_ZONAS) {
      const rotulo = `${zona.metade}/${zona.especie}${String(zona.indice)}`;
      expect(zona.caixa.y, rotulo).toBeGreaterThanOrEqual(MARGEM_MINIMA);
      expect(zona.caixa.x, rotulo).toBeGreaterThanOrEqual(MARGEM_MINIMA);
      expect(TABULEIRO.altura - (zona.caixa.y + zona.caixa.altura), rotulo).toBeGreaterThanOrEqual(
        MARGEM_MINIMA,
      );
      expect(
        TABULEIRO.largura - (zona.caixa.x + zona.caixa.largura),
        rotulo,
      ).toBeGreaterThanOrEqual(MARGEM_MINIMA);
    }
  });

  it('o centro da arena fica livre: nenhuma zona cruza a linha de centro', () => {
    for (const zona of TODAS_AS_ZONAS) {
      const cruza =
        zona.caixa.y < TABULEIRO.altura / 2 &&
        zona.caixa.y + zona.caixa.altura > TABULEIRO.altura / 2;
      expect(cruza, `${zona.metade}/${zona.especie}`).toBe(false);
    }
  });
});

describe('a peça de cooldown é um corpo só', () => {
  it('a peça envolve os três compartimentos', () => {
    for (const metade of METADES) {
      const peca = pecaDeCooldown(metade);
      for (const zona of [1, 2, 3] as const) {
        const compartimento = compartimentoDeCooldown(metade, zona);
        expect(compartimento.x, metade).toBeGreaterThanOrEqual(peca.x);
        expect(compartimento.y, metade).toBeGreaterThanOrEqual(peca.y);
        expect(compartimento.x + compartimento.largura).toBeLessThanOrEqual(peca.x + peca.largura);
        expect(compartimento.y + compartimento.altura).toBeLessThanOrEqual(peca.y + peca.altura);
      }
    }
  });

  it('do lado do jogador, CD1 → CD2 → CD3 correm da esquerda para a direita', () => {
    const x = ([1, 2, 3] as const).map(
      (zona) => centroDe(compartimentoDeCooldown('jogador', zona)).x,
    );
    expect(x[0]!).toBeLessThan(x[1]!);
    expect(x[1]!).toBeLessThan(x[2]!);
  });

  it('a peça da máquina é a do jogador girada', () => {
    expect(pecaDeCooldown('maquina')).toEqual(girar(pecaDeCooldown('jogador')));
  });
});

describe('a bandeja de Resposta é temporária e subordinada', () => {
  /*
   * Ela não aparece na lista de zonas permanentes — é isso que a torna
   * temporária. O que se confere aqui é que, quando ela abre, abre **encostada
   * na Ação que responde** e do lado de quem defende.
   */
  it('não é zona permanente', () => {
    const especies: readonly string[] = TODAS_AS_ZONAS.map((zona) => zona.especie);
    expect(especies).not.toContain('resposta');
  });

  it('a resposta a um Ataque da máquina abre na metade do jogador', () => {
    const bandeja = bandejaDeResposta('maquina', 1);
    expect(centroDe(bandeja).y).toBeGreaterThan(centroDe(pedestalDeAcao('maquina', 1)).y);
  });

  it('ela encosta no pedestal que responde, sem ficar solta', () => {
    for (const metade of METADES) {
      const acao = pedestalDeAcao(metade, 1);
      const bandeja = bandejaDeResposta(metade, 1);
      expect(seCruzam(acao, bandeja), metade).toBe(true);
    }
  });

  it('é menor que o pedestal de Ação: ela é acessório, não segunda fileira', () => {
    const acao = pedestalDeAcao('jogador', 1);
    const bandeja = bandejaDeResposta('jogador', 1);
    expect(bandeja.largura * bandeja.altura).toBeLessThan(acao.largura * acao.altura);
  });
});

/*
 * A folha da planta.
 *
 * Escrita só quando alguém pede. Ela desenha as vinte e seis zonas de cima,
 * sem inclinação e sem ornamento, porque o que ela serve para julgar é a
 * **organização** — se o campo está onde o usuário mandou. O acabamento é
 * outra folha.
 */
describe('folha da planta', () => {
  it('é escrita quando PROVA_DA_PLANTA aponta um arquivo', async () => {
    const destino = process.env.PROVA_DA_PLANTA;
    if (destino === undefined || destino === '') {
      expect(true).toBe(true);
      return;
    }
    const fs = await import('node:fs');
    const caminho = await import('node:path');

    const ROTULO: Readonly<Record<string, readonly string[]>> = {
      acao: ['I', 'II', 'III'],
      passiva: ['P1', 'P2', 'P3', 'P4'],
      classe: ['CLASSE', 'CLASSE'],
      cooldown: ['CD1', 'CD2', 'CD3'],
      ultimate: ['ULT'],
    };
    const COR: Readonly<Record<string, string>> = {
      acao: '#e2a02a',
      passiva: '#6f8fbf',
      classe: '#9c7ad8',
      cooldown: '#5fa88a',
      ultimate: '#d8604a',
    };

    const pecas = TODAS_AS_ZONAS.map((zona) => {
      const rotulos = ROTULO[zona.especie] ?? [];
      const indice = zona.especie === 'cooldown' ? zona.indice - 1 : zona.indice;
      const texto = rotulos[indice] ?? zona.especie;
      const cor = COR[zona.especie] ?? '#888';
      const centro = centroDe(zona.caixa);
      const opacidade = zona.metade === 'maquina' ? 0.55 : 1;
      return `<g opacity="${String(opacidade)}">
        <rect x="${String(zona.caixa.x)}" y="${String(zona.caixa.y)}"
              width="${String(zona.caixa.largura)}" height="${String(zona.caixa.altura)}"
              rx="10" fill="${cor}" fill-opacity="0.17" stroke="${cor}" stroke-width="3"/>
        <text x="${String(centro.x)}" y="${String(centro.y + 8)}" text-anchor="middle"
              font-family="ui-monospace,monospace" font-size="26" fill="${cor}">${texto}</text>
      </g>`;
    }).join('\n');

    const cooldowns = (['jogador', 'maquina'] as const)
      .map((metade) => {
        const peca = pecaDeCooldown(metade);
        return `<rect x="${String(peca.x)}" y="${String(peca.y)}" width="${String(peca.largura)}"
          height="${String(peca.altura)}" rx="16" fill="none" stroke="#5fa88a" stroke-width="2"
          stroke-dasharray="9 7" opacity="${metade === 'maquina' ? '0.45' : '0.8'}"/>`;
      })
      .join('\n');

    const svg = `<svg viewBox="0 0 ${String(TABULEIRO.largura)} ${String(TABULEIRO.altura)}"
        xmlns="http://www.w3.org/2000/svg">
      <rect width="${String(TABULEIRO.largura)}" height="${String(TABULEIRO.altura)}" fill="#16141b"/>
      <line x1="0" y1="${String(TABULEIRO.altura / 2)}" x2="${String(TABULEIRO.largura)}"
            y2="${String(TABULEIRO.altura / 2)}" stroke="#6b5a33" stroke-width="2" stroke-dasharray="14 10"/>
      <text x="24" y="${String(TABULEIRO.altura / 2 - 16)}" font-family="ui-monospace,monospace"
            font-size="24" fill="#6b5a33">LADO DA IA</text>
      <text x="24" y="${String(TABULEIRO.altura / 2 + 38)}" font-family="ui-monospace,monospace"
            font-size="24" fill="#6b5a33">LADO DO JOGADOR</text>
      ${cooldowns}
      ${pecas}
    </svg>`;

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Planta do campo</title><style>
:root{color-scheme:dark}
body{margin:0;padding:34px;background:#08070b;color:#d8cfbe;
 font-family:'Iowan Old Style',Palatino,Georgia,serif}
h1{font-size:22px;letter-spacing:2px;margin:0 0 6px}
p{margin:0 0 20px;opacity:.6;font-size:14px;letter-spacing:.5px;max-width:1100px;line-height:1.5}
svg{width:100%;height:auto;display:block;border:1px solid #2a2520;border-radius:6px}
</style></head><body>
<h1>ARCANE DUEL — PLANTA DEFINITIVA DO CAMPO</h1>
<p>Vinte e seis zonas permanentes, treze por jogador. O lado do jogador está cheio;
o da IA, esmaecido, é <strong>a mesma metade girada 180°</strong> — não há um segundo
conjunto de números. A linha tracejada é o centro livre, que nenhuma zona cruza.</p>
${svg}</body></html>`;

    fs.mkdirSync(caminho.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, html, 'utf8');
    expect(html).toContain('<svg');
  });
});
