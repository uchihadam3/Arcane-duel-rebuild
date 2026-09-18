import type {
  CardId,
  EscolhasDaAcao,
  EstadoDeJogador,
  PerfilDeHabilidade,
  PlayerId,
} from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import { podePagarComVida } from '@arcane-duel/rules-engine';

import {
  ajustar,
  pagarComVida,
  perderVidaDireta,
  reduzirNaResposta,
  restaurarVidaEm,
  somarAoAtaque,
} from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import {
  consumirLimitePorTurno,
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
import { marcarPrecoProibidoUsado, precoProibidoDisponivel } from '../recursos-classe.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  emitirProntificacao,
  escolhasDaAcao,
  escolhasDaResposta,
  exigirReforco,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Bruxo.
 *
 * A moeda dele é a própria Vida, e perder Vida como preço não é Dano: não pode
 * ser reduzido, não ativa "ter recebido um Ataque" e sempre sai de uma decisão
 * de quem joga. O Preço Proibido é a única perda que o motor cobra sozinho —
 * e mesmo ela só depois de o jogador tê-la pedido na jogada.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** O Bruxo escolhe 1 Pacto e 1 Maldição. */
export const PACTOS: readonly CardId[] = [id('BRC01'), id('BRC02'), id('BRC03')];
export const MALDICOES: readonly CardId[] = [id('BRC04'), id('BRC05'), id('BRC06')];

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

const cartaDeClasseEm = (
  jogador: EstadoDeJogador,
  cartas: readonly CardId[],
  estado: 'pronta' | 'ativada',
): CardId | undefined =>
  jogador.cartasDeClasse.find((item) => cartas.includes(item.carta) && item.estado === estado)
    ?.carta;

/* ------------------------------------------------------------------ */
/* Preço Proibido                                                      */
/* ------------------------------------------------------------------ */

/** A carta aceita o Preço Proibido? "Habilidade normal de pelo menos 2 AP." */
const cartaAceitaPrecoProibido = (perfil: PerfilDeHabilidade): boolean =>
  perfil.cooldown !== null && perfil.custo.moeda === 'ap' && perfil.custo.valor >= 2;

/** O Bruxo ainda tem uso de Preço Proibido neste turno? */
const usoDisponivel = (jogador: EstadoDeJogador): boolean =>
  precoProibidoDisponivel(jogador) ||
  valorDaAnotacao(jogador.anotacoes, CHAVE.precoProibidoExtra) > 0;

/**
 * O desconto do Preço Proibido, lido junto dos demais descontos da declaração.
 *
 * Só responde `true` quando o jogador **pediu** o preço e tudo que o texto
 * exige está satisfeito; a recusa correspondente mora em `recusaDoPrecoProibido`
 * e acontece antes de qualquer custo ser pago.
 */
export const descontoDoPrecoProibido = (
  jogador: EstadoDeJogador,
  perfil: PerfilDeHabilidade,
  escolhas: EscolhasDaAcao,
): boolean =>
  jogador.recurso.classe === 'bruxo' &&
  escolhas.precoProibido === true &&
  cartaAceitaPrecoProibido(perfil) &&
  usoDisponivel(jogador) &&
  podePagarComVida(jogador, 1);

/** Por que este Preço Proibido não pode ser pago agora? */
export const recusaDoPrecoProibido = (consulta: ConsultaDeLegalidade): string | null => {
  if (consulta.escolhas.precoProibido !== true) return null;
  if (consulta.jogador.recurso.classe !== 'bruxo') {
    return 'o Preço Proibido é a mecânica do Bruxo';
  }
  if (!cartaAceitaPrecoProibido(consulta.perfil)) {
    return 'o Preço Proibido só desconta habilidade normal de custo impresso 2 AP ou mais';
  }
  if (!usoDisponivel(consulta.jogador)) {
    return 'o Preço Proibido já foi usado neste turno';
  }
  if (!podePagarComVida(consulta.jogador, 1)) {
    return 'o Preço Proibido cobra 1 de Vida e você não tem como pagar';
  }
  return null;
};

/**
 * Cobra o Preço Proibido logo depois de o custo descontado ter sido pago.
 *
 * O uso extra concedido por carta é gasto antes do uso do turno: quem comprou
 * o segundo uso comprou justamente para não gastar o primeiro duas vezes.
 */
export const cobrarPrecoProibido = (
  ctx: Contexto,
  jogador: PlayerId,
  perfil: PerfilDeHabilidade,
  escolhas: EscolhasDaAcao,
): void => {
  const atual = jogadorDo(ctx, jogador);
  if (!descontoDoPrecoProibido(atual, perfil, escolhas)) return;

  if (valorDaAnotacao(atual.anotacoes, CHAVE.precoProibidoExtra) > 0) {
    consumirUmExtra(ctx, jogador);
  } else {
    marcarPrecoProibidoUsado(ctx, jogador);
  }
  pagarComVida(ctx, jogador, 1, perfil.carta);

  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.precoProibidoNaAcao,
    origem: perfil.carta,
    escopo: 'acao',
    valor: 1,
  });
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.usouPrecoProibidoNoTurno,
    origem: perfil.carta,
    escopo: 'turno',
    valor: 1,
  });
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.usosDoPrecoProibido,
    origem: perfil.carta,
    escopo: 'partida',
    valor: 1,
  });
};

