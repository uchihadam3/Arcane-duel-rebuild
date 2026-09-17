import type { EstadoDaPartida } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import {
  ativarCartaDeClasse,
  ativarPassiva,
  consumirUltimate,
  exaurirCartaDeClasse,
  revelarPassiva,
} from './comandos-de-carta.js';
import { declararAcao } from './comandos.js';
import { encerrarTurno, iniciarTurno } from './turno.js';
import { validarPartida } from './validacao.js';
import {
  CARTA_A1,
  ID_A,
  ID_B,
  exigirSucesso,
  jogadorDe,
  partidaEmAndamento,
  perfil,
} from './teste-partida.js';

const PASSIVA = cardId('jogador-a-pas-1');
const CLASSE_1 = cardId('jogador-a-cls-1');
const CLASSE_2 = cardId('jogador-a-cls-2');
const ULTIMATE = cardId('jogador-a-ult');

const passivaDe = (partida: EstadoDaPartida) =>
  jogadorDe(partida, ID_A).passivas.find((atual) => atual.carta === PASSIVA);

const classeDe = (partida: EstadoDaPartida, carta = CLASSE_1) =>
  jogadorDe(partida, ID_A).cartasDeClasse.find((atual) => atual.carta === carta);

describe('Passivas', () => {
  it('começam ocultas e podem ser reveladas', () => {
    const partida = partidaEmAndamento();
    expect(passivaDe(partida)?.estado).toBe('oculta');
    const revelada = exigirSucesso(revelarPassiva(partida, ID_A, PASSIVA)).partida;
    expect(passivaDe(revelada)?.estado).toBe('pronta');
  });

  it('permanecem reveladas: revelar de novo é recusado', () => {
    const revelada = exigirSucesso(revelarPassiva(partidaEmAndamento(), ID_A, PASSIVA)).partida;
    const outra = revelarPassiva(revelada, ID_A, PASSIVA);
    expect(!outra.ok && outra.erro.tipo).toBe('passiva-ja-revelada');
  });

  it('só podem ser Ativadas depois de reveladas', () => {
    const partida = partidaEmAndamento();
    const cedo = ativarPassiva(partida, ID_A, PASSIVA);
    expect(!cedo.ok && cedo.erro.tipo).toBe('passiva-ainda-oculta');

    const revelada = exigirSucesso(revelarPassiva(partida, ID_A, PASSIVA)).partida;
    const ativada = exigirSucesso(ativarPassiva(revelada, ID_A, PASSIVA)).partida;
    expect(passivaDe(ativada)?.estado).toBe('ativada');
  });

  it('não são Ativadas duas vezes no mesmo ciclo', () => {
    const revelada = exigirSucesso(revelarPassiva(partidaEmAndamento(), ID_A, PASSIVA)).partida;
    const ativada = exigirSucesso(ativarPassiva(revelada, ID_A, PASSIVA)).partida;
    const outra = ativarPassiva(ativada, ID_A, PASSIVA);
    expect(!outra.ok && outra.erro.tipo).toBe('passiva-nao-esta-pronta');
  });

  it('voltam a ficar Prontas no início do próprio turno, e continuam reveladas', () => {
    let partida = exigirSucesso(revelarPassiva(partidaEmAndamento(), ID_A, PASSIVA)).partida;
    partida = exigirSucesso(ativarPassiva(partida, ID_A, PASSIVA)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_A)).partida;

    expect(passivaDe(partida)?.estado).toBe('pronta');
  });

  it('uma Passiva oculta continua oculta ao passar o turno', () => {
    let partida = exigirSucesso(encerrarTurno(partidaEmAndamento(), ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_A)).partida;
    expect(passivaDe(partida)?.estado).toBe('oculta');
  });

  it('não existe comando para Exaurir uma Passiva', () => {
    const revelada = exigirSucesso(revelarPassiva(partidaEmAndamento(), ID_A, PASSIVA)).partida;
    // Exaurir é exclusivo de Carta de Classe: a Passiva não está entre elas.
    const tentativa = exaurirCartaDeClasse(revelada, ID_A, PASSIVA);
    expect(!tentativa.ok && tentativa.erro.tipo).toBe('carta-de-classe-desconhecida');
    expect(passivaDe(revelada)?.estado).toBe('pronta');
  });

  it('recusa uma Passiva que não está equipada', () => {
    const resposta = ativarPassiva(partidaEmAndamento(), ID_A, cardId('nao-equipada'));
    expect(!resposta.ok && resposta.erro.tipo).toBe('passiva-desconhecida');
  });
});

