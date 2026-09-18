import type {
  CardId,
  CondicaoId,
  EscolhasDaAcao,
  EstadoDeJogador,
  PlayerId,
} from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import {
  REGRAS_UNIVERSAIS,
  adiantarCartaNoCooldown,
  condicoesAtivas,
  devolverCartaAMao,
} from '@arcane-duel/rules-engine';

import {
  ajustar,
  limparCondicoesNegativas,
  pagarComVida,
  perderVidaDireta,
  reduzirNaResposta,
  removerCondicaoEm,
  restaurarVidaEm,
  somarAoAtaque,
} from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import {
  consumirLimitePorTurno,
  emitir,
  gravarJogador,
  jogadorDo,
  registrarAnotacao,
  slotDe,
} from '../contexto.js';
import type {
  AlvoDoEfeito,
  ConsultaDeLegalidade,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import {
  atendeDevocao,
  avancarDevocao,
  consumirMilagre,
  descerDevocao,
  devocaoDe,
} from '../recursos-classe.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  escolhasDaAcao,
  exigirCartaEntre,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Clérigo.
 *
 * A Devoção não é moeda: nada aqui a "gasta" para pagar custo. Ela é um estado
 * exigido — "Requer Graça ou mais" — que é conferido na legalidade, antes de
 * qualquer AP sair do bolso, e que algumas cartas fazem descer **depois** da
 * resolução, como preço do que fizeram.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** As seis Cartas de Classe do Clérigo: três Doutrinas e três Relíquias. */
export const DOUTRINAS_E_RELIQUIAS: readonly CardId[] = [
  id('CC01'),
  id('CC02'),
  id('CC03'),
  id('CC04'),
  id('CC05'),
  id('CC06'),
];

const DOUTRINA_DA_MISERICORDIA = id('CC01');
const RELICARIO_DOS_SANTOS = id('CC06');
const CORACAO_MISERICORDIOSO = id('CP01');
const DEVOCAO_IMOVEL = id('CP03');
const SEGUNDA_LUZ = id('CP10');

/** As cartas cujo texto impresso exige Fervor ou Milagre. */
export const EXIGEM_FERVOR: readonly CardId[] = [
  id('C06'),
  id('C10'),
  id('C16'),
  id('C18'),
  id('C20'),
  id('CU01'),
  id('CU02'),
  id('CU03'),
];

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

/* ------------------------------------------------------------------ */
/* Requisitos de Devoção                                               */
/* ------------------------------------------------------------------ */

/**
 * "Segunda Luz: enquanto permanecer com 5 de Vida ou menos, sua primeira
 * habilidade de cada próprio turno pode ser tratada como se sua Devoção
 * estivesse 1 estágio acima para verificar requisitos."
 *
 * Vale só na declaração do próprio turno — "cada próprio turno" —, então uma
 * Resposta no turno inimigo nunca ganha o degrau.
 */
const degrauDaSegundaLuz = (consulta: ConsultaDeLegalidade): number =>
  consulta.acaoRespondida === null &&
  consulta.ordem === 1 &&
  consulta.jogador.vida <= 5 &&
  passivaRevelada(consulta.jogador, SEGUNDA_LUZ)
    ? 1
    : 0;

const ORDEM_DA_DEVOCAO = ['vigilia', 'graca', 'fervor', 'milagre'] as const;

const alcanca = (
  consulta: ConsultaDeLegalidade,
  minimo: 'graca' | 'fervor' | 'milagre',
): boolean => {
  const atual = devocaoDe(consulta.jogador);
  if (atual === null) return false;
  const degrau = ORDEM_DA_DEVOCAO.indexOf(atual) + degrauDaSegundaLuz(consulta);
  return degrau >= ORDEM_DA_DEVOCAO.indexOf(minimo);
};

/**
 * "Devoção Imóvel: a primeira Reação de cada turno inimigo que exigir Graça
 * pode ser usada mesmo se você estiver em Vigília."
 *
 * A legalidade só pergunta se a isenção ainda está livre; quem a consome é a
 * Reação que de fato foi usada por causa dela.
 */
const isencaoDeVigiliaLivre = (consulta: ConsultaDeLegalidade): boolean =>
  consulta.acaoRespondida !== null &&
  passivaRevelada(consulta.jogador, DEVOCAO_IMOVEL) &&
  valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(DEVOCAO_IMOVEL)) === 0;