/** Gasta um dos usos extras sem mexer no uso normal do turno. */
const consumirUmExtra = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  const restante = valorDaAnotacao(atual.anotacoes, CHAVE.precoProibidoExtra);
  if (restante <= 0) return;
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.precoProibidoExtra,
    origem: id('BR15'),
    escopo: 'turno',
    valor: -1,
  });
};

const pagouPrecoProibido = (ctx: Contexto, jogador: PlayerId): boolean =>
  lerPromessa(ctx, jogador, CHAVE.precoProibidoNaAcao) > 0;

/* ------------------------------------------------------------------ */
/* Preços opcionais impressos nas cartas                               */
/* ------------------------------------------------------------------ */

/** "Pode perder até N Vida": quanto o jogador ofereceu, dentro do teto impresso. */
const vidaOferecida = (escolhas: EscolhasDaAcao, teto: number): number => {
  const pedido = escolhas.vidaOferecida ?? 0;
  return pedido <= 0 ? 0 : Math.min(pedido, teto);
};

/** Recusa uma oferta de Vida acima do teto impresso ou impagável. */
const recusarOferta = (
  consulta: ConsultaDeLegalidade,
  teto: number,
  escolhas: EscolhasDaAcao = consulta.escolhas,
): string | null => {
  const pedido = escolhas.vidaOferecida ?? 0;
  if (pedido <= 0) return null;
  if (pedido > teto) return `esta carta aceita no máximo ${String(teto)} de Vida como preço`;
  return podePagarComVida(consulta.jogador, pedido)
    ? null
    : 'você não tem Vida suficiente para esse preço';
};

/** Paga o preço opcional da carta e devolve quanto saiu de fato. */
const cobrarOferta = (ctx: Contexto, alvo: AlvoDoEfeito, quem: PlayerId, teto: number): number => {
  const escolhas =
    quem === alvo.atacante ? escolhasDaAcao(ctx, alvo) : escolhasDaResposta(ctx, alvo);
  const pedido = vidaOferecida(escolhas, teto);
  if (pedido === 0) return 0;
  return pagarComVida(ctx, quem, pedido, alvo.origem);
};

/** Quanta Vida o dono já perdeu como preço próprio neste turno. */
const vidaPerdidaNoTurno = (ctx: Contexto, jogador: PlayerId): number =>
  lerPromessa(ctx, jogador, CHAVE.vidaPerdidaComoCusto);

/** O dono pagou Vida dentro da Ação em andamento? */
const pagouVidaNaAcao = (ctx: Contexto, jogador: PlayerId): boolean =>
  lerPromessa(ctx, jogador, CHAVE.vidaPagaNaAcao) > 0;

