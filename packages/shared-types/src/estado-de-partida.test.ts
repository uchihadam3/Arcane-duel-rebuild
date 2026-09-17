import { describe, expect, it } from 'vitest';

import type {
  CartaDeClasseEquipada,
  PassivaEquipada,
  RecursoDeClasse,
  RespostaVoluntaria,
  SlotDeResposta,
  UltimateEquipada,
} from './index.js';
import type { PerfilDeHabilidade } from './index.js';
import { ZONAS_DE_COOLDOWN, cardId } from './index.js';

/** Uma carta de Reação impressa, usada nas verificações de tipo abaixo. */
const reacaoImpressa: PerfilDeHabilidade = {
  carta: cardId('W15'),
  tipo: 'reacao',
  tags: [],
  custo: { moeda: 'reserva', valor: 1 },
  cooldown: 2,
  valores: null,
};

/*
 * Estes testes provam garantias de tipo. `@ts-expect-error` falha a
 * verificação de tipos se o código marcado passar a compilar — ou seja, se a
 * garantia for perdida. Os arquivos de teste entram no `npm run typecheck`.
 */

describe('Passiva nunca é Exaurida', () => {
  it('aceita oculta, pronta e ativada', () => {
    const estados: PassivaEquipada[] = [
      { carta: cardId('p1'), estado: 'oculta' },
      { carta: cardId('p1'), estado: 'pronta' },
      { carta: cardId('p1'), estado: 'ativada' },
    ];
    expect(estados).toHaveLength(3);
  });

  it('não aceita o estado exaurida', () => {
    const invalida: PassivaEquipada = {
      carta: cardId('p1'),
      // @ts-expect-error Passivas nunca são Exauridas.
      estado: 'exaurida',
    };
    expect(invalida.estado).toBe('exaurida');
  });
});

describe('Carta de Classe distingue Ativar de Exaurir', () => {
  it('aceita pronta, ativada e exaurida', () => {
    const estados: CartaDeClasseEquipada[] = [
      { carta: cardId('c1'), estado: 'pronta' },
      { carta: cardId('c1'), estado: 'ativada' },
      { carta: cardId('c1'), estado: 'exaurida' },
    ];
    expect(estados.map((item) => item.estado)).toEqual(['pronta', 'ativada', 'exaurida']);
  });

  it('não aceita um estado inventado', () => {
    const invalida: CartaDeClasseEquipada = {
      carta: cardId('c1'),
      // @ts-expect-error 'girada' não existe: o termo do jogo é Ativada.
      estado: 'girada',
    };
    expect(invalida.estado).toBe('girada');
  });
});

describe('Ultimate distingue disponível de consumida', () => {
  it('aceita os dois estados e nenhum outro', () => {
    const disponivel: UltimateEquipada = { carta: cardId('u1'), estado: 'disponivel' };
    const consumida: UltimateEquipada = { carta: cardId('u1'), estado: 'consumida' };
    expect([disponivel.estado, consumida.estado]).toEqual(['disponivel', 'consumida']);

    const invalida: UltimateEquipada = {
      carta: cardId('u1'),
      // @ts-expect-error a Ultimate não é Exaurida: ela é consumida.
      estado: 'exaurida',
    };
    expect(invalida.estado).toBe('exaurida');
  });
});

describe('espaço de Resposta', () => {
  it('representa nenhuma Resposta, a Defesa Inata ou uma carta de Reação', () => {
    const vazio: SlotDeResposta = { voluntaria: null, escolhas: {} };
    const inata: SlotDeResposta = { voluntaria: { tipo: 'defesa-inata' }, escolhas: {} };
    const reacao: SlotDeResposta = {
      voluntaria: { tipo: 'carta-de-reacao', perfil: reacaoImpressa },
      escolhas: {},
    };
    expect(vazio.voluntaria).toBeNull();
    expect(inata.voluntaria?.tipo).toBe('defesa-inata');
    expect(reacao.voluntaria?.tipo).toBe('carta-de-reacao');
  });

  it('não guarda duas Respostas voluntárias ao mesmo tempo', () => {
    const slot: SlotDeResposta = { voluntaria: { tipo: 'defesa-inata' }, escolhas: {} };
    // O campo é único: substituir é a única forma de registrar outra Resposta.
    const substituida: SlotDeResposta = {
      ...slot,
      voluntaria: { tipo: 'carta-de-reacao', perfil: reacaoImpressa },
    };
    expect(Object.keys(substituida).sort()).toEqual(['escolhas', 'voluntaria']);
    expect(substituida.voluntaria?.tipo).toBe('carta-de-reacao');
  });

  it('a Defesa Inata não carrega perfil, porque não é uma carta', () => {
    const inata: RespostaVoluntaria = { tipo: 'defesa-inata' };
    // @ts-expect-error a variante de Defesa Inata não tem o campo `perfil`.
    expect(inata.perfil).toBeUndefined();
  });

  it('a carta de Reação carrega o custo e o cooldown impressos nela', () => {
    const reacao: RespostaVoluntaria = { tipo: 'carta-de-reacao', perfil: reacaoImpressa };
    if (reacao.tipo === 'carta-de-reacao') {
      expect(reacao.perfil.custo).toEqual({ moeda: 'reserva', valor: 1 });
      expect(reacao.perfil.cooldown).toBe(2);
    }
  });

  it('não aceita uma carta de Reação sem o perfil impresso', () => {
    const invalida: RespostaVoluntaria = {
      tipo: 'carta-de-reacao',
      // @ts-expect-error a Resposta por carta precisa do perfil, não só do id.
      carta: cardId('W15'),
    };
    expect(invalida.tipo).toBe('carta-de-reacao');
  });
});

describe('componentes de classe', () => {
  it('não permite misturar recursos de classes diferentes', () => {
    const guerreiro: RecursoDeClasse = { classe: 'guerreiro', momentum: 2 };
    expect(guerreiro.momentum).toBe(2);

    const misturado: RecursoDeClasse = {
      classe: 'guerreiro',
      momentum: 2,
      // @ts-expect-error o Guerreiro não tem Mana.
      mana: 4,
    };
    expect(misturado.classe).toBe('guerreiro');
  });

  it('não permite trocar o componente de uma classe pelo de outra', () => {
    // @ts-expect-error o Mago não tem Momentum.
    const invalido: RecursoDeClasse = { classe: 'mago', momentum: 3 };
    expect(invalido.classe).toBe('mago');
  });

  it('estreita o tipo pelo discriminante', () => {
    const recurso: RecursoDeClasse = {
      classe: 'monge',
      chi: ['pronta', 'gasta', 'pronta'],
      sequenciaDeKata: ['abertura'],
    };
    if (recurso.classe === 'monge') {
      expect(recurso.chi).toHaveLength(3);
      expect(recurso.sequenciaDeKata).toEqual(['abertura']);
    }
  });
});

describe('zonas de cooldown', () => {
  it('são exatamente três: CD1, CD2 e CD3', () => {
    expect(ZONAS_DE_COOLDOWN).toEqual([1, 2, 3]);
  });
});
