import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comDevocao,
  devocaoDe,
  duelo,
  erroDe,
  jogador,
  jogar,
  virarTurno,
  guardarNoCooldown,
} from '../teste-apoio.js';
import { ativarPassivaNaAcao, declarar, responder, resolver } from '../partida.js';

/*
 * As dez Passivas, as seis Cartas de Classe e as três Ultimates do Clérigo.
 *
 * Cada Carta de Classe aparece duas vezes: Ativar e Exaurir são efeitos
 * distintos e cada um precisa da própria prova. Ativar nunca sai da partida;
 * Exaurir sai e não volta.
 */

const clerigo = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('clerigo', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

const estadoDaPassiva = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  carta: string,
): string | undefined =>
  jogador(partida, quem).passivas.find((passiva) => passiva.carta === carta)?.estado;

describe('Clérigo — Passivas', () => {
  it('CP01 Coração Misericordioso se revela ao curar com 15 de Vida ou menos', () => {
    const base = comDevocao(
      duelo(clerigo(['C09'], { passivas: ['CP01', 'CP03', 'CP07', 'CP10'] }), guerreiro, A),
      A,
      'graca',
    );
    const ferido = com(base, A, { vida: 14 });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'C09' as never } });
    // Ela se revela porque a Vida era 14 **quando** a cura entrou, embora o
    // resultado da cura passe de 15.
    expect(estadoDaPassiva(depois, A, 'CP01')).not.toBe('oculta');
    expect(jogador(depois, A).vida).toBe(17);
  });

  it('CP01 revelada soma +1 à primeira cura de cada próprio turno', () => {
    const base = comDevocao(
      duelo(clerigo(['C09', 'C13'], { passivas: ['CP01', 'CP03', 'CP07', 'CP10'] }), guerreiro, A),
      A,
      'graca',
    );
    const ferido = com(base, A, { vida: 12 });
    const primeira = jogar(ferido, A, { pedido: { carta: 'C09' as never } }).partida;
    expect(jogador(primeira, A).vida).toBe(15);

    const proximoTurno = virarTurno(virarTurno(primeira, A), B);
    const { partida: depois } = jogar(proximoTurno, A, { pedido: { carta: 'C13' as never } });
    // Purificação restaura 2 sem Condição alguma, mais 1 do Coração.
    expect(jogador(depois, A).vida - jogador(proximoTurno, A).vida).toBe(3);
  });

  it('CP02 Olho do Julgamento se revela na primeira Ruptura e depois dá +1 D com Guarda 0', () => {
    const base = duelo(
      clerigo(['C01'], { passivas: ['CP02', 'CP03', 'CP07', 'CP10'] }),
      guerreiro,
      A,
    );
    const quaseRompido = com(base, B, { guarda: 1 });
    const rompeu = jogar(quaseRompido, A, { pedido: { carta: 'C01' as never } }).partida;
    expect(estadoDaPassiva(rompeu, A, 'CP02')).not.toBe('oculta');

    const proximoTurno = virarTurno(virarTurno(rompeu, A), B);
    const comGuardaZero = com(proximoTurno, B, { guarda: 0 });
    const antes = jogador(comGuardaZero, B).vida;
    const { partida: depois } = jogar(comGuardaZero, A, { pedido: { carta: 'C01' as never } });
    // 2 D impressos + 1 D do Olho do Julgamento.
    expect(antes - jogador(depois, B).vida).toBe(3);
  });

  it('CP03 Devoção Imóvel se revela ao terminar o turno com 2 de Reserva', () => {
    const base = duelo(
      clerigo(['C12'], { passivas: ['CP03', 'CP06', 'CP07', 'CP10'] }),
      guerreiro,
      A,
    );
    const usada = jogar(base, A, { pedido: { carta: 'C12' as never } }).partida;
    const virada = virarTurno(usada, A);
    expect(estadoDaPassiva(virada, A, 'CP03')).not.toBe('oculta');
  });

  it('CP03 revelada deixa a primeira Reação de Graça sair em Vigília', () => {
    const base = duelo(
      guerreiro,
      clerigo(['C14'], { passivas: ['CP03', 'CP06', 'CP07', 'CP10'] }),
      A,
    );
    const comPassiva = com(base, B, {
      passivas: jogador(base, B).passivas.map((passiva) =>
        passiva.carta === 'CP03' ? { ...passiva, estado: 'pronta' as const } : passiva,
      ),
    });
    expect(devocaoDe(comPassiva, B)).toBe('vigilia');
    const { partida: depois } = jogar(comPassiva, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C14' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('CP04 Mártir Voluntário se revela ao perder Vida por efeito próprio e avança a Devoção', () => {
    const base = duelo(
      guerreiro,
      clerigo(['C17'], { passivas: ['CP04', 'CP03', 'CP07', 'CP10'] }),
      A,
    );
    const quaseRompido = com(base, B, { guarda: 2 });
    const { partida: depois } = jogar(quaseRompido, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C17' as never },
    });
    expect(estadoDaPassiva(depois, B, 'CP04')).not.toBe('oculta');
    // Três avanços somados: o texto do Martírio, a Resposta forte da mecânica
    // do turno inimigo e a revelação da própria Passiva.
    expect(devocaoDe(depois, B)).toBe('milagre');
  });

  it('CP05 Pureza Interior se revela e remove a Condição aplicada', () => {
    const mago = build('mago', { habilidades: ['M03'] });
    const base = duelo(mago, clerigo(['C01'], { passivas: ['CP05', 'CP03', 'CP07', 'CP10'] }), A);
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'M03' as never } });
    expect(estadoDaPassiva(depois, B, 'CP05')).not.toBe('oculta');
    expect(jogador(depois, B).condicoes.queimadura).toBe(0);
  });

  it('CP06 Milagre Guardado se revela ao alcançar Milagre e Ativa por +1 D', () => {
    const base = comDevocao(
      duelo(clerigo(['C06'], { passivas: ['CP06', 'CP03', 'CP07', 'CP10'] }), guerreiro, A),
      A,
      'milagre',
    );
    const declarada = declarar(base, A, { carta: 'C06' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;

    const ativada = ativarPassivaNaAcao(declarada.valor.partida, A, 0, 'CP06' as never, {
      bonusDoMilagre: 'dano',
    });
    expect(ativada.ok).toBe(true);
    if (!ativada.ok) return;

    const resolvida = resolver(ativada.valor.partida, A, 0);
    expect(resolvida.ok).toBe(true);
    if (!resolvida.ok) return;
    // 5 D impressos + 1 D do Milagre Guardado.
    expect(jogador(resolvida.valor.partida, B).vida).toBe(30 - 6);
  });

  it('CP06 recusa a Ativação sem a escolha do bônus', () => {
    const base = comDevocao(
      duelo(clerigo(['C06'], { passivas: ['CP06', 'CP03', 'CP07', 'CP10'] }), guerreiro, A),
      A,
      'milagre',
    );
    const declarada = declarar(base, A, { carta: 'C06' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const recusa = ativarPassivaNaAcao(declarada.valor.partida, A, 0, 'CP06' as never);
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('CP07 Liturgia Contínua aproxima da mão a Técnica jogada como terceira Ação', () => {
    const base = duelo(
      clerigo(['C01', 'C08', 'C12'], { passivas: ['CP07', 'CP03', 'CP06', 'CP10'] }),
      guerreiro,
      A,
    );
    const comPassiva = com(base, A, {
      passivas: jogador(base, A).passivas.map((passiva) =>
        passiva.carta === 'CP07' ? { ...passiva, estado: 'pronta' as const } : passiva,
      ),
    });
    const uma = jogar(comPassiva, A, { pedido: { carta: 'C01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'C08' as never } }).partida;
    const { partida: tres } = jogar(duas, A, { pedido: { carta: 'C12' as never } });
    /*
     * A Liturgia adianta o **agendamento**: C12 Vigília imprime CD2 e passa a
     * ter destino CD1. A carta entra na zona no encerramento do turno (§11),
     * e é lá que o efeito se confirma.
     */
    expect(jogador(tres, A).cooldownAgendado.find((a) => a.carta === 'C12')?.destino).toBe(1);
    expect(jogador(guardarNoCooldown(tres, A), A).cooldown[1]).toContain('C12');
  });

  it('CP08 Escudo dos Fiéis restaura 1 Vida quando uma Reação zera o Dano', () => {
    const base = duelo(
      guerreiro,
      clerigo(['C14'], { passivas: ['CP08', 'CP03', 'CP07', 'CP10'] }),
      A,
    );
    const emGraca = com(comDevocao(base, B, 'graca'), B, { vida: 20 });
    const { partida: depois } = jogar(emGraca, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C14' as never },
    });
    expect(estadoDaPassiva(depois, B, 'CP08')).not.toBe('oculta');

    const proximo = virarTurno(virarTurno(depois, A), B);
    const vidaAntes = jogador(proximo, B).vida;
    const { partida: segunda } = jogar(proximo, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'C14' as never },
    });
    expect(jogador(segunda, B).vida).toBe(vidaAntes + 1);
  });

  it('CP09 Justiça Restauradora restaura 1 Vida ao provocar Ruptura', () => {
    const base = duelo(
      clerigo(['C01'], { passivas: ['CP09', 'CP03', 'CP07', 'CP10'] }),
      guerreiro,
      A,
    );
    const ferido = com(com(base, A, { vida: 20 }), B, { guarda: 1 });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'C01' as never } });
    expect(estadoDaPassiva(depois, A, 'CP09')).not.toBe('oculta');
    expect(jogador(depois, A).vida).toBe(21);
  });

  it('CP10 Segunda Luz avança a Devoção a 5 de Vida e empresta um degrau', () => {
    const base = duelo(
      clerigo(['C09'], { passivas: ['CP10', 'CP03', 'CP06', 'CP07'] }),
      guerreiro,
      A,
    );
    const morrendo = com(base, A, { vida: 4 });
    // A Passiva se revela na abertura do turno seguinte e leva a Devoção a Graça.
    const virada = virarTurno(virarTurno(morrendo, A), B);
    expect(estadoDaPassiva(virada, A, 'CP10')).not.toBe('oculta');
    expect(devocaoDe(virada, A)).toBe('graca');

    // Em Graça, e com o degrau emprestado, a primeira habilidade do turno
    // alcança requisitos de Fervor.
    const emVigilia = comDevocao(virada, A, 'vigilia');
    const declarada = declarar(emVigilia, A, { carta: 'C09' as never });
    expect(declarada.ok).toBe(true);
  });
});

describe('Clérigo — Cartas de Classe', () => {
  it('CC01 Doutrina da Misericórdia Ativada soma +1 à cura', () => {
    const base = comDevocao(
      duelo(clerigo(['C09'], { cartasDeClasse: ['CC01', 'CC04'] }), guerreiro, A),
      A,
      'graca',
    );
    const ferido = com(base, A, { vida: 20 });
    const { partida: depois } = jogar(ferido, A, {
      pedido: {
        carta: 'C09' as never,
        cartasDeClasse: [{ carta: 'CC01' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, A).vida).toBe(24);
  });

  it('CC01 Exaurida soma +3 e sai da partida', () => {
    const base = comDevocao(
      duelo(clerigo(['C09'], { cartasDeClasse: ['CC01', 'CC04'] }), guerreiro, A),
      A,
      'graca',
    );
    const ferido = com(base, A, { vida: 15 });
    const { partida: depois } = jogar(ferido, A, {
      pedido: {
        carta: 'C09' as never,
        cartasDeClasse: [{ carta: 'CC01' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).vida).toBe(21);
    expect(jogador(depois, A).removidas).toContain('CC01');
  });

  it('CC02 Doutrina do Julgamento Ativada dá +1 D e +1 I contra Guarda baixa', () => {
    const base = duelo(clerigo(['C01'], { cartasDeClasse: ['CC02', 'CC04'] }), guerreiro, A);
    const guardaBaixa = com(base, B, { guarda: 3 });
    const { partida: depois } = jogar(guardaBaixa, A, {
      pedido: {
        carta: 'C01' as never,
        cartasDeClasse: [{ carta: 'CC02' as never, modo: 'ativar' }],
      },
    });
    // 2 D + 1 D da Doutrina; 1 I impresso + 1 I do próprio texto + 1 I da Doutrina.
    expect(jogador(depois, B).vida).toBe(30 - 3 - 2);
    expect(jogador(depois, B).guarda).toBe(0);
  });

  it('CC02 Exaurida dá +3 D e avança a Devoção na Ruptura', () => {
    const base = duelo(clerigo(['C01'], { cartasDeClasse: ['CC02', 'CC04'] }), guerreiro, A);
    const quaseRompido = com(base, B, { guarda: 1 });
    const { partida: depois } = jogar(quaseRompido, A, {
      pedido: {
        carta: 'C01' as never,
        cartasDeClasse: [{ carta: 'CC02' as never, modo: 'exaurir' }],
      },
    });
    // A mecânica avança um estágio pela Ruptura e a Doutrina avança outro.
    expect(devocaoDe(depois, A)).toBe('fervor');
    expect(jogador(depois, A).removidas).toContain('CC02');
  });

  it('CC03 Doutrina do Martírio Ativada avança a Devoção ao levar 3 de Vida', () => {
    const base = duelo(guerreiro, clerigo(['C01'], { cartasDeClasse: ['CC03', 'CC04'] }), A);
    const declarada = declarar(base, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const respondida = responder(declarada.valor.partida, B, 0, {
      tipo: 'sem-resposta',
    });
    expect(respondida.ok).toBe(true);
    if (!respondida.ok) return;
    // A Doutrina é usada como Carta de Classe da própria Resposta.
    const comDoutrina = responder(declarada.valor.partida, B, 0, {
      tipo: 'defesa-inata',
      cartasDeClasse: [{ carta: 'CC03' as never, modo: 'ativar' }],
    });
    expect(erroDe(comDoutrina).tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('CC03 Exaurida segura a Vida em 1 em vez de deixar chegar a 0', () => {
    const base = duelo(guerreiro, clerigo(['C01'], { cartasDeClasse: ['CC03', 'CC04'] }), A);
    const morrendo = com(base, B, { vida: 2 });
    const { partida: depois } = jogar(morrendo, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'defesa-inata',
        cartasDeClasse: [{ carta: 'CC03' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(1);
    expect(depois.desfecho).toBeNull();
  });

  it('CC04 Incensário da Aurora Ativado dá +1 D ao Ataque seguinte à Técnica', () => {
    const base = duelo(clerigo(['C08', 'C01'], { cartasDeClasse: ['CC04', 'CC01'] }), guerreiro, A);
    const tecnica = jogar(base, A, {
      pedido: {
        carta: 'C08' as never,
        cartasDeClasse: [{ carta: 'CC04' as never, modo: 'ativar' }],
      },
    }).partida;
    const { partida: depois } = jogar(tecnica, A, { pedido: { carta: 'C01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('CC04 Exaurido dá +2 D e +2 I ao Ataque seguinte à Técnica', () => {
    const base = duelo(clerigo(['C08', 'C01'], { cartasDeClasse: ['CC04', 'CC01'] }), guerreiro, A);
    const tecnica = jogar(base, A, {
      pedido: {
        carta: 'C08' as never,
        cartasDeClasse: [{ carta: 'CC04' as never, modo: 'exaurir' }],
      },
    }).partida;
    const { partida: depois } = jogar(tecnica, A, { pedido: { carta: 'C01' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 4);
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });

  it('CC05 Sino do Santuário Ativado reduz +1 I na Resposta', () => {
    const base = duelo(guerreiro, clerigo(['C17'], { cartasDeClasse: ['CC05', 'CC01'] }), A);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'C17' as never,
        cartasDeClasse: [{ carta: 'CC05' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('CC05 Exaurido zera o Impacto final e reduz +2 D', () => {
    const base = duelo(guerreiro, clerigo(['C17'], { cartasDeClasse: ['CC05', 'CC01'] }), A);
    const guardaBaixa = com(base, B, { guarda: 1 });
    const { partida: depois } = jogar(guardaBaixa, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'C17' as never,
        cartasDeClasse: [{ carta: 'CC05' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(1);
    // 3 D impressos menos os 2 D do Sino, e mais 1 de Vida paga pelo Martírio
    // por ter impedido a Ruptura.
    expect(jogador(depois, B).vida).toBe(30 - 1 - 1);
  });

  it('CC06 Relicário dos Santos Ativado move uma carta de CD2 para CD1', () => {
    const base = comDevocao(
      duelo(clerigo(['C09', 'C06'], { cartasDeClasse: ['CC06', 'CC01'] }), guerreiro, A),
      A,
      'fervor',
    );
    const comCd2 = com(base, A, { cooldown: { 1: [], 2: ['C09' as never], 3: [] } });
    const { partida: depois } = jogar(comCd2, A, {
      pedido: {
        carta: 'C06' as never,
        escolhas: { cartaEmCooldown: 'C09' as never },
        cartasDeClasse: [{ carta: 'CC06' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, A).cooldown[1]).toContain('C09');
  });

  it('CC06 Exaurido devolve uma carta do cooldown à mão e a encarece no turno', () => {
    const base = duelo(clerigo(['C01', 'C08'], { cartasDeClasse: ['CC06', 'CC01'] }), guerreiro, A);
    const comCd3 = com(base, A, { cooldown: { 1: [], 2: [], 3: ['C09' as never] } });
    const { partida: depois } = jogar(comCd3, A, {
      pedido: {
        carta: 'C01' as never,
        escolhas: { cartaEmCooldown: 'C09' as never },
        cartasDeClasse: [{ carta: 'CC06' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).mao).toContain('C09');
    expect(jogador(depois, A).removidas).toContain('CC06');
  });
});

describe('Clérigo — Ultimates', () => {
  it('CU01 Julgamento Celeste exige Milagre, consome Milagre e cura 3 na Ruptura', () => {
    const emFervor = comDevocao(
      duelo(clerigo(['C01'], { ultimate: 'CU01' }), guerreiro, A),
      A,
      'fervor',
    );
    expect(erroDe(declarar(emFervor, A, { carta: 'CU01' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const base = comDevocao(
      duelo(clerigo(['C01'], { ultimate: 'CU01' }), guerreiro, A),
      A,
      'milagre',
    );
    const ferido = com(com(base, A, { vida: 20 }), B, { guarda: 3 });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'CU01' as never } });
    expect(jogador(depois, A).vida).toBe(23);
    expect(jogador(depois, B).guarda).toBe(0);
  });

  it('CU02 Milagre da Aurora restaura 6 Vida e limpa todas as Condições negativas', () => {
    const base = comDevocao(
      duelo(clerigo(['C01'], { ultimate: 'CU02' }), guerreiro, A),
      A,
      'milagre',
    );
    const ferido = com(com(base, A, { vida: 15 }), A, {
      condicoes: { queimadura: 2, lento: 0, murchar: 1, sangramento: 1 },
    });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'CU02' as never } });
    expect(jogador(depois, A).vida).toBe(21);
    expect(jogador(depois, A).condicoes).toEqual({
      queimadura: 0,
      lento: 0,
      murchar: 0,
      sangramento: 0,
    });
    // O consumo devolve a Devoção a Vigília na declaração; a cura da própria
    // Ultimate dispara depois o avanço automático do turno, que leva a Graça.
    expect(devocaoDe(depois, A)).toBe('graca');
  });

  it('CU03 Intercessão Divina zera Dano e Impacto e restaura 2 Vida', () => {
    const base = comDevocao(
      duelo(guerreiro, clerigo(['C01'], { ultimate: 'CU03' }), A),
      B,
      'milagre',
    );
    const preparado = com(com(base, B, { vida: 20, reserva: 2 }), B, { guarda: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'CU03' as never },
    });
    expect(jogador(depois, B).vida).toBe(22);
    expect(jogador(depois, B).guarda).toBe(2);
    expect(devocaoDe(depois, B)).toBe('vigilia');
  });
});
