import { describe, expect, it } from 'vitest';

import { CLASSES_DA_MATRIZ, paresDaMatriz, rodarMatriz } from './matriz.js';
import { conferirInvariantes } from './invariantes.js';
import { RECEITAS_INICIAIS } from '../receitas.js';
import { A, com, duelo, build, jogador } from '../teste-apoio.js';

/*
 * A matriz de doze por doze e as invariantes que ela confere.
 *
 * O lote grande vive no comando `npm run simulate:matrix`; aqui fica a versão
 * de fumaça, que roda uma partida por configuração e serve de guarda em CI.
 */

describe('matriz de doze por doze', () => {
  it('cobre as doze classes com Receita 1', () => {
    expect(CLASSES_DA_MATRIZ).toHaveLength(12);
    for (const classe of CLASSES_DA_MATRIZ) {
      expect(RECEITAS_INICIAIS[classe].classe).toBe(classe);
    }
  });

  it('tem 78 pares não ordenados, os doze espelhos incluídos', () => {
    const pares = paresDaMatriz([...CLASSES_DA_MATRIZ]);
    expect(pares).toHaveLength(78);
    expect(pares.filter((par) => par.a === par.b)).toHaveLength(12);
  });

  it('roda 156 configurações sem comando ilegal e sem invariante quebrada', () => {
    const resumo = rodarMatriz({ semente: 'smoke', partidasPorConfiguracao: 1 });

    expect(resumo.configuracoes).toBe(156);
    expect(resumo.partidas).toBe(156);
    expect(resumo.comandosIlegais).toBe(0);
    expect(resumo.exemplosDeComandoIlegal).toEqual([]);
    expect(resumo.invariantesQuebradas).toEqual([]);
    expect(resumo.bloqueiosDeRegra).toBe(0);
  });

  it('é reproduzível a partir da semente', () => {
    const uma = rodarMatriz({ semente: 'reprodutivel', partidasPorConfiguracao: 1 });
    const outra = rodarMatriz({ semente: 'reprodutivel', partidasPorConfiguracao: 1 });
    expect(outra.vitoriasPorClasse).toEqual(uma.vitoriasPorClasse);
    expect(outra.pares).toEqual(uma.pares);
  });

  it('conta cada partida do espelho uma vez só para a classe', () => {
    const resumo = rodarMatriz({ semente: 'contagem', partidasPorConfiguracao: 1 });
    for (const classe of CLASSES_DA_MATRIZ) {
      // 11 pares com as outras classes + 1 espelho, em 2 posições iniciais.
      expect(resumo.partidasPorClasse[classe]).toBe(24);
    }
  });
});

describe('invariantes do estado', () => {
  it('não acusa nada num estado recém-montado', () => {
    const partida = duelo(build('guerreiro'), build('bruxo'), A);
    expect(conferirInvariantes(partida)).toEqual([]);
  });

  it('acusa Vida fora da faixa', () => {
    const partida = com(duelo(build('guerreiro'), build('mago'), A), A, { vida: 31 });
    expect(conferirInvariantes(partida).join(' ')).toContain('Vida fora da faixa');
  });

  it('acusa Reserva acima do máximo', () => {
    const partida = com(duelo(build('guerreiro'), build('mago'), A), A, { reserva: 3 });
    expect(conferirInvariantes(partida).join(' ')).toContain('Reserva fora da faixa');
  });

  it('acusa a quebra da conservação das quatro Almas', () => {
    const partida = duelo(build('necromante'), build('mago'), A);
    const dono = jogador(partida, A);
    const quebrada =
      dono.recurso.classe === 'necromante'
        ? com(partida, A, {
            recurso: { ...dono.recurso, almasControladas: 1, almasNoCemiterio: 1 },
          })
        : partida;
    expect(conferirInvariantes(quebrada).join(' ')).toContain('conservação quebrou');
  });

  it('acusa uma Passiva que tenha ido parar entre as cartas removidas', () => {
    const partida = duelo(build('guerreiro'), build('mago'), A);
    const dono = jogador(partida, A);
    const primeira = dono.passivas[0]?.carta;
    const quebrada = primeira === undefined ? partida : com(partida, A, { removidas: [primeira] });
    expect(conferirInvariantes(quebrada).join(' ')).toContain('Passiva não Exaure');
  });
});
