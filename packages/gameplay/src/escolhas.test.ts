import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comRecurso,
  duelo,
  erroDe,
  jogador,
  jogar,
  virarTurno,
  comCartaEmCooldown,
} from './teste-apoio.js';
import {
  ativarPassivaNaAcao,
  declarar,
  resolver,
  resolverEscolhaPendente,
  responder,
} from './partida.js';

/*
 * O motor não inventa escolha.
 *
 * Onde o texto impresso diz "escolha", "você pode", "Ative" ou "gaste até", a
 * decisão precisa chegar no comando. Faltando, a jogada é recusada com erro
 * tipado — o motor não completa a frase com a primeira opção que encontrar.
 */

const mago = (
  habilidades: readonly string[],
  extras: {
    readonly passivas?: readonly string[];
    readonly cartasDeClasse?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('mago', { habilidades, ...extras });

const guerreiro = (
  habilidades: readonly string[],
  extras: { readonly passivas?: readonly string[] } = {},
): ReturnType<typeof build> => build('guerreiro', { habilidades, ...extras });

const estadoDaRuna = (partida: ReturnType<typeof duelo>, carta: string): string =>
  jogador(partida, A).cartasDeClasse.find((item) => item.carta === carta)?.estado ?? 'ausente';

/** Deixa as duas Runas do Mago Ativadas, para forçar uma escolha real. */
const comDuasRunasAtivadas = (habilidades: readonly string[]): ReturnType<typeof duelo> => {
  const partida = duelo(mago(['M01', ...habilidades]), guerreiro(['W01', 'W02']), A);
  return jogar(partida, A, {
    pedido: {
      carta: 'M01' as never,
      cartasDeClasse: [
        { carta: 'MC01' as never, modo: 'ativar' },
        { carta: 'MC02' as never, modo: 'ativar' },
      ],
    },
  }).partida;
};

describe('escolha de carta', () => {
  it('M14 com duas Runas Ativadas e nenhuma escolha é recusada', () => {
    const partida = comDuasRunasAtivadas(['M14']);
    expect(erroDe(declarar(partida, A, { carta: 'M14' as never })).tipo).toBe(
      'escolha-obrigatoria',
    );
  });

  it('M14 deixa Pronta apenas a Runa escolhida', () => {
    const partida = comDuasRunasAtivadas(['M14']);
    const { partida: depois } = jogar(partida, A, {
      pedido: { carta: 'M14' as never, escolhas: { cartaDeClasse: 'MC02' as never } },
    });

    expect(estadoDaRuna(depois, 'MC02')).toBe('pronta');
    expect(estadoDaRuna(depois, 'MC01')).toBe('ativada');
  });

  it('M14 recusa uma Runa que não está Ativada', () => {
    const partida = comDuasRunasAtivadas(['M14']);
    expect(
      erroDe(
        declarar(partida, A, {
          carta: 'M14' as never,
          escolhas: { cartaDeClasse: 'MC03' as never },
        }),
      ).tipo,
    ).toBe('escolha-invalida');
  });

  it('M20 com Runa Ativada e nenhuma escolha é recusada', () => {
    const comRunas = comDuasRunasAtivadas(['M20']);
    const noTurnoInimigo = virarTurno(comRunas, A);
    const declarada = declarar(noTurnoInimigo, B, { carta: 'W01' as never });
    const base = declarada.ok ? declarada.valor.partida : noTurnoInimigo;

    expect(
      erroDe(responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'M20' as never })).tipo,
    ).toBe('escolha-obrigatoria');
  });

  it('M13 não escolhe sozinha a carta de CD1', () => {
    // M01 está em CD1 e M02 em CD2, então há exatamente uma opção — e mesmo
    // assim o motor não escolhe por quem joga. As duas são postas nas zonas
    // direto: uma carta usada neste turno ainda estaria no campo (§11).
    let partida = duelo(mago(['M01', 'M02', 'M13']), guerreiro(['W01']), A);
    partida = comCartaEmCooldown(partida, A, 'M01', 1);
    partida = comCartaEmCooldown(partida, A, 'M02', 2);
    expect(erroDe(declarar(partida, A, { carta: 'M13' as never })).tipo).toBe(
      'escolha-obrigatoria',
    );
  });

  it('MU03 exige a lista de cartas a devolver, mesmo que seja vazia', () => {
    const partida = duelo(mago(['M01', 'M11'], { ultimate: 'MU03' }), guerreiro(['W01']), A);
    const comCooldown = comCartaEmCooldown(partida, A, 'M01', 1);
    const comMana = comRecurso(comCooldown, A, 3);

    expect(erroDe(declarar(comMana, A, { carta: 'MU03' as never })).tipo).toBe(
      'escolha-obrigatoria',
    );

    const semDevolver = declarar(comMana, A, {
      carta: 'MU03' as never,
      escolhas: { cartasEmCooldown: [] },
    });
    expect(semDevolver.ok).toBe(true);
  });
});

