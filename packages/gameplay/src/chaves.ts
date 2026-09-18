import { cardId } from '@arcane-duel/shared-types';

/*
 * Vocabulário das anotações de efeito.
 *
 * Toda chave usada pelos módulos de classe está declarada aqui, com escopo
 * documentado. Nada de texto solto espalhado pelas cartas: se uma chave não
 * está nesta lista, ela não existe.
 */

/** Contagens do turno em andamento, zeradas no início de qualquer turno. */
export const CHAVE = {
  /** Ataques já resolvidos pelo dono neste turno próprio. */
  ataquesResolvidos: 'turno:ataques-resolvidos',
  /** Feitiços já resolvidos pelo dono neste turno próprio. */
  feiticosResolvidos: 'turno:feiticos-resolvidos',
  /** O dono gastou o recurso de classe em alguma Ação neste turno. */
  gastouRecurso: 'turno:gastou-recurso',
  /** Cartas de Reação que o dono já usou no turno em andamento. */
  reacoesUsadas: 'turno:reacoes-usadas',
  /** A Defesa Inata já foi usada neste turno. */
  defesaInataUsada: 'turno:defesa-inata-usada',
  /** Tipo da Ação anterior do dono, guardado como contagem de Ataques de 1 AP. */
  acaoAnteriorFoiAtaqueDe1Ap: 'turno:acao-anterior-ataque-1ap',
  /** A Ação anterior do dono foi um Ataque. */
  acaoAnteriorFoiAtaque: 'turno:acao-anterior-ataque',
  /** O dono ganhou Momentum por remover Guarda neste turno. */
  momentumPorGuarda: 'turno:momentum-por-guarda',
  /** O dono causou Dano à Vida do adversário neste turno. */
  causouDanoNoTurno: 'turno:causou-dano',
  /** O dono provocou Ruptura neste turno. */
  causouRupturaNoTurno: 'turno:causou-ruptura',
  /** O dono ganhou Momentum por zerar o Dano final neste turno. */
  momentumPorDanoZero: 'turno:momentum-por-dano-zero',
  /** Reserva extra prometida por Guarda Preparada para o fim deste turno. */
  reservaExtraNoFim: 'turno:reserva-extra-no-fim',
  /** Disciplina de Aço promete mais 1 Momentum se o turno acabar com Reserva 2. */
  momentumSeTerminarComReserva2: 'turno:momentum-se-reserva-2',
  /** Bônus guardado para o próximo Ataque do turno. */
  proximoAtaqueDano: 'turno:proximo-ataque-dano',
  proximoAtaqueImpacto: 'turno:proximo-ataque-impacto',
  /** Bônus condicionais de Finta Calculada, escolhidos na hora da resolução. */
  proximoAtaqueSeReacaoDano: 'turno:proximo-ataque-se-reacao-dano',
  proximoAtaqueSemReacaoImpacto: 'turno:proximo-ataque-sem-reacao-impacto',
  /** Pressão Implacável dá Momentum se o Ataque beneficiado causar Ruptura. */
  proximoAtaqueMomentumNaRuptura: 'turno:proximo-ataque-momentum-ruptura',
  /** Bônus guardado para o próximo Ataque/Feitiço do turno. */
  proximoFeiticoDano: 'turno:proximo-feitico-dano',
  proximoFeiticoImpacto: 'turno:proximo-feitico-impacto',
  /** Cartas devolvidas pela Runa do Eco custam +1 AP se voltarem neste turno. */
  ecoEncarece: 'turno:eco-encarece',
  /**
   * Runa de Cinzas Exaurida, armada: o próximo tique de Queimadura do
   * adversário remove toda a Queimadura e causa 3 de Dano. A Exaustão é
   * definitiva, então a promessa vive até ser usada.
   */
  cinzasArmada: 'partida:cinzas-armada',
  /** Runa Prismática Ativada: a terceira Ação de Feitiço custa 1 AP a menos. */
  prismaticaDesconto: 'turno:prismatica-desconto',
  /** Uma vez por turno de cada Passiva com limite próprio. */
  passivaUsada: 'turno:passiva-usada',
  /** Contagem de Runas Ativadas pelo Mago neste turno. */
  runasAtivadasNoTurno: 'turno:runas-ativadas',
  /** Primeiro Ataque do turno já foi declarado. */
  primeiroAtaqueDeclarado: 'turno:primeiro-ataque-declarado',
  /** Primeiro Ataque de 3 AP do turno já foi declarado. */
  primeiroAtaqueDe3ApDeclarado: 'turno:primeiro-ataque-3ap',
  /** Primeiro Feitiço do turno contra inimigo com Queimadura já foi declarado. */
  primeiroFeiticoContraQueimadura: 'turno:primeiro-feitico-queimadura',
  /** Primeiro Feitiço do turno que custa 2 ou mais Mana já foi declarado. */
  primeiroFeiticoCaro: 'turno:primeiro-feitico-caro',
  /** Primeiro Ataque do turno com Guarda inimiga 0 já foi declarado. */
  primeiroAtaqueComGuardaZero: 'turno:primeiro-ataque-guarda-zero',
  /**
   * O Ataque em resolução teria causado Ruptura sem a redução da Resposta.
   *
   * É calculado uma vez, antes da resolução, para que cartas que perguntam "se
   * isso impedir uma Ruptura" tenham a contrafactual sem precisar resolver a
   * Ação duas vezes.
   */
  rupturaSemResposta: 'acao:ruptura-sem-resposta',
  /** O Ataque em resolução causaria Ruptura com tudo que já foi somado. */
  rupturaPrevista: 'acao:ruptura-prevista',
  /** A Defesa Inata foi usada nesta Ação — escopo de Ação, não de turno. */
  defesaInataNestaAcao: 'acao:defesa-inata',
  /** Condições que esta Ação aplicaria ao dono não são aplicadas (Absolvição). */
  imunidadeACondicoes: 'acao:imunidade-a-condicoes',

  /* Clérigo ------------------------------------------------------------ */
  /** O avanço de Devoção do próprio turno já aconteceu. */
  devocaoAvancouNoProprioTurno: 'turno:devocao-avancou-proprio',
  /** O avanço de Devoção do turno inimigo já aconteceu. */
  devocaoAvancouNoTurnoInimigo: 'turno:devocao-avancou-inimigo',
  /** O dono restaurou Vida neste turno. */
  restaurouVidaNoTurno: 'turno:restaurou-vida',
  /** O dono perdeu Vida por efeito próprio neste turno. */
  perdeuVidaPorEfeitoProprio: 'turno:perdeu-vida-efeito-proprio',
  /** Cura adicional prometida à próxima restauração de Vida do turno. */
  curaAdicional: 'turno:cura-adicional',
  /** Cartas devolvidas pelo Relicário custam +1 AP se voltarem neste turno. */
  relicarioEncarece: 'turno:relicario-encarece',
  /** Vigília promete avançar a Devoção se o turno terminar com 2 de Reserva. */
  devocaoSeTerminarComReserva2: 'turno:devocao-se-reserva-2',
  /** O inimigo já estava com Guarda 0 quando esta Ação foi resolver. */
  guardaInimigaJaEraZero: 'acao:guarda-inimiga-zero',
  /** O inimigo estava com 3 ou menos de Guarda quando a Ação foi declarada. */
  guardaInimigaBaixaAoDeclarar: 'acao:guarda-inimiga-baixa',

  /* Necromante ---------------------------------------------------------- */
  /** A colheita automática do próprio turno já aconteceu. */
  almaColhidaNoProprioTurno: 'turno:alma-colhida-proprio',
  /** A colheita automática do turno inimigo já aconteceu. */
  almaColhidaNoTurnoInimigo: 'turno:alma-colhida-inimigo',
  /** A Alma anexada deste turno já foi colocada sobre um Servo. */
  almaAnexadaNoTurno: 'turno:alma-anexada',
  /** O dono moveu voluntariamente uma carta própria para uma zona mais distante. */
  atrasouCartaPropria: 'turno:atrasou-carta-propria',
  /** O dono deixou um Servo Pronto de novo neste turno. */
  servoProntificadoNoTurno: 'turno:servo-prontificado',
  /** Uma Reação do dono impediu Ruptura neste turno. */
  reacaoImpediuRuptura: 'turno:reacao-impediu-ruptura',
  /** Rito de Ossos armado: a Ruptura do próximo Ataque prontifica um Servo. */
  ritoDeOssosArmado: 'turno:rito-de-ossos',
  /** Quantos Servos já foram Exauridos na partida (Sacrifício Calculado). */
  servosExauridos: 'partida:servos-exauridos',
  /** Cartas devolvidas pelo Rito da Segunda Morte custam +1 AP neste turno. */
  ritoEncarece: 'turno:rito-encarece',
} as const;

export type ChaveDeAnotacao = (typeof CHAVE)[keyof typeof CHAVE];

/**
 * Origem usada quando a anotação é do próprio sistema de turno e não de uma
 * carta. O identificador não pertence ao catálogo de propósito.
 */
export const ORIGEM_DO_TURNO = cardId('sistema:turno');
