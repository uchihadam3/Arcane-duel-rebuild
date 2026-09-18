import type { CardId, EstadoDeJogador, PassoDeKata, PlayerId } from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import {
  REGRAS_UNIVERSAIS,
  adiantarCartaNoCooldown,
  devolverCartaAMao,
} from '@arcane-duel/rules-engine';

import {
  ajustar,
  perderVidaDireta,
  reduzirNaResposta,
  restaurarGuardaEm,
  somarAoAtaque,
} from '../apoio.js';
import { CHAVE } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { consumirLimitePorTurno, emitir, gravarJogador, jogadorDo } from '../contexto.js';
import type {
  AlvoDoEfeito,
  ConsultaDeCusto,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import {
  chiProntas,
  kataDe,
  passoAnteriorDoKata,
  recuperarChi,
  registrarPassoDeKata,
} from '../recursos-classe.js';
import {
  chaveDaPassiva,
  consumirPromessa,
  escolhasDaAcao,
  escolhasDaResposta,
  exigirCartaEntre,
  exigirReforco,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Monge.
 *
 * O Chi são três pedras que viram de lado: gastar não destrói ficha nenhuma, e
 * recuperar não cria. A etapa de Kata é dado impresso — Abertura, Fluxo,
 * Finalização —, e a sequência é do turno.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** As três Posturas e os três Mantras. */
export const POSTURAS: readonly CardId[] = [id('MOC01'), id('MOC02'), id('MOC03')];
export const MANTRAS: readonly CardId[] = [id('MOC04'), id('MOC05'), id('MOC06')];

const POSTURA_DO_RIO = id('MOC03');
const MANTRA_DO_FOLEGO = id('MOC04');
const DISCIPLINA_PERFEITA = id('MOP01');

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

const cartaDeClasseEm = (
  jogador: EstadoDeJogador,
  carta: CardId,
  estado: 'pronta' | 'ativada',
): boolean => jogador.cartasDeClasse.some((item) => item.carta === carta && item.estado === estado);

/** A etapa que esta Ação conta como — já com a escolha da Postura do Rio. */
export const passoDaAcao = (
  perfil: { readonly kata?: PassoDeKata },
  escolhas: { readonly passoDeKata?: PassoDeKata },
): PassoDeKata | null => escolhas.passoDeKata ?? perfil.kata ?? null;

/** "Recupere N Chi Gasto", com o adicional do Mantra do Fôlego. */
const recuperar = (
  ctx: Contexto,
  jogador: PlayerId,
  quantidade: number,
  peloFluxoInterior = false,
): number => {
  let total = recuperarChi(ctx, jogador, quantidade);
  if (peloFluxoInterior && cartaDeClasseEm(jogadorDo(ctx, jogador), MANTRA_DO_FOLEGO, 'ativada')) {
    total += recuperarChi(ctx, jogador, 1);
  }
  return total;
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

/** Esta Ação vem imediatamente depois de uma Abertura? */
const depoisDeAbertura = (jogador: EstadoDeJogador): boolean =>
  passoAnteriorDoKata(jogador) === 'abertura';

/** Esta Ação vem imediatamente depois de um Fluxo? */
const depoisDeFluxo = (jogador: EstadoDeJogador): boolean =>
  passoAnteriorDoKata(jogador) === 'fluxo';

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('MO01'),
    {
      // "Se for sua primeira Ação, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 1) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('MO02'),
    {
      // "Se o adversário estiver com Guarda 6, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).guarda >= REGRAS_UNIVERSAIS.guardaInicial) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        }
      },
    },
  ],
  [
    id('MO03'),
    {
      // "Sua próxima Ação de Fluxo neste turno recebe +1 D."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoFluxoDano, 1);
      },
    },
  ],
  [
    id('MO04'),
    {
      // "Se vier imediatamente depois de Abertura, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (!depoisDeAbertura(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('MO05'),
    {
      // "Se vier imediatamente depois de Abertura, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (!depoisDeAbertura(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('MO06'),
    {
      // "Se o adversário usar uma carta de Reação, recupere 1 Chi Gasto."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveReacao) recuperar(ctx, alvo.atacante, 1);
      },
    },
  ],
  [
    id('MO07'),
    {
      // "Se vier imediatamente depois de Fluxo, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (!depoisDeFluxo(jogadorDo(ctx, alvo.atacante))) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('MO08'),
    {
      // "Se provocar Ruptura depois de Fluxo, recupere 1 Chi Gasto."
      aoDeclarar: (ctx, alvo) => {
        if (!depoisDeFluxo(jogadorDo(ctx, alvo.atacante))) return;
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximaFinalizacaoDano, 0);
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.ruptura) return;
        const passos = kataDe(jogadorDo(ctx, alvo.atacante));
        if (passos[passos.length - 2] !== 'fluxo') return;
        recuperar(ctx, alvo.atacante, 1);
      },
    },
  ],
  [
    id('MO09'),
    {
      // "Se completar um Kata neste turno, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        const dono = jogadorDo(ctx, alvo.atacante);
        const passos = kataDe(dono);
        const passo = passoDaAcao(alvo.perfil, escolhasDaAcao(ctx, alvo)) ?? 'finalizacao';
        const fecharia =
          passos.length >= 2 &&
          passos[passos.length - 2] === 'abertura' &&
          passos[passos.length - 1] === 'fluxo' &&
          passo === 'finalizacao';
        if (!fecharia && lerPromessa(ctx, alvo.atacante, CHAVE.kataCompletadoNoTurno) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('MO10'),
    {
      // "Se completar um Kata e provocar Ruptura, seu primeiro Ataque no
      // próximo turno recebe +1 D."
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.ruptura) return;
        if (lerPromessa(ctx, alvo.atacante, CHAVE.kataCompletadoNoTurno) === 0) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.primeiroAtaqueDoProximoTurnoDano,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('MO11'),
    {
      // "Recupere até 2 Chi Gastos."
      aposResolver: (ctx, alvo) => {
        recuperar(ctx, alvo.atacante, 2);
      },
    },
  ],
  [
    id('MO12'),
    {
      // "Se vier depois de Abertura, sua próxima Finalização neste turno custa
      // 1 AP a menos."
      aposResolver: (ctx, alvo) => {
        const passos = kataDe(jogadorDo(ctx, alvo.atacante));
        if (passos[passos.length - 2] !== 'abertura') return;
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.finalizacaoMaisBarata, 1);
      },
    },
  ],
  [
    id('MO13'),
    {
      // "Seu próximo Ataque de Fluxo neste turno recebe +2 I."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoFluxoImpacto, 2);
      },
    },
  ],
  [
    id('MO14'),
    {
      // "Sua próxima Finalização recebe +1 D e +1 I. Se completar Kata, a
      // Finalização entra em uma zona de cooldown mais próxima da mão."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximaFinalizacaoDano, 1);
        prometerAoProximoAtaque(
          ctx,
          alvo.atacante,
          alvo.origem,
          CHAVE.proximaFinalizacaoImpacto,
          1,
        );
      },
    },
  ],
  [
    id('MO15'),
    {
      // "Só depois de Fluxo. Se a Ação anterior ao Fluxo foi Abertura, complete
      // o Kata e devolva 1 habilidade sua de CD1 à mão."
      legalidade: (consulta) =>
        passoAnteriorDoKata(consulta.jogador) === 'fluxo' ? null : 'só depois de um Fluxo',
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          consulta.jogador.cooldown[1],
          id('MO15'),
          'escolha uma habilidade sua em CD1',
        ),
      aposResolver: (ctx, alvo) => {
        const passos = kataDe(jogadorDo(ctx, alvo.atacante));
        if (passos[passos.length - 3] !== 'abertura') return;
        const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
        if (escolhida !== undefined) devolver(ctx, alvo.atacante, escolhida);
      },
    },
  ],
  [
    id('MO16'),
    {
      // "Reduza 2 D e 2 I. Se impedir Ruptura, recupere 1 Chi Gasto."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        recuperar(ctx, alvo.defensor, 1);
      },
    },
  ],
  [
    id('MO17'),
    {
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
    },
  ],
  [
    id('MO18'),
    {
      // "Reduza 3 I. Se o Impacto final se tornar 0, seu próximo Ataque de
      // Abertura recebe +1 I."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.houveAtaque || resumo.impacto !== 0) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.defensor,
          alvo.origem,
          CHAVE.proximaAberturaImpacto,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('MO19'),
    {
      // "Reduza 2 D. Se o Dano final for 0, o adversário perde 2 Vida."
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
    id('MO20'),
    {
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 3 });
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('MOP01'),
    {
      // "Revele ao completar seu primeiro Kata. Depois disso, a primeira vez em
      // cada próprio turno que completar um Kata, recupere 1 Chi Gasto
      // adicional." O adicional é somado por `completarKata`.
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.kataCompletadoNoTurno) > 0,
    },
  ],
  [
    id('MOP02'),
    {
      // "Revele quando uma Abertura produzir pelo menos 3 pontos somados entre
      // Dano e Impacto depois das reduções. Depois disso, sua primeira Abertura
      // de cada turno recebe +1 I."
      revelaEm: (_ctx, revelacao) => {
        const alvo = revelacao.alvo;
        const resumo = revelacao.resumo;
        if (alvo?.atacante !== revelacao.dono || resumo === null) return false;
        return alvo.perfil.kata === 'abertura' && resumo.dano + resumo.impacto >= 3;
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (alvo.perfil.kata !== 'abertura') return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('MOP03'),
    {
      // "Revele quando uma Ação de Fluxo recuperar Chi pelo Fluxo Interior.
      // Depois disso, a primeira Ação de Fluxo de cada turno que vier depois de
      // Abertura recebe +1 D ou +1 I."
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.fluxoInteriorNoTurno) > 0,
      validarEscolhas: (consulta) =>
        consulta.perfil.kata === 'fluxo' &&
        consulta.perfil.valores !== null &&
        passoAnteriorDoKata(consulta.jogador) === 'abertura' &&
        valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('MOP03'))) === 0
          ? exigirReforco(consulta.escolhas, id('MOP03'), 'escolha +1 D ou +1 I')
          : null,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.kata !== 'fluxo') return;
        if (alvo.perfil.valores === null) return;
        if (!depoisDeAbertura(jogadorDo(ctx, alvo.dono))) return;
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
    id('MOP04'),
    {
      // "Revele quando uma Finalização provocar Ruptura. Depois disso, a
      // primeira Finalização de cada turno jogada depois de Fluxo recebe +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.alvo.perfil.kata === 'finalizacao' &&
        revelacao.resumo?.ruptura === true,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.kata !== 'finalizacao') return;
        if (alvo.perfil.valores === null) return;
        if (!depoisDeFluxo(jogadorDo(ctx, alvo.dono))) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('MOP05'),
    {
      // "Revele quando terminar um turno com 2 de Reserva. Depois disso, sua
      // primeira Reação de cada turno inimigo que custe Chi custa 1 Chi a
      // menos."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' && jogadorDo(ctx, revelacao.dono).reserva === 2,
      descontos: (consulta) => {
        if (consulta.acaoRespondida === null || consulta.perfil.tipo !== 'reacao') return {};
        if (consulta.recursoPrevisto <= 0) return {};
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('MOP05'))) > 0) return {};
        return { recurso: 1 };
      },
      aoResponder: (ctx, alvo) => {
        if (alvo.defensor !== alvo.dono || alvo.reacao === null) return;
        consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
      },
    },
  ],
  [
    id('MOP06'),
    {
      // "Revele quando perder 4 ou mais de Vida de um Ataque. Recupere até 2
      // Chi Gastos."
      revelaEm: (_ctx, revelacao) =>
        revelacao.alvo?.defensor === revelacao.dono && (revelacao.resumo?.dano ?? 0) >= 4,
      aoRevelar: (ctx, revelacao) => {
        recuperar(ctx, revelacao.dono, 2);
        consumirLimitePorTurno(ctx, revelacao.dono, chaveDaPassiva(id('MOP06')), id('MOP06'));
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || resumo.dano < 4) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        recuperar(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('MOP07'),
    {
      // "Revele quando começar um turno com as 3 pedras de Chi Gastas.
      // Recupere 2. Depois disso, sempre que começar um turno sem Chi Pronto,
      // recupere 1."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'inicio-do-turno' && chiProntas(jogadorDo(ctx, revelacao.dono)) === 0,
      aoRevelar: (ctx, revelacao) => {
        recuperar(ctx, revelacao.dono, 2);
      },
    },
  ],
  [
    id('MOP08'),
    {
      // "Revele quando Postura do Rio modificar uma sequência pela primeira
      // vez." A Ativação que ela concede usa a mesma escolha de etapa.
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.posturaDoRioUsada) > 0,
      ativacao: {
        podeAtivar: (ctx, alvo) =>
          alvo.dono === alvo.atacante &&
          chiProntas(jogadorDo(ctx, alvo.dono)) >= 1 &&
          lerPromessa(ctx, alvo.dono, chaveDaPassiva(alvo.origem)) === 0,
        aplicar: (ctx, alvo) => {
          consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
          // "gaste 1 Chi para considerar uma Ação que quebraria a sequência
          // como a etapa correta apenas para recuperar Chi do Fluxo Interior.
          // Isso não completa Kata sozinho."
          const atual = jogadorDo(ctx, alvo.dono);
          if (chiProntas(atual) === 0) return;
          gravarJogador(ctx, atual);
          recuperar(ctx, alvo.dono, 0, true);
          prometerAoProximoAtaque(ctx, alvo.dono, alvo.origem, CHAVE.fluxoInteriorNoTurno, 1);
        },
      },
    },
  ],
  [
    id('MOP09'),
    {
      // "Revele quando uma Reação impedir Ruptura e reduzir o Dano final a 0 ao
      // mesmo tempo. Depois disso, na primeira vez em cada turno inimigo que
      // isso ocorrer, recupere 1 Chi Gasto e restaure 1 Guarda."
      revelaEm: (_ctx, revelacao) => {
        const resumo = revelacao.resumo;
        if (revelacao.alvo?.defensor !== revelacao.dono || resumo === null) return false;
        return (
          resumo.houveReacao &&
          resumo.teriaRompidoSemResposta &&
          !resumo.ruptura &&
          resumo.dano === 0
        );
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono || !resumo.houveReacao) return;
        if (!resumo.teriaRompidoSemResposta || resumo.ruptura || resumo.dano !== 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        recuperar(ctx, alvo.dono, 1);
        restaurarGuardaEm(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('MOP10'),
    {
      // "Revele quando chegar a 10 de Vida ou menos. Recupere até 2 Chi Gastos.
      // Depois disso, sua primeira Finalização de cada turno custa 1 Chi a
      // menos."
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 10,
      aoRevelar: (ctx, revelacao) => {
        recuperar(ctx, revelacao.dono, 2);
      },
      descontos: (consulta) => {
        if (consulta.perfil.kata !== 'finalizacao' || consulta.recursoPrevisto <= 0) return {};
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('MOP10'))) > 0) return {};
        return { recurso: 1 };
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.kata !== 'finalizacao') return;
        consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Posturas e três Mantras                     */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('MOC01'),
    {
      ativar: {
        // "Quando uma Finalização for jogada imediatamente depois de Fluxo, se
        // for Ataque, recebe +1 D."
        legalidade: (consulta) =>
          consulta.perfil.kata === 'finalizacao' &&
          consulta.perfil.valores !== null &&
          passoAnteriorDoKata(consulta.jogador) === 'fluxo'
            ? null
            : 'a Postura do Tigre pede uma Finalização de Ataque logo depois de um Fluxo',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
      },
      exaurir: {
        // "Nas mesmas condições, o Ataque recebe +3 D e +1 I."
        legalidade: (consulta) =>
          consulta.perfil.kata === 'finalizacao' &&
          consulta.perfil.valores !== null &&
          passoAnteriorDoKata(consulta.jogador) === 'fluxo'
            ? null
            : 'a Postura do Tigre pede uma Finalização de Ataque logo depois de um Fluxo',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 1 });
        },
      },
    },
  ],
  [
    id('MOC02'),
    {
      ativar: {
        // "Quando uma Reação reduzir o Dano final a 0, recupere 1 Chi Gasto."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || !resumo.houveAtaque || resumo.dano !== 0) return;
          recuperar(ctx, alvo.dono, 1);
        },
      },
      exaurir: {
        // "Quando usar uma Reação, ela reduz +3 D e +2 I."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 2 });
        },
      },
    },
  ],
  [
    id('MOC03'),
    {
      ativar: {
        // "Quando uma Ação quebraria sua sequência, trate-a como a etapa
        // necessária naquele momento apenas para determinar a sequência do
        // Kata."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          prometerAoProximoAtaque(
            ctx,
            alvo.dono,
            alvo.origem,
            CHAVE.posturaDoRioUsada,
            1,
            'partida',
          );
        },
      },
      exaurir: {
        // "Antes de jogar uma Ação, escolha Abertura, Fluxo ou Finalização.
        // Aquela Ação conta como a etapa escolhida e, se for Ataque, recebe
        // +1 D e +1 I."
        validarEscolhas: (consulta) =>
          consulta.escolhas.passoDeKata === undefined
            ? {
                tipo: 'escolha-obrigatoria',
                carta: POSTURA_DO_RIO,
                detalhe: 'escolha Abertura, Fluxo ou Finalização',
              }
            : null,
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
    },
  ],
  [
    id('MOC04'),
    {
      // O lado Ativar é lido por `recuperar`, na hora em que o Fluxo Interior
      // devolve a pedra.
      ativar: {},
      exaurir: {
        // "Deixe as 3 pedras de Chi Prontas."
        aoDeclarar: (ctx, alvo) => {
          recuperar(ctx, alvo.dono, 3);
        },
      },
    },
  ],
  [
    id('MOC05'),
    {
      ativar: {
        // "Quando gastar Chi em uma Reação, ela reduz +1 D ou +1 I."
        legalidade: (consulta) =>
          consulta.perfil.tipo === 'reacao' && consulta.recursoPrevisto > 0
            ? null
            : 'o Mantra do Vazio pede uma Reação que gaste Chi',
        validarEscolhas: (consulta) =>
          exigirReforco(consulta.escolhas, id('MOC05'), 'escolha reduzir +1 D ou +1 I'),
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          const escolha = escolhasDaResposta(ctx, alvo).reforco;
          if (escolha === undefined) return;
          reduzirNaResposta(
            ctx,
            alvo.atacante,
            alvo.indice,
            escolha === 'impacto' ? { impacto: 1 } : { dano: 1 },
          );
        },
      },
      exaurir: {
        // "Quando usar uma Reação, ela reduz +2 D e +2 I."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
        },
      },
    },
  ],
  [
    id('MOC06'),
    {
      ativar: {
        // "Depois de completar um Kata, escolha 1 das 3 cartas usadas. Quando
        // entrar em cooldown, coloque-a uma etapa mais próxima da mão."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || resumo.zonaDeCooldown === null) return;
          if (lerPromessa(ctx, alvo.dono, CHAVE.kataCompletadoNoTurno) === 0) return;
          adiantar(ctx, alvo.dono, alvo.perfil.carta);
        },
      },
      exaurir: {
        // "Depois de completar um Kata, escolha 1 das cartas usadas e devolva-a
        // diretamente à mão em vez de colocá-la em cooldown."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || resumo.zonaDeCooldown === null) return;
          if (lerPromessa(ctx, alvo.dono, CHAVE.kataCompletadoNoTurno) === 0) return;
          devolver(ctx, alvo.dono, alvo.perfil.carta);
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
    id('MOU01'),
    {
      // "Se as 2 Ações imediatamente anteriores foram Abertura seguida de
      // Fluxo, recebe +3 D e +2 I."
      aoDeclarar: (ctx, alvo) => {
        const passos = kataDe(jogadorDo(ctx, alvo.atacante));
        if (passos[passos.length - 2] !== 'abertura' || passos[passos.length - 1] !== 'fluxo') {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 2 });
      },
    },
  ],
  [
    id('MOU02'),
    {
      // "O Dano e o Impacto finais do Ataque se tornam 0. Depois da resolução,
      // recupere 1 Chi Gasto."
      aoResponder: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0, impactoFinal: 0 });
      },
      aposResolver: (ctx, alvo) => {
        recuperar(ctx, alvo.defensor, 1);
      },
    },
  ],
  [
    id('MOU03'),
    {
      // "Durante o restante do turno, a primeira Ação de Fluxo e a primeira
      // Finalização custam 1 AP a menos."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.fluxoMaisBarato, 1);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.finalizacaoMaisBarata, 1);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

/** Bônus que o Monge guardou para a etapa desta Ação. */
export const aplicarBonusDeEtapa = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'monge' || alvo.perfil.valores === null) return;

  const passo = passoDaAcao(alvo.perfil, escolhasDaAcao(ctx, alvo));
  if (passo === 'fluxo') {
    const dano = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoFluxoDano);
    const impacto = consumirPromessa(ctx, alvo.atacante, CHAVE.proximoFluxoImpacto);
    if (dano !== 0 || impacto !== 0)
      somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano, impacto });
  }
  if (passo === 'finalizacao') {
    const dano = consumirPromessa(ctx, alvo.atacante, CHAVE.proximaFinalizacaoDano);
    const impacto = consumirPromessa(ctx, alvo.atacante, CHAVE.proximaFinalizacaoImpacto);
    if (dano !== 0 || impacto !== 0)
      somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano, impacto });
  }
  if (passo === 'abertura') {
    const impacto = consumirPromessa(ctx, alvo.atacante, CHAVE.proximaAberturaImpacto);
    if (impacto !== 0) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto });
  }
};

