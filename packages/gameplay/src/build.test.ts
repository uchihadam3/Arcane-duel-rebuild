import { describe, expect, it } from 'vitest';

import type { CardId } from '@arcane-duel/shared-types';
import { cardId, matchId, playerId } from '@arcane-duel/shared-types';
import type { BuildEquipada, ErroDeDominio } from '@arcane-duel/rules-engine';
import { PERSONAGEM_DA_CLASSE } from '@arcane-duel/card-data';

import { montarPartida, validarBuild } from './partida.js';
import { PIROMANTE, QUEBRA_MURALHAS } from './receitas.js';

/*
 * A build é fronteira autoritativa.
 *
 * Ela vai chegar do cliente ou de um servidor, então a conferência é de
 * execução e não de compilação: o TypeScript não acompanha um objeto que
 * atravessou a rede. Uma build adulterada precisa ser recusada antes de virar
 * estado de partida.
 */

const carta = (codigo: string): CardId => cardId(codigo);

const tipos = (problemas: readonly ErroDeDominio[]): readonly string[] =>
  problemas.map((problema) => problema.tipo);

/** Uma build do Guerreiro com um slot trocado. */
const guerreiroCom = (mudanca: Partial<BuildEquipada>): BuildEquipada => ({
  ...QUEBRA_MURALHAS,
  ...mudanca,
});

describe('build válida', () => {
  it('a Receita 1 do Guerreiro passa', () => {
    expect(validarBuild(QUEBRA_MURALHAS)).toEqual([]);
  });

  it('a Receita 1 do Mago passa', () => {
    expect(validarBuild(PIROMANTE)).toEqual([]);
  });
});

describe('quantidade por slot', () => {
  it('7 habilidades falha', () => {
    const problemas = validarBuild(
      guerreiroCom({ habilidades: QUEBRA_MURALHAS.habilidades.slice(0, 7) }),
    );
    expect(tipos(problemas)).toContain('composicao-invalida');
    expect(problemas[0]).toMatchObject({ slot: 'habilidades', esperado: 8, recebido: 7 });
  });

  it('9 habilidades falha', () => {
    const problemas = validarBuild(
      guerreiroCom({ habilidades: [...QUEBRA_MURALHAS.habilidades, carta('W01')] }),
    );
    expect(problemas[0]).toMatchObject({ slot: 'habilidades', esperado: 8, recebido: 9 });
  });

  it('3 Passivas falha', () => {
    const problemas = validarBuild(
      guerreiroCom({ passivas: QUEBRA_MURALHAS.passivas.slice(0, 3) }),
    );
    expect(problemas[0]).toMatchObject({ slot: 'passivas', esperado: 4, recebido: 3 });
  });

  it('5 Passivas falha', () => {
    const problemas = validarBuild(
      guerreiroCom({ passivas: [...QUEBRA_MURALHAS.passivas, carta('WP02')] }),
    );
    expect(problemas[0]).toMatchObject({ slot: 'passivas', esperado: 4, recebido: 5 });
  });

  it('1 Carta de Classe falha', () => {
    const problemas = validarBuild(
      guerreiroCom({ cartasDeClasse: QUEBRA_MURALHAS.cartasDeClasse.slice(0, 1) }),
    );
    expect(problemas[0]).toMatchObject({ slot: 'cartas-de-classe', esperado: 2, recebido: 1 });
  });

  it('3 Cartas de Classe falha', () => {
    const problemas = validarBuild(
      guerreiroCom({ cartasDeClasse: [...QUEBRA_MURALHAS.cartasDeClasse, carta('WC01')] }),
    );
    expect(problemas[0]).toMatchObject({ slot: 'cartas-de-classe', esperado: 2, recebido: 3 });
  });
});

describe('tipo de carta em cada slot', () => {
  it('Ataque colocado em Passivas falha', () => {
    const problemas = validarBuild(
      guerreiroCom({ passivas: [carta('W01'), carta('WP08'), carta('WP07'), carta('WP01')] }),
    );
    expect(problemas).toContainEqual({
      tipo: 'tipo-invalido-no-slot',
      carta: carta('W01'),
      slot: 'passivas',
      recebido: 'ataque',
    });
  });

  it('Passiva colocada em habilidades falha', () => {
    const habilidades = [...QUEBRA_MURALHAS.habilidades];
    habilidades[0] = carta('WP03');
    const problemas = validarBuild(guerreiroCom({ habilidades }));
    expect(problemas).toContainEqual({
      tipo: 'tipo-invalido-no-slot',
      carta: carta('WP03'),
      slot: 'habilidades',
      recebido: 'passiva',
    });
  });

  it('Carta de Classe colocada em habilidades falha', () => {
    const habilidades = [...QUEBRA_MURALHAS.habilidades];
    habilidades[0] = carta('WC03');
    const problemas = validarBuild(guerreiroCom({ habilidades }));
    expect(problemas).toContainEqual({
      tipo: 'tipo-invalido-no-slot',
      carta: carta('WC03'),
      slot: 'habilidades',
      recebido: 'carta-de-classe',
    });
  });

  it('Ultimate colocada em habilidades falha', () => {
    const habilidades = [...QUEBRA_MURALHAS.habilidades];
    habilidades[0] = carta('WU03');
    const problemas = validarBuild(guerreiroCom({ habilidades }));
    expect(problemas).toContainEqual({
      tipo: 'tipo-invalido-no-slot',
      carta: carta('WU03'),
      slot: 'habilidades',
      recebido: 'ultimate',
    });
  });

  it('habilidade usada como Ultimate falha', () => {
    const problemas = validarBuild(guerreiroCom({ ultimate: carta('W01') }));
    expect(problemas).toContainEqual({
      tipo: 'tipo-invalido-no-slot',
      carta: carta('W01'),
      slot: 'ultimate',
      recebido: 'ataque',
    });
  });
});

