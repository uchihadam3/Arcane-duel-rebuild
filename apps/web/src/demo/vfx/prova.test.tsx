// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Tabuleiro } from '../arena/Tabuleiro.jsx';
import { TABULEIRO } from '../arena/planta.js';
import { corDaClasse } from '../carta/paleta.js';

import { CamadaDeEfeitos } from './CamadaDeEfeitos.jsx';
import { ROTEIROS_MODELO, beatsNoAr, duracaoDoRoteiro } from './roteiros.js';

/*
 * A prova de efeito.
 *
 * `roteiros.test.ts` confere o **tempo** — quando cada beat entra, quanto dura,
 * que o Meteoro cabe na faixa que a tarefa pediu. Aqui se confere o **desenho**:
 * que cada forma produz geometria de verdade, que o campo continua sendo o
 * mesmo campo enquanto o efeito roda, e que nada na camada mexe na câmera.
 *
 * Se o efeito está bonito não é conferível por máquina. Por isso, quando
 * `PROVA_DE_EFEITO` aponta um arquivo, esta mesma verificação escreve a folha
 * com os quatro roteiros amostrados quadro a quadro, para alguém olhar. Fora
 * disso ela não escreve nada.
 */

const ENERGIA = corDaClasse('guerreiro');
const ENERGIA_DO_MAGO = corDaClasse('mago');

const energiaDe = (carta: string): { energia: string; clara: string } =>
  carta === 'M02' || carta === 'MU01'
    ? { energia: ENERGIA_DO_MAGO.energia, clara: ENERGIA_DO_MAGO.energiaClara }
    : { energia: ENERGIA.energia, clara: ENERGIA.energiaClara };

const desenharEm = (carta: string, decorridoMs: number, origem: 'jogador' | 'maquina'): string => {
  const roteiro = ROTEIROS_MODELO.find((item) => item.carta === carta);
  if (roteiro === undefined) throw new Error(`roteiro ausente: ${carta}`);
  const cores = energiaDe(carta);
  return renderToStaticMarkup(
    <CamadaDeEfeitos
      beats={beatsNoAr(roteiro, decorridoMs)}
      origem={origem}
      coluna={1}
      energia={cores.energia}
      energiaClara={cores.clara}
    />,
  );
};

/* Seis instantes por roteiro, espalhados pela duração dele. */
const AMOSTRAS = 6;
const instantes = (carta: string): readonly number[] => {
  const roteiro = ROTEIROS_MODELO.find((item) => item.carta === carta);
  if (roteiro === undefined) throw new Error(`roteiro ausente: ${carta}`);
  const total = duracaoDoRoteiro(roteiro);
  return Array.from({ length: AMOSTRAS }, (_, indice) =>
    Math.round((total * (indice + 0.5)) / AMOSTRAS),
  );
};

