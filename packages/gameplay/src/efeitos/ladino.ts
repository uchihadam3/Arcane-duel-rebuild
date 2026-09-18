import type { CardId, EstadoDeJogador, PlayerId } from '@arcane-duel/shared-types';
import { cardId, valorDaAnotacao } from '@arcane-duel/shared-types';
import { atrasarCartaNoCooldown, devolverCartaAMao } from '@arcane-duel/rules-engine';

import {
  ajustar,
  aplicarCondicaoEm,
  perderVidaDireta,
  recuperarAp,
  reduzirNaResposta,
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
  ConsultaDeCusto,
  EfeitoDeCarta,
  EfeitoDeCartaDeClasse,
  EfeitoDePassiva,
} from '../ganchos.js';
import { MAXIMO_DE_BRECHAS, brechasDe, criarBrechas } from '../recursos-classe.js';
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
 * O texto das cartas do Ladino.
 *
 * A Brecha é moeda e é consumida de vez: diferente da Alma, ela não volta para
 * lugar nenhum. Ela fica sobre o adversário, mas pertence ao Ladino, e some
 * inteira no fim do turno dele. Brecha não é Condição, e nenhuma carta a trata
 * como tal.
 */

const id = (codigo: string): CardId => cardId(codigo);

/** Os três Métodos e as três Ferramentas. */
export const METODOS: readonly CardId[] = [id('LC01'), id('LC02'), id('LC03')];
export const FERRAMENTAS: readonly CardId[] = [id('LC04'), id('LC05'), id('LC06')];

const PLANO_DE_FUGA = id('LP10');
const SANGUE_FRIO = id('LP05');
const METODO_DO_SABOTADOR = id('LC03');

const passivaRevelada = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.passivas.some((passiva) => passiva.carta === carta && passiva.estado !== 'oculta');

const temCartaDeClasse = (jogador: EstadoDeJogador, carta: CardId): boolean =>
  jogador.cartasDeClasse.some((item) => item.carta === carta) || jogador.removidas.includes(carta);

/**
 * "Crie N Brechas", com o adicional do Plano de Fuga quando ele se aplica.
 *
 * Devolve quantas fichas entraram de fato: o teto de três é do documento, e
 * criar além dele não cria nada.
 */
export const criarBrecha = (
  ctx: Contexto,
  jogador: PlayerId,
  quantidade: number,
  naResposta = false,
): number => {
  let total = quantidade;
  if (
    naResposta &&
    passivaRevelada(jogadorDo(ctx, jogador), PLANO_DE_FUGA) &&
    consumirLimitePorTurno(ctx, jogador, chaveDaPassiva(PLANO_DE_FUGA), PLANO_DE_FUGA)
  ) {
    total += 1;
  }
  return criarBrechas(ctx, jogador, total);
};

const atrasar = (ctx: Contexto, jogador: PlayerId, carta: CardId): boolean => {
  const movimento = atrasarCartaNoCooldown(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok || movimento.valor.de === movimento.valor.para) return false;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(ctx, {
    tipo: 'carta-atrasada-no-cooldown',
    jogador,
    carta,
    de: movimento.valor.de,
    para: movimento.valor.para,
  });
  return true;
};

const devolver = (ctx: Contexto, jogador: PlayerId, carta: CardId): void => {
  const movimento = devolverCartaAMao(jogadorDo(ctx, jogador), carta);
  if (!movimento.ok) return;
  gravarJogador(ctx, movimento.valor.jogador);
  emitir(ctx, { tipo: 'carta-devolvida-a-mao', jogador, carta, de: movimento.valor.de });
  registrarAnotacao(ctx, jogador, {
    chave: CHAVE.cartaVoltouCedo,
    origem: carta,
    escopo: 'turno',
    valor: 1,
  });
};

/** "Quando uma habilidade sua sabotar o adversário, crie 1 Brecha." */
const sabotou = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  if (!temCartaDeClasse(jogadorDo(ctx, alvo.atacante), METODO_DO_SABOTADOR)) return;
  const equipada = jogadorDo(ctx, alvo.atacante).cartasDeClasse.find(
    (item) => item.carta === METODO_DO_SABOTADOR,
  );
  if (equipada?.estado !== 'ativada') return;
  criarBrecha(ctx, alvo.atacante, 1);
};

