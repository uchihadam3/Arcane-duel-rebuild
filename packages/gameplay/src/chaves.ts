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

  /* Paladino ------------------------------------------------------------ */
  /** O dono começou este turno com 2 de Reserva. */
  comecouTurnoComReserva2: 'turno:comecou-com-reserva-2',
  /** O dono começou este turno com a Guarda cheia. */
  comecouTurnoComGuardaCheia: 'turno:comecou-com-guarda-cheia',
  /**
   * O dono usou uma carta de Reação desde o fim do próprio último turno.
   *
   * Escopo de partida, e não de turno: a pergunta atravessa a fronteira do
   * turno de propósito, e quem apaga a marca é o fim do próprio turno.
   */
  usouReacaoNoTurnoInimigo: 'partida:reacao-desde-ultimo-turno',
  /** O dono perdeu Vida de um Ataque desde o fim do próprio último turno. */
  perdeuVidaDeAtaqueDesdeUltimoTurno: 'partida:perdeu-vida-desde-ultimo-turno',
  /** Renovar o Juramento tranca as demais Técnicas do turno. */
  tecnicaBloqueada: 'turno:tecnica-bloqueada',
  /** Desconto de AP guardado para o próximo Ataque do turno. */
  proximoAtaqueDescontoAp: 'turno:proximo-ataque-desconto-ap',
  /** O dono desceu voluntariamente de estado neste turno. */
  desceuVoluntariamenteNoTurno: 'turno:desceu-voluntariamente',
  /** Rodada em que o Cumprimento do Juramento foi satisfeito pela última vez. */
  cumprimentoNaRodada: 'partida:cumprimento-na-rodada',
  /** Quantas vezes o Cumprimento do Juramento já foi satisfeito na partida. */
  cumprimentosDoJuramento: 'partida:cumprimentos-do-juramento',
  /** Bônus guardado para o primeiro Ataque do **próximo** turno do dono. */
  primeiroAtaqueDoProximoTurnoDano: 'partida:primeiro-ataque-proximo-turno-dano',
  /** Degrau emprestado ao primeiro Ataque do próximo turno (Justiça Imediata). */
  degrauNoProximoTurno: 'partida:degrau-no-proximo-turno',
  /** Ataques que ainda devolvem 1 AP pela Cruzada Final neste turno. */
  cruzadaFinalRestante: 'turno:cruzada-final-restante',
  /** A Cruzada Final cobra a descida de estado no fim do turno. */
  cruzadaFinalDesce: 'partida:cruzada-final-desce',

  /* Ladino -------------------------------------------------------------- */
  /** Marca de Golpe sobre o adversário. Só pode existir uma. */
  marcaDeGolpe: 'partida:marca-de-golpe',
  /** Brecha prometida para quando a Ação resolver sem Reação do adversário. */
  brechaSeNaoHouverReacao: 'acao:brecha-sem-reacao',
  /** Bomba de Fumaça trancou as Cartas de Classe inimigas nesta Ação. */
  bombaDeFumaca: 'acao:bomba-de-fumaca',
  /** O adversário terminou o turno sem causar Dano à Vida do dono. */
  adversarioNaoCausouDano: 'partida:adversario-sem-dano',
  /** Uma habilidade do dono voltou do cooldown à mão fora do momento normal. */
  cartaVoltouCedo: 'turno:carta-voltou-cedo',
  /** Desconto de AP guardado para o primeiro Ataque do turno. */
  primeiroAtaqueMaisBarato: 'turno:primeiro-ataque-mais-barato',
  /** Reações do adversário nesta rodada, para o Olho para Reações. */
  reacoesInimigasNaRodada: 'partida:reacoes-inimigas-na-rodada',

  /* Bardo --------------------------------------------------------------- */
  /** Nota que o Afinar impôs à próxima Ação. A Nota entra no sufixo da chave. */
  notaSubstituta: 'turno:nota-substituta',
  /** Desconto de AP guardado para a próxima Ação do turno. */
  proximaAcaoDescontoAp: 'turno:proxima-acao-desconto-ap',
  /** Desconto de AP guardado para a próxima Ação de Nota diferente. */
  descontoSeNotaDiferente: 'turno:desconto-nota-diferente',
  /** Desafinar: a próxima Reação inimiga reduz 1 D e 1 I a menos. */
  desafinar: 'turno:desafinar',
  /** Quantas vezes a Canção já foi Ativada na partida. */
  ativacoesDaCancao: 'partida:ativacoes-da-cancao',
  /** Quantas vezes o Instrumento já foi Ativado na partida. */
  ativacoesDoInstrumento: 'partida:ativacoes-do-instrumento',
  /** O Bardo preparou o Silêncio: uma Ação só e 2 de Reserva no fim do turno. */
  preparouOSilencio: 'partida:preparou-o-silencio',
  /** Bônus guardado para o primeiro Ataque do próximo turno do Bardo. */
  primeiroAtaqueDoProximoTurnoImpacto: 'partida:primeiro-ataque-proximo-turno-impacto',
  /** Desconto guardado para a primeira Ação do próximo turno. */
  primeiraAcaoDoProximoTurnoMaisBarata: 'partida:primeira-acao-proximo-turno-barata',

  /* Monge --------------------------------------------------------------- */
  /** O Fluxo Interior já recuperou Chi neste turno. */
  fluxoInteriorNoTurno: 'turno:fluxo-interior',
  /** Um Kata foi completado neste turno. */
  kataCompletadoNoTurno: 'turno:kata-completado',
  /** Bônus guardado para a próxima Ação de Fluxo do turno. */
  proximoFluxoDano: 'turno:proximo-fluxo-dano',
  proximoFluxoImpacto: 'turno:proximo-fluxo-impacto',
  /** Bônus guardado para a próxima Finalização do turno. */
  proximaFinalizacaoDano: 'turno:proxima-finalizacao-dano',
  proximaFinalizacaoImpacto: 'turno:proxima-finalizacao-impacto',
  /** A próxima Finalização do turno custa 1 AP a menos. */
  finalizacaoMaisBarata: 'turno:finalizacao-mais-barata',
  /** A próxima Ação de Fluxo do turno custa 1 AP a menos. */
  fluxoMaisBarato: 'turno:fluxo-mais-barato',
  /** Bônus guardado para o próximo Ataque de Abertura do turno. */
  proximaAberturaImpacto: 'turno:proxima-abertura-impacto',
  /** A Disciplina do Passo já foi usada neste turno. */
  disciplinaDoPassoUsada: 'turno:disciplina-do-passo',
  /** A Postura do Rio já corrigiu uma sequência na partida. */
  posturaDoRioUsada: 'partida:postura-do-rio',

  /* Patrulheiro --------------------------------------------------------- */
  /** Quantas Marcas o Patrulheiro já aplicou na partida. */
  marcasAplicadas: 'partida:marcas-aplicadas',
  /** Quantas vezes a Marca já foi Explorada na partida. */
  marcasExploradas: 'partida:marcas-exploradas',
  /** A Marca foi Explorada neste turno. */
  explorouMarcaNoTurno: 'turno:explorou-marca',
  /** A Marca atravessou um turno inteiro sem ser Explorada. */
  marcaMantidaPorUmTurno: 'partida:marca-mantida',
  /** Ataque reservado pela Emboscada para a terceira Ação do próximo turno. */
  ataqueEmboscado: 'partida:ataque-emboscado',
  /** O Ataque em curso foi o preparado pela Emboscada. */
  usouAtaqueEmboscado: 'turno:usou-ataque-emboscado',
  /** Bônus guardado para o próximo Ataque contra alvo Marcado. */
  proximoAtaqueMarcadoDano: 'turno:proximo-ataque-marcado-dano',
  proximoAtaqueMarcadoImpacto: 'turno:proximo-ataque-marcado-impacto',
  /** Quantas vezes a Armadilha já foi Ativada na partida. */
  ativacoesDaArmadilha: 'partida:ativacoes-da-armadilha',
  /** Ataques que o adversário já concluiu neste turno. */
  ataquesInimigosNoTurno: 'turno:ataques-inimigos',
  /** A Marca foi aplicada nesta Ação, para o bônus da Pista Fresca. */
  marcaAplicadaNaAcao: 'acao:marca-aplicada',
  /** Paciência do Caçador prometeu o desconto, se a Marca sobreviver ao turno. */
  pacienciaDoCacador: 'turno:paciencia-do-cacador',

  /* Bárbaro ------------------------------------------------------------- */
  /** Reduções voluntárias de Guarda feitas na partida inteira. */
  reducoesVoluntariasNaPartida: 'partida:reducoes-voluntarias',
  /** O dono entrou em Enfurecido por reduzir a própria Guarda neste turno. */
  entrouEmEnfurecido: 'turno:entrou-em-enfurecido',
  /** O dono não pode restaurar Guarda por efeitos próprios neste turno. */
  proibidoRestaurarGuarda: 'turno:proibido-restaurar-guarda',
  /** Ataques que ainda recebem o bônus do Frenesi neste turno. */
  frenesiRestante: 'turno:frenesi-restante',
  /** Ataques que ainda saem mais baratos pelo Frenesi sem Freio. */
  frenesiSemFreioRestante: 'turno:frenesi-sem-freio',
  /** O próximo Ataque inimigo que causar Dano causa 1 D a menos (Totem do Urso). */
  totemDoUrso: 'partida:totem-do-urso',
  /** O Grito Ameaçador enfraquece a próxima Reação inimiga. */
  gritoAmeacador: 'turno:grito-ameacador',
  /**
   * Bônus prometido a "seu próximo Ataque" por um efeito que dispara **dentro**
   * de um Ataque. Ele só vira `proximoAtaqueDano` depois que a Ação atual
   * resolve — senão a própria Ação que o criou o consumiria.
   */
  proximoAtaqueDanoAdiado: 'turno:proximo-ataque-dano-adiado',

  /* Druida -------------------------------------------------------------- */
  /** O Druida mudou de forma neste turno. */
  mudouDeFormaNoTurno: 'turno:mudou-de-forma',
  /** Ações já realizadas em cada Forma neste turno. */
  acaoEmFormaHumana: 'turno:acao-em-forma-humana',
  acaoEmFormaSelvagem: 'turno:acao-em-forma-selvagem',
  /** O Druida não pode mais entrar em Forma Selvagem nesta partida. */
  selvagemTrancada: 'partida:selvagem-trancada',
  /** Bônus guardado para o próximo Ataque feito em Forma Selvagem. */
  proximoAtaqueSelvagemDano: 'turno:proximo-ataque-selvagem-dano',
  /** Casca de Carvalho reforça a primeira Resposta até o próximo turno. */
  cascaDeCarvalho: 'partida:casca-de-carvalho',
  /** Reforço do Círculo da Lua guardado para a ação seguinte à transformação. */
  circuloDaLuaAtaque: 'turno:circulo-da-lua-ataque',
  circuloDaLuaResposta: 'partida:circulo-da-lua-resposta',
  /** O Druida pode mudar de forma de graça na próxima abertura de turno. */
  metamorfoseExtra: 'partida:metamorfose-extra',

  /* Bruxo --------------------------------------------------------------- */
  /** Pontos de Vida que o dono perdeu como preço próprio neste turno. */
  vidaPerdidaComoCusto: 'turno:vida-perdida-como-custo',
  /** Prefixo por carta: "este preço em Vida veio desta origem neste turno". */
  custoDeVidaPorCarta: 'turno:custo-de-vida-por-carta',
  /** O dono pagou Vida como preço dentro da Ação em andamento. */
  vidaPagaNaAcao: 'acao:vida-paga',
  /** O Preço Proibido pagou o desconto desta Ação. */
  precoProibidoNaAcao: 'acao:preco-proibido',
  /** O Preço Proibido já foi usado alguma vez nesta partida. */
  usosDoPrecoProibido: 'partida:usos-do-preco-proibido',
  /** O Preço Proibido foi usado neste turno. */
  usouPrecoProibidoNoTurno: 'turno:usou-preco-proibido',
  /** Usos extras do Preço Proibido concedidos por carta neste turno. */
  precoProibidoExtra: 'turno:preco-proibido-extra',
  /** Ativações de Pacto e de Maldição contadas ao longo da partida. */
  ativacoesDoPacto: 'partida:ativacoes-do-pacto',
  ativacoesDaMaldicao: 'partida:ativacoes-da-maldicao',
  /** Uma Maldição foi Ativada neste turno. */
  maldicaoAtivadaNoTurno: 'turno:maldicao-ativada',
  /** Transferir a Dor fez os dois personagens perderem Vida neste turno. */
  transferiuADor: 'turno:transferiu-a-dor',
  /** O dono começou este turno com 5 de Vida ou menos. */
  comecouTurnoComVida5: 'turno:comecou-turno-vida-5',
  /** O Contrato Final ainda deve prontificar uma Carta de Classe Ativada. */
  contratoFinalProntifica: 'turno:contrato-final-prontifica',
  /** A Maldição da Agonia Exaurida ainda cobra a terceira Ação inimiga. */
  agoniaTerceiraAcao: 'turno:agonia-terceira-acao',
} as const;

export type ChaveDeAnotacao = (typeof CHAVE)[keyof typeof CHAVE];

/**
 * Origem usada quando a anotação é do próprio sistema de turno e não de uma
 * carta. O identificador não pertence ao catálogo de propósito.
 */
export const ORIGEM_DO_TURNO = cardId('sistema:turno');