/** Deixa Pronta uma Carta de Classe Ativada da lista pedida. */
const prontificar = (
  ctx: Contexto,
  jogador: PlayerId,
  cartas: readonly CardId[],
  origem: CardId,
): boolean => {
  const atual = jogadorDo(ctx, jogador);
  const carta = cartaDeClasseEm(atual, cartas, 'ativada');
  if (carta === undefined) return false;
  gravarJogador(ctx, {
    ...atual,
    cartasDeClasse: atual.cartasDeClasse.map((item) =>
      item.carta === carta ? { ...item, estado: 'pronta' as const } : item,
    ),
  });
  emitirProntificacao(ctx, jogador, carta, origem);
  return true;
};

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('BR01'),
    {
      // "Se já perdeu Vida por efeito próprio neste turno, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (vidaPerdidaNoTurno(ctx, alvo.atacante) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('BR02'),
    {
      // "Ao declarar, pode perder 1 Vida para receber +2 D."
      legalidade: (consulta) => recusarOferta(consulta, 1),
      aoDeclarar: (ctx, alvo) => {
        if (cobrarOferta(ctx, alvo, alvo.atacante, 1) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('BR03'),
    {
      // "Ao declarar, pode perder 1 Vida para receber +2 I."
      legalidade: (consulta) => recusarOferta(consulta, 1),
      aoDeclarar: (ctx, alvo) => {
        if (cobrarOferta(ctx, alvo, alvo.atacante, 1) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 2 });
      },
    },
  ],
  [
    id('BR04'),
    {
      // "Se causar Dano à Vida, restaure 1 Vida. Se perdeu Vida por efeito
      // próprio neste turno, restaure 2 em vez disso."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano <= 0) return;
        const quanto = vidaPerdidaNoTurno(ctx, alvo.atacante) > 0 ? 2 : 1;
        restaurarVidaEm(ctx, alvo.atacante, quanto, alvo.origem);
      },
    },
  ],
  [
    id('BR05'),
    {
      // "Se Preço Proibido foi usado para jogar esta carta, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (!pagouPrecoProibido(ctx, alvo.atacante)) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('BR06'),
    {
      // "Pode perder até 3 Vida adicionais ao declarar. Recebe +1 D por Vida
      // perdida dessa forma."
      legalidade: (consulta) => recusarOferta(consulta, 3),
      aoDeclarar: (ctx, alvo) => {
        const perdida = cobrarOferta(ctx, alvo, alvo.atacante, 3);
        if (perdida === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: perdida });
      },
    },
  ],
  [
    id('BR07'),
    {
      // "Se sua Maldição foi Ativada neste turno, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.maldicaoAtivadaNoTurno) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('BR08'),
    {
      // "Se seu Pacto estiver Ativado, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (cartaDeClasseEm(jogadorDo(ctx, alvo.atacante), PACTOS, 'ativada') === undefined) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('BR09'),
    {
      // "Se já perdeu pelo menos 2 Vida por efeitos próprios neste turno,
      // recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (vidaPerdidaNoTurno(ctx, alvo.atacante) < 2) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('BR10'),
    {
      // "Se causar Ruptura, restaure 1 Vida ou deixe Pronta sua Maldição
      // Ativada." O "ou" é decisão de quem joga, e ela vem na jogada.
      validarEscolhas: (consulta) => {
        const escolha = consulta.escolhas.escolhaDoAbismo;
        if (escolha === undefined) {
          return cartaDeClasseEm(consulta.jogador, MALDICOES, 'ativada') === undefined
            ? null
            : {
                tipo: 'escolha-obrigatoria',
                carta: consulta.perfil.carta,
                detalhe: 'Boca do Abismo: escolha restaurar 1 Vida ou prontificar a Maldição',
              };
        }
        return escolha === 'maldicao' &&
          cartaDeClasseEm(consulta.jogador, MALDICOES, 'ativada') === undefined
          ? {
              tipo: 'condicao-de-uso-nao-satisfeita',
              carta: consulta.perfil.carta,
              detalhe: 'você não tem Maldição Ativada para prontificar',
            }
          : null;
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.ruptura) return;
        if (escolhasDaAcao(ctx, alvo).escolhaDoAbismo === 'maldicao') {
          prontificar(ctx, alvo.atacante, MALDICOES, alvo.origem);
          return;
        }
        restaurarVidaEm(ctx, alvo.atacante, 1, alvo.origem);
      },
    },
  ],
  [
    id('BR11'),
    {
      // "Perca 2 Vida. Seu próximo Ataque neste turno recebe +2 D e +1 I."
      aposResolver: (ctx, alvo) => {
        pagarComVida(ctx, alvo.atacante, 2, alvo.origem);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueDano, 2);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
      },
    },
  ],
  [
    id('BR12'),
    {
      // "Deixe Pronto seu Pacto Ativado. Depois, perca 1 Vida."
      aposResolver: (ctx, alvo) => {
        prontificar(ctx, alvo.atacante, PACTOS, alvo.origem);
        pagarComVida(ctx, alvo.atacante, 1, alvo.origem);
      },
    },
  ],
  [
    id('BR13'),
    {
      // "Deixe Pronta sua Maldição Ativada. Sua próxima habilidade ofensiva
      // neste turno recebe +1 I."
      aposResolver: (ctx, alvo) => {
        prontificar(ctx, alvo.atacante, MALDICOES, alvo.origem);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
      },
    },
  ],
  [
    id('BR14'),
    {
      // "Se perdeu Vida por efeito próprio neste turno, restaure 3 Vida. Caso
      // contrário, restaure 1."
      aposResolver: (ctx, alvo) => {
        const quanto = vidaPerdidaNoTurno(ctx, alvo.atacante) > 0 ? 3 : 1;
        restaurarVidaEm(ctx, alvo.atacante, quanto, alvo.origem);
      },
    },
  ],
  [
    id('BR15'),
    {
      // "Sua próxima habilidade de custo impresso 2 AP ou mais pode usar Preço
      // Proibido mesmo se ele já foi usado neste turno."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.precoProibidoExtra, 1);
      },
    },
  ],
  [
    id('BR16'),
    {
      // "Reduza 3 D."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
    },
  ],
  [
    id('BR17'),
    {
      // "Reduza 3 I."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
    },
  ],
  [
    id('BR18'),
    {
      // "Reduza 3 D. Depois, você perde 1 Vida e o adversário perde 1 Vida.
      // Essas perdas não podem ser reduzidas."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
      aposResolver: (ctx, alvo) => {
        const propria = pagarComVida(ctx, alvo.defensor, 1, alvo.origem);
        perderVidaDireta(ctx, alvo.atacante, 1, alvo.origem);
        if (propria > 0) {
          prometerAoProximoAtaque(ctx, alvo.defensor, alvo.origem, CHAVE.transferiuADor, 1);
        }
      },
    },
  ],
  [
    id('BR19'),
    {
      // "Reduza 2 D e 3 I. Pode perder 1 Vida para reduzir +2 D."
      legalidade: (consulta) => recusarOferta(consulta, 1),
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 3 });
        if (cobrarOferta(ctx, alvo, alvo.defensor, 1) === 0) return;
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('BR20'),
    {
      // "Só contra um Ataque que derrotaria você. Reduza 4 D. Se sobreviver com
      // 3 ou menos de Vida, deixe Pronto seu Pacto."
      legalidade: (consulta) => {
        const valores = consulta.acaoRespondida?.valores;
        if (valores === undefined || valores === null) return 'só responde a um Ataque';
        return consulta.jogador.vida - valores.dano <= 0
          ? null
          : 'só contra um Ataque que derrotaria você';
      },
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4 });
      },
      aposResolver: (ctx, alvo) => {
        const dono = jogadorDo(ctx, alvo.defensor);
        if (dono.vida <= 0 || dono.vida > 3) return;
        prontificar(ctx, alvo.defensor, PACTOS, alvo.origem);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('BRP01'),
    {
      // "Revele na primeira vez que usar Preço Proibido. Depois disso, a
      // primeira habilidade ofensiva de cada turno jogada por Preço Proibido
      // recebe +1 I."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.usosDoPrecoProibido) > 0,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (!pagouPrecoProibido(ctx, alvo.dono)) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('BRP02'),
    {
      // "Revele quando perder pelo menos 3 Vida por efeitos próprios no mesmo
      // turno. Depois disso, a primeira vez por turno que chegar a 3 ou mais
      // perdidos dessa forma, seu próximo Ataque recebe +1 D."
      revelaEm: (ctx, revelacao) => vidaPerdidaNoTurno(ctx, revelacao.dono) >= 3,
      aposResolver: (ctx, alvo) => {
        if (vidaPerdidaNoTurno(ctx, alvo.dono) < 3) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueDano, 1);
      },
    },
  ],
  [
    id('BRP03'),
    {
      // "Revele quando Ativar o Pacto pela terceira vez. Depois disso, na
      // primeira Ativação do Pacto em cada rodada, restaure 1 Vida depois do
      // efeito, se ainda estiver vivo."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.ativacoesDoPacto) >= 3,
      aposResolver: (ctx, alvo) => {
        if (!ativouNestaAcao(ctx, alvo, PACTOS)) return;
        if (jogadorDo(ctx, alvo.dono).vida <= 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        restaurarVidaEm(ctx, alvo.dono, 1, alvo.origem);
      },
    },
  ],
  [
    id('BRP04'),
    {
      // "Revele quando Ativar a Maldição pela terceira vez. Depois disso, na
      // primeira Ativação da Maldição em cada rodada, sua próxima habilidade
      // ofensiva recebe +1 I."
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.ativacoesDaMaldicao) >= 3,
      aposResolver: (ctx, alvo) => {
        if (!ativouNestaAcao(ctx, alvo, MALDICOES)) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
      },
    },
  ],
  [
    id('BRP05'),
    {
      // "Revele quando terminar um turno tendo usado Preço Proibido e ainda
      // possuir 2 de Reserva." A repetição passa por `tudoTemUmPreco`.
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' &&
        jogadorDo(ctx, revelacao.dono).reserva === 2 &&
        lerPromessa(ctx, revelacao.dono, CHAVE.usouPrecoProibidoNoTurno) > 0,
    },
  ],
  [
    id('BRP06'),
    {
      // "Revele quando chegar a 15 de Vida ou menos devido a custo próprio.
      // Depois disso, enquanto estiver com 15 ou menos, a primeira habilidade
      // de cada turno que fizer você perder Vida como custo recebe +1 D ou
      // +1 I."
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return dono.vida <= 15 && vidaPerdidaNoTurno(ctx, revelacao.dono) > 0;
      },
      validarEscolhas: (consulta) =>
        consulta.perfil.valores !== null &&
        consulta.jogador.vida <= 15 &&
        valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('BRP06'))) === 0 &&
        (consulta.escolhas.precoProibido === true || (consulta.escolhas.vidaOferecida ?? 0) > 0)
          ? exigirReforco(consulta.escolhas, id('BRP06'), 'escolha +1 D ou +1 I')
          : null,
      antesDeResolver: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (jogadorDo(ctx, alvo.dono).vida > 15 || !pagouVidaNaAcao(ctx, alvo.dono)) return;
        const escolha = escolhasDaAcao(ctx, alvo).reforco;
        if (escolha === undefined) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
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
  ],
  [
    id('BRP07'),
    {
      // "Revele quando chegar a 10 de Vida ou menos. Depois disso, uma vez por
      // turno, pode perder 1 Vida adicional ao declarar um Ataque para receber
      // +1 D."
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 10,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (escolhasDaAcao(ctx, alvo).precoDaPassiva !== true) return;
        if (!podePagarComVida(jogadorDo(ctx, alvo.dono), 1)) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        pagarComVida(ctx, alvo.dono, 1, alvo.origem);
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('BRP08'),
    {
      // "Revele quando Transferir a Dor fizer ambos os personagens perderem
      // Vida. Depois disso, na primeira vez em cada turno inimigo que perder
      // Vida por uma Reação própria, o adversário também perde 1 Vida."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.transferiuADor) > 0,
      aposResolver: (ctx, alvo) => {
        if (alvo.defensor !== alvo.dono || alvo.reacao === null) return;
        if (!pagouVidaNaAcao(ctx, alvo.dono)) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        perderVidaDireta(ctx, alvo.atacante, 1, alvo.origem);
      },
    },
  ],
  [
    id('BRP09'),
    {
      // "Revele quando usar 2 custos diferentes de Vida no mesmo turno. Depois
      // disso, na primeira vez em cada próprio turno que fizer isso, deixe
      // Pronta 1 Carta de Classe sua Ativada."
      revelaEm: (ctx, revelacao) => custosDeVidaDiferentes(ctx, revelacao.dono) >= 2,
      aposResolver: (ctx, alvo) => {
        if (custosDeVidaDiferentes(ctx, alvo.dono) < 2) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prontificar(ctx, alvo.dono, [...PACTOS, ...MALDICOES], alvo.origem);
      },
    },
  ],
  [
    id('BRP10'),
    {
      // "Revele quando começar o turno com 5 de Vida ou menos. Na primeira
      // revelação, restaure 2 Vida. Depois disso, enquanto começar nessa faixa,
      // seu primeiro Ataque jogado por Preço Proibido recebe +2 D."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'inicio-do-turno' &&
        ctx.partida.turno?.jogadorAtivo === revelacao.dono &&
        jogadorDo(ctx, revelacao.dono).vida <= 5,
      aoRevelar: (ctx, revelacao) => {
        restaurarVidaEm(ctx, revelacao.dono, 2, id('BRP10'));
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.comecouTurnoComVida5) === 0) return;
        if (!pagouPrecoProibido(ctx, alvo.dono)) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
]);

