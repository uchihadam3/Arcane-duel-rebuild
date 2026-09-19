// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { CardId } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { cartaVisivel } from '../../partida/apresentacao.js';

import { CartaVetorial, VersoVetorial } from './CartaVetorial.jsx';
import { CARTAS_COM_ARTE } from './arte/index.jsx';

/*
 * A prova de carta.
 *
 * O teste confere o que é conferível por máquina: que as quatro cartas-modelo
 * desenham, que a arte de cada uma é **diferente** da das outras, e que o verso
 * não carrega identidade nenhuma.
 *
 * O resto — se está bonito — não é conferível por máquina, e fingir que é seria
 * repetir o erro da Etapa 6. Por isso, quando `PROVA_DE_CARTA` aponta um
 * diretório, o mesmo arquivo escreve uma folha HTML com as quatro cartas em
 * tamanho grande, para alguém olhar. Fora disso ele não escreve nada, e o
 * `npm run test` segue limpo.
 */

const MODELOS: readonly CardId[] = [cardId('W08'), cardId('W15'), cardId('M02'), cardId('MU01')];

const desenhar = (id: CardId, comTexto = true): string => {
  const carta = cartaVisivel(id);
  expect(carta, `${String(id)} não está no catálogo`).not.toBeNull();
  if (carta === null) throw new Error('carta ausente');
  return renderToStaticMarkup(<CartaVetorial carta={carta} comTexto={comTexto} />);
};

describe('as quatro cartas-modelo desenham', () => {
  it('cobre exatamente as cartas que a tarefa pediu', () => {
    expect([...CARTAS_COM_ARTE].sort()).toEqual(['M02', 'MU01', 'W08', 'W15']);
  });

  it('cada uma produz SVG com o nome, o tipo e os números dela', () => {
    for (const id of MODELOS) {
      const carta = cartaVisivel(id);
      if (carta === null) throw new Error('carta ausente');
      const svg = desenhar(id);
      expect(svg).toContain('<svg');
      // O nome pode estar quebrado em duas linhas: confere a primeira palavra.
      expect(svg).toContain(carta.nome.split(' ')[0] ?? '');
      if (carta.dano !== null) expect(svg).toContain('DANO');
      if (carta.impacto !== null) expect(svg).toContain('IMPACTO');
    }
  });

  /*
   * Quatro artes claramente diferentes.
   *
   * Comparar o desenho inteiro não serviria: a moldura é a mesma nas quatro, e
   * ela domina o texto. O que se compara é a **quantidade de formas**, que é o
   * que mais muda entre uma paisagem e uma esfera. Artes iguais dariam a mesma
   * contagem; o teste falha quando duas convergirem.
   */
  it('as quatro artes são distintas entre si', () => {
    const assinaturas = MODELOS.map((id) => {
      const svg = desenhar(id);
      const miolo = svg.slice(svg.indexOf('janela-'));
      return [
        (miolo.match(/<path/g) ?? []).length,
        (miolo.match(/<circle/g) ?? []).length,
        (miolo.match(/<ellipse/g) ?? []).length,
        (miolo.match(/<line/g) ?? []).length,
      ].join(':');
    });
    expect(new Set(assinaturas).size).toBe(MODELOS.length);
  });

  it('a carta sem texto continua com nome e custo', () => {
    const svg = desenhar(cardId('W08'), false);
    expect(svg).toContain('Golpe');
    expect(svg).toContain('ATAQUE');
  });
});

describe('o verso não pode vazar nada', () => {
  it('não recebe carta nenhuma como argumento e não imprime identificador', () => {
    const svg = renderToStaticMarkup(<VersoVetorial />);
    for (const id of MODELOS) expect(svg).not.toContain(String(id));
    expect(svg).toContain('Carta virada');
  });
});

/*
 * A folha de prova.
 *
 * Escrita só quando alguém pede, com o caminho vindo do ambiente. Ela não é
 * asserção: é o artefato que a pessoa abre para dizer se aprova a moldura.
 */
describe('folha de prova', () => {
  it('é escrita quando PROVA_DE_CARTA aponta um arquivo', () => {
    const destino = process.env.PROVA_DE_CARTA;
    if (destino === undefined || destino === '') {
      expect(true).toBe(true);
      return;
    }

    const cartas = MODELOS.map((id) => {
      const carta = cartaVisivel(id);
      if (carta === null) throw new Error('carta ausente');
      return `<figure><div class="carta">${desenhar(id)}</div><figcaption>${String(id)} · ${carta.nome}</figcaption></figure>`;
    }).join('\n');

    const verso = `<figure><div class="carta">${renderToStaticMarkup(<VersoVetorial />)}</div><figcaption>verso</figcaption></figure>`;

    const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Prova de carta — Demo V2</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 36px; background: #0a090c; color: #d8cfbe;
         font-family: 'Iowan Old Style', Palatino, Georgia, serif; }
  h1 { font-size: 22px; font-weight: 600; letter-spacing: 2px; margin: 0 0 28px; }
  .folha { display: flex; gap: 28px; flex-wrap: wrap; align-items: flex-start; }
  figure { margin: 0; }
  .carta { width: 340px; aspect-ratio: 5 / 7;
           filter: drop-shadow(0 18px 34px rgba(0,0,0,.7)); }
  .carta svg { width: 100%; height: 100%; display: block; }
  figcaption { margin-top: 10px; font-size: 14px; opacity: .65; letter-spacing: 1px; }
</style></head>
<body><h1>ARCANE DUEL — PROVA DE CARTA V2</h1><div class="folha">${cartas}${verso}</div></body></html>`;

    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, html, 'utf8');
    expect(html).toContain('<svg');
    // Um caminho relativo continua sendo relativo à raiz do repositório.
    expect(join(destino)).toBe(destino);
  });
});
