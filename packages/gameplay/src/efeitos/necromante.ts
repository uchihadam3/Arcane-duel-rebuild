import type { CardId, EstadoDeJogador, PlayerId } from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import {
  REGRAS_UNIVERSAIS,
  adiantarCartaNoCooldown,
  atrasarCartaNoCooldown,
  devolverCartaAMao,
  enviarDaMaoParaCooldown,
  resolverAtaque,
} from '@arcane-duel/rules-engine';

import {
  ajustar,
  aplicarCondicaoEm,
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
  registrarEscolhaPendente,
  slotDe,
} from '../contexto.js';
import type {
  AlvoDoEfeito,
  ConsultaDeCusto,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import { almasDe, colherAlma, gastarAlmas, liberarAlmaDoServo } from '../recursos-classe.js';
import {
  chaveDaPassiva,
  escolhasDaAcao,
  escolhasDaResposta,
  exigirCartaEntre,
  lerPromessa,
  prometerAoProximoAtaque,
} from './comum.js';

/*
 * O texto das cartas do Necromante.
 *
 * As quatro fichas de Alma são conservadas: gastar manda a ficha para o
 * Cemitério, colher a traz de volta, e anexar a põe sobre um Servo, onde ela
 * não está em nenhuma das duas pilhas. Nenhuma função deste arquivo cria ou
 * destrói ficha.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** Identificadores dos seis Servos, na ordem do catálogo. */
export const SERVOS: readonly CardId[] = [
  id('NC01'),
  id('NC02'),
  id('NC03'),
  id('NC04'),
  id('NC05'),
  id('NC06'),
];

export const ehServo = (carta: CardId): boolean => SERVOS.includes(carta);

const GHOUL_DEVORADOR = id('NC05');
const COLECIONADOR_DE_ALMAS = id('NP01');
const FOME_DA_CRIPTA = id('NP05');

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

export const servosProntos = (jogador: EstadoDeJogador): readonly CardId[] =>
  jogador.cartasDeClasse.filter((item) => item.estado === 'pronta').map((item) => item.carta);

export const servosAtivados = (jogador: EstadoDeJogador): readonly CardId[] =>
  jogador.cartasDeClasse.filter((item) => item.estado === 'ativada').map((item) => item.carta);

/* ------------------------------------------------------------------ */
/* Colher e curar, com tudo que soma                                   */
/* ------------------------------------------------------------------ */

/**
 * "Colha N Almas do Cemitério", com o que as Passivas e os Servos somam.
 *
 * Devolve quantas fichas realmente saíram do Cemitério — o Cemitério pode
 * estar vazio, e "colha até 2" com uma ficha lá dentro colhe uma.
 */
export const colher = (ctx: Contexto, jogador: PlayerId, quantidade: number): number => {
  if (quantidade <= 0) return 0;
  const antes = jogadorDo(ctx, jogador);
  const controladasAntes = almasDe(antes)?.controladas ?? 0;

  const colhidas = colherAlma(ctx, jogador, quantidade);
  if (colhidas === 0) return 0;

  // "Colecionador de Almas: a primeira vez em cada turno que colher uma Alma
  // estando com 1 ou menos controlada, colha 1 adicional se houver."
  let total = colhidas;
  if (
    passivaRevelada(antes, COLECIONADOR_DE_ALMAS) &&
    controladasAntes <= 1 &&
    consumirLimitePorTurno(
      ctx,
      jogador,
      chaveDaPassiva(COLECIONADOR_DE_ALMAS),
      COLECIONADOR_DE_ALMAS,
    )
  ) {
    total += colherAlma(ctx, jogador, 1);
  }

  // "Ghoul Devorador — Ativar: quando colher uma Alma, restaure 1 Vida.
  // Exaurir: restaure 3 Vida e colha 1 Alma adicional se houver."
  const ghoul = jogadorDo(ctx, jogador).cartasDeClasse.find(
    (item) => item.carta === GHOUL_DEVORADOR,
  );
  if (ghoul?.estado === 'ativada') {
    curar(ctx, jogador, 1, GHOUL_DEVORADOR);
  } else if (jogadorDo(ctx, jogador).removidas.includes(GHOUL_DEVORADOR)) {
    curar(ctx, jogador, 3, GHOUL_DEVORADOR);
    total += colherAlma(ctx, jogador, 1);
  }

  return total;
};

/**
 * "Restaure N Vida", por habilidade ou por Servo.
 *
 * A Fome da Cripta soma +1 à primeira restauração de cada próprio turno, e o
 * limite dela só é gasto quando a cura tem para onde ir.
 */
export const curar = (
  ctx: Contexto,
  jogador: PlayerId,
  quantidade: number,
  origem: CardId,
): number => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.vida >= REGRAS_UNIVERSAIS.vidaInicial) return 0;

  let total = quantidade;
  if (
    passivaRevelada(atual, FOME_DA_CRIPTA) &&
    consumirLimitePorTurno(ctx, jogador, chaveDaPassiva(FOME_DA_CRIPTA), FOME_DA_CRIPTA)
  ) {
    total += 1;
  }
  return restaurarVidaEm(ctx, jogador, total, origem);
};

