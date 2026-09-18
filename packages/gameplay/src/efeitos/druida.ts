import type { CardId, EstadoDeJogador, FormaDoDruida, PlayerId } from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import { adiantarCartaNoCooldown, devolverCartaAMao } from '@arcane-duel/rules-engine';

import {
  ajustar,
  reduzirNaResposta,
  restaurarGuardaEm,
  restaurarVidaEm,
  somarAoAtaque,
} from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { consumirLimitePorTurno, emitir, gravarJogador, jogadorDo, slotDe } from '../contexto.js';
import type {
  AlvoDoEfeito,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import { formaDe, mudarForma } from '../recursos-classe.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  escolhasDaAcao,
  escolhasDaResposta,
  exigirReforco,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Druida.
 *
 * A Forma é estado, não moeda: o texto lê em que Forma o Druida está. Mudar é
 * gratuito uma vez no início do próprio turno e, fora disso, exige carta —
 * e "você pode mudar de forma" é sempre escolha de quem joga.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** As três Formas Selvagens e os três Círculos Naturais. */
export const FORMAS: readonly CardId[] = [id('DC01'), id('DC02'), id('DC03')];
export const CIRCULOS: readonly CardId[] = [id('DC04'), id('DC05'), id('DC06')];

const CIRCULO_DO_BOSQUE = id('DC04');
const CIRCULO_DA_LUA = id('DC06');

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

const cartaDeClasseEm = (
  jogador: EstadoDeJogador,
  carta: CardId,
  estado: 'pronta' | 'ativada',
): boolean => jogador.cartasDeClasse.some((item) => item.carta === carta && item.estado === estado);

export const selvagem = (jogador: EstadoDeJogador): boolean => formaDe(jogador) === 'selvagem';
export const humano = (jogador: EstadoDeJogador): boolean => formaDe(jogador) === 'humana';

/** A Forma Selvagem foi trancada por um Exaurir de Carta de Forma? */
export const selvagemTrancada = (jogador: EstadoDeJogador): boolean =>
  valorDaAnotacao(jogador.anotacoes, CHAVE.selvagemTrancada) > 0;

/**
 * "Mude de forma."
 *
 * Devolve `true` quando a Forma mudou de fato. A trava do Exaurir das Cartas
 * de Forma é respeitada aqui: depois dela, o Druida não entra mais em
 * Selvagem pelo resto da partida.
 */
export const transformar = (
  ctx: Contexto,
  jogador: PlayerId,
  destino: FormaDoDruida,
  gratuita: boolean,
  origem: CardId,
): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'druida') return false;
  if (destino === 'selvagem' && selvagemTrancada(atual)) return false;

  const antes = formaDe(atual);
  if (!mudarForma(ctx, jogador, destino, gratuita)) return false;

  prometerAoProximoAtaque(ctx, jogador, origem, CHAVE.mudouDeFormaNoTurno, 1);

  // "Pele Renovada: ao mudar de Selvagem para Humana com 15 de Vida ou menos."
  if (antes === 'selvagem' && destino === 'humana') {
    const dono = jogadorDo(ctx, jogador);
    if (dono.vida <= 15 && passivaRevelada(dono, id('DP04'))) {
      restaurarVidaEm(ctx, jogador, 1, id('DP04'));
    }
  }

  // "Círculo da Lua — Ativar: a primeira ação depois da transformação recebe
  // +1 D se for Ataque ou reduz +1 D se for Reação."
  const dono = jogadorDo(ctx, jogador);
  if (cartaDeClasseEm(dono, CIRCULO_DA_LUA, 'ativada')) {
    prometerAoProximoAtaque(ctx, jogador, CIRCULO_DA_LUA, CHAVE.circuloDaLuaAtaque, 1);
    prometerAoProximoAtaque(ctx, jogador, CIRCULO_DA_LUA, CHAVE.circuloDaLuaResposta, 1, 'partida');
  }
  // "Círculo da Lua — Exaurir: deixe Pronta sua Carta de Forma e ganhe
  // +2 D e +1 I na próxima ação ofensiva."
  if (dono.removidas.includes(CIRCULO_DA_LUA)) {
    prontificarForma(ctx, jogador, CIRCULO_DA_LUA);
    prometerAoProximoAtaque(ctx, jogador, CIRCULO_DA_LUA, CHAVE.proximoAtaqueDanoAdiado, 2);
    prometerAoProximoAtaque(ctx, jogador, CIRCULO_DA_LUA, CHAVE.proximoAtaqueImpacto, 1);
  }
  return true;
};

