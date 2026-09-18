import type { CardId, EstadoDeJogador, PlayerId } from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';

import { definirGuarda, pagarComGuarda, reduzirNaResposta, somarAoAtaque } from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { consumirLimitePorTurno, jogadorDo, slotDe } from '../contexto.js';
import type {
  AlvoDoEfeito,
  ConsultaDeCusto,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import {
  LIMITE_DE_REDUCAO_VOLUNTARIA,
  estadoDeFuria,
  guardaJaReduzidaNoTurno,
  somarReducaoVoluntaria,
} from '../recursos-classe.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  escolhasDaAcao,
  escolhasDaResposta,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Bárbaro.
 *
 * A Guarda é o combustível, mas nunca aparece no custo impresso: o texto diz
 * "**pode** reduzir voluntariamente", e reduzir é decisão de quem joga.
 * Reduzir a própria Guarda como custo nunca provoca Ruptura — a Ruptura é o
 * que uma ação **inimiga** faz —, e habilidades normais não passam de dois
 * pontos por próprio turno.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** Os três Instintos e os três Totens. */
export const INSTINTOS: readonly CardId[] = [id('BAC01'), id('BAC02'), id('BAC03')];
export const TOTENS: readonly CardId[] = [id('BAC04'), id('BAC05'), id('BAC06')];

const INSTINTO_DO_BERSERKER = id('BAC01');
const TOTEM_DO_URSO = id('BAC04');
const CORACAO_SELVAGEM = id('BAP09');
const SANGUE_QUENTE = id('BAP01');

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

const cartaDeClasseEm = (
  jogador: EstadoDeJogador,
  carta: CardId,
  estado: 'pronta' | 'ativada',
): boolean => jogador.cartasDeClasse.some((item) => item.carta === carta && item.estado === estado);

/**
 * "Reduza voluntariamente sua Guarda em N."
 *
 * Devolve quantos pontos saíram de fato. O teto de dois por turno vale para
 * habilidades normais; Ultimates e efeitos de Exaurir passam `semLimite`.
 */
export const reduzirPropriaGuarda = (
  ctx: Contexto,
  jogador: PlayerId,
  pedido: number,
  origem: CardId,
  semLimite = false,
): number => {
  if (pedido <= 0) return 0;
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'barbaro') return 0;

  // "Coração Selvagem: a primeira vez em cada próprio turno que reduzir Guarda
  // como custo, reduza 1 ponto a menos, mínimo 1."
  let quantidade = pedido;
  if (
    passivaRevelada(atual, CORACAO_SELVAGEM) &&
    consumirLimitePorTurno(ctx, jogador, chaveDaPassiva(CORACAO_SELVAGEM), CORACAO_SELVAGEM)
  ) {
    quantidade = Math.max(1, quantidade - 1);
  }

  const permitido = semLimite
    ? quantidade
    : Math.max(
        0,
        Math.min(quantidade, LIMITE_DE_REDUCAO_VOLUNTARIA - guardaJaReduzidaNoTurno(atual)),
      );
  if (permitido === 0) return 0;

  const antes = estadoDeFuria(jogadorDo(ctx, jogador));
  const reduzido = pagarComGuarda(ctx, jogador, permitido, origem);
  if (reduzido === 0) return 0;

  somarReducaoVoluntaria(ctx, jogador, reduzido);
  prometerAoProximoAtaque(ctx, jogador, origem, CHAVE.reducoesVoluntariasNaPartida, 1, 'partida');

  const depois = estadoDeFuria(jogadorDo(ctx, jogador));

  // "Totem do Urso — Ativar: o próximo Ataque inimigo que causar Dano antes do
  // seu próximo turno causa 1 D a menos."
  if (cartaDeClasseEm(jogadorDo(ctx, jogador), TOTEM_DO_URSO, 'ativada')) {
    prometerAoProximoAtaque(ctx, jogador, TOTEM_DO_URSO, CHAVE.totemDoUrso, 1, 'partida');
  }

  if (antes !== 'enfurecido' && depois === 'enfurecido') {
    prometerAoProximoAtaque(ctx, jogador, origem, CHAVE.entrouEmEnfurecido, 1);
    // "Instinto do Berserker — Ativar: +1 D ao próximo Ataque deste turno."
    if (cartaDeClasseEm(jogadorDo(ctx, jogador), INSTINTO_DO_BERSERKER, 'ativada')) {
      prometerAoProximoAtaque(
        ctx,
        jogador,
        INSTINTO_DO_BERSERKER,
        CHAVE.proximoAtaqueDanoAdiado,
        1,
      );
    }
    // "Sangue Quente: a primeira vez em cada próprio turno que fizer essa
    // transição, seu próximo Ataque recebe +1 D."
    if (
      passivaRevelada(jogadorDo(ctx, jogador), SANGUE_QUENTE) &&
      consumirLimitePorTurno(ctx, jogador, chaveDaPassiva(SANGUE_QUENTE), SANGUE_QUENTE)
    ) {
      prometerAoProximoAtaque(ctx, jogador, SANGUE_QUENTE, CHAVE.proximoAtaqueDanoAdiado, 1);
    }
  }

  // "Instinto do Berserker — Exaurir: quando reduzir até 0, +4 D."
  if (
    depois === 'desencadeado' &&
    jogadorDo(ctx, jogador).removidas.includes(INSTINTO_DO_BERSERKER)
  ) {
    prometerAoProximoAtaque(ctx, jogador, INSTINTO_DO_BERSERKER, CHAVE.proximoAtaqueDanoAdiado, 4);
  }

  return reduzido;
};

