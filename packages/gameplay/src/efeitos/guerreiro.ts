import type { CardId } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';
import { preverRuptura } from '@arcane-duel/rules-engine';

import {
  ajustar,
  ganharRecurso,
  recuperarAp,
  reduzirNaResposta,
  restaurarGuardaEm,
  definirGuarda,
  perderVidaDireta,
  somarAoAtaque,
} from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { adversarioDo, consumirLimitePorTurno, jogadorDo, slotDe } from '../contexto.js';
import type { EfeitoDeCarta, EfeitoDeCartaDeClasse, EfeitoDePassiva } from '../ganchos.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  definirPromessa,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Guerreiro.
 *
 * Cada entrada corresponde a uma carta do CARD_CATALOG.md e faz exatamente o
 * que está escrito nela. Números não são reinterpretados nem arredondados aqui.
 *
 * Momentum é ganho e gasto sempre pelo mesmo caminho (`ganharRecurso`), que
 * respeita o teto de três fichas.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** O Ataque em resolução causaria Ruptura, com tudo que já foi somado a ele? */
const causariaRuptura = (
  ctx: Contexto,
  alvo: { atacante: string; defensor: string; indice: 0 | 1 | 2 | 3 },
): boolean => {
  const atacante = ctx.partida.jogadores.find((jogador) => jogador.id === alvo.atacante);
  const defensor = ctx.partida.jogadores.find((jogador) => jogador.id === alvo.defensor);
  if (atacante === undefined || defensor === undefined) return false;
  const slot = atacante.acoes.find((atual) => atual.indice === alvo.indice);
  const valores = slot?.perfil?.valores ?? null;
  if (slot === undefined || valores === null) return false;
  return preverRuptura(defensor.guarda, valores, slot.modificadores, slot.reducaoDaResposta);
};

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('W01'),
    {
      // "Se o adversário usar uma carta de Reação contra este Ataque, ganhe 1
      // Momentum depois da resolução."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveReacao) ganharRecurso(ctx, alvo.atacante, 'momentum', 1);
      },
    },
  ],
  [
    id('W02'),
    {
      // "Se for sua primeira Ação do turno, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 1) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('W03'),
    {
      // "Se causar Ruptura, ganhe 1 Momentum."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.ruptura) ganharRecurso(ctx, alvo.atacante, 'momentum', 1);
      },
    },
  ],
  [
    id('W04'),
    {
      // "Se o inimigo já estava com Guarda 0 quando esta carta foi declarada,
      // recebe +2 D." A checagem é no momento da declaração, não na resolução.
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).guarda === 0) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
        }
      },
    },
  ],
  [
    id('W05'),
    {
      // "Ao declarar, gaste até 2 Momentum. Recebe +1 D por Momentum gasto."
      // O quanto foi gasto veio da parcela variável do custo, já paga.
      aoDeclarar: (ctx, alvo) => {
        const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
        const gasto = slot?.recursoGasto ?? 0;
        if (gasto > 0) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: gasto });
      },
    },
  ],
  [
    id('W06'),
    {
      // "Se for sua terceira Ação do turno, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 3) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('W07'),
    {
      // "Se o adversário usar uma carta de Reação, recupere 1 AP depois da
      // resolução."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveReacao) recuperarAp(ctx, alvo.atacante, 1);
      },
    },
  ],
  [
    id('W08'),
    {
      // "Se causar Ruptura, o bônus de Ruptura deste Ataque é +3 D em vez de
      // +2 D." Substituição do valor universal, não uma soma a ele.
      aoDeclarar: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { bonusDeRupturaSubstituto: 3 });
      },
    },
  ],
  [
    id('W09'),
    {
      // "Se sua Ação anterior foi um Ataque de 1 AP, recebe +1 D e +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.acaoAnteriorFoiAtaqueDe1Ap) > 0) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        }
      },
    },
  ],
  [
    id('W10'),
    {
      // "Só pode ser usado se o inimigo estiver com Guarda 0."
      legalidade: (consulta) =>
        consulta.adversario.guarda === 0 ? null : 'o inimigo precisa estar com Guarda 0',
    },
  ],
  [
    id('W11'),
    {
      // "Seu próximo Ataque neste turno recebe +2 I. Se ele causar Ruptura,
      // ganhe 1 Momentum."
      antesDeResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 2);
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.proximoAtaqueMomentumNaRuptura,
          1,
        );
      },
    },
  ],
  [
    id('W12'),
    {
      // "Ganhe 1 Momentum. Se terminar o turno com 2 de Reserva, ganhe mais 1
      // Momentum."
      antesDeResolver: (ctx, alvo) => {
        ganharRecurso(ctx, alvo.atacante, 'momentum', 1);
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.momentumSeTerminarComReserva2,
          1,
        );
      },
    },
  ],
  [
    id('W13'),
    {
      // "Seu próximo Ataque neste turno recebe +2 D se enfrentar uma carta de
      // Reação. Se não enfrentar, recebe +2 I." As duas promessas ficam
      // guardadas e a resolução escolhe qual vale.
      antesDeResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.proximoAtaqueSeReacaoDano,
          2,
        );
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.proximoAtaqueSemReacaoImpacto,
          2,
        );
      },
    },
  ],
  [
    id('W14'),
    {
      // "No fim deste turno, ganhe +1 Reserva além da conversão normal,
      // respeitando o máximo de 2."
      antesDeResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.reservaExtraNoFim, 1);
      },
    },
  ],
  [
    id('W15'),
    {
      // "Reduza 3 D. Se o Dano final for 0, ganhe 1 Momentum."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveAtaque && resumo.dano === 0) {
          ganharRecurso(ctx, alvo.defensor, 'momentum', 1);
        }
      },
    },
  ],
  [
    id('W16'),
    {
      // "Reduza 3 I. Se isso impedir uma Ruptura, ganhe 1 Momentum."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.teriaRompidoSemResposta && !resumo.ruptura) {
          ganharRecurso(ctx, alvo.defensor, 'momentum', 1);
        }
      },
    },
  ],
  [
    id('W17'),
    {
      // "Reduza 2 D e 2 I. Se ainda perder Vida, ganhe 1 Momentum."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) ganharRecurso(ctx, alvo.defensor, 'momentum', 1);
      },
    },
  ],
  [
    id('W18'),
    {
      // "Reduza 2 D. Se o Dano final for 0, o adversário perde 2 de Vida."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveAtaque && resumo.dano === 0) {
          perderVidaDireta(ctx, alvo.atacante, 2, alvo.origem);
        }
      },
    },
  ],
  [
    id('W19'),
    {
      // "Reduza 1 D e 2 I."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 2 });
      },
    },
  ],
  [
    id('W20'),
    {
      // "Só contra um Ataque que causaria Ruptura. Reduza 1 D e 3 I."
      legalidade: (consulta) =>
        consulta.perfil.valores !== null ? null : 'só responde a um Ataque',
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 3 });
      },
    },
  ],
]);

