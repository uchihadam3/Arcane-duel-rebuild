import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { VisaoDaPartida } from '@arcane-duel/shared-types';
import { projetarParaJogador } from '@arcane-duel/rules-engine';

import type { ConfiguracaoLocal, EstadoDaSessao } from '../partida/controlador.js';
import { criarControladorLocal } from '../partida/controlador.js';

/*
 * A ponte entre o controlador e o React.
 *
 * O controlador não conhece React, e este hook não conhece regra: ele assina
 * as mudanças e devolve a visão projetada para **quem está com o aparelho**.
 *
 * A projeção é a fronteira de apresentação, e não uma formalidade: quando não
 * há ninguém com o aparelho — a tela de troca — ela nem é calculada, então a
 * mão de quem estava jogando não existe em lugar nenhum para ser renderizada.
 */

export interface PartidaLocal {
  readonly sessao: EstadoDaSessao;
  /** `null` durante a troca de jogador. Nunca a visão do jogador errado. */
  readonly visao: VisaoDaPartida | null;
  readonly controle: ReturnType<typeof criarControladorLocal>;
}

export const usePartidaLocal = (configuracao: ConfiguracaoLocal, semente: string): PartidaLocal => {
  const chave = `${configuracao.classeDoJogador1}|${configuracao.classeDoJogador2}|${String(configuracao.comeca)}|${semente}`;
  const guardado = useRef<{
    readonly chave: string;
    readonly controle: ReturnType<typeof criarControladorLocal>;
  } | null>(null);
  if (guardado.current?.chave !== chave) {
    guardado.current = { chave, controle: criarControladorLocal(configuracao, semente) };
  }
  const controle = guardado.current.controle;

  const assinar = useCallback(
    (aoMudar: () => void) =>
      controle.aoMudar(() => {
        aoMudar();
      }),
    [controle],
  );
  const ler = useCallback(() => controle.estado(), [controle]);
  const sessao = useSyncExternalStore(assinar, ler, ler);

  const visao = useMemo(
    () =>
      sessao.noAparelho === null ? null : projetarParaJogador(sessao.partida, sessao.noAparelho),
    [sessao.partida, sessao.noAparelho],
  );

  return { sessao, visao, controle };
};
