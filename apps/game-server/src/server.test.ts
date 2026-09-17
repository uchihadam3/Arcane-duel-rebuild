import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { criarServidor } from './server.js';
import { montarDiagnostico } from './diagnostico.js';

let servidor: ReturnType<typeof criarServidor> | undefined;

const subir = async (): Promise<string> => {
  servidor = criarServidor();
  await new Promise<void>((resolver) => {
    servidor?.listen(0, '127.0.0.1', resolver);
  });
  const endereco = servidor.address() as AddressInfo;
  return `http://127.0.0.1:${String(endereco.port)}`;
};

afterEach(async () => {
  if (servidor !== undefined) {
    await new Promise<void>((resolver) => {
      servidor?.close(() => {
        resolver();
      });
    });
    servidor = undefined;
  }
});

describe('game-server', () => {
  it('responde diagnóstico com as versões de regras e de catálogo', async () => {
    const base = await subir();
    const resposta = await fetch(`${base}/health`);
    expect(resposta.status).toBe(200);

    const corpo = (await resposta.json()) as ReturnType<typeof montarDiagnostico>;
    expect(corpo.status).toBe('ok');
    expect(corpo.rulesVersion).toBe(montarDiagnostico().rulesVersion);
    expect(corpo.cardDataVersion).toBe(montarDiagnostico().cardDataVersion);
  });

  it('declara explicitamente o que ainda não implementa', () => {
    const diagnostico = montarDiagnostico();
    expect(diagnostico.pendente).toContain('validacao-de-jogada');
    expect(diagnostico.pendente).toContain('mascara-de-informacao-privada');
    expect(diagnostico.implementado).not.toContain('partida');
  });

  it('devolve 404 para rota desconhecida', async () => {
    const base = await subir();
    const resposta = await fetch(`${base}/rota-que-nao-existe`);
    expect(resposta.status).toBe(404);
    expect(await resposta.json()).toEqual({
      erro: 'rota-desconhecida',
      caminho: '/rota-que-nao-existe',
    });
  });
});
