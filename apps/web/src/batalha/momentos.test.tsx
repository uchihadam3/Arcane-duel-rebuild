// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventoDeApresentacao, MomentoEmCena } from '@arcane-duel/vfx';
import { eventoDeApresentacao } from '@arcane-duel/vfx';

import { CamadaDeMomentos } from './CamadaDeMomentos.js';

/*
 * O que a apresentação escreve por cima do campo.
 *
 * A Ruptura e a faixa de turno são momentos raros: uma partida automática pode
 * simplesmente não alcançá-los, e uma captura de tela que não existe não prova
 * nada. Aqui eles são montados a partir do beat, que é exatamente o que a fila
 * entrega quando eles acontecem de verdade.
 */

const emCena = (evento: EventoDeApresentacao, progresso = 0.5): MomentoEmCena => ({
  evento,
  progresso,
  comecouEm: 0,
  duracaoMs: evento.duracaoBaseMs,
});

describe('Ruptura', () => {
  const ruptura = emCena(
    eventoDeApresentacao('r1', {
      tipo: 'ruptura',
      lado: 'adversario',
      familia: 'fragmentos',
      destino: 'adversario:personagem:0',
      rotulo: 'RUPTURA',
      valores: [{ rotulo: '+DANO', valor: 2, tom: 'ruptura' }],
    }),
  );

  it('diz a palavra e o bônus de Dano', () => {
    render(<CamadaDeMomentos momentos={[ruptura]} />);
    const aviso = screen.getByTestId('ruptura');
    expect(aviso.textContent).toContain('RUPTURA');
    expect(aviso.textContent).toContain('+2 de Dano');
  });

  it('não apaga o campo: ela é texto sobre a arena, não uma tela branca', () => {
    render(<CamadaDeMomentos momentos={[ruptura]} />);
    const camada = document.querySelector('.momentos');
    // A camada inteira é transparente ao toque e não cobre nada por baixo.
    expect(camada?.className).toBe('momentos');
    expect(document.querySelector('.ruptura__palavra')).not.toBeNull();
  });

  it('some quando o beat termina', () => {
    render(<CamadaDeMomentos momentos={[]} />);
    expect(screen.queryByTestId('ruptura')).toBeNull();
  });
});

describe('números flutuantes', () => {
  it('aparecem no ponto do impacto, com sinal e rótulo', () => {
    const dano = emCena(
      eventoDeApresentacao('n1', {
        tipo: 'numero-flutuante',
        lado: 'adversario',
        destino: 'adversario:personagem:0',
        valores: [
          { rotulo: 'VIDA', valor: -3, tom: 'vida' },
          { rotulo: 'GUARDA', valor: -2, tom: 'guarda' },
        ],
      }),
    );
    render(<CamadaDeMomentos momentos={[dano]} />);

    const texto = document.querySelector('.flutuante')?.textContent ?? '';
    expect(texto).toContain('-3 VIDA');
    expect(texto).toContain('-2 GUARDA');
  });

  it('a cura vem com sinal de mais, para não ser lida como dano', () => {
    const cura = emCena(
      eventoDeApresentacao('n2', {
        tipo: 'numero-flutuante',
        lado: 'proprio',
        destino: 'proprio:personagem:0',
        valores: [{ rotulo: 'VIDA', valor: 4, tom: 'cura' }],
      }),
    );
    render(<CamadaDeMomentos momentos={[cura]} />);
    expect(document.querySelector('.flutuante')?.textContent).toContain('+4 VIDA');
  });
});

describe('faixa de turno', () => {
  it('diz de quem é a vez pelo lado, e não só pelo texto', () => {
    const faixa = emCena(
      eventoDeApresentacao('t1', {
        tipo: 'banner-de-turno',
        lado: 'adversario',
        rotulo: 'Turno 3',
      }),
    );
    render(<CamadaDeMomentos momentos={[faixa]} />);

    const banner = screen.getByTestId('banner-de-turno');
    expect(banner.textContent).toContain('TURNO DO ADVERSÁRIO');
    expect(banner.textContent).toContain('Turno 3');
    // A cor identifica o dono: sem ler o texto já se sabe.
    expect(banner.getAttribute('style')).toContain('--cor-do-dono');
  });

  it('troca de cor e de texto quando o turno volta para o jogador', () => {
    const faixa = emCena(
      eventoDeApresentacao('t2', { tipo: 'banner-de-turno', lado: 'proprio', rotulo: 'Turno 4' }),
    );
    render(<CamadaDeMomentos momentos={[faixa]} />);
    expect(screen.getByTestId('banner-de-turno').textContent).toContain('SEU TURNO');
  });
});