/** Tranca a Forma Selvagem e devolve o Druida para a Forma Humana. */
const trancarSelvagem = (ctx: Contexto, jogador: PlayerId, origem: CardId): void => {
  mudarForma(ctx, jogador, 'humana', false);
  prometerAoProximoAtaque(ctx, jogador, origem, CHAVE.selvagemTrancada, 1, 'partida');
};

const prontificarForma = (ctx: Contexto, jogador: PlayerId, origem: CardId): void => {
  const atual = jogadorDo(ctx, jogador);
  const forma = atual.cartasDeClasse.find(
    (item) => FORMAS.includes(item.carta) && item.estado === 'ativada',
  );
  if (forma === undefined) return;
  gravarJogador(ctx, {
    ...atual,
    cartasDeClasse: atual.cartasDeClasse.map((item) =>
      item.carta === forma.carta ? { ...item, estado: 'pronta' as const } : item,
    ),
  });
  emitir(ctx, {
    tipo: 'carta-de-classe-prontificada-por-efeito',
    jogador,
    carta: forma.carta,
    origem,
  });
};

/** "Restaure N Vida", com o adicional do Círculo do Bosque. */
const curar = (ctx: Contexto, jogador: PlayerId, base: number, origem: CardId): number => {
  const dono = jogadorDo(ctx, jogador);
  const extra = cartaDeClasseEm(dono, CIRCULO_DO_BOSQUE, 'ativada')
    ? 1
    : dono.removidas.includes(CIRCULO_DO_BOSQUE)
      ? 3
      : 0;
  return restaurarVidaEm(ctx, jogador, base + extra, origem);
};

/** "Restaure N Guarda", com o adicional do Círculo do Bosque. */
const restaurarGuarda = (ctx: Contexto, jogador: PlayerId, base: number): void => {
  const dono = jogadorDo(ctx, jogador);
  const extra = cartaDeClasseEm(dono, CIRCULO_DO_BOSQUE, 'ativada')
    ? 1
    : dono.removidas.includes(CIRCULO_DO_BOSQUE)
      ? 3
      : 0;
  restaurarGuardaEm(ctx, jogador, base + extra);
};

const adiantar = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const movimento = adiantarCartaNoCooldown(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(
    ctx,
    movimento.valor.voltouParaAMao
      ? { tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de }
      : {
          tipo: 'carta-adiantada-no-cooldown',
          jogador,
          carta,
          de: movimento.valor.de,
          para: movimento.valor.para,
        },
  );
};

const devolver = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const movimento = devolverCartaAMao(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(ctx, { tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de });
  prometerAoProximoAtaque(ctx, jogador, carta, CHAVE.cartaVoltouCedo, 1);
};

/** A Forma pedida na jogada, quando o texto oferece a troca. */
const formaPedida = (ctx: Contexto, alvo: AlvoDoEfeito): FormaDoDruida | undefined =>
  (alvo.dono === alvo.atacante ? escolhasDaAcao(ctx, alvo) : escolhasDaResposta(ctx, alvo)).forma;

