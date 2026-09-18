import type { EstadoDaPartida, EstadoDeJogador } from '@arcane-duel/shared-types';
import {
  LIMITE_DE_CONDICAO,
  LIMITES_DE_RECURSO,
  REGRAS_UNIVERSAIS,
} from '@arcane-duel/rules-engine';

/*
 * As invariantes do estado.
 *
 * Elas não são regra nova: são a leitura literal do que o documento fixa —
 * faixas de Vida, Guarda, pontos de Ação, Reserva, Condições e recursos de
 * classe — conferidas em **todo** estado que o simulador produz. Um lote só
 * vale como medição se nenhuma delas quebrar em nenhum instante.
 *
 * Cada violação vira uma linha legível em vez de uma exceção: o relatório
 * precisa dizer qual invariante quebrou e em qual jogador.
 */

const faixa = (
  quebras: string[],
  jogador: EstadoDeJogador,
  nome: string,
  valor: number,
  minimo: number,
  maximo: number,
): void => {
  if (valor < minimo || valor > maximo) {
    quebras.push(
      `${jogador.classe}: ${nome} fora da faixa [${String(minimo)}, ${String(maximo)}]: ${String(valor)}`,
    );
  }
};

const conferirJogador = (quebras: string[], jogador: EstadoDeJogador): void => {
  faixa(quebras, jogador, 'Vida', jogador.vida, 0, REGRAS_UNIVERSAIS.vidaInicial);
  faixa(quebras, jogador, 'Guarda', jogador.guarda, 0, REGRAS_UNIVERSAIS.guardaInicial);
  faixa(
    quebras,
    jogador,
    'pontos de Ação',
    jogador.pontosDeAcao,
    0,
    REGRAS_UNIVERSAIS.pontosDeAcaoPorTurno + REGRAS_UNIVERSAIS.maximoDeReserva,
  );
  faixa(quebras, jogador, 'Reserva', jogador.reserva, 0, REGRAS_UNIVERSAIS.maximoDeReserva);
  faixa(
    quebras,
    jogador,
    'Ações no turno',
    jogador.acoesRealizadasNoTurno,
    0,
    REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno + 1,
  );

  for (const [condicao, limite] of Object.entries(LIMITE_DE_CONDICAO)) {
    const valor = jogador.condicoes[condicao as keyof typeof jogador.condicoes];
    faixa(quebras, jogador, `Condição ${condicao}`, valor, 0, limite);
  }

  // "Passiva nunca é Exaurida" (§12): o estado não tem esse valor, e nenhuma
  // Passiva pode ter ido parar entre as cartas removidas.
  for (const passiva of jogador.passivas) {
    if (jogador.removidas.includes(passiva.carta)) {
      quebras.push(`${jogador.classe}: Passiva ${passiva.carta} foi removida — Passiva não Exaure`);
    }
  }

  // Uma carta não pode estar em duas zonas ao mesmo tempo.
  const zonas = [
    ...jogador.mao,
    ...jogador.cooldown[1],
    ...jogador.cooldown[2],
    ...jogador.cooldown[3],
  ];
  const vistas = new Set<string>();
  for (const carta of zonas) {
    if (vistas.has(carta)) {
      quebras.push(`${jogador.classe}: carta ${carta} aparece em mais de uma zona`);
    }
    vistas.add(carta);
  }

  conferirRecurso(quebras, jogador);
};

const conferirRecurso = (quebras: string[], jogador: EstadoDeJogador): void => {
  const recurso = jogador.recurso;
  switch (recurso.classe) {
    case 'guerreiro':
      faixa(quebras, jogador, 'Momentum', recurso.momentum, 0, LIMITES_DE_RECURSO.momentum.maximo);
      return;
    case 'mago':
      faixa(quebras, jogador, 'Mana', recurso.mana, 0, LIMITES_DE_RECURSO.mana.maximo);
      return;
    case 'necromante': {
      const total = recurso.almasControladas + recurso.almasNoCemiterio;
      faixa(quebras, jogador, 'Almas controladas', recurso.almasControladas, 0, 4);
      // "As Almas são quatro fichas": elas circulam, nunca nascem nem somem.
      if (total !== 4) {
        quebras.push(`necromante: as 4 Almas viraram ${String(total)} — a conservação quebrou`);
      }
      return;
    }
    case 'ladino':
      faixa(quebras, jogador, 'Brechas', recurso.brechasNoAdversario, 0, 3);
      return;
    case 'monge': {
      if (recurso.chi.length !== 3) {
        quebras.push(`monge: as pedras de Chi viraram ${String(recurso.chi.length)}`);
      }
      return;
    }
    case 'bardo':
      faixa(quebras, jogador, 'Cadências no turno', recurso.cadenciasNoTurno, 0, 3);
      return;
    case 'barbaro':
      faixa(
        quebras,
        jogador,
        'Guarda reduzida no turno',
        recurso.guardaReduzidaVoluntariamenteNoTurno,
        0,
        2,
      );
      return;
    default:
      return;
  }
};

/**
 * Confere o estado inteiro e devolve as invariantes quebradas.
 *
 * A lista vazia é o resultado esperado; qualquer linha nela invalida o lote.
 */
export const conferirInvariantes = (partida: EstadoDaPartida): readonly string[] => {
  const quebras: string[] = [];
  for (const jogador of partida.jogadores) conferirJogador(quebras, jogador);
  return quebras;
};