/** Quantos preços em Vida de origens distintas o dono pagou neste turno. */
const custosDeVidaDiferentes = (ctx: Contexto, jogador: PlayerId): number => {
  const prefixo = `${CHAVE.custoDeVidaPorCarta}:`;
  const origens = new Set<string>();
  for (const anotacao of jogadorDo(ctx, jogador).anotacoes) {
    if (anotacao.chave.startsWith(prefixo)) origens.add(anotacao.chave);
  }
  return origens.size;
};

/** Esta Ação Ativou uma carta da lista pedida? */
const ativouNestaAcao = (ctx: Contexto, alvo: AlvoDoEfeito, cartas: readonly CardId[]): boolean => {
  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  const usos = slot?.cartasDeClasseUsadas ?? [];
  const dono = jogadorDo(ctx, alvo.dono);
  return usos.some(
    (uso) => uso.modo === 'ativar' && cartas.includes(uso.carta) && possui(dono, uso.carta),
  );
};

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Pactos e três Maldições                     */
/* ------------------------------------------------------------------ */

const exigeAtaque = (consulta: ConsultaDeLegalidade, detalhe: string): string | null =>
  consulta.perfil.valores === null ? detalhe : null;

const exigeReacao = (consulta: ConsultaDeLegalidade, detalhe: string): string | null =>
  consulta.perfil.tipo === 'reacao' ? null : detalhe;

