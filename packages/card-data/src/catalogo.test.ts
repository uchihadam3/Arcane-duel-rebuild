import { cardId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { CLASSES, PERSONAGEM_DA_CLASSE, ehPersonagem } from './classes.js';
import {
  CATALOGO,
  CLASSES_IMPLEMENTADAS,
  HABILIDADES_DO_GUERREIRO,
  HABILIDADES_DO_MAGO,
  perfilDaCarta,
} from './catalogo.js';

/*
 * O catálogo como fonte autoritativa.
 *
 * Estes testes prendem os identificadores às cartas. Reordenar um arquivo de
 * dados não pode trocar o código de nenhuma carta: um código é a identidade
 * dela, e replays antigos continuam falando desses códigos.
 */

const NOMES_DO_GUERREIRO: Readonly<Record<string, string>> = {
  W01: 'Corte de Sondagem',
  W02: 'Ombro de Guerra',
  W03: 'Quebra-Escudo',
  W04: 'Corte Ascendente',
  W05: 'Golpe do Carrasco',
  W06: 'Sequência Brutal',
  W07: 'Finta Cortante',
  W08: 'Golpe de Cerco',
  W09: 'Corte Encadeado',
  W10: 'Ataque de Oportunidade',
  W11: 'Pressão Implacável',
  W12: 'Disciplina de Aço',
  W13: 'Finta Calculada',
  W14: 'Guarda Preparada',
  W15: 'Aparar',
  W16: 'Base Firme',
  W17: 'Absorver o Golpe',
  W18: 'Ripostar',
  W19: 'Interposição',
  W20: 'Último Bastião',
  WP01: 'Instinto de Ferro',
  WP02: 'Sangue Aceso',
  WP03: 'Leitura de Combate',
  WP04: 'Predador de Ruptura',
  WP05: 'Dor em Força',
  WP06: 'Mestre da Defesa',
  WP07: 'Pressão de Veterano',
  WP08: 'Mão Pesada',
  WP09: 'Olho na Abertura',
  WP10: 'Guarda de Veterano',
  WC01: 'Postura da Fortaleza',
  WC02: 'Postura da Vanguarda',
  WC03: 'Postura do Duelista',
  WC04: 'Cerco Metódico',
  WC05: 'Contraofensiva',
  WC06: 'Ritmo de Batalha',
  WU01: 'Quebra-Reinos',
  WU02: 'Última Palavra',
  WU03: 'Sequência do Campeão',
};

const NOMES_DO_MAGO: Readonly<Record<string, string>> = {
  M01: 'Dardo Arcano',
  M02: 'Bola de Fogo',
  M03: 'Chama Persistente',
  M04: 'Pulso Cinético',
  M05: 'Lança Arcana',
  M06: 'Estilhaço de Gelo',
  M07: 'Onda Glacial',
  M08: 'Rajada Prismática',
  M09: 'Orbe Instável',
  M10: 'Explosão de Mana',
  M11: 'Canalizar',
  M12: 'Concentração Prismática',
  M13: 'Distorção Temporal',
  M14: 'Recalibrar Runa',
  M15: 'Barreira de Mana',
  M16: 'Imagem Espelhada',
  M17: 'Égide Cinética',
  M18: 'Armadura de Gelo',
  M19: 'Contrafeitiço',
  M20: 'Barreira Prismática',
  MP01: 'Reserva Arcana',
  MP02: 'Mente Calculista',
  MP03: 'Véu Prismático',
  MP04: 'Eco Rúnico',
  MP05: 'Concentração sob Pressão',
  MP06: 'Combustão Controlada',
  MP07: 'Frio Calculado',
  MP08: 'Geometria Rúnica',
  MP09: 'Reserva de Contramedidas',
  MP10: 'Núcleo Sobrecarregado',
  MC01: 'Runa de Cinzas',
  MC02: 'Runa da Geada',
  MC03: 'Runa do Eco',
  MC04: 'Runa da Égide',
  MC05: 'Runa do Conduíte',
  MC06: 'Runa Prismática',
  MU01: 'Meteoro',
  MU02: 'Zero Absoluto',
  MU03: 'Sobrecarga Temporal',
};

const NOMES_DO_CLERIGO: Readonly<Record<string, string>> = {
  C01: 'Golpe Consagrado',
  C02: 'Martelo do Julgamento',
  C03: 'Luz Punitiva',
  C04: 'Veredito Solar',
  C05: 'Lança da Aurora',
  C06: 'Julgamento Maior',
  C07: 'Cinzas do Pecado',
  C08: 'Oração Silenciosa',
  C09: 'Prece Restauradora',
  C10: 'Imposição das Mãos',
  C11: 'Bênção da Coragem',
  C12: 'Vigília',
  C13: 'Purificação',
  C14: 'Escudo da Fé',
  C15: 'Âncora Sagrada',
  C16: 'Intercessão',
  C17: 'Martírio',
  C18: 'Luz Refletida',
  C19: 'Absolvição',
  C20: 'Última Prece',
  CP01: 'Coração Misericordioso',
  CP02: 'Olho do Julgamento',
  CP03: 'Devoção Imóvel',
  CP04: 'Mártir Voluntário',
  CP05: 'Pureza Interior',
  CP06: 'Milagre Guardado',
  CP07: 'Liturgia Contínua',
  CP08: 'Escudo dos Fiéis',
  CP09: 'Justiça Restauradora',
  CP10: 'Segunda Luz',
  CC01: 'Doutrina da Misericórdia',
  CC02: 'Doutrina do Julgamento',
  CC03: 'Doutrina do Martírio',
  CC04: 'Incensário da Aurora',
  CC05: 'Sino do Santuário',
  CC06: 'Relicário dos Santos',
  CU01: 'Julgamento Celeste',
  CU02: 'Milagre da Aurora',
  CU03: 'Intercessão Divina',
};

const NOMES_DO_NECROMANTE: Readonly<Record<string, string>> = {
  N01: 'Flecha Óssea',
  N02: 'Lança de Ossos',
  N03: 'Toque Murchante',
  N04: 'Drenar Vitalidade',
  N05: 'Onda dos Mortos',
  N06: 'Ceifa Funesta',
  N07: 'Mão do Túmulo',
  N08: 'Roubo de Memória',
  N09: 'Ruína Sepulcral',
  N10: 'Colheita Profana',
  N11: 'Oferenda ao Túmulo',
  N12: 'Desenterrar',
  N13: 'Comandar os Mortos',
  N14: 'Selo Fúnebre',
  N15: 'Rito de Ossos',
  N16: 'Muralha de Ossos',
  N17: 'Véu dos Mortos',
  N18: 'Retorno Sepulcral',
  N19: 'Recusar a Morte',
  N20: 'Maldição Reflexa',
  NP01: 'Colecionador de Almas',
  NP02: 'Mestre do Murchar',
  NP03: 'Memória dos Mortos',
  NP04: 'Senhor dos Servos',
  NP05: 'Fome da Cripta',
  NP06: 'Guardião do Túmulo',
  NP07: 'Último Suspiro',
  NP08: 'Sacrifício Calculado',
  NP09: 'Paciência Sepulcral',
  NP10: 'Eco do Cemitério',
  NC01: 'Guardião Esquelético',
  NC02: 'Cão Tumular',
  NC03: 'Espectro Faminto',
  NC04: 'Mago Ósseo',
  NC05: 'Ghoul Devorador',
  NC06: 'Abominação Costurada',
  NU01: 'Ceifador de Almas',
  NU02: 'Rito da Segunda Morte',
  NU03: 'Morte Negada',
};

const NOMES_DO_PALADINO: Readonly<Record<string, string>> = {
  P01: 'Pancada de Escudo',
  P02: 'Corte Radiante',
  P03: 'Martelo do Juramento',
  P04: 'Golpe Consagrado',
  P05: 'Reprimenda',
  P06: 'Investida do Bastião',
  P07: 'Sentença Sagrada',
  P08: 'Golpe de Retaliação',
  P09: 'Romper a Linha',
  P10: 'Lâmina da Aurora',
  P11: 'Preparar o Bastião',
  P12: 'Consagrar Arma',
  P13: 'Renovar o Juramento',
  P14: 'Marcha Implacável',
  P15: 'Bloqueio de Torre',
  P16: 'Égide Sagrada',
  P17: 'Repreensão Divina',
  P18: 'Permanecer de Pé',
  P19: 'Escudo e Espada',
  P20: 'Não Passará',
  PP01: 'Muralha Viva',
  PP02: 'Fé no Aço',
  PP03: 'Justiça Imediata',
  PP04: 'Escudo do Justo',
  PP05: 'Convicção Ardente',
  PP06: 'Avanço Sagrado',
  PP07: 'Sem Recuo',
  PP08: 'Voto Cumprido',
  PP09: 'Guardião da Luz',
  PP10: 'Peso da Sentença',
  PC01: 'Juramento da Proteção',
  PC02: 'Juramento da Retribuição',
  PC03: 'Juramento da Conquista',
  PC04: 'Aura do Santuário',
  PC05: 'Aura da Coragem',
  PC06: 'Aura do Julgamento',
  PU01: 'Veredito do Sol',
  PU02: 'Fortaleza Inquebrável',
  PU03: 'Cruzada Final',
};

const NOMES_DO_LADINO: Readonly<Record<string, string>> = {
  L01: 'Corte Rápido',
  L02: 'Finta',
  L03: 'Corte Serrilhado',
  L04: 'Golpe nos Rins',
  L05: 'Estocada Sombria',
  L06: 'Punhalada Oportunista',
  L07: 'Corte de Tendão',
  L08: 'Execução Precisa',
  L09: 'Ataque de Desarme',
  L10: 'Golpe Final',
  L11: 'Preparar a Brecha',
  L12: 'Marcar o Alvo',
  L13: 'Sabotagem',
  L14: 'Passo Falso',
  L15: 'Esquiva',
  L16: 'Adaga de Aparar',
  L17: 'Bomba de Fumaça',
  L18: 'Escapar pelas Sombras',
  L19: 'Contra-ataque Sujo',
  L20: 'Instinto de Sobrevivência',
  LP01: 'Primeiro Sangue',
  LP02: 'Passos Invisíveis',
  LP03: 'Predador da Brecha',
  LP04: 'Mãos Rápidas',
  LP05: 'Sangue Frio',
  LP06: 'Olho para Reações',
  LP07: 'Ferida Aberta',
  LP08: 'Improvisador',
  LP09: 'Sem Testemunhas',
  LP10: 'Plano de Fuga',
  LC01: 'Método do Assassino',
  LC02: 'Método do Duelista',
  LC03: 'Método do Sabotador',
  LC04: 'Lâminas Serrilhadas',
  LC05: 'Frasco de Fumaça',
  LC06: 'Fio Oculto',
  LU01: 'Golpe Perfeito',
  LU02: 'Mil Cortes',
  LU03: 'Desaparecer',
};

const NOMES_DO_BARDO: Readonly<Record<string, string>> = {
  B01: 'Batida Marcial',
  B02: 'Corda Cortante',
  B03: 'Acorde Estridente',
  B04: 'Crescendo',
  B05: 'Nota Perfurante',
  B06: 'Refrão Cortante',
  B07: 'Dissonância',
  B08: 'Pancada de Compasso',
  B09: 'Arpejo de Guerra',
  B10: 'Afinar',
  B11: 'Improviso',
  B12: 'Preparar o Refrão',
  B13: 'Mudança de Tom',
  B14: 'Pausa Dramática',
  B15: 'Desafinar',
  B16: 'Contracanto',
  B17: 'Quebra de Ritmo',
  B18: 'Nota Sustentada',
  B19: 'Resposta Improvisada',
  B20: 'Coda Defensiva',
  BP01: 'Ouvido Absoluto',
  BP02: 'Crescendo Natural',
  BP03: 'Público Cativo',
  BP04: 'Harmonia Defensiva',
  BP05: 'Memória Musical',
  BP06: 'Ritmo Sustentado',
  BP07: 'Virtuose',
  BP08: 'Canção Inesquecível',
  BP09: 'Último Refrão',
  BP10: 'Silêncio Antes do Aplauso',
  BC01: 'Canção da Marcha',
  BC02: 'Canção do Lamento',
  BC03: 'Canção da Discórdia',
  BC04: 'Tambor de Guerra',
  BC05: 'Alaúde de Cristal',
  BC06: 'Flauta de Prata',
  BU01: 'Grande Finale',
  BU02: 'Bis',
  BU03: 'Silêncio da Plateia',
};

/**
 * A tabela de identificadores, uma entrada por classe implementada.
 *
 * Ela é transcrita de docs/CARD_CATALOG.md à mão, de propósito: é uma segunda
 * leitura do mesmo documento, e por isso consegue discordar dos arquivos de
 * dados quando um deles errar um nome ou trocar um código.
 */
const NOMES_POR_CLASSE: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  guerreiro: NOMES_DO_GUERREIRO,
  mago: NOMES_DO_MAGO,
  clerigo: NOMES_DO_CLERIGO,
  necromante: NOMES_DO_NECROMANTE,
  paladino: NOMES_DO_PALADINO,
  ladino: NOMES_DO_LADINO,
  bardo: NOMES_DO_BARDO,
};

