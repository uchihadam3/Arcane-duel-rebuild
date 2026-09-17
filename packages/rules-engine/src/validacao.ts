import type {
  EstadoDaPartida,
  EstadoDeJogador,
  Resultado,
  SlotDeAcao,
} from '@arcane-duel/shared-types';
import { CONDICOES, ZONAS_DE_COOLDOWN, falha, sucesso } from '@arcane-duel/shared-types';

import { COMPOSICAO_DA_BUILD, LIMITE_DE_CONDICAO, REGRAS_UNIVERSAIS } from './constants.js';

/*
 * Validação estrutural.
 *
 * Confere se um estado é representável pelas regras documentadas — composição
 * da build, limites das Condições, coerência entre classe e recurso. Não
 * decide jogada nenhuma: isso é etapa dois.
 */

export interface ProblemaDeEstrutura {
  readonly jogador?: string;
  readonly campo: string;
  readonly problema: string;
}

export type ValidacaoDeEstrutura = Resultado<true, readonly ProblemaDeEstrutura[]>;

const contarDuplicados = (cartas: readonly string[]): readonly string[] => {
  const vistos = new Set<string>();
  const duplicados = new Set<string>();
  for (const carta of cartas) {
    if (vistos.has(carta)) duplicados.add(carta);
    vistos.add(carta);
  }
  return [...duplicados];
};

const validarSlotDeAcao = (slot: SlotDeAcao, posicao: number): readonly ProblemaDeEstrutura[] => {
  const problemas: ProblemaDeEstrutura[] = [];
  if (slot.indice !== posicao) {
    problemas.push({
      campo: `acoes[${String(posicao)}].indice`,
      problema: `índice ${String(slot.indice)} fora da posição ${String(posicao)}`,
    });
  }
  if (slot.carta === null && slot.resposta.voluntaria !== null) {
    problemas.push({
      campo: `acoes[${String(posicao)}].resposta`,
      problema: 'existe Resposta sem Ação à qual responder',
    });
  }
  return problemas;
};

/** Confere a estrutura do estado de um jogador. */
export const validarEstadoDeJogador = (jogador: EstadoDeJogador): ValidacaoDeEstrutura => {
  const problemas: ProblemaDeEstrutura[] = [];
  const anotar = (campo: string, problema: string): void => {
    problemas.push({ jogador: jogador.id, campo, problema });
  };

  const habilidades = [
    ...jogador.mao,
    ...ZONAS_DE_COOLDOWN.flatMap((zona) => jogador.cooldown[zona]),
  ];
  if (habilidades.length !== COMPOSICAO_DA_BUILD.habilidades) {
    anotar(
      'habilidades',
      `esperadas ${String(COMPOSICAO_DA_BUILD.habilidades)} entre mão e cooldown, encontradas ${String(habilidades.length)}`,
    );
  }
  for (const duplicada of contarDuplicados(habilidades)) {
    anotar('habilidades', `carta repetida: ${duplicada}`);
  }

  if (jogador.passivas.length !== COMPOSICAO_DA_BUILD.passivas) {
    anotar('passivas', `esperadas ${String(COMPOSICAO_DA_BUILD.passivas)}`);
  }
  // As Cartas de Classe Exauridas saem do campo, então o total equipado é o
  // que está em campo mais o que já foi removido.
  const cartasDeClasse = jogador.cartasDeClasse.length + jogador.removidas.length;
  if (cartasDeClasse !== COMPOSICAO_DA_BUILD.cartasDeClasse) {
    anotar('cartasDeClasse', `esperadas ${String(COMPOSICAO_DA_BUILD.cartasDeClasse)}`);
  }

  if (jogador.acoes.length !== REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno) {
    anotar('acoes', `esperados ${String(REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno)} espaços de Ação`);
  }
  jogador.acoes.forEach((slot, posicao) => {
    problemas.push(
      ...validarSlotDeAcao(slot, posicao).map((item) => ({ ...item, jogador: jogador.id })),
    );
  });

  for (const condicao of CONDICOES) {
    const valor = jogador.condicoes[condicao];
    if (valor < 0) anotar(`condicoes.${condicao}`, 'quantidade negativa');
    if (valor > LIMITE_DE_CONDICAO[condicao]) {
      anotar(`condicoes.${condicao}`, `acima do limite de ${String(LIMITE_DE_CONDICAO[condicao])}`);
    }
  }

  if (jogador.recurso.classe !== jogador.classe) {
    anotar('recurso', `recurso de ${jogador.recurso.classe} em um jogador de ${jogador.classe}`);
  }

  if (jogador.vida < 0) anotar('vida', 'negativa');
  if (jogador.guarda < 0) anotar('guarda', 'negativa');
  if (jogador.pontosDeAcao < 0) anotar('pontosDeAcao', 'negativos');
  if (jogador.reserva < 0) anotar('reserva', 'negativa');
  if (jogador.reserva > REGRAS_UNIVERSAIS.maximoDeReserva) {
    anotar('reserva', `acima do máximo de ${String(REGRAS_UNIVERSAIS.maximoDeReserva)}`);
  }
  if (jogador.acoesRealizadasNoTurno > REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno) {
    anotar('acoesRealizadasNoTurno', 'acima do máximo de Ações por turno');
  }

  return problemas.length === 0 ? sucesso(true) : falha(problemas);
};

/** Confere a estrutura da partida inteira. */
export const validarPartida = (partida: EstadoDaPartida): ValidacaoDeEstrutura => {
  const problemas: ProblemaDeEstrutura[] = [];

  if (partida.jogadores[0].id === partida.jogadores[1].id) {
    problemas.push({ campo: 'jogadores', problema: 'os dois jogadores têm o mesmo identificador' });
  }

  const idsValidos = partida.jogadores.map((jogador) => jogador.id);
  if (partida.turno !== null) {
    if (!idsValidos.includes(partida.turno.jogadorAtivo)) {
      problemas.push({ campo: 'turno.jogadorAtivo', problema: 'não é um dos dois jogadores' });
    }
    if (partida.turno.numero < 1) {
      problemas.push({ campo: 'turno.numero', problema: 'o primeiro turno é o número 1' });
    }
  }

  const vencedor = partida.desfecho?.vencedor ?? null;
  if (vencedor !== null && !idsValidos.includes(vencedor)) {
    problemas.push({ campo: 'desfecho.vencedor', problema: 'não é um dos dois jogadores' });
  }

  if (partida.situacao === 'em-andamento' && partida.turno === null) {
    problemas.push({ campo: 'turno', problema: 'partida em andamento sem turno' });
  }
  if (partida.situacao === 'encerrada' && partida.desfecho === null) {
    problemas.push({ campo: 'desfecho', problema: 'partida encerrada sem desfecho' });
  }

  for (const jogador of partida.jogadores) {
    const resultado = validarEstadoDeJogador(jogador);
    if (!resultado.ok) problemas.push(...resultado.erro);
  }

  return problemas.length === 0 ? sucesso(true) : falha(problemas);
};
