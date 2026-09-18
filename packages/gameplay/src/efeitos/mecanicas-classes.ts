import type { PlayerId } from '@arcane-duel/shared-types';
import { cardId } from '@arcane-duel/shared-types';

import { CHAVE, ORIGEM_DO_TURNO } from '../chaves.js';
import type { Contexto } from '../contexto.js';
import { consumirLimitePorTurno, jogadorDo, slotDe } from '../contexto.js';
import type { AlvoDoEfeito, ConsultaDeLegalidade, ResumoDaResolucao } from '../ganchos.js';
import {
  avancarDevocao,
  criarBrechas,
  limparBrechas,
  reiniciarKata,
  reiniciarMetamorfose,
  reiniciarNotas,
  reiniciarPrecoProibido,
  reiniciarReducaoVoluntaria,
} from '../recursos-classe.js';
import { lerPromessa, prometerAoProximoAtaque } from './comum.js';
import {
  aplicarDesafinar,
  consumirDescontoDoBardo,
  contarAtivacoesDoBardo,
  marcasDoBardoNoInicioDoTurno,
  registrarNotaDaAcao,
} from './bardo.js';
import {
  brechaDoPassoFalso,
  consumirDescontoDoPrimeiroAtaque,
  marcaDeGolpeAntesDeResolver,
  marcarTurnoSemDano,
} from './ladino.js';
import {
  consumirDescontoDaMarcha,
  travaDeTecnicaDoPaladino,
  cumprimentosAposResolver,
  fechoDoPaladino,
  marcasDoInicioDoTurno,
  registrarReacaoDoPaladino,
} from './paladino.js';
import {
  colheitaDoProprioTurno,
  colheitaDoTurnoInimigo,
  ecoDoCemiterioNoInicioDoTurno,
  ritoDeOssosNaRuptura,
} from './necromante.js';

/*
 * As mecânicas próprias das dez classes da etapa quatro.
 *
 * São gatilhos automáticos de classe — não são cartas e não estão no catálogo.
 * Cada um roda em um ponto fixo: ao abrir o turno, depois de cada Ação resolver
 * e ao fechar o turno. Uma classe sem regra em um desses pontos simplesmente
 * não aparece ali.
 */

const ORIGEM_DEVOCAO = cardId('sistema:devocao');

/* ------------------------------------------------------------------ */
/* Clérigo — avanços automáticos da Devoção                            */
/* ------------------------------------------------------------------ */

/**
 * "Na primeira vez em cada próprio turno em que restaurar Vida ou provocar
 * Ruptura, avance um estágio."
 *
 * A restauração é lida da marca que `restaurarVidaEm` deixa, e não do log: uma
 * cura que não entrou — porque a Vida já estava cheia — não é uma restauração.
 */
const devocaoNoProprioTurno = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  resumo: ResumoDaResolucao,
): void => {
  const atacante = jogadorDo(ctx, alvo.atacante);
  if (atacante.recurso.classe !== 'clerigo') return;

  const restaurou = lerPromessa(ctx, alvo.atacante, CHAVE.restaurouVidaNoTurno) > 0;
  if (!restaurou && !resumo.ruptura) return;

  if (
    !consumirLimitePorTurno(ctx, alvo.atacante, CHAVE.devocaoAvancouNoProprioTurno, ORIGEM_DEVOCAO)
  ) {
    return;
  }
  avancarDevocao(ctx, alvo.atacante);
};

/**
 * "Na primeira vez em cada turno adversário em que uma única Resposta reduzir
 * pelo menos 3 pontos somados entre Dano e Impacto, avance um estágio."
 *
 * "Uma única Resposta" é o que aquele espaço de Ação acumulou de redução: a
 * carta de Reação ou a Defesa Inata, mais o que as Cartas de Classe somaram
 * àquela mesma Resposta.
 */
const devocaoNoTurnoInimigo = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (defensor.recurso.classe !== 'clerigo') return;

  const slot = slotDe(jogadorDo(ctx, alvo.atacante), alvo.indice);
  if (slot === undefined) return;
  if (slot.resposta.voluntaria === null) return;

  const total = slot.reducaoDaResposta.dano + slot.reducaoDaResposta.impacto;
  if (total < 3) return;

  if (
    !consumirLimitePorTurno(ctx, alvo.defensor, CHAVE.devocaoAvancouNoTurnoInimigo, ORIGEM_DEVOCAO)
  ) {
    return;
  }
  avancarDevocao(ctx, alvo.defensor);
};

/* ------------------------------------------------------------------ */
/* Ladino — a Brecha que a Esquiva Calculada cria                      */
/* ------------------------------------------------------------------ */

/** "Esquiva Calculada: se o Dano final se tornar 0, crie 1 Brecha." */
const brechaDaEsquiva = (ctx: Contexto, alvo: AlvoDoEfeito, resumo: ResumoDaResolucao): void => {
  const defensor = jogadorDo(ctx, alvo.defensor);
  if (defensor.recurso.classe !== 'ladino') return;
  if (lerPromessa(ctx, alvo.defensor, CHAVE.defesaInataNestaAcao) === 0) return;
  if (!resumo.houveAtaque || resumo.dano !== 0) return;

  criarBrechas(ctx, alvo.defensor, 1);
};

/* ------------------------------------------------------------------ */

