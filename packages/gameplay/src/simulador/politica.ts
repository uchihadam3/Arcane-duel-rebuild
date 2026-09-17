import type {
  CardId,
  IndiceDeAcao,
  PlayerId,
  VisaoDaPartida,
  VisaoDeJogador,
} from '@arcane-duel/shared-types';
import type { Aleatorio } from '@arcane-duel/rules-engine';
import { CATALOGO } from '@arcane-duel/card-data';
import type { DefinicaoDeCarta } from '@arcane-duel/card-data';

import type { PedidoDeAcao, PedidoDeResposta } from '../partida.js';

/*
 * A política de base do simulador.
 *
 * Ela decide olhando **apenas** a visão do próprio jogador — a mesma projeção
 * que um cliente receberia. A mão do adversário não está lá, e por isso não há
 * como a política trapacear: ela não tem acesso ao estado canônico.
 *
 * O que ela conhece do catálogo é informação pública: o que está impresso nas
 * cartas é conhecido por todo mundo antes da partida começar.
 *
 * O RNG entra só para desempatar opções de mesma pontuação. Combate não tem
 * aleatoriedade nenhuma.
 */

export interface Politica {
  readonly nome: string;
  readonly escolherAcao: (
    visao: VisaoDaPartida,
    eu: PlayerId,
    rng: Aleatorio,
  ) => PedidoDeAcao | null;
  readonly escolherResposta: (
    visao: VisaoDaPartida,
    eu: PlayerId,
    indice: IndiceDeAcao,
    rng: Aleatorio,
  ) => PedidoDeResposta;
}

const meuEstado = (visao: VisaoDaPartida, eu: PlayerId): VisaoDeJogador | undefined =>
  visao.jogadores.find((jogador) => jogador.id === eu);

const oAdversario = (visao: VisaoDaPartida, eu: PlayerId): VisaoDeJogador | undefined =>
  visao.jogadores.find((jogador) => jogador.id !== eu);

const minhasCartas = (jogador: VisaoDeJogador): readonly CardId[] =>
  jogador.mao.flatMap((carta) => (carta.visivel ? [carta.carta] : []));

const recursoDisponivel = (jogador: VisaoDeJogador): number => {
  if (jogador.recurso.classe === 'mago') return jogador.recurso.mana;
  return jogador.recurso.classe === 'guerreiro' ? jogador.recurso.momentum : 0;
};

/** O jogador consegue pagar o custo impresso desta carta agora? */
const cabeNoOrcamento = (
  definicao: DefinicaoDeCarta,
  jogador: VisaoDeJogador,
  lento: number,
): boolean => {
  const custo = definicao.custo;
  if (custo === undefined) return false;

  const recurso = custo.recurso?.quantidade ?? 0;
  if (recurso > recursoDisponivel(jogador)) return false;

  if (custo.moeda === 'reserva') return jogador.reserva >= custo.valor;

  const adicional = lento > 0 ? 1 : 0;
  const disponivel = jogador.pontosDeAcao + (jogador.impulsoInicial ? 1 : 0);
  return disponivel >= custo.valor + adicional;
};

/**
 * Pontuação de uma Ação candidata.
 *
 * Deliberadamente simples: Impacto vale mais quando a Guarda inimiga ainda
 * segura o Ataque, e Dano vale mais quando ela já caiu. É uma linha de base
 * para medir o jogo, não uma tentativa de jogar bem.
 */
const pontuarAcao = (definicao: DefinicaoDeCarta, adversario: VisaoDeJogador): number => {
  if (definicao.tipo === 'tecnica') return 3;
  const valores = definicao.valores;
  if (valores === undefined) return 0;

  const guardaEmPe = adversario.guarda > 0;
  const pesoDeImpacto = guardaEmPe ? 2 : 0;
  const quebraAGuarda = guardaEmPe && valores.impacto >= adversario.guarda ? 4 : 0;
  const bonusDeUltimate = definicao.tipo === 'ultimate' ? 6 : 0;

  return valores.dano * 3 + valores.impacto * pesoDeImpacto + quebraAGuarda + bonusDeUltimate;
};

/** Restrições impressas que a política consegue conferir sozinha. */
const respeitaOTexto = (definicao: DefinicaoDeCarta, adversario: VisaoDeJogador): boolean => {
  if (definicao.id === ('W10' as CardId)) return adversario.guarda === 0;
  return true;
};

const desempatar = <T>(opcoes: readonly T[], rng: Aleatorio): T | undefined => {
  if (opcoes.length <= 1) return opcoes[0];
  return opcoes[rng.inteiro(opcoes.length)];
};

/** Quanto uma carta de Reação reduz, pelo texto impresso dela. */
const REDUCAO_DE_REACAO: Readonly<
  Record<string, { readonly dano: number; readonly impacto: number }>
> = {
  W15: { dano: 3, impacto: 0 },
  W16: { dano: 0, impacto: 3 },
  W17: { dano: 2, impacto: 2 },
  W18: { dano: 2, impacto: 0 },
  W19: { dano: 1, impacto: 2 },
  W20: { dano: 1, impacto: 3 },
  M15: { dano: 3, impacto: 0 },
  M16: { dano: 99, impacto: 0 },
  M17: { dano: 0, impacto: 3 },
  M18: { dano: 2, impacto: 1 },
  M19: { dano: 0, impacto: 0 },
  M20: { dano: 2, impacto: 2 },
};

