import { describe, expect, it } from 'vitest';
import { cartasJogaveis } from '@arcane-duel/gameplay/jogo';

import { JOGADOR_1, JOGADOR_2, criarControladorLocal } from './controlador.js';

/*
 * O controlador local, sem React.
 *
 * Ele é o host do protótipo: guarda o estado canônico, executa comandos do
 * `gameplay` e diz de quem é a vez de estar com o aparelho. Nenhuma regra de
 * combate é conferida aqui — o que estes testes provam é a **ordem** do fluxo
 * e a troca de perspectiva.
 */

const controlador = () =>
  criarControladorLocal({
    classeDoJogador1: 'guerreiro',
    classeDoJogador2: 'mago',
    comeca: JOGADOR_1,
  });

const primeiraJogavel = (controle: ReturnType<typeof controlador>, jogador = JOGADOR_1): string => {
  const lista = cartasJogaveis(controle.estado().partida, jogador).filter(
    (item) => item.situacao.estado === 'pronta' && item.origem === 'mao',
  );
  const primeira = lista[0];
  if (primeira === undefined) throw new Error('nenhuma carta jogável');
  return String(primeira.carta);
};

describe('controlador da partida local', () => {
  it('começa com quem foi escolhido, no turno 1', () => {
    const controle = controlador();
    const estado = controle.estado();
    expect(estado.partida.situacao).toBe('em-andamento');
    expect(estado.partida.turno?.jogadorAtivo).toBe(JOGADOR_1);
    expect(estado.etapa.tipo).toBe('acao');
    expect(estado.aguardando).toBe(JOGADOR_1);
    expect(estado.noAparelho).toBe(JOGADOR_1);
  });

  it('declarar abre a janela de complementos com quem atacou', () => {
    const controle = controlador();
    const carta = primeiraJogavel(controle);
    controle.declarar({ carta: carta as never });

    const estado = controle.estado();
    expect(estado.etapa.tipo).toBe('complementos');
    expect(estado.aguardando).toBe(JOGADOR_1);
    expect(estado.noAparelho).toBe(JOGADOR_1);
  });

  it('enviar a Ação passa a vez para quem responde, cobrindo o aparelho', () => {
    const controle = controlador();
    controle.declarar({ carta: primeiraJogavel(controle) as never });
    controle.enviarAcao();

    const estado = controle.estado();
    expect(estado.etapa.tipo).toBe('resposta');
    expect(estado.aguardando).toBe(JOGADOR_2);
    // A troca acontece antes de qualquer projeção nova: o aparelho fica coberto.
    expect(estado.noAparelho).toBeNull();
  });

  it('confirmar a troca devolve o aparelho a quem a etapa exige', () => {
    const controle = controlador();
    controle.declarar({ carta: primeiraJogavel(controle) as never });
    controle.enviarAcao();
    controle.confirmarTroca();
    expect(controle.estado().noAparelho).toBe(JOGADOR_2);
  });

  it('Sem Resposta resolve a Ação e devolve a vez ao atacante', () => {
    const controle = controlador();
    controle.declarar({ carta: primeiraJogavel(controle) as never });
    controle.enviarAcao();
    controle.confirmarTroca();
    controle.responder({ tipo: 'sem-resposta' });

    const estado = controle.estado();
    expect(estado.etapa.tipo).toBe('acao');
    expect(estado.aguardando).toBe(JOGADOR_1);
    const atacante = estado.partida.jogadores.find((item) => item.id === JOGADOR_1);
    expect(atacante?.acoes[0].situacao).toBe('resolvida');
  });

  it('encerrar o turno abre o turno do outro jogador', () => {
    const controle = controlador();
    controle.encerrarTurno();

    const estado = controle.estado();
    expect(estado.partida.turno?.jogadorAtivo).toBe(JOGADOR_2);
    expect(estado.partida.turno?.numero).toBe(2);
    expect(estado.aguardando).toBe(JOGADOR_2);
    expect(estado.noAparelho).toBeNull();
    expect(estado.avisos.some((aviso) => aviso.tipo === 'turno')).toBe(true);
  });

  it('guarda a recusa do motor sem mexer no estado da partida', () => {
    const controle = controlador();
    const antes = controle.estado().partida;
    controle.declarar({ carta: 'ZZ99' as never });

    const depois = controle.estado();
    expect(depois.partida).toBe(antes);
    expect(depois.ultimoErro).not.toBeNull();
    controle.limparErro();
    expect(controle.estado().ultimoErro).toBeNull();
  });

  it('avisa os ouvintes a cada transição', () => {
    const controle = controlador();
    let contagem = 0;
    const cancelar = controle.aoMudar(() => {
      contagem += 1;
    });
    controle.encerrarTurno();
    expect(contagem).toBe(1);
    cancelar();
    controle.confirmarTroca();
    expect(contagem).toBe(1);
  });
});
