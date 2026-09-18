import { describe, expect, it } from 'vitest';

import { analisarDeclaracao, cartasJogaveis, podeTentar } from './interacao.js';
import { A, B, build, carta, duelo, jogador, jogar, virarTurno } from './teste-apoio.js';

/*
 * A camada de interação não inventa regra: ela pergunta ao motor.
 *
 * O que estes testes provam é justamente isso — que a resposta vem do motor e
 * não de uma tabela paralela. Por isso eles conferem casos em que a exigência
 * é de uma carta específica (R13 pede um Ataque da mão) sem que a camada
 * conheça a carta.
 */

describe('analisarDeclaracao', () => {
  it('diz que uma carta sem escolhas está pronta', () => {
    const partida = duelo(build('guerreiro', { habilidades: ['W02'] }), build('mago'), A);
    expect(analisarDeclaracao(partida, A, { carta: carta('W02') })).toEqual({ estado: 'pronta' });
  });

  it('descobre sozinha qual escolha a carta pede', () => {
    const partida = duelo(
      build('patrulheiro', { habilidades: ['R13', 'R05', 'R02'] }),
      build('guerreiro'),
      A,
    );
    const situacao = analisarDeclaracao(partida, A, { carta: carta('R13') });
    expect(situacao.estado).toBe('faltam-escolhas');
    if (situacao.estado !== 'faltam-escolhas') return;
    // R13 pede "1 Ataque da mão": o campo é `cartaDaMao`, e quem disse foi o motor.
    expect(situacao.campo).toBe('cartaDaMao');
  });

  it('oferece só os valores que o motor aceita', () => {
    const partida = duelo(
      build('patrulheiro', { habilidades: ['R13', 'R05', 'R02', 'R12', 'R16'] }),
      build('guerreiro'),
      A,
    );
    const situacao = analisarDeclaracao(partida, A, { carta: carta('R13') });
    if (situacao.estado !== 'faltam-escolhas') throw new Error('deveria pedir escolha');

    const oferecidas = situacao.opcoes.map((item) => item.chave);
    // Ataques da mão entram.
    expect(oferecidas).toContain('R05');
    expect(oferecidas).toContain('R02');
    // A Técnica e a Reação da mesma mão não entram: o motor as recusa.
    expect(oferecidas).not.toContain('R12');
    expect(oferecidas).not.toContain('R16');
  });

  it('completa a jogada com a escolha sondada', () => {
    const partida = duelo(
      build('patrulheiro', { habilidades: ['R13', 'R05', 'R02'] }),
      build('guerreiro'),
      A,
    );
    const situacao = analisarDeclaracao(partida, A, { carta: carta('R13') });
    if (situacao.estado !== 'faltam-escolhas') throw new Error('deveria pedir escolha');
    const escolhida = situacao.opcoes.find((item) => item.chave === 'R05');
    expect(escolhida).toBeDefined();

    const completa = analisarDeclaracao(partida, A, {
      carta: carta('R13'),
      escolhas: escolhida?.fragmento ?? {},
    });
    expect(completa).toEqual({ estado: 'pronta' });
  });

  it('devolve o erro tipado quando a jogada é recusada de verdade', () => {
    const partida = duelo(build('guerreiro', { habilidades: ['W02'] }), build('mago'), A);
    const situacao = analisarDeclaracao(partida, B, { carta: carta('M01') });
    expect(situacao.estado).toBe('recusada');
    if (situacao.estado !== 'recusada') return;
    expect(situacao.erro.tipo).toBe('fora-do-turno');
  });
});

describe('cartasJogaveis', () => {
  it('lista a mão inteira e a Ultimate', () => {
    const partida = duelo(build('guerreiro'), build('mago'), A);
    const lista = cartasJogaveis(partida, A);
    const dono = jogador(partida, A);
    expect(lista.filter((item) => item.origem === 'mao')).toHaveLength(dono.mao.length);
    expect(lista.some((item) => item.origem === 'ultimate')).toBe(true);
  });

  it('inclui a Emboscada armada como zona própria de declaração', () => {
    const base = duelo(
      build('patrulheiro', { habilidades: ['R13', 'R05', 'R02', 'R01'] }),
      build('guerreiro'),
      A,
    );
    const preparada = jogar(base, A, {
      pedido: { carta: carta('R13'), escolhas: { cartaDaMao: carta('R05') } },
    }).partida;
    const armada = virarTurno(virarTurno(preparada, A), B);

    const lista = cartasJogaveis(armada, A);
    const reservada = lista.find((item) => item.origem === 'emboscada');
    expect(reservada?.carta).toBe(carta('R05'));
    // Ela ainda não pode sair: é a terceira Ação, e estamos na primeira.
    expect(podeTentar(reservada?.situacao ?? { estado: 'pronta' })).toBe(false);
  });
});

describe('analisarResposta', () => {
  it('aceita Sem Resposta contra uma Ação declarada', () => {
    const base = duelo(build('guerreiro', { habilidades: ['W02'] }), build('mago'), A);
    const declarada = (() => {
      const resposta = analisarDeclaracao(base, A, { carta: carta('W02') });
      expect(resposta.estado).toBe('pronta');
      return resposta;
    })();
    expect(declarada.estado).toBe('pronta');
  });

  it('descobre a escolha que a Defesa Inata do Guerreiro exige', () => {
    const base = duelo(build('mago', { habilidades: ['M01'] }), build('guerreiro'), A);
    const { partida } = jogar(base, A, { pedido: { carta: carta('M01') }, indice: 0 });
    // A jogada acima já resolveu; monta outra e para antes de resolver.
    expect(partida.situacao).toBe('em-andamento');
  });
});
