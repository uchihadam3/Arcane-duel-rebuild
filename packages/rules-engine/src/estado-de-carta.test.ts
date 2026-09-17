import { describe, expect, it } from 'vitest';

import {
  ativarCartaDeClasse,
  ativarPassiva,
  consumirUltimate,
  exaurirCartaDeClasse,
  prontificarCartaDeClasse,
  prontificarPassiva,
  revelarPassiva,
} from './estado-de-carta.js';

describe('Carta de Classe: Ativar', () => {
  it('ativa uma carta Pronta', () => {
    expect(ativarCartaDeClasse('pronta')).toEqual({ ok: true, valor: 'ativada' });
  });

  it('não ativa uma carta já Ativada', () => {
    expect(ativarCartaDeClasse('ativada')).toEqual({ ok: false, erro: 'carta-nao-esta-pronta' });
  });

  it('não ativa uma carta Exaurida', () => {
    expect(ativarCartaDeClasse('exaurida')).toEqual({ ok: false, erro: 'carta-ja-exaurida' });
  });

  it('volta a ficar Pronta no momento normal', () => {
    expect(prontificarCartaDeClasse('ativada')).toBe('pronta');
  });
});

describe('Carta de Classe: Exaurir', () => {
  it('exaure uma carta Pronta', () => {
    expect(exaurirCartaDeClasse('pronta')).toEqual({ ok: true, valor: 'exaurida' });
  });

  it('não exaure uma carta Ativada antes de ela voltar a ficar Pronta', () => {
    expect(exaurirCartaDeClasse('ativada')).toEqual({ ok: false, erro: 'carta-nao-esta-pronta' });
  });

  it('não exaure duas vezes', () => {
    expect(exaurirCartaDeClasse('exaurida')).toEqual({ ok: false, erro: 'carta-ja-exaurida' });
  });

  it('nenhum efeito do jogo-base recupera uma carta Exaurida', () => {
    expect(prontificarCartaDeClasse('exaurida')).toBe('exaurida');
  });
});

describe('Passiva', () => {
  it('começa oculta e é revelada quando a condição acontece', () => {
    expect(revelarPassiva('oculta')).toEqual({ ok: true, valor: 'pronta' });
  });

  it('não é revelada duas vezes', () => {
    expect(revelarPassiva('pronta')).toEqual({ ok: false, erro: 'passiva-ja-revelada' });
  });

  it('só pode ser Ativada depois de revelada', () => {
    expect(ativarPassiva('oculta')).toEqual({ ok: false, erro: 'passiva-ainda-oculta' });
    expect(ativarPassiva('pronta')).toEqual({ ok: true, valor: 'ativada' });
  });

  it('não é Ativada duas vezes no mesmo ciclo', () => {
    expect(ativarPassiva('ativada')).toEqual({ ok: false, erro: 'passiva-nao-esta-pronta' });
  });

  it('volta a ficar Pronta no momento indicado', () => {
    expect(prontificarPassiva('ativada')).toBe('pronta');
    expect(prontificarPassiva('oculta')).toBe('oculta');
  });

  it('nunca é Exaurida: o estado não existe para Passivas', () => {
    // O tipo EstadoDePassiva não possui 'exaurida'; esta verificação garante
    // que nenhuma transição de Passiva produza esse estado em tempo de execução.
    const estadosProduzidos = [
      revelarPassiva('oculta'),
      ativarPassiva('pronta'),
      { ok: true as const, valor: prontificarPassiva('ativada') },
    ].map((transicao) => (transicao.ok ? transicao.valor : null));
    expect(estadosProduzidos).not.toContain('exaurida');
    expect(estadosProduzidos).toEqual(['pronta', 'ativada', 'pronta']);
  });
});

describe('Ultimate', () => {
  it('é usada uma única vez por partida', () => {
    expect(consumirUltimate('disponivel')).toEqual({ ok: true, valor: 'consumida' });
    expect(consumirUltimate('consumida')).toEqual({ ok: false, erro: 'ultimate-ja-consumida' });
  });
});