/* ------------------------------------------------------------------ */
/* Movimentos de zona                                                  */
/* ------------------------------------------------------------------ */

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

/** "Mova para CD2": uma zona para longe da mão. É movimento voluntário. */
const atrasar = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const movimento = atrasarCartaNoCooldown(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(ctx, {
    tipo: 'carta-atrasada-no-cooldown',
    jogador,
    carta,
    de: movimento.valor.de,
    para: movimento.valor.para,
  });
};

const devolver = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const movimento = devolverCartaAMao(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(ctx, { tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de });
};

/** "Deixe Pronto um Servo Ativado." */
export const prontificarServo = (
  ctx: Contexto,
  jogador: PlayerId,
  carta: CardId,
  origem: CardId,
): boolean => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.cartasDeClasse.find((item) => item.carta === carta)?.estado !== 'ativada') return false;

  gravarJogador(ctx, {
    ...atual,
    cartasDeClasse: atual.cartasDeClasse.map((item) =>
      item.carta === carta ? { ...item, estado: 'pronta' as const } : item,
    ),
  });
  emitir(ctx, { tipo: 'carta-de-classe-prontificada-por-efeito', jogador, carta, origem });
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.servoProntificadoNoTurno,
    origem,
    escopo: 'turno',
    valor: 1,
  });
  return true;
};

/* ------------------------------------------------------------------ */
/* Previsão de Ataque letal                                            */
/* ------------------------------------------------------------------ */

/**
 * O Ataque em resolução reduziria a Vida do defensor a 0 ou menos?
 *
 * É calculado por previsão, com os valores que a Ação já acumulou. Resolver
 * duas vezes deixaria rastro em log e em contadores.
 */
export const ataqueSeriaLetal = (
  ctx: Contexto,
  atacante: PlayerId,
  defensor: PlayerId,
  indice: 0 | 1 | 2 | 3,
): boolean => {
  const slot = slotDe(jogadorDo(ctx, atacante), indice);
  const valores = slot?.perfil?.valores ?? null;
  if (slot === undefined || valores === null) return false;

  const previsao = resolverAtaque(jogadorDo(ctx, defensor), valores, slot.modificadores, {
    reducaoDaResposta: slot.reducaoDaResposta,
    bonusAposReducao: slot.bonusAposReducao,
    impedirRuptura: slot.impedirRuptura,
    bonusDeRupturaSubstituto: slot.bonusDeRupturaSubstituto,
    danoFinalDefinido: slot.danoFinalDefinido,
    impactoFinalDefinido: slot.impactoFinalDefinido,
  });
  return previsao.vidaDepois <= 0;
};

/** "Sua Vida fica em 1." Nem cura nem Dano: um valor posto. */
const fixarVidaEmUm = (ctx: Contexto, jogador: PlayerId, origem: CardId): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.vida === 1) return;
  gravarJogador(ctx, { ...atual, vida: 1 });
  emitir(ctx, {
    tipo: 'vida-restaurada',
    alvo: jogador,
    pedido: 1 - atual.vida,
    restaurado: 1 - atual.vida,
    vidaDepois: 1,
    origem,
  });
};

/* ------------------------------------------------------------------ */
/* Alma anexada: o "você pode devolvê-la" dos Servos                   */
/* ------------------------------------------------------------------ */

/**
 * O jogador pediu para devolver ao Cemitério a Alma anexada a este Servo?
 *
 * Todo lado Ativar de Servo imprime "você **pode**": sem a escolha explícita,
 * a Alma fica onde está.
 */
const gastouAlmaAnexada = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  servo: CardId,
  pediu: boolean,
): boolean => {
  if (!pediu) return false;
  return liberarAlmaDoServo(ctx, alvo.dono, servo);
};

const pediuAlmaAnexada = (ctx: Contexto, alvo: AlvoDoEfeito): boolean =>
  (alvo.dono === alvo.atacante ? escolhasDaAcao(ctx, alvo) : escolhasDaResposta(ctx, alvo))
    .usarAlmaAnexada === true;

/* ------------------------------------------------------------------ */
/* Ignorar redução (Espectro Faminto)                                  */
/* ------------------------------------------------------------------ */

/**
 * "Ignore N pontos de redução daquela Reação."
 *
 * A redução ignorada nunca passa da redução que existe: ignorar 3 pontos de
 * uma Reação que reduziu 1 ignora 1. Sem esse teto, "ignorar" viraria "somar
 * Dano", que é outra coisa.
 */
