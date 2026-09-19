// @vitest-environment jsdom
import type { ClassId } from '@arcane-duel/shared-types';
import { AssetProvider } from '@arcane-duel/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JOGADOR_1 } from '../partida/controlador.js';
import { ProvedorDePreferencias } from '../preferencias/preferencias.js';
import { PartidaLocal } from '../telas/PartidaLocal.js';

/*
 * A tela de batalha da Etapa 6, montada de verdade.
 *
 * O jsdom não tem WebGL, mas a arena não depende dele para existir: a projeção
 * é matemática pura, então a camada de interação se posiciona igual com e sem
 * canvas. É isso que permite testar aqui a composição premium — e é a mesma
 * propriedade que mantém o jogo inteiro quando o WebGL falha num aparelho.
 */

/*
 * A arena entra por `lazy`, então montar é assíncrono.
 *
 * É a mesma espera que o navegador faz: o pacote tridimensional só é baixado
 * quando alguém entra numa partida. Esperar aqui é esperar pelo caminho real.
 */
const montar = async (
  opcoes: { readonly cena?: boolean; readonly classe?: ClassId } = {},
): Promise<void> => {
  render(
    <AssetProvider base="/">
      <ProvedorDePreferencias iniciais={{ modo: 'normal', qualidade: 'alta' }}>
        <PartidaLocal
          configuracao={{
            classeDoJogador1: opcoes.classe ?? 'guerreiro',
            classeDoJogador2: 'mago',
            comeca: JOGADOR_1,
          }}
          semente="arena"
          cenaDisponivel={opcoes.cena ?? true}
          aoSair={() => undefined}
          aoRevanche={() => undefined}
        />
      </ProvedorDePreferencias>
    </AssetProvider>,
  );
  await screen.findByTestId('hud-proprio');
};

const pecasDaMao = (): readonly HTMLElement[] =>
  [...document.querySelectorAll('.peca--mao')].filter(
    (elemento): elemento is HTMLElement => elemento instanceof HTMLElement,
  );

const zonasDeclaradas = (): readonly string[] =>
  [...document.querySelectorAll('[data-ancora]')].map(
    (elemento) => elemento.getAttribute('data-ancora') ?? '',
  );

describe('a arena monta o campo inteiro', () => {
  it('declara as zonas dos dois lados como âncoras de campo', async () => {
    await montar();
    const ancoras = zonasDeclaradas();
    for (const lado of ['proprio', 'adversario']) {
      for (const indice of [0, 1, 2]) {
        expect(ancoras).toContain(`${lado}:acao:${String(indice)}`);
        expect(ancoras).toContain(`${lado}:resposta:${String(indice)}`);
      }
      for (const indice of [0, 1, 2, 3]) {
        expect(ancoras).toContain(`${lado}:passiva:${String(indice)}`);
      }
      expect(ancoras).toContain(`${lado}:ultimate:0`);
      expect(ancoras).toContain(`${lado}:personagem:0`);
      for (const zona of ['cd1', 'cd2', 'cd3']) {
        expect(ancoras).toContain(`${lado}:${zona}:0`);
      }
    }
    expect(ancoras).toContain('proprio:mao:0');
  });

  it('abre a mão em leque, com as oito cartas em posições distintas', async () => {
    await montar();
    const cartas = pecasDaMao();
    expect(cartas).toHaveLength(8);

    const posicoes = cartas.map((carta) => carta.style.left);
    expect(new Set(posicoes).size).toBe(8);
    // Leque discreto: o giro existe e é pequeno.
    const giros = cartas
      .map((carta) => /rotate\((-?[\d.]+)deg\)/.exec(carta.style.transform)?.[1] ?? '0')
      .map(Number);
    expect(Math.max(...giros.map(Math.abs))).toBeGreaterThan(0);
    expect(Math.max(...giros.map(Math.abs))).toBeLessThanOrEqual(9);
  });

  it('mostra os dois HUDs, com Vida, Guarda, AP, Reserva e Ações', async () => {
    await montar();
    for (const lado of ['proprio', 'adversario']) {
      const hud = screen.getByTestId(`hud-${lado}`);
      expect(hud.textContent).toContain('Vida');
      expect(hud.textContent).toContain('Guarda');
      expect(hud.textContent).toContain('AP');
      expect(hud.textContent).toContain('Reserva');
      expect(screen.getByTestId(`acoes-usadas-${lado}`).textContent).toBe('0/3');
    }
  });

  it('junta estado e comando no disco de turno', async () => {
    await montar();
    const encerrar = screen.getByTestId('encerrar-turno');
    expect(encerrar.closest('.disco')).not.toBeNull();
    expect(document.querySelector('.disco__ap')?.textContent).toContain('5');
  });

  it('dá ao Guerreiro brasas de Momentum e ao Mago orbes de Mana', async () => {
    await montar({ classe: 'guerreiro' });
    expect(document.querySelectorAll('.brasa')).toHaveLength(3);
    expect(document.querySelectorAll('.orbe')).toHaveLength(6);
  });
});

describe('privacidade na arena', () => {
  it('não monta no DOM nenhuma carta que o observador não pode ver', async () => {
    await montar();
    // As Passivas do adversário começam ocultas: o que existe é verso, e o
    // identificador delas não chega nem como atributo.
    const html = document.body.innerHTML;
    for (const oculta of ['MP01', 'MP06', 'MP08', 'MP10']) {
      expect(html, `${oculta} vazou para o DOM`).not.toContain(oculta);
    }
    expect(document.querySelectorAll('.carta--virada').length).toBeGreaterThan(0);
  });

  it('esconde o campo inteiro durante a troca de aparelho', async () => {
    await montar();
    fireEvent.click(screen.getByTestId('encerrar-turno'));

    expect(screen.getByTestId('handoff')).toBeDefined();
    expect(document.querySelector('.arena')).toBeNull();
    expect(pecasDaMao()).toHaveLength(0);
  });
});

describe('sem WebGL o jogo continua inteiro', () => {
  it('cai para o campo da Etapa 5, com as mesmas peças e os mesmos comandos', async () => {
    await montar({ cena: false });

    expect(document.querySelector('canvas.arena__cena')).toBeNull();
    expect(screen.getByTestId('campo')).toBeDefined();
    expect(screen.getByTestId('mao')).toBeDefined();
    expect(screen.getByTestId('encerrar-turno')).toBeDefined();
    expect(screen.getByTestId('hud-proprio')).toBeDefined();
  });

  it('a arena e o fallback nunca aparecem juntos', async () => {
    await montar({ cena: true });
    // Dois campos ao mesmo tempo dariam dois HUDs, duas mãos e dois avisos.
    expect(screen.getAllByTestId('campo')).toHaveLength(1);
    expect(screen.getAllByTestId('hud-proprio')).toHaveLength(1);
  });
});
