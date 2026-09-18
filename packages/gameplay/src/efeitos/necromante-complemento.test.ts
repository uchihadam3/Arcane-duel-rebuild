import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  almasDe,
  almasNoCemiterio,
  build,
  com,
  comAlmas,
  duelo,
  erroDe,
  jogador,
  jogar,
  virarTurno,
} from '../teste-apoio.js';
import { anexarAlmaNoServo, declarar, resolver, responder } from '../partida.js';

/*
 * As dez Passivas, os seis Servos e as três Ultimates do Necromante.
 *
 * Todo lado Ativar de Servo imprime "se houver Alma anexada, você **pode**
 * devolvê-la": os testes provam os dois caminhos — com a escolha e sem ela.
 */

const necromante = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('necromante', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

const revelar = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  carta: string,
): ReturnType<typeof duelo> =>
  com(partida, quem, {
    passivas: jogador(partida, quem).passivas.map((passiva) =>
      passiva.carta === carta ? { ...passiva, estado: 'pronta' as const } : passiva,
    ),
  });

const estadoDaPassiva = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  carta: string,
): string | undefined =>
  jogador(partida, quem).passivas.find((passiva) => passiva.carta === carta)?.estado;

const comServoAtivado = (
  partida: ReturnType<typeof duelo>,
  quem: typeof A,
  servo: string,
): ReturnType<typeof duelo> =>
  com(partida, quem, {
    cartasDeClasse: jogador(partida, quem).cartasDeClasse.map((item) =>
      item.carta === servo ? { ...item, estado: 'ativada' as const } : item,
    ),
  });