const ignorarReducao = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  pedido: { readonly dano: number; readonly impacto: number },
): void => {
  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  if (slot === undefined) return;
  const dano = Math.min(Math.max(pedido.dano, 0), slot.reducaoDaResposta.dano);
  const impacto = Math.min(Math.max(pedido.impacto, 0), slot.reducaoDaResposta.impacto);
  if (dano === 0 && impacto === 0) return;
  reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: -dano, impacto: -impacto });
};

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

const exigirAlmasColhidas = (
  consulta: ConsultaDeCusto,
  maximo: number,
  carta: CardId,
): ReturnType<typeof exigirCartaEntre> => {
  const pedido = consulta.escolhas.almasColhidas;
  if (pedido === undefined) {
    return {
      tipo: 'escolha-obrigatoria',
      carta,
      detalhe: `escolha colher de 0 a ${String(maximo)} Almas`,
    };
  }
  return pedido >= 0 && pedido <= maximo
    ? null
    : { tipo: 'escolha-invalida', carta, detalhe: `colha de 0 a ${String(maximo)} Almas` };
};

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  // N01 Flecha Óssea e N02 Lança de Ossos não têm texto além do custo: a Alma
  // gasta já volta ao Cemitério pela própria mecânica de pagamento.
  [id('N01'), {}],
  [id('N02'), {}],
  [
    id('N03'),
    {
      // "Se causar Dano à Vida, aplique Murchar 1."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) aplicarCondicaoEm(ctx, alvo.defensor, 'murchar', 1);
      },
    },
  ],
  [
    id('N04'),
    {
      // "Se causar Dano à Vida, restaure 1 Vida."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) curar(ctx, alvo.atacante, 1, alvo.origem);
      },
    },
  ],
  [
    id('N05'),
    {
      // "Se seus 2 Servos estiverem Prontos ao declarar, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (servosProntos(jogadorDo(ctx, alvo.atacante)).length >= 2) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        }
      },
    },
  ],
  [
    id('N06'),
    {
      // "Ao declarar, você pode remover 1 Murchar do adversário. Se fizer
      // isso, recebe +2 D." A remoção é opcional e vem como escolha.
      validarEscolhas: (consulta) => {
        const escolha = consulta.escolhas.condicao;
        if (escolha === undefined) return null;
        if (escolha !== 'murchar') {
          return {
            tipo: 'escolha-invalida',
            carta: id('N06'),
            detalhe: 'a Ceifa Funesta só remove Murchar',
          };
        }
        return consulta.adversario.condicoes.murchar > 0
          ? null
          : {
              tipo: 'escolha-invalida',
              carta: id('N06'),
              detalhe: 'o adversário não tem Murchar para remover',
            };
      },
      aoDeclarar: (ctx, alvo) => {
        if (escolhasDaAcao(ctx, alvo).condicao !== 'murchar') return;
        if (removerCondicaoEm(ctx, alvo.defensor, 'murchar', 1) === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('N07'),
    {
      // "Se o adversário estiver com 3 ou menos de Guarda, colha 1 Alma depois
      // da resolução." A Guarda olhada é a de quando o Ataque foi declarado.
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).guarda > 3) return;
        registrarAnotacao(ctx, alvo.atacante, {
          chave: CHAVE.guardaInimigaBaixaAoDeclarar,
          origem: alvo.origem,
          escopo: 'acao',
          valor: 1,
        });
      },
      aposResolver: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.guardaInimigaBaixaAoDeclarar) === 0) return;
        colher(ctx, alvo.atacante, 1);
      },
    },
  ],
  [
    id('N08'),
    {
      // "Se causar Dano à Vida, escolha uma habilidade adversária em CD1 e
      // mova para CD2."
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaAdversariaEmCooldown,
          consulta.adversario.cooldown[1],
          id('N08'),
          'escolha uma habilidade adversária em CD1',
        ),
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano <= 0) return;
        const escolhida = escolhasDaAcao(ctx, alvo).cartaAdversariaEmCooldown;
        if (escolhida === undefined) return;
        atrasar(ctx, alvo.defensor, escolhida);
      },
    },
  ],
  [
    id('N09'),
    {
      // "Se causar Ruptura, colha até 2 Almas do Cemitério."
      validarEscolhas: (consulta) => exigirAlmasColhidas(consulta, 2, id('N09')),
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.ruptura) return;
        colher(ctx, alvo.atacante, escolhasDaAcao(ctx, alvo).almasColhidas ?? 0);
      },
    },
  ],
  [
    id('N10'),
    {
      // "Escolha uma habilidade sua em CD1 e mova para CD2. Colha até 2 Almas."
      validarEscolhas: (consulta) => {
        const daCarta = exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          consulta.jogador.cooldown[1],
          id('N10'),
          'escolha uma habilidade sua em CD1',
        );
        return daCarta ?? exigirAlmasColhidas(consulta, 2, id('N10'));
      },
      aposResolver: (ctx, alvo) => {
        const escolhas = escolhasDaAcao(ctx, alvo);
        if (escolhas.cartaEmCooldown !== undefined) {
          atrasar(ctx, alvo.atacante, escolhas.cartaEmCooldown);
        }
        colher(ctx, alvo.atacante, escolhas.almasColhidas ?? 0);
      },
    },
  ],
  [
    id('N11'),
    {
      // "Escolha outra habilidade em sua mão e coloque-a em CD2. Colha até 3
      // Almas." "Outra" exclui a própria carta que está sendo jogada.
      validarEscolhas: (consulta) => {
        const opcoes = consulta.jogador.mao.filter((carta) => carta !== consulta.perfil.carta);
        const daCarta = exigirCartaEntre(
          consulta.escolhas.cartaDaMao,
          opcoes,
          id('N11'),
          'escolha outra habilidade da sua mão',
        );
        return daCarta ?? exigirAlmasColhidas(consulta, 3, id('N11'));
      },
      aposResolver: (ctx, alvo) => {
        const escolhas = escolhasDaAcao(ctx, alvo);
        const escolhida = escolhas.cartaDaMao;
        if (escolhida !== undefined) {
          const movimento = enviarDaMaoParaCooldown(jogadorDo(ctx, alvo.atacante), escolhida, 2);
          if (movimento.ok) {
            gravarJogador(ctx, movimento.valor);
            emitir(ctx, {
              tipo: 'carta-enviada-da-mao-para-cooldown',
              jogador: alvo.atacante,
              carta: escolhida,
              zona: 2,
            });
          }
        }
        colher(ctx, alvo.atacante, escolhas.almasColhidas ?? 0);
      },
    },
  ],
  [
    id('N12'),
    {
      // "Escolha uma carta sua em CD2 ou CD3 e mova uma etapa em direção à mão."
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          [...consulta.jogador.cooldown[2], ...consulta.jogador.cooldown[3]],
          id('N12'),
          'escolha uma carta sua em CD2 ou CD3',
        ),
      aposResolver: (ctx, alvo) => {
        const escolhida = escolhasDaAcao(ctx, alvo).cartaEmCooldown;
        if (escolhida !== undefined) adiantar(ctx, alvo.atacante, escolhida);
      },
    },
  ],
  [
    id('N13'),
    {
      // "Deixe Pronto um Servo Ativado."
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaDeClasse,
          servosAtivados(consulta.jogador),
          id('N13'),
          'escolha um Servo Ativado seu',
        ),
      aposResolver: (ctx, alvo) => {
        const escolhido = escolhasDaAcao(ctx, alvo).cartaDeClasse;
        if (escolhido !== undefined) prontificarServo(ctx, alvo.atacante, escolhido, alvo.origem);
      },
    },
  ],
  [
    id('N14'),
    {
      // "Aplique Murchar 1 ao adversário."
      aposResolver: (ctx, alvo) => {
        aplicarCondicaoEm(ctx, alvo.defensor, 'murchar', 1);
      },
    },
  ],
  [
    id('N15'),
    {
      // "Seu próximo Ataque neste turno recebe +2 I. Se provocar Ruptura,
      // deixe Pronto um Servo Ativado."
      aposResolver: (ctx, alvo) => {
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 2);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.ritoDeOssosArmado, 1);
      },
    },
  ],
  [
    id('N16'),
    {
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 3 });
      },
    },
  ],
  [
    id('N17'),
    {
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
    },
  ],
  [
    id('N18'),
    {
      // "Reduza 2 D e 2 I. Depois da resolução, devolva uma carta sua de CD1 à
      // mão."
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          consulta.jogador.cooldown[1],
          id('N18'),
          'escolha uma carta sua em CD1',
        ),
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
      },
      aposResolver: (ctx, alvo) => {
        const escolhida = escolhasDaResposta(ctx, alvo).cartaEmCooldown;
        if (escolhida !== undefined) devolver(ctx, alvo.defensor, escolhida);
      },
    },
  ],
  [
    id('N19'),
    {
      // "Só contra um Ataque que reduziria sua Vida a 0. A ação resolve e
      // depois sua Vida fica em 1."
      legalidade: (consulta) => {
        const valores = consulta.acaoRespondida?.valores;
        if (valores === undefined || valores === null) return 'só responde a um Ataque';
        return consulta.jogador.vida - valores.dano <= 0
          ? null
          : 'só contra um Ataque que reduziria sua Vida a 0';
      },
      aposResolver: (ctx, alvo) => {
        fixarVidaEmUm(ctx, alvo.defensor, alvo.origem);
      },
    },
  ],
  [
    id('N20'),
    {
      // "Reduza 1 D e 1 I. Se ainda perder Vida, aplique Murchar 1."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) aplicarCondicaoEm(ctx, alvo.atacante, 'murchar', 1);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('NP01'),
    {
      // "Revele quando controlar as 4 Almas." O adicional que ela concede é
      // somado por `colher`.
      revelaEm: (ctx, revelacao) =>
        (almasDe(jogadorDo(ctx, revelacao.dono))?.controladas ?? 0) >= 4,
    },
  ],
  [
    id('NP02'),
    {
      // "Revele na primeira vez que aplicar Murchar. Depois disso, o primeiro
      // Ataque de cada turno contra um inimigo com Murchar recebe +1 I."
      revelaEm: (ctx, revelacao) =>
        ctx.eventos.some(
          (evento) =>
            evento.tipo === 'condicao-aplicada' &&
            evento.condicao === 'murchar' &&
            evento.alvo !== revelacao.dono,
        ),
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (jogadorDo(ctx, alvo.defensor).condicoes.murchar === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
      },
    },
  ],
  [
    id('NP03'),
    {
      // "Revele quando mover voluntariamente uma carta própria para uma zona de
      // cooldown mais distante da mão. Colha 1 Alma."
      revelaEm: (ctx, revelacao) =>
        ctx.eventos.some(
          (evento) =>
            (evento.tipo === 'carta-atrasada-no-cooldown' ||
              evento.tipo === 'carta-enviada-da-mao-para-cooldown') &&
            evento.jogador === revelacao.dono,
        ),
      aoRevelar: (ctx, revelacao) => {
        colher(ctx, revelacao.dono, 1);
        consumirLimitePorTurno(ctx, revelacao.dono, chaveDaPassiva(id('NP03')), id('NP03'));
      },
      aposResolver: (ctx, alvo) => {
        const moveu = ctx.eventos.some(
          (evento) =>
            (evento.tipo === 'carta-atrasada-no-cooldown' ||
              evento.tipo === 'carta-enviada-da-mao-para-cooldown') &&
            evento.jogador === alvo.dono,
        );
        if (!moveu) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        colher(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('NP04'),
    {
      // "Revele quando Ativar os 2 Servos dentro da mesma rodada completa.
      // Depois disso, a primeira vez em cada próprio turno que deixar um Servo
      // Pronto novamente, colha 1 Alma."
      revelaEm: (ctx, revelacao) => servosAtivados(jogadorDo(ctx, revelacao.dono)).length >= 2,
      aposResolver: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.dono, CHAVE.servoProntificadoNoTurno) === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        colher(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('NP05'),
    {
      // "Revele quando restaurar Vida por habilidade ou Servo." O +1 que ela
      // concede é somado por `curar`.
      revelaEm: (ctx, revelacao) =>
        ctx.eventos.some(
          (evento) => evento.tipo === 'vida-restaurada' && evento.alvo === revelacao.dono,
        ),
    },
  ],
  [
    id('NP06'),
    {
      // "Revele quando uma Reação impedir Ruptura. Colha 1 Alma."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.defensor === revelacao.dono &&
        revelacao.resumo?.houveReacao === true &&
        revelacao.resumo.teriaRompidoSemResposta &&
        !revelacao.resumo.ruptura,
      aoRevelar: (ctx, revelacao) => {
        colher(ctx, revelacao.dono, 1);
        consumirLimitePorTurno(ctx, revelacao.dono, chaveDaPassiva(id('NP06')), id('NP06'));
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.defensor !== alvo.dono) return;
        if (!resumo.houveReacao || !resumo.teriaRompidoSemResposta || resumo.ruptura) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        colher(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('NP07'),
    {
      // "Revele quando chegar a 5 de Vida ou menos. Colha até 2 Almas. Depois
      // disso, enquanto estiver com 5 ou menos, a primeira habilidade de cada
      // turno que gaste Almas custa 1 Alma a menos, mínimo 0."
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 5,
      aoRevelar: (ctx, revelacao) => {
        // A revelação não tem janela de comando: o "até 2" é tomado no máximo,
        // registrado em docs/AMBIGUIDADES.md.
        colher(ctx, revelacao.dono, 2);
      },
      descontos: (consulta) => {
        if (consulta.jogador.vida > 5) return {};
        if (consulta.recursoPrevisto <= 0) return {};
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('NP07'))) > 0) return {};
        return { recurso: 1 };
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || jogadorDo(ctx, alvo.dono).vida > 5) return;
        if ((alvo.perfil.custo.recurso?.quantidade ?? 0) <= 0) return;
        consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
      },
    },
  ],
  [
    id('NP08'),
    {
      // "Revele quando Exaurir seu primeiro Servo. Depois que o efeito
      // resolver, colha até 2 Almas. Quando Exaurir o segundo Servo, colha 1."
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).removidas.length >= 1,
      aoRevelar: (ctx, revelacao) => {
        colher(ctx, revelacao.dono, 2);
      },
      aposResolver: (ctx, alvo) => {
        const exauridos = jogadorDo(ctx, alvo.dono).removidas.length;
        if (exauridos < 2) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.servosExauridos) >= exauridos) return;
        prometerAoProximoAtaque(
          ctx,
          alvo.dono,
          alvo.origem,
          CHAVE.servosExauridos,
          exauridos - lerPromessa(ctx, alvo.dono, CHAVE.servosExauridos),
          'partida',
        );
        colher(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('NP09'),
    {
      // "Revele quando terminar um turno com 2 de Reserva. Depois disso, sua
      // primeira Reação de cada turno inimigo custa 1 Alma a menos, mínimo 0."
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' && jogadorDo(ctx, revelacao.dono).reserva === 2,
      descontos: (consulta) => {
        if (consulta.acaoRespondida === null || consulta.perfil.tipo !== 'reacao') return {};
        if (consulta.recursoPrevisto <= 0) return {};
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('NP09'))) > 0) return {};
        return { recurso: 1 };
      },
      aoResponder: (ctx, alvo) => {
        if (alvo.defensor !== alvo.dono || alvo.reacao === null) return;
        consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
      },
    },
  ],
  [
    id('NP10'),
    {
      // "Revele quando possuir cartas em pelo menos 2 zonas diferentes de
      // cooldown." O que ela faz depois acontece no avanço do início do turno.
      revelaEm: (ctx, revelacao) => {
        const cooldown = jogadorDo(ctx, revelacao.dono).cooldown;
        return (
          [cooldown[1], cooldown[2], cooldown[3]].filter((zona) => zona.length > 0).length >= 2
        );
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Cartas de Classe — os seis Servos                                   */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('NC01'),
    {
      ativar: {
        // "Quando usar uma Reação, ela reduz +1 I. Se houver uma Alma anexada,
        // você pode devolvê-la ao Cemitério para reduzir também +1 D e +1 I."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
          if (gastouAlmaAnexada(ctx, alvo, id('NC01'), pediuAlmaAnexada(ctx, alvo))) {
            reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
          }
        },
      },
      exaurir: {
        // "Quando responder a um Ataque, o Impacto final daquela ação se torna 0."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          ajustar(ctx, alvo.atacante, alvo.indice, { impactoFinal: 0 });
        },
      },
    },
  ],
  [
    id('NC02'),
    {
      ativar: {
        // "Depois que um Ataque seu causar Dano à Vida, o adversário perde 1
        // Vida. Se houver Alma anexada, você pode devolvê-la para +1."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || resumo.dano <= 0) return;
          const extra = gastouAlmaAnexada(ctx, alvo, id('NC02'), pediuAlmaAnexada(ctx, alvo))
            ? 1
            : 0;
          perderVidaDireta(ctx, alvo.defensor, 1 + extra, alvo.origem);
        },
      },
      exaurir: {
        // "Depois que um Ataque seu causar Dano à Vida, o adversário perde 3."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || resumo.dano <= 0) return;
          perderVidaDireta(ctx, alvo.defensor, 3, alvo.origem);
        },
      },
    },
  ],
  [
    id('NC03'),
    {
      ativar: {
        // "Quando o adversário usar uma carta de Reação contra seu Ataque,
        // ignore 1 ponto de redução de Dano ou Impacto daquela Reação. Se
        // houver Alma anexada, você pode devolvê-la para ignorar 1 adicional."
        validarEscolhas: (consulta) =>
          consulta.escolhas.reforco === undefined
            ? {
                tipo: 'escolha-obrigatoria',
                carta: id('NC03'),
                detalhe: 'escolha ignorar redução de Dano ou de Impacto',
              }
            : null,
        antesDeResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.reacao === null) return;
          const escolha = escolhasDaAcao(ctx, alvo).reforco;
          const extra = gastouAlmaAnexada(ctx, alvo, id('NC03'), pediuAlmaAnexada(ctx, alvo))
            ? 1
            : 0;
          const pontos = 1 + extra;
          ignorarReducao(
            ctx,
            alvo,
            escolha === 'impacto' ? { dano: 0, impacto: pontos } : { dano: pontos, impacto: 0 },
          );
        },
      },
      exaurir: {
        // "Quando o adversário declarar uma Reação, ignore até 3 pontos de
        // redução produzidos por ela, divididos entre Dano e Impacto."
        validarEscolhas: (consulta) => {
          const divisao = consulta.escolhas.divisao;
          if (divisao === undefined) {
            return {
              tipo: 'escolha-obrigatoria',
              carta: id('NC03'),
              detalhe: 'divida até 3 pontos entre Dano e Impacto',
            };
          }
          const soma = divisao.dano + divisao.impacto;
          return divisao.dano >= 0 && divisao.impacto >= 0 && soma <= 3
            ? null
            : {
                tipo: 'escolha-invalida',
                carta: id('NC03'),
                detalhe: 'a divisão precisa somar no máximo 3 pontos não negativos',
              };
        },
        antesDeResolver: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.reacao === null) return;
          const divisao = escolhasDaAcao(ctx, alvo).divisao;
          if (divisao === undefined) return;
          ignorarReducao(ctx, alvo, divisao);
        },
      },
    },
  ],
  [
    id('NC04'),
    {
      ativar: {
        // "Quando jogar uma habilidade que custe Almas, reduza o custo em 1
        // Alma, mínimo 0. Se houver Alma anexada, você pode devolvê-la para
        // reduzir mais 1."
        legalidade: (consulta) =>
          (consulta.perfil.custo.recurso?.quantidade ?? 0) > 0
            ? null
            : 'o Mago Ósseo só Ativa com uma habilidade que custe Almas',
        descontos: (consulta) => ({
          recurso: consulta.escolhas.usarAlmaAnexada === true ? 2 : 1,
        }),
        aoDeclarar: (ctx, alvo) => {
          // A Alma anexada volta ao Cemitério agora, depois de o desconto já
          // ter sido aplicado ao custo pago.
          gastouAlmaAnexada(ctx, alvo, id('NC04'), pediuAlmaAnexada(ctx, alvo));
        },
      },
      exaurir: {
        // "Reduza o custo em Almas de uma habilidade em até 3. Se for um
        // Ataque, ele recebe +1 D e +1 I."
        validarEscolhas: (consulta) => {
          const pedido = consulta.escolhas.descontoDeRecurso;
          if (pedido === undefined) {
            return {
              tipo: 'escolha-obrigatoria',
              carta: id('NC04'),
              detalhe: 'escolha reduzir de 0 a 3 Almas do custo',
            };
          }
          return pedido >= 0 && pedido <= 3
            ? null
            : {
                tipo: 'escolha-invalida',
                carta: id('NC04'),
                detalhe: 'a redução vai de 0 a 3 Almas',
              };
        },
        descontos: (consulta) => ({ recurso: consulta.escolhas.descontoDeRecurso ?? 0 }),
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1, impacto: 1 });
        },
      },
    },
  ],
  [
    id('NC05'),
    {
      // Os dois lados agem em cima de `colher`, que é por onde toda colheita
      // do Necromante passa.
      ativar: {},
      exaurir: {},
    },
  ],
  [
    id('NC06'),
    {
      ativar: {
        // "Quando declarar um Ataque de 3 AP, ele recebe +1 D e +1 I. Se
        // houver Alma anexada, você pode devolvê-la para +1 D adicional."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null && consulta.perfil.custo.valor === 3
            ? null
            : 'a Abominação Costurada só Ativa com um Ataque de 3 AP',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          const extra = gastouAlmaAnexada(ctx, alvo, id('NC06'), pediuAlmaAnexada(ctx, alvo))
            ? 1
            : 0;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 + extra, impacto: 1 });
        },
      },
      exaurir: {
        // "Quando declarar qualquer Ataque, ele recebe +3 D e +2 I."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 3, impacto: 2 });
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
    id('NU01'),
    {
      // "Ao declarar, você pode remover todo o Murchar do adversário. Para cada
      // ponto removido, recebe +1 D e +1 I."
      validarEscolhas: (consulta) => {
        const escolha = consulta.escolhas.condicao;
        if (escolha === undefined || escolha === 'murchar') return null;
        return {
          tipo: 'escolha-invalida',
          carta: id('NU01'),
          detalhe: 'o Ceifador só remove Murchar',
        };
      },
      aoDeclarar: (ctx, alvo) => {
        if (escolhasDaAcao(ctx, alvo).condicao !== 'murchar') return;
        const pontos = removerCondicaoEm(ctx, alvo.defensor, 'murchar', 99);
        if (pontos === 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: pontos, impacto: pontos });
      },
    },
  ],
  [
    id('NU02'),
    {
      // "Exaura 1 Servo Pronto e resolva seu efeito de Exaurir. Depois, devolva
      // até 2 habilidades suas em cooldown para a mão. Cada uma custa +1 AP se
      // for usada neste turno."
      validarEscolhas: (consulta) => {
        const doServo = exigirCartaEntre(
          consulta.escolhas.cartaDeClasse,
          servosProntos(consulta.jogador),
          id('NU02'),
          'escolha um Servo Pronto seu para Exaurir',
        );
        if (doServo !== null) return doServo;

        const escolhidas = consulta.escolhas.cartasEmCooldown;
        if (escolhidas === undefined) {
          return {
            tipo: 'escolha-obrigatoria',
            carta: id('NU02'),
            detalhe: 'escolha até duas cartas suas em cooldown, ou mande uma lista vazia',
          };
        }
        const emCooldown = [
          ...consulta.jogador.cooldown[1],
          ...consulta.jogador.cooldown[2],
          ...consulta.jogador.cooldown[3],
        ];
        return escolhidas.length <= 2 &&
          new Set(escolhidas).size === escolhidas.length &&
          escolhidas.every((carta) => emCooldown.includes(carta))
          ? null
          : {
              tipo: 'escolha-invalida',
              carta: id('NU02'),
              detalhe: 'escolha até duas cartas suas distintas, todas em cooldown',
            };
      },
      antesDeResolver: (ctx, alvo) => {
        for (const carta of escolhasDaAcao(ctx, alvo).cartasEmCooldown ?? []) {
          devolver(ctx, alvo.atacante, carta);
          prometerAoProximoAtaque(
            ctx,
            alvo.atacante,
            alvo.origem,
            `${CHAVE.ritoEncarece}:${carta}`,
            1,
          );
        }
      },
    },
  ],
  [
    id('NU03'),
    {
      // "Só contra um Ataque que derrotaria você. Depois de toda a resolução,
      // sua Vida fica em 1. Em seguida, mova uma carta sua de qualquer zona de
      // cooldown uma etapa em direção à mão."
      legalidade: (consulta) => {
        const valores = consulta.acaoRespondida?.valores;
        if (valores === undefined || valores === null) return 'só responde a um Ataque';
        return consulta.jogador.vida - valores.dano <= 0
          ? null
          : 'só contra um Ataque que derrotaria você';
      },
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          [
            ...consulta.jogador.cooldown[1],
            ...consulta.jogador.cooldown[2],
            ...consulta.jogador.cooldown[3],
          ],
          id('NU03'),
          'escolha uma carta sua em alguma zona de cooldown',
        ),
      aposResolver: (ctx, alvo) => {
        fixarVidaEmUm(ctx, alvo.defensor, alvo.origem);
        const escolhida = escolhasDaResposta(ctx, alvo).cartaEmCooldown;
        if (escolhida !== undefined) adiantar(ctx, alvo.defensor, escolhida);
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

/**
 * "A primeira vez em cada próprio turno que um Ataque do Necromante causar
 * Dano à Vida, colha 1 Alma do Cemitério, se houver."
 */
export const colheitaDoProprioTurno = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  causouDano: boolean,
): void => {
  if (jogadorDo(ctx, alvo.atacante).recurso.classe !== 'necromante' || !causouDano) return;
  if (!consumirLimitePorTurno(ctx, alvo.atacante, CHAVE.almaColhidaNoProprioTurno, id('N01'))) {
    return;
  }
  colher(ctx, alvo.atacante, 1);
};

/**
 * "A primeira vez em cada turno inimigo que o Necromante perder Vida por
 * Ataque ou Condição, colha 1 Alma do Cemitério, se houver."
 */
export const colheitaDoTurnoInimigo = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  perdeuVida: boolean,
): void => {
  if (jogadorDo(ctx, alvo.defensor).recurso.classe !== 'necromante' || !perdeuVida) return;
  if (!consumirLimitePorTurno(ctx, alvo.defensor, CHAVE.almaColhidaNoTurnoInimigo, id('N01'))) {
    return;
  }
  colher(ctx, alvo.defensor, 1);
};