/** O Ataque respondido derrubaria a Vida de quem responde a zero? */
const seriaLetal = (consulta: ConsultaDeCusto): boolean => {
  const valores = consulta.acaoRespondida?.valores;
  if (valores === undefined || valores === null) return false;
  return consulta.jogador.vida - valores.dano <= 0;
};

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

export const HABILIDADES: ReadonlyMap<CardId, EfeitoDeCarta> = new Map<CardId, EfeitoDeCarta>([
  [
    id('L01'),
    {
      // "Se for sua primeira Ação, recebe +1 D."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 1) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('L02'),
    {
      // "Se o adversário usar uma carta de Reação, recupere 1 AP. Se não usar e
      // este Ataque causar Dano à Vida, crie 1 Brecha."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveReacao) {
          recuperarAp(ctx, alvo.atacante, 1);
          return;
        }
        if (resumo.dano > 0) criarBrecha(ctx, alvo.atacante, 1);
      },
    },
  ],
  [
    id('L03'),
    {
      // "Se causar Dano à Vida, aplique Sangramento 1."
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) aplicarCondicaoEm(ctx, alvo.defensor, 'sangramento', 1);
      },
    },
  ],
  [
    id('L04'),
    {
      // "Se for sua segunda Ação, recebe +1 D. Se causar Dano à Vida, aplique
      // Sangramento 1."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 2) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano > 0) aplicarCondicaoEm(ctx, alvo.defensor, 'sangramento', 1);
      },
    },
  ],
  [
    id('L05'),
    {
      // "Se for sua primeira Ação e o adversário não usar carta de Reação,
      // recebe +2 D." O bônus só pode ser somado depois de a Resposta ser
      // conhecida, então ele entra na janela de antes de resolver.
      antesDeResolver: (ctx, alvo) => {
        if (alvo.ordem !== 1 || alvo.reacao !== null) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('L06'),
    {
      // "Só pode ser usada contra Guarda 0."
      legalidade: (consulta) =>
        consulta.adversario.guarda === 0 ? null : 'só pode ser usada contra Guarda 0',
    },
  ],
  [
    id('L07'),
    {
      // "Se o adversário já tiver Sangramento, recebe +1 I."
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).condicoes.sangramento > 0) {
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        }
      },
    },
  ],
  [
    id('L08'),
    {
      // "Ao declarar, consuma até 3 Brechas. Recebe +1 D por Brecha consumida."
      // A quantidade é parcela variável do custo: o motor já a cobrou, e o que
      // sobra aqui é ler quanto foi.
      aoDeclarar: (ctx, alvo) => {
        const gasto = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice)?.recursoGasto ?? 0;
        if (gasto > 0) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: gasto });
      },
    },
  ],
  [
    id('L09'),
    {
      // "Se causar Dano à Vida, escolha uma carta de Reação adversária em CD1 e
      // mova para CD2."
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaAdversariaEmCooldown,
          consulta.adversario.cooldown[1],
          id('L09'),
          'escolha uma carta adversária em CD1',
        ),
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.dano <= 0) return;
        const escolhida = escolhasDaAcao(ctx, alvo).cartaAdversariaEmCooldown;
        if (escolhida === undefined) return;
        if (atrasar(ctx, alvo.defensor, escolhida)) sabotou(ctx, alvo);
      },
    },
  ],
  [
    id('L10'),
    {
      // "Se for sua terceira Ação, recebe +2 D."
      aoDeclarar: (ctx, alvo) => {
        if (alvo.ordem === 3) somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('L11'),
    {
      // "Crie 1 Brecha. Seu próximo Ataque neste turno recebe +1 I."
      aposResolver: (ctx, alvo) => {
        criarBrecha(ctx, alvo.atacante, 1);
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.proximoAtaqueImpacto, 1);
      },
    },
  ],
  [
    id('L12'),
    {
      // "Coloque uma Marca de Golpe sobre o adversário. Só pode existir 1."
      aposResolver: (ctx, alvo) => {
        if (lerPromessa(ctx, alvo.atacante, CHAVE.marcaDeGolpe) > 0) return;
        prometerAoProximoAtaque(ctx, alvo.atacante, alvo.origem, CHAVE.marcaDeGolpe, 1, 'partida');
      },
    },
  ],
  [
    id('L13'),
    {
      // "Escolha: mova uma habilidade adversária de CD1 para CD2; ou escolha
      // uma Carta de Classe inimiga Pronta e deixe-a Ativada sem resolver seu
      // efeito." Uma das duas, nunca as duas nem nenhuma.
      validarEscolhas: (consulta) => {
        const carta = consulta.escolhas.cartaAdversariaEmCooldown;
        const classe = consulta.escolhas.cartaDeClasse;
        if ((carta === undefined) === (classe === undefined)) {
          return {
            tipo: carta === undefined ? 'escolha-obrigatoria' : 'escolha-invalida',
            carta: id('L13'),
            detalhe: 'escolha exatamente um dos dois efeitos da Sabotagem',
          };
        }
        if (carta !== undefined) {
          return exigirCartaEntre(
            carta,
            consulta.adversario.cooldown[1],
            id('L13'),
            'escolha uma habilidade adversária em CD1',
          );
        }
        const prontas = consulta.adversario.cartasDeClasse
          .filter((item) => item.estado === 'pronta')
          .map((item) => item.carta);
        return exigirCartaEntre(
          classe,
          prontas,
          id('L13'),
          'escolha uma Carta de Classe inimiga Pronta',
        );
      },
      aposResolver: (ctx, alvo) => {
        const escolhas = escolhasDaAcao(ctx, alvo);
        if (escolhas.cartaAdversariaEmCooldown !== undefined) {
          if (atrasar(ctx, alvo.defensor, escolhas.cartaAdversariaEmCooldown)) sabotou(ctx, alvo);
          return;
        }
        const escolhida = escolhas.cartaDeClasse;
        if (escolhida === undefined) return;
        const inimigo = jogadorDo(ctx, alvo.defensor);
        if (inimigo.cartasDeClasse.find((item) => item.carta === escolhida)?.estado !== 'pronta') {
          return;
        }
        gravarJogador(ctx, {
          ...inimigo,
          cartasDeClasse: inimigo.cartasDeClasse.map((item) =>
            item.carta === escolhida ? { ...item, estado: 'ativada' as const } : item,
          ),
        });
        emitir(ctx, {
          tipo: 'carta-de-classe-ativada',
          jogador: alvo.defensor,
          carta: escolhida,
        });
        sabotou(ctx, alvo);
      },
    },
  ],
  [
    id('L14'),
    {
      // "Seu próximo Ataque neste turno recebe +2 D se o adversário usar uma
      // carta de Reação. Se não usar, crie 1 Brecha depois da resolução."
      aposResolver: (ctx, alvo) => {
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
          CHAVE.brechaSeNaoHouverReacao,
          1,
          'turno',
        );
      },
    },
  ],
  [
    id('L15'),
    {
      // "Reduza 3 D. Se o Dano final for 0, crie 1 Brecha."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveAtaque && resumo.dano === 0) criarBrecha(ctx, alvo.defensor, 1, true);
      },
    },
  ],
  [
    id('L16'),
    {
      // "Reduza 2 D e 1 I. Se o Dano final for 0, o adversário perde 1 Vida e
      // crie 1 Brecha se ainda houver espaço."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 1 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (!resumo.houveAtaque || resumo.dano !== 0) return;
        perderVidaDireta(ctx, alvo.atacante, 1, alvo.origem);
        if ((brechasDe(jogadorDo(ctx, alvo.defensor)) ?? 0) < MAXIMO_DE_BRECHAS) {
          criarBrecha(ctx, alvo.defensor, 1, true);
        }
      },
    },
  ],
  [
    id('L17'),
    {
      // "Reduza 2 D e 3 I. Efeitos de Cartas de Classe inimigas não podem
      // aumentar esta ação depois que Bomba de Fumaça resolver."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 3 });
        registrarAnotacao(ctx, alvo.atacante, {
          chave: CHAVE.bombaDeFumaca,
          origem: alvo.origem,
          escopo: 'acao',
          valor: 1,
        });
      },
    },
  ],
  [
    id('L18'),
    {
      // "Reduza 4 D. Depois da resolução, devolva uma habilidade sua de CD1 à
      // mão."
      validarEscolhas: (consulta) =>
        exigirCartaEntre(
          consulta.escolhas.cartaEmCooldown,
          consulta.jogador.cooldown[1],
          id('L18'),
          'escolha uma habilidade sua em CD1',
        ),
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 4 });
      },
      aposResolver: (ctx, alvo) => {
        const escolhida = escolhasDaResposta(ctx, alvo).cartaEmCooldown;
        if (escolhida !== undefined) devolver(ctx, alvo.defensor, escolhida);
      },
    },
  ],
  [
    id('L19'),
    {
      // "Reduza 2 D. Se o Dano final for 0, aplique Sangramento 1."
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (resumo.houveAtaque && resumo.dano === 0) {
          aplicarCondicaoEm(ctx, alvo.atacante, 'sangramento', 1);
        }
      },
    },
  ],
  [
    id('L20'),
    {
      // "Só contra um Ataque que reduziria sua Vida a 0. Reduza 5 D."
      legalidade: (consulta) =>
        seriaLetal(consulta) ? null : 'só contra um Ataque que reduziria sua Vida a 0',
      aoResponder: (ctx, alvo) => {
        reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 5 });
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Passivas                                                            */
/* ------------------------------------------------------------------ */

export const PASSIVAS: ReadonlyMap<CardId, EfeitoDePassiva> = new Map<CardId, EfeitoDePassiva>([
  [
    id('LP01'),
    {
      // "Revele quando causar o primeiro Dano à Vida da partida. Crie 1 Brecha.
      // Depois disso, o primeiro Ataque de cada turno que atingir Vida sem
      // receber Reação recebe +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.atacante === revelacao.dono &&
        (revelacao.resumo?.dano ?? 0) > 0,
      aoRevelar: (ctx, revelacao) => {
        criarBrecha(ctx, revelacao.dono, 1);
      },
      antesDeResolver: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (alvo.reacao !== null) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('LP02'),
    {
      // "Revele quando o adversário terminar um turno sem causar Dano à sua
      // Vida. No início do seu próximo turno, seu primeiro Ataque custa 1 AP a
      // menos, mínimo 1."
      revelaEm: (ctx, revelacao) =>
        lerPromessa(ctx, revelacao.dono, CHAVE.adversarioNaoCausouDano) > 0,
      aoRevelar: (ctx, revelacao) => {
        prometerAoProximoAtaque(
          ctx,
          revelacao.dono,
          id('LP02'),
          CHAVE.primeiroAtaqueMaisBarato,
          1,
          'partida',
        );
      },
    },
  ],
  [
    id('LP03'),
    {
      // "Revele quando o adversário sofrer sua primeira Ruptura. Depois disso,
      // o primeiro Ataque de cada turno contra Guarda 0 recebe +1 D."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.resumo?.ruptura === true,
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
    id('LP04'),
    {
      // "Revele quando realizar 3 Ações pela primeira vez. Depois disso, quando
      // sua terceira Ação custar originalmente 1 AP e for Ataque, ela recebe
      // +1 D ou +1 I."
      revelaEm: (_ctx, revelacao) =>
        revelacao.gatilho === 'apos-resolver' &&
        revelacao.alvo?.atacante === revelacao.dono &&
        revelacao.alvo.ordem === 3,
      validarEscolhas: (consulta) =>
        consulta.ordem === 3 &&
        consulta.perfil.valores !== null &&
        consulta.perfil.custo.valor === 1
          ? exigirReforco(consulta.escolhas, id('LP04'), 'escolha +1 D ou +1 I')
          : null,
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.ordem !== 3) return;
        if (alvo.perfil.valores === null || alvo.perfil.custo.valor !== 1) return;
        const escolha = escolhasDaAcao(ctx, alvo).reforco;
        if (escolha === undefined) return;
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
    id('LP05'),
    {
      // "Revele quando chegar a 10 de Vida ou menos. Crie 2 Brechas. Depois
      // disso, enquanto permanecer nessa faixa, sua primeira habilidade de cada
      // turno que consuma Brecha consome 1 a menos, mínimo 0."
      revelaEm: (ctx, revelacao) => jogadorDo(ctx, revelacao.dono).vida <= 10,
      aoRevelar: (ctx, revelacao) => {
        criarBrecha(ctx, revelacao.dono, 2);
      },
      descontos: (consulta) => {
        if (consulta.jogador.vida > 10 || consulta.recursoPrevisto <= 0) return {};
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(SANGUE_FRIO)) > 0) return {};
        return { recurso: 1 };
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || jogadorDo(ctx, alvo.dono).vida > 10) return;
        if ((alvo.perfil.custo.recurso?.quantidade ?? 0) <= 0) return;
        consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
      },
    },
  ],
  [
    id('LP06'),
    {
      // "Revele quando o adversário usar sua segunda carta de Reação na mesma
      // rodada. Depois disso, a primeira vez em cada turno que o adversário
      // usar uma carta de Reação contra seu Ataque, crie 1 Brecha depois da
      // resolução."
      revelaEm: (ctx, revelacao) => {
        const alvo = revelacao.alvo;
        if (alvo?.atacante !== revelacao.dono) return false;
        return lerPromessa(ctx, alvo.defensor, CHAVE.reacoesUsadas) >= 2;
      },
      aposResolver: (ctx, alvo, resumo) => {
        if (alvo.atacante !== alvo.dono || !resumo.houveReacao) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        criarBrecha(ctx, alvo.dono, 1);
      },
    },
  ],
  [
    id('LP07'),
    {
      // "Revele quando o adversário alcançar Sangramento 2. Depois disso, seu
      // primeiro Ataque de cada turno contra alguém com Sangramento recebe
      // +1 D."
      revelaEm: (ctx, revelacao) => {
        const alvo = revelacao.alvo;
        if (alvo === null) return false;
        const inimigo = alvo.atacante === revelacao.dono ? alvo.defensor : alvo.atacante;
        return jogadorDo(ctx, inimigo).condicoes.sangramento >= 2;
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        if (jogadorDo(ctx, alvo.defensor).condicoes.sangramento === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('LP08'),
    {
      // "Revele quando uma habilidade sua voltar da recarga para a mão antes do
      // momento normal. Depois disso, a primeira habilidade que retornar dessa
      // forma em cada turno custa 1 AP a menos se usada no mesmo turno."
      revelaEm: (ctx, revelacao) => lerPromessa(ctx, revelacao.dono, CHAVE.cartaVoltouCedo) > 0,
      descontos: (consulta) => {
        if (valorDaAnotacao(consulta.jogador.anotacoes, CHAVE.cartaVoltouCedo) === 0) return {};
        if (valorDaAnotacao(consulta.jogador.anotacoes, chaveDaPassiva(id('LP08'))) > 0) return {};
        return { ap: 1, apMinimo: 1 };
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono) return;
        if (lerPromessa(ctx, alvo.dono, CHAVE.cartaVoltouCedo) === 0) return;
        consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem);
      },
    },
  ],
  [
    id('LP09'),
    {
      // "Revele quando o adversário estiver com Guarda 0 e Sangramento ao mesmo
      // tempo. Depois disso, o primeiro Ataque de cada turno nessa situação
      // recebe +1 D."
      revelaEm: (ctx, revelacao) => {
        const alvo = revelacao.alvo;
        if (alvo === null) return false;
        const inimigo = jogadorDo(
          ctx,
          alvo.atacante === revelacao.dono ? alvo.defensor : alvo.atacante,
        );
        return inimigo.guarda === 0 && inimigo.condicoes.sangramento > 0;
      },
      aoDeclarar: (ctx, alvo) => {
        if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
        const inimigo = jogadorDo(ctx, alvo.defensor);
        if (inimigo.guarda !== 0 || inimigo.condicoes.sangramento === 0) return;
        if (!consumirLimitePorTurno(ctx, alvo.dono, chaveDaPassiva(alvo.origem), alvo.origem)) {
          return;
        }
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
      },
    },
  ],
  [
    id('LP10'),
    {
      // "Revele quando terminar um turno com 2 de Reserva." O adicional que ela
      // concede é somado por `criarBrecha`.
      revelaEm: (ctx, revelacao) =>
        revelacao.gatilho === 'fim-do-turno' && jogadorDo(ctx, revelacao.dono).reserva === 2,
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Cartas de Classe — três Métodos e três Ferramentas                  */
/* ------------------------------------------------------------------ */

export const CARTAS_DE_CLASSE: ReadonlyMap<CardId, EfeitoDeCartaDeClasse> = new Map<
  CardId,
  EfeitoDeCartaDeClasse
>([
  [
    id('LC01'),
    {
      ativar: {
        // "Ao atacar um adversário com Guarda 0, o Ataque recebe +1 D."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null && consulta.adversario.guarda === 0
            ? null
            : 'o Método do Assassino pede um Ataque contra Guarda 0',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
      },
      exaurir: {
        // "Um Ataque contra Guarda 0 recebe +4 D."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null && consulta.adversario.guarda === 0
            ? null
            : 'o Método do Assassino pede um Ataque contra Guarda 0',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 4 });
        },
      },
    },
  ],
  [
    id('LC02'),
    {
      ativar: {
        // "Quando uma Reação sua reduzir Dano a 0, crie 1 Brecha."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || !resumo.houveAtaque || resumo.dano !== 0) return;
          criarBrecha(ctx, alvo.dono, 1, true);
        },
      },
      exaurir: {
        // "Quando responder a um Ataque, reduza +3 D. Se o Dano final for 0, o
        // adversário perde 3 Vida e crie 1 Brecha."
        aoResponder: (ctx, alvo) => {
          if (alvo.defensor !== alvo.dono) return;
          reduzirNaResposta(ctx, alvo.atacante, alvo.indice, { dano: 3 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.defensor !== alvo.dono || !resumo.houveAtaque || resumo.dano !== 0) return;
          perderVidaDireta(ctx, alvo.atacante, 3, alvo.origem);
          criarBrecha(ctx, alvo.dono, 1, true);
        },
      },
    },
  ],
  [
    id('LC03'),
    {
      // O lado Ativar é lido por `sabotou`, na hora em que a sabotagem
      // acontece de fato.
      ativar: {},
      exaurir: {
        // "Escolha até 2 habilidades adversárias atualmente em cooldown e mova
        // cada uma 1 etapa para mais longe da mão."
        validarEscolhas: (consulta) => {
          const escolhidas = consulta.escolhas.cartasEmCooldown;
          if (escolhidas === undefined) {
            return {
              tipo: 'escolha-obrigatoria',
              carta: id('LC03'),
              detalhe: 'escolha até duas habilidades adversárias em cooldown',
            };
          }
          const inimigas = [
            ...consulta.adversario.cooldown[1],
            ...consulta.adversario.cooldown[2],
            ...consulta.adversario.cooldown[3],
          ];
          return escolhidas.length <= 2 &&
            new Set(escolhidas).size === escolhidas.length &&
            escolhidas.every((carta) => inimigas.includes(carta))
            ? null
            : {
                tipo: 'escolha-invalida',
                carta: id('LC03'),
                detalhe: 'escolha até duas cartas distintas, todas em cooldown do adversário',
              };
        },
        aposResolver: (ctx, alvo) => {
          for (const carta of escolhasDaAcao(ctx, alvo).cartasEmCooldown ?? []) {
            atrasar(ctx, alvo.defensor, carta);
          }
        },
      },
    },
  ],
  [
    id('LC04'),
    {
      ativar: {
        // "Quando um Ataque causar Dano à Vida, aplique Sangramento 1."
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || resumo.dano <= 0) return;
          aplicarCondicaoEm(ctx, alvo.defensor, 'sangramento', 1);
        },
      },
      exaurir: {
        // "O Ataque recebe +1 D e, se causar Dano à Vida, aplique Sangramento 2."
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono || alvo.perfil.valores === null) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 1 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || resumo.dano <= 0) return;
          aplicarCondicaoEm(ctx, alvo.defensor, 'sangramento', 2);
        },
      },
    },
  ],
  [
    id('LC05'),
    {
      ativar: {
        // "Quando usar uma Reação, ela reduz +1 D ou +1 I."
        validarEscolhas: (consulta) =>
          exigirReforco(consulta.escolhas, id('LC05'), 'escolha reduzir +1 D ou +1 I'),
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
    id('LC06'),
    {
      ativar: {
        // "Quando sua segunda ou terceira Ação for um Ataque, ele recebe +1 I."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null && consulta.ordem >= 2
            ? null
            : 'o Fio Oculto pede um Ataque na segunda ou na terceira Ação',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { impacto: 1 });
        },
      },
      exaurir: {
        // "Aquele Ataque recebe +2 D e +2 I. Se causar Ruptura, crie 2 Brechas."
        legalidade: (consulta) =>
          consulta.perfil.valores !== null ? null : 'o Fio Oculto Exaurido pede um Ataque',
        aoDeclarar: (ctx, alvo) => {
          if (alvo.atacante !== alvo.dono) return;
          somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2, impacto: 2 });
        },
        aposResolver: (ctx, alvo, resumo) => {
          if (alvo.atacante !== alvo.dono || !resumo.ruptura) return;
          criarBrecha(ctx, alvo.dono, 2);
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
    id('LU01'),
    {
      // "Se o adversário estiver com Guarda 0, recebe +2 D. Exige ao menos 2
      // Brechas para ser declarado." O mínimo é a parcela variável do custo.
      aoDeclarar: (ctx, alvo) => {
        if (jogadorDo(ctx, alvo.defensor).guarda !== 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
      },
    },
  ],
  [
    id('LU02'),
    {
      // "Depois da resolução, recebe +2 D por Ação anterior realizada neste
      // turno, até +4 D." O bônus entra antes de a conta acontecer, que é onde
      // um "+2 D" ainda é Dano.
      antesDeResolver: (ctx, alvo) => {
        const anteriores = Math.min(alvo.ordem - 1, 2);
        if (anteriores <= 0) return;
        somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 * anteriores });
      },
    },
  ],
  [
    id('LU03'),
    {
      // "O Dano final se torna 0. Depois da resolução, devolva imediatamente
      // até 2 habilidades suas de CD1 para a mão."
      validarEscolhas: (consulta) => {
        const escolhidas = consulta.escolhas.cartasEmCooldown;
        if (escolhidas === undefined) {
          return {
            tipo: 'escolha-obrigatoria',
            carta: id('LU03'),
            detalhe: 'escolha até duas cartas suas de CD1, ou mande uma lista vazia',
          };
        }
        return escolhidas.length <= 2 &&
          new Set(escolhidas).size === escolhidas.length &&
          escolhidas.every((carta) => consulta.jogador.cooldown[1].includes(carta))
          ? null
          : {
              tipo: 'escolha-invalida',
              carta: id('LU03'),
              detalhe: 'escolha até duas cartas suas distintas, todas em CD1',
            };
      },
      aoResponder: (ctx, alvo) => {
        ajustar(ctx, alvo.atacante, alvo.indice, { danoFinal: 0 });
      },
      aposResolver: (ctx, alvo) => {
        for (const carta of escolhasDaResposta(ctx, alvo).cartasEmCooldown ?? []) {
          devolver(ctx, alvo.defensor, carta);
        }
      },
    },
  ],
]);

