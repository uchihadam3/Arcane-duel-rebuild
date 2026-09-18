import type {
  CardId,
  EmboscadaPreparada,
  EstadoDaPartida,
  EstadoDeJogador,
  PedraDeChi,
} from '@arcane-duel/shared-types';
import {
  ESTADOS_DE_EMBOSCADA,
  ESTADOS_DE_JURAMENTO,
  ESTAGIOS_DE_DEVOCAO,
} from '@arcane-duel/shared-types';
import { CATALOGO } from '@arcane-duel/card-data';
import { projetarParaJogador } from '@arcane-duel/rules-engine';
import {
  LIMITE_DE_CONDICAO,
  LIMITES_DE_RECURSO,
  REGRAS_UNIVERSAIS,
} from '@arcane-duel/rules-engine';

/*
 * As invariantes do estado.
 *
 * Elas não são regra nova: são a leitura literal do que o documento fixa, e
 * nada além disso. Onde o documento não fixa teto, a invariante **não inventa
 * um** — ela confere só o que está escrito.
 *
 * São de duas naturezas:
 *
 * - de instantâneo (`conferirInvariantes`), que olham um estado sozinho;
 * - de transição (`conferirInvariantesDaTransicao`), que precisam de dois
 *   estados consecutivos porque falam de uma porta que não reabre.
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

const naoNegativo = (
  quebras: string[],
  jogador: EstadoDeJogador,
  nome: string,
  valor: number,
): void => {
  if (valor < 0) quebras.push(`${jogador.classe}: ${nome} negativo: ${String(valor)}`);
};

const conferirJogador = (quebras: string[], jogador: EstadoDeJogador): void => {
  faixa(quebras, jogador, 'Vida', jogador.vida, 0, REGRAS_UNIVERSAIS.vidaInicial);
  faixa(quebras, jogador, 'Guarda', jogador.guarda, 0, REGRAS_UNIVERSAIS.guardaInicial);

  /*
   * Pontos de Ação: só o piso.
   *
   * O documento fixa "cinco pontos de Ação no início do próprio turno" (§6),
   * "até dois pontos não utilizados podem ser convertidos em Reserva" e o
   * Impulso Inicial de exatamente um ponto (§7). Nenhum desses trechos define
   * um teto universal de AP **depois** que uma carta recupera pontos, e
   * Reserva não é AP: ela é outra moeda, com máximo próprio, e somar as duas
   * para fabricar um teto de sete seria regra inventada.
   *
   * Por isso a invariante universal de AP é só `AP >= 0`. O teto que existe
   * hoje — `recuperarPontosDeAcao` não passa dos cinco do turno — é decisão de
   * uma função do motor, não regra do documento, e não é conferida aqui.
   */
  naoNegativo(quebras, jogador, 'pontos de Ação', jogador.pontosDeAcao);

  faixa(quebras, jogador, 'Reserva', jogador.reserva, 0, REGRAS_UNIVERSAIS.maximoDeReserva);
  conferirAcoes(quebras, jogador);

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

  /*
   * Passiva oculta não deixa rastro (§12).
   *
   * As anotações vão inteiras para a projeção do adversário, e cada uma carrega
   * a carta que a criou. Se uma Passiva ainda oculta aparecer como origem, o
   * adversário a descobre pela projeção antes de ela se revelar — e a Passiva
   * deixa de ser uma carta virada para baixo.
   *
   * Marca de rotina de turno pertence ao turno: a origem dela é
   * `sistema:turno`, não a Passiva que vai lê-la depois.
   */
  const ocultas = new Set<string>(
    jogador.passivas
      .filter((passiva) => passiva.estado === 'oculta')
      .map((passiva) => passiva.carta),
  );
  for (const anotacao of jogador.anotacoes) {
    if (ocultas.has(anotacao.origem)) {
      quebras.push(
        `${jogador.classe}: a anotação ${anotacao.chave} tem como origem a Passiva ainda oculta ${anotacao.origem}`,
      );
    }
    for (const oculta of ocultas) {
      if (anotacao.chave.includes(oculta)) {
        quebras.push(
          `${jogador.classe}: a chave ${anotacao.chave} cita a Passiva ainda oculta ${oculta}`,
        );
      }
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

/**
 * Ações por turno.
 *
 * O limite universal é três (§8). A quarta Ação existe só quando uma carta a
 * abriu — e abrir é um ato visível no estado: `acoesPermitidasNoTurno` sobe
 * para quatro **e** o quarto espaço deixa de ser `indisponivel`. Conferir os
 * dois juntos é o que impede um "menor ou igual a quatro" solto de aceitar
 * quarta Ação sem permissão nenhuma.
 */
const conferirAcoes = (quebras: string[], jogador: EstadoDeJogador): void => {
  const universal = REGRAS_UNIVERSAIS.maximoDeAcoesPorTurno;
  const permitidas = jogador.acoesPermitidasNoTurno;
  const quartoEspacoAberto = jogador.acoes[universal]?.situacao !== 'indisponivel';

  if (permitidas !== universal && permitidas !== universal + 1) {
    quebras.push(
      `${jogador.classe}: Ações permitidas no turno fora do jogo-base: ${String(permitidas)}`,
    );
  }
  if (permitidas > universal && !quartoEspacoAberto) {
    quebras.push(`${jogador.classe}: quarta Ação permitida sem o quarto espaço aberto por carta`);
  }
  if (permitidas <= universal && quartoEspacoAberto) {
    quebras.push(`${jogador.classe}: quarto espaço aberto sem carta que o libere`);
  }

  naoNegativo(quebras, jogador, 'Ações realizadas no turno', jogador.acoesRealizadasNoTurno);
  if (jogador.acoesRealizadasNoTurno > permitidas) {
    quebras.push(
      `${jogador.classe}: ${String(jogador.acoesRealizadasNoTurno)} Ações realizadas com ${String(permitidas)} permitidas`,
    );
  }
};

/**
 * A Emboscada do Patrulheiro (R13).
 *
 * A reserva é uma zona física de uma carta só: o campo é único e anulável, e
 * por isso "no máximo uma Emboscada" é garantido pelo tipo, não por conferência.
 * O que o tipo não garante — e por isso é conferido aqui — é que a carta
 * reservada seja mesmo um Ataque da classe de quem a reservou, e que ela esteja
 * em **uma** zona só: face-down é sair da mão, e não estar nos dois lugares.
 */
const conferirEmboscada = (
  quebras: string[],
  jogador: EstadoDeJogador,
  emboscada: EmboscadaPreparada | null | undefined,
): void => {
  // O tipo garante o campo, mas a invariante lê estado que pode ter vindo de
  // um replay: campo ausente é quebra, e não motivo para lançar exceção.
  if (emboscada === undefined) {
    quebras.push('patrulheiro: o componente de classe perdeu o campo da Emboscada');
    return;
  }
  if (emboscada === null) return;
  const reservada = emboscada.carta;

  if (!ESTADOS_DE_EMBOSCADA.includes(emboscada.estado)) {
    quebras.push(`patrulheiro: Emboscada em estado desconhecido: ${emboscada.estado}`);
  }

  // "Escolha 1 Ataque da mão": o catálogo é a autoridade sobre o que a carta é.
  const definicao = CATALOGO.porId(reservada);
  if (definicao === undefined) {
    quebras.push(`patrulheiro: ${reservada} está reservada mas não existe no catálogo`);
    return;
  }
  if (definicao.tipo !== 'ataque') {
    quebras.push(`patrulheiro: ${reservada} está reservada sem ser Ataque (${definicao.tipo})`);
  }
  // A reserva é do dono: a carta face-down saiu da mão dele, e de mais ninguém.
  if (definicao.classe !== jogador.classe) {
    quebras.push(`patrulheiro: ${reservada} está reservada mas é carta de ${definicao.classe}`);
  }

  // "Coloque face-down no terceiro espaço": a carta saiu da mão.
  if (jogador.mao.includes(reservada)) {
    quebras.push(`patrulheiro: ${reservada} está reservada e na mão ao mesmo tempo`);
  }
  for (const [zona, cartas] of Object.entries(jogador.cooldown)) {
    if (cartas.includes(reservada)) {
      quebras.push(`patrulheiro: ${reservada} está reservada e no cooldown ${zona}`);
    }
  }
  if (jogador.removidas.includes(reservada)) {
    quebras.push(`patrulheiro: ${reservada} está reservada e entre as removidas`);
  }
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

    case 'clerigo':
      // A Devoção é trilha de quatro estágios, e só deles (§16).
      if (!ESTAGIOS_DE_DEVOCAO.includes(recurso.devocao)) {
        quebras.push(`clerigo: estágio de Devoção fora da trilha: ${recurso.devocao}`);
      }
      return;

    case 'necromante':
      conferirAlmas(
        quebras,
        jogador,
        recurso.almasControladas,
        recurso.almasNoCemiterio,
        recurso.almasAnexadas,
      );
      return;

    case 'paladino':
      // O Juramento tem três estados, e só eles (§16).
      if (!ESTADOS_DE_JURAMENTO.includes(recurso.juramento)) {
        quebras.push(`paladino: estado de Juramento fora da trilha: ${recurso.juramento}`);
      }
      return;

    case 'ladino':
      faixa(quebras, jogador, 'Brechas', recurso.brechasNoAdversario, 0, 3);
      return;

    case 'bardo':
      faixa(quebras, jogador, 'Cadências no turno', recurso.cadenciasNoTurno, 0, 3);
      return;

    case 'monge':
      conferirChi(quebras, recurso.chi);
      return;

    case 'patrulheiro':
      // A Marca da Presa é marcador booleano, e não Condição: ela não pode ter
      // virado acúmulo nem ter ido parar na área de Condições (§15, §16).
      if (typeof recurso.marcaDaPresa !== 'boolean') {
        quebras.push('patrulheiro: Marca da Presa deixou de ser booleana');
      }
      conferirEmboscada(quebras, jogador, recurso.emboscada);
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

    case 'druida':
      if (recurso.forma !== 'humana' && recurso.forma !== 'selvagem') {
        quebras.push(`druida: Forma fora das duas impressas: ${String(recurso.forma)}`);
      }
      if (typeof recurso.metamorfoseGratuitaUsadaNoTurno !== 'boolean') {
        quebras.push('druida: a Metamorfose gratuita deixou de ser booleana');
      }
      return;

    case 'bruxo':
      // O Preço Proibido vale uma vez por próprio turno: o estado dele é o
      // próprio limite, e é booleano — nunca contador.
      if (typeof recurso.precoProibidoUsadoNoTurno !== 'boolean') {
        quebras.push('bruxo: o Preço Proibido usado no turno deixou de ser booleano');
      }
      return;
  }
};

/** As quatro fichas de Alma, nas três casas onde uma ficha pode estar. */
const conferirAlmas = (
  quebras: string[],
  jogador: EstadoDeJogador,
  controladas: number,
  cemiterio: number,
  anexadas: readonly CardId[],
): void => {
  naoNegativo(quebras, jogador, 'Almas controladas', controladas);
  naoNegativo(quebras, jogador, 'Almas no Cemitério', cemiterio);

  /*
   * "As Almas são quatro fichas": elas circulam e nunca nascem nem somem.
   *
   * São três casas, não duas. Anexar move a ficha de `controladas` para cima de
   * um Servo, e liberar a manda para o Cemitério — em nenhum dos dois momentos
   * a ficha deixa de existir. Somar só controladas e Cemitério acusaria três
   * fichas toda vez que uma estivesse anexada, que é justamente o estado que a
   * classe existe para produzir.
   */
  const total = controladas + cemiterio + anexadas.length;
  if (total !== 4) {
    quebras.push(
      `necromante: as 4 Almas viraram ${String(total)} (${String(controladas)} controladas + ${String(cemiterio)} no Cemitério + ${String(anexadas.length)} anexadas) — a conservação quebrou`,
    );
  }

  // Cada ficha anexada está sobre um Servo distinto: o mesmo Servo não segura
  // duas Almas.
  const vistos = new Set<string>();
  for (const servo of anexadas) {
    if (vistos.has(servo)) {
      quebras.push(`necromante: o Servo ${servo} aparece com duas Almas anexadas`);
    }
    vistos.add(servo);
  }

  // A ficha está **sobre uma carta**: o Servo precisa ser uma Carta de Classe
  // do próprio Necromante, em campo ou já Exaurida.
  const proprias = new Set<string>([
    ...jogador.cartasDeClasse.map((item) => item.carta),
    ...jogador.removidas,
  ]);
  for (const servo of anexadas) {
    if (!proprias.has(servo)) {
      quebras.push(`necromante: Alma anexada ao Servo ${servo}, que não é Carta de Classe dele`);
    }
  }
};

/** Três pedras, cada uma Pronta ou Gasta — nunca outro valor, nunca outro número. */
const conferirChi = (quebras: string[], chi: readonly PedraDeChi[]): void => {
  if (chi.length !== 3) {
    quebras.push(`monge: as pedras de Chi viraram ${String(chi.length)}`);
  }
  for (const pedra of chi) {
    if (pedra !== 'pronta' && pedra !== 'gasta') {
      quebras.push(`monge: pedra de Chi em estado desconhecido: ${String(pedra)}`);
    }
  }
};

/**
 * Confere o estado inteiro e devolve as invariantes de instantâneo quebradas.
 *
 * A lista vazia é o resultado esperado; qualquer linha nela invalida o lote.
 */
/**
 * A identidade reservada não atravessa a projeção do adversário.
 *
 * Esta é a única invariante que olha a projeção em vez do estado: a carta
 * face-down é o caso em que o estado canônico **precisa** saber algo que
 * observador nenhum pode ler, e por isso a prova tem de ser feita do lado de
 * fora.
 */
const conferirPrivacidadeDaEmboscada = (quebras: string[], partida: EstadoDaPartida): void => {
  for (const dono of partida.jogadores) {
    if (dono.recurso.classe !== 'patrulheiro') continue;
    // `?? null` pela mesma razão do conferidor acima: campo ausente já foi
    // acusado ali, e aqui não há o que projetar.
    const emboscada = dono.recurso.emboscada ?? null;
    if (emboscada === null) continue;

    for (const outro of partida.jogadores) {
      if (outro.id === dono.id) continue;
      const texto = JSON.stringify(projetarParaJogador(partida, outro.id));
      if (new RegExp(`(?<![A-Za-z0-9_-])${emboscada.carta}(?![A-Za-z0-9_-])`).test(texto)) {
        quebras.push(
          `patrulheiro: ${emboscada.carta} está face-down e aparece na visão de ${outro.id}`,
        );
      }
    }
  }
};

export const conferirInvariantes = (partida: EstadoDaPartida): readonly string[] => {
  const quebras: string[] = [];
  for (const jogador of partida.jogadores) conferirJogador(quebras, jogador);
  conferirPrivacidadeDaEmboscada(quebras, partida);
  return quebras;
};

/* ------------------------------------------------------------------ */
/* Invariantes de transição                                            */
/* ------------------------------------------------------------------ */

/*
 * Portas que não reabrem.
 *
 * Um instantâneo sozinho não consegue provar isto: "Exaurida sai do campo em
 * definitivo" e "a Ultimate é uma única utilização por partida" são frases
 * sobre o tempo, não sobre um estado. Elas só se verificam comparando dois
 * estados consecutivos.
 *
 * O catálogo atual não possui nenhuma carta que recupere Carta de Classe
 * Exaurida nem Ultimate Consumida — as cartas que "deixam Pronta" agem sobre
 * uma Carta de Classe **Ativada**, que continua em campo. Se algum dia uma
 * carta recuperar esses estados, a exceção entra aqui, impressa e nomeada;
 * até lá, qualquer volta é bug.
 */

const porJogador = (partida: EstadoDaPartida): ReadonlyMap<string, EstadoDeJogador> =>
  new Map(partida.jogadores.map((jogador) => [jogador.id, jogador]));

const conferirTransicaoDoJogador = (
  quebras: string[],
  antes: EstadoDeJogador,
  depois: EstadoDeJogador,
): void => {
  // "Exaurida sai do campo em definitivo" (§13).
  for (const carta of antes.removidas) {
    if (!depois.removidas.includes(carta)) {
      quebras.push(`${depois.classe}: ${carta} saiu das cartas removidas depois de Exaurida`);
    }
    const devolta = depois.cartasDeClasse.find((item) => item.carta === carta);
    if (devolta !== undefined) {
      quebras.push(
        `${depois.classe}: ${carta} voltou ao campo como ${devolta.estado} depois de Exaurida`,
      );
    }
  }

  // A Emboscada só anda para a frente: "preparada" vira "armada", e "armada"
  // vira usada ou devolvida. Voltar a "preparada" seria uma reserva renovando
  // a própria janela — a emboscada eterna que o texto não permite.
  const reservaAntes = antes.recurso.classe === 'patrulheiro' ? antes.recurso.emboscada : null;
  const reservaDepois = depois.recurso.classe === 'patrulheiro' ? depois.recurso.emboscada : null;
  if (reservaAntes !== null && reservaDepois !== null) {
    if (reservaAntes.estado === 'armada' && reservaDepois.estado === 'preparada') {
      quebras.push(
        `${depois.classe}: a Emboscada de ${reservaDepois.carta} voltou de armada a preparada`,
      );
    }
    // Uma reserva de pé não troca de carta: ela é a carta que foi posta ali.
    if (reservaAntes.carta !== reservaDepois.carta) {
      quebras.push(
        `${depois.classe}: a Emboscada trocou ${reservaAntes.carta} por ${reservaDepois.carta} sem ser desfeita`,
      );
    }
  }

  // "A Ultimate é uma única utilização por partida" (§14).
  if (antes.ultimate.estado === 'consumida' && depois.ultimate.estado !== 'consumida') {
    quebras.push(
      `${depois.classe}: a Ultimate ${depois.ultimate.carta} voltou a ${depois.ultimate.estado} depois de Consumida`,
    );
  }
};

/**
 * Confere o que só dois estados consecutivos conseguem provar.
 *
 * Recebe o estado anterior e o posterior da **mesma** partida. Devolve as
 * invariantes de transição quebradas; a lista vazia é o resultado esperado.
 */
export const conferirInvariantesDaTransicao = (
  anterior: EstadoDaPartida,
  posterior: EstadoDaPartida,
): readonly string[] => {
  const quebras: string[] = [];
  const antes = porJogador(anterior);

  for (const depois of posterior.jogadores) {
    const anteriorDoJogador = antes.get(depois.id);
    if (anteriorDoJogador === undefined) {
      quebras.push(`jogador ${depois.id} apareceu na partida entre dois estados`);
      continue;
    }
    conferirTransicaoDoJogador(quebras, anteriorDoJogador, depois);
  }

  return quebras;
};