/** Composição fixa do catálogo de qualquer classe (§3 e §27). */
const COMPOSICAO = [
  { tipo: 'ataque', minimo: 1 },
  { tipo: 'passiva', quantidade: 10 },
  { tipo: 'carta-de-classe', quantidade: 6 },
  { tipo: 'ultimate', quantidade: 3 },
] as const;

const CARTAS_POR_CLASSE = 39;

describe('catálogo oficial', () => {
  it('implementa, nesta etapa, exatamente as classes com catálogo e testes', () => {
    expect([...CLASSES_IMPLEMENTADAS]).toEqual([
      'guerreiro',
      'mago',
      'clerigo',
      'necromante',
      'paladino',
      'ladino',
      'bardo',
    ]);
  });

  it('tem 39 cartas jogáveis por classe implementada e nada além disso', () => {
    expect(CATALOGO.todas).toHaveLength(CLASSES_IMPLEMENTADAS.length * CARTAS_POR_CLASSE);
    for (const classe of CLASSES_IMPLEMENTADAS) {
      expect(CATALOGO.porClasse(classe), classe).toHaveLength(CARTAS_POR_CLASSE);
    }
  });

  it('não contém carta de Personagem: o documento não fornece os dados delas', () => {
    expect(CATALOGO.todas.some((carta) => carta.tipo === 'personagem')).toBe(false);
    for (const classe of CLASSES) {
      expect(CATALOGO.porId(classe.personagem), classe.id).toBeUndefined();
      expect(perfilDaCarta(classe.personagem), classe.id).toBeUndefined();
    }
  });

  it('dá a cada uma das doze classes um Personagem técnico e único', () => {
    const identificadores = CLASSES.map((classe) => classe.personagem);
    expect(identificadores).toHaveLength(12);
    expect(new Set(identificadores).size).toBe(12);
    expect(identificadores.every((carta) => ehPersonagem(carta))).toBe(true);
    expect(PERSONAGEM_DA_CLASSE.mago).toBe(
      CLASSES.find((classe) => classe.id === 'mago')?.personagem,
    );
    expect(ehPersonagem(cardId('W01'))).toBe(false);
  });

  it('tem 20 habilidades, 10 Passivas, 6 Cartas de Classe e 3 Ultimates por classe', () => {
    for (const classe of CLASSES_IMPLEMENTADAS) {
      const jogaveis = CATALOGO.porClasse(classe).filter((carta) =>
        ['ataque', 'tecnica', 'reacao'].includes(carta.tipo),
      );
      expect(jogaveis, classe).toHaveLength(20);
      for (const parte of COMPOSICAO) {
        if (!('quantidade' in parte)) continue;
        expect(CATALOGO.porClasseETipo(classe, parte.tipo), `${classe}/${parte.tipo}`).toHaveLength(
          parte.quantidade,
        );
      }
    }
  });

  it('prende cada identificador ao nome impresso da carta', () => {
    for (const classe of CLASSES_IMPLEMENTADAS) {
      const nomes = NOMES_POR_CLASSE[classe];
      expect(nomes, classe).toBeDefined();
      for (const [codigo, nome] of Object.entries(nomes ?? {})) {
        expect(CATALOGO.porId(cardId(codigo))?.nome, codigo).toBe(nome);
      }
      expect(Object.keys(nomes ?? {}), classe).toHaveLength(CARTAS_POR_CLASSE);
    }
  });

  it('não tem carta fora da tabela de identificadores', () => {
    const conhecidos = new Set(
      CLASSES_IMPLEMENTADAS.flatMap((classe) => Object.keys(NOMES_POR_CLASSE[classe] ?? {})),
    );
    for (const carta of CATALOGO.todas) {
      expect(conhecidos.has(carta.id), carta.id).toBe(true);
    }
  });

  it('não repete identificador entre classes', () => {
    const vistos = new Set<string>();
    for (const carta of CATALOGO.todas) {
      expect(vistos.has(carta.id), carta.id).toBe(false);
      vistos.add(carta.id);
    }
  });

  it('marca todo Feitiço do Mago como traço, nunca como tipo', () => {
    for (const carta of HABILIDADES_DO_MAGO) {
      expect(carta.tags, carta.id).toContain('feitico');
      expect(['ataque', 'tecnica', 'reacao']).toContain(carta.tipo);
    }
    for (const carta of HABILIDADES_DO_GUERREIRO) {
      expect(carta.tags, carta.id).toHaveLength(0);
    }
  });

  it('nenhuma Ultimate volta por cooldown', () => {
    for (const classe of CLASSES_IMPLEMENTADAS) {
      for (const carta of CATALOGO.porClasseETipo(classe, 'ultimate')) {
        expect(carta.cooldown, carta.id).toBeUndefined();
        expect(perfilDaCarta(carta.id)?.cooldown, carta.id).toBeNull();
      }
    }
  });

  it('toda habilidade imprime custo e zona de cooldown', () => {
    for (const carta of CATALOGO.todas) {
      if (!['ataque', 'tecnica', 'reacao'].includes(carta.tipo)) continue;
      expect(carta.custo, carta.id).toBeDefined();
      expect(carta.cooldown, carta.id).toBeDefined();
    }
  });

  it('Reação se paga com Reserva e o resto com pontos de Ação', () => {
    for (const carta of CATALOGO.todas) {
      const comporta = carta.comportaComo ?? carta.tipo;
      if (!['ataque', 'tecnica', 'reacao'].includes(comporta)) continue;
      const esperada = comporta === 'reacao' ? 'reserva' : 'ap';
      expect(carta.custo?.moeda, carta.id).toBe(esperada);
    }
  });

  it('Passiva e Carta de Classe não são jogadas da mão', () => {
    for (const carta of CATALOGO.todas) {
      if (carta.tipo !== 'passiva' && carta.tipo !== 'carta-de-classe') continue;
      expect(perfilDaCarta(carta.id), carta.id).toBeUndefined();
    }
  });

  it('toda Carta de Classe imprime os dois efeitos, Ativar e Exaurir', () => {
    for (const classe of CLASSES_IMPLEMENTADAS) {
      for (const carta of CATALOGO.porClasseETipo(classe, 'carta-de-classe')) {
        expect(carta.textoAtivar, carta.id).toBeTruthy();
        expect(carta.textoExaurir, carta.id).toBeTruthy();
        expect(carta.textoAtivar, carta.id).not.toBe(carta.textoExaurir);
      }
    }
  });
});