/**
 * Registra a etapa da Ação e resolve o Fluxo Interior e o Kata.
 *
 * "A primeira vez em cada turno que uma Ação de Fluxo vier imediatamente
 * depois de uma Abertura, recupere 1 Chi Gasto." e "quando completar Abertura,
 * Fluxo e Finalização nessa ordem, recupere 1 Chi Gasto adicional."
 */
export const registrarEtapaDoKata = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const dono = jogadorDo(ctx, alvo.atacante);
  if (dono.recurso.classe !== 'monge') return;

  const passo = passoDaAcao(alvo.perfil, escolhasDaAcao(ctx, alvo));
  if (passo === null) return;

  const vinhaDeAbertura = depoisDeAbertura(dono);
  const completou = registrarPassoDeKata(ctx, alvo.atacante, passo);

  if (
    passo === 'fluxo' &&
    vinhaDeAbertura &&
    consumirLimitePorTurno(ctx, alvo.atacante, CHAVE.fluxoInteriorNoTurno, alvo.perfil.carta)
  ) {
    recuperar(ctx, alvo.atacante, 1, true);
  }

  if (!completou) return;
  prometerAoProximoAtaque(ctx, alvo.atacante, alvo.perfil.carta, CHAVE.kataCompletadoNoTurno, 1);
  recuperar(ctx, alvo.atacante, 1);

  // "Disciplina Perfeita: a primeira vez em cada próprio turno que completar um
  // Kata, recupere 1 Chi Gasto adicional."
  if (
    passivaRevelada(jogadorDo(ctx, alvo.atacante), DISCIPLINA_PERFEITA) &&
    consumirLimitePorTurno(
      ctx,
      alvo.atacante,
      chaveDaPassiva(DISCIPLINA_PERFEITA),
      DISCIPLINA_PERFEITA,
    )
  ) {
    recuperar(ctx, alvo.atacante, 1);
  }
};

