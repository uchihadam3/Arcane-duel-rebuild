import type { CardId, EstadoDeJogador, PlayerId } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';
import {
  adiantarCartaNoCooldown,
  devolverCartaAMao,
  preverRuptura,
  valorDoRecurso,
  zonaDaCarta,
} from '@arcane-duel/rules-engine';

import {
  abrirAcaoExtra,
  ajustar,
  aplicarCondicaoEm,
  ganharRecurso,
  recuperarAp,
  reduzirNaResposta,
  somarAoAtaque,
} from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import {
  adversarioDo,
  consumirLimitePorTurno,
  emitir,
  gravarJogador,
  jogadorDo,
  slotDe,
} from '../contexto.js';
import type {
  AlvoDoEfeito,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import {
  chaveDaPassiva,
  emitirProntificacao,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Mago.
 *
 * As seis Cartas de Classe do Mago são as Runas, e várias habilidades
 * perguntam pelo estado delas. "Runa Ativada" é a Carta de Classe no estado
 * `ativada`; "Runa Pronta" é a mesma carta no estado `pronta`. Exaurir uma Runa
 * continua sendo o efeito definitivo que tira a carta da partida.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** Identificadores das seis Runas, na ordem do catálogo. */
export const RUNAS: readonly CardId[] = [
  id('MC01'),
  id('MC02'),
  id('MC03'),
  id('MC04'),
  id('MC05'),
  id('MC06'),
];

export const ehRuna = (carta: CardId): boolean => RUNAS.includes(carta);

export const runasAtivadas = (jogador: EstadoDeJogador): readonly CardId[] =>
  jogador.cartasDeClasse.filter((item) => item.estado === 'ativada').map((item) => item.carta);

export const runasProntas = (jogador: EstadoDeJogador): readonly CardId[] =>
  jogador.cartasDeClasse.filter((item) => item.estado === 'pronta').map((item) => item.carta);

/** "Deixe Pronta uma Runa Ativada." */
export const prontificarRuna = (
  ctx: Contexto,
  jogador: PlayerId,
  carta: CardId,
  origem: CardId,
): boolean => {
  const atual = jogadorDo(ctx, jogador);
  const equipada = atual.cartasDeClasse.find((item) => item.carta === carta);
  if (equipada?.estado !== 'ativada') return false;

  gravarJogador(ctx, {
    ...atual,
    cartasDeClasse: atual.cartasDeClasse.map((item) =>
      item.carta === carta ? { ...item, estado: 'pronta' as const } : item,
    ),
  });
  emitirProntificacao(ctx, jogador, carta, origem);
  return true;
};

const causariaRuptura = (
  ctx: Contexto,
  alvo: { atacante: PlayerId; defensor: PlayerId; indice: 0 | 1 | 2 | 3 },
): boolean => {
  const atacante = ctx.partida.jogadores.find((jogador) => jogador.id === alvo.atacante);
  const defensor = ctx.partida.jogadores.find((jogador) => jogador.id === alvo.defensor);
  if (atacante === undefined || defensor === undefined) return false;
  const slot = atacante.acoes.find((atual) => atual.indice === alvo.indice);
  const valores = slot?.perfil?.valores ?? null;
  if (slot === undefined || valores === null) return false;
  return preverRuptura(defensor.guarda, valores, slot.modificadores, slot.reducaoDaResposta);
};

/** "Escolha +1 D ou +1 I": aplica a opção escolhida na declaração. */
const aplicarReforco = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  const escolha = slot?.escolhas.reforco ?? 'dano';
  somarAoAtaque(ctx, alvo.atacante, alvo.indice, escolha === 'dano' ? { dano: 1 } : { impacto: 1 });
};

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('M01'),
    {
      // "Se pelo menos uma Runa estiver Ativada ao declarar, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (runasAtivadas(jogadorDo(ctx, alvo.atacante)).length > 0) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        }
      },
    },
  ],
  [
    id('M02'),
    {
      // "Se o inimigo tiver Queimadura, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).condicoes.queimadura > 0) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        }
      },
    },
  ],
  [
    id('M03'),
    {
      // "Se causar Dano à Vida, aplique Queimadura 2."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) aplicarCondicaoEm(ctx, alvo.defensor, 'queimadura', 2);
      },
    },
  ],
  [
    id('M04'),
    {
      // "Se causar Ruptura, recupere 1 Mana."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.ruptura) ganharRecurso(ctx, alvo.atacante, 'mana', 1);
      },
    },
  ],
  [
    id('M05'),
    {
      // "Se for sua terceira Ação do turno, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 3) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('M06'),
    {
      // "Se causar Dano à Vida, aplique Lento 1."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) aplicarCondicaoEm(ctx, alvo.defensor, 'lento', 1);
      },
    },
  ],
  [
    id('M07'),
    {
      // "Se causar Ruptura, aplique Lento 1."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.ruptura) aplicarCondicaoEm(ctx, alvo.defensor, 'lento', 1);
      },
    },
  ],
  [
    id('M08'),
    {
      // "Você pode Ativar uma Runa Pronta ao declarar. Se fizer isso, escolha
      // +1 D ou +1 I." A Ativação em si é feita pelo comando de Carta de
      // Classe; aqui só o bônus, e só quando ela de fato aconteceu.
      aoDeclarar: (ctx, alvo) => {
        const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
        const ativouRuna = (slot?.cartasDeClasseUsadas ?? []).some((uso) => ehRuna(uso.carta));
        if (ativouRuna) aplicarReforco(ctx, alvo);
      },
    },
  ],
  [
    id('M09'),
    {
      // "Se for sua segunda Ação, escolha +1 D ou +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 2) aplicarReforco(ctx, alvo);
      },
    },
  ],
  [
    id('M10'),
    {
      // "Recebe +1 D por Mana adicional gasta nesta carta." A parcela impressa
      // de 1 Mana não conta: adicional é o que passou dela.
      aoDeclarar: (ctx, alvo) => {
        const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
        const adicional = Math.max((slot?.recursoGasto ?? 0) - 1, 0);
        if (adicional > 0) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: adicional });
      },
    },
  ],
  [
    id('M11'),
    {
      // "Ganhe 2 Mana, até o máximo."
      antesDeResolver: (ctx, alvo) => {
        ganharRecurso(ctx, alvo.atacante, 'mana', 2);
      },
    },
  ],
  [
    id('M12'),
    {
      // "Seu próximo Ataque/Feitiço neste turno recebe +1 D e +1 I."
      antesDeResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoFeiticoDano, 1);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoFeiticoImpacto, 1);
      },
    },
  ],
  [
    id('M13'),
    {
      // "Escolha uma carta sua em CD1 e devolva-a imediatamente à mão."
      legalidade: (consulta) =>
        consulta.jogador.cooldown[1].length > 0 ? null : 'não há carta em CD1 para devolver',
      antesDeResolver: (ctx, alvo) => {
        const jogador = jogadorDo(ctx, alvo.atacante);
        const slot = slotDe(jogador, alvo.indice);
        const escolhida = slot?.escolhas.cartaEmCooldown ?? jogador.cooldown[1][0];
        if (escolhida === undefined) return;
        if (zonaDaCarta(jogador, escolhida) !== 1) return;
        const movimento = devolverCartaAMao(jogador, escolhida);
        if (!movimento.ok) return;
        gravarJogador(ctx, movimento.valor.jogador);
        emitir(ctx, {
          tipo: 'carta-devolvida-a-mao',
          jogador: alvo.atacante,
          carta: escolhida,
          de: movimento.valor.de,
        });
      },
    },
  ],
  [
    id('M14'),
    {
      // "Deixe Pronta uma de suas Runas Ativadas."
      legalidade: (consulta) =>
        runasAtivadas(consulta.jogador).length > 0 ? null : 'não há Runa Ativada',
      antesDeResolver: (ctx, alvo) => {
        const jogador = jogadorDo(ctx, alvo.atacante);
        const slot = slotDe(jogador, alvo.indice);
        const escolhida = slot?.escolhas.cartaDeClasse ?? runasAtivadas(jogador)[0];
        if (escolhida !== undefined) prontificarRuna(ctx, alvo.atacante, escolhida, alvo.origem);
      },
    },
  ],
  [
    id('M15'),
    {
      // "Reduza 3 D."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
    },
  ],
  [
    id('M16'),
    {
      // "O Dano final deste Ataque se torna 0. O Impacto não é alterado."
      aoResponder: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0 });
      },
    },
  ],
  [
    id('M17'),
    {
      // "Reduza 3 I."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
    },
  ],
  [
    id('M18'),
    {
      // "Reduza 2 D e 1 I. Se o Dano final for 0, aplique Lento 1 ao atacante."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 1 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveAtaque && resumo.dano === 0) {
          aplicarCondicaoEm(ctx, alvo.atacante, 'lento', 1);
        }
      },
    },
  ],
  [
    id('M19'),
    {
      // "Quando o adversário jogar uma Técnica, cancele o texto dela. Custos e
      // espaço de Ação continuam gastos."
      legalidade: (consulta) =>
        consulta.perfil.tipo === 'tecnica' ? null : 'só responde a uma Técnica',
      aoResponder: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { cancelarTexto: true });
      },
    },
  ],
  [
    id('M20'),
    {
      // "Reduza 2 D e 2 I. Depois, deixe Pronta uma Runa Ativada."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
      aposResolver: (ctx, alvo) => {
        const jogador = jogadorDo(ctx, alvo.defensor);
        const escolhida = runasAtivadas(jogador)[0];
        if (escolhida !== undefined) prontificarRuna(ctx, alvo.defensor, escolhida, alvo.origem);
      },
    },
  ],
]);

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('MP01'),
    {
      // "Revele quando sua Mana chegar a 1 ou menos e ganhe 2 Mana. Depois, se
      // começar seu turno com 1 Mana ou menos, recupere 3 em vez de 2."
      // O "3 em vez de 2" é aplicado pela mecânica de classe, que consulta esta
      // Passiva antes de repor a Mana.
      revelaEm: (ctx, revelacao) =>
        (valorDoRecurso(jogadorDo(ctx, revelacao.dono), 'mana') ?? 9) <= 1,
      aoRevelar: (ctx, revelacao) => {
        ganharRecurso(ctx, revelacao.dono, 'mana', 2);
      },
    },
  ],
  [
    id('MP02'),
    {
      // "Revele ao completar sua terceira Ação. Depois disso, quando sua
      // terceira Ação for um Feitiço, coloque a carta uma zona de cooldown mais
      // próxima da mão após resolver."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo !== null &&
        revelacao.alvo.atacante === revelacao.dono &&
        revelacao.alvo.ordem === 3,
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.atacante !== alvo.dono || alvo.ordem !== 3) return;
        if (!alvo.perfil.tags.includes('feitico') || resumo.zonaDeCooldown === null) return;
        adiantar(ctx, alvo.dono, alvo.perfil.carta);
      },
    },
  ],
  [
    id('MP03'),
    {
      // "Revele quando um Ataque causaria Ruptura e reduza 2 I. Depois disso,
      // uma vez por turno inimigo, Ative e gaste 1 Mana para reduzir 1 I de um
      // Ataque que causaria Ruptura."
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
        if ((valorDoRecurso(jogadorDo(ctx, alvo.dono), 'mana') ?? 0) < 1) return;
        if (!causariaRuptura(ctx, alvo)) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        ganharRecurso(ctx, alvo.dono, 'mana', -1);
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('MP04'),
    {
      // "Revele quando Ativar suas duas Runas no mesmo turno e ganhe 1 Mana.
      // Depois disso, na primeira vez por turno que as duas ficarem Ativadas,
      // ganhe 1 Mana."
      revelaEm: (ctx, revelacao) => runasAtivadas(jogadorDo(ctx, revelacao.dono)).length >= 2,
      aoRevelar: (ctx, revelacao) => {
        ganharRecurso(ctx, revelacao.dono, 'mana', 1);
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono) return;
        if (runasAtivadas(jogadorDo(ctx, alvo.dono)).length < 2) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        ganharRecurso(ctx, alvo.dono, 'mana', 1);
      },
    },
  ],
  [
    id('MP05'),
    {
      // "Revele ao perder 4 ou mais de Vida de um Ataque e devolva uma carta de
      // CD1 à mão. Depois disso, na primeira vez por turno inimigo que perder 4
      // ou mais, mova uma carta de CD2 para CD1."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.resumo !== null &&
        revelacao.alvo !== null &&
        revelacao.alvo.defensor === revelacao.dono &&
        revelacao.resumo.dano >= 4,
      aoRevelar: (ctx, revelacao) => {
        const jogador = jogadorDo(ctx, revelacao.dono);
        const carta = jogador.cooldown[1][0];
        if (carta === undefined) return;
        const movimento = devolverCartaAMao(jogador, carta);
        if (!movimento.ok) return;
        gravarJogador(ctx, movimento.valor.jogador);
        emitir(ctx, {
          tipo: 'carta-devolvida-a-mao',
          jogador: revelacao.dono,
          carta,
          de: movimento.valor.de,
        });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || resumo.dano < 4) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        const carta = jogadorDo(ctx, alvo.dono).cooldown[2][0];
        if (carta !== undefined) adiantar(ctx, alvo.dono, carta);
      },
    },
  ],
  [
    id('MP06'),
    {
      // "Revele quando um inimigo alcançar Queimadura 2. Depois disso, seu
      // primeiro Ataque/Feitiço de cada turno contra inimigo com Queimadura
      // recebe +1 I."
      revelaEm: (ctx, revelacao) => adversarioDo(ctx, revelacao.dono).condicoes.queimadura >= 2,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (!alvo.perfil.tags.includes('feitico')) return;
        if (jogadorDo(ctx, alvo.defensor).condicoes.queimadura <= 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('MP07'),
    {
      // "Revele quando o inimigo pagar AP adicional por Lento e ganhe 1 Mana.
      // Depois disso, na primeira vez por turno que isso ocorrer, ganhe 1
      // Mana."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'ao-declarar' &&
        revelacao.alvo !== null &&
        revelacao.alvo.atacante !== revelacao.dono &&
        pagouPorLento(ctx),
      aoRevelar: (ctx, revelacao) => {
        ganharRecurso(ctx, revelacao.dono, 'mana', 1);
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante === alvo.dono || !pagouPorLento(ctx)) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        ganharRecurso(ctx, alvo.dono, 'mana', 1);
      },
    },
  ],
  [
    id('MP08'),
    {
      // "Revele na primeira vez que Ativar uma Runa para modificar um Feitiço.
      // Depois disso, uma vez por turno, o Feitiço que fizer a primeira Runa
      // ser Ativada recebe +1 D ou +1 I."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'ao-declarar' &&
        revelacao.alvo !== null &&
        revelacao.alvo.atacante === revelacao.dono &&
        revelacao.alvo.perfil.tags.includes('feitico') &&
        ativouRunaNesta(ctx, revelacao.alvo),
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || !alvo.perfil.tags.includes('feitico')) return;
        if (!ativouRunaNesta(ctx, alvo)) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.runasAtivadasNoTurno) !== 1) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        aplicarReforco(ctx, alvo);
      },
    },
  ],
  [
    id('MP09'),
    {
      // "Revele quando terminar seu turno com Reserva 2. Depois disso, sua
      // primeira Reação de cada turno inimigo custa 1 Mana a menos, mínimo 0."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' && jogadorDo(ctx, revelacao.dono).reserva === 2,
      descontos: (consulta) =>
        consulta.perfil.tipo === 'reacao' &&
        lerPromessaDoEstado(consulta.jogador.anotacoes, CHAVE.reacoesUsadas) === 0
          ? { recurso: 1 }
          : {},
    },
  ],
  [
    id('MP10'),
    {
      // "Revele quando jogar uma Ação que custe pelo menos 2 Mana. Depois
      // disso, seu primeiro Ataque/Feitiço de cada turno que custe 2 ou mais
      // Mana recebe +1 D ou +1 I."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'ao-declarar' &&
        revelacao.alvo !== null &&
        revelacao.alvo.atacante === revelacao.dono &&
        (slotDe(jogadorDo(ctx, revelacao.dono), revelacao.alvo.indice)?.recursoGasto ?? 0) >= 2,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (!alvo.perfil.tags.includes('feitico')) return;
        const gasto = slotDe(jogadorDo(ctx, alvo.dono), alvo.indice)?.recursoGasto ?? 0;
        if (gasto < 2) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        aplicarReforco(ctx, alvo);
      },
    },
  ],
]);

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('MC01'),
    {
      ativar: {
        // "Depois que um Feitiço causar Dano à Vida, aplique Queimadura 1."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono) return;
          if (!alvo.perfil.tags.includes('feitico') || resumo.dano <= 0) return;
          aplicarCondicaoEm(ctx, alvo.defensor, 'queimadura', 1);
        },
      },
      exaurir: {
        // "Quando a Queimadura do adversário fosse causar Dano, remova toda a
        // Queimadura e faça esse evento causar 3 de Dano em vez do valor
        // normal." O efeito fica armado até o fim do turno do adversário.
        aposResolver: (ctx, alvo) => {
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.cinzasArmada, 1, 'partida');
        },
      },
    },
  ],
  [
    id('MC02'),
    {
      ativar: {
        // "Depois que um Feitiço causar pelo menos 2 I, aplique Lento 1."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono) return;
          if (!alvo.perfil.tags.includes('feitico') || resumo.impacto < 2) return;
          aplicarCondicaoEm(ctx, alvo.defensor, 'lento', 1);
        },
      },
      exaurir: {
        // "Antes de resolver um Feitiço, ele recebe +3 I. Se causar Ruptura,
        // aplique Lento 2."
        antesDeResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
          aplicarCondicaoEm(ctx, alvo.defensor, 'lento', 2);
        },
      },
    },
  ],
  [
    id('MC03'),
    {
      ativar: {
        // "Quando um Feitiço seu iria entrar em CD2 ou CD3, coloque-o uma zona
        // de cooldown mais próxima da mão."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !alvo.perfil.tags.includes('feitico')) return;
          if (resumo.zonaDeCooldown === null || resumo.zonaDeCooldown < 2) return;
          adiantar(ctx, alvo.dono, alvo.perfil.carta);
        },
      },
      exaurir: {
        // "Escolha um Feitiço seu em qualquer zona de cooldown e devolva-o à
        // mão. Se for utilizado novamente neste turno, custa +1 AP."
        aposResolver: (ctx, alvo) => {
          const jogador = jogadorDo(ctx, alvo.dono);
          const slot = slotDe(jogador, alvo.indice);
          const escolhida =
            slot?.escolhas.cartaEmCooldown ??
            jogador.cooldown[1][0] ??
            jogador.cooldown[2][0] ??
            jogador.cooldown[3][0];
          if (escolhida === undefined) return;
          const movimento = devolverCartaAMao(jogador, escolhida);
          if (!movimento.ok) return;
          gravarJogador(ctx, movimento.valor.jogador);
          emitir(ctx, {
            tipo: 'carta-devolvida-a-mao',
            jogador: alvo.dono,
            carta: escolhida,
            de: movimento.valor.de,
          });
          prometerAoProximoAtaque(
            ctx,
            alvo.dono,
            alvo.origem,
            `${CHAVE.ecoEncarece}:${escolhida}`,
            1,
          );
        },
      },
    },
  ],
  [
    id('MC04'),
    {
      ativar: {
        // "Quando usar uma Resposta, reduza mais 1 D ou 1 I daquela ação."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          const contra = causariaRuptura(ctx, alvo);
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, contra ? { impacto: 1 } : { dano: 1 });
        },
      },
      exaurir: {
        // "Quando responder a um Ataque, o Dano final se torna 0 e reduza 2 I."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0, reducaoDeImpacto: 2 });
        },
      },
    },
  ],
  [
    id('MC05'),
    {
      ativar: {
        // "Depois de pagar Mana por uma Ação, recupere 1 Mana depois da
        // resolução."
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          const gasto = slotDe(jogadorDo(ctx, alvo.dono), alvo.indice)?.recursoGasto ?? 0;
          if (gasto > 0) ganharRecurso(ctx, alvo.dono, 'mana', 1);
        },
      },
      exaurir: {
        // "Antes de conjurar um Feitiço, ignore todo o custo de Mana dele. Se o
        // custo impresso de Mana for 2 ou mais, recupere 1 AP depois da
        // resolução."
        descontos: (consulta) =>
          consulta.perfil.tags.includes('feitico') ? { ignorarRecurso: true } : {},
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          const impresso = alvo.perfil.custo.recurso?.quantidade ?? 0;
          if (impresso >= 2) recuperarAp(ctx, alvo.dono, 1);
        },
      },
    },
  ],
  [
    id('MC06'),
    {
      ativar: {
        // "Depois que sua segunda Ação de Feitiço do turno resolver, sua
        // terceira Ação, se também for um Feitiço, custa 1 AP a menos, mínimo
        // 1."
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || !alvo.perfil.tags.includes('feitico')) return;
          // O contador ainda guarda os Feitiços resolvidos **antes** deste, então
          // um significa que o que acabou de resolver é o segundo.
          if (lerPromessa(ctx, alvo.dono, CHAVE.feiticosResolvidos) !== 1) return;
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.prismaticaDesconto, 1);
        },
      },
      exaurir: {
        // "Depois que sua terceira Ação resolver, você pode realizar uma quarta
        // Ação naquele turno. Ela deve ser um Feitiço e todos os custos ainda
        // precisam ser pagos."
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.ordem !== 3) return;
          abrirAcaoExtra(ctx, alvo.dono, alvo.origem);
        },
      },
    },
  ],
]);