describe('escolha de reforço', () => {
  it('M08 exige +1 D ou +1 I quando Ativa uma Runa', () => {
    const partida = duelo(mago(['M08']), guerreiro(['W01']), A);
    expect(
      erroDe(
        declarar(partida, A, {
          carta: 'M08' as never,
          cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
        }),
      ).tipo,
    ).toBe('escolha-obrigatoria');
  });

  it('M08 recusa um reforço informado sem Ativar Runa nenhuma', () => {
    const partida = duelo(mago(['M08']), guerreiro(['W01']), A);
    expect(
      erroDe(declarar(partida, A, { carta: 'M08' as never, escolhas: { reforco: 'dano' } })).tipo,
    ).toBe('escolha-invalida');
  });

  it('M09 exige o reforço na segunda Ação', () => {
    const partida = duelo(mago(['M01', 'M09']), guerreiro(['W01']), A);
    const primeira = jogar(partida, A, { pedido: { carta: 'M01' as never } }).partida;
    expect(erroDe(declarar(primeira, A, { carta: 'M09' as never })).tipo).toBe(
      'escolha-obrigatoria',
    );
  });

  it('MP08 Geometria Rúnica exige o reforço dela', () => {
    const comGeometria = mago(['M01'], { passivas: ['MP08', 'MP04', 'MP09', 'MP07'] });
    const partida = duelo(comGeometria, guerreiro(['W01']), A);
    // Revela ao Ativar a primeira Runa; no turno seguinte a escolha é exigida.
    const revelada = jogar(partida, A, {
      pedido: {
        carta: 'M01' as never,
        escolhas: { reforco: 'dano' },
        cartasDeClasse: [{ carta: 'MC01' as never, modo: 'ativar' }],
      },
    }).partida;
    const proximoTurno = virarTurno(virarTurno(revelada, A), B);

    expect(
      erroDe(
        declarar(proximoTurno, A, {
          carta: 'M02' as never,
          cartasDeClasse: [{ carta: 'MC02' as never, modo: 'ativar' }],
        }),
      ).tipo,
    ).toBe('escolha-obrigatoria');
  });

  it('MP10 Núcleo Sobrecarregado exige o reforço dela', () => {
    const comNucleo = mago(['M05', 'M07', 'M01'], { passivas: ['MP10', 'MP04', 'MP09', 'MP07'] });
    const partida = duelo(comNucleo, guerreiro(['W01']), A);
    const revelada = jogar(partida, A, { pedido: { carta: 'M05' as never } }).partida;
    const proximoTurno = virarTurno(virarTurno(revelada, A), B);

    // A Onda Glacial também custa 2 Mana: o gatilho vale e a escolha é exigida.
    expect(erroDe(declarar(proximoTurno, A, { carta: 'M07' as never })).tipo).toBe(
      'escolha-obrigatoria',
    );
  });

  it('WP10 Guarda de Veterano exige escolher entre D e I', () => {
    const comGuarda = guerreiro(['W15', 'W01'], { passivas: ['WP10', 'WP05', 'WP09', 'WP02'] });
    const partida = duelo(comGuarda, mago(['M01', 'M02']), A);
    const revelada = virarTurno(partida, A);

    const declarada = declarar(revelada, B, { carta: 'M01' as never });
    const base = declarada.ok ? declarada.valor.partida : revelada;
    expect(
      erroDe(responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'W15' as never })).tipo,
    ).toBe('escolha-obrigatoria');
  });

  it('Guarda Marcial exige escolher entre reduzir 1 D e 1 I', () => {
    const partida = duelo(guerreiro(['W01']), mago(['M02']), B);
    const declarada = declarar(partida, B, { carta: 'M02' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    expect(erroDe(responder(base, A, 0, { tipo: 'defesa-inata' })).tipo).toBe(
      'escolha-obrigatoria',
    );
  });

  it('W05 exige informar quanto Momentum gastar', () => {
    const partida = comRecurso(duelo(guerreiro(['W05']), mago(['M01']), A), A, 2);
    expect(erroDe(declarar(partida, A, { carta: 'W05' as never })).tipo).toBe(
      'escolha-obrigatoria',
    );
  });

  it('M10 exige informar quanta Mana adicional gastar', () => {
    const partida = comRecurso(duelo(mago(['M10']), guerreiro(['W01']), A), A, 5);
    expect(erroDe(declarar(partida, A, { carta: 'M10' as never })).tipo).toBe(
      'escolha-obrigatoria',
    );
  });
});

