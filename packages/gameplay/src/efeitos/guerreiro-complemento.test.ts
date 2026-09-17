import type { PlayerId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comRecurso,
  duelo,
  jogador,
  jogar,
  momentumDe,
  virarTurno,
} from '../teste-apoio.js';
import { declarar, resolver, responder, usarCartaDeClasseNaAcao } from '../partida.js';

/*
 * Uma prova de comportamento para cada Passiva, Carta de Classe e Ultimate do
 * Guerreiro. Ativar e Exaurir são testados separadamente: são efeitos
 * diferentes da mesma carta, e a Exaustão tira a carta da partida.
 */

const guerreiro = (
  habilidades: readonly string[],
  extras: {
    readonly passivas?: readonly string[];
    readonly cartasDeClasse?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('guerreiro', { habilidades, ...extras });

const mago = build('mago', { habilidades: ['M15', 'M01', 'M02', 'M04'] });

const estadoDaPassiva = (partida: ReturnType<typeof duelo>, id: PlayerId, carta: string): string =>
  jogador(partida, id).passivas.find((passiva) => passiva.carta === carta)?.estado ?? 'ausente';

describe('Guerreiro — Passivas', () => {
  it('WP01 Instinto de Ferro se revela diante de uma Ruptura e reduz 2 I', () => {
    const inicial = duelo(
      guerreiro(['W01'], { passivas: ['WP01', 'WP02', 'WP05', 'WP09'] }),
      mago,
      B,
    );
    const partida = com(inicial, A, { guarda: 3 });
    const { partida: depois, eventos } = jogar(partida, B, { pedido: { carta: 'M04' as never } });
    expect(estadoDaPassiva(depois, A, 'WP01')).not.toBe('oculta');
    expect(eventos.some((evento) => evento.tipo === 'ruptura')).toBe(false);
  });

  it('WP02 Sangue Aceso se revela a 15 de Vida ou menos', () => {
    const inicial = duelo(
      guerreiro(['W01'], { passivas: ['WP02', 'WP05', 'WP09', 'WP10'] }),
      mago,
      B,
    );
    const partida = com(inicial, A, { vida: 16 });
    const { partida: depois } = jogar(partida, B, { pedido: { carta: 'M01' as never } });
    expect(jogador(depois, A).vida).toBeLessThanOrEqual(15);
    expect(estadoDaPassiva(depois, A, 'WP02')).not.toBe('oculta');
  });

  it('WP03 Leitura de Combate se revela na terceira Ação do adversário', () => {
    const inicial = duelo(
      guerreiro(['W01'], { passivas: ['WP03', 'WP05', 'WP09', 'WP10'] }),
      mago,
      B,
    );
    const primeira = jogar(inicial, B, { pedido: { carta: 'M01' as never } }).partida;
    const segunda = jogar(primeira, B, { pedido: { carta: 'M02' as never } }).partida;
    expect(estadoDaPassiva(segunda, A, 'WP03')).toBe('oculta');

    const declarada = declarar(segunda, B, { carta: 'M04' as never });
    const terceira = declarada.ok ? declarada.valor.partida : segunda;
    expect(estadoDaPassiva(terceira, A, 'WP03')).not.toBe('oculta');
  });

  it('WP04 Predador de Ruptura se revela na primeira Ruptura causada', () => {
    const inicial = duelo(guerreiro(['W03'], { passivas: ['WP04', 'WP05', 'WP09', 'WP10'] }), mago);
    const partida = com(inicial, B, { guarda: 3 });
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'W03' as never } });
    expect(estadoDaPassiva(depois, A, 'WP04')).not.toBe('oculta');
  });

  it('WP05 Dor em Força se revela ao perder 4 ou mais de Vida e dá 2 Momentum', () => {
    const inicial = duelo(
      guerreiro(['W01'], { passivas: ['WP05', 'WP09', 'WP10', 'WP02'] }),
      mago,
      B,
    );
    const partida = com(inicial, A, { guarda: 0 });
    const { partida: depois } = jogar(partida, B, { pedido: { carta: 'M02' as never } });
    expect(jogador(depois, A).vida).toBe(26);
    expect(estadoDaPassiva(depois, A, 'WP05')).not.toBe('oculta');
    expect(momentumDe(depois, A)).toBe(2);
  });

  it('WP06 Mestre da Defesa se revela quando uma Reação zera o Dano final', () => {
    const partida = duelo(
      guerreiro(['W15'], { passivas: ['WP06', 'WP09', 'WP10', 'WP02'] }),
      mago,
      B,
    );
    const { partida: depois } = jogar(partida, B, {
      pedido: { carta: 'M01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W15' as never },
    });
    expect(estadoDaPassiva(depois, A, 'WP06')).not.toBe('oculta');
  });

  it('WP07 Pressão de Veterano se revela no início do turno com o inimigo sem Reserva', () => {
    const inicial = duelo(guerreiro(['W01'], { passivas: ['WP07', 'WP05', 'WP09', 'WP10'] }), mago);
    // O Mago é o segundo jogador e começa com duas Reservas, então a condição
    // só existe depois que ele as gasta ou perde.
    expect(estadoDaPassiva(inicial, A, 'WP07')).toBe('oculta');

    // O Mago precisa fechar o turno dele sem AP para não converter Reserva.
    const noTurnoDoMago = virarTurno(inicial, A);
    const semSobra = com(noTurnoDoMago, B, { pontosDeAcao: 0, reserva: 0 });
    const proximo = virarTurno(semSobra, B);
    expect(jogador(proximo, B).reserva).toBe(0);
    expect(estadoDaPassiva(proximo, A, 'WP07')).not.toBe('oculta');
  });

  it('WP08 Mão Pesada se revela ao jogar um Ataque de 3 AP', () => {
    const partida = duelo(guerreiro(['W08'], { passivas: ['WP08', 'WP05', 'WP09', 'WP10'] }), mago);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'W08' as never } });
    expect(estadoDaPassiva(depois, A, 'WP08')).not.toBe('oculta');
  });

  it('WP09 Olho na Abertura se revela na segunda Reação do inimigo no mesmo turno', () => {
    const inicial = duelo(
      guerreiro(['W01', 'W07'], { passivas: ['WP09', 'WP05', 'WP10', 'WP02'] }),
      build('mago', { habilidades: ['M15', 'M17', 'M01'] }),
    );
    const primeira = jogar(inicial, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M15' as never },
    }).partida;
    expect(estadoDaPassiva(primeira, A, 'WP09')).toBe('oculta');

    const segunda = jogar(primeira, A, {
      pedido: { carta: 'W07' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'M17' as never },
    }).partida;
    expect(estadoDaPassiva(segunda, A, 'WP09')).not.toBe('oculta');
  });

  it('WP10 Guarda de Veterano se revela ao terminar o turno com Reserva 2', () => {
    const partida = duelo(guerreiro(['W01'], { passivas: ['WP10', 'WP05', 'WP09', 'WP02'] }), mago);
    const depois = virarTurno(partida, A);
    expect(jogador(depois, A).reserva).toBe(2);
    expect(estadoDaPassiva(depois, A, 'WP10')).not.toBe('oculta');
  });
});

