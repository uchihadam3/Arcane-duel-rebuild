import { describe, expect, it } from 'vitest';

import {
  type DiferencaDeCena,
  duracaoDaApresentacao,
  movimentosDaDiferenca,
} from './apresentacao.js';

/*
 * O diretor de apresentação, conferido.
 *
 * A regra desta tarefa é que o jogador precisa **ver** origem → movimento →
 * destino, e que o React não pode desmontar a origem e montar o destino antes
 * de a animação existir. O que se confere aqui é que toda mudança de lugar
 * vira um movimento, e que ele sai com a origem e o destino certos.
 */

const cena = (
  pecas: readonly [string, string][],
  mao: readonly string[],
  maoDaMaquina = 5,
): DiferencaDeCena['antes'] => ({
  pecas: pecas.map(([chave, lugar]) => ({ chave, lugar })),
  mao: [...mao],
  maoDaMaquina,
});

describe('sair da mão para o campo vira um voo', () => {
  it('a carta que some da mão e aparece na Ação produz um voo da mão para o campo', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([], ['c:W08', 'c:W15']),
      depois: cena([['c:W08', 'acao']], ['c:W15']),
    });
    expect(movimentos).toHaveLength(1);
    expect(movimentos[0]?.especie).toBe('mao-para-campo');
    expect(movimentos[0]?.de.tipo).toBe('mao');
    expect(movimentos[0]?.para.tipo).toBe('campo');
  });

  /*
   * A carta da máquina não sai da mão do humano — ela não estava lá.
   *
   * O diretor reconhece isso pela ausência: apareceu no campo sem ter estado
   * na mão do observador, logo veio da mão de cima. E vira ao chegar, porque
   * foi a regra que a tornou pública.
   */
  it('a carta da máquina vira no caminho, e vem da mão de cima', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([], ['c:W08']),
      depois: cena([['c:M02', 'acao']], ['c:W08']),
    });
    expect(movimentos).toHaveLength(1);
    expect(movimentos[0]?.especie).toBe('maquina-para-campo');
    expect(movimentos[0]?.de.tipo).toBe('mao-da-maquina');
    expect(movimentos[0]?.vira).toBe(true);
  });

  it('a Ultimate sai do slot dela e é apresentada', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([], ['c:MU01']),
      depois: cena([['c:MU01', 'ultimate']], []),
    });
    expect(movimentos[0]?.especie).toBe('ultimate-apresentada');
  });
});

describe('a carta que resolve vai fisicamente para o cooldown', () => {
  it('sair da Ação e aparecer no cooldown produz um movimento, e não um salto', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([['c:W08', 'acao']], []),
      depois: cena([['c:W08', 'cooldown:3']], []),
    });
    expect(movimentos).toHaveLength(1);
    expect(movimentos[0]?.especie).toBe('campo-para-cooldown');
    expect(movimentos[0]?.de.tipo).toBe('campo');
    expect(movimentos[0]?.para.tipo).toBe('campo');
  });

  it('voltar do cooldown para a mão produz um movimento de volta', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([['c:W08', 'cooldown:1']], []),
      depois: cena([], ['c:W08']),
    });
    expect(movimentos).toHaveLength(1);
    expect(movimentos[0]?.especie).toBe('cooldown-para-mao');
    expect(movimentos[0]?.para.tipo).toBe('mao');
  });

  /*
   * O avanço do cooldown é o teste mais importante desta parte.
   *
   * Ele precisa comunicar sozinho, sem texto, que o cooldown andou: a de CD1
   * sai para a mão e as outras duas deslizam uma casa. Três movimentos, não um
   * estado novo desenhado.
   */
  it('o início de turno produz a volta para a mão e os dois deslizes', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena(
        [
          ['c:A', 'cooldown:1'],
          ['c:B', 'cooldown:2'],
          ['c:C', 'cooldown:3'],
        ],
        [],
      ),
      depois: cena(
        [
          ['c:B', 'cooldown:1'],
          ['c:C', 'cooldown:2'],
        ],
        ['c:A'],
      ),
    });
    expect(movimentos.map((m) => m.especie).sort()).toEqual([
      'cooldown-avanca',
      'cooldown-avanca',
      'cooldown-para-mao',
    ]);
    // E a volta para a mão vem por último: primeiro as casas andam.
    expect(movimentos.at(-1)?.especie).toBe('cooldown-para-mao');
  });
});