const exigeGraca = (consulta: ConsultaDeLegalidade): string | null =>
  alcanca(consulta, 'graca') ? null : 'requer Graça ou mais';

const exigeGracaComIsencao = (consulta: ConsultaDeLegalidade): string | null =>
  alcanca(consulta, 'graca') || isencaoDeVigiliaLivre(consulta) ? null : 'requer Graça ou mais';

const exigeFervor = (consulta: ConsultaDeLegalidade): string | null =>
  alcanca(consulta, 'fervor') ? null : 'requer Fervor ou Milagre';

const exigeMilagre = (consulta: ConsultaDeLegalidade): string | null =>
  alcanca(consulta, 'milagre') ? null : 'requer Milagre';

/** Marca a isenção da Devoção Imóvel quando foi ela que deixou a Reação passar. */
const consumirIsencaoDeVigilia = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (atendeDevocao(defensor, 'graca')) return;
  if (!passivaRevelada(defensor, DEVOCAO_IMOVEL)) return;
  consumirLimitePorTurno(ctx, alvo.defensor, chaveDaPassiva(DEVOCAO_IMOVEL), DEVOCAO_IMOVEL);
};

/* ------------------------------------------------------------------ */
/* Cura                                                                */
/* ------------------------------------------------------------------ */

/**
 * "Restaure N Vida", já com tudo que soma à cura de uma **habilidade**.
 *
 * Somam aqui a Doutrina da Misericórdia usada nesta jogada (+1 Ativada, +3
 * Exaurida), o Coração Misericordioso (uma vez por próprio turno) e o bônus
 * que o Milagre Guardado deixou reservado para esta Ação.
 *
 * Nada disso é cobrado quando a cura não teria para onde ir: com a Vida cheia,
 * o limite do Coração Misericordioso continua livre.
 */
const restaurarComoHabilidade = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  jogador: PlayerId,
  base: number,
): number => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.vida >= REGRAS_UNIVERSAIS.vidaInicial) return 0;

  let extra = consumirPromessa(ctx, jogador, CHAVE.curaAdicional);

  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  for (const uso of slot?.cartasDeClasseUsadas ?? []) {
    if (uso.carta !== DOUTRINA_DA_MISERICORDIA) continue;
    // Exaurir tira a carta de `cartasDeClasse` e a põe em `removidas`: as duas
    // listas juntas são "esta Doutrina é minha".
    const dono = jogadorDo(ctx, jogador);
    const minha =
      dono.cartasDeClasse.some((item) => item.carta === uso.carta) ||
      dono.removidas.includes(uso.carta);
    if (!minha) continue;
    extra += uso.modo === 'exaurir' ? 3 : 1;
  }

  if (
    passivaRevelada(atual, CORACAO_MISERICORDIOSO) &&
    consumirLimitePorTurno(
      ctx,
      jogador,
      chaveDaPassiva(CORACAO_MISERICORDIOSO),
      CORACAO_MISERICORDIOSO,
    )
  ) {
    extra += 1;
  }

  return restaurarVidaEm(ctx, jogador, base + extra, alvo.origem);
};

/** Move uma carta uma zona de cooldown para mais perto da mão. */
const adiantar = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const atual = jogadorDo(ctx, jogador);
  const movimento = adiantarCartaNoCooldown(atual, carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(ctx, {
    tipo: 'carta-adiantada-no-cooldown',
    jogador,
    carta,
    de: movimento.valor.de,
    para: movimento.valor.para,
  });
};

/** Exige a Condição negativa que o texto manda escolher, quando há alguma. */
const exigirCondicaoPropria = (
  jogador: EstadoDeJogador,
  escolhida: CondicaoId | undefined,
  carta: CardId,
  detalhe: string,
): ReturnType<typeof exigirCartaEntre> => {
  const ativas = condicoesAtivas(jogador);
  if (ativas.length === 0) {
    return escolhida === undefined ? null : { tipo: 'escolha-invalida', carta, detalhe };
  }
  if (escolhida === undefined) return { tipo: 'escolha-obrigatoria', carta, detalhe };
  return ativas.includes(escolhida) ? null : { tipo: 'escolha-invalida', carta, detalhe };
};

