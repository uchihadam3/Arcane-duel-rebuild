import type { EstadoDaPartida } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { reduzirPropriaGuarda, resolverAtaque } from './combate.js';
import { declararAcao, resolverAcao } from './comandos.js';
import {
  CARTA_A1,
  CARTA_A2,
  ID_A,
  ID_B,
  exigirSucesso,
  jogadorDe,
  partidaEmAndamento,
  perfil,
} from './teste-partida.js';

const semModificadores = { dano: 0, impacto: 0 };

const alvoCom = (guarda: number, vida = 30) => ({
  ...jogadorDe(partidaEmAndamento(), ID_B),
  guarda,
  vida,
});

const atacar = (
  partida: EstadoDaPartida,
  valores: { dano: number; impacto: number },
  carta = CARTA_A1,
): EstadoDaPartida => {
  const declarada = exigirSucesso(declararAcao(partida, ID_A, perfil(carta, valores))).partida;
  const indice = declarada.jogadores
    .find((jogador) => jogador.id === ID_A)
    ?.acoes.find((slot) => slot.perfil?.carta === carta)?.indice;
  return exigirSucesso(resolverAcao(declarada, ID_A, indice ?? 0)).partida;
};

describe('Impacto e Dano', () => {
  it('Impacto reduz apenas a Guarda', () => {
    const resultado = resolverAtaque(alvoCom(6), { dano: 0, impacto: 2 }, semModificadores);
    expect(resultado.alvo.guarda).toBe(4);
    expect(resultado.alvo.vida).toBe(30);
  });

  it('Dano reduz apenas a Vida', () => {
    const resultado = resolverAtaque(alvoCom(6), { dano: 3, impacto: 0 }, semModificadores);
    expect(resultado.alvo.vida).toBe(27);
    expect(resultado.alvo.guarda).toBe(6);
  });

  it('a Guarda nunca absorve Dano', () => {
    const resultado = resolverAtaque(alvoCom(6), { dano: 4, impacto: 0 }, semModificadores);
    expect(resultado.alvo.vida).toBe(26);
    expect(resultado.alvo.guarda).toBe(6);
  });

  it('a Guarda não fica negativa', () => {
    const resultado = resolverAtaque(alvoCom(2), { dano: 0, impacto: 5 }, semModificadores);
    expect(resultado.alvo.guarda).toBe(0);
  });
});

describe('Ruptura', () => {
  it('acontece quando um Ataque leva a Guarda de acima de zero para zero', () => {
    const resultado = resolverAtaque(alvoCom(3), { dano: 1, impacto: 3 }, semModificadores);
    expect(resultado.ruptura).toBe(true);
  });

  it('soma exatamente dois de Dano ao mesmo Ataque', () => {
    const resultado = resolverAtaque(alvoCom(3), { dano: 1, impacto: 3 }, semModificadores);
    expect(resultado.danoAdicionalDeRuptura).toBe(2);
    expect(resultado.dano).toBe(3);
    expect(resultado.alvo.vida).toBe(27);
  });

  it('não acontece quando a Guarda já estava em zero', () => {
    const resultado = resolverAtaque(alvoCom(0), { dano: 2, impacto: 3 }, semModificadores);
    expect(resultado.ruptura).toBe(false);
    expect(resultado.dano).toBe(2);
  });

  it('não acontece quando a Guarda sobra acima de zero', () => {
    const resultado = resolverAtaque(alvoCom(6), { dano: 2, impacto: 3 }, semModificadores);
    expect(resultado.ruptura).toBe(false);
    expect(resultado.alvo.guarda).toBe(3);
  });

  it('acontece com Impacto maior que a Guarda restante', () => {
    const resultado = resolverAtaque(alvoCom(2), { dano: 0, impacto: 9 }, semModificadores);
    expect(resultado.ruptura).toBe(true);
    expect(resultado.alvo.vida).toBe(28);
  });

  it('conta com o Impacto já modificado', () => {
    const resultado = resolverAtaque(alvoCom(4), { dano: 0, impacto: 2 }, { dano: 0, impacto: 2 });
    expect(resultado.ruptura).toBe(true);
    expect(resultado.dano).toBe(2);
  });

  it('reduzir a própria Guarda nunca causa Ruptura', () => {
    const reduzido = reduzirPropriaGuarda(alvoCom(6), 6);
    expect(reduzido.guarda).toBe(0);
    expect(reduzido.vida).toBe(30);
    // A redução voluntária é só uma mudança de valor: não existe resolução de
    // Ataque, então não existe Ruptura para detectar.
  });

  it('a Guarda já reduzida voluntariamente ainda sofre Ruptura de um Ataque inimigo', () => {
    const apos = reduzirPropriaGuarda(alvoCom(6), 4);
    expect(apos.guarda).toBe(2);
    const resultado = resolverAtaque(apos, { dano: 1, impacto: 2 }, semModificadores);
    expect(resultado.ruptura).toBe(true);
    expect(resultado.dano).toBe(3);
  });

  it('o Dano nunca fica negativo por modificador', () => {
    const resultado = resolverAtaque(alvoCom(6), { dano: 1, impacto: 0 }, { dano: -5, impacto: 0 });
    expect(resultado.dano).toBe(0);
    expect(resultado.alvo.vida).toBe(30);
  });
});

describe('Ruptura dentro do ciclo completo', () => {
  it('a Ação que rompe a Guarda causa o Dano adicional na mesma resolução', () => {
    const partida = atacar(partidaEmAndamento(), { dano: 1, impacto: 6 });
    const alvo = jogadorDe(partida, ID_B);
    expect(alvo.guarda).toBe(0);
    expect(alvo.vida).toBe(27);
  });

  it('um segundo Ataque contra Guarda já zerada não repete o bônus', () => {
    let partida = atacar(partidaEmAndamento(), { dano: 1, impacto: 6 }, CARTA_A1);
    expect(jogadorDe(partida, ID_B).vida).toBe(27);
    partida = atacar(partida, { dano: 1, impacto: 6 }, CARTA_A2);
    expect(jogadorDe(partida, ID_B).vida).toBe(26);
  });

  it('encerra a partida quando a Vida de um jogador chega a zero', () => {
    const partida = atacar(partidaEmAndamento(), { dano: 30, impacto: 0 });
    expect(partida.situacao).toBe('encerrada');
    expect(partida.desfecho).toEqual({ vencedor: ID_A, motivo: 'vida-zerada' });
  });

  it('deixa o vencedor indefinido quando os dois chegam a zero', () => {
    const base = partidaEmAndamento();
    const ambosNoLimite: EstadoDaPartida = {
      ...base,
      jogadores: [
        { ...base.jogadores[0], vida: 0 },
        { ...base.jogadores[1], vida: 1 },
      ],
    };
    const partida = atacar(ambosNoLimite, { dano: 1, impacto: 0 });
    expect(partida.situacao).toBe('encerrada');
    expect(partida.desfecho).toEqual({ vencedor: null, motivo: 'indefinido' });
  });
});
