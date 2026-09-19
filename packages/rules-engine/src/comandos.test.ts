import type { EstadoDaPartida } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { declararAcao, registrarModificador, registrarResposta, resolverAcao } from './comandos.js';
import { encerrarTurno, iniciarTurno } from './turno.js';
import { validarPartida } from './validacao.js';
import {
  CARTA_A1,
  CARTA_A2,
  CARTA_A3,
  CARTA_A4,
  CARTA_B1,
  ID_A,
  ID_B,
  exigirSucesso,
  jogadorDe,
  partidaEmAndamento,
  perfil,
  perfilDeReacao,
} from './teste-partida.js';

const declarar = (partida: EstadoDaPartida, carta = CARTA_A1, opcoes = {}): EstadoDaPartida =>
  exigirSucesso(declararAcao(partida, ID_A, perfil(carta, opcoes))).partida;

const resolver = (partida: EstadoDaPartida, indice: 0 | 1 | 2 = 0): EstadoDaPartida =>
  exigirSucesso(resolverAcao(partida, ID_A, indice)).partida;

/**
 * Encerra o turno de A.
 *
 * É aqui que as habilidades usadas saem do campo e entram no cooldown (§11).
 * Vários testes de cooldown passam por esta função porque, sem ela, a carta
 * ainda está no espaço de Ação — que é exatamente a regra.
 */
const encerrar = (partida: EstadoDaPartida): EstadoDaPartida =>
  exigirSucesso(encerrarTurno(partida, ID_A)).partida;

describe('declaração de Ação', () => {
  it('gasta os pontos de Ação do custo', () => {
    const partida = declarar(partidaEmAndamento(), CARTA_A1, { custo: 2 });
    expect(jogadorDe(partida, ID_A).pontosDeAcao).toBe(3);
  });

  it('tira a carta da mão e ocupa o próximo espaço de Ação', () => {
    const partida = declarar(partidaEmAndamento(), CARTA_A1);
    const jogador = jogadorDe(partida, ID_A);
    expect(jogador.mao).not.toContain(CARTA_A1);
    expect(jogador.acoes[0].situacao).toBe('declarada');
    expect(jogador.acoes[0].perfil?.carta).toBe(CARTA_A1);
    expect(jogador.acoes[1].situacao).toBe('vazio');
  });

  it('recusa quando não há pontos de Ação suficientes', () => {
    const resposta = declararAcao(partidaEmAndamento(), ID_A, perfil(CARTA_A1, { custo: 6 }));
    expect(!resposta.ok && resposta.erro.tipo).toBe('ap-insuficiente');
  });

  it('recusa carta que não está na mão', () => {
    const resposta = declararAcao(partidaEmAndamento(), ID_A, perfil(CARTA_B1));
    expect(!resposta.ok && resposta.erro.tipo).toBe('carta-fora-da-mao');
  });

  it('recusa Ação fora do turno do jogador', () => {
    const resposta = declararAcao(partidaEmAndamento(), ID_B, perfil(CARTA_B1));
    expect(!resposta.ok && resposta.erro.tipo).toBe('fora-do-turno');
  });

  it('recusa Ação antes do turno começar', () => {
    const partida = partidaEmAndamento();
    const semTurno: EstadoDaPartida = { ...partida, turno: { ...partida.turno!, iniciado: false } };
    const resposta = declararAcao(semTurno, ID_A, perfil(CARTA_A1));
    expect(!resposta.ok && resposta.erro.tipo).toBe('turno-nao-iniciado');
  });

  it('recusa carta paga com Reserva como Ação do próprio turno', () => {
    const partida = partidaEmAndamento();
    const reacao = { ...perfil(CARTA_A1), custo: { moeda: 'reserva' as const, valor: 1 } };
    const resposta = declararAcao(partida, ID_A, reacao);
    expect(!resposta.ok && resposta.erro.tipo).toBe('moeda-de-custo-invalida');
  });
});

describe('limite de três Ações por turno', () => {
  const tresAcoes = (): EstadoDaPartida => {
    let partida = partidaEmAndamento();
    for (const [indice, carta] of [CARTA_A1, CARTA_A2, CARTA_A3].entries()) {
      partida = declarar(partida, carta);
      partida = resolver(partida, indice as 0 | 1 | 2);
    }
    return partida;
  };

  it('permite exatamente três', () => {
    const partida = tresAcoes();
    expect(jogadorDe(partida, ID_A).acoesRealizadasNoTurno).toBe(3);
  });

  it('recusa a quarta', () => {
    const resposta = declararAcao(tresAcoes(), ID_A, perfil(CARTA_A4));
    expect(!resposta.ok && resposta.erro.tipo).toBe('limite-de-acoes-atingido');
  });
});

