import type { CardId, PlayerId } from './ids.js';

/*
 * Escolhas que ficam pendentes.
 *
 * Quase toda escolha de carta chega junto com o comando de quem escolhe: quem
 * declara uma Ação manda as escolhas dela, quem responde manda as da Resposta.
 *
 * Existe um caso em que isso não dá: um efeito do **defensor** que dispara no
 * meio da resolução de uma Ação do adversário e manda ele escolher uma carta.
 * Não há comando do defensor naquele instante, e o motor não pode escolher por
 * ele. Então o efeito não escolhe: ele registra a escolha como pendente, e o
 * dono precisa resolvê-la com um comando próprio antes de voltar a agir.
 *
 * O que a escolha faz com a carta é mecânica universal de zona, não texto de
 * carta — por isso cabe aqui.
 */

export type EfeitoDaEscolha = 'devolver-a-mao' | 'adiantar-uma-zona';

export interface EscolhaPendente {
  /** Quem precisa escolher. */
  readonly jogador: PlayerId;
  /** A carta cujo texto criou a pendência, para o log e para a interface. */
  readonly origem: CardId;
  readonly efeito: EfeitoDaEscolha;
  /** As únicas opções legais. Escolher fora desta lista é recusado. */
  readonly opcoes: readonly CardId[];
}

export const escolhasPendentesDe = (
  pendentes: readonly EscolhaPendente[],
  jogador: PlayerId,
): readonly EscolhaPendente[] => pendentes.filter((escolha) => escolha.jogador === jogador);