/** A restrição de W20 depende do estado da Ação, não só do perfil da carta. */
export const podeUsarUltimoBastiao = (
  ctx: Contexto,
  alvo: { atacante: string; defensor: string; indice: 0 | 1 | 2 | 3 },
): boolean => causariaRuptura(ctx, alvo);

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('WP01'),
    {
      // "Revele quando um Ataque causaria Ruptura. Reduza 2 I. Depois de
      // revelada, uma vez por turno inimigo, Ative e gaste 1 Momentum para
      // reduzir 1 I de um Ataque que causaria Ruptura."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'antes-de-resolver' &&
        revelacao.alvo !== null &&
        revelacao.alvo.defensor === revelacao.dono &&
        causariaRuptura(ctx, revelacao.alvo),
      aoRevelar: (ctx, revelacao) => {
        if (revelacao.alvo === null) return;
        reduzirNaResposta(ctx, revelacao.alvo.atacante, revelacao.alvo.indice, { impacto: 2 });
      },
      antesDeResolver: (ctx, alvo) => {
        if (alvo.defensor !== alvo.dono) return;
        const dono = jogadorDo(ctx, alvo.dono);
        if (dono.recurso.classe !== 'guerreiro' || dono.recurso.momentum < 1) return;
        if (!causariaRuptura(ctx, alvo)) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        ganharRecurso(ctx, alvo.dono, 'momentum', -1);
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('WP02'),
    {
      // "Revele ao chegar a 15 de Vida ou menos. Depois disso, o primeiro
      // Ataque de cada turno em que gastar Momentum recebe +1 D."
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 15,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        const slot = slotDe(jogadorDo(ctx, alvo.dono), alvo.indice);
        if ((slot?.recursoGasto ?? 0) <= 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('WP03'),
    {
      // "Revele quando o adversário declarar a terceira Ação do turno. Depois
      // disso, a primeira Reação contra a terceira Ação de cada turno inimigo
      // custa 1 R a menos, mínimo 0."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'ao-declarar' &&
        revelacao.alvo !== null &&
        revelacao.alvo.atacante !== revelacao.dono &&
        revelacao.alvo.ordem === 3,
      descontos: (consulta) =>
        consulta.perfil.tipo === 'reacao' && consulta.ordem === 3 ? { reserva: 1 } : {},
    },
  ],
  [
    id('WP04'),
    {
      // "Revele na primeira Ruptura causada. Depois disso, o primeiro Ataque de
      // cada turno jogado enquanto a Guarda inimiga está 0 recebe +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.resumo !== null &&
        revelacao.resumo.ruptura &&
        revelacao.alvo !== null &&
        revelacao.alvo.atacante === revelacao.dono,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (jogadorDo(ctx, alvo.defensor).guarda !== 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('WP05'),
    {
      // "Revele ao perder 4 ou mais de Vida de um Ataque e ganhe 2 Momentum.
      // Depois disso, na primeira vez por turno inimigo que isso ocorrer, ganhe
      // 1 Momentum."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.resumo !== null &&
        revelacao.alvo !== null &&
        revelacao.alvo.defensor === revelacao.dono &&
        revelacao.resumo.dano >= 4,
      aoRevelar: (ctx, revelacao) => {
        ganharRecurso(ctx, revelacao.dono, 'momentum', 2);
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || resumo.dano < 4) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        ganharRecurso(ctx, alvo.dono, 'momentum', 1);
      },
    },
  ],
  [
    id('WP06'),
    {
      // "Revele quando uma Reação reduzir o Dano final a 0. Depois disso, na
      // primeira vez por turno inimigo que isso ocorrer, restaure 1 Guarda."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.resumo !== null &&
        revelacao.alvo !== null &&
        revelacao.alvo.defensor === revelacao.dono &&
        revelacao.resumo.houveAtaque &&
        revelacao.resumo.houveReacao &&
        revelacao.resumo.dano === 0,
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono) return;
        if (!resumo.houveAtaque || !resumo.houveReacao || resumo.dano !== 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        restaurarGuardaEm(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('WP07'),
    {
      // "Revele no início do seu turno se o inimigo estiver com Reserva 0.
      // Depois disso, enquanto ele estiver com Reserva 0, seu primeiro Ataque
      // do turno recebe +1 I."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'inicio-do-turno' &&
        ctx.partida.turno?.jogadorAtivo === revelacao.dono &&
        adversarioDo(ctx, revelacao.dono).reserva === 0,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (jogadorDo(ctx, alvo.defensor).reserva !== 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('WP08'),
    {
      // "Revele quando jogar um Ataque de 3 AP. Depois disso, seu primeiro
      // Ataque de 3 AP de cada turno recebe +1 I."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'ao-declarar' &&
        revelacao.alvo !== null &&
        revelacao.alvo.atacante === revelacao.dono &&
        revelacao.alvo.perfil.valores !== null &&
        revelacao.alvo.perfil.custo.valor === 3,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (alvo.perfil.custo.valor !== 3) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('WP09'),
    {
      // "Revele quando o inimigo usar sua segunda carta de Reação no mesmo
      // turno. Depois disso, sempre que isso ocorrer, recupere 1 AP."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'ao-responder' &&
        revelacao.alvo !== null &&
        revelacao.alvo.defensor !== revelacao.dono &&
        lerPromessa(ctx, adversarioDo(ctx, revelacao.dono).id, CHAVE.reacoesUsadas) >= 2,
      aoResponder: (ctx, alvo) => {
        if (alvo.defensor === alvo.dono) return;
        if (lerPromessa(ctx, alvo.defensor, CHAVE.reacoesUsadas) !== 2) return;
        recuperarAp(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('WP10'),
    {
      // "Revele quando terminar seu turno com Reserva 2. Depois disso, sua
      // primeira carta de Reação de cada turno inimigo reduz +1 D ou +1 I."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' && jogadorDo(ctx, revelacao.dono).reserva === 2,
      aoResponder: (ctx, alvo) => {
        if (alvo.defensor !== alvo.dono || alvo.reacao === null) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        // Sem escolha informada, a redução vai para o Impacto quando o Ataque
        // ainda ameaça romper a Guarda, e para o Dano nos demais casos.
        const contra = causariaRuptura(ctx, alvo);
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, contra ? { impacto: 1 } : { dano: 1 });
      },
    },
  ],
]);

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('WC01'),
    {
      // "Quando estiver recebendo um Ataque, Guarda Marcial reduz 1 D e 1 I
      // nesta ação."
      //
      // A carta não tem gancho próprio: ela muda a Defesa Inata, e quem resolve
      // a Defesa Inata é a mecânica da classe, que consulta o estado desta
      // carta. Somar uma redução aqui daria a redução duas vezes a quem
      // respondesse com carta de Reação, que não é o que o texto diz.
      ativar: {},
      exaurir: {
        // "Quando um Ataque causaria Ruptura, impeça a Ruptura. Depois da
        // resolução, ajuste sua Guarda para 3."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          ajustar(ctx, alvo.atacante, alvo.indice, { impedirRuptura: true });
        },
        aposResolver: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          definirGuarda(ctx, alvo.dono, 3);
        },
      },
    },
  ],
  [
    id('WC02'),
    {
      ativar: {
        // "Ao declarar um Ataque, ele recebe +1 D e +1 I."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Ao declarar um Ataque, ele recebe +3 I. Se causar Ruptura, ganhe 2
        // Momentum."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (resumo.ruptura) ganharRecurso(ctx, alvo.atacante, 'momentum', 2);
        },
      },
    },
  ],
  [
    id('WC03'),
    {
      ativar: {
        // "Depois que o adversário usar uma carta de Reação contra seu Ataque,
        // ganhe 1 Momentum."
        aposResolver: (ctx, alvo, resumo) => {
          if (resumo.houveReacao) ganharRecurso(ctx, alvo.atacante, 'momentum', 1);
        },
      },
      exaurir: {
        // "Depois que o adversário usar uma carta de Reação, seu Ataque recebe
        // +3 D depois que a redução da Reação for aplicada."
        aoResponder: (ctx, alvo) => {
          if (alvo.reacao === null) return;
          ajustar(ctx, alvo.atacante, alvo.indice, { bonusAposReducao: 3 });
        },
      },
    },
  ],
  [
    id('WC04'),
    {
      ativar: {
        // "Quando causar Ruptura, recupere 1 AP."
        aposResolver: (ctx, alvo, resumo) => {
          if (resumo.ruptura) recuperarAp(ctx, alvo.atacante, 1);
        },
      },
      exaurir: {
        // "Quando causar Ruptura, seu próximo Ataque neste turno recebe +3 D."
        aposResolver: (ctx, alvo, resumo) => {
          if (!resumo.ruptura) return;
          prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueDano, 3);
        },
      },
    },
  ],
  [
    id('WC05'),
    {
      ativar: {
        // "Depois que sua carta de Reação resolver, ganhe 1 Momentum."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || !resumo.houveReacao) return;
          ganharRecurso(ctx, alvo.dono, 'momentum', 1);
        },
      },
      exaurir: {
        // "Quando jogar uma Reação, ela reduz +2 D e +2 I. Depois da resolução,
        // ganhe 2 Momentum."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono || alvo.reacao === null) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || !resumo.houveReacao) return;
          ganharRecurso(ctx, alvo.dono, 'momentum', 2);
        },
      },
    },
  ],
  [
    id('WC06'),
    {
      ativar: {
        // "Quando jogar um Ataque imediatamente depois de outro Ataque, o
        // segundo recebe +1 D e +1 I."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.perfil.valores === null) return;
          if (lerPromessa(ctx, alvo.atacante, CHAVE.acaoAnteriorFoiAtaque) <= 0) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Quando jogar um Ataque imediatamente depois de outro Ataque, ele
        // custa 1 AP a menos, mínimo 1, e recebe +2 D e +1 I."
        descontos: (consulta) =>
          consulta.perfil.valores !== null &&
          lerPromessaDoEstado(consulta.jogador.anotacoes, CHAVE.acaoAnteriorFoiAtaque) > 0
            ? { ap: 1, apMinimo: 1 }
            : {},
        aoDeclarar: (ctx, alvo) => {
          if (alvo.perfil.valores === null) return;
          if (lerPromessa(ctx, alvo.atacante, CHAVE.acaoAnteriorFoiAtaque) <= 0) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 1 });
        },
      },
    },
  ],
]);