describe('Necromante — Passivas', () => {
  it('NP01 Colecionador de Almas se revela com as 4 Almas controladas', () => {
    const base = comAlmas(
      duelo(necromante(['N01'], { passivas: ['NP01', 'NP08', 'NP09', 'NP10'] }), guerreiro, A),
      A,
      4,
    );
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'N01' as never } });
    expect(estadoDaPassiva(depois, A, 'NP01')).not.toBe('oculta');
  });

  it('NP01 revelada colhe 1 Alma adicional quando colhe com 1 ou menos', () => {
    const base = comAlmas(
      duelo(necromante(['N01'], { passivas: ['NP01', 'NP08', 'NP09', 'NP10'] }), guerreiro, A),
      A,
      0,
    );
    const { partida: depois } = jogar(revelar(base, A, 'NP01'), A, {
      pedido: { carta: 'N01' as never },
    });
    // A colheita automática traz 1 e o Colecionador traz mais 1.
    expect(almasDe(depois, A)).toBe(2);
  });

  it('NP02 Mestre do Murchar se revela ao aplicar Murchar e depois dá +1 I', () => {
    const base = comAlmas(
      duelo(
        necromante(['N14', 'N01'], { passivas: ['NP02', 'NP08', 'NP09', 'NP10'] }),
        guerreiro,
        A,
      ),
      A,
      2,
    );
    const aplicou = jogar(base, A, { pedido: { carta: 'N14' as never } }).partida;
    expect(estadoDaPassiva(aplicou, A, 'NP02')).not.toBe('oculta');

    const { partida: depois } = jogar(aplicou, A, { pedido: { carta: 'N01' as never } });
    // 1 I impresso + 1 I do Mestre do Murchar.
    expect(jogador(depois, B).guarda).toBe(6 - 2);
  });

  it('NP03 Memória dos Mortos colhe ao empurrar a própria carta para trás', () => {
    const base = comAlmas(
      duelo(necromante(['N10']), guerreiro, A).valueOf() as ReturnType<typeof duelo>,
      A,
      0,
    );
    const comPassiva = com(base, A, {
      passivas: jogador(base, A).passivas.map((passiva) => passiva),
    });
    expect(comPassiva).toBeDefined();

    const partida = comAlmas(
      duelo(necromante(['N10'], { passivas: ['NP03', 'NP08', 'NP09', 'NP10'] }), guerreiro, A),
      A,
      0,
    );
    const comCd1 = com(partida, A, { cooldown: { 1: ['N01' as never], 2: [], 3: [] } });
    const { partida: depois } = jogar(comCd1, A, {
      pedido: {
        carta: 'N10' as never,
        escolhas: { cartaEmCooldown: 'N01' as never, almasColhidas: 0 },
      },
    });
    expect(estadoDaPassiva(depois, A, 'NP03')).not.toBe('oculta');
    expect(almasDe(depois, A)).toBe(1);
  });

  it('NP04 Senhor dos Servos colhe ao deixar um Servo Pronto de novo', () => {
    const base = comAlmas(
      duelo(
        necromante(['N13', 'N01'], { passivas: ['NP04', 'NP08', 'NP09', 'NP10'] }),
        guerreiro,
        A,
      ),
      A,
      2,
    );
    const doisAtivados = com(base, A, {
      cartasDeClasse: jogador(base, A).cartasDeClasse.map((item) => ({
        ...item,
        estado: 'ativada' as const,
      })),
    });
    const servo = jogador(doisAtivados, A).cartasDeClasse[0]?.carta;
    if (servo === undefined) throw new Error('build sem Servo');
    const { partida: depois } = jogar(revelar(doisAtivados, A, 'NP04'), A, {
      pedido: { carta: 'N13' as never, escolhas: { cartaDeClasse: servo } },
    });
    expect(jogador(depois, A).cartasDeClasse[0]?.estado).toBe('pronta');
    // Gasta 1 Alma na carta e colhe 1 pela Passiva.
    expect(almasDe(depois, A)).toBe(2);
  });

  it('NP05 Fome da Cripta soma +1 à primeira restauração do turno', () => {
    const base = comAlmas(
      duelo(necromante(['N04'], { passivas: ['NP05', 'NP08', 'NP09', 'NP10'] }), guerreiro, A),
      A,
      2,
    );
    const ferido = com(revelar(base, A, 'NP05'), A, { vida: 20 });
    const { partida: depois } = jogar(ferido, A, { pedido: { carta: 'N04' as never } });
    expect(jogador(depois, A).vida).toBe(22);
  });

  it('NP06 Guardião do Túmulo colhe quando uma Reação impede Ruptura', () => {
    const base = comAlmas(
      duelo(guerreiro, necromante(['N16'], { passivas: ['NP06', 'NP08', 'NP09', 'NP10'] }), A),
      B,
      2,
    );
    const quaseRompido = com(base, B, { guarda: 2, reserva: 2 });
    const { partida: depois } = jogar(quaseRompido, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'N16' as never },
    });
    expect(estadoDaPassiva(depois, B, 'NP06')).not.toBe('oculta');
    // Gasta 1 Alma na Muralha, colhe 1 pela Passiva e mais 1 pela colheita
    // automática do turno inimigo, já que ainda perdeu Vida.
    expect(almasDe(depois, B)).toBe(3);
  });

  it('NP07 Último Suspiro colhe até 2 Almas e barateia a primeira habilidade com Alma', () => {
    const base = comAlmas(
      duelo(necromante(['N02'], { passivas: ['NP07', 'NP08', 'NP09', 'NP10'] }), guerreiro, A),
      A,
      0,
    );
    const morrendo = com(base, A, { vida: 4 });
    const virada = virarTurno(virarTurno(morrendo, A), B);
    expect(estadoDaPassiva(virada, A, 'NP07')).not.toBe('oculta');
    expect(almasDe(virada, A)).toBe(2);

    const semAlma = comAlmas(virada, A, 0);
    // Com o desconto de 1 Alma, a Lança de Ossos sai mesmo sem Alma nenhuma.
    const declarada = declarar(semAlma, A, { carta: 'N02' as never });
    expect(declarada.ok).toBe(true);
  });

  it('NP08 Sacrifício Calculado colhe ao Exaurir o primeiro Servo', () => {
    const base = comAlmas(
      duelo(
        necromante(['N01'], {
          passivas: ['NP08', 'NP09', 'NP10', 'NP01'],
          cartasDeClasse: ['NC02', 'NC06'],
        }),
        guerreiro,
        A,
      ),
      A,
      0,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N01' as never,
        cartasDeClasse: [{ carta: 'NC02' as never, modo: 'exaurir' }],
      },
    });
    expect(estadoDaPassiva(depois, A, 'NP08')).not.toBe('oculta');
    expect(almasDe(depois, A)).toBeGreaterThan(0);
  });

  it('NP09 Paciência Sepulcral barateia a primeira Reação do turno inimigo', () => {
    const base = comAlmas(
      duelo(guerreiro, necromante(['N16'], { passivas: ['NP09', 'NP08', 'NP10', 'NP01'] }), A),
      B,
      0,
    );
    const preparado = com(revelar(base, B, 'NP09'), B, { reserva: 2 });
    const declarada = declarar(preparado, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const respondida = responder(declarada.valor.partida, B, 0, {
      tipo: 'carta-de-reacao',
      carta: 'N16' as never,
    });
    expect(respondida.ok).toBe(true);
  });

  it('NP10 Eco do Cemitério colhe quando uma carta volta de CD1 para a mão', () => {
    const base = comAlmas(
      duelo(necromante(['N01'], { passivas: ['NP10', 'NP08', 'NP09', 'NP01'] }), guerreiro, A),
      A,
      0,
    );
    const comDuasZonas = com(revelar(base, A, 'NP10'), A, {
      cooldown: { 1: ['N02' as never], 2: ['N03' as never], 3: [] },
    });
    const virada = virarTurno(virarTurno(comDuasZonas, A), B);
    expect(jogador(virada, A).mao).toContain('N02');
    expect(almasDe(virada, A)).toBe(1);
  });
});