const guardaBaixa = (consulta: ConsultaDeLegalidade): string | null =>
  consulta.perfil.valores !== null && consulta.adversario.guarda <= 3
    ? null
    : 'a Maldição da Fragilidade pede um Ataque contra Guarda 3 ou menos';

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('BRC01'),
    {
      ativar: {
        // "Quando perder Vida por efeito próprio durante uma ação ofensiva,
        // aquela ação recebe +1 D."
        legalidade: (consulta) => exigeAtaque(consulta, 'o Pacto de Sangue pede uma ação ofensiva'),
        antesDeResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || !pagouVidaNaAcao(ctx, alvo.dono)) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
      },
      exaurir: {
        // "Ao declarar um Ataque, perca 3 Vida e o Ataque recebe +4 D."
        legalidade: (consulta) =>
          exigeAtaque(consulta, 'o Pacto de Sangue Exaurido pede um Ataque') ??
          (podePagarComVida(consulta.jogador, 3)
            ? null
            : 'o Pacto de Sangue Exaurido cobra 3 de Vida e você não tem como pagar'),
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          pagarComVida(ctx, alvo.dono, 3, alvo.origem);
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 4 });
        },
      },
    },
  ],
  [
    id('BRC02'),
    {
      ativar: {
        // "Quando usar uma Reação, pode perder 1 Vida para ela reduzir +1 D e
        // +1 I."
        legalidade: (consulta) =>
          exigeReacao(consulta, 'o Pacto das Sombras pede uma Reação') ??
          recusarOferta(consulta, 1),
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          if (cobrarOferta(ctx, alvo, alvo.dono, 1) === 0) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Durante uma Reação, ela reduz +4 D e +2 I."
        legalidade: (consulta) =>
          exigeReacao(consulta, 'o Pacto das Sombras Exaurido pede uma Reação'),
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4, impacto: 2 });
        },
      },
    },
  ],
  [
    id('BRC03'),
    {
      ativar: {
        // "Quando provocar Ruptura, depois da resolução restaure 1 Vida."
        legalidade: (consulta) => exigeAtaque(consulta, 'o Pacto do Abismo pede um Ataque'),
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
          restaurarVidaEm(ctx, alvo.dono, 1, alvo.origem);
        },
      },
      exaurir: {
        // "Ao declarar um Ataque, ele recebe +3 I. Se provocar Ruptura,
        // restaure 3 Vida depois da resolução."
        legalidade: (consulta) =>
          exigeAtaque(consulta, 'o Pacto do Abismo Exaurido pede um Ataque'),
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
          restaurarVidaEm(ctx, alvo.dono, 3, alvo.origem);
        },
      },
    },
  ],
  [
    id('BRC04'),
    {
      ativar: {
        // "Quando o adversário estiver com 3 ou menos de Guarda e receber um
        // Ataque seu, o Ataque recebe +1 I."
        legalidade: guardaBaixa,
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        },
      },
      exaurir: {
        // "Ao declarar um Ataque contra um adversário com 3 ou menos de Guarda,
        // ele recebe +2 D e +3 I."
        legalidade: guardaBaixa,
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 3 });
        },
      },
    },
  ],
  [
    id('BRC05'),
    {
      // Os dois lados são lidos por `restaurarVidaEm`, que é por onde toda
      // restauração de Vida da partida passa — inclusive a do adversário.
      ativar: {},
      exaurir: {},
    },
  ],
  [
    id('BRC06'),
    {
      // Os dois lados moram em `agoniaAposAcaoInimiga`: eles disparam no fim de
      // uma Ação do adversário, e não numa janela da Ação de quem joga.
      ativar: {},
      exaurir: {},
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Ultimates                                                           */
/* ------------------------------------------------------------------ */

export const ULTIMATES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('BRU01'),
    {
      // "Antes da resolução, pode perder até 4 Vida. Para cada 2 Vida perdidos
      // dessa forma, recebe +2 D."
      legalidade: (consulta) => recusarOferta(consulta, 4),
      antesDeResolver: (ctx, alvo) => {
        const perdida = cobrarOferta(ctx, alvo, alvo.atacante, 4);
        const bonus = Math.floor(perdida / 2) * 2;
        if (bonus === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: bonus });
      },
    },
  ],
  [
    id('BRU02'),
    {
      // "Até o fim do turno, pode usar Preço Proibido em até 2 habilidades
      // diferentes, mesmo que já tenha usado. Na primeira vez que perder Vida
      // por efeito próprio neste turno, deixe Pronta uma Carta de Classe sua
      // Ativada."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.precoProibidoExtra, 2);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.contratoFinalProntifica, 1);
      },
    },
  ],
  [
    id('BRU03'),
    {
      // "Dano e Impacto finais daquele Ataque se tornam 0. Depois da resolução,
      // perca 3 Vida que não podem ser reduzidos. Se essa perda fosse
      // derrotá-lo, a Ultimate não pode ser usada."
      legalidade: (consulta) =>
        podePagarComVida(consulta.jogador, 3)
          ? null
          : 'O Preço Não é Meu cobra 3 de Vida depois da resolução',
      aoResponder: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0, impactoFinal: 0 });
      },
      aposResolver: (ctx, alvo) => {
        pagarComVida(ctx, alvo.defensor, 3, alvo.origem);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

/** O dono possui esta Carta de Classe, Pronta, Ativada ou já Exaurida? */
const possui = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.cartasDeClasse.some((item) => item.carta === carta) || jogador.removidas.includes(carta);

/**
 * Conta as Ativações de Pacto e de Maldição de uma Ação.
 *
 * As Ativações ficam gravadas no espaço da Ação, venham de quem declarou ou de
 * quem respondeu, então o dono de cada uso é conferido carta a carta — o que
 * também mantém a conta certa num espelho de Bruxo contra Bruxo.
 */
export const contarAtivacoesDoBruxo = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const usos = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice)?.cartasDeClasseUsadas ?? [];
  for (const uso of usos) {
    if (uso.modo !== 'ativar') continue;
    const dono = [alvo.atacante, alvo.defensor].find((id) => possui(jogadorDo(ctx, id), uso.carta));
    if (dono === undefined || jogadorDo(ctx, dono).recurso.classe !== 'bruxo') continue;

    if (PACTOS.includes(uso.carta)) {
      registrarAnotacao(ctx, dono, {
        chave: CHAVE.ativacoesDoPacto,
        origem: uso.carta,
        escopo: 'partida',
        valor: 1,
      });
    }
    if (MALDICOES.includes(uso.carta)) {
      registrarAnotacao(ctx, dono, {
        chave: CHAVE.ativacoesDaMaldicao,
        origem: uso.carta,
        escopo: 'partida',
        valor: 1,
      });
      registrarAnotacao(ctx, dono, {
        chave: CHAVE.maldicaoAtivadaNoTurno,
        origem: uso.carta,
        escopo: 'turno',
        valor: 1,
      });
    }
  }
};