/** Quanto da própria Guarda o jogador pediu para reduzir nesta jogada. */
const guardaPedida = (ctx: Contexto, alvo: AlvoDoEfeito): number =>
  (alvo.dono === alvo.atacante ? escolhasDaAcao(ctx, alvo) : escolhasDaResposta(ctx, alvo))
    .guardaReduzida ?? 0;

const enfurecidoOuPior = (jogador: EstadoDeJogador): boolean =>
  estadoDeFuria(jogador) !== 'contido';

const exigirGuardaEntre = (
  consulta: ConsultaDeCusto,
  maximo: number,
  carta: CardId,
): {
  readonly tipo: 'escolha-invalida';
  readonly carta: CardId;
  readonly detalhe: string;
} | null => {
  const pedido = consulta.escolhas.guardaReduzida;
  if (pedido === undefined) return null;
  return pedido >= 0 && pedido <= maximo
    ? null
    : {
        tipo: 'escolha-invalida',
        carta,
        detalhe: `a redução voluntária desta carta vai de 0 a ${String(maximo)}`,
      };
};

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('BA01'),
    {
      // "Se estiver Enfurecido, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (estadoDeFuria(jogadorDo(ctx, alvo.atacante)) !== 'enfurecido') return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('BA02'),
    {
      // "Pode reduzir voluntariamente a própria Guarda em 1 para receber +1 I."
      validarEscolhas: (consulta) => exigirGuardaEntre(consulta, 1, id('BA02')),
      aoDeclarar: (ctx, alvo) => {
        if (guardaPedida(ctx, alvo) < 1) return;
        if (reduzirPropriaGuarda(ctx, alvo.atacante, 1, alvo.origem) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('BA03'),
    {
      // "Pode reduzir voluntariamente a própria Guarda em 2 para receber +2 D."
      validarEscolhas: (consulta) => exigirGuardaEntre(consulta, 2, id('BA03')),
      aoDeclarar: (ctx, alvo) => {
        if (guardaPedida(ctx, alvo) < 2) return;
        if (reduzirPropriaGuarda(ctx, alvo.atacante, 2, alvo.origem) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('BA04'),
    {
      // "Se estiver Enfurecido ou Desencadeado, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (!enfurecidoOuPior(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('BA05'),
    {
      // "Se estiver Desencadeado, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (estadoDeFuria(jogadorDo(ctx, alvo.atacante)) !== 'desencadeado') return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('BA06'),
    {
      // "Se a Ação anterior foi Ataque e você estiver Enfurecido ou
      // Desencadeado, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.acaoAnteriorFoiAtaque) === 0) return;
        if (!enfurecidoOuPior(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  // "Não depende de sacrificar Guarda": o Machado Arremessado não tem texto
  // além dos valores impressos.
  [id('BA07'), {}],
  [
    id('BA08'),
    {
      // "Se estiver com 15 de Vida ou menos, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.atacante).vida > 15) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('BA09'),
    {
      // "Pode reduzir voluntariamente a própria Guarda em 2 para receber +1 D e
      // +1 I."
      validarEscolhas: (consulta) => exigirGuardaEntre(consulta, 2, id('BA09')),
      aoDeclarar: (ctx, alvo) => {
        if (guardaPedida(ctx, alvo) < 2) return;
        if (reduzirPropriaGuarda(ctx, alvo.atacante, 2, alvo.origem) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
      },
    },
  ],
  [
    id('BA10'),
    {
      // "Só pode ser usada enquanto estiver Desencadeado. Recebe +1 D por
      // Ataque anterior neste turno, máximo +2 D."
      legalidade: (consulta) =>
        estadoDeFuria(consulta.jogador) === 'desencadeado'
          ? null
          : 'só pode ser usada enquanto estiver Desencadeado',
      aoDeclarar: (ctx, alvo) => {
        const anteriores = Math.min(lerPromessa(ctx, alvo.atacante, CHAVE.ataquesResolvidos), 2);
        if (anteriores === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: anteriores });
      },
    },
  ],
  [
    id('BA11'),
    {
      // "Seu próximo Ataque recebe +1 D e +1 I. Se estiver Enfurecido ou
      // Desencadeado, recebe +1 D adicional."
      aposResolver: (ctx, alvo) => {
        const extra = enfurecidoOuPior(jogadorDo(ctx, alvo.atacante)) ? 1 : 0;
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.proximoAtaqueDano,
          1 + extra,
        );
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
      },
    },
  ],
  [
    id('BA12'),
    {
      // "Reduza voluntariamente sua Guarda em 2. Seu próximo Ataque custa 1 AP
      // a menos."
      aposResolver: (ctx, alvo) => {
        reduzirPropriaGuarda(ctx, alvo.atacante, 2, alvo.origem);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximaAcaoDescontoAp, 1);
      },
    },
  ],
  [
    id('BA13'),
    {
      // "Os próximos 2 Ataques deste turno recebem +1 D. Depois que cada um
      // resolver, reduza voluntariamente sua Guarda em 1, respeitando o limite
      // normal de 2 por turno."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.frenesiRestante, 2);
      },
    },
  ],
  [
    id('BA14'),
    {
      // "Só com 15 de Vida ou menos. Seu próximo Ataque recebe +2 D. Você não
      // pode restaurar Guarda por efeitos próprios neste turno."
      legalidade: (consulta) =>
        consulta.jogador.vida <= 15 ? null : 'só pode ser usada com 15 de Vida ou menos',
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueDano, 2);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proibidoRestaurarGuarda, 1);
      },
    },
  ],
  [
    id('BA15'),
    {
      // "A próxima carta de Reação contra um Ataque seu reduz 1 D e 1 I a
      // menos."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.gritoAmeacador, 1);
      },
    },
  ],
  [
    id('BA16'),
    {
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
    },
  ],
  [
    id('BA17'),
    {
      // "Reduza 3 I. Se impedir Ruptura, seu primeiro Ataque no próximo turno
      // recebe +1 I."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.defensor,
          alvo.origem,
          CHAVE.primeiroAtaqueDoProximoTurnoImpacto,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('BA18'),
    {
      // "Reduza 1 D. Depois da resolução, reduza voluntariamente a própria
      // Guarda em até 2. Para cada ponto perdido, seu primeiro Ataque no
      // próximo turno recebe +1 D."
      validarEscolhas: (consulta) => exigirGuardaEntre(consulta, 2, id('BA18')),
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
      aposResolver: (ctx, alvo) => {
        const pedido = guardaPedida(ctx, alvo);
        // A redução acontece no turno inimigo, fora do teto do próprio turno.
        const perdido = reduzirPropriaGuarda(ctx, alvo.defensor, pedido, alvo.origem, true);
        if (perdido === 0) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.defensor,
          alvo.origem,
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          perdido,
          'partida',
        );
      },
    },
  ],
  [
    id('BA19'),
    {
      // "Reduza 2 D e 2 I. Se ainda perder Vida, seu primeiro Ataque no próximo
      // turno recebe +1 D."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano <= 0) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.defensor,
          alvo.origem,
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('BA20'),
    {
      // "Só contra um Ataque que reduziria sua Vida a 0. Reduza 4 D. Depois da
      // resolução, ajuste sua Guarda para 0."
      legalidade: (consulta) => {
        const valores = consulta.acaoRespondida?.valores;
        if (valores === undefined || valores === null) return 'só responde a um Ataque';
        return consulta.jogador.vida - valores.dano <= 0
          ? null
          : 'só contra um Ataque que reduziria sua Vida a 0';
      },
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4 });
      },
      aposResolver: (ctx, alvo) => {
        definirGuarda(ctx, alvo.defensor, 0);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('BAP01'),
    {
      // "Revele na primeira vez que entrar em Enfurecido por reduzir
      // voluntariamente a própria Guarda." O bônus é somado por
      // `reduzirPropriaGuarda`.
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.entrouEmEnfurecido) > 0,
    },
  ],
  [
    id('BAP02'),
    {
      // "Revele na primeira vez que terminar o próprio turno com Guarda 0.
      // Depois disso, sempre que terminar Desencadeado, seu primeiro Ataque no
      // próximo turno recebe +1 D."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' && jogadorDo(ctx, revelacao.dono).guarda === 0,
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(
          ctx,
          revelacao.dono,
          id('BAP02'),
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('BAP03'),
    {
      // "Revele quando perder pelo menos 4 de Vida de um único Ataque. Seu
      // primeiro Ataque no próximo turno recebe +2 D. Depois disso, o mesmo
      // evento concede +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.alvo?.defensor === revelacao.dono && (revelacao.resumo?.dano ?? 0) >= 4,
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(
          ctx,
          revelacao.dono,
          id('BAP03'),
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          2,
          'partida',
        );
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || resumo.dano < 4) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.dono,
          alvo.origem,
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('BAP04'),
    {
      // "Revele quando provocar sua primeira Ruptura. Depois disso, seu
      // primeiro Ataque de cada turno contra Guarda 0 recebe +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.alvo?.atacante === revelacao.dono && revelacao.resumo?.ruptura === true,
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
    id('BAP05'),
    {
      // "Revele quando chegar a 10 de Vida ou menos. Depois disso, enquanto
      // permanecer nessa faixa, Ataques usados enquanto Enfurecido ou
      // Desencadeado recebem +1 I."
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 10,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        const dono = jogadorDo(ctx, alvo.dono);
        if (dono.vida > 10 || !enfurecidoOuPior(dono)) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('BAP06'),
    {
      // "Revele quando terminar um turno depois de realizar 3 Ações e ficar sem
      // Reserva."
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return (
          revelacao.gatilho === 'fim-do-turno' &&
          dono.reserva === 0 &&
          dono.acoesRealizadasNoTurno >= 3
        );
      },
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(
          ctx,
          revelacao.dono,
          id('BAP06'),
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('BAP07'),
    {
      // "Revele quando uma Reação impedir Ruptura. Depois disso, na primeira
      // vez em cada turno inimigo que isso acontecer, reduza +1 D daquele
      // Ataque."
      revelaEm: (_ctx, revelacao) => {
        const resumo = revelacao.resumo;
        if (revelacao.alvo?.defensor !== revelacao.dono || resumo === null) return false;
        return resumo.houveReacao && resumo.teriaRompidoSemResposta && !resumo.ruptura;
      },
      antesDeResolver: (ctx, alvo) => {
        if (alvo.defensor !== alvo.dono || alvo.reacao === null) return;
        const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
        if (slot === undefined || alvo.perfil.valores === null) return;
        // "Quando uma Reação impedir Ruptura": a pergunta é sobre o Ataque
        // **sem** a redução da Resposta — é ela que vai impedir.
        const impacto = alvo.perfil.valores.impacto + slot.modificadores.impacto;
        const guarda = jogadorDo(ctx, alvo.dono).guarda;
        if (guarda === 0 || guarda - impacto > 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('BAP08'),
    {
      // "Revele quando realizar 3 Ataques no mesmo turno pela primeira vez.
      // Depois disso, o terceiro Ataque de cada turno recebe +1 D enquanto
      // Enfurecido ou Desencadeado."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.ataquesResolvidos) >= 3,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.ordem !== 3 || alvo.perfil.valores === null) return;
        if (!enfurecidoOuPior(jogadorDo(ctx, alvo.dono))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('BAP09'),
    {
      // "Revele quando usar voluntariamente a própria Guarda como custo 3 vezes
      // na partida." O desconto é aplicado por `reduzirPropriaGuarda`.
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.reducoesVoluntariasNaPartida) >= 3,
    },
  ],
  [
    id('BAP10'),
    {
      // "Revele quando sobreviver a um Ataque com 3 de Vida ou menos. No
      // próximo turno, seu primeiro Ataque recebe +2 D."
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return revelacao.alvo?.defensor === revelacao.dono && dono.vida > 0 && dono.vida <= 3;
      },
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(
          ctx,
          revelacao.dono,
          id('BAP10'),
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          2,
          'partida',
        );
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Instintos e três Totens                     */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('BAC01'),
    {
      // Os dois lados são lidos por `reduzirPropriaGuarda`, que é por onde
      // toda redução voluntária passa.
      ativar: {},
      exaurir: {},
    },
  ],
  [
    id('BAC02'),
    {
      ativar: {
        // "Quando jogar um Ataque de pelo menos 3 AP enquanto Enfurecido ou
        // Desencadeado, ele recebe +1 I."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null &&
          consulta.perfil.custo.valor >= 3 &&
          enfurecidoOuPior(consulta.jogador)
            ? null
            : 'o Instinto do Colosso pede um Ataque de 3 AP com a Guarda já baixa',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        },
      },
      exaurir: {
        // "Aquele Ataque recebe +2 D e +3 I."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null &&
          consulta.perfil.custo.valor >= 3 &&
          enfurecidoOuPior(consulta.jogador)
            ? null
            : 'o Instinto do Colosso pede um Ataque de 3 AP com a Guarda já baixa',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 3 });
        },
      },
    },
  ],
  [
    id('BAC03'),
    {
      ativar: {
        // "Durante o turno inimigo, se estiver Desencadeado, ao receber um
        // Ataque reduza 1 D e 1 I."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          if (estadoDeFuria(jogadorDo(ctx, alvo.dono)) !== 'desencadeado') return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Quando um Ataque fosse reduzir sua Vida a 0, depois de toda a
        // resolução ajuste sua Vida para 1."
        aposResolver: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          const dono = jogadorDo(ctx, alvo.dono);
          if (dono.vida > 0) return;
          definirVidaEmUm(ctx, alvo.dono, alvo.origem);
        },
      },
    },
  ],
  [
    id('BAC04'),
    {
      ativar: {
        // O efeito é armado por `reduzirPropriaGuarda` e cobrado no Ataque
        // inimigo seguinte.
      },
      exaurir: {
        // "Durante o turno inimigo, reduza 4 D de um único Ataque."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4 });
        },
      },
    },
  ],
  [
    id('BAC05'),
    {
      ativar: {
        // "Quando jogar um Ataque imediatamente depois de outro Ataque, o
        // segundo recebe +1 D."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null &&
          valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.acaoAnteriorFoiAtaque) > 0
            ? null
            : 'o Totem do Lobo pede um Ataque logo depois de outro Ataque',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
      },
      exaurir: {
        // "Um Ataque que seja sua terceira Ação depois de pelo menos 1 Ataque
        // anterior recebe +3 D e +1 I."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null &&
          consulta.ordem === 3 &&
          valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.ataquesResolvidos) >= 1
            ? null
            : 'o Totem do Lobo Exaurido pede a terceira Ação depois de um Ataque',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 1 });
        },
      },
    },
  ],
  [
    id('BAC06'),
    {
      ativar: {
        // "Quando provocar Ruptura, aquele Ataque recebe +1 D depois do bônus
        // normal da Ruptura."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
          perderVidaAdicional(ctx, alvo, 1);
        },
      },
      exaurir: {
        // "Quando um Ataque estiver prestes a provocar Ruptura, recebe +2 I
        // antes da resolução. Se a Ruptura acontecer, recebe +2 D adicionais."
        antesDeResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 2 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
          perderVidaAdicional(ctx, alvo, 2);
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
    id('BAU01'),
    {
      // "Antes da resolução, pode reduzir voluntariamente toda a própria Guarda
      // restante a 0. Se fizer isso, recebe +4 D e +1 I." Ultimates passam do
      // teto de dois pontos por turno.
      antesDeResolver: (ctx, alvo) => {
        if (guardaPedida(ctx, alvo) === 0) return;
        const guarda = jogadorDo(ctx, alvo.atacante).guarda;
        if (guarda === 0) return;
        if (reduzirPropriaGuarda(ctx, alvo.atacante, guarda, alvo.origem, true) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 4, impacto: 1 });
      },
    },
  ],
  [
    id('BAU02'),
    {
      // "Durante o restante do turno, os próximos 2 Ataques custam 1 AP a
      // menos. Depois que cada um resolver, reduza voluntariamente a Guarda em
      // 2, podendo ultrapassar o limite normal."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.frenesiSemFreioRestante, 2);
      },
    },
  ],
  [
    id('BAU03'),
    {
      // "Só contra um Ataque que derrotaria você. Depois de toda a resolução,
      // sua Vida fica em 1 e sua Guarda em 0."
      legalidade: (consulta) => {
        const valores = consulta.acaoRespondida?.valores;
        if (valores === undefined || valores === null) return 'só responde a um Ataque';
        return consulta.jogador.vida - valores.dano <= 0
          ? null
          : 'só contra um Ataque que derrotaria você';
      },
      aposResolver: (ctx, alvo) => {
        definirVidaEmUm(ctx, alvo.defensor, alvo.origem);
        definirGuarda(ctx, alvo.defensor, 0);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

const definirVidaEmUm = (ctx: Contexto, jogador: PlayerId, origem: CardId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.vida === 1) return;
  ctx.partida = {
    ...ctx.partida,
    jogadores: [
      ctx.partida.jogadores[0].id === jogador
        ? { ...ctx.partida.jogadores[0], vida: 1 }
        : ctx.partida.jogadores[0],
      ctx.partida.jogadores[1].id === jogador
        ? { ...ctx.partida.jogadores[1], vida: 1 }
        : ctx.partida.jogadores[1],
    ],
  };
  ctx.eventos.push({
    tipo: 'vida-restaurada',
    alvo: jogador,
    pedido: 1 - atual.vida,
    restaurado: 1 - atual.vida,
    vidaDepois: 1,
    origem,
  });
};

/** "Aquele Ataque recebe +N D depois do bônus normal da Ruptura." */
const perderVidaAdicional = (ctx: Contexto, alvo: AlvoDoEfeito, quantidade: number): void => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  ctx.partida = {
    ...ctx.partida,
    jogadores: [
      ctx.partida.jogadores[0].id === alvo.defensor
        ? { ...ctx.partida.jogadores[0], vida: defensor.vida - quantidade }
        : ctx.partida.jogadores[0],
      ctx.partida.jogadores[1].id === alvo.defensor
        ? { ...ctx.partida.jogadores[1], vida: defensor.vida - quantidade }
        : ctx.partida.jogadores[1],
    ],
  };
  ctx.eventos.push({
    tipo: 'vida-perdida',
    alvo: alvo.defensor,
    valor: quantidade,
    vidaDepois: defensor.vida - quantidade,
    origem: alvo.origem,
  });
};

/** O Frenesi e o Frenesi sem Freio cobram Guarda depois de cada Ataque. */
export const frenesiAposResolver = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  houveAtaque: boolean,
): void => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'barbaro' || !houveAtaque) return;

  if (lerPromessa(ctx, alvo.atacante, CHAVE.frenesiRestante) > 0) {
    prometerAoProximoAtaque(ctx, alvo.atacante, id('BA13'), CHAVE.frenesiRestante, -1);
    reduzirPropriaGuarda(ctx, alvo.atacante, 1, id('BA13'));
  }
  if (lerPromessa(ctx, alvo.atacante, CHAVE.frenesiSemFreioRestante) > 0) {
    prometerAoProximoAtaque(ctx, alvo.atacante, id('BAU02'), CHAVE.frenesiSemFreioRestante, -1);
    reduzirPropriaGuarda(ctx, alvo.atacante, 2, id('BAU02'), true);
  }
};

