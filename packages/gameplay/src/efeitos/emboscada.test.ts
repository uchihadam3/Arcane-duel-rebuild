import { describe, expect, it } from 'vitest';
import type { CardId, EstadoDaPartida, PlayerId } from '@arcane-duel/shared-types';
import { projetarParaEspectador, projetarParaJogador } from '@arcane-duel/rules-engine';

import { declarar } from '../partida.js';
import {
  A,
  B,
  build,
  carta,
  comEmboscadaDeTeste,
  duelo,
  emboscadaDeTeste,
  erroDe,
  jogador,
  jogar,
  virarTurno,
} from '../teste-apoio.js';

/*
 * R13 — Preparar Emboscada, a mecânica inteira.
 *
 * "Escolha 1 Ataque da mão e coloque face-down no terceiro espaço de Ação. No
 * próximo turno, ele está reservado para ser a terceira Ação e custa 1 AP a
 * menos, mínimo 1. Se não for usado até o fim daquele turno, volta à mão."
 *
 * O texto tem cinco exigências, e cada uma vira um grupo de testes aqui:
 *
 * 1. "1 Ataque da mão" — o tipo vem do catálogo, a zona é a mão;
 * 2. "coloque face-down" — a carta sai da mão para uma reserva tipada, e a
 *    identidade continua sendo só do dono;
 * 3. "no próximo turno" — a reserva vale numa janela, e só nela;
 * 4. "reservado para ser a terceira Ação" — o terceiro espaço é dele, nos dois
 *    sentidos: ninguém mais o ocupa, e ele não sai em outro lugar;
 * 5. "custa 1 AP a menos, mínimo 1" / "volta à mão" — desconto estreito e
 *    devolução sem cooldown.
 */

const RESERVADA = carta('R05'); // Ataque, 2 AP impressos, cooldown 2.
const BARATA = carta('R06'); // Ataque, 1 AP impresso: prova o "mínimo 1".
const TECNICA = carta('R12'); // Técnica: não é Ataque.
const REACAO = carta('R16'); // Reação: não é Ataque.
const INEXISTENTE = carta('ZZ99');

const patrulheiro = (): EstadoDaPartida =>
  duelo(
    build('patrulheiro', {
      habilidades: ['R13', 'R05', 'R02', 'R01', 'R06', 'R03', 'R12', 'R16'],
    }),
    build('guerreiro'),
    A,
  );

/** Usa R13 escolhendo `escolhida`, e devolve a partida depois de resolver. */
const prepararCom = (partida: EstadoDaPartida, escolhida: CardId): EstadoDaPartida =>
  jogar(partida, A, { pedido: { carta: carta('R13'), escolhas: { cartaDaMao: escolhida } } })
    .partida;

const preparado = (escolhida: CardId = RESERVADA): EstadoDaPartida =>
  prepararCom(patrulheiro(), escolhida);

/** Abre o turno seguinte do Patrulheiro: é ali que a reserva fica armada. */
const armada = (partida: EstadoDaPartida): EstadoDaPartida => virarTurno(virarTurno(partida, A), B);

/** Gasta as duas primeiras Ações do turno, deixando o terceiro espaço livre. */
const duasAcoes = (partida: EstadoDaPartida): EstadoDaPartida => {
  const uma = jogar(partida, A, { pedido: { carta: carta('R02') } }).partida;
  return jogar(uma, A, { pedido: { carta: carta('R01') } }).partida;
};

const naTerceira = (escolhida: CardId = RESERVADA): EstadoDaPartida =>
  duasAcoes(armada(preparado(escolhida)));

const textoDaVisao = (partida: EstadoDaPartida, quem: PlayerId | null): string =>
  JSON.stringify(
    quem === null ? projetarParaEspectador(partida) : projetarParaJogador(partida, quem),
  );

/** O identificador aparece como valor, e não como sufixo de outro código. */
const apareceEm = (texto: string, id: CardId): boolean =>
  new RegExp(`(?<![A-Za-z0-9_-])${id}(?![A-Za-z0-9_-])`).test(texto);

const noCooldown = (partida: EstadoDaPartida, quem: PlayerId, id: CardId): boolean =>
  Object.values(jogador(partida, quem).cooldown).some((zona) => zona.includes(id));

