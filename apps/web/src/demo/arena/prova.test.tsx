// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { corDaClasse } from '../carta/paleta.js';

import { Tabuleiro } from './Tabuleiro.jsx';
import {
  ALCANCE_VISIVEL,
  CAMERA,
  TABULEIRO,
  enquadrarTabuleiro,
  pedestalDeAcao,
} from './planta.js';

/*
 * A prova de arena.
 *
 * O que é conferível por máquina: que a superfície desenha, que ela não usa
 * imagem nenhuma, e que a planta é **fixa** — os pedestais do jogador ficam na
 * metade de baixo e os da máquina na de cima, em toda chamada.
 *
 * O resto é olhar. Com `PROVA_DE_ARENA` apontando um arquivo, esta mesma
 * verificação escreve a folha HTML com o campo inclinado, para alguém julgar.
 */

describe('a arena é desenhada por código', () => {
  it('não referencia imagem nenhuma', () => {
    const svg = renderToStaticMarkup(
      <Tabuleiro energiaDoJogador="#e2622a" energiaDaMaquina="#6f6bff" />,
    );
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('.png');
    expect(svg).not.toContain('url(/');
    expect(svg).toContain('<svg');
  });

  it('a metade do jogador fica embaixo e a da máquina em cima, sempre', () => {
    for (let repeticao = 0; repeticao < 3; repeticao += 1) {
      const doJogador = pedestalDeAcao('jogador', 1);
      const daMaquina = pedestalDeAcao('maquina', 1);
      expect(daMaquina.y).toBeLessThan(TABULEIRO.altura / 2);
      expect(doJogador.y).toBeGreaterThan(TABULEIRO.altura / 2 - daMaquina.altura);
      expect(doJogador.y).toBeGreaterThan(daMaquina.y);
    }
  });

  it('as três colunas de Ação ficam alinhadas entre as duas metades', () => {
    for (const indice of [0, 1, 2] as const) {
      expect(pedestalDeAcao('jogador', indice).x).toBe(pedestalDeAcao('maquina', indice).x);
    }
  });

  /*
   * O enquadramento conta a perspectiva, e não só o cosseno.
   *
   * A conta ortográfica subestimava a borda da frente — que em perspectiva vem
   * na direção de quem olha e cresce —, e o campo estourava pela base. Este
   * teste refaz a projeção do jeito que o navegador faz e exige que as quatro
   * quinas caibam.
   */
  it('o campo e as duas mãos cabem em qualquer tela alvo', () => {
    const radianos = (CAMERA.inclinacaoEmGraus * Math.PI) / 180;
    for (const [largura, altura] of [
      [915, 412],
      [844, 390],
      [720, 360],
      [1280, 720],
    ]) {
      const { escala, deslocamentoY } = enquadrarTabuleiro(largura ?? 0, altura ?? 0);
      for (const extremo of [ALCANCE_VISIVEL.topo, ALCANCE_VISIVEL.base]) {
        const y = extremo * escala;
        const z = y * Math.sin(radianos);
        const fator = CAMERA.perspectiva / (CAMERA.perspectiva - z);
        const projetadoY = y * Math.cos(radianos) * fator + deslocamentoY;
        const projetadoX = (TABULEIRO.largura / 2) * escala * fator;
        expect(Math.abs(projetadoX)).toBeLessThanOrEqual((largura ?? 0) / 2 + 0.5);
        expect(Math.abs(projetadoY)).toBeLessThanOrEqual((altura ?? 0) / 2 + 0.5);
      }
    }
  });
});

describe('folha de prova da arena', () => {
  it('é escrita quando PROVA_DE_ARENA aponta um arquivo', () => {
    const destino = process.env.PROVA_DE_ARENA;
    if (destino === undefined || destino === '') {
      expect(true).toBe(true);
      return;
    }

    const svg = renderToStaticMarkup(
      <Tabuleiro
        energiaDoJogador={corDaClasse('guerreiro').energia}
        energiaDaMaquina={corDaClasse('mago').energia}
      />,
    );

    const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Prova de arena — Demo V2</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:radial-gradient(120% 90% at 50% 8%, #16121c 0%, #07060a 60%, #030304 100%);
         color:#cfc5b2; font-family:'Iowan Old Style',Palatino,Georgia,serif;
         height:100vh; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .palco { perspective:${String(CAMERA.perspectiva)}px; perspective-origin:50% ${String(CAMERA.origemVertical * 100)}%;
           width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; }
  .tabuleiro { width:${String(TABULEIRO.largura)}px; height:${String(TABULEIRO.altura)}px;
               transform: translateY(var(--deslocamento)) rotateX(${String(CAMERA.inclinacaoEmGraus)}deg) scale(var(--escala));
               transform-origin:50% 50%;
               box-shadow:0 60px 120px rgba(0,0,0,.8); }
  .tabuleiro svg { width:100%; height:100%; display:block; }
</style></head>
<body><div class="palco"><div class="tabuleiro" id="t">${svg}</div></div>
<script>
  var t = document.getElementById('t');
  var enquadramento = ${JSON.stringify(enquadrarTabuleiro(915, 412))};
  t.style.setProperty('--escala', String(enquadramento.escala));
  t.style.setProperty('--deslocamento', enquadramento.deslocamentoY.toFixed(2) + 'px');
</script></body></html>`;

    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, html, 'utf8');
    expect(html).toContain('<svg');
  });
});
