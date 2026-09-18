import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CATALOGO, CLASSES_IMPLEMENTADAS } from '@arcane-duel/card-data';

/*
 * Toda carta precisa de pelo menos um teste de comportamento.
 *
 * A conferência antiga procurava o identificador em qualquer ponto de qualquer
 * arquivo de teste. Era uma guarda útil, mas fraca demais para a frase que ela
 * sustentava: uma menção em comentário, em um apoio de montagem ou em uma
 * build de outro teste já a satisfazia, e a carta passava sem nunca ter tido o
 * comportamento dela conferido.
 *
 * A regra agora é uma convenção estruturada, simples e determinística:
 *
 *   **o identificador da carta abre o título de um `it(...)`, e aquele teste
 *   contém pelo menos uma asserção.**
 *
 * É o formato que os testes de carta já seguem — `it('D01 Chicote de Raízes
 * recebe +1 I...')` —, então nada precisou ser reescrito. O que mudou é que
 * agora ele é exigido: comentário não é título de teste, e título sem
 * `expect` não é prova de comportamento.
 */

const pastaDeEfeitos = fileURLToPath(new URL('./efeitos/', import.meta.url));

interface TesteDeCarta {
  readonly arquivo: string;
  readonly titulo: string;
  readonly corpo: string;
}

/**
 * Os testes de carta, cada um com o título e o corpo.
 *
 * O recorte é por `it(`, sem parser: o corpo de um teste é tudo que vem entre
 * o título dele e o começo do próximo. Basta para responder "este teste afirma
 * alguma coisa?", que é a pergunta desta conferência.
 */
const testesDeCarta = (): readonly TesteDeCarta[] => {
  const testes: TesteDeCarta[] = [];

  for (const arquivo of readdirSync(pastaDeEfeitos).filter((nome) => nome.endsWith('.test.ts'))) {
    const conteudo = readFileSync(`${pastaDeEfeitos}${arquivo}`, 'utf8');
    for (const fatia of conteudo.split(/\n\s*it\(/).slice(1)) {
      const titulo = /^'([^']*)'/.exec(fatia);
      if (titulo === null) continue;
      testes.push({ arquivo, titulo: titulo[1] ?? '', corpo: fatia.slice(titulo[0].length) });
    }
  }

  return testes;
};

/** O título começa pelo identificador desta carta? */
const abreCom = (titulo: string, id: string): boolean =>
  titulo === id || titulo.startsWith(`${id} `);

describe('cobertura de cartas', () => {
  const testes = testesDeCarta();

  it('encontra os testes de carta para conferir', () => {
    // Guarda contra o recorte silenciosamente parar de casar e a conferência
    // inteira virar uma lista vazia que passa sozinha.
    expect(testes.length).toBeGreaterThan(CATALOGO.todas.length);
  });

  it('abre um teste de comportamento com o identificador de cada carta', () => {
    const semTeste = CATALOGO.todas
      .filter((carta) => !testes.some((teste) => abreCom(teste.titulo, carta.id)))
      .map((carta) => `${carta.id} ${carta.nome}`);

    expect(semTeste).toEqual([]);
  });

  it('afirma alguma coisa em cada um desses testes', () => {
    const semAsercao = CATALOGO.todas
      .filter((carta) => {
        const seus = testes.filter((teste) => abreCom(teste.titulo, carta.id));
        return seus.length > 0 && !seus.some((teste) => teste.corpo.includes('expect('));
      })
      .map((carta) => `${carta.id} ${carta.nome}`);

    expect(semAsercao).toEqual([]);
  });

  it('não deixa teste de carta com título fora da convenção', () => {
    // Um teste cujo título começa por algo parecido com um identificador, mas
    // que não é carta nenhuma, é erro de digitação — e sem esta guarda ele
    // passaria despercebido, cobrindo carta nenhuma.
    const conhecidos = new Set(CATALOGO.todas.map((carta) => carta.id as string));
    const suspeitos = testes
      .map((teste) => ({ teste, prefixo: /^([A-Z]{1,3}[A-Z]?\d{2})\b/.exec(teste.titulo) }))
      .filter(({ prefixo }) => prefixo !== null && !conhecidos.has(prefixo[1] ?? ''))
      .map(({ teste, prefixo }) => `${teste.arquivo}: ${prefixo?.[1] ?? ''} — ${teste.titulo}`);

    expect(suspeitos).toEqual([]);
  });

  it('cobre as 39 cartas de cada classe implementada', () => {
    expect(CATALOGO.todas).toHaveLength(CLASSES_IMPLEMENTADAS.length * 39);
  });
});