/**
 * Cria a política de base.
 *
 * `exploracao` é a fração de decisões em que a política escolhe uniformemente
 * entre as opções legais em vez da melhor pontuada. O padrão é **zero**: com
 * zero, o PRNG é usado só para desempatar, exatamente como pedido, e o lote
 * inteiro é uma repetição das poucas linhas de jogo que a política sabe seguir.
 * Um valor acima de zero serve para medir distribuição e precisa ser pedido
 * explicitamente — ele não faz parte da linha de base.
 */
export const criarPoliticaDeBase = (exploracao = 0): Politica => ({
  nome: exploracao === 0 ? 'base' : `base+exploracao-${exploracao.toFixed(2)}`,

  escolherAcao: (visao, eu, rng) => {
    const jogador = meuEstado(visao, eu);
    const adversario = oAdversario(visao, eu);
    if (jogador === undefined || adversario === undefined) return null;

    const candidatas: { readonly pedido: PedidoDeAcao; readonly nota: number }[] = [];

    const considerar = (carta: CardId): void => {
      const definicao = CATALOGO.porId(carta);
      if (definicao === undefined) return;
      if (
        definicao.tipo !== 'ataque' &&
        definicao.tipo !== 'tecnica' &&
        definicao.tipo !== 'ultimate'
      ) {
        return;
      }
      if (definicao.comportaComo === 'reacao') return;
      if (!cabeNoOrcamento(definicao, jogador, jogador.condicoes.lento)) return;
      if (!respeitaOTexto(definicao, adversario)) return;

      candidatas.push({ pedido: { carta }, nota: pontuarAcao(definicao, adversario) });
    };

    for (const carta of minhasCartas(jogador)) considerar(carta);
    if (jogador.ultimate.estado === 'disponivel') considerar(jogador.ultimate.carta);

    if (candidatas.length === 0) return null;

    if (exploracao > 0 && rng.proximo() < exploracao) {
      return desempatar(candidatas, rng)?.pedido ?? null;
    }

    const melhorNota = Math.max(...candidatas.map((item) => item.nota));
    const empatadas = candidatas.filter((item) => item.nota === melhorNota);
    return desempatar(empatadas, rng)?.pedido ?? null;
  },

  escolherResposta: (visao, eu, indice, rng) => {
    const jogador = meuEstado(visao, eu);
    const adversario = oAdversario(visao, eu);
    if (jogador === undefined || adversario === undefined) return { tipo: 'sem-resposta' };

    const slot = adversario.acoes.find((atual) => atual.indice === indice);
    const perfil = slot?.perfil ?? null;
    if (perfil === null) return { tipo: 'sem-resposta' };

    const ameaca = perfil.valores;
    const ehTecnica = perfil.tipo === 'tecnica';
    if (ameaca === null && !ehTecnica) return { tipo: 'sem-resposta' };

    const ameacaDeRuptura =
      ameaca !== null && jogador.guarda > 0 && ameaca.impacto >= jogador.guarda;
    const ameacaDeDano = ameaca !== null && ameaca.dano >= 3;
    if (!ameacaDeRuptura && !ameacaDeDano && !ehTecnica) return { tipo: 'sem-resposta' };

    const candidatas: { readonly pedido: PedidoDeResposta; readonly nota: number }[] = [];

    for (const carta of minhasCartas(jogador)) {
      const definicao = CATALOGO.porId(carta);
      if (definicao?.tipo !== 'reacao') continue;
      if (!cabeNoOrcamento(definicao, jogador, 0)) continue;
      // Contrafeitiço só responde a Técnica; Último Bastião só a um Ataque que
      // causaria Ruptura. As duas restrições estão impressas e são públicas.
      if (carta === ('M19' as CardId) && !ehTecnica) continue;
      if (carta === ('W20' as CardId) && !ameacaDeRuptura) continue;
      if (ehTecnica && carta !== ('M19' as CardId)) continue;

      const reducao = REDUCAO_DE_REACAO[carta] ?? { dano: 0, impacto: 0 };
      const util =
        ameaca === null
          ? 5
          : Math.min(reducao.dano, ameaca.dano) * 2 +
            (ameacaDeRuptura ? Math.min(reducao.impacto, ameaca.impacto) * 3 : 0);
      if (util <= 0) continue;

      candidatas.push({ pedido: { tipo: 'carta-de-reacao', carta }, nota: util });
    }

    if (candidatas.length > 0) {
      if (exploracao > 0 && rng.proximo() < exploracao) {
        const qualquer = desempatar(candidatas, rng);
        if (qualquer !== undefined) return qualquer.pedido;
      }
      const melhor = Math.max(...candidatas.map((item) => item.nota));
      const empatadas = candidatas.filter((item) => item.nota === melhor);
      const escolhida = desempatar(empatadas, rng);
      if (escolhida !== undefined) return escolhida.pedido;
    }

    if (ehTecnica) return { tipo: 'sem-resposta' };

    // Sem carta que compense, resta a Defesa Inata da classe.
    const podePagar = jogador.recurso.classe !== 'mago' || jogador.recurso.mana >= 1;
    return podePagar
      ? { tipo: 'defesa-inata', reforcarImpacto: ameacaDeRuptura }
      : { tipo: 'sem-resposta' };
  },
});

/** A linha de base oficial: PRNG só para desempate. */
export const POLITICA_DE_BASE: Politica = criarPoliticaDeBase(0);