const outraForma = (jogador: EstadoDeJogador): FormaDoDruida =>
  selvagem(jogador) ? 'humana' : 'selvagem';

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('D01'),
    {
      // "Na Forma Humana, se for sua primeira Ação, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (!humano(jogadorDo(ctx, alvo.atacante)) || alvo.ordem !== 1) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('D02'),
    {
      // "Na Forma Humana, se o adversário usar uma carta de Reação, recebe
      // +1 D depois da redução."
      antesDeResolver: (ctx, alvo) => {
        if (!humano(jogadorDo(ctx, alvo.atacante)) || alvo.reacao === null) return;
        ajustar(ctx, alvo.atacante, alvo.indice, { bonusAposReducao: 1 });
      },
    },
  ],
  [
    id('D03'),
    {
      // "Na Forma Humana, se for usado imediatamente depois de uma Técnica,
      // recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (!humano(jogadorDo(ctx, alvo.atacante)) || alvo.ordem === 1) return;
        if (lerPromessa(ctx, alvo.atacante, CHAVE.acaoAnteriorFoiAtaque) > 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('D04'),
    {
      // "Na Forma Selvagem, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (!selvagem(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('D05'),
    {
      // "Na Forma Selvagem, se o adversário estiver com 3 ou menos de Guarda ao
      // declarar, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (!selvagem(jogadorDo(ctx, alvo.atacante))) return;
        if (jogadorDo(ctx, alvo.defensor).guarda > 3) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('D06'),
    {
      // "Na Forma Selvagem, recebe +1 I se for sua primeira Ação ofensiva do
      // turno."
      aoDeclarar: (ctx, alvo) => {
        if (!selvagem(jogadorDo(ctx, alvo.atacante))) return;
        if (lerPromessa(ctx, alvo.atacante, CHAVE.ataquesResolvidos) > 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('D07'),
    {
      // "Se uma ação anterior neste turno ocorreu em Forma Humana e depois você
      // se transformou, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.acaoEmFormaHumana) === 0) return;
        if (!selvagem(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('D08'),
    {
      // "Se mudou de forma neste turno, recebe +1 D e +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.mudouDeFormaNoTurno) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
      },
    },
  ],
  [
    id('D09'),
    {
      // "Na Forma Humana, recebe +1 I. Na Forma Selvagem, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        const dono = jogadorDo(ctx, alvo.atacante);
        somarAoAtaque(
          ctx,
          alvo.atacante,
          alvo.indice,
          selvagem(dono) ? { dano: 1 } : { impacto: 1 },
        );
      },
    },
  ],
  [
    id('D10'),
    {
      // "Na Forma Selvagem, se for sua terceira Ação, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (!selvagem(jogadorDo(ctx, alvo.atacante)) || alvo.ordem !== 3) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('D11'),
    {
      // "Seu próximo Ataque neste turno recebe +1 D e +1 I. Na Forma Humana,
      // também restaure 1 Guarda."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueDano, 1);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
        if (humano(jogadorDo(ctx, alvo.atacante))) restaurarGuarda(ctx, alvo.atacante, 1);
      },
    },
  ],
  [
    id('D12'),
    {
      // "Mude de forma. Essa mudança não conta como a Metamorfose gratuita do
      // início do turno. Depois, sua próxima Ação neste turno custa 1 AP a
      // menos."
      aposResolver: (ctx, alvo) => {
        transformar(
          ctx,
          alvo.atacante,
          outraForma(jogadorDo(ctx, alvo.atacante)),
          false,
          alvo.origem,
        );
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximaAcaoDescontoAp, 1);

        // "Metamorfose Perfeita: na primeira vez em cada próprio turno que usar
        // Metamorfose Instintiva, sua próxima ação ofensiva recebe +1 D ou +1 I."
        const dono = jogadorDo(ctx, alvo.atacante);
        if (!passivaRevelada(dono, id('DP08'))) return;
        if (!consumirLimitePorTurno(ctx, alvo.atacante, chaveDaPassiva(id('DP08')), id('DP08'))) {
          return;
        }
        const escolha = escolhasDaAcao(ctx, alvo).reforco;
        if (escolha === undefined) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          id('DP08'),
          escolha === 'impacto' ? CHAVE.proximoAtaqueImpacto : CHAVE.proximoAtaqueDano,
          1,
        );
      },
    },
  ],
  [
    id('D13'),
    {
      // "Restaure 2 Vida. Na Forma Humana, restaure 3 em vez disso."
      aposResolver: (ctx, alvo) => {
        const base = humano(jogadorDo(ctx, alvo.atacante)) ? 3 : 2;
        curar(ctx, alvo.atacante, base, alvo.origem);
      },
    },
  ],
  [
    id('D14'),
    {
      // "Até o início do seu próximo turno, sua primeira Resposta reduz +1 D e
      // +1 I."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.cascaDeCarvalho,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('D15'),
    {
      // "Se estiver Humano, transforme-se em Selvagem. Seu próximo Ataque
      // Selvagem neste turno recebe +2 D."
      aposResolver: (ctx, alvo) => {
        if (humano(jogadorDo(ctx, alvo.atacante))) {
          transformar(ctx, alvo.atacante, 'selvagem', false, alvo.origem);
        }
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.proximoAtaqueSelvagemDano,
          2,
        );
      },
    },
  ],
  [
    id('D16'),
    {
      // "Reduza 2 D e 2 I. Na Forma Humana, se impedir Ruptura, restaure
      // 1 Guarda."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!humano(jogadorDo(ctx, alvo.defensor))) return;
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        restaurarGuarda(ctx, alvo.defensor, 1);
      },
    },
  ],
  [
    id('D17'),
    {
      // "Reduza 3 D. Na Forma Selvagem, reduza 4 D em vez disso."
      aoResponder: (ctx, alvo) => {
        const dano = selvagem(jogadorDo(ctx, alvo.defensor)) ? 4 : 3;
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano });
      },
    },
  ],
  [
    id('D18'),
    {
      // "Reduza 3 I. Na Forma Humana, se o Impacto final for 0, seu próximo
      // Ataque recebe +1 I."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!humano(jogadorDo(ctx, alvo.defensor))) return;
        if (!resumo.houveAtaque || resumo.impacto !== 0) return;
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
    id('D19'),
    {
      // "Reduza 2 D e 2 I. Na Forma Selvagem, se o Dano final for 0, seu
      // próximo Ataque recebe +1 D."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!selvagem(jogadorDo(ctx, alvo.defensor))) return;
        if (!resumo.houveAtaque || resumo.dano !== 0) return;
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
    id('D20'),
    {
      // "Reduza 3 D e 1 I. Depois da resolução, você pode mudar de forma. Essa
      // mudança não consome a Metamorfose gratuita do início do seu próximo
      // turno."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 1 });
      },
      aposResolver: (ctx, alvo) => {
        const destino = formaPedida(ctx, alvo);
        if (destino === undefined) return;
        transformar(ctx, alvo.defensor, destino, false, alvo.origem);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('DP01'),
    {
      // "Revele na primeira vez que realizar uma Ação em Forma Humana e outra
      // em Forma Selvagem no mesmo turno."
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.acaoEmFormaHumana) > 0 &&
        lerPromessa(ctx, revelacao.dono, CHAVE.acaoEmFormaSelvagem) > 0,
      validarEscolhas: (consulta) =>
        consulta.perfil.valores !== null &&
        valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.acaoEmFormaHumana) > 0 &&
        valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.acaoEmFormaSelvagem) > 0 &&
        valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('DP01'))) === 0
          ? exigirReforco(consulta.escolhas, id('DP01'), 'escolha +1 D ou +1 I')
          : null,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.acaoEmFormaHumana) === 0) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.acaoEmFormaSelvagem) === 0) return;
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
    id('DP02'),
    {
      // "Revele quando um Ataque Selvagem provocar sua primeira Ruptura."
      revelaEm: (ctx, revelacao) =>
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.resumo?.ruptura === true &&
        selvagem(jogadorDo(ctx, revelacao.dono)),
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (!selvagem(jogadorDo(ctx, alvo.dono))) return;
        if (jogadorDo(ctx, alvo.defensor).guarda !== 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('DP03'),
    {
      // "Revele quando uma Técnica em Forma Humana preparar diretamente uma
      // ação posterior. Depois disso, a primeira Técnica de cada turno em Forma
      // Humana que alterar valor numérico da ação seguinte aumenta esse valor
      // em 1."
      revelaEm: (ctx, revelacao) =>
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.alvo.perfil.tipo === 'tecnica' &&
        humano(jogadorDo(ctx, revelacao.dono)) &&
        lerPromessa(ctx, revelacao.dono, CHAVE.proximoAtaqueDano) > 0,
      aposResolver: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.tipo !== 'tecnica') return;
        if (!humano(jogadorDo(ctx, alvo.dono))) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.proximoAtaqueDano) === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueDano, 1);
      },
    },
  ],
  [
    id('DP04'),
    {
      // "Revele quando mudar de Forma Selvagem para Humana com 15 de Vida ou
      // menos. Restaure 2 Vida." O repeteco é somado por `transformar`.
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return (
          humano(dono) &&
          dono.vida <= 15 &&
          lerPromessa(ctx, revelacao.dono, CHAVE.mudouDeFormaNoTurno) > 0
        );
      },
      aoRevelar: (ctx, revelacao) => {
        restaurarVidaEm(ctx, revelacao.dono, 2, id('DP04'));
      },
    },
  ],
  [
    id('DP05'),
    {
      // "Revele quando o segundo Ataque do mesmo turno causar Dano à Vida.
      // Depois disso, o segundo Ataque de cada turno em Forma Selvagem recebe
      // +1 D."
      revelaEm: (ctx, revelacao) =>
        revelacao.alvo?.atacante === revelacao.dono &&
        (revelacao.resumo?.dano ?? 0) > 0 &&
        lerPromessa(ctx, revelacao.dono, CHAVE.ataquesResolvidos) >= 2,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (!selvagem(jogadorDo(ctx, alvo.dono))) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.ataquesResolvidos) !== 1) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('DP06'),
    {
      // "Revele quando uma Reação impedir Ruptura em Forma Humana. Depois
      // disso, na primeira vez em cada turno inimigo que isso ocorrer, restaure
      // 1 Guarda."
      revelaEm: (ctx, revelacao) => {
        const resumo = revelacao.resumo;
        if (revelacao.alvo?.defensor !== revelacao.dono || resumo === null) return false;
        if (!humano(jogadorDo(ctx, revelacao.dono))) return false;
        return resumo.houveReacao && resumo.teriaRompidoSemResposta && !resumo.ruptura;
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || !resumo.houveReacao) return;
        if (!humano(jogadorDo(ctx, alvo.dono))) return;
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        restaurarGuarda(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('DP07'),
    {
      // "Revele quando um Ataque causar pelo menos 3 I depois das reduções.
      // Depois disso, na primeira vez em cada turno que isso ocorrer, seu
      // próximo Ataque recebe +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.alvo?.atacante === revelacao.dono && (revelacao.resumo?.impacto ?? 0) >= 3,
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.atacante !== alvo.dono || resumo.impacto < 3) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.proximoAtaqueDano, 1);
      },
    },
  ],
  [
    id('DP08'),
    {
      // "Revele quando mudar de forma 2 vezes no mesmo turno." O bônus que ela
      // concede é somado pela Metamorfose Instintiva.
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.mudouDeFormaNoTurno) >= 2,
    },
  ],
  [
    id('DP09'),
    {
      // "Revele quando chegar a 10 de Vida ou menos em Forma Selvagem." O
      // ponto adicional é lido pela própria Defesa Inata.
      revelaEm: (ctx, revelacao) => {
        const dono = jogadorDo(ctx, revelacao.dono);
        return dono.vida <= 10 && selvagem(dono);
      },
    },
  ],
  [
    id('DP10'),
    {
      // "Revele quando terminar um turno tendo realizado pelo menos 1 Ação em
      // cada forma e ainda possuir Reserva."
      revelaEm: (ctx, revelacao) => {
        if (revelacao.gatilho !== 'fim-do-turno') return false;
        const dono = jogadorDo(ctx, revelacao.dono);
        return (
          dono.reserva > 0 &&
          lerPromessa(ctx, revelacao.dono, CHAVE.acaoEmFormaHumana) > 0 &&
          lerPromessa(ctx, revelacao.dono, CHAVE.acaoEmFormaSelvagem) > 0
        );
      },
      aoRevelar: (ctx, revelacao) => {
        restaurarVidaEm(ctx, revelacao.dono, 1, id('DP10'));
      },
    },
  ],
]);