export const ULTIMATES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('MU01'),
    {
      // "Meteoro. Se causar Dano à Vida, aplique Queimadura 2."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) aplicarCondicaoEm(ctx, alvo.defensor, 'queimadura', 2);
      },
    },
  ],
  [
    id('MU02'),
    {
      // "Zero Absoluto. Se causar Ruptura, aplique Lento 2."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.ruptura) aplicarCondicaoEm(ctx, alvo.defensor, 'lento', 2);
      },
    },
  ],
  [
    id('MU03'),
    {
      // "Sobrecarga Temporal. Deixe suas duas Runas Prontas, devolva até duas
      // cartas de CD1 à mão e recupere 1 AP."
      antesDeResolver: (ctx, alvo) => {
        for (const runa of runasAtivadas(jogadorDo(ctx, alvo.atacante))) {
          prontificarRuna(ctx, alvo.atacante, runa, alvo.origem);
        }
        for (let vez = 0; vez < 2; vez += 1) {
          const jogador = jogadorDo(ctx, alvo.atacante);
          const carta = jogador.cooldown[1][0];
          if (carta === undefined) break;
          const movimento = devolverCartaAMao(jogador, carta);
          if (!movimento.ok) break;
          gravarJogador(ctx, movimento.valor.jogador);
          emitir(ctx, {
            tipo: 'carta-devolvida-a-mao',
            jogador: alvo.atacante,
            carta,
            de: movimento.valor.de,
          });
        }
        recuperarAp(ctx, alvo.atacante, 1);
      },
    },
  ],
]);