describe('uma Passiva que revela gira no lugar, e não voa', () => {
  /*
   * A carta já estava no encaixe, virada. Quando a regra a torna pública, a
   * chave muda de `v:…passiva:N` para `c:…`. Para quem só compara chaves, isso
   * parece uma carta nova no campo — e sem a exceção o diretor emitia um voo
   * vindo da mão da máquina, que é uma mentira sobre o que aconteceu.
   */
  it('a troca de verso por frente no mesmo encaixe vira uma revelação', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([['v:maquina:passiva:1', 'passiva']], []),
      depois: cena([['c:MP02', 'passiva']], []),
    });
    expect(movimentos).toHaveLength(1);
    expect(movimentos[0]?.especie).toBe('passiva-revela');
    expect(movimentos[0]?.vira).toBe(true);
    // Origem e destino são o mesmo encaixe: ela não atravessa nada.
    expect(movimentos[0]?.de.chave).toBe('v:maquina:passiva:1');
    expect(movimentos[0]?.para.chave).toBe('c:MP02');
  });

  it('e não é confundida com a carta que a máquina joga da mão', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([['v:maquina:passiva:0', 'passiva']], []),
      depois: cena(
        [
          ['c:MP02', 'passiva'],
          ['c:M02', 'acao'],
        ],
        [],
      ),
    });
    const especies = movimentos.map((m) => m.especie).sort();
    expect(especies).toEqual(['maquina-para-campo', 'passiva-revela']);
  });

  it('cada verso só é consumido por uma revelação', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena(
        [
          ['v:maquina:passiva:0', 'passiva'],
          ['v:maquina:passiva:1', 'passiva'],
        ],
        [],
      ),
      depois: cena(
        [
          ['c:MP01', 'passiva'],
          ['c:MP02', 'passiva'],
        ],
        [],
      ),
    });
    const origens = movimentos.map((m) => m.de.chave);
    expect(new Set(origens).size).toBe(origens.length);
    expect(movimentos.every((m) => m.especie === 'passiva-revela')).toBe(true);
  });
});

describe('Exaurir tira a carta do campo de verdade', () => {
  it('a Carta de Classe que some produz um movimento de saída', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([['c:CL1', 'classe']], []),
      depois: cena([], []),
    });
    expect(movimentos).toHaveLength(1);
    expect(movimentos[0]?.especie).toBe('classe-exaure');
    expect(movimentos[0]?.para.tipo).toBe('fora');
  });

  it('uma peça que apenas continua onde estava não produz movimento nenhum', () => {
    const igual = cena(
      [
        ['c:W08', 'acao'],
        ['c:P1', 'passiva'],
      ],
      ['c:W15'],
    );
    expect(movimentosDaDiferenca({ antes: igual, depois: igual })).toEqual([]);
  });
});

describe('os movimentos se encadeiam em vez de se atropelarem', () => {
  it('o que sai da mão vem antes do que vai para o cooldown', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([['c:W15', 'acao']], ['c:W08']),
      depois: cena(
        [
          ['c:W08', 'acao'],
          ['c:W15', 'cooldown:3'],
        ],
        [],
      ),
    });
    const especies = movimentos.map((m) => m.especie);
    expect(especies.indexOf('mao-para-campo')).toBeLessThan(
      especies.indexOf('campo-para-cooldown'),
    );
  });

  it('cada movimento começa depois do anterior, mas antes de ele acabar', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([['c:W15', 'acao']], ['c:W08']),
      depois: cena(
        [
          ['c:W08', 'acao'],
          ['c:W15', 'cooldown:3'],
        ],
        [],
      ),
    });
    expect(movimentos[0]?.atrasoMs).toBe(0);
    expect(movimentos[1]?.atrasoMs).toBeGreaterThan(0);
    expect(movimentos[1]?.atrasoMs).toBeLessThan(780);
  });

  it('a apresentação inteira dura o último atraso mais um voo', () => {
    const movimentos = movimentosDaDiferenca({
      antes: cena([['c:W15', 'acao']], ['c:W08']),
      depois: cena(
        [
          ['c:W08', 'acao'],
          ['c:W15', 'cooldown:3'],
        ],
        [],
      ),
    });
    expect(duracaoDaApresentacao(movimentos, 780)).toBe((movimentos.at(-1)?.atrasoMs ?? 0) + 780);
    expect(duracaoDaApresentacao([], 780)).toBe(0);
  });
});