describe('Cartas de Classe', () => {
  it('começam Prontas e podem ser Ativadas', () => {
    const partida = partidaEmAndamento();
    expect(classeDe(partida)?.estado).toBe('pronta');
    const ativada = exigirSucesso(ativarCartaDeClasse(partida, ID_A, CLASSE_1)).partida;
    expect(classeDe(ativada)?.estado).toBe('ativada');
  });

  it('uma carta Pronta pode ser Exaurida, e some do campo', () => {
    const exaurida = exigirSucesso(
      exaurirCartaDeClasse(partidaEmAndamento(), ID_A, CLASSE_1),
    ).partida;
    expect(classeDe(exaurida)).toBeUndefined();
    expect(jogadorDe(exaurida, ID_A).removidas).toContain(CLASSE_1);
  });

  it('uma carta Ativada não pode ser Exaurida antes de voltar a ficar Pronta', () => {
    const ativada = exigirSucesso(
      ativarCartaDeClasse(partidaEmAndamento(), ID_A, CLASSE_1),
    ).partida;
    const tentativa = exaurirCartaDeClasse(ativada, ID_A, CLASSE_1);
    expect(!tentativa.ok && tentativa.erro.tipo).toBe('carta-de-classe-nao-esta-pronta');
  });

  it('uma carta Ativada não pode ser Ativada de novo', () => {
    const ativada = exigirSucesso(
      ativarCartaDeClasse(partidaEmAndamento(), ID_A, CLASSE_1),
    ).partida;
    const outra = ativarCartaDeClasse(ativada, ID_A, CLASSE_1);
    expect(!outra.ok && outra.erro.tipo).toBe('carta-de-classe-nao-esta-pronta');
  });

  it('nenhuma regra universal recupera uma carta Exaurida', () => {
    let partida = exigirSucesso(exaurirCartaDeClasse(partidaEmAndamento(), ID_A, CLASSE_1)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_A)).partida;

    expect(classeDe(partida)).toBeUndefined();
    expect(jogadorDe(partida, ID_A).removidas).toContain(CLASSE_1);
    const tentativa = ativarCartaDeClasse(partida, ID_A, CLASSE_1);
    expect(!tentativa.ok && tentativa.erro.tipo).toBe('carta-de-classe-ja-exaurida');
  });

  it('volta a ficar Pronta no início do próprio turno quando foi apenas Ativada', () => {
    let partida = exigirSucesso(ativarCartaDeClasse(partidaEmAndamento(), ID_A, CLASSE_1)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_A)).partida;
    expect(classeDe(partida)?.estado).toBe('pronta');
  });

  it('não pode ser usada duas vezes na mesma Ação, nem trocando Ativar por Exaurir', () => {
    const declarada = exigirSucesso(
      declararAcao(partidaEmAndamento(), ID_A, perfil(CARTA_A1)),
    ).partida;

    const ativada = exigirSucesso(ativarCartaDeClasse(declarada, ID_A, CLASSE_1, 0)).partida;

    // O uso já ficou registrado naquele espaço de Ação: tanto Ativar de novo
    // quanto tentar Exaurir a mesma carta na mesma Ação são recusados pelo
    // limite de um uso por Ação, antes mesmo de olhar o estado da carta.
    const repetida = ativarCartaDeClasse(ativada, ID_A, CLASSE_1, 0);
    expect(!repetida.ok && repetida.erro.tipo).toBe('carta-de-classe-ja-usada-nesta-acao');

    const exaurirNaMesma = exaurirCartaDeClasse(ativada, ID_A, CLASSE_1, 0);
    expect(!exaurirNaMesma.ok && exaurirNaMesma.erro.tipo).toBe(
      'carta-de-classe-ja-usada-nesta-acao',
    );

    // A outra Carta de Classe continua livre para ser usada na mesma Ação.
    const comSegunda = exigirSucesso(exaurirCartaDeClasse(ativada, ID_A, CLASSE_2, 0)).partida;
    expect(jogadorDe(comSegunda, ID_A).removidas).toContain(CLASSE_2);
    // Já Exaurida, ela saiu do campo: o erro passa a ser esse, mais preciso.
    const deNovo = exaurirCartaDeClasse(comSegunda, ID_A, CLASSE_2, 0);
    expect(!deNovo.ok && deNovo.erro.tipo).toBe('carta-de-classe-ja-exaurida');
  });

  it('registra o uso no espaço de Ação indicado', () => {
    const declarada = exigirSucesso(
      declararAcao(partidaEmAndamento(), ID_A, perfil(CARTA_A1)),
    ).partida;
    const usada = exigirSucesso(ativarCartaDeClasse(declarada, ID_A, CLASSE_1, 0)).partida;
    expect(jogadorDe(usada, ID_A).acoes[0].cartasDeClasseUsadas).toContain(CLASSE_1);
  });

  it('recusa indicar uma Ação que não foi declarada', () => {
    const resposta = ativarCartaDeClasse(partidaEmAndamento(), ID_A, CLASSE_1, 2);
    expect(!resposta.ok && resposta.erro.tipo).toBe('acao-nao-declarada');
  });

  it('a composição continua válida depois de uma Exaustão', () => {
    const exaurida = exigirSucesso(
      exaurirCartaDeClasse(partidaEmAndamento(), ID_A, CLASSE_1),
    ).partida;
    expect(validarPartida(exaurida).ok).toBe(true);
  });
});

describe('Ultimate', () => {
  it('começa disponível e pode ser consumida uma vez', () => {
    const partida = partidaEmAndamento();
    expect(jogadorDe(partida, ID_A).ultimate.estado).toBe('disponivel');
    const usada = exigirSucesso(consumirUltimate(partida, ID_A)).partida;
    expect(jogadorDe(usada, ID_A).ultimate.estado).toBe('consumida');
    expect(jogadorDe(usada, ID_A).ultimate.carta).toBe(ULTIMATE);
  });

  it('recusa o segundo uso', () => {
    const usada = exigirSucesso(consumirUltimate(partidaEmAndamento(), ID_A)).partida;
    const outra = consumirUltimate(usada, ID_A);
    expect(!outra.ok && outra.erro.tipo).toBe('ultimate-ja-consumida');
  });

  it('continua consumida pelo resto da partida', () => {
    let partida = exigirSucesso(consumirUltimate(partidaEmAndamento(), ID_A)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(encerrarTurno(partida, ID_B)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_A)).partida;
    expect(jogadorDe(partida, ID_A).ultimate.estado).toBe('consumida');
  });
});