/** Tudo que as classes da etapa quatro fazem depois de uma Ação resolver. */
export const mecanicasDeClasseAposResolver = (
  ctx: Contexto,
  alvo: AlvoDoEfeito,
  resumo: ResumoDaResolucao,
): void => {
  devocaoNoProprioTurno(ctx, alvo, resumo);
  devocaoNoTurnoInimigo(ctx, alvo);
  brechaDaEsquiva(ctx, alvo, resumo);
  colheitaDoProprioTurno(ctx, alvo, resumo.dano > 0);
  colheitaDoTurnoInimigo(ctx, alvo, resumo.vidaPerdidaPeloDefensor > 0);
  ritoDeOssosNaRuptura(ctx, alvo, resumo.ruptura);
  cumprimentosAposResolver(ctx, alvo, resumo);
  brechaDoPassoFalso(ctx, alvo, resumo.houveReacao);
  contarAtivacoesDoBardo(ctx, alvo);
  if (resumo.houveReacao) registrarReacaoDoPaladino(ctx, alvo);
};

/**
 * O que as classes fazem no instante em que a Ação resolve, antes de o texto
 * pós-resolução rodar.
 *
 * A Nota do Bardo entra aqui: ela precisa já estar na sequência quando o texto
 * das cartas perguntar pela Cadência, e não pode ser afetada por uma
 * substituição que aquela mesma Ação acabou de criar.
 */
export const mecanicasDeClasseAoResolver = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  registrarNotaDaAcao(ctx, alvo);
};

/** O que as classes fazem logo antes de a Ação ser resolvida. */
export const mecanicasDeClasseAntesDeResolver = (ctx: Contexto, alvo: AlvoDoEfeito): void => {
  marcaDeGolpeAntesDeResolver(ctx, alvo);
  aplicarDesafinar(ctx, alvo);
};

/**
 * Recusas que não pertencem a nenhuma carta, e sim à classe de quem joga.
 *
 * Devolve o motivo da recusa, ou `null` quando a jogada pode seguir.
 */
export const legalidadeDeClasse = (consulta: ConsultaDeLegalidade): string | null =>
  travaDeTecnicaDoPaladino(consulta.jogador, consulta.perfil.tipo === 'tecnica');

/**
 * Descontos de classe que se gastam ao serem usados.
 *
 * Roda logo depois de o custo ser pago: o desconto guardado para "o próximo
 * Ataque" existe uma vez só, e quem o usou já o usou.
 */
export const mecanicasDeClasseAoDeclarar = (
  ctx: Contexto,
  jogador: PlayerId,
  perfil: { readonly custo: { readonly valor: number }; readonly valores: unknown },
  ordem: number,
): void => {
  consumirDescontoDaMarcha(ctx, jogador, perfil.valores !== null, perfil.custo.valor);
  consumirDescontoDoPrimeiroAtaque(ctx, jogador, ordem);
  consumirDescontoDoBardo(ctx, jogador, ordem);
};

/**
 * Tudo que as classes da etapa quatro reiniciam ao abrir o próprio turno.
 *
 * Cada função só age quando a classe é a dona daquele componente, então a
 * lista é percorrida inteira sem nenhum `if` de classe aqui.
 */
export const mecanicasDeClasseAoAbrirTurno = (
  ctx: Contexto,
  jogador: PlayerId,
  cartasQueVoltaram = 0,
  reservaAntes = 0,
): void => {
  // Necromante: "quando uma carta voltar normalmente de CD1 para sua mão,
  // colha 1 Alma." O avanço do cooldown acabou de acontecer.
  ecoDoCemiterioNoInicioDoTurno(ctx, jogador, cartasQueVoltaram);
  // "Se começou este turno com 2 de Reserva": a Reserva de antes da conversão
  // do início do turno. A marca é de todas as classes que perguntam por ela.
  if (reservaAntes === 2) {
    prometerAoProximoAtaque(ctx, jogador, ORIGEM_DO_TURNO, CHAVE.comecouTurnoComReserva2, 1);
  }
  marcasDoInicioDoTurno(ctx, jogador);
  marcasDoBardoNoInicioDoTurno(ctx, jogador);
  // Bardo: a sequência de Notas e as Cadências são do turno, e o turno é novo.
  reiniciarNotas(ctx, jogador);
  // Monge: o Kata recomeça — Abertura, Fluxo e Finalização valem dentro do turno.
  reiniciarKata(ctx, jogador);
  // Bárbaro: o teto de 2 pontos de redução voluntária é por turno.
  reiniciarReducaoVoluntaria(ctx, jogador);
  // Druida: a Metamorfose gratuita do começo do turno volta a estar disponível.
  reiniciarMetamorfose(ctx, jogador);
  // Bruxo: o Preço Proibido vale uma vez em cada próprio turno.
  reiniciarPrecoProibido(ctx, jogador);
};

/** Tudo que as classes da etapa quatro fazem ao fechar o próprio turno. */
export const mecanicasDeClasseAoFecharTurno = (ctx: Contexto, jogador: PlayerId): void => {
  // Ladino: "quando o adversário terminar um turno sem causar Dano à sua Vida."
  marcarTurnoSemDano(ctx, jogador);
  // "Ao fim do turno do Ladino, todas as Brechas não consumidas desaparecem."
  // Isso cobre também as Brechas criadas no turno inimigo, que duram até o fim
  // do turno seguinte dele.
  limparBrechas(ctx, jogador);
};

/**
 * O que as classes fazem **depois** da conversão de Reserva do fim do turno.
 *
 * "Quando terminar seu turno com 2 de Reserva" só pode ser conferido aqui: a
 * Reserva do fim do turno é a que a conversão deixou.
 */
export const mecanicasDeClasseDepoisDaConversao = (ctx: Contexto, jogador: PlayerId): void => {
  fechoDoPaladino(ctx, jogador);
};