describe('Guerreiro — Cartas de Classe', () => {
  it('WC01 Ativada faz a Guarda Marcial reduzir 1 D e 1 I', () => {
    const partida = duelo(guerreiro(['W01'], { cartasDeClasse: ['WC01', 'WC02'] }), mago, B);
    const declarada = declarar(partida, B, { carta: 'M02' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const respondida = responder(base, A, 0, {
      tipo: 'defesa-inata',
      reducao: 'dano',
      cartasDeClasse: [{ carta: 'WC01' as never, modo: 'ativar' }],
    });
    const comResposta = respondida.ok ? respondida.valor.partida : base;
    const resolvida = resolver(comResposta, B, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comResposta;
    // 4 D impressos menos 1, e 1 I menos 1.
    expect(jogador(fim, A).vida).toBe(30 - 3);
    expect(jogador(fim, A).guarda).toBe(6);
  });

  it('WC01 Exaurida impede a Ruptura e ajusta a Guarda para 3', () => {
    const inicial = duelo(guerreiro(['W01'], { cartasDeClasse: ['WC01', 'WC02'] }), mago, B);
    const partida = com(inicial, A, { guarda: 2 });
    const declarada = declarar(partida, B, { carta: 'M04' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const respondida = responder(base, A, 0, {
      tipo: 'defesa-inata',
      reducao: 'impacto',
      cartasDeClasse: [{ carta: 'WC01' as never, modo: 'exaurir' }],
    });
    const comResposta = respondida.ok ? respondida.valor.partida : base;
    const resolvida = resolver(comResposta, B, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comResposta;

    expect(jogador(fim, A).guarda).toBe(3);
    expect(jogador(fim, A).removidas).toContain('WC01');
  });

  it('WC02 Ativada soma +1 D e +1 I ao Ataque declarado', () => {
    const partida = duelo(guerreiro(['W01'], { cartasDeClasse: ['WC02', 'WC04'] }), mago);
    const { partida: depois, eventos } = jogar(partida, A, {
      pedido: {
        carta: 'W01' as never,
        cartasDeClasse: [{ carta: 'WC02' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, B).vida).toBe(30 - 3);
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(2);
  });

  it('WC02 Exaurida soma +3 I e dá 2 Momentum na Ruptura', () => {
    const inicial = duelo(guerreiro(['W01'], { cartasDeClasse: ['WC02', 'WC04'] }), mago);
    const partida = com(inicial, B, { guarda: 4 });
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'W01' as never,
        cartasDeClasse: [{ carta: 'WC02' as never, modo: 'exaurir' }],
      },
    });
    // 1 pela mecânica de Guarda removida, 2 pela carta Exaurida.
    expect(momentumDe(depois, A)).toBe(3);
    expect(jogador(depois, A).removidas).toContain('WC02');
  });

  it('WC03 Ativada dá 1 Momentum quando o adversário usa Reação', () => {
    const partida = duelo(guerreiro(['W01'], { cartasDeClasse: ['WC03', 'WC04'] }), mago);
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'W01' as never,
        cartasDeClasse: [{ carta: 'WC03' as never, modo: 'ativar' }],
      },
      resposta: { tipo: 'carta-de-reacao', carta: 'M15' as never },
    });
    // 1 da própria carta W01 e 1 da Postura do Duelista.
    expect(momentumDe(depois, A)).toBe(2);
  });

  it('WC03 Exaurida soma +3 D depois da redução da Reação', () => {
    const partida = duelo(guerreiro(['W01'], { cartasDeClasse: ['WC03', 'WC04'] }), mago);
    const declarada = declarar(partida, A, { carta: 'W01' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const respondida = responder(base, B, 0, { tipo: 'carta-de-reacao', carta: 'M15' as never });
    const comResposta = respondida.ok ? respondida.valor.partida : base;

    const usada = usarCartaDeClasseNaAcao(comResposta, A, 0, {
      carta: 'WC03' as never,
      modo: 'exaurir',
    });
    const comCarta = usada.ok ? usada.valor.partida : comResposta;
    const resolvida = resolver(comCarta, A, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comCarta;

    // 2 D impressos, menos os 3 da Barreira de Mana, mais 3 depois da redução.
    expect(jogador(fim, B).vida).toBe(30 - 3);
  });

  it('WC04 Ativada devolve 1 AP na Ruptura', () => {
    const inicial = duelo(guerreiro(['W03'], { cartasDeClasse: ['WC04', 'WC02'] }), mago);
    const partida = com(inicial, B, { guarda: 3 });
    const { partida: depois } = jogar(partida, A, {
      pedido: {
        carta: 'W03' as never,
        cartasDeClasse: [{ carta: 'WC04' as never, modo: 'ativar' }],
      },
    });
    expect(jogador(depois, A).pontosDeAcao).toBe(4);
  });

  it('WC04 Exaurida dá +3 D ao próximo Ataque depois de uma Ruptura', () => {
    const inicial = duelo(guerreiro(['W03', 'W01'], { cartasDeClasse: ['WC04', 'WC02'] }), mago);
    const partida = com(inicial, B, { guarda: 3 });
    const primeira = jogar(partida, A, {
      pedido: {
        carta: 'W03' as never,
        cartasDeClasse: [{ carta: 'WC04' as never, modo: 'exaurir' }],
      },
    }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'W01' as never } });
    expect(antes - jogador(depois, B).vida).toBe(5);
  });

  it('WC05 Ativada dá 1 Momentum depois que a própria Reação resolve', () => {
    const partida = duelo(guerreiro(['W19'], { cartasDeClasse: ['WC05', 'WC02'] }), mago, B);
    const declarada = declarar(partida, B, { carta: 'M01' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const respondida = responder(base, A, 0, {
      tipo: 'carta-de-reacao',
      carta: 'W19' as never,
      cartasDeClasse: [{ carta: 'WC05' as never, modo: 'ativar' }],
    });
    const comResposta = respondida.ok ? respondida.valor.partida : base;
    const resolvida = resolver(comResposta, B, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comResposta;
    expect(momentumDe(fim, A)).toBeGreaterThanOrEqual(1);
  });

  it('WC05 Exaurida reforça a Reação em 2 D e 2 I e dá 2 Momentum', () => {
    const partida = duelo(guerreiro(['W19'], { cartasDeClasse: ['WC05', 'WC02'] }), mago, B);
    const declarada = declarar(partida, B, { carta: 'M02' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const respondida = responder(base, A, 0, {
      tipo: 'carta-de-reacao',
      carta: 'W19' as never,
      cartasDeClasse: [{ carta: 'WC05' as never, modo: 'exaurir' }],
    });
    const comResposta = respondida.ok ? respondida.valor.partida : base;
    const resolvida = resolver(comResposta, B, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comResposta;

    // 4 D impressos, menos 1 da Interposição e menos 2 da Contraofensiva.
    expect(jogador(fim, A).vida).toBe(30 - 1);
    expect(momentumDe(fim, A)).toBeGreaterThanOrEqual(2);
  });

  it('WC06 Ativada soma +1 D e +1 I a um Ataque logo depois de outro Ataque', () => {
    const inicial = duelo(guerreiro(['W01', 'W01'], { cartasDeClasse: ['WC06', 'WC02'] }), mago);
    const primeira = jogar(inicial, A, { pedido: { carta: 'W01' as never } }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, {
      pedido: {
        carta: 'W02' as never,
        cartasDeClasse: [{ carta: 'WC06' as never, modo: 'ativar' }],
      },
    });
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('WC06 Exaurida deixa o Ataque encadeado 1 AP mais barato, com mínimo 1', () => {
    const inicial = duelo(guerreiro(['W01', 'W02'], { cartasDeClasse: ['WC06', 'WC02'] }), mago);
    const primeira = jogar(inicial, A, { pedido: { carta: 'W01' as never } }).partida;
    const apAntes = jogador(primeira, A).pontosDeAcao;
    const { partida: depois } = jogar(primeira, A, {
      pedido: {
        carta: 'W02' as never,
        cartasDeClasse: [{ carta: 'WC06' as never, modo: 'exaurir' }],
      },
    });
    // Ombro de Guerra custa 2 AP e sai por 1.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });
});

describe('Guerreiro — Ultimates', () => {
  it('WU01 Quebra-Reinos cobra 3 AP e 3 Momentum e bate 7 D / 3 I', () => {
    const partida = comRecurso(duelo(guerreiro(['W01'], { ultimate: 'WU01' }), mago), A, 3);
    const { partida: depois, eventos } = jogar(partida, A, { pedido: { carta: 'WU01' as never } });
    const impacto = eventos.find((evento) => evento.tipo === 'impacto-aplicado');
    expect(impacto?.tipo === 'impacto-aplicado' ? impacto.valor : 0).toBe(3);
    expect(jogador(depois, B).vida).toBe(30 - 7);
    expect(jogador(depois, A).pontosDeAcao).toBe(2);
    expect(jogador(depois, A).ultimate.estado).toBe('consumida');
    // A Ultimate é consumida: ela não volta por cooldown.
    expect(jogador(depois, A).cooldown[1]).not.toContain('WU01');
  });

  it('WU02 Última Palavra zera o Dano e tira 4 de Vida do atacante', () => {
    const inicial = duelo(guerreiro(['W01'], { ultimate: 'WU02' }), mago, B);
    const partida = comRecurso(inicial, A, 3);
    const declarada = declarar(partida, B, { carta: 'M02' as never });
    const base = declarada.ok ? declarada.valor.partida : partida;
    const respondida = responder(base, A, 0, { tipo: 'carta-de-reacao', carta: 'WU02' as never });
    const comResposta = respondida.ok ? respondida.valor.partida : base;
    const resolvida = resolver(comResposta, B, 0);
    const fim = resolvida.ok ? resolvida.valor.partida : comResposta;

    expect(jogador(fim, A).vida).toBe(30);
    expect(jogador(fim, B).vida).toBe(30 - 4);
  });

  it('WU03 Sequência do Campeão soma +2 D por Ataque já realizado, até +4', () => {
    const inicial = duelo(guerreiro(['W01', 'W07'], { ultimate: 'WU03' }), mago);
    const comMomentum = comRecurso(inicial, A, 2);
    const primeira = jogar(comMomentum, A, { pedido: { carta: 'W01' as never } }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'WU03' as never } });
    expect(antes - jogador(depois, B).vida).toBe(6);
  });
});
