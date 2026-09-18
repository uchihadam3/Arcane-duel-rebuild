import { describe, expect, it } from 'vitest';
import type { CardId, EstadoDaPartida, EstadoDeJogador, PlayerId } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';

import { conferirInvariantes, conferirInvariantesDaTransicao } from './invariantes.js';
import { A, B, build, carta, com, duelo, jogador, jogar, virarTurno } from '../teste-apoio.js';
import { anexarAlmaNoServo, declarar, resolver } from '../partida.js';

/*
 * As invariantes do estado, de instantâneo e de transição.
 *
 * Cada prova aqui monta um estado à mão e confere se a invariante acusa o que
 * deve acusar — e, tão importante quanto, se ela **não** acusa o que o
 * documento não proíbe.
 */

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

const quebras = (partida: EstadoDaPartida): string => conferirInvariantes(partida).join(' | ');

const comRecurso = (
  partida: EstadoDaPartida,
  id: PlayerId,
  recurso: EstadoDeJogador['recurso'],
): EstadoDaPartida => com(partida, id, { recurso });

/** Põe as Almas em uma repartição exata, inclusive uma inválida de propósito. */
const comAlmasCruas = (
  partida: EstadoDaPartida,
  controladas: number,
  cemiterio: number,
  anexadas: readonly CardId[],
): EstadoDaPartida =>
  comRecurso(partida, A, {
    classe: 'necromante',
    almasControladas: controladas,
    almasNoCemiterio: cemiterio,
    almasAnexadas: anexadas,
  });

const necromante = (): EstadoDaPartida =>
  duelo(build('necromante', { cartasDeClasse: ['NC01', 'NC02'] }), guerreiro, A);

describe('conservação das quatro Almas', () => {
  it('aceita o estado inicial: 2 controladas + 2 no Cemitério + 0 anexadas', () => {
    const partida = necromante();
    const recurso = jogador(partida, A).recurso;
    expect(recurso.classe === 'necromante' ? recurso.almasControladas : -1).toBe(2);
    expect(recurso.classe === 'necromante' ? recurso.almasNoCemiterio : -1).toBe(2);
    expect(recurso.classe === 'necromante' ? recurso.almasAnexadas : ['x']).toEqual([]);
    expect(conferirInvariantes(partida)).toEqual([]);
  });

  it('aceita 1 controlada + 2 no Cemitério + 1 anexada', () => {
    const partida = comAlmasCruas(necromante(), 1, 2, [carta('NC01')]);
    expect(conferirInvariantes(partida)).toEqual([]);
  });

  it('aceita 0 controladas + 2 no Cemitério + 2 anexadas', () => {
    const partida = comAlmasCruas(necromante(), 0, 2, [carta('NC01'), carta('NC02')]);
    expect(conferirInvariantes(partida)).toEqual([]);
  });

  it('acusa um total de 3 fichas', () => {
    const partida = comAlmasCruas(necromante(), 1, 1, [carta('NC01')]);
    expect(quebras(partida)).toContain('as 4 Almas viraram 3');
  });

  it('acusa um total de 5 fichas', () => {
    const partida = comAlmasCruas(necromante(), 2, 2, [carta('NC01')]);
    expect(quebras(partida)).toContain('as 4 Almas viraram 5');
  });

  it('acusa o mesmo Servo segurando duas Almas', () => {
    const partida = comAlmasCruas(necromante(), 0, 2, [carta('NC01'), carta('NC01')]);
    expect(quebras(partida)).toContain('o Servo NC01 aparece com duas Almas anexadas');
  });

  it('acusa Alma anexada a um Servo que não é Carta de Classe do Necromante', () => {
    const partida = comAlmasCruas(necromante(), 1, 2, [carta('NC05')]);
    expect(quebras(partida)).toContain('não é Carta de Classe dele');
  });

  it('mantém o total em 4 durante anexar e liberar, passando pelo motor', () => {
    const total = (partida: EstadoDaPartida): number => {
      const recurso = jogador(partida, A).recurso;
      if (recurso.classe !== 'necromante') return -1;
      return recurso.almasControladas + recurso.almasNoCemiterio + recurso.almasAnexadas.length;
    };

    // A Alma é anexada antes da primeira Ação do turno, pelo comando próprio.
    const inicial = duelo(
      build('necromante', { habilidades: ['N01'], cartasDeClasse: ['NC01', 'NC06'] }),
      guerreiro,
      A,
    );
    expect(total(inicial)).toBe(4);
    expect(conferirInvariantes(inicial)).toEqual([]);

    const anexada = anexarAlmaNoServo(inicial, A, carta('NC01'));
    expect(anexada.ok).toBe(true);
    const comAlma = anexada.ok ? anexada.valor.partida : inicial;
    const recurso = jogador(comAlma, A).recurso;
    expect(recurso.classe === 'necromante' ? recurso.almasAnexadas : []).toEqual(['NC01']);
    expect(recurso.classe === 'necromante' ? recurso.almasControladas : -1).toBe(1);
    expect(total(comAlma)).toBe(4);
    expect(conferirInvariantes(comAlma)).toEqual([]);

    // Exaurir o Servo com a Alma em cima manda a ficha para o Cemitério.
    const usada = jogar(comAlma, A, {
      pedido: {
        carta: carta('N01'),
        cartasDeClasse: [{ carta: carta('NC01'), modo: 'exaurir' }],
      },
    }).partida;
    const depois = jogador(usada, A).recurso;
    expect(depois.classe === 'necromante' ? depois.almasAnexadas : ['x']).toEqual([]);
    expect(total(usada)).toBe(4);
    expect(conferirInvariantes(usada)).toEqual([]);
  });
});

