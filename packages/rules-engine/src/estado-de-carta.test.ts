import { describe, expect, it } from 'vitest';

import {
  transicaoAtivarCartaDeClasse,
  transicaoAtivarPassiva,
  transicaoConsumirUltimate,
  transicaoExaurirCartaDeClasse,
  prontificarCartaDeClasse,
  prontificarPassiva,
  transicaoRevelarPassiva,
} from './estado-de-carta.js';

describe('Carta de Classe: Ativar', () => {
  it('ativa uma carta Pronta', () => {
    expect(transicaoAtivarCartaDeClasse('pronta')).toEqual({ ok: true, valor: 'ativada' });
  });

  it('não ativa uma carta já Ativada', () => {
    expect(transicaoAtivarCartaDeClasse('ativada')).toEqual({
      ok: false,
      erro: 'carta-nao-esta-pronta',
    });
  });

  it('não ativa uma carta Exaurida', () => {
    expect(transicaoAtivarCartaDeClasse('exaurida')).toEqual({
      ok: false,
      erro: 'carta-ja-exaurida',
    });
  });

  it('volta a ficar Pronta no momento normal', () => {
    expect(prontificarCartaDeClasse('ativada')).toBe('pronta');
  });
});

describe('Carta de Classe: Exaurir', () => {
  it('exaure uma carta Pronta', () => {
    expect(transicaoExaurirCartaDeClasse('pronta')).toEqual({ ok: true, valor: 'exaurida' });
  });

  it('não exaure uma carta Ativada antes de ela voltar a ficar Pronta', () => {
    expect(transicaoExaurirCartaDeClasse('ativada')).toEqual({
      ok: false,
      erro: 'carta-nao-esta-pronta',
    });
  });

  it('não exaure duas vezes', () => {
    expect(transicaoExaurirCartaDeClasse('exaurida')).toEqual({
      ok: false,
      erro: 'carta-ja-exaurida',
    });
  });

  it('nenhum efeito do jogo-base recupera uma carta Exaurida', () => {
    expect(prontificarCartaDeClasse('exaurida')).toBe('exaurida');
  });
});

describe('Passiva', () => {
  it('começa oculta e é revelada quando a condição acontece', () => {
    expect(transicaoRevelarPassiva('oculta')).toEqual({ ok: true, valor: 'pronta' });
  });

  it('não é revelada duas vezes', () => {
    expect(transicaoRevelarPassiva('pronta')).toEqual({ ok: false, erro: 'passiva-ja-revelada' });
  });

  it('só pode ser Ativada depois de revelada', () => {
    expect(transicaoAtivarPassiva('oculta')).toEqual({ ok: false, erro: 'passiva-ainda-oculta' });
    expect(transicaoAtivarPassiva('pronta')).toEqual({ ok: true, valor: 'ativada' });
  });

  it('não é Ativada duas vezes no mesmo ciclo', () => {
    expect(transicaoAtivarPassiva('ativada')).toEqual({
      ok: false,
      erro: 'passiva-nao-esta-pronta',
    });
  });

  it('volta a ficar Pronta no momento indicado', () => {
    expect(prontificarPassiva('ativada')).toBe('pronta');
    expect(prontificarPassiva('oculta')).toBe('oculta');
  });

  it('nunca é Exaurida: o estado não existe para Passivas', () => {
    // O tipo EstadoDePassiva não possui 'exaurida'; esta verificação garante
    // que nenhuma transição de Passiva produza esse estado em tempo de execução.
    const estadosProduzidos = [
      transicaoRevelarPassiva('oculta'),
      transicaoAtivarPassiva('pronta'),
      { ok: true as const, valor: prontificarPassiva('ativada') },
    ].map((transicao) => (transicao.ok ? transicao.valor : null));
    expect(estadosProduzidos).not.toContain('exaurida');
    expect(estadosProduzidos).toEqual(['pronta', 'ativada', 'pronta']);
  });
});

describe('Ultimate', () => {
  it('é usada uma única vez por partida', () => {
    expect(transicaoConsumirUltimate('disponivel')).toEqual({ ok: true, valor: 'consumida' });
    expect(transicaoConsumirUltimate('consumida')).toEqual({
      ok: false,
      erro: 'ultimate-ja-consumida',
    });
  });
});