describe('Resposta voluntária', () => {
  it('aceita a Defesa Inata da classe', () => {
    const partida = declarar(partidaEmAndamento());
    const comResposta = exigirSucesso(
      registrarResposta(partida, ID_B, 0, { tipo: 'defesa-inata' }),
    ).partida;
    expect(jogadorDe(comResposta, ID_A).acoes[0].resposta.voluntaria?.tipo).toBe('defesa-inata');
  });

  it('aceita uma carta de Reação paga com Reserva', () => {
    const partida = declarar(partidaEmAndamento());
    const comResposta = exigirSucesso(
      registrarResposta(partida, ID_B, 0, {
        tipo: 'carta-de-reacao',
        perfil: perfilDeReacao(CARTA_B1),
      }),
    ).partida;
    expect(jogadorDe(comResposta, ID_B).reserva).toBe(1);
    expect(jogadorDe(comResposta, ID_B).mao).not.toContain(CARTA_B1);
  });

  it('recusa uma segunda Resposta voluntária contra a mesma Ação', () => {
    const partida = declarar(partidaEmAndamento());
    const comInata = exigirSucesso(
      registrarResposta(partida, ID_B, 0, { tipo: 'defesa-inata' }),
    ).partida;
    const segunda = registrarResposta(comInata, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: perfilDeReacao(CARTA_B1),
    });
    expect(!segunda.ok && segunda.erro.tipo).toBe('segunda-resposta-voluntaria');
  });

  it('recusa Reação sem Reserva suficiente', () => {
    const partida = declarar(partidaEmAndamento());
    const resposta = registrarResposta(partida, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: perfilDeReacao(CARTA_B1, { custo: 3 }),
    });
    expect(!resposta.ok && resposta.erro.tipo).toBe('reserva-insuficiente');
  });

  it('recusa Resposta a um espaço de Ação vazio', () => {
    const resposta = registrarResposta(partidaEmAndamento(), ID_B, 0, { tipo: 'defesa-inata' });
    expect(!resposta.ok && resposta.erro.tipo).toBe('acao-nao-declarada');
  });

  it('recusa o próprio atacante responder à própria Ação', () => {
    const partida = declarar(partidaEmAndamento());
    const resposta = registrarResposta(partida, ID_A, 0, { tipo: 'defesa-inata' });
    expect(!resposta.ok && resposta.erro.tipo).toBe('fora-do-turno');
  });

  /*
   * A Reação segue a mesma regra da Ação: ela fica na bandeja de Resposta até
   * o encerramento do turno, e o que a resolução produz é o agendamento dela —
   * na zona impressa **nela**, e não na da Ação a que respondeu (§11).
   */
  it('agenda o cooldown da Reação e a deixa na bandeja', () => {
    let partida = declarar(partidaEmAndamento());
    partida = exigirSucesso(
      registrarResposta(partida, ID_B, 0, {
        tipo: 'carta-de-reacao',
        perfil: perfilDeReacao(CARTA_B1),
      }),
    ).partida;
    partida = resolver(partida);
    const defensor = jogadorDe(partida, ID_B);
    expect(defensor.cooldown[1]).not.toContain(CARTA_B1);
    expect(defensor.cooldownAgendado.map((a) => String(a.carta))).toContain(CARTA_B1);
    expect(defensor.cooldownAgendado[0]?.origem.tipo).toBe('resposta');
  });
});