describe('R13 — a escolha precisa ser mesmo 1 Ataque da mão', () => {
  it('1. um Ataque da mão é aceito', () => {
    const depois = preparado();
    expect(emboscadaDeTeste(depois, A)?.carta).toBe(RESERVADA);
  });

  it('2. uma Técnica da mão é recusada', () => {
    const erro = erroDe(
      declarar(patrulheiro(), A, {
        carta: carta('R13'),
        escolhas: { cartaDaMao: TECNICA },
      }),
    );
    expect(erro.tipo).toBe('escolha-invalida');
  });

  it('3. uma Reação da mão é recusada', () => {
    const erro = erroDe(
      declarar(patrulheiro(), A, {
        carta: carta('R13'),
        escolhas: { cartaDaMao: REACAO },
      }),
    );
    expect(erro.tipo).toBe('escolha-invalida');
  });

  it('4. uma carta que não existe no catálogo é recusada', () => {
    const erro = erroDe(
      declarar(patrulheiro(), A, {
        carta: carta('R13'),
        escolhas: { cartaDaMao: INEXISTENTE },
      }),
    );
    expect(erro.tipo).toBe('escolha-invalida');
  });

  it('5. um Ataque que não está na mão é recusado', () => {
    // R04 é Ataque do Patrulheiro, mas não está nesta build.
    const erro = erroDe(
      declarar(patrulheiro(), A, {
        carta: carta('R13'),
        escolhas: { cartaDaMao: carta('R04') },
      }),
    );
    expect(erro.tipo).toBe('escolha-invalida');
  });

  it('6. sem escolha alguma, a Ação é recusada em vez de escolher sozinha', () => {
    const erro = erroDe(declarar(patrulheiro(), A, { carta: carta('R13') }));
    expect(erro.tipo).toBe('escolha-obrigatoria');
  });
});

describe('R13 — a carta sai da mão para uma reserva face-down', () => {
  it('7. a carta escolhida deixa a mão', () => {
    const antes = patrulheiro();
    expect(jogador(antes, A).mao).toContain(RESERVADA);
    const depois = prepararCom(antes, RESERVADA);
    expect(jogador(depois, A).mao).not.toContain(RESERVADA);
  });

  it('8. a reserva é tipada e nasce "preparada"', () => {
    expect(emboscadaDeTeste(preparado(), A)).toEqual({
      carta: RESERVADA,
      estado: 'preparada',
    });
  });

  it('9. a mão perde exatamente uma carta além da própria R13', () => {
    const antes = patrulheiro();
    const depois = prepararCom(antes, RESERVADA);
    // R13 foi jogada e a reservada saiu: duas cartas a menos na mão.
    expect(jogador(depois, A).mao).toHaveLength(jogador(antes, A).mao.length - 2);
  });

  it('10. o dono vê a identidade da carta reservada', () => {
    const visao = projetarParaJogador(preparado(), A);
    const recurso = visao.jogadores.find((atual) => atual.id === A)?.recurso;
    const reserva = recurso?.classe === 'patrulheiro' ? recurso.emboscada : null;
    expect(reserva?.carta).toEqual({ visivel: true, carta: RESERVADA });
  });

  it('11. o adversário não vê a identidade, mas vê que há uma carta face-down', () => {
    const partida = preparado();
    const visao = projetarParaJogador(partida, B);
    const recurso = visao.jogadores.find((atual) => atual.id === A)?.recurso;
    const reserva = recurso?.classe === 'patrulheiro' ? recurso.emboscada : null;

    expect(reserva).not.toBeNull();
    expect(reserva?.estado).toBe('preparada');
    expect(reserva?.carta).toEqual({ visivel: false });
    expect(apareceEm(textoDaVisao(partida, B), RESERVADA)).toBe(false);
  });

  it('12. o espectador também não vê a identidade', () => {
    expect(apareceEm(textoDaVisao(preparado(), null), RESERVADA)).toBe(false);
  });

  it('13. a reserva não deixa a carta em duas zonas ao mesmo tempo', () => {
    const partida = preparado();
    const dono = jogador(partida, A);
    expect(dono.mao).not.toContain(RESERVADA);
    expect(noCooldown(partida, A, RESERVADA)).toBe(false);
    expect(dono.removidas).not.toContain(RESERVADA);
  });
});