/** "Sobrevivência Selvagem: a Defesa Inata Selvagem reduz 1 ponto adicional." */
export const defesaInataReforcada = (jogador: EstadoDeJogador): boolean =>
  passivaRevelada(jogador, id('DP09'));

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Formas e três Círculos                      */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('DC01'),
    {
      ativar: {
        // "Enquanto Selvagem e ao receber um Ataque, reduza +1 D e +1 I."
        legalidade: (consulta) =>
          selvagem(consulta.jogador) ? null : 'a Forma do Urso só age enquanto Selvagem',
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Durante uma Resposta enquanto Selvagem, reduza +4 D e +2 I. Depois,
        // volte para Forma Humana e não poderá mais entrar em Selvagem."
        legalidade: (consulta) =>
          selvagem(consulta.jogador) ? null : 'a Forma do Urso só age enquanto Selvagem',
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4, impacto: 2 });
          trancarSelvagem(ctx, alvo.dono, alvo.origem);
        },
      },
    },
  ],
  [
    id('DC02'),
    {
      ativar: {
        // "Quando declarar esse segundo Ataque, ele recebe +1 I."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null &&
          selvagem(consulta.jogador) &&
          valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.ataquesResolvidos) === 1
            ? null
            : 'a Forma do Lobo pede o segundo Ataque do turno enquanto Selvagem',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          // O efeito permanente da carta soma +1 D ao segundo Ataque Selvagem.
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
      exaurir: {
        // "Ao declarar seu segundo ou terceiro Ataque do turno, ele recebe
        // +3 D e +1 I. Depois, volte para Forma Humana e tranque a Selvagem."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null &&
          valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.ataquesResolvidos) >= 1
            ? null
            : 'a Forma do Lobo Exaurida pede o segundo ou o terceiro Ataque do turno',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 1 });
          trancarSelvagem(ctx, alvo.dono, alvo.origem);
        },
      },
    },
  ],
  [
    id('DC03'),
    {
      ativar: {
        // "Enquanto Selvagem, a primeira Técnica de cada turno pode mover uma
        // habilidade sua de CD2 para CD1 depois da resolução."
        legalidade: (consulta) =>
          consulta.perfil.tipo === 'tecnica' && selvagem(consulta.jogador)
            ? null
            : 'a Forma do Corvo pede uma Técnica enquanto Selvagem',
        aposResolver: (ctx, alvo) => {
          const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
          if (escolhida !== undefined) adiantar(ctx, alvo.dono, escolhida);
        },
      },
      exaurir: {
        // "Depois que uma Técnica resolver, devolva 1 habilidade sua de CD1
        // para a mão. Depois, volte para Forma Humana e tranque a Selvagem."
        legalidade: (consulta) =>
          consulta.perfil.tipo === 'tecnica' ? null : 'a Forma do Corvo Exaurida pede uma Técnica',
        aposResolver: (ctx, alvo) => {
          const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
          if (escolhida !== undefined) devolver(ctx, alvo.dono, escolhida);
          trancarSelvagem(ctx, alvo.dono, alvo.origem);
        },
      },
    },
  ],
  [
    id('DC04'),
    {
      // Os dois lados são lidos por `curar` e `restaurarGuarda`, que são por
      // onde toda restauração do Druida passa.
      ativar: {},
      exaurir: {},
    },
  ],
  [
    id('DC05'),
    {
      ativar: {
        // "Quando um Ataque possuir pelo menos 3 I antes das reduções, ele
        // recebe +1 D."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null && consulta.perfil.valores.impacto >= 3
            ? null
            : 'o Círculo da Tempestade pede um Ataque com 3 I ou mais',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
      },
      exaurir: {
        // "Ao declarar um Ataque, ele recebe +2 D e +2 I."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
        },
      },
    },
  ],
  [
    id('DC06'),
    {
      // Os dois lados são lidos por `transformar`, que é por onde toda
      // mudança de Forma passa.
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
    id('DU01'),
    {
      // "Se estiver em Forma Selvagem, recebe +2 D. Se mudou de Humana para
      // Selvagem neste turno, recebe também +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (!selvagem(jogadorDo(ctx, alvo.atacante))) return;
        const mudou = lerPromessa(ctx, alvo.atacante, CHAVE.mudouDeFormaNoTurno) > 0;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, {
          dano: 2,
          impacto: mudou ? 1 : 0,
        });
      },
    },
  ],
  [
    id('DU02'),
    {
      // "Antes da resolução, pode mudar de forma gratuitamente mesmo que já
      // tenha usado Metamorfose. Depois da transformação, se estiver Humano
      // recebe +2 I; se estiver Selvagem recebe +2 D."
      antesDeResolver: (ctx, alvo) => {
        const destino = formaPedida(ctx, alvo);
        if (destino !== undefined) {
          transformar(ctx, alvo.atacante, destino, false, alvo.origem);
        }
        const dono = jogadorDo(ctx, alvo.atacante);
        somarAoAtaque(
          ctx,
          alvo.atacante,
          alvo.indice,
          selvagem(dono) ? { dano: 2 } : { impacto: 2 },
        );
      },
    },
  ],
  [
    id('DU03'),
    {
      // "Restaure 4 Vida e 2 Guarda. Depois, pode mudar de forma. Se uma Carta
      // de Classe estiver Ativada, deixe-a Pronta."
      aposResolver: (ctx, alvo) => {
        curar(ctx, alvo.atacante, 4, alvo.origem);
        restaurarGuarda(ctx, alvo.atacante, 2);
        const destino = formaPedida(ctx, alvo);
        if (destino !== undefined) {
          transformar(ctx, alvo.atacante, destino, false, alvo.origem);
        }
        prontificarForma(ctx, alvo.atacante, alvo.origem);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

/** Registra em que Forma esta Ação aconteceu. */
export const registrarFormaDaAcao = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'druida') return;
  prometerAoProximoAtaque(
    ctx,
    alvo.atacante,
    alvo.perfil.carta,
    selvagem(dono) ? CHAVE.acaoEmFormaSelvagem : CHAVE.acaoEmFormaHumana,
    1,
  );
};

/** Bônus que o Druida guardou para um Ataque Selvagem ou para a transformação. */
export const bonusDoDruida = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'druida' || alvo.perfil.valores === null) return;

  if (selvagem(dono)) {
    const dano = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoAtaqueSelvagemDano);
    if (dano > 0) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano });

    // Efeito permanente da Forma do Urso e da Forma do Lobo.
    const urso = dono.cartasDeClasse.some((item) => item.carta === id('DC01'));
    const slot = slotDe(dono, alvo.indice);
    const impacto = alvo.perfil.valores.impacto + (slot?.modificadores.impacto ?? 0);
    if (
      urso &&
      impacto >= 2 &&
      consumirLimitePorTurno(ctx, alvo.atacante, chaveDaPassiva(id('DC01')), id('DC01'))
    ) {
      somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
    }
  }

  const daLua = consumirPromessa(ctx, alvo.atacante, CHAVE.circuloDaLuaAtaque);
  if (daLua > 0) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: daLua });
};

