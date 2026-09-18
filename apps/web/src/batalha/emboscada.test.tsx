// @vitest-environment jsdom
import type { BuildEquipada } from '@arcane-duel/rules-engine';
import type { EstadoDaPartida, PlayerId, VisaoDaPartida } from '@arcane-duel/shared-types';
import { cardId, matchId } from '@arcane-duel/shared-types';
import { projetarParaEspectador, projetarParaJogador } from '@arcane-duel/rules-engine';
import {
  RECEITAS_INICIAIS,
  abrirTurno,
  declarar,
  fecharTurno,
  iniciar,
  montarPartida,
  resolver,
} from '@arcane-duel/gameplay/jogo';
import { AssetProvider } from '@arcane-duel/ui';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JOGADOR_1, JOGADOR_2 } from '../partida/controlador.js';
import { CampoDeBatalha } from './CampoDeBatalha.js';

/*
 * Preparar Emboscada (R13) na tela.
 *
 * A Receita 1 do Patrulheiro — Atirador — **não** traz R13, então a carta não
 * é alcançável pela configuração local desta etapa; o Construtor de Build é a
 * Etapa 7. O que estes testes provam é que, quando a Emboscada existe no
 * estado, a apresentação a trata corretamente: face-down para o adversário,
 * identidade só para o dono, e o terceiro espaço visivelmente reservado.
 */

const COM_EMBOSCADA: BuildEquipada = {
  ...RECEITAS_INICIAIS.patrulheiro,
  habilidades: [
    cardId('R13'), // Preparar Emboscada
    cardId('R05'), // Disparo Serrilhado — o Ataque que vai para a reserva
    cardId('R01'),
    cardId('R02'),
    cardId('R03'),
    cardId('R11'),
    cardId('R16'),
    cardId('R17'),
  ],
};

/** Monta a partida, prepara a Emboscada e vira o turno até ela ficar armada. */
const comEmboscadaArmada = (): EstadoDaPartida => {
  const montada = montarPartida({
    id: matchId('emboscada-na-tela'),
    semente: 'emboscada',
    jogadores: [
      { id: JOGADOR_1, build: COM_EMBOSCADA },
      { id: JOGADOR_2, build: RECEITAS_INICIAIS.guerreiro },
    ],
  });
  if (!montada.ok) throw new Error('build de teste inválida');

  const exigir = (resposta: { ok: boolean; valor?: { partida: EstadoDaPartida } }) => {
    if (!resposta.ok || resposta.valor === undefined) throw new Error('comando recusado');
    return resposta.valor.partida;
  };

  let partida = exigir(iniciar(montada.valor, JOGADOR_1));
  partida = exigir(abrirTurno(partida, JOGADOR_1));
  partida = exigir(
    declarar(partida, JOGADOR_1, {
      carta: cardId('R13'),
      escolhas: { cartaDaMao: cardId('R05') },
    }),
  );
  partida = exigir(resolver(partida, JOGADOR_1, 0));
  partida = exigir(fecharTurno(partida, JOGADOR_1));
  partida = exigir(abrirTurno(partida, JOGADOR_2));
  partida = exigir(fecharTurno(partida, JOGADOR_2));
  return exigir(abrirTurno(partida, JOGADOR_1));
};

const renderizar = (visao: VisaoDaPartida, perspectiva: PlayerId): void => {
  const eu = visao.jogadores.find((item) => item.id === perspectiva);
  const adversario = visao.jogadores.find((item) => item.id !== perspectiva);
  if (eu === undefined || adversario === undefined) throw new Error('visão incompleta');

  render(
    <AssetProvider base="/">
      <CampoDeBatalha
        visao={visao}
        eu={eu}
        adversario={adversario}
        nomeDoJogador="Jogador 1"
        nomeDoAdversario="Jogador 2"
        focada={null}
        jogaveis={new Set()}
        reservado={
          eu.recurso.classe === 'patrulheiro' && eu.recurso.emboscada?.estado === 'armada'
            ? 2
            : null
        }
        emFoco={null}
        aoFocarCarta={() => undefined}
      />
    </AssetProvider>,
  );
};

describe('a Emboscada na apresentação', () => {
  it('o dono vê que existe uma reserva armada', () => {
    const partida = comEmboscadaArmada();
    renderizar(projetarParaJogador(partida, JOGADOR_1), JOGADOR_1);
    expect(screen.getByTestId('emboscada').textContent).toContain('armada');
  });

  it('a carta reservada não está mais na mão do dono', () => {
    const partida = comEmboscadaArmada();
    renderizar(projetarParaJogador(partida, JOGADOR_1), JOGADOR_1);
    // "Disparo Serrilhado" saiu da mão para a reserva face-down.
    expect(screen.getByTestId('mao').textContent).not.toContain('Disparo Serrilhado');
  });

  it('o terceiro espaço de Ação aparece reservado', () => {
    const partida = comEmboscadaArmada();
    renderizar(projetarParaJogador(partida, JOGADOR_1), JOGADOR_1);

    const reservado = screen.getByTestId('acao-reservada');
    expect(reservado).toBeDefined();
    expect(reservado.closest('[data-indice]')?.getAttribute('data-indice')).toBe('2');
    expect(reservado.textContent).toContain('Reservado');
  });

  it('a primeira e a segunda Ação continuam livres', () => {
    const partida = comEmboscadaArmada();
    renderizar(projetarParaJogador(partida, JOGADOR_1), JOGADOR_1);

    const acoes = screen.getByTestId('acoes-proprio').querySelectorAll('[data-indice]');
    expect(acoes[0]?.textContent).toContain('Livre');
    expect(acoes[1]?.textContent).toContain('Livre');
  });

  it('o adversário vê o verso, e nunca a identidade', () => {
    const partida = comEmboscadaArmada();
    renderizar(projetarParaJogador(partida, JOGADOR_2), JOGADOR_2);

    expect(screen.getByTestId('emboscada').textContent).toContain('face-down');
    expect(document.body.textContent).not.toContain('Disparo Serrilhado');
  });

  it('o CardId da carta reservada não aparece no HTML entregue ao adversário', () => {
    const partida = comEmboscadaArmada();
    renderizar(projetarParaJogador(partida, JOGADOR_2), JOGADOR_2);
    expect(document.body.innerHTML).not.toMatch(/(?<![A-Za-z0-9_-])R05(?![A-Za-z0-9_-])/);
  });

  it('o espectador também não recebe a identidade', () => {
    const partida = comEmboscadaArmada();
    const visao = projetarParaEspectador(partida);
    const eu = visao.jogadores[1];
    const adversario = visao.jogadores[0];
    render(
      <AssetProvider base="/">
        <CampoDeBatalha
          visao={visao}
          eu={eu}
          adversario={adversario}
          nomeDoJogador="Jogador 2"
          nomeDoAdversario="Jogador 1"
          focada={null}
          jogaveis={new Set()}
          reservado={null}
          emFoco={null}
          aoFocarCarta={() => undefined}
        />
      </AssetProvider>,
    );
    expect(document.body.textContent).not.toContain('Disparo Serrilhado');
    expect(document.body.innerHTML).not.toMatch(/(?<![A-Za-z0-9_-])R05(?![A-Za-z0-9_-])/);
    cleanup();
  });
});