/**
 * "Rito de Ossos: se provocar Ruptura, deixe Pronto um Servo Ativado."
 *
 * O Ataque beneficiado resolve fora da janela de comando do Necromante, então
 * a escolha de qual Servo fica pendente quando há mais de um Ativado.
 */
export const ritoDeOssosNaRuptura = (ctx: Contexto, alvo: AlvoDoEfeito, ruptura: boolean): void => {
  if (!ruptura) return;
  if (lerPromessa(ctx, alvo.atacante, CHAVE.ritoDeOssosArmado) === 0) return;

  const ativados = servosAtivados(jogadorDo(ctx, alvo.atacante));
  const unico = ativados[0];
  if (ativados.length === 1 && unico !== undefined) {
    prontificarServo(ctx, alvo.atacante, unico, id('N15'));
    return;
  }
  if (ativados.length > 1) {
    registrarEscolhaPendente(ctx, {
      jogador: alvo.atacante,
      origem: id('N15'),
      efeito: 'prontificar-carta-de-classe',
      opcoes: ativados,
    });
  }
};

/**
 * "Eco do Cemitério: uma vez por próprio turno, quando uma carta voltar
 * normalmente de CD1 para sua mão, colha 1 Alma."
 */
export const ecoDoCemiterioNoInicioDoTurno = (
  ctx: Contexto,
  jogador: PlayerId,
  voltaram: number,
): void => {
  const atual = jogadorDo(ctx, jogador);
  if (atual.recurso.classe !== 'necromante' || voltaram === 0) return;
  if (!passivaRevelada(atual, id('NP10'))) return;
  if (!consumirLimitePorTurno(ctx, jogador, chaveDaPassiva(id('NP10')), id('NP10'))) return;
  colher(ctx, jogador, 1);
};

/** "Ossos Guardiões" e os textos que devolvem Alma: atalho para os testes. */
export const devolverAlmaAoCemiterio = (ctx: Contexto, jogador: PlayerId): number =>
  gastarAlmas(ctx, jogador, 1);
