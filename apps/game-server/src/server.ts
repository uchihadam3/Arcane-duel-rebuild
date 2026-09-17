import http from 'node:http';

import { montarDiagnostico } from './diagnostico.js';

/**
 * Esqueleto do servidor de partida.
 *
 * O servidor final é autoritativo: o cliente envia intenção de ação e o
 * servidor valida custo, alvo, estado, informação escondida e sequência
 * (FULL_GAME_SPEC.md §20). Nada disso existe ainda — este esqueleto só responde
 * diagnóstico, para que o restante da infraestrutura possa ser montada em volta
 * dele sem fingir que a partida online já funciona.
 */
export const tratarRequisicao = (
  requisicao: http.IncomingMessage,
  resposta: http.ServerResponse,
): void => {
  const caminho = new URL(requisicao.url ?? '/', 'http://localhost').pathname;

  if (caminho === '/health' || caminho === '/') {
    const corpo = JSON.stringify(montarDiagnostico());
    resposta.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    resposta.end(corpo);
    return;
  }

  resposta.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  resposta.end(JSON.stringify({ erro: 'rota-desconhecida', caminho }));
};

export const criarServidor = (): http.Server => http.createServer(tratarRequisicao);