describe('R13 — a reserva vale no próximo turno, e só nele', () => {
  it('14. no turno em que foi preparada, ela ainda não está armada', () => {
    expect(emboscadaDeTeste(preparado(), A)?.estado).toBe('preparada');
  });

  it('15. no mesmo turno, a carta reservada não pode ser declarada', () => {
    const erro = erroDe(declarar(preparado(), A, { carta: RESERVADA }));
    // Ela não está na mão e a reserva ainda não vale: não há de onde jogá-la.
    expect(erro.tipo).toBe('carta-fora-da-mao');
  });

  it('16. ao abrir o próprio turno seguinte, a reserva fica armada', () => {
    expect(emboscadaDeTeste(armada(preparado()), A)?.estado).toBe('armada');
  });

  it('17. armada, ela não pode ser a primeira Ação', () => {
    const erro = erroDe(declarar(armada(preparado()), A, { carta: RESERVADA }));
    expect(erro.tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('18. armada, ela não pode ser a segunda Ação', () => {
    const uma = jogar(armada(preparado()), A, { pedido: { carta: carta('R02') } }).partida;
    const erro = erroDe(declarar(uma, A, { carta: RESERVADA }));
    expect(erro.tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('19. armada, ela pode ser a terceira Ação', () => {
    const depois = jogar(naTerceira(), A, { pedido: { carta: RESERVADA } }).partida;
    expect(jogador(depois, A).acoes[2].perfil?.carta).toBe(RESERVADA);
  });
});

describe('R13 — o terceiro espaço fica mesmo reservado', () => {
  it('20. outra carta não pode ocupar o terceiro espaço', () => {
    const erro = erroDe(declarar(naTerceira(), A, { carta: carta('R03') }));
    expect(erro.tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('21. a recusa não muda estado nenhum', () => {
    const pronto = naTerceira();
    const antes = JSON.stringify(pronto);
    erroDe(declarar(pronto, A, { carta: carta('R03') }));
    expect(JSON.stringify(pronto)).toBe(antes);
  });

  it('22. a recusa não cobra o custo da carta recusada', () => {
    const pronto = naTerceira();
    const apAntes = jogador(pronto, A).pontosDeAcao;
    erroDe(declarar(pronto, A, { carta: carta('R03') }));
    expect(jogador(pronto, A).pontosDeAcao).toBe(apAntes);
    expect(jogador(pronto, A).mao).toContain(carta('R03'));
  });

  it('23. sem reserva armada, o terceiro espaço volta a ser de qualquer carta', () => {
    const semEmboscada = duasAcoes(virarTurno(virarTurno(patrulheiro(), A), B));
    const depois = jogar(semEmboscada, A, { pedido: { carta: carta('R03') } }).partida;
    expect(depois.jogadores.find((atual) => atual.id === A)?.acoes[2].perfil?.carta).toBe(
      carta('R03'),
    );
  });
});

describe('R13 — o desconto é o mais estreito do catálogo', () => {
  it('24. a terceira Ação reservada custa 1 AP a menos', () => {
    const pronto = naTerceira();
    const apAntes = jogador(pronto, A).pontosDeAcao;
    const depois = jogar(pronto, A, { pedido: { carta: RESERVADA } }).partida;
    // 2 AP impressos, 1 AP pago.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('25. o desconto respeita o mínimo de 1 AP', () => {
    const pronto = naTerceira(BARATA);
    const apAntes = jogador(pronto, A).pontosDeAcao;
    const depois = jogar(pronto, A, { pedido: { carta: BARATA } }).partida;
    // 1 AP impresso: o desconto não a torna gratuita.
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(1);
  });

  it('26. outra carta do turno não recebe o desconto', () => {
    const pronto = armada(preparado());
    const apAntes = jogador(pronto, A).pontosDeAcao;
    // R02 também custa 2 AP impressos, e não é a reservada.
    const depois = jogar(pronto, A, { pedido: { carta: carta('R02') } }).partida;
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });

  it('27. fora da janela, a mesma carta volta a custar o preço impresso', () => {
    // Sem usar: a reserva expira e R05 volta à mão.
    const devolvida = virarTurno(armada(preparado()), A);
    const meu = virarTurno(devolvida, B);
    const apAntes = jogador(meu, A).pontosDeAcao;
    const depois = jogar(meu, A, { pedido: { carta: RESERVADA } }).partida;
    expect(apAntes - jogador(depois, A).pontosDeAcao).toBe(2);
  });
});

describe('R13 — usada, a carta segue o caminho normal', () => {
  it('28. a reserva deixa de existir assim que é usada', () => {
    const depois = jogar(naTerceira(), A, { pedido: { carta: RESERVADA } }).partida;
    expect(emboscadaDeTeste(depois, A)).toBeNull();
  });

  it('29. a carta vai para o cooldown impresso', () => {
    const depois = jogar(naTerceira(), A, { pedido: { carta: RESERVADA } }).partida;
    // R05 tem cooldown 2 impresso.
    expect(jogador(depois, A).cooldown[2]).toContain(RESERVADA);
  });

  it('30. revelada, a carta passa a ser pública', () => {
    const depois = jogar(naTerceira(), A, { pedido: { carta: RESERVADA } }).partida;
    expect(apareceEm(textoDaVisao(depois, B), RESERVADA)).toBe(true);
  });
});

describe('R13 — não usada, a carta volta à mão', () => {
  it('31. ao fim daquele turno, ela volta à mão', () => {
    const devolvida = virarTurno(armada(preparado()), A);
    expect(jogador(devolvida, A).mao).toContain(RESERVADA);
    expect(emboscadaDeTeste(devolvida, A)).toBeNull();
  });

  it('32. ela volta sem passar por cooldown', () => {
    const devolvida = virarTurno(armada(preparado()), A);
    expect(noCooldown(devolvida, A, RESERVADA)).toBe(false);
  });

  it('33. de volta à mão, ela é usável normalmente', () => {
    const meu = virarTurno(virarTurno(armada(preparado()), A), B);
    const depois = jogar(meu, A, { pedido: { carta: RESERVADA } }).partida;
    expect(jogador(depois, A).acoes[0].perfil?.carta).toBe(RESERVADA);
  });

  it('34. devolvida, ela continua privada até ser jogada', () => {
    const devolvida = virarTurno(armada(preparado()), A);
    expect(apareceEm(textoDaVisao(devolvida, B), RESERVADA)).toBe(false);
  });
});

describe('R13 — nem reserva eterna, nem duas ao mesmo tempo', () => {
  it('35. com uma reserva de pé, R13 é recusada', () => {
    // A própria R13 vai ao cooldown quando é usada, então a segunda tentativa
    // real nunca chega à regra. A reserva é plantada para que chegue.
    const comReserva = comEmboscadaDeTeste(patrulheiro(), A, {
      carta: RESERVADA,
      estado: 'preparada',
    });
    const erro = erroDe(
      declarar(comReserva, A, {
        carta: carta('R13'),
        escolhas: { cartaDaMao: carta('R02') },
      }),
    );
    expect(erro.tipo).toBe('condicao-de-uso-nao-satisfeita');
  });

  it('36. a recusa da segunda R13 não mexe na reserva que já existe', () => {
    const comReserva = comEmboscadaDeTeste(patrulheiro(), A, {
      carta: RESERVADA,
      estado: 'armada',
    });
    erroDe(
      declarar(comReserva, A, {
        carta: carta('R13'),
        escolhas: { cartaDaMao: carta('R02') },
      }),
    );
    expect(emboscadaDeTeste(comReserva, A)).toEqual({ carta: RESERVADA, estado: 'armada' });
    expect(jogador(comReserva, A).mao).toContain(carta('R02'));
  });

  it('37. nenhuma reserva sobrevive ao turno em que ficou armada', () => {
    let partida = armada(preparado());
    // Dois turnos completos sem tocar na reserva.
    partida = virarTurno(virarTurno(partida, A), B);
    expect(emboscadaDeTeste(partida, A)).toBeNull();
    partida = virarTurno(virarTurno(partida, A), B);
    expect(emboscadaDeTeste(partida, A)).toBeNull();
  });

  it('38. a reserva é de quem a preparou', () => {
    const partida = preparado();
    expect(emboscadaDeTeste(partida, A)?.carta).toBe(RESERVADA);
    expect(emboscadaDeTeste(partida, B)).toBeNull();
  });

  it('39. o ciclo inteiro é determinístico', () => {
    const uma = jogar(naTerceira(), A, { pedido: { carta: RESERVADA } }).partida;
    const outra = jogar(naTerceira(), A, { pedido: { carta: RESERVADA } }).partida;
    expect(JSON.stringify(outra)).toBe(JSON.stringify(uma));
    expect(textoDaVisao(outra, B)).toBe(textoDaVisao(uma, B));
  });

  it('40. a identidade não vaza em nenhum ponto da janela', () => {
    const passos = [preparado(), armada(preparado()), duasAcoes(armada(preparado()))];
    for (const passo of passos) {
      expect(apareceEm(textoDaVisao(passo, B), RESERVADA)).toBe(false);
      expect(apareceEm(textoDaVisao(passo, null), RESERVADA)).toBe(false);
    }
  });

  it('41. a contagem da mão bate antes, durante e depois da reserva', () => {
    const antes = patrulheiro();
    const inicial = jogador(antes, A).mao.length;
    const durante = prepararCom(antes, RESERVADA);
    expect(jogador(durante, A).mao).toHaveLength(inicial - 2);

    const vista = projetarParaJogador(durante, B).jogadores.find((atual) => atual.id === A);
    expect(vista?.mao).toHaveLength(inicial - 2);

    const devolvida = virarTurno(armada(durante), A);
    expect(jogador(devolvida, A).mao).toContain(RESERVADA);
  });
});