/**
 * "Maldição da Agonia": o preço que o adversário paga por agir duas vezes.
 *
 * Ela é a única Carta de Classe do Bruxo que dispara no fim de uma Ação
 * **inimiga**, então mora na mecânica de classe e não numa janela de carta.
 */
export const agoniaAposAcaoInimiga = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  causouDano: boolean,
  houveReacao: boolean,
): void => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (defensor.recurso.classe !== 'bruxo') return;

  const terceira = consumirPromessa(ctx, alvo.defensor, CHAVE.agoniaTerceiraAcao);
  if (alvo.indice === 2 && terceira > 0) {
    perderVidaDireta(ctx, alvo.atacante, 2, id('BRC06'));
    return;
  }
  if (alvo.indice !== 1) return;

  if (defensor.removidas.includes(id('BRC06'))) {
    perderVidaDireta(ctx, alvo.atacante, 2, id('BRC06'));
    prometerAoProximoAtaque(ctx, alvo.defensor, id('BRC06'), CHAVE.agoniaTerceiraAcao, 1);
    return;
  }
  const ativada = defensor.cartasDeClasse.some(
    (item) => item.carta === id('BRC06') && item.estado === 'ativada',
  );
  if (ativada && (causouDano || houveReacao)) {
    perderVidaDireta(ctx, alvo.atacante, 1, id('BRC06'));
  }
};