describe('resolução de Ação', () => {
  /*
   * A habilidade usada **não** entra no cooldown ao resolver (§11).
   *
   * Ela fica no espaço de Ação até o encerramento do turno, e o que a
   * resolução produz é o **agendamento**: a carta ganha um destino e continua
   * onde está. Quem a move é `encerrarTurno`.
   */
  it('agenda o cooldown impresso e deixa a carta no campo', () => {
    const partida = resolver(declarar(partidaEmAndamento(), CARTA_A1, { cooldown: 2 }));
    const jogador = jogadorDe(partida, ID_A);
    expect(jogador.cooldown[2]).not.toContain(CARTA_A1);
    expect(jogador.mao).not.toContain(CARTA_A1);
    expect(jogador.cooldownAgendado.map((a) => String(a.carta))).toContain(CARTA_A1);
    expect(jogador.cooldownAgendado[0]?.destino).toBe(2);
    expect(jogador.cooldownAgendado[0]?.zonaImpressa).toBe(2);
    // E ela continua ocupando o espaço de Ação, resolvida.
    expect(jogador.acoes[0]?.situacao).toBe('resolvida');
    expect(jogador.acoes[0]?.perfil?.carta).toBe(CARTA_A1);
  });

  it('conta a Ação do turno', () => {
    const partida = resolver(declarar(partidaEmAndamento()));
    expect(jogadorDe(partida, ID_A).acoesRealizadasNoTurno).toBe(1);
  });

  it('marca o espaço como resolvido e recusa resolver de novo', () => {
    const partida = resolver(declarar(partidaEmAndamento()));
    expect(jogadorDe(partida, ID_A).acoes[0].situacao).toBe('resolvida');
    const segunda = resolverAcao(partida, ID_A, 0);
    expect(!segunda.ok && segunda.erro.tipo).toBe('acao-ja-resolvida');
  });

  it('recusa resolver um espaço que não foi declarado', () => {
    const resposta = resolverAcao(partidaEmAndamento(), ID_A, 0);
    expect(!resposta.ok && resposta.erro.tipo).toBe('acao-nao-declarada');
  });

  it('aplica os modificadores registrados antes de resolver', () => {
    let partida = declarar(partidaEmAndamento(), CARTA_A1, { dano: 1, impacto: 1 });
    partida = exigirSucesso(
      registrarModificador(partida, ID_A, 0, { dano: 2, impacto: 1 }),
    ).partida;
    partida = resolver(partida);
    const alvo = jogadorDe(partida, ID_B);
    expect(alvo.guarda).toBe(6 - 2);
    expect(alvo.vida).toBe(30 - 3);
  });

  it('uma Técnica sem valores não mexe em Guarda nem em Vida', () => {
    const partida = resolver(declarar(partidaEmAndamento(), CARTA_A1, { tipo: 'tecnica' }));
    const alvo = jogadorDe(partida, ID_B);
    expect(alvo.guarda).toBe(6);
    expect(alvo.vida).toBe(30);
    expect(jogadorDe(partida, ID_A).acoesRealizadasNoTurno).toBe(1);
  });

  it('mantém a partida estruturalmente válida durante e depois da resolução', () => {
    const declarada = declarar(partidaEmAndamento());
    expect(validarPartida(declarada).ok).toBe(true);
    expect(validarPartida(resolver(declarada)).ok).toBe(true);
  });

  it('não muta o estado de entrada', () => {
    const partida = declarar(partidaEmAndamento());
    const antes = JSON.stringify(partida);
    resolverAcao(partida, ID_A, 0);
    expect(JSON.stringify(partida)).toBe(antes);
  });
});

describe('nenhuma carta se duplica entre mão, cooldown e campo', () => {
  it('ao longo de um turno inteiro com três Ações', () => {
    let partida = partidaEmAndamento();
    for (const [indice, carta] of [CARTA_A1, CARTA_A2, CARTA_A3].entries()) {
      partida = declarar(partida, carta, { cooldown: ((indice % 3) + 1) as 1 | 2 | 3 });
      partida = resolver(partida, indice as 0 | 1 | 2);

      const jogador = jogadorDe(partida, ID_A);
      /*
       * A carta usada está no campo, agendada — não na mão nem no cooldown.
       * Contar as oito exige somar o agendamento, e **exatamente uma vez**:
       * é isso que prova que ela não existe em dois lugares.
       */
      const todas = [
        ...jogador.mao,
        ...jogador.cooldown[1],
        ...jogador.cooldown[2],
        ...jogador.cooldown[3],
        ...jogador.cooldownAgendado.map((agendado) => String(agendado.carta)),
      ];
      expect(new Set(todas).size).toBe(todas.length);
      expect(todas).toHaveLength(8);
    }
  });

  it('mesmo com uma Ação declarada e ainda não resolvida', () => {
    const partida = declarar(partidaEmAndamento());
    const jogador = jogadorDe(partida, ID_A);
    const todas = [...jogador.mao, ...jogador.cooldown[1]];
    expect(todas).toHaveLength(7);
    expect(todas).not.toContain(CARTA_A1);
    expect(validarPartida(partida).ok).toBe(true);
  });
});

describe('ciclo completo de turno', () => {
  it('atravessa os dois jogadores sem quebrar a estrutura', () => {
    let partida = partidaEmAndamento();
    partida = resolver(declarar(partida, CARTA_A1));
    partida = exigirSucesso(encerrarTurno(partida, ID_A)).partida;
    partida = exigirSucesso(iniciarTurno(partida, ID_B)).partida;

    expect(partida.turno?.jogadorAtivo).toBe(ID_B);
    expect(jogadorDe(partida, ID_B).pontosDeAcao).toBe(5);
    expect(validarPartida(partida).ok).toBe(true);
  });
});