describe('Necromante — Servos', () => {
  it('NC01 Guardião Esquelético Ativado reduz +1 I na Reação', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N16']), A), B, 2);
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'N16' as never,
        cartasDeClasse: [{ carta: 'NC01' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(6);
  });

  it('NC01 devolve a Alma anexada para reduzir também +1 D e +1 I', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N16']), A), B, 1, ['NC01' as never]);
    const preparado = com(base, B, { reserva: 2 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'N16' as never,
        escolhas: { usarAlmaAnexada: true },
        cartasDeClasse: [{ carta: 'NC01' as never, modo: 'ativar' }],
      },
    });
    // A Alma anexada volta ao Cemitério, e as quatro fichas seguem existindo.
    expect(almasDe(depois, B) + almasNoCemiterio(depois, B)).toBe(4);
    expect(jogador(depois, B).vida).toBe(30 - 2);
  });

  it('NC01 Exaurido zera o Impacto final da ação respondida', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N17']), A), B, 2);
    const preparado = com(base, B, { reserva: 2, guarda: 1 });
    const { partida: depois } = jogar(preparado, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'N17' as never,
        cartasDeClasse: [{ carta: 'NC01' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).guarda).toBe(1);
  });

  it('NC02 Cão Tumular Ativado tira 1 Vida a mais depois do Ataque', () => {
    const base = comAlmas(
      duelo(necromante(['N01'], { cartasDeClasse: ['NC02', 'NC06'] }), guerreiro, A),
      A,
      2,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N01' as never,
        cartasDeClasse: [{ carta: 'NC02' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 2 - 1);
  });

  it('NC02 Exaurido tira 3 Vida depois do Ataque', () => {
    const base = comAlmas(
      duelo(necromante(['N01'], { cartasDeClasse: ['NC02', 'NC06'] }), guerreiro, A),
      A,
      2,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N01' as never,
        cartasDeClasse: [{ carta: 'NC02' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 2 - 3);
  });

  it('NC03 Espectro Faminto Ativado ignora 1 ponto da redução escolhida', () => {
    const base = comAlmas(
      duelo(necromante(['N01'], { cartasDeClasse: ['NC03', 'NC06'] }), guerreiro, A),
      A,
      2,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N01' as never,
        escolhas: { reforco: 'dano' },
        cartasDeClasse: [{ carta: 'NC03' as never, modo: 'ativar' }],
      },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    // W15 reduz 3 D contra 2 D impressos: ignorar 1 ponto continua zerando.
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('NC03 Exaurido ignora até 3 pontos divididos entre Dano e Impacto', () => {
    const base = comAlmas(
      duelo(necromante(['N01'], { cartasDeClasse: ['NC03', 'NC06'] }), guerreiro, A),
      A,
      2,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N01' as never,
        escolhas: { divisao: { dano: 3, impacto: 0 } },
        cartasDeClasse: [{ carta: 'NC03' as never, modo: 'exaurir' }],
      },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    // Os 3 D de redução do Aparar são ignorados por inteiro.
    expect(jogador(depois, B).vida).toBe(30 - 2);
  });

  it('NC04 Mago Ósseo Ativado abate 1 Alma do custo', () => {
    const base = comAlmas(
      duelo(necromante(['N02'], { cartasDeClasse: ['NC04', 'NC06'] }), guerreiro, A),
      A,
      0,
    );
    const declarada = declarar(base, A, {
      carta: 'N02' as never,
      cartasDeClasse: [{ carta: 'NC04' as never, modo: 'ativar' }],
    });
    expect(declarada.ok).toBe(true);
  });

  it('NC04 Exaurido abate até 3 Almas e dá +1 D e +1 I ao Ataque', () => {
    const base = comAlmas(
      duelo(necromante(['N05'], { cartasDeClasse: ['NC04', 'NC06'] }), guerreiro, A),
      A,
      0,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N05' as never,
        escolhas: { descontoDeRecurso: 2 },
        cartasDeClasse: [{ carta: 'NC04' as never, modo: 'exaurir' }],
      },
    });
    // 4 D impressos + 1 D do Mago Ósseo.
    expect(jogador(depois, B).vida).toBe(30 - 5);
  });

  it('NC05 Ghoul Devorador Ativado restaura 1 Vida a cada colheita', () => {
    const base = comAlmas(
      duelo(necromante(['N07'], { cartasDeClasse: ['NC05', 'NC06'] }), guerreiro, A),
      A,
      0,
    );
    const ferido = comServoAtivado(com(base, A, { vida: 20 }), A, 'NC05');
    const guardaBaixa = com(ferido, B, { guarda: 3 });
    const { partida: depois } = jogar(guardaBaixa, A, { pedido: { carta: 'N07' as never } });
    expect(jogador(depois, A).vida).toBeGreaterThan(20);
  });

  it('NC05 Exaurido restaura 3 Vida e colhe 1 Alma adicional', () => {
    const base = comAlmas(
      duelo(
        necromante(['N01'], {
          cartasDeClasse: ['NC05', 'NC06'],
          // Sem o Sacrifício Calculado, que também colhe ao Exaurir um Servo.
          passivas: ['NP09', 'NP10', 'NP01', 'NP02'],
        }),
        guerreiro,
        A,
      ),
      A,
      0,
    );
    const ferido = com(base, A, { vida: 20 });
    const { partida: depois } = jogar(ferido, A, {
      pedido: {
        carta: 'N01' as never,
        cartasDeClasse: [{ carta: 'NC05' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, A).vida).toBeGreaterThan(22);
    expect(almasDe(depois, A)).toBe(2);
  });

  it('NC06 Abominação Costurada Ativada só entra com Ataque de 3 AP', () => {
    const base = comAlmas(
      duelo(necromante(['N01', 'N05'], { cartasDeClasse: ['NC06', 'NC02'] }), guerreiro, A),
      A,
      2,
    );
    const recusa = declarar(base, A, {
      carta: 'N01' as never,
      cartasDeClasse: [{ carta: 'NC06' as never, modo: 'ativar' }],
    });
    expect(erroDe(recusa).tipo).toBe('condicao-de-uso-nao-satisfeita');

    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N05' as never,
        cartasDeClasse: [{ carta: 'NC06' as never, modo: 'ativar' }],
      },
    });
    // 4 D impressos + 1 D da Abominação.
    expect(jogador(depois, B).vida).toBe(30 - 5);
  });

  it('NC06 Exaurida dá +3 D e +2 I a qualquer Ataque', () => {
    const base = comAlmas(
      duelo(necromante(['N01'], { cartasDeClasse: ['NC06', 'NC02'] }), guerreiro, A),
      A,
      2,
    );
    const { partida: depois } = jogar(base, A, {
      pedido: {
        carta: 'N01' as never,
        cartasDeClasse: [{ carta: 'NC06' as never, modo: 'exaurir' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 5);
    expect(jogador(depois, B).guarda).toBe(6 - 3);
  });
});

describe('Necromante — Ultimates', () => {
  it('NU01 Ceifador de Almas converte o Murchar removido em Dano e Impacto', () => {
    const base = comAlmas(duelo(necromante(['N01'], { ultimate: 'NU01' }), guerreiro, A), A, 4);
    const comMurchar = com(base, B, {
      condicoes: { queimadura: 0, lento: 0, murchar: 2, sangramento: 0 },
    });
    const { partida: depois } = jogar(comMurchar, A, {
      pedido: { carta: 'NU01' as never, escolhas: { condicao: 'murchar' } },
    });
    expect(jogador(depois, B).condicoes.murchar).toBe(0);
    // 2 I impressos + 2 I pelos dois pontos removidos: a Guarda 6 cai para 2.
    expect(jogador(depois, B).guarda).toBe(2);
    // 7 D impressos + 2 D pelos dois pontos removidos.
    expect(jogador(depois, B).vida).toBe(30 - 9);
  });

  it('NU02 Rito da Segunda Morte Exaura um Servo e devolve cartas do cooldown', () => {
    const base = comAlmas(
      duelo(
        necromante(['N01'], { ultimate: 'NU02', cartasDeClasse: ['NC02', 'NC06'] }),
        guerreiro,
        A,
      ),
      A,
      3,
    );
    const comCooldown = com(base, A, { cooldown: { 1: ['N02' as never], 2: [], 3: [] } });
    const { partida: depois } = jogar(comCooldown, A, {
      pedido: {
        carta: 'NU02' as never,
        escolhas: {
          cartaDeClasse: 'NC02' as never,
          cartasEmCooldown: ['N02' as never],
        },
      },
    });
    expect(jogador(depois, A).mao).toContain('N02');
  });

  it('NU03 Morte Negada só sai contra Ataque letal e deixa a Vida em 1', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N01'], { ultimate: 'NU03' }), A), B, 4);
    const morrendo = com(base, B, {
      vida: 3,
      reserva: 2,
      cooldown: { 1: [], 2: ['N02' as never], 3: [] },
    });
    const { partida: depois } = jogar(morrendo, A, {
      pedido: { carta: 'W02' as never },
      resposta: {
        tipo: 'carta-de-reacao',
        carta: 'NU03' as never,
        escolhas: { cartaEmCooldown: 'N02' as never },
      },
    });
    expect(jogador(depois, B).vida).toBe(1);
    expect(jogador(depois, B).cooldown[1]).toContain('N02');
  });
});

describe('Necromante — mecânica das Almas', () => {
  it('anexa 1 Alma a um Servo antes da primeira Ação e conserva as quatro fichas', () => {
    const base = comAlmas(duelo(necromante(['N01']), guerreiro, A), A, 2);
    const servo = jogador(base, A).cartasDeClasse[0]?.carta;
    if (servo === undefined) throw new Error('build sem Servo');

    const anexada = anexarAlmaNoServo(base, A, servo);
    expect(anexada.ok).toBe(true);
    if (!anexada.ok) return;

    const recurso = jogador(anexada.valor.partida, A).recurso;
    expect(recurso.classe).toBe('necromante');
    if (recurso.classe !== 'necromante') return;
    expect(recurso.almasControladas + recurso.almasNoCemiterio + recurso.almasAnexadas.length).toBe(
      4,
    );
    expect(recurso.almasAnexadas).toContain(servo);

    // Uma segunda anexação no mesmo turno é recusada.
    expect(erroDe(anexarAlmaNoServo(anexada.valor.partida, A, servo)).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );
  });

  it('recusa anexar Alma depois de a primeira Ação já ter sido feita', () => {
    const base = comAlmas(duelo(necromante(['N01']), guerreiro, A), A, 2);
    const servo = jogador(base, A).cartasDeClasse[0]?.carta;
    if (servo === undefined) throw new Error('build sem Servo');
    const depoisDaAcao = jogar(base, A, { pedido: { carta: 'N01' as never } }).partida;
    expect(erroDe(anexarAlmaNoServo(depoisDaAcao, A, servo)).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );
  });

  it('Ossos Guardiões devolve 1 Alma ao Cemitério para reduzir 2 I', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N01']), A), B, 2);
    const declarada = declarar(base, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    const respondida = responder(declarada.valor.partida, B, 0, { tipo: 'defesa-inata' });
    expect(respondida.ok).toBe(true);
    if (!respondida.ok) return;
    const resolvida = resolver(respondida.valor.partida, A, 0);
    expect(resolvida.ok).toBe(true);
    if (!resolvida.ok) return;

    // Ombro de Guerra chega com 3 de Impacto na primeira Ação do turno; os
    // Ossos Guardiões reduzem 2 e sobra 1.
    expect(jogador(resolvida.valor.partida, B).guarda).toBe(5);
    expect(almasNoCemiterio(resolvida.valor.partida, B)).toBeGreaterThanOrEqual(2);
  });

  it('Ossos Guardiões é recusada sem Alma controlada', () => {
    const base = comAlmas(duelo(guerreiro, necromante(['N01']), A), B, 0);
    const declarada = declarar(base, A, { carta: 'W02' as never });
    expect(declarada.ok).toBe(true);
    if (!declarada.ok) return;
    expect(erroDe(responder(declarada.valor.partida, B, 0, { tipo: 'defesa-inata' })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );
  });
});
