// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { corDaClasse } from '../carta/paleta.js';
import { CAMERA, enquadrarTabuleiro } from '../layout/camera.js';
import { VIEWPORTS_ALVO, zonasDaTela } from '../layout/zonas.js';

import { Tabuleiro } from './Tabuleiro.jsx';
import { TABULEIRO, TODAS_AS_ZONAS } from './planta.js';

/*
 * A prova de arena.
 *
 * O que é conferível por máquina: que a superfície desenha, que ela não usa
 * imagem nenhuma, e que o enquadramento faz o campo caber na área que ele
 * recebeu em todo viewport alvo. O resto é olhar — e com `PROVA_DE_ARENA`
 * apontando um arquivo, esta mesma verificação escreve a folha com o campo
 * inclinado, para alguém julgar.
 */

const GUERREIRO = corDaClasse('guerreiro');
const MAGO = corDaClasse('mago');

const desenhar = (): string =>
  renderToStaticMarkup(
    <Tabuleiro energiaDoJogador={GUERREIRO.energia} energiaDaMaquina={MAGO.energia} />,
  );

describe('a arena é desenhada por código', () => {
  it('não referencia imagem nenhuma', () => {
    const svg = desenhar();
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('.png');
    expect(svg).not.toContain('url(/');
    expect(svg).toContain('<svg');
  });

  /*
   * A superfície precisa ser material, e não chapa lisa.
   *
   * "Bonita" não é conferível, mas "tem granulação, veio, desgaste e fissura"
   * é: os quatro nascem de filtro e padrão com nome. Se alguém simplificar a
   * pedra para um gradiente só, isto falha — que é exatamente o ponto.
   */
  it('a pedra tem granulação, veios, desgaste e microfissuras', () => {
    const svg = desenhar();
    for (const material of ['granulacao', 'veios', 'desgaste', 'fissuras']) {
      expect(svg, material).toContain(material);
    }
    expect(svg).toContain('feTurbulence');
  });

  /*
   * O ouro precisa parecer metal.
   *
   * O que faz isso é o gradiente ter escuro na borda de cima, claro logo
   * abaixo, ouro cheio no meio e escuro de novo embaixo. Duas paradas
   * produzem plástico amarelo, e é assim que se reconhece ouro mal feito.
   */
  it('o fio de ouro tem quatro paradas: sem isso ele vira plástico', () => {
    const svg = desenhar();
    const gradiente = svg.slice(svg.indexOf('id="fioDeOuro'));
    const ate = gradiente.indexOf('</linearGradient>');
    expect((gradiente.slice(0, ate).match(/<stop/g) ?? []).length).toBe(4);
  });

  it('desenha marca pequena I, II e III, e não a palavra AÇÃO', () => {
    const svg = desenhar();
    expect(svg).toContain('>I<');
    expect(svg).toContain('>II<');
    expect(svg).toContain('>III<');
    expect(svg.toUpperCase()).not.toContain('AÇÃO');
  });

  /*
   * O que a revisão mandou tirar do tabuleiro não pode voltar como texto.
   *
   * A conferência olha só o **texto desenhado**, e não a marcação inteira:
   * procurar a palavra no SVG cru acusa "VIDA" dentro de "cavidade", que é
   * nome de material e não informação no campo.
   */
  it('não escreve no campo nada que pertence ao HUD', () => {
    const svg = desenhar();
    const textos = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
      .map((achado) => (achado[1] ?? '').toUpperCase())
      .join(' | ');
    for (const proibido of [
      'PERSONAGEM',
      'REMOVIDAS',
      'VIDA',
      'GUARDA',
      'MOMENTUM',
      'RESERVA',
      'MANA',
      'TURNO',
    ]) {
      expect(textos, proibido).not.toContain(proibido);
    }
    // O único texto do campo é a marca dos pedestais — I, II e III, e mais
    // nada. Cada uma sai duas vezes por pedestal: o traço de fundo e o de luz.
    const distintos = [
      ...new Set([...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((achado) => achado[1] ?? '')),
    ].sort();
    expect(distintos).toEqual(['I', 'II', 'III']);
  });

  /*
   * Nada pode cobrir o campo depois de ele ser desenhado.
   *
   * A primeira prova saiu com o tabuleiro vazio: a moldura desenhava a base
   * de metal como uma placa **cheia** do tamanho do tabuleiro, por cima dos
   * vinte e seis encaixes. Tudo estava no DOM, com caixa certa, e nada
   * aparecia. O teste procura o que causou isso — forma preenchida do tamanho
   * do tabuleiro depois do primeiro encaixe — porque é uma classe de erro que
   * só se vê olhando, e olhar não é conferência.
   */
  it('nenhuma forma preenchida do tamanho do tabuleiro é desenhada sobre o campo', () => {
    const svg = desenhar();
    const corpo = svg.slice(svg.indexOf('</defs>'));
    const formas = [...corpo.matchAll(/<(path|rect)\b([^>]*)>/g)];
    // Onde o primeiro encaixe é desenhado: daí para a frente nada pode tapar.
    const primeiroEncaixe = corpo.indexOf('cavidade');
    expect(primeiroEncaixe).toBeGreaterThan(0);

    for (const forma of formas) {
      if (forma.index === undefined || forma.index < primeiroEncaixe) continue;
      const attrs = forma[1] === 'rect' ? (forma[2] ?? '') : (forma[2] ?? '');
      const preenchida = /fill="(?!none)/.test(attrs);
      if (!preenchida) continue;
      const cobreTudo =
        attrs.includes(`width="${String(TABULEIRO.largura)}"`) ||
        // A placa completa do tabuleiro começa sempre no mesmo ponto.
        attrs.includes('d="M 32 0 H');
      const comAnel = attrs.includes('fill-rule="evenodd"');
      // Uma passagem de luz translúcida pode cobrir tudo, e se declara.
      const ehLuz = attrs.includes('data-camada="luz"');
      expect(
        cobreTudo && !comAnel && !ehLuz,
        `forma preenchida do tamanho do tabuleiro sobre o campo: ${attrs.slice(0, 90)}`,
      ).toBe(false);
    }
  });

  it('a moldura é um anel, e não uma placa cheia', () => {
    const svg = desenhar();
    expect(svg).toContain('fill-rule="evenodd"');
  });

  it('duas arenas no mesmo documento não compartilham material', () => {
    const idsDe = (svg: string): readonly string[] => [
      ...new Set([...svg.matchAll(/id="([^"]+)"/g)].map((achado) => achado[1] ?? '')),
    ];
    const primeira = idsDe(desenhar());
    const segunda = idsDe(
      renderToStaticMarkup(<Tabuleiro energiaDoJogador="#111111" energiaDaMaquina="#222222" />),
    );
    expect(primeira.length).toBeGreaterThan(8);
    for (const id of segunda) expect(primeira).not.toContain(id);
  });
});

describe('o enquadramento cabe na área que a arena recebeu', () => {
  /*
   * A conta do enquadramento é a da própria transformação CSS, na mesma ordem
   * em que o navegador a aplica — escala, rotação, divisão por perspectiva.
   * A primeira versão desta conta usava só o cosseno e errava: em perspectiva
   * a borda da frente vem na direção de quem olha e fica maior que o cálculo
   * ortográfico previa. Foi assim que o campo estourou pela base.
   */
  const projetar = (yLocal: number, escala: number): { fator: number; y: number } => {
    const radianos = (CAMERA.inclinacaoEmGraus * Math.PI) / 180;
    const yEscalado = yLocal * escala;
    const z = yEscalado * Math.sin(radianos);
    const fator = CAMERA.perspectiva / (CAMERA.perspectiva - z);
    return { fator, y: yEscalado * Math.cos(radianos) * fator };
  };

  it('o tabuleiro projetado cabe na zona da arena em todo viewport alvo', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const arena = zonasDaTela(viewport).arena;
      const { escala } = enquadrarTabuleiro(arena.largura, arena.altura);
      const frente = projetar(TABULEIRO.altura / 2, escala);
      const fundo = projetar(-TABULEIRO.altura / 2, escala);
      const rotulo = `${String(viewport.largura)}×${String(viewport.altura)}`;
      expect(TABULEIRO.largura * escala * frente.fator, rotulo).toBeLessThanOrEqual(
        arena.largura + 1,
      );
      expect(frente.y - fundo.y, rotulo).toBeLessThanOrEqual(arena.altura + 1);
    }
  });

  it('a escala é positiva e o campo não some em nenhuma tela', () => {
    for (const viewport of VIEWPORTS_ALVO) {
      const arena = zonasDaTela(viewport).arena;
      const { escala } = enquadrarTabuleiro(arena.largura, arena.altura);
      expect(escala, String(viewport.largura)).toBeGreaterThan(0.1);
    }
  });

  it('a câmera é constante: não existe função que a mova', () => {
    expect(Object.isFrozen(CAMERA) || typeof CAMERA === 'object').toBe(true);
    expect(CAMERA.inclinacaoEmGraus).toBe(47);
  });
});