describe('pontos de Ação', () => {
  it('acusa AP negativo', () => {
    const partida = com(duelo(guerreiro, guerreiro, A), A, { pontosDeAcao: -1 });
    expect(quebras(partida)).toContain('pontos de Ação negativo');
  });

  it('não acusa AP acima de sete: o documento não define esse teto', () => {
    // §6 dá cinco AP no início do turno e §7 dá o Impulso de exatamente um
    // ponto; Reserva é outra moeda, com máximo próprio. Nenhum trecho define
    // teto universal de AP depois que um efeito recupera pontos, então a
    // invariante não inventa um.
    const partida = com(duelo(guerreiro, guerreiro, A), A, { pontosDeAcao: 9 });
    expect(conferirInvariantes(partida)).toEqual([]);
  });
});

describe('limite de Ações por turno', () => {
  const comAcoes = (
    partida: EstadoDaPartida,
    realizadas: number,
    permitidas: number,
    quartoEspacoAberto: boolean,
  ): EstadoDaPartida => {
    const dono = jogador(partida, A);
    return com(partida, A, {
      acoesRealizadasNoTurno: realizadas,
      acoesPermitidasNoTurno: permitidas,
      acoes: [
        dono.acoes[0],
        dono.acoes[1],
        dono.acoes[2],
        quartoEspacoAberto
          ? { ...dono.acoes[3], situacao: 'vazio' as const }
          : { ...dono.acoes[3], situacao: 'indisponivel' as const },
      ],
    });
  };

  it('acusa a quarta Ação sem permissão de carta', () => {
    const partida = comAcoes(duelo(guerreiro, guerreiro, A), 4, 3, false);
    expect(quebras(partida)).toContain('4 Ações realizadas com 3 permitidas');
  });

  it('aceita a quarta Ação liberada pela Runa Prismática Exaurida', () => {
    const mago = build('mago', {
      habilidades: ['M01', 'M02', 'M03'],
      cartasDeClasse: ['MC06', 'MC01'],
    });
    const base = duelo(mago, guerreiro, A);

    const uma = jogar(base, A, { pedido: { carta: carta('M01') } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: carta('M02') } }).partida;
    const tres = jogar(duas, A, {
      pedido: {
        carta: carta('M03'),
        cartasDeClasse: [{ carta: carta('MC06'), modo: 'exaurir' }],
      },
    }).partida;

    expect(jogador(tres, A).acoesPermitidasNoTurno).toBe(4);
    expect(jogador(tres, A).acoes[3].situacao).not.toBe('indisponivel');
    expect(conferirInvariantes(tres)).toEqual([]);

    // A quarta Ação de fato realizada continua válida.
    const quatro = comAcoes(tres, 4, 4, true);
    expect(conferirInvariantes(quatro)).toEqual([]);
  });

  it('acusa a quinta Ação mesmo com a quarta liberada', () => {
    const partida = comAcoes(duelo(guerreiro, guerreiro, A), 5, 4, true);
    expect(quebras(partida)).toContain('5 Ações realizadas com 4 permitidas');
  });

  it('acusa permissão de quatro sem o quarto espaço aberto', () => {
    const partida = comAcoes(duelo(guerreiro, guerreiro, A), 0, 4, false);
    expect(quebras(partida)).toContain('quarta Ação permitida sem o quarto espaço aberto');
  });

  it('acusa o quarto espaço aberto sem carta que o libere', () => {
    const partida = comAcoes(duelo(guerreiro, guerreiro, A), 0, 3, true);
    expect(quebras(partida)).toContain('quarto espaço aberto sem carta que o libere');
  });
});