export const ULTIMATES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  // "Quebra-Reinos — Ataque. 3 AP e 3 Momentum. 7 D / 3 I." Sem texto adicional.
  [id('WU01'), {}],
  [
    id('WU02'),
    {
      // "Última Palavra — Reação. 2 R e 3 Momentum. O Dano final daquele Ataque
      // se torna 0 e reduza 2 I. Depois da resolução, o adversário perde 4 de
      // Vida."
      aoResponder: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0, reducaoDeImpacto: 2 });
      },
      aposResolver: (ctx, alvo) => {
        perderVidaDireta(ctx, alvo.atacante, 4, alvo.origem);
      },
    },
  ],
  [
    id('WU03'),
    {
      // "Sequência do Campeão — Ataque. 3 AP e 2 Momentum. 4 D / 2 I. Recebe +2
      // D por Ataque que você já realizou neste turno, máximo +4 D."
      aoDeclarar: (ctx, alvo) => {
        const jaRealizados = lerPromessa(ctx, alvo.atacante, CHAVE.ataquesResolvidos);
        const bonus = Math.min(jaRealizados * 2, 4);
        if (bonus > 0) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: bonus });
      },
    },
  ],
]);

/** Leitura de anotação direto de um estado, para as consultas de custo. */
const lerPromessaDoEstado = (
  anotacoes: readonly { readonly chave: string; readonly valor: number }[],
  chave: string,
): number => {
  let total = 0;
  for (const anotacao of anotacoes) if (anotacao.chave === chave) total += anotacao.valor;
  return total;
};

export { consumirPromessa, definirPromessa };