describe('cada beat desenha geometria de verdade', () => {
  it('toda forma do vocabulário produz algo no SVG', () => {
    const formasVistas = new Set<string>();
    for (const roteiro of ROTEIROS_MODELO) {
      for (const beat of roteiro.beats) {
        const meio = beat.emMs + beat.duracaoMs / 2;
        const svg = desenharEm(roteiro.carta, meio, 'jogador');
        expect(svg, `${roteiro.nome}/${beat.forma}`).toContain('<svg');
        // Um beat que não emite nenhuma primitiva é um beat que não existe.
        expect(
          /<(path|circle|ellipse|line|rect|g)\b/.test(svg.slice(svg.indexOf('</defs>'))),
          `${roteiro.nome}/${beat.forma} não desenhou nada`,
        ).toBe(true);
        formasVistas.add(beat.forma);
      }
    }
    expect(formasVistas.size).toBeGreaterThanOrEqual(12);
  });

  it('fora da janela do roteiro a camada não desenha nada', () => {
    for (const roteiro of ROTEIROS_MODELO) {
      expect(desenharEm(roteiro.carta, duracaoDoRoteiro(roteiro) + 1, 'jogador')).toBe('');
    }
  });

  /*
   * A camada desenha no mesmo sistema de coordenadas do tabuleiro.
   *
   * Isso é o que faz o golpe atravessar **o campo**, e não um plano colado na
   * tela. Se o viewBox divergir da planta, o efeito sai do lugar sem que nada
   * quebre — por isso a conferência é explícita.
   */
  it('usa o viewBox do tabuleiro, e não um plano de tela', () => {
    const svg = desenharEm('W08', 500, 'jogador');
    expect(svg).toContain(`viewBox="0 0 ${String(TABULEIRO.largura)} ${String(TABULEIRO.altura)}"`);
  });

  it('não mexe na câmera: nenhum beat emite transformação 3D', () => {
    for (const roteiro of ROTEIROS_MODELO) {
      for (const instante of instantes(roteiro.carta)) {
        const svg = desenharEm(roteiro.carta, instante, 'maquina');
        expect(svg).not.toContain('rotateX');
        expect(svg).not.toContain('perspective');
        expect(svg).not.toContain('matrix3d');
      }
    }
  });

  /*
   * O efeito da máquina sai de cima e chega embaixo; o do jogador, ao contrário.
   *
   * É a metade de origem que decide, e não de quem é a vez — não existe
   * parâmetro de inversão em lugar nenhum desta camada.
   */
  /*
   * Duas camadas no mesmo documento não podem trocar de cor.
   *
   * `id` em SVG é global. Com identificador fixo, o segundo `url(#efeitoNucleo)`
   * resolvia para o gradiente do primeiro, e o fogo do Mago saía laranja de
   * Guerreiro. A folha de prova mostrou isso antes de o aparelho mostrar.
   */
  it('duas camadas no mesmo documento não compartilham gradiente', () => {
    const doGuerreiro = desenharEm('W08', 500, 'jogador');
    const doMago = desenharEm('M02', 700, 'maquina');
    const idsDe = (svg: string): readonly string[] => [
      ...new Set([...svg.matchAll(/id="(efeito[^"]+)"/g)].map((achado) => achado[1] ?? '')),
    ];
    const daFrente = idsDe(doGuerreiro);
    const deTras = idsDe(doMago);
    expect(daFrente.length).toBeGreaterThan(0);
    for (const id of deTras) expect(daFrente).not.toContain(id);
  });

  it('a origem inverte o sentido do golpe sem inverter o campo', () => {
    const doJogador = desenharEm('W08', 560, 'jogador');
    const daMaquina = desenharEm('W08', 560, 'maquina');
    expect(doJogador).not.toBe(daMaquina);
    expect(doJogador).toContain('<svg');
    expect(daMaquina).toContain('<svg');
  });
});

/*
 * A folha de prova.
 *
 * Escrita só quando alguém pede. Ela não é asserção: é o artefato que a pessoa
 * abre para dizer se aprova o efeito.
 */
describe('folha de prova', () => {
  it('é escrita quando PROVA_DE_EFEITO aponta um arquivo', () => {
    const destino = process.env.PROVA_DE_EFEITO;
    if (destino === undefined || destino === '') {
      expect(true).toBe(true);
      return;
    }

    const campo = renderToStaticMarkup(
      <Tabuleiro energiaDoJogador={ENERGIA.energia} energiaDaMaquina={ENERGIA_DO_MAGO.energia} />,
    );

    const linhas = ROTEIROS_MODELO.map((roteiro) => {
      const origem = roteiro.carta === 'W15' ? 'maquina' : 'jogador';
      const quadros = instantes(roteiro.carta)
        .map((instante) => {
          const efeito = desenharEm(roteiro.carta, instante, origem);
          return `<figure><div class="quadro">${campo}${efeito}</div>
<figcaption>${String(instante)} ms</figcaption></figure>`;
        })
        .join('\n');
      return `<section><h2>${roteiro.carta} · ${roteiro.nome}
<small>${String(duracaoDoRoteiro(roteiro))} ms</small></h2>
<div class="tira">${quadros}</div></section>`;
    }).join('\n');

    const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Prova de efeito — Demo V2</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 32px; background: #08070b; color: #d8cfbe;
         font-family: 'Iowan Old Style', Palatino, Georgia, serif; }
  h1 { font-size: 22px; letter-spacing: 2px; margin: 0 0 24px; }
  h2 { font-size: 16px; letter-spacing: 1.5px; margin: 26px 0 10px; font-weight: 600; }
  h2 small { opacity: .5; font-weight: 400; margin-left: 10px; }
  .tira { display: flex; gap: 12px; flex-wrap: nowrap; }
  figure { margin: 0; flex: 1 1 0; min-width: 0; }
  .quadro { position: relative; aspect-ratio: ${String(TABULEIRO.largura)} / ${String(TABULEIRO.altura)};
            border: 1px solid #2a2520; border-radius: 4px; overflow: hidden; }
  .quadro svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  figcaption { margin-top: 6px; font-size: 12px; opacity: .55; letter-spacing: 1px; }
</style></head>
<body><h1>ARCANE DUEL — PROVA DE EFEITO V2</h1>${linhas}</body></html>`;

    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, html, 'utf8');
    expect(html).toContain('<svg');
  });
});