/* ------------------------------------------------------------------ */
/* Mecânica de classe                                                  */
/* ------------------------------------------------------------------ */

/** "Marca de Golpe: a próxima vez que um Ataque causar Dano à Vida, +2 D." */
export const marcaDeGolpeAntesDeResolver = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  if (jogadorDo(ctx, alvo.atacante).recurso.classe !== 'ladino') return;
  if (alvo.perfil.valores === null) return;
  if (consumirPromessa(ctx, alvo.atacante, CHAVE.marcaDeGolpe) === 0) return;
  somarAoAtaque(ctx, alvo.atacante, alvo.indice, { dano: 2 });
};

/** "Se o adversário não usar Reação, crie 1 Brecha depois da resolução." */
export const brechaDoPassoFalso = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  houveReacao: boolean,
): void => {
  if (jogadorDo(ctx, alvo.atacante).recurso.classe !== 'ladino') return;
  if (consumirPromessa(ctx, alvo.atacante, CHAVE.brechaSeNaoHouverReacao) === 0) return;
  if (houveReacao) return;
  criarBrecha(ctx, alvo.atacante, 1);
};

/** Bomba de Fumaça trancou as Cartas de Classe inimigas nesta Ação? */
export const acaoTrancadaPelaFumaca = (jogador: EstadoDeJogador): boolean =>
  valorDaAnotacao(jogador.anotacoes, CHAVE.bombaDeFumaca) > 0;

/** "Passos Invisíveis": o adversário fechou o turno sem tocar na Vida do dono. */
export const marcarTurnoSemDano = (ctx: Contexto, jogador: PlayerId): void => {
  const inimigo = ctx.partida.jogadores.find((item) => item.id !== jogador);
  if (inimigo?.recurso.classe !== 'ladino') return;
  if (lerPromessa(ctx, jogador, CHAVE.causouDanoNoTurno) > 0) return;
  prometerAoProximoAtaque(ctx, inimigo.id, id('LP02'), CHAVE.adversarioNaoCausouDano, 1, 'partida');
};

/** Desconto do primeiro Ataque guardado por Passos Invisíveis. */
export const descontoDoPrimeiroAtaque = (jogador: EstadoDeJogador, ordem: number): boolean =>
  ordem === 1 && valorDaAnotacao(jogador.anotacoes, CHAVE.primeiroAtaqueMaisBarato) > 0;

export const consumirDescontoDoPrimeiroAtaque = (
  ctx: Contexto,
  jogador: PlayerId,
  ordem: number,
): void => {
  if (ordem !== 1) return;
  consumirPromessa(ctx, jogador, CHAVE.primeiroAtaqueMaisBarato);
};