describe('recursos das doze classes', () => {
  it('aceita o estado inicial de todas as classes', () => {
    const classes = [
      'guerreiro',
      'mago',
      'clerigo',
      'necromante',
      'paladino',
      'ladino',
      'bardo',
      'monge',
      'patrulheiro',
      'barbaro',
      'druida',
      'bruxo',
    ] as const;
    for (const classe of classes) {
      expect(conferirInvariantes(duelo(build(classe), build(classe), A)), classe).toEqual([]);
    }
  });

  it('acusa Devoção fora da trilha do Clérigo', () => {
    const partida = comRecurso(duelo(build('clerigo'), guerreiro, A), A, {
      classe: 'clerigo',
      devocao: 'transcendencia' as never,
    });
    expect(quebras(partida)).toContain('estágio de Devoção fora da trilha');
  });

  it('acusa Juramento fora da trilha do Paladino', () => {
    const partida = comRecurso(duelo(build('paladino'), guerreiro, A), A, {
      classe: 'paladino',
      juramento: 'quebrado' as never,
    });
    expect(quebras(partida)).toContain('estado de Juramento fora da trilha');
  });

  it('acusa Forma fora das duas do Druida', () => {
    const partida = comRecurso(duelo(build('druida'), guerreiro, A), A, {
      classe: 'druida',
      forma: 'aquatica' as never,
      metamorfoseGratuitaUsadaNoTurno: false,
    });
    expect(quebras(partida)).toContain('Forma fora das duas impressas');
  });

  it('exige que a Marca da Presa continue booleana e fora das Condições', () => {
    const base = duelo(build('patrulheiro'), guerreiro, A);
    expect(conferirInvariantes(base)).toEqual([]);
    const dono = jogador(base, A);
    expect(Object.keys(dono.condicoes)).not.toContain('marcaDaPresa');

    const quebrado = comRecurso(base, A, {
      classe: 'patrulheiro',
      marcaDaPresa: 1 as never,
    });
    expect(quebras(quebrado)).toContain('Marca da Presa deixou de ser booleana');
  });

  it('exige que o Preço Proibido do Bruxo continue booleano', () => {
    const partida = comRecurso(duelo(build('bruxo'), guerreiro, A), A, {
      classe: 'bruxo',
      precoProibidoUsadoNoTurno: 2 as never,
    });
    expect(quebras(partida)).toContain('Preço Proibido usado no turno deixou de ser booleano');
  });

  it('acusa número e estado errados nas pedras de Chi do Monge', () => {
    const base = duelo(build('monge'), guerreiro, A);
    const poucas = comRecurso(base, A, {
      classe: 'monge',
      chi: ['pronta', 'pronta'] as never,
      sequenciaDeKata: [],
    });
    expect(quebras(poucas)).toContain('as pedras de Chi viraram 2');

    const estranha = comRecurso(base, A, {
      classe: 'monge',
      chi: ['pronta', 'quebrada', 'gasta'] as never,
      sequenciaDeKata: [],
    });
    expect(quebras(estranha)).toContain('pedra de Chi em estado desconhecido');
  });
});