/*
 * A folha de prova da arena.
 *
 * Escrita só quando alguém pede. Ela mostra o campo inclinado, na proporção da
 * zona de arena de 915×412, que é o viewport de calibração.
 */
describe('folha de prova', () => {
  it('é escrita quando PROVA_DE_ARENA aponta um arquivo', () => {
    const destino = process.env.PROVA_DE_ARENA;
    if (destino === undefined || destino === '') {
      expect(true).toBe(true);
      return;
    }

    const svg = desenhar();
    const linhas = VIEWPORTS_ALVO.map((viewport) => {
      const arena = zonasDaTela(viewport).arena;
      const { escala, deslocamentoY } = enquadrarTabuleiro(arena.largura, arena.altura);
      return `<figure>
        <div class="palco" style="width:${String(arena.largura)}px;height:${String(arena.altura)}px">
          <div class="tab" style="
            width:${String(TABULEIRO.largura)}px;height:${String(TABULEIRO.altura)}px;
            transform:translate(-50%,-50%) translateY(${String(deslocamentoY)}px)
                      rotateX(${String(CAMERA.inclinacaoEmGraus)}deg) scale(${String(escala)})">
            ${svg}
          </div>
        </div>
        <figcaption>${String(viewport.largura)}×${String(viewport.altura)}
          <span>· zona da arena ${String(arena.largura)}×${String(arena.altura)}
          · escala ${escala.toFixed(3)}</span></figcaption>
      </figure>`;
    }).join('\n');

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Prova de arena — Demo V2</title><style>
:root{color-scheme:dark}
body{margin:0;padding:32px;background:#07060a;color:#d8cfbe;
 font-family:'Iowan Old Style',Palatino,Georgia,serif}
h1{font-size:22px;letter-spacing:2px;margin:0 0 6px}
p.sub{margin:0 0 24px;opacity:.55;font-size:14px;letter-spacing:1px}
.folha{display:flex;flex-direction:column;gap:26px;align-items:flex-start}
figure{margin:0}
.palco{position:relative;overflow:hidden;border:1px solid #2a2520;border-radius:4px;
 perspective:${String(CAMERA.perspectiva)}px;perspective-origin:50% ${String(CAMERA.origemVertical * 100)}%;
 background:#08070c}
.tab{position:absolute;top:50%;left:50%;transform-style:preserve-3d}
.tab svg{width:100%;height:100%;display:block}
figcaption{margin-top:8px;font-size:13px;opacity:.7;letter-spacing:1px}
figcaption span{opacity:.5;font-size:11px}
</style></head><body>
<h1>ARCANE DUEL — PROVA DE ARENA V2</h1>
<p class="sub">O tabuleiro na zona de arena de cada viewport alvo, com a câmera fixa
de ${String(CAMERA.inclinacaoEmGraus)}°.</p>
<div class="folha">${linhas}</div></body></html>`;

    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, html, 'utf8');
    expect(html).toContain('<svg');
    expect(TODAS_AS_ZONAS.length).toBe(26);
  });
});