describe('carta de Reação: cooldown próprio', () => {
  /** Declara um Ataque com o cooldown pedido, responde com uma Reação e resolve. */
  const trocar = (cooldownDoAtaque: 1 | 2 | 3, cooldownDaReacao: 1 | 2 | 3): EstadoDaPartida => {
    let partida = declarar(partidaEmAndamento(), CARTA_A1, { cooldown: cooldownDoAtaque });
    partida = exigirSucesso(
      registrarResposta(partida, ID_B, 0, {
        tipo: 'carta-de-reacao',
        perfil: perfilDeReacao(CARTA_B1, { cooldown: cooldownDaReacao }),
      }),
    ).partida;
    /*
     * Encerrar o turno faz parte do caminho.
     *
     * A carta usada fica no campo até o encerramento (§11), então um teste de
     * "cada carta vai para a própria zona" precisa passar por aqui — e assim
     * ele prova o trajeto inteiro, e não só o agendamento.
     */
    return encerrar(resolver(partida));
  };

  it('Ataque CD3 respondido por Reação CD1: cada carta vai para a própria zona', () => {
    const partida = trocar(3, 1);
    expect(jogadorDe(partida, ID_A).cooldown[3]).toContain(CARTA_A1);
    expect(jogadorDe(partida, ID_B).cooldown[1]).toContain(CARTA_B1);

    // E em nenhuma outra zona.
    expect(jogadorDe(partida, ID_A).cooldown[1]).not.toContain(CARTA_A1);
    expect(jogadorDe(partida, ID_B).cooldown[3]).not.toContain(CARTA_B1);
  });

  it('Ataque CD1 respondido por Reação CD3: cada carta vai para a própria zona', () => {
    const partida = trocar(1, 3);
    expect(jogadorDe(partida, ID_A).cooldown[1]).toContain(CARTA_A1);
    expect(jogadorDe(partida, ID_B).cooldown[3]).toContain(CARTA_B1);

    expect(jogadorDe(partida, ID_A).cooldown[3]).not.toContain(CARTA_A1);
    expect(jogadorDe(partida, ID_B).cooldown[1]).not.toContain(CARTA_B1);
  });

  it('o Ataque continua indo para o cooldown dele mesmo sem Resposta', () => {
    const partida = encerrar(resolver(declarar(partidaEmAndamento(), CARTA_A1, { cooldown: 2 })));
    expect(jogadorDe(partida, ID_A).cooldown[2]).toContain(CARTA_A1);
  });

  /*
   * O trajeto completo, num teste só.
   *
   * Ele é o que prova a regra nova inteira: a carta sai da mão ao declarar,
   * fica no campo depois de resolver, **não** está no cooldown nesse meio
   * tempo, e só migra quando o turno encerra.
   */
  it('a habilidade fica no campo entre resolver e encerrar, e só então entra no cooldown', () => {
    let partida = declarar(partidaEmAndamento(), CARTA_A1, { cooldown: 2 });
    expect(jogadorDe(partida, ID_A).mao).not.toContain(CARTA_A1);

    partida = resolver(partida);
    const depoisDeResolver = jogadorDe(partida, ID_A);
    expect(depoisDeResolver.acoes[0]?.perfil?.carta).toBe(CARTA_A1);
    expect(depoisDeResolver.acoes[0]?.situacao).toBe('resolvida');
    expect(depoisDeResolver.cooldown[1]).not.toContain(CARTA_A1);
    expect(depoisDeResolver.cooldown[2]).not.toContain(CARTA_A1);
    expect(depoisDeResolver.cooldown[3]).not.toContain(CARTA_A1);

    partida = encerrar(partida);
    const depoisDeEncerrar = jogadorDe(partida, ID_A);
    expect(depoisDeEncerrar.cooldown[2]).toContain(CARTA_A1);
    expect(depoisDeEncerrar.cooldownAgendado).toHaveLength(0);
    // E o espaço de Ação fica limpo.
    expect(depoisDeEncerrar.acoes[0]?.perfil).toBeNull();
  });

  it('a composição das oito continua íntegra para os dois lados', () => {
    const partida = trocar(3, 1);
    for (const id of [ID_A, ID_B]) {
      const jogador = jogadorDe(partida, id);
      const todas = [
        ...jogador.mao,
        ...jogador.cooldown[1],
        ...jogador.cooldown[2],
        ...jogador.cooldown[3],
        ...jogador.cooldownAgendado.map((agendado) => String(agendado.carta)),
      ];
      expect(new Set(todas).size).toBe(8);
    }
    expect(validarPartida(partida).ok).toBe(true);
  });
});