const condicaoEscolhida = (escolhas: EscolhasDaAcao): CondicaoId | undefined => escolhas.condicao;

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('C01'),
    {
      // "Se o adversário estiver com 3 ou menos de Guarda, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).guarda <= 3) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        }
      },
    },
  ],
  [
    id('C02'),
    {
      // "Se o adversário usar uma carta de Reação e este Ataque ainda causar
      // Dano à Vida, avance 1 estágio de Devoção depois da resolução. Esse
      // avanço é adicional ao avanço normal do turno." — por ser adicional, ele
      // não passa pelo limite de uma vez por turno da mecânica.
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveReacao && resumo.dano > 0) avancarDevocao(ctx, alvo.atacante);
      },
    },
  ],
  [
    id('C03'),
    {
      legalidade: exigeGraca,
      // "Se o inimigo já estava com Guarda 0": a Guarda de antes da resolução.
      antesDeResolver: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).guarda !== 0) return;
        registrarAnotacao(ctx, alvo.atacante, {
          chave: CHAVE.guardaInimigaJaEraZero,
          origem: alvo.origem,
          escopo: 'acao',
          valor: 1,
        });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano <= 0) return;
        if (lerPromessa(ctx, alvo.atacante, CHAVE.guardaInimigaJaEraZero) === 0) return;
        restaurarComoHabilidade(ctx, alvo, alvo.atacante, 1);
      },
    },
  ],
  [
    id('C04'),
    {
      legalidade: exigeGraca,
      // "Se causar Ruptura, restaure 1 Vida depois da resolução."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.ruptura) restaurarComoHabilidade(ctx, alvo, alvo.atacante, 1);
      },
    },
  ],
  [
    id('C05'),
    {
      legalidade: exigeGraca,
      // "Se você restaurou Vida neste turno, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.restaurouVidaNoTurno) > 0) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
        }
      },
    },
  ],
  [
    id('C06'),
    {
      legalidade: exigeFervor,
      // "Se for sua terceira Ação e o inimigo estiver com Guarda 0, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 3 && jogadorDo(ctx, alvo.defensor).guarda === 0) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
        }
      },
      // "Depois da resolução, desça 1 estágio de Devoção."
      aposResolver: (ctx, alvo) => {
        descerDevocao(ctx, alvo.atacante);
      },
    },
  ],
  [
    id('C07'),
    {
      legalidade: exigeGraca,
      // "Se causar Dano à Vida, remova 1 Condição negativa sua."
      validarEscolhas: (consulta) =>
        exigirCondicaoPropria(
          consulta.jogador,
          condicaoEscolhida(consulta.escolhas),
          id('C07'),
          'escolha a Condição negativa sua a remover',
        ),
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano <= 0) return;
        const escolhida = escolhasDaAcao(ctx, alvo).condicao;
        if (escolhida === undefined) return;
        removerCondicaoEm(ctx, alvo.atacante, escolhida, 1);
      },
    },
  ],
  [
    id('C08'),
    {
      // "Avance 1 estágio de Devoção."
      aposResolver: (ctx, alvo) => {
        avancarDevocao(ctx, alvo.atacante);
      },
    },
  ],
  [
    id('C09'),
    {
      legalidade: exigeGraca,
      // "Restaure 3 Vida."
      aposResolver: (ctx, alvo) => {
        restaurarComoHabilidade(ctx, alvo, alvo.atacante, 3);
      },
    },
  ],
  [
    id('C10'),
    {
      // "Só pode ser usada com 15 de Vida ou menos e requer Fervor ou Milagre."
      legalidade: (consulta) =>
        consulta.jogador.vida > 15
          ? 'só pode ser usada com 15 de Vida ou menos'
          : exigeFervor(consulta),
      aposResolver: (ctx, alvo) => {
        restaurarComoHabilidade(ctx, alvo, alvo.atacante, 5);
        descerDevocao(ctx, alvo.atacante);
      },
    },
  ],
  [
    id('C11'),
    {
      legalidade: exigeGraca,
      // "Seu próximo Ataque neste turno recebe +1 D e +1 I."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueDano, 1);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
      },
    },
  ],
  [
    id('C12'),
    {
      // "No fim deste turno, ganhe +1 Reserva além da conversão normal. Se
      // terminar com 2 de Reserva, avance 1 estágio de Devoção."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.reservaExtraNoFim, 1);
        if (lerPromessa(ctx, alvo.atacante, CHAVE.devocaoSeTerminarComReserva2) === 0) {
          prometerAoProximoAtaque(
            ctx,
            alvo.atacante,
            alvo.origem,
            CHAVE.devocaoSeTerminarComReserva2,
            1,
          );
        }
      },
    },
  ],
  [
    id('C13'),
    {
      legalidade: exigeGraca,
      // "Remova 1 Condição negativa. Se não houver nenhuma, restaure 2 Vida."
      validarEscolhas: (consulta) =>
        exigirCondicaoPropria(
          consulta.jogador,
          condicaoEscolhida(consulta.escolhas),
          id('C13'),
          'escolha a Condição negativa a remover',
        ),
      aposResolver: (ctx, alvo) => {
        const escolhida = escolhasDaAcao(ctx, alvo).condicao;
        const removido =
          escolhida === undefined ? 0 : removerCondicaoEm(ctx, alvo.atacante, escolhida, 1);
        if (removido === 0) restaurarComoHabilidade(ctx, alvo, alvo.atacante, 2);
      },
    },
  ],
  [
    id('C14'),
    {
      legalidade: exigeGracaComIsencao,
      // "Reduza 2 D e 2 I."
      aoResponder: (ctx, alvo) => {
        consumirIsencaoDeVigilia(ctx, alvo);
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
    },
  ],
  [
    id('C15'),
    {
      legalidade: exigeGracaComIsencao,
      // "Reduza 3 I."
      aoResponder: (ctx, alvo) => {
        consumirIsencaoDeVigilia(ctx, alvo);
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
    },
  ],
  [
    id('C16'),
    {
      legalidade: exigeFervor,
      // "Reduza 4 D. Depois da resolução, desça 1 estágio de Devoção."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4 });
      },
      aposResolver: (ctx, alvo) => {
        descerDevocao(ctx, alvo.defensor);
      },
    },
  ],
  [
    id('C17'),
    {
      // "Reduza 3 I. Se impedir uma Ruptura, perca 1 Vida que não pode ser
      // reduzida e avance 1 estágio de Devoção."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        pagarComVida(ctx, alvo.defensor, 1, alvo.origem);
        avancarDevocao(ctx, alvo.defensor);
      },
    },
  ],
  [
    id('C18'),
    {
      legalidade: exigeFervor,
      // "Reduza 2 D e 2 I. Se o Dano final for 0, o adversário perde 2 de Vida.
      // Depois da resolução, desça 1 estágio de Devoção."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveAtaque && resumo.dano === 0) {
          perderVidaDireta(ctx, alvo.atacante, 2, alvo.origem);
        }
        descerDevocao(ctx, alvo.defensor);
      },
    },
  ],
  [
    id('C19'),
    {
      legalidade: exigeGracaComIsencao,
      // "Reduza 1 D e 1 I. Condições que esta ação aplicaria a você não são
      // aplicadas." A imunidade vale pela Ação em curso e nada além dela.
      aoResponder: (ctx, alvo) => {
        consumirIsencaoDeVigilia(ctx, alvo);
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        registrarAnotacao(ctx, alvo.defensor, {
          chave: CHAVE.imunidadeACondicoes,
          origem: alvo.origem,
          escopo: 'acao',
          valor: 1,
        });
      },
    },
  ],
  [
    id('C20'),
    {
      // "Só pode ser usada com 10 de Vida ou menos e requer Fervor ou Milagre."
      legalidade: (consulta) =>
        consulta.jogador.vida > 10
          ? 'só pode ser usada com 10 de Vida ou menos'
          : exigeFervor(consulta),
      // "Reduza 5 D e depois restaure 1 Vida."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 5 });
      },
      aposResolver: (ctx, alvo) => {
        restaurarComoHabilidade(ctx, alvo, alvo.defensor, 1);
        descerDevocao(ctx, alvo.defensor);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('CP01'),
    {
      // "Revele quando restaurar Vida enquanto estiver com 15 de Vida ou menos.
      // Depois disso, a primeira habilidade que restaurar Vida em cada próprio
      // turno restaura +1." O bônus é somado por `restaurarComoHabilidade`.
      // "enquanto estiver com 15 de Vida ou menos" é o estado **no momento** de
      // restaurar, e não depois. O evento de restauração guarda a Vida final e
      // quanto entrou, então a Vida de antes sai da subtração dos dois.
      revelaEm: (ctx, revelacao) =>
        ctx.eventos.some(
          (evento) =>
            evento.tipo === 'vida-restaurada' &&
            evento.alvo === revelacao.dono &&
            evento.vidaDepois - evento.restaurado <= 15,
        ),
    },
  ],
  [
    id('CP02'),
    {
      // "Revele quando causar sua primeira Ruptura. Depois disso, o primeiro
      // Ataque de cada turno jogado enquanto o adversário estiver com Guarda 0
      // recebe +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.resumo?.ruptura === true,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (jogadorDo(ctx, alvo.defensor).guarda !== 0) return;
        if (
          !consumirLimitePorTurno(ctx, alvo.dono, CHAVE.primeiroAtaqueComGuardaZero, alvo.origem)
        ) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('CP03'),
    {
      // "Revele quando terminar um turno com 2 de Reserva." A isenção que ela
      // concede é lida pela legalidade das Reações que exigem Graça.
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' && jogadorDo(ctx, revelacao.dono).reserva === 2,
    },
  ],
  [
    id('CP04'),
    {
      // "Revele quando perder Vida por um efeito próprio. Avance 1 estágio.
      // Depois disso, na primeira vez em cada turno que perder Vida por um
      // efeito próprio, avance 1 estágio."
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.perdeuVidaPorEfeitoProprio) > 0,
      aoRevelar: (ctx, revelacao) => {
        avancarDevocao(ctx, revelacao.dono);
      },
      aposResolver: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.dono, CHAVE.perdeuVidaPorEfeitoProprio) === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        avancarDevocao(ctx, alvo.dono);
      },
    },
  ],
  [
    id('CP05'),
    {
      // "Revele quando uma Condição negativa for aplicada a você. Remova aquela
      // Condição. Depois disso, na primeira vez em cada turno que uma Condição
      // negativa for aplicada, reduza sua quantidade ou duração em 1."
      revelaEm: (ctx, revelacao) => condicoesAtivas(jogadorDo(ctx, revelacao.dono)).length > 0,
      aoRevelar: (ctx, revelacao) => {
        for (const condicao of condicoesAtivas(jogadorDo(ctx, revelacao.dono))) {
          removerCondicaoEm(ctx, revelacao.dono, condicao, 99);
          return;
        }
      },
      aposResolver: (ctx, alvo) => {
        const dono = jogadorDo(ctx, alvo.dono);
        const ativas = condicoesAtivas(dono);
        if (ativas.length === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        const primeira = ativas[0];
        if (primeira !== undefined) removerCondicaoEm(ctx, alvo.dono, primeira, 1);
      },
    },
  ],
  [
    id('CP06'),
    {
      // "Revele ao alcançar Milagre. Depois disso, uma vez por turno, Ative
      // quando jogar uma habilidade que exija Fervor ou Milagre para ela
      // receber +1 D, +1 I ou +1 de cura, conforme o que fizer."
      revelaEm: (ctx, revelacao) => devocaoDe(jogadorDo(ctx, revelacao.dono)) === 'milagre',
      ativacao: {
        podeAtivar: (ctx, alvo, escolhas) => {
          if (
            !EXIGEM_FERVOR.includes(alvo.perfil.carta) &&
            !EXIGEM_FERVOR.includes(alvo.reacao?.carta ?? id('-'))
          ) {
            return false;
          }
          if (lerPromessa(ctx, alvo.dono, chaveDaPassiva(alvo.origem)) > 0) return false;
          const escolha = escolhas.bonusDoMilagre;
          if (escolha === undefined) return false;
          // "conforme o que fizer": a carta precisa poder receber o bônus
          // escolhido. Uma Técnica sem valores não recebe +1 D nem +1 I.
          const daAcao = alvo.dono === alvo.atacante;
          const perfil = daAcao ? alvo.perfil : (alvo.reacao ?? alvo.perfil);
          if (escolha !== 'cura' && (!daAcao || perfil.valores === null)) return false;
          return true;
        },
        aplicar: (ctx, alvo, escolhas) => {
          consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
          const escolha = escolhas.bonusDoMilagre;
          if (escolha === 'cura') {
            registrarAnotacao(ctx, alvo.dono, {
              chave: CHAVE.curaAdicional,
              origem: alvo.origem,
              escopo: 'acao',
              valor: 1,
            });
            return;
          }
          somarAoAtaque(
            ctx,
            alvo.atacante,
            alvo.indice,
            escolha === 'impacto' ? { impacto: 1 } : { dano: 1 },
          );
        },
      },
    },
  ],
  [
    id('CP07'),
    {
      // "Revele quando realizar 3 Ações num mesmo turno. Depois disso, sempre
      // que sua terceira Ação for uma Técnica, ela entra em uma zona de
      // cooldown mais próxima da mão."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.alvo.ordem === 3,
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.atacante !== alvo.dono || alvo.ordem !== 3) return;
        if (alvo.perfil.tipo !== 'tecnica' || resumo.zonaDeCooldown === null) return;
        adiantar(ctx, alvo.dono, alvo.perfil.carta);
      },
    },
  ],
  [
    id('CP08'),
    {
      // "Revele quando uma Reação reduzir o Dano final de um Ataque a 0. Depois
      // disso, na primeira vez em cada turno inimigo que isso acontecer,
      // restaure 1 Vida."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.defensor === revelacao.dono &&
        revelacao.resumo?.houveReacao === true &&
        revelacao.resumo.houveAtaque &&
        revelacao.resumo.dano === 0,
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono) return;
        if (!resumo.houveReacao || !resumo.houveAtaque || resumo.dano !== 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        restaurarVidaEm(ctx, alvo.dono, 1, alvo.origem);
      },
    },
  ],
  [
    id('CP09'),
    {
      // "Revele quando provocar Ruptura estando abaixo da Vida máxima. Restaure
      // 1 Vida. Depois disso, a primeira Ruptura causada em cada próprio turno
      // restaura 1 Vida."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.resumo?.ruptura === true &&
        jogadorDo(ctx, revelacao.dono).vida < REGRAS_UNIVERSAIS.vidaInicial,
      aoRevelar: (ctx, revelacao) => {
        restaurarVidaEm(ctx, revelacao.dono, 1, id('CP09'));
        consumirLimitePorTurno(ctx, revelacao.dono, chaveDaPassiva(id('CP09')), id('CP09'));
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        restaurarVidaEm(ctx, alvo.dono, 1, alvo.origem);
      },
    },
  ],
  [
    id('CP10'),
    {
      // "Revele quando chegar a 5 de Vida ou menos. Avance imediatamente 1
      // estágio de Devoção." O degrau que ela concede depois é lido pela
      // legalidade das cartas que exigem Devoção.
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 5,
      aoRevelar: (ctx, revelacao) => {
        avancarDevocao(ctx, revelacao.dono);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Doutrinas e três Relíquias                  */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('CC01'),
    {
      // Os dois lados somam à cura das habilidades, e quem os lê é
      // `restaurarComoHabilidade`: assim o bônus entra na mesma restauração,
      // em vez de virar uma segunda cura.
      ativar: {},
      exaurir: {},
    },
  ],
  [
    id('CC02'),
    {
      ativar: {
        // "Ao declarar um Ataque contra um adversário com 3 ou menos de Guarda,
        // ele recebe +1 D e +1 I."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          if (jogadorDo(ctx, alvo.defensor).guarda > 3) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Ao declarar um Ataque, ele recebe +3 D. Se causar Ruptura, avance 1
        // estágio de Devoção depois da resolução."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 3 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
          avancarDevocao(ctx, alvo.dono);
        },
      },
    },
  ],
  [
    id('CC03'),
    {
      ativar: {
        // "Depois que perder pelo menos 3 de Vida de um único Ataque, avance 1
        // estágio de Devoção."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono) return;
          if (resumo.vidaPerdidaPeloDefensor < 3) return;
          avancarDevocao(ctx, alvo.dono);
        },
      },
      exaurir: {
        // "Quando um Ataque fosse reduzir sua Vida a 0, deixe a ação resolver
        // normalmente e depois ajuste sua Vida para 1."
        aposResolver: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          const dono = jogadorDo(ctx, alvo.dono);
          if (dono.vida > 0) return;
          gravarJogador(ctx, { ...dono, vida: 1 });
          emitir(ctx, {
            tipo: 'vida-restaurada',
            alvo: alvo.dono,
            pedido: 1 - dono.vida,
            restaurado: 1 - dono.vida,
            vidaDepois: 1,
            origem: alvo.origem,
          });
        },
      },
    },
  ],
  [
    id('CC04'),
    {
      ativar: {
        // "Depois que uma Técnica resolver, seu próximo Ataque neste turno
        // recebe +1 D."
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.tipo !== 'tecnica') return;
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueDano, 1);
        },
      },
      exaurir: {
        // "Depois que uma Técnica resolver, seu próximo Ataque neste turno
        // recebe +2 D e +2 I."
        aposResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.tipo !== 'tecnica') return;
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueDano, 2);
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueImpacto, 2);
        },
      },
    },
  ],
  [
    id('CC05'),
    {
      ativar: {
        // "Quando usar uma Reação, ela reduz +1 I."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        },
      },
      exaurir: {
        // "Quando usar uma Reação, o Impacto final da ação se torna 0 e a
        // Reação reduz +2 D."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2 });
          ajustar(ctx, alvo.atacante, alvo.indice, { impactoFinal: 0 });
        },
      },
    },
  ],
  [
    id('CC06'),
    {
      ativar: {
        // "Quando jogar uma habilidade que exija Fervor ou Milagre, escolha uma
        // carta sua em CD2 e mova para CD1."
        legalidade: (consulta) =>
          EXIGEM_FERVOR.includes(consulta.perfil.carta)
            ? null
            : 'o Relicário só Ativa com uma habilidade que exija Fervor ou Milagre',
        validarEscolhas: (consulta) =>
          exigirCartaEntre(
            consulta.escolhas.cartaEmCooldown,
            consulta.jogador.cooldown[2],
            RELICARIO_DOS_SANTOS,
            'escolha uma carta sua em CD2',
          ),
        aoDeclarar: (ctx, alvo) => {
          const escolhida = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice)?.escolhas
            .cartaEmCooldown;
          if (escolhida === undefined) return;
          adiantar(ctx, alvo.dono, escolhida);
        },
      },
      exaurir: {
        // "Devolva imediatamente uma carta sua de qualquer zona de cooldown
        // para a mão. Se usá-la neste turno, ela custa +1 AP."
        validarEscolhas: (consulta) =>
          exigirCartaEntre(
            consulta.escolhas.cartaEmCooldown,
            [
              ...consulta.jogador.cooldown[1],
              ...consulta.jogador.cooldown[2],
              ...consulta.jogador.cooldown[3],
            ],
            RELICARIO_DOS_SANTOS,
            'escolha uma carta sua em alguma zona de cooldown',
          ),
        aoDeclarar: (ctx, alvo) => {
          const dono = jogadorDo(ctx, alvo.dono);
          const escolhida = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice)?.escolhas
            .cartaEmCooldown;
          if (escolhida === undefined) return;
          const movimento = devolverCartaAMao(dono, escolhida);
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
            `${CHAVE.relicarioEncarece}:${escolhida}`,
            1,
          );
        },
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Ultimates                                                           */
/* ------------------------------------------------------------------ */

