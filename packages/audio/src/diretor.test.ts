import { describe, expect, it, vi } from 'vitest';

import { EVENTOS_SONOROS, VOLUMES_PADRAO } from './vocabulario.js';
import { assinaturaDoEvento, barramentoDoEvento, criarDiretorDeAudio } from './diretor.js';

/*
 * O diretor de áudio.
 *
 * O som desta etapa é temporário e sintetizado — a biblioteca final é a Etapa
 * 13. O que precisa estar certo **agora** é a arquitetura: um ponto único por
 * onde todo som passa, volume por barramento, silêncio que silencia de
 * verdade, e uma falha de áudio que nunca derruba a partida.
 */

describe('assinatura sonora', () => {
  it('nenhum dos catorze eventos fica sem som', () => {
    for (const evento of EVENTOS_SONOROS) {
      expect(assinaturaDoEvento(evento).length, `${evento} está mudo`).toBeGreaterThan(0);
    }
  });

  it('cada evento toca no barramento certo', () => {
    expect(barramentoDoEvento('aplicar-dano')).toBe('efeitos');
    expect(barramentoDoEvento('selecionar-carta')).toBe('interface');
    expect(barramentoDoEvento('vitoria')).toBe('musica');
  });

  it('Ruptura e Ultimate pesam mais que um toque de interface', () => {
    const duracao = (evento: Parameters<typeof assinaturaDoEvento>[0]): number =>
      assinaturaDoEvento(evento).reduce((total, voz) => Math.max(total, voz.duracaoMs), 0);

    expect(duracao('ruptura')).toBeGreaterThan(duracao('selecionar-carta'));
    expect(duracao('usar-ultimate')).toBeGreaterThan(duracao('colocar-carta-em-acao'));
  });

  it('o Guerreiro soa grave e o Mago soa agudo', () => {
    // Não é enfeite: é a mesma separação que os VFX fazem, no ouvido.
    const grave = assinaturaDoEvento('aplicar-dano')[0];
    const brilhante = assinaturaDoEvento('revelar-passiva')[0];
    expect(grave?.corte).toBeLessThan(brilhante?.corte ?? 0);
    expect(grave?.ruido).toBeGreaterThan(brilhante?.ruido ?? 1);
  });
});

describe('o diretor', () => {
  it('sem contexto de áudio disponível, toca em silêncio e não quebra', () => {
    const diretor = criarDiretorDeAudio();
    expect(() => {
      diretor.tocar('ruptura');
      diretor.destravar();
      diretor.encerrar();
    }).not.toThrow();
  });

  it('silenciar impede qualquer som de nascer', () => {
    const criar = vi.fn(() => null);
    const diretor = criarDiretorDeAudio({ criar });
    diretor.silenciar(true);
    diretor.tocar('aplicar-dano');

    expect(diretor.silencioso()).toBe(true);
    expect(criar).not.toHaveBeenCalled();
  });

  it('volume zero num barramento cala só aquele barramento', () => {
    const criar = vi.fn(() => null);
    const diretor = criarDiretorDeAudio({ criar });
    diretor.definirVolumes({ ...VOLUMES_PADRAO, efeitos: 0 });

    diretor.tocar('aplicar-dano');
    expect(criar).toHaveBeenCalledTimes(1); // pediu o contexto, e parou ali
    diretor.tocar('selecionar-carta');
    expect(criar).toHaveBeenCalledTimes(2);
  });

  it('uma falha do navegador no áudio não sobe para a partida', () => {
    const diretor = criarDiretorDeAudio({
      criar: () => {
        throw new Error('áudio bloqueado');
      },
    });
    // Áudio é acessório: ele pode falhar, a partida não.
    expect(() => {
      diretor.tocar('vitoria');
      diretor.destravar();
    }).not.toThrow();
  });
});
