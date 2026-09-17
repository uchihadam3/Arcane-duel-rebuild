import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CATALOGO } from '@arcane-duel/card-data';

/*
 * Toda carta precisa de pelo menos um teste de comportamento.
 *
 * Esta verificação é deliberadamente literal: ela lê os arquivos de teste de
 * carta e confere que o identificador de cada carta do catálogo aparece em
 * algum deles. Uma carta nova entra com o teste dela ou a verificação quebra —
 * que é exatamente a regra do ROADMAP_CODEX.md para as etapas de classe.
 */

const pastaDeEfeitos = fileURLToPath(new URL('./efeitos/', import.meta.url));

const textoDosTestesDeCarta = (): string =>
  readdirSync(pastaDeEfeitos)
    .filter((arquivo) => arquivo.endsWith('.test.ts'))
    .map((arquivo) => readFileSync(`${pastaDeEfeitos}${arquivo}`, 'utf8'))
    .join('\n');

describe('cobertura de cartas', () => {
  it('cita cada carta do catálogo em algum teste de comportamento', () => {
    const texto = textoDosTestesDeCarta();
    const semTeste = CATALOGO.todas
      .filter((carta) => carta.tipo !== 'personagem')
      .filter((carta) => !texto.includes(`'${carta.id}'`))
      .map((carta) => `${carta.id} ${carta.nome}`);

    expect(semTeste).toEqual([]);
  });

  it('cobre as 78 cartas jogáveis das duas classes', () => {
    const jogaveis = CATALOGO.todas.filter((carta) => carta.tipo !== 'personagem');
    expect(jogaveis).toHaveLength(78);
  });
});