/** O Contrato Final prontifica na primeira Vida perdida do turno. */
export const contratoFinalAposResolver = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  if (jogadorDo(ctx, alvo.atacante).recurso.classe !== 'bruxo') return;
  if (lerPromessa(ctx, alvo.atacante, CHAVE.contratoFinalProntifica) === 0) return;
  if (!pagouVidaNaAcao(ctx, alvo.atacante)) return;
  consumirPromessa(ctx, alvo.atacante, CHAVE.contratoFinalProntifica);
  prontificar(ctx, alvo.atacante, [...PACTOS, ...MALDICOES], id('BRU02'));
};

/** "Tudo Tem um Preço: quando repetir a situação, restaure 1 Vida." */
export const tudoTemUmPreco = (ctx: Contexto, jogador: PlayerId): void => {
  const dono = jogadorDo(ctx, jogador);
  if (dono.recurso.classe !== 'bruxo' || !passivaRevelada(dono, id('BRP05'))) return;
  if (dono.reserva !== 2) return;
  if (lerPromessa(ctx, jogador, CHAVE.usouPrecoProibidoNoTurno) === 0) return;
  restaurarVidaEm(ctx, jogador, 1, id('BRP05'));
};

/** "Último Contrato: enquanto começar o turno com 5 de Vida ou menos." */
export const marcarInicioDoBruxo = (ctx: Contexto, jogador: PlayerId): void => {
  const dono = jogadorDo(ctx, jogador);
  if (dono.recurso.classe !== 'bruxo' || dono.vida > 5) return;
  prometerAoProximoAtaque(ctx, jogador, id('BRP10'), CHAVE.comecouTurnoComVida5, 1);
};

/** Recusa do Preço Proibido e das ofertas em Vida, no nível da classe. */
export const legalidadeDoBruxo = (consulta: ConsultaDeLegalidade): string | null =>
  recusaDoPrecoProibido(consulta);