const adiantar = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const atual = jogadorDo(ctx, jogador);
  const movimento = adiantarCartaNoCooldown(atual, carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  if (movimento.valor.voltouParaAMao) {
    emitir(ctx, { tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de });
    return;
  }
  emitir(ctx, {
    tipo: 'carta-adiantada-no-cooldown',
    jogador,
    carta,
    de: movimento.valor.de,
    para: movimento.valor.para,
  });
};

/**
 * O inimigo pagou AP adicional por Lento na Ação que está sendo processada?
 *
 * O contexto cobre um comando só, então procurar o evento dentro dele é
 * procurar dentro daquela Ação.
 */
const pagouPorLento = (ctx: Contexto): boolean =>
  ctx.eventos.some((evento) => evento.tipo === 'lento-consumido');

const ativouRunaNesta = (ctx: Contexto, alvo: AlvoDoEfeito): boolean => {
  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  return (slot?.cartasDeClasseUsadas ?? []).some((uso) => ehRuna(uso.carta));
};

const lerPromessaDoEstado = (
  anotacoes: readonly { readonly chave: string; readonly valor: number }[],
  chave: string,
): number => {
  let total = 0;
  for (const anotacao of anotacoes) if (anotacao.chave === chave) total += anotacao.valor;
  return total;
};