/** O Frenesi soma +1 D aos Ataques que ainda estão sob ele. */
export const bonusDoFrenesi = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'barbaro' || alvo.perfil.valores === null) return;
  if (lerPromessa(ctx, alvo.atacante, CHAVE.frenesiRestante) === 0) return;
  somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
};

/** "O Grito Ameaçador faz a próxima Reação inimiga reduzir 1 D e 1 I a menos." */
export const aplicarGritoAmeacador = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  if (jogadorDo(ctx, alvo.atacante).recurso.classe !== 'barbaro') return;
  if (alvo.reacao === null) return;
  if (consumirPromessa(ctx, alvo.atacante, CHAVE.gritoAmeacador) === 0) return;

  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  const dano = Math.min(1, slot?.reducaoDaResposta.dano ?? 0);
  const impacto = Math.min(1, slot?.reducaoDaResposta.impacto ?? 0);
  if (dano === 0 && impacto === 0) return;
  reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: -dano, impacto: -impacto });
};

/** "Totem do Urso: o próximo Ataque inimigo que causar Dano causa 1 D a menos." */
export const aplicarTotemDoUrso = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (defensor.recurso.classe !== 'barbaro' || alvo.perfil.valores === null) return;
  if (consumirPromessa(ctx, alvo.defensor, CHAVE.totemDoUrso) === 0) return;
  reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1 });
};

/** Descontos de AP do Frenesi sem Freio. */
export const descontoDoBarbaro = (
  jogador: EstadoDeJogador,
  perfil: { readonly valores: unknown },
): boolean =>
  jogador.recurso.classe === 'barbaro' &&
  perfil.valores !== null &&
  valorDaAnotacao(jogador.anotacoes, CHAVE.frenesiSemFreioRestante) > 0;

/** O Bárbaro está proibido de restaurar a própria Guarda neste turno? */
export const proibidoRestaurarGuarda = (jogador: EstadoDeJogador): boolean =>
  valorDaAnotacao(jogador.anotacoes, CHAVE.proibidoRestaurarGuarda) > 0;