describe('carta de Reação: custo impresso', () => {
  const responderCom = (custo: number, reservaInicial?: number) => {
    let partida = declarar(partidaEmAndamento());
    if (reservaInicial !== undefined) {
      partida = {
        ...partida,
        jogadores: [partida.jogadores[0], { ...partida.jogadores[1], reserva: reservaInicial }],
      };
    }
    return registrarResposta(partida, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: perfilDeReacao(CARTA_B1, { custo }),
    });
  };

  it('paga exatamente o custo impresso na própria Reação', () => {
    const partida = exigirSucesso(responderCom(2)).partida;
    expect(jogadorDe(partida, ID_B).reserva).toBe(0);
  });

  it('custo 1 com 2 de Reserva deixa 1', () => {
    const partida = exigirSucesso(responderCom(1)).partida;
    expect(jogadorDe(partida, ID_B).reserva).toBe(1);
  });

  it('custo 2 com apenas 1 de Reserva é recusado', () => {
    const resposta = responderCom(2, 1);
    expect(!resposta.ok && resposta.erro.tipo).toBe('reserva-insuficiente');
  });

  it('o evento de custo registra o valor impresso, não um número de fora', () => {
    let partida = declarar(partidaEmAndamento());
    const resultado = exigirSucesso(
      registrarResposta(partida, ID_B, 0, {
        tipo: 'carta-de-reacao',
        perfil: perfilDeReacao(CARTA_B1, { custo: 2 }),
      }),
    );
    const custo = resultado.eventos.find((evento) => evento.tipo === 'custo-pago');
    expect(custo).toMatchObject({ reserva: 2, ap: 0, impulso: 0 });
    partida = resultado.partida;
    expect(jogadorDe(partida, ID_B).reserva).toBe(0);
  });

  it('não existe mais um custo separado que possa contradizer a carta', () => {
    // A assinatura aceita quatro argumentos: o custo vem do perfil e não há
    // como passar um número que discorde da carta.
    expect(registrarResposta.length).toBe(4);
  });
});

describe('carta de Reação: só Reação responde', () => {
  it('recusa registrar um Ataque como Resposta', () => {
    const partida = declarar(partidaEmAndamento());
    const resposta = registrarResposta(partida, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: { ...perfilDeReacao(CARTA_B1), tipo: 'ataque' },
    });
    expect(!resposta.ok && resposta.erro.tipo).toBe('tipo-de-carta-invalido');
    expect(
      !resposta.ok && resposta.erro.tipo === 'tipo-de-carta-invalido' && resposta.erro.recebido,
    ).toBe('ataque');
  });

  it('recusa registrar uma Técnica como Resposta', () => {
    const partida = declarar(partidaEmAndamento());
    const resposta = registrarResposta(partida, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: { ...perfilDeReacao(CARTA_B1), tipo: 'tecnica' },
    });
    expect(!resposta.ok && resposta.erro.tipo).toBe('tipo-de-carta-invalido');
  });

  it('recusa uma Reação que não se pague com Reserva', () => {
    const partida = declarar(partidaEmAndamento());
    const resposta = registrarResposta(partida, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: { ...perfilDeReacao(CARTA_B1), custo: { moeda: 'ap', valor: 1 } },
    });
    expect(!resposta.ok && resposta.erro.tipo).toBe('moeda-de-custo-invalida');
  });

  it('não muta o estado de entrada quando recusa', () => {
    const partida = declarar(partidaEmAndamento());
    const antes = JSON.stringify(partida);
    registrarResposta(partida, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: { ...perfilDeReacao(CARTA_B1), tipo: 'ataque' },
    });
    registrarResposta(partida, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: perfilDeReacao(CARTA_B1, { custo: 9 }),
    });
    expect(JSON.stringify(partida)).toBe(antes);
  });

  it('não muta o estado de entrada quando aceita', () => {
    const partida = declarar(partidaEmAndamento());
    const antes = JSON.stringify(partida);
    registrarResposta(partida, ID_B, 0, {
      tipo: 'carta-de-reacao',
      perfil: perfilDeReacao(CARTA_B1),
    });
    expect(JSON.stringify(partida)).toBe(antes);
  });
});