/** Descontos de AP que o Monge guarda por etapa. */
export const descontoDoMonge = (
  jogador: EstadoDeJogador,
  perfil: { readonly kata?: PassoDeKata },
  escolhas: { readonly passoDeKata?: PassoDeKata },
): boolean => {
  if (jogador.recurso.classe !== 'monge') return false;
  const passo = passoDaAcao(perfil, escolhas);
  if (passo === 'fluxo') return valorDaAnotacao(jogador.anotacoes, CHAVE.fluxoMaisBarato) > 0;
  if (passo === 'finalizacao') {
    return valorDaAnotacao(jogador.anotacoes, CHAVE.finalizacaoMaisBarata) > 0;
  }
  return false;
};

export const consumirDescontoDoMonge = (
  ctx: Contexto,
  jogador: PlayerId,
  perfil: { readonly kata?: PassoDeKata },
): void => {
  if (jogadorDo(ctx, jogador).recurso.classe !== 'monge') return;
  if (perfil.kata === 'fluxo') consumirPromessa(ctx, jogador, CHAVE.fluxoMaisBarato);
  if (perfil.kata === 'finalizacao') consumirPromessa(ctx, jogador, CHAVE.finalizacaoMaisBarata);
};

/**
 * "Disciplina do Passo: uma vez por próprio turno, quando um efeito adversário
 * aumentar o custo em AP de uma habilidade do Monge, gaste 1 Chi para ignorar
 * 1 ponto desse aumento."
 *
 * Só desconta quando há aumento e quando o Monge pede — e o pedido é o que
 * gasta a pedra.
 */
export const disciplinaDoPasso = (consulta: ConsultaDeCusto, aumento: number): number => {
  if (consulta.jogador.recurso.classe !== 'monge') return 0;
  if (aumento <= 0 || consulta.escolhas.disciplinaDoPasso !== true) return 0;
  if (chiProntas(consulta.jogador) < 1) return 0;
  if (valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.disciplinaDoPassoUsada) > 0) return 0;
  return 1;
};

export const cobrarDisciplinaDoPasso = (ctx: Contexto, jogador: PlayerId, usou: boolean): void => {
  if (!usou) return;
  consumirLimitePorTurno(ctx, jogador, CHAVE.disciplinaDoPassoUsada, id('MOP08'));
};

/** O Monge começou o turno sem nenhuma pedra Pronta? A Respiração responde. */
export const respiracaoProfundaNoInicioDoTurno = (ctx: Contexto, jogador: PlayerId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'monge') return;
  if (!passivaRevelada(atual, id('MOP07')) || chiProntas(atual) > 0) return;
  recuperar(ctx, jogador, 1);
};