export const ULTIMATES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('CU01'),
    {
      // "Requer Milagre e consome Milagre, retornando a Vigília. 7 D / 3 I. Se
      // causar Ruptura, restaure 3 Vida."
      legalidade: exigeMilagre,
      aoDeclarar: (ctx, alvo) => {
        consumirMilagre(ctx, alvo.atacante);
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.ruptura) restaurarComoHabilidade(ctx, alvo, alvo.atacante, 3);
      },
    },
  ],
  [
    id('CU02'),
    {
      // "Requer Milagre e consome Milagre. Restaure 6 Vida e remova todas as
      // Condições negativas."
      legalidade: exigeMilagre,
      aoDeclarar: (ctx, alvo) => {
        consumirMilagre(ctx, alvo.atacante);
      },
      aposResolver: (ctx, alvo) => {
        restaurarComoHabilidade(ctx, alvo, alvo.atacante, 6);
        limparCondicoesNegativas(ctx, alvo.atacante);
      },
    },
  ],
  [
    id('CU03'),
    {
      // "Requer Milagre e consome Milagre. O Dano e o Impacto finais daquela
      // ação se tornam 0. Depois, restaure 2 Vida."
      legalidade: exigeMilagre,
      aoResponder: (ctx, alvo) => {
        consumirMilagre(ctx, alvo.defensor);
        ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0, impactoFinal: 0 });
      },
      aposResolver: (ctx, alvo) => {
        restaurarComoHabilidade(ctx, alvo, alvo.defensor, 2);
      },
    },
  ],
]);