describe('invariantes de transição', () => {
  const semTransicao = (anterior: EstadoDaPartida, posterior: EstadoDaPartida): readonly string[] =>
    conferirInvariantesDaTransicao(anterior, posterior);

  it('não acusa nada numa partida que só avança', () => {
    const base = duelo(guerreiro, guerreiro, A);
    const depois = jogar(base, A, { pedido: { carta: carta('W01') } }).partida;
    expect(semTransicao(base, depois)).toEqual([]);
  });

  it('acusa Carta de Classe Exaurida que volta ao campo', () => {
    const mago = build('mago', { habilidades: ['M01'], cartasDeClasse: ['MC01', 'MC02'] });
    const base = duelo(mago, guerreiro, A);
    const exauriu = jogar(base, A, {
      pedido: {
        carta: carta('M01'),
        cartasDeClasse: [{ carta: carta('MC01'), modo: 'exaurir' }],
      },
    }).partida;

    expect(jogador(exauriu, A).removidas).toContain('MC01');
    expect(semTransicao(base, exauriu)).toEqual([]);

    const ressuscitada = com(exauriu, A, {
      cartasDeClasse: [
        ...jogador(exauriu, A).cartasDeClasse,
        { carta: carta('MC01'), estado: 'pronta' as const },
      ],
    });
    expect(semTransicao(exauriu, ressuscitada).join(' | ')).toContain(
      'MC01 voltou ao campo como pronta depois de Exaurida',
    );
  });

  it('acusa Carta de Classe que sai das removidas', () => {
    const mago = build('mago', { habilidades: ['M01'], cartasDeClasse: ['MC01', 'MC02'] });
    const base = duelo(mago, guerreiro, A);
    const exauriu = jogar(base, A, {
      pedido: {
        carta: carta('M01'),
        cartasDeClasse: [{ carta: carta('MC01'), modo: 'exaurir' }],
      },
    }).partida;

    const apagada = com(exauriu, A, { removidas: [] });
    expect(semTransicao(exauriu, apagada).join(' | ')).toContain(
      'MC01 saiu das cartas removidas depois de Exaurida',
    );
  });

  it('acusa Ultimate Consumida que volta a Disponível', () => {
    const base = duelo(
      build('guerreiro', { habilidades: ['W01'], ultimate: 'WU01' }),
      guerreiro,
      A,
    );
    const comMomentum = com(base, A, { recurso: { classe: 'guerreiro', momentum: 3 } });
    const usou = jogar(comMomentum, A, { pedido: { carta: carta('WU01') } }).partida;
    expect(jogador(usou, A).ultimate.estado).toBe('consumida');
    expect(semTransicao(comMomentum, usou)).toEqual([]);

    const devolta = com(usou, A, {
      ultimate: { carta: carta('WU01'), estado: 'disponivel' as const },
    });
    expect(semTransicao(usou, devolta).join(' | ')).toContain(
      'voltou a disponivel depois de Consumida',
    );
  });

  it('atravessa uma partida inteira sem quebrar transição nenhuma', () => {
    let anterior = duelo(build('necromante'), build('bruxo'), A);
    const passos: EstadoDaPartida[] = [];
    let atual = anterior;
    for (let vez = 0; vez < 4; vez += 1) {
      atual = virarTurno(atual, vez % 2 === 0 ? A : B);
      passos.push(atual);
    }
    for (const passo of passos) {
      expect(conferirInvariantes(passo)).toEqual([]);
      expect(semTransicao(anterior, passo)).toEqual([]);
      anterior = passo;
    }
  });
});

describe('o observador enxerga os estados intermediários', () => {
  it('confere invariantes em cada estado de uma Ação declarada e resolvida', () => {
    const base = duelo(
      build('necromante', { habilidades: ['N01'], cartasDeClasse: ['NC01', 'NC06'] }),
      guerreiro,
      A,
    );
    const anexada = anexarAlmaNoServo(base, A, carta('NC01'));
    const comAlma = anexada.ok ? anexada.valor.partida : base;

    const declarada = declarar(comAlma, A, { carta: carta('N01') });
    const emJogo = declarada.ok ? declarada.valor.partida : comAlma;
    const resolvida = resolver(emJogo, A, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : emJogo;

    // Cada instantâneo passa, e cada transição entre eles também.
    for (const estado of [comAlma, emJogo, fim]) {
      expect(conferirInvariantes(estado)).toEqual([]);
    }
    expect(conferirInvariantesDaTransicao(comAlma, emJogo)).toEqual([]);
    expect(conferirInvariantesDaTransicao(emJogo, fim)).toEqual([]);
  });
});

/** Guarda para o caso de um identificador de Servo mudar de forma. */
it('os Servos do Necromante continuam sendo Cartas de Classe NC', () => {
  for (const codigo of ['NC01', 'NC02', 'NC03', 'NC04', 'NC05', 'NC06']) {
    expect(cardId(codigo)).toBe(codigo);
  }
});
