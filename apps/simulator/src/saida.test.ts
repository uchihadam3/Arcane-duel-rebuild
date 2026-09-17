import { describe, expect, it } from 'vitest';

import type { ResumoDoLote } from '@arcane-duel/gameplay';
import { playerId } from '@arcane-duel/shared-types';

import { codigoDeSaida, renderizar } from './saida.js';

/*
 * O formato muda o texto, nunca o veredito.
 *
 * Um lote com comando ilegal é inválido em texto e em JSON, e o processo
 * precisa terminar com erro nos dois — senão um pipeline de CI leria código 0 e
 * publicaria números que não valem.
 */

const lado = (): ResumoDoLote['comA'] => ({
  partidas: 1,
  vitoriasDeQuemComecou: 0,
  vitoriasDeQuemRespondeu: 0,
  indefinidas: 0,
  interrompidasPorLimiteTecnico: 0,
  bloqueiosDeRegra: 0,
  partidasComComandoIlegal: 0,
});

const resumo = (comandosIlegais: number): ResumoDoLote => ({
  semente: 'teste',
  partidas: 2,
  limiteTecnicoDeTurnos: 60,
  exploracao: 0,
  linhasDistintas: 2,
  comA: lado(),
  comB: lado(),
  turnoMedio: 8,
  acoesPorPartida: 20,
  rupturasPorPartida: 3,
  respostasComCartaPorPartida: 3,
  respostasComDefesaInataPorPartida: 6,
  ultimatesPorPartida: 2,
  passivasReveladasPorPartida: 7,
  passivasAtivadasPorPartida: 0,
  cartasDeClassePorAtivarPorPartida: 0,
  cartasDeClassePorExaurirPorPartida: 0,
  vidaMediaDoVencedor: 1.5,
  usoPorCarta: { W02: 4 },
  vitoriasDoGuerreiro: 1,
  vitoriasDoMago: 1,
  bloqueiosDeLentoComImpulso: 0,
  comandosIlegais,
  exemplosDeComandoIlegal:
    comandosIlegais === 0
      ? []
      : [
          {
            comando: 'declarar',
            jogador: playerId('jogador-a'),
            turno: 1,
            erro: { tipo: 'carta-desconhecida', carta: 'X99' as never },
          },
        ],
});

describe('código de saída', () => {
  it('é zero quando o lote vale como medição', () => {
    expect(codigoDeSaida(resumo(0))).toBe(0);
  });

  it('é diferente de zero quando houve comando ilegal', () => {
    expect(codigoDeSaida(resumo(1))).not.toBe(0);
  });

  it('não depende do formato: texto e JSON usam o mesmo veredito', () => {
    const invalido = resumo(3);
    expect(codigoDeSaida(invalido)).toBe(codigoDeSaida(invalido));
    expect(renderizar(invalido, 'texto', 10)).toContain('comandos ilegais');
    expect(renderizar(invalido, 'json', 10)).toContain('"comandosIlegais": 3');
  });
});

describe('o JSON sai mesmo quando o lote é inválido', () => {
  it('imprime o diagnóstico em vez de engolir', () => {
    const texto = renderizar(resumo(2), 'json', 42);
    const lido: unknown = JSON.parse(texto);
    expect(lido).toMatchObject({ comandosIlegais: 2, duracaoEmMs: 42 });
    expect(texto).toContain('exemplosDeComandoIlegal');
  });

  it('o texto avisa que a linha de base não vale', () => {
    expect(renderizar(resumo(1), 'texto', 10)).toContain('NÃO é válida');
  });

  it('o lote válido não traz o aviso', () => {
    expect(renderizar(resumo(0), 'texto', 10)).not.toContain('NÃO é válida');
  });
});