/** Reforços que o Druida guardou para a própria Resposta. */
export const reforcoDaResposta = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (defensor.recurso.classe !== 'druida' || alvo.reacao === null) return;

  if (consumirPromessa(ctx, alvo.defensor, CHAVE.cascaDeCarvalho) > 0) {
    reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
  }
  if (consumirPromessa(ctx, alvo.defensor, CHAVE.circuloDaLuaResposta) > 0) {
    reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1 });
  }
};

/**
 * "Equilíbrio Natural: sempre que repetir essa situação, restaure 1 Vida."
 *
 * A revelação já cura 1 no turno em que acontece; daí em diante a repetição
 * passa por aqui, depois da conversão de Reserva — que é quem define a Reserva
 * com que o turno de fato terminou.
 */
export const equilibrioNatural = (ctx: Contexto, jogador: PlayerId): void => {
  const dono = jogadorDo(ctx, jogador);
  if (dono.recurso.classe !== 'druida' || !passivaRevelada(dono, id('DP10'))) return;
  if (dono.reserva <= 0) return;
  if (lerPromessa(ctx, jogador, CHAVE.acaoEmFormaHumana) === 0) return;
  if (lerPromessa(ctx, jogador, CHAVE.acaoEmFormaSelvagem) === 0) return;
  restaurarVidaEm(ctx, jogador, 1, id('DP10'));
};

/** A Metamorfose gratuita do início do próprio turno. */
export const podeUsarMetamorfoseGratuita = (jogador: EstadoDeJogador): boolean =>
  jogador.recurso.classe === 'druida' &&
  !jogador.recurso.metamorfoseGratuitaUsadaNoTurno &&
  jogador.acoesRealizadasNoTurno === 0;