describe('Passiva opcional não Ativa sozinha', () => {
  const comInstinto = guerreiro(['W01', 'W15'], {
    passivas: ['WP01', 'WP05', 'WP09', 'WP02'],
  });

  it('WP01 Instinto de Ferro não reduz o Impacto por conta própria', () => {
    const inicial = duelo(comInstinto, mago(['M04', 'M01']), B);
    const partida = comRecurso(com(inicial, A, { guarda: 3 }), A, 2);
    const { partida: depois, eventos } = jogar(partida, B, { pedido: { carta: 'M04' as never } });

    // Ela se revela — isso é automático e está no texto —, mas a Ativação
    // renovável não acontece sem o jogador pedir, e o Momentum fica intacto.
    expect(eventos.some((evento) => evento.tipo === 'passiva-ativada')).toBe(false);
    const recurso = jogador(depois, A).recurso;
    expect(recurso.classe === 'guerreiro' ? recurso.momentum : -1).toBe(2);
  });

  it('MP03 Véu Prismático não gasta Mana por conta própria', () => {
    const comVeu = mago(['M15', 'M01'], { passivas: ['MP03', 'MP04', 'MP09', 'MP07'] });
    const inicial = duelo(comVeu, guerreiro(['W08', 'W01']), B);
    const partida = com(inicial, A, { guarda: 3 });
    const manaAntes = jogador(partida, A).recurso;

    const { partida: depois, eventos } = jogar(partida, B, { pedido: { carta: 'W08' as never } });

    expect(eventos.some((evento) => evento.tipo === 'passiva-ativada')).toBe(false);
    const depoisRecurso = jogador(depois, A).recurso;
    expect(depoisRecurso.classe === 'mago' ? depoisRecurso.mana : -1).toBe(
      manaAntes.classe === 'mago' ? manaAntes.mana : -1,
    );
  });
});

describe('escolha pendente', () => {
  it('MP05 registra a escolha em vez de pegar a primeira carta', () => {
    const comPressao = mago(['M01', 'M02'], { passivas: ['MP05', 'MP04', 'MP09', 'MP07'] });
    const inicial = duelo(comPressao, guerreiro(['W08', 'W01']), A);

    const comCooldown = jogar(inicial, A, { pedido: { carta: 'M01' as never } }).partida;
    const comDois = jogar(comCooldown, A, { pedido: { carta: 'M02' as never } }).partida;
    const noTurnoInimigo = com(virarTurno(comDois, A), A, { guarda: 4 });

    const { partida: depois } = jogar(noTurnoInimigo, B, { pedido: { carta: 'W08' as never } });

    const pendente = depois.escolhasPendentes.find((escolha) => escolha.jogador === A);
    expect(pendente?.efeito).toBe('devolver-a-mao');
    expect(pendente?.opcoes).toContain('M01');
    // Nada saiu do cooldown sozinho.
    expect(jogador(depois, A).cooldown[1]).toContain('M01');
  });

  it('o dono não age enquanto a escolha estiver pendente, e age depois de resolvê-la', () => {
    const comPressao = mago(['M01', 'M02'], { passivas: ['MP05', 'MP04', 'MP09', 'MP07'] });
    const inicial = duelo(comPressao, guerreiro(['W08', 'W01']), A);
    const comCooldown = jogar(inicial, A, { pedido: { carta: 'M01' as never } }).partida;
    const noTurnoInimigo = com(virarTurno(comCooldown, A), A, { guarda: 4 });
    const { partida: comPendencia } = jogar(noTurnoInimigo, B, {
      pedido: { carta: 'W08' as never },
    });

    // Ainda no turno inimigo: o Mago não consegue nem responder enquanto deve
    // uma escolha.
    const outra = declarar(comPendencia, B, { carta: 'W01' as never });
    const comSegundaAcao = outra.ok ? outra.valor.partida : comPendencia;
    expect(erroDe(responder(comSegundaAcao, A, 1, { tipo: 'defesa-inata' })).tipo).toBe(
      'escolha-pendente',
    );

    const resolvida = resolverEscolhaPendente(comSegundaAcao, A, 'M01' as never);
    expect(resolvida.ok).toBe(true);
    const livre = resolvida.ok ? resolvida.valor.partida : comSegundaAcao;
    expect(livre.escolhasPendentes).toHaveLength(0);
    expect(jogador(livre, A).mao).toContain('M01');

    const noTurnoDoMago = virarTurno(livre, B);
    expect(declarar(noTurnoDoMago, A, { carta: 'M02' as never }).ok).toBe(true);
  });

  it('recusa uma carta fora das opções da pendência', () => {
    const comPressao = mago(['M01', 'M02'], { passivas: ['MP05', 'MP04', 'MP09', 'MP07'] });
    const inicial = duelo(comPressao, guerreiro(['W08', 'W01']), A);
    const comCooldown = jogar(inicial, A, { pedido: { carta: 'M01' as never } }).partida;
    const noTurnoInimigo = com(virarTurno(comCooldown, A), A, { guarda: 4 });
    const { partida: comPendencia } = jogar(noTurnoInimigo, B, {
      pedido: { carta: 'W08' as never },
    });

    expect(erroDe(resolverEscolhaPendente(comPendencia, A, 'M02' as never)).tipo).toBe(
      'escolha-invalida',
    );
  });
});