describe('identidade das cartas', () => {
  it('carta repetida falha', () => {
    const habilidades = [...QUEBRA_MURALHAS.habilidades];
    habilidades[1] = habilidades[0]!;
    const problemas = validarBuild(guerreiroCom({ habilidades }));
    expect(problemas).toContainEqual({
      tipo: 'carta-repetida-na-build',
      carta: QUEBRA_MURALHAS.habilidades[0]!,
    });
  });

  it('carta repetida entre slots diferentes também falha', () => {
    const primeira = QUEBRA_MURALHAS.habilidades[0]!;
    const problemas = validarBuild(guerreiroCom({ ultimate: primeira }));
    expect(tipos(problemas)).toContain('carta-repetida-na-build');
  });

  it('carta de outra classe falha', () => {
    const habilidades = [...QUEBRA_MURALHAS.habilidades];
    habilidades[0] = carta('M01');
    const problemas = validarBuild(guerreiroCom({ habilidades }));
    expect(problemas).toContainEqual({
      tipo: 'carta-de-outra-classe',
      carta: carta('M01'),
      classe: 'guerreiro',
    });
  });

  it('carta que não existe no catálogo falha', () => {
    const habilidades = [...QUEBRA_MURALHAS.habilidades];
    habilidades[0] = carta('W99');
    const problemas = validarBuild(guerreiroCom({ habilidades }));
    expect(problemas).toContainEqual({ tipo: 'carta-desconhecida', carta: carta('W99') });
  });
});

describe('Personagem', () => {
  it('Personagem técnico errado falha', () => {
    const problemas = validarBuild(guerreiroCom({ personagem: PERSONAGEM_DA_CLASSE.mago }));
    expect(problemas).toContainEqual({
      tipo: 'personagem-invalido',
      esperado: PERSONAGEM_DA_CLASSE.guerreiro,
      recebido: PERSONAGEM_DA_CLASSE.mago,
      classe: 'guerreiro',
    });
  });

  it('Personagem técnico colocado em slot jogável falha', () => {
    const habilidades = [...QUEBRA_MURALHAS.habilidades];
    habilidades[0] = PERSONAGEM_DA_CLASSE.guerreiro;
    const problemas = validarBuild(guerreiroCom({ habilidades }));
    expect(problemas).toContainEqual({
      tipo: 'personagem-em-slot-jogavel',
      carta: PERSONAGEM_DA_CLASSE.guerreiro,
      slot: 'habilidades',
    });
  });

  it('Personagem técnico como Ultimate falha', () => {
    const problemas = validarBuild(guerreiroCom({ ultimate: PERSONAGEM_DA_CLASSE.guerreiro }));
    expect(problemas).toContainEqual({
      tipo: 'personagem-em-slot-jogavel',
      carta: PERSONAGEM_DA_CLASSE.guerreiro,
      slot: 'ultimate',
    });
  });
});

describe('montarPartida recusa antes de construir estado', () => {
  const montar = (build: BuildEquipada): ReturnType<typeof montarPartida> =>
    montarPartida({
      id: matchId('partida-de-teste'),
      semente: 'teste',
      jogadores: [
        { id: playerId('jogador-a'), build },
        { id: playerId('jogador-b'), build: PIROMANTE },
      ],
    });

  it('aceita duas builds válidas', () => {
    expect(montar(QUEBRA_MURALHAS).ok).toBe(true);
  });

  it('recusa a build com slot incompleto', () => {
    const resultado = montar(
      guerreiroCom({ habilidades: QUEBRA_MURALHAS.habilidades.slice(0, 7) }),
    );
    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? [] : tipos(resultado.erro)).toContain('composicao-invalida');
  });

  it('recusa a build com carta no slot errado', () => {
    const habilidades = [...QUEBRA_MURALHAS.habilidades];
    habilidades[0] = carta('WP03');
    const resultado = montar(guerreiroCom({ habilidades }));
    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? [] : tipos(resultado.erro)).toContain('tipo-invalido-no-slot');
  });

  it('recusa a build com Personagem de outra classe', () => {
    const resultado = montar(guerreiroCom({ personagem: PERSONAGEM_DA_CLASSE.mago }));
    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? [] : tipos(resultado.erro)).toContain('personagem-invalido');
  });
});
