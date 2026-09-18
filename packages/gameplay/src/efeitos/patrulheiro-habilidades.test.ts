import { describe, expect, it } from 'vitest';

import {
  A,
  B,
  build,
  com,
  comMarca,
  duelo,
  erroDe,
  jogador,
  jogar,
  marcaDe,
  virarTurno,
} from '../teste-apoio.js';
import { declarar } from '../partida.js';

/*
 * Uma prova de comportamento para cada uma das vinte habilidades do
 * Patrulheiro.
 *
 * Usar a Marca e Explorar a Marca são coisas diferentes: os testes conferem se
 * a Marca continuou de pé ou se foi consumida.
 */

const patrulheiro = (
  habilidades: readonly string[],
  extras: {
    readonly cartasDeClasse?: readonly string[];
    readonly passivas?: readonly string[];
    readonly ultimate?: string;
  } = {},
): ReturnType<typeof build> => build('patrulheiro', { habilidades, ...extras });

const guerreiro = build('guerreiro', { habilidades: ['W01', 'W02', 'W15', 'W19', 'W11'] });

describe('Patrulheiro — habilidades', () => {
  it('R01 Flecha de Sondagem aplica a Marca quando atinge a Vida', () => {
    const partida = duelo(patrulheiro(['R01']), guerreiro, A);
    expect(marcaDe(partida, A)).toBe(false);
    const { partida: depois } = jogar(partida, A, { pedido: { carta: 'R01' as never } });
    expect(marcaDe(depois, A)).toBe(true);
  });

  it('R02 Tiro Preciso ganha +2 D ao Explorar a Marca e a consome', () => {
    const base = comMarca(duelo(patrulheiro(['R02']), guerreiro, A), A, true);
    const semExplorar = jogar(base, A, { pedido: { carta: 'R02' as never } });
    expect(jogador(semExplorar.partida, B).vida).toBe(30 - 4);
    expect(marcaDe(semExplorar.partida, A)).toBe(true);

    const outro = comMarca(duelo(patrulheiro(['R02']), guerreiro, A), A, true);
    const { partida: depois } = jogar(outro, A, {
      pedido: { carta: 'R02' as never, escolhas: { explorarMarca: true } },
    });
    expect(jogador(depois, B).vida).toBe(30 - 6);
    expect(marcaDe(depois, A)).toBe(false);
  });

  it('R02 recusa Explorar quando não há Marca', () => {
    const base = duelo(patrulheiro(['R02']), guerreiro, A);
    const recusa = declarar(base, A, {
      carta: 'R02' as never,
      escolhas: { explorarMarca: true },
    });
    expect(erroDe(recusa).tipo).toBe('escolha-invalida');
  });

  it('R03 Flecha de Caça recebe +1 I contra alvo Marcado sem consumir a Marca', () => {
    const base = comMarca(duelo(patrulheiro(['R03']), guerreiro, A), A, true);
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'R03' as never } });
    expect(jogador(depois, B).guarda).toBe(6 - 3);
    expect(marcaDe(depois, A)).toBe(true);
  });

  it('R04 Tiro Rompe-Guarda ganha +2 I ao Explorar a Marca', () => {
    const base = comMarca(duelo(patrulheiro(['R04']), guerreiro, A), A, true);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'R04' as never, escolhas: { explorarMarca: true } },
    });
    expect(jogador(depois, B).guarda).toBe(6 - 5);
    expect(marcaDe(depois, A)).toBe(false);
  });

  it('R05 Disparo Serrilhado aplica Sangramento contra alvo Marcado', () => {
    const base = comMarca(duelo(patrulheiro(['R05']), guerreiro, A), A, true);
    const { partida: depois } = jogar(base, A, { pedido: { carta: 'R05' as never } });
    expect(jogador(depois, B).condicoes.sangramento).toBe(1);
    expect(marcaDe(depois, A)).toBe(true);
  });

  it('R06 Disparo em Movimento recebe +1 D na segunda Ação contra alvo Marcado', () => {
    const base = comMarca(duelo(patrulheiro(['R03', 'R06']), guerreiro, A), A, true);
    const primeira = jogar(base, A, { pedido: { carta: 'R03' as never } }).partida;
    const antes = jogador(primeira, B).vida;
    const { partida: depois } = jogar(primeira, A, { pedido: { carta: 'R06' as never } });
    expect(antes - jogador(depois, B).vida).toBe(3);
  });

  it('R07 Flecha de Impacto ganha +2 I ao Explorar a Marca', () => {
    const base = comMarca(duelo(patrulheiro(['R07']), guerreiro, A), A, true);
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'R07' as never, escolhas: { explorarMarca: true } },
    });
    // 3 I impressos + 2 I da Exploração contra Guarda 6.
    expect(jogador(depois, B).guarda).toBe(1);
    expect(marcaDe(depois, A)).toBe(false);
  });

  it('R08 Tiro de Execução só sai contra alvo Marcado com Guarda 0', () => {
    const base = duelo(patrulheiro(['R08']), guerreiro, A);
    expect(erroDe(declarar(base, A, { carta: 'R08' as never })).tipo).toBe(
      'condicao-de-uso-nao-satisfeita',
    );

    const pronto = com(comMarca(base, A, true), B, { guarda: 0 });
    const { partida: depois } = jogar(pronto, A, { pedido: { carta: 'R08' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 8);
    expect(marcaDe(depois, A)).toBe(false);
  });

  it('R09 Disparo de Cobertura ganha +1 Reserva quando o inimigo reage', () => {
    const base = com(duelo(patrulheiro(['R09']), guerreiro, A), B, { reserva: 2 });
    const usada = jogar(base, A, {
      pedido: { carta: 'R09' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'W19' as never },
    }).partida;
    expect(jogador(virarTurno(usada, A), A).reserva).toBe(2);
  });

  it('R10 Flecha Rápida recebe +1 D depois de uma Técnica', () => {
    const base = duelo(patrulheiro(['R11', 'R10']), guerreiro, A);
    const tecnica = jogar(base, A, { pedido: { carta: 'R11' as never } }).partida;
    const { partida: depois } = jogar(tecnica, A, { pedido: { carta: 'R10' as never } });
    expect(jogador(depois, B).vida).toBe(30 - 3);
  });

  it('R11 Marcar a Presa aplica a Marca, e dá +1 I se ela já existia', () => {
    const base = duelo(patrulheiro(['R11', 'R03']), guerreiro, A);
    const marcou = jogar(base, A, { pedido: { carta: 'R11' as never } }).partida;
    expect(marcaDe(marcou, A)).toBe(true);

    const outro = comMarca(duelo(patrulheiro(['R11', 'R03']), guerreiro, A), A, true);
    const repetida = jogar(outro, A, { pedido: { carta: 'R11' as never } }).partida;
    const guardaAntes = jogador(repetida, B).guarda;
    const { partida: depois } = jogar(repetida, A, { pedido: { carta: 'R03' as never } });
    // 2 I impressos + 1 I contra Marcado + 1 I do Marcar a Presa repetido.
    expect(guardaAntes - jogador(depois, B).guarda).toBe(4);
  });

  it('R12 Ajustar a Mira dá +1 D e +1 I ao próximo Ataque contra Marcado', () => {
    const base = comMarca(duelo(patrulheiro(['R12', 'R03']), guerreiro, A), A, true);
    const mirou = jogar(base, A, { pedido: { carta: 'R12' as never } }).partida;
    const antes = jogador(mirou, B).vida;
    const { partida: depois } = jogar(mirou, A, { pedido: { carta: 'R03' as never } });
    expect(antes - jogador(depois, B).vida).toBe(4);
  });

  it('R13 Preparar Emboscada reserva um Ataque e o barateia na terceira Ação', () => {
    const base = duelo(patrulheiro(['R13', 'R07', 'R01', 'R06']), guerreiro, A);
    const preparado = jogar(base, A, {
      pedido: { carta: 'R13' as never, escolhas: { cartaDaMao: 'R07' as never } },
    }).partida;
    // A carta sai da mão e fica face-down no componente de classe.
    expect(jogador(preparado, A).mao).not.toContain('R07');

    const proximo = virarTurno(virarTurno(preparado, A), B);
    const uma = jogar(proximo, A, { pedido: { carta: 'R01' as never } }).partida;
    const duas = jogar(uma, A, { pedido: { carta: 'R06' as never } }).partida;
    const apAntes = jogador(duas, A).pontosDeAcao;
    const { partida: depois } = jogar(duas, A, { pedido: { carta: 'R07' as never } });
    // Flecha de Impacto custa 3 AP; emboscada na terceira Ação, sai por 2.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });

  it('R14 Reposicionar Armadilha deixa a Armadilha Ativada de volta Pronta', () => {
    const base = duelo(patrulheiro(['R14'], { cartasDeClasse: ['RC01', 'RC05'] }), guerreiro, A);
    const comAtivada = com(base, A, {
      cartasDeClasse: jogador(base, A).cartasDeClasse.map((item) =>
        item.carta === 'RC05' ? { ...item, estado: 'ativada' as const } : item,
      ),
    });
    const { partida: depois } = jogar(comAtivada, A, { pedido: { carta: 'R14' as never } });
    expect(jogador(depois, A).cartasDeClasse.find((item) => item.carta === 'RC05')?.estado).toBe(
      'pronta',
    );
  });

  it('R15 Paciência do Caçador barateia a primeira Ação do próximo turno', () => {
    const base = comMarca(duelo(patrulheiro(['R15', 'R07']), guerreiro, A), A, true);
    const paciente = jogar(base, A, { pedido: { carta: 'R15' as never } }).partida;
    const proximo = virarTurno(virarTurno(paciente, A), B);
    const apAntes = jogador(proximo, A).pontosDeAcao;
    const { partida: depois } = jogar(proximo, A, { pedido: { carta: 'R07' as never } });
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });

  it('R16 Esquiva Lateral reduz 3 D', () => {
    const base = com(duelo(guerreiro, patrulheiro(['R16']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'R16' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
  });

  it('R17 Aparar com o Arco reduz 1 D e 2 I', () => {
    const base = com(duelo(guerreiro, patrulheiro(['R17']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'R17' as never },
    });
    expect(jogador(depois, B).vida).toBe(30 - 2);
    expect(jogador(depois, B).guarda).toBe(6 - 1);
  });

  it('R18 Retirada Calculada aplica a Marca ao responder', () => {
    const base = com(duelo(guerreiro, patrulheiro(['R18']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'R18' as never },
    });
    expect(marcaDe(depois, B)).toBe(true);
  });

  it('R19 Disparo de Reação tira 2 de Vida do adversário quando zera o Dano', () => {
    const base = com(duelo(guerreiro, patrulheiro(['R19']), A), B, { reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W01' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'R19' as never },
    });
    expect(jogador(depois, B).vida).toBe(30);
    expect(jogador(depois, A).vida).toBe(30 - 2);
    expect(marcaDe(depois, B)).toBe(true);
  });

  it('R20 Instinto de Caça aplica a Marca quando impede a Ruptura', () => {
    const base = com(duelo(guerreiro, patrulheiro(['R20']), A), B, { guarda: 2, reserva: 2 });
    const { partida: depois } = jogar(base, A, {
      pedido: { carta: 'W02' as never },
      resposta: { tipo: 'carta-de-reacao', carta: 'R20' as never },
    });
    expect(jogador(depois, B).guarda).toBeGreaterThan(0);
    expect(marcaDe(depois, B)).toBe(true);
  });
});