describe('Ativar Passiva é uma transição de estado de verdade', () => {
  const comInstinto = guerreiro(['W01', 'W15'], {
    passivas: ['WP01', 'WP05', 'WP09', 'WP02'],
  });

  const comAmeacaDeRuptura = (): {
    readonly partida: ReturnType<typeof duelo>;
    readonly indice: 0;
  } => {
    // Guarda 1 contra 3 de Impacto: mesmo depois dos 2 I que a revelação já
    // reduz, ainda sobra Ruptura para a Ativação impedir.
    const inicial = duelo(comInstinto, mago(['M04', 'M01']), B);
    const partida = comRecurso(com(inicial, A, { guarda: 1 }), A, 2);
    const declarada = declarar(partida, B, { carta: 'M04' as never });
    return { partida: declarada.ok ? declarada.valor.partida : partida, indice: 0 };
  };

  it('Passiva oculta não pode Ativar', () => {
    const { partida, indice } = comAmeacaDeRuptura();
    const oculta = com(partida, A, {
      passivas: jogador(partida, A).passivas.map((passiva) => ({ ...passiva, estado: 'oculta' })),
    });
    expect(erroDe(ativarPassivaNaAcao(oculta, A, indice, 'WP01' as never)).tipo).toBe(
      'passiva-ainda-oculta',
    );
  });

  it('Passiva revelada e Pronta Ativa, e o estado muda', () => {
    const { partida, indice } = comAmeacaDeRuptura();
    expect(jogador(partida, A).passivas.find((passiva) => passiva.carta === 'WP01')?.estado).toBe(
      'pronta',
    );

    const ativada = ativarPassivaNaAcao(partida, A, indice, 'WP01' as never);
    expect(ativada.ok).toBe(true);
    const depois = ativada.ok ? ativada.valor.partida : partida;

    expect(
      ativada.ok && ativada.valor.eventos.some((evento) => evento.tipo === 'passiva-ativada'),
    ).toBe(true);
    expect(jogador(depois, A).passivas.find((passiva) => passiva.carta === 'WP01')?.estado).toBe(
      'ativada',
    );
    const recurso = jogador(depois, A).recurso;
    expect(recurso.classe === 'guerreiro' ? recurso.momentum : -1).toBe(1);
  });

  it('não Ativa de novo enquanto estiver Ativada', () => {
    const { partida, indice } = comAmeacaDeRuptura();
    const primeira = ativarPassivaNaAcao(partida, A, indice, 'WP01' as never);
    const depois = primeira.ok ? primeira.valor.partida : partida;

    expect(erroDe(ativarPassivaNaAcao(depois, A, indice, 'WP01' as never)).tipo).toBe(
      'passiva-nao-esta-pronta',
    );
  });

  it('volta a ficar Pronta no início do próprio turno e nunca é Exaurida', () => {
    const { partida, indice } = comAmeacaDeRuptura();
    const ativada = ativarPassivaNaAcao(partida, A, indice, 'WP01' as never);
    const comAtivada = ativada.ok ? ativada.valor.partida : partida;

    const resolvida = resolver(comAtivada, B, indice);
    const fim = resolvida.ok ? resolvida.valor.partida : comAtivada;
    const noTurnoDoGuerreiro = virarTurno(fim, B);

    const estado = jogador(noTurnoDoGuerreiro, A).passivas.find(
      (passiva) => passiva.carta === 'WP01',
    )?.estado;
    expect(estado).toBe('pronta');
    // O tipo não admite `exaurida`; aqui fica registrado que nenhum caminho leva a ela.
    expect(['oculta', 'pronta', 'ativada']).toContain(estado);
  });

  it('a Ativação reduz o Impacto que ameaçava a Ruptura', () => {
    const { partida, indice } = comAmeacaDeRuptura();
    const ativada = ativarPassivaNaAcao(partida, A, indice, 'WP01' as never);
    const comAtivada = ativada.ok ? ativada.valor.partida : partida;

    const resolvida = resolver(comAtivada, B, indice);
    const fim = resolvida.ok ? resolvida.valor.partida : comAtivada;
    const eventos = resolvida.ok ? resolvida.valor.eventos : [];

    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(false);
    expect(jogador(fim, A).guarda).toBe(1);
  });
});
