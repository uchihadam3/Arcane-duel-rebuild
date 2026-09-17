import { cardId } from '@arcane-duel/shared-types';
import { describe, expect, it } from 'vitest';

import { CLASSES, PERSONAGEM_DA_CLASSE, ehPersonagem } from './classes.js';
import {
  CARTAS_DE_CLASSE_DO_GUERREIRO,
  CARTAS_DE_CLASSE_DO_MAGO,
  CATALOGO,
  CLASSES_IMPLEMENTADAS,
  HABILIDADES_DO_GUERREIRO,
  HABILIDADES_DO_MAGO,
  PASSIVAS_DO_GUERREIRO,
  PASSIVAS_DO_MAGO,
  ULTIMATES_DO_GUERREIRO,
  ULTIMATES_DO_MAGO,
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

describe('catálogo oficial', () => {
  it('implementa exatamente Guerreiro e Mago nesta etapa', () => {
    expect([...CLASSES_IMPLEMENTADAS]).toEqual(['guerreiro', 'mago']);
  });

  it('tem 78 cartas jogáveis, 39 por classe', () => {
    expect(CATALOGO.todas).toHaveLength(78);
    expect(CATALOGO.porClasse('guerreiro')).toHaveLength(39);
    expect(CATALOGO.porClasse('mago')).toHaveLength(39);
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
    expect(HABILIDADES_DO_GUERREIRO).toHaveLength(20);
    expect(PASSIVAS_DO_GUERREIRO).toHaveLength(10);
    expect(CARTAS_DE_CLASSE_DO_GUERREIRO).toHaveLength(6);
    expect(ULTIMATES_DO_GUERREIRO).toHaveLength(3);

    expect(HABILIDADES_DO_MAGO).toHaveLength(20);
    expect(PASSIVAS_DO_MAGO).toHaveLength(10);
    expect(CARTAS_DE_CLASSE_DO_MAGO).toHaveLength(6);
    expect(ULTIMATES_DO_MAGO).toHaveLength(3);
  });

  it('prende cada identificador ao nome impresso da carta', () => {
    for (const [codigo, nome] of Object.entries({ ...NOMES_DO_GUERREIRO, ...NOMES_DO_MAGO })) {
      expect(CATALOGO.porId(cardId(codigo))?.nome, codigo).toBe(nome);
    }
  });

  it('não tem carta fora da tabela de identificadores', () => {
    const conhecidos = new Set([...Object.keys(NOMES_DO_GUERREIRO), ...Object.keys(NOMES_DO_MAGO)]);
    for (const carta of CATALOGO.todas) {
      expect(conhecidos.has(carta.id), carta.id).toBe(true);
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
    for (const carta of [...ULTIMATES_DO_GUERREIRO, ...ULTIMATES_DO_MAGO]) {
      expect(carta.cooldown, carta.id).toBeUndefined();
      expect(perfilDaCarta(carta.id)?.cooldown, carta.id).toBeNull();
    }
  });

  it('toda habilidade imprime custo e zona de cooldown', () => {
    for (const carta of [...HABILIDADES_DO_GUERREIRO, ...HABILIDADES_DO_MAGO]) {
      expect(carta.custo, carta.id).toBeDefined();
      expect(carta.cooldown, carta.id).toBeDefined();
    }
  });

  it('Reação se paga com Reserva e o resto com pontos de Ação', () => {
    for (const carta of [...HABILIDADES_DO_GUERREIRO, ...HABILIDADES_DO_MAGO]) {
      const esperada = carta.tipo === 'reacao' ? 'reserva' : 'ap';
      expect(carta.custo?.moeda, carta.id).toBe(esperada);
    }
  });

  it('Passiva e Carta de Classe não são jogadas da mão', () => {
    const naoJogaveis = [
      ...PASSIVAS_DO_GUERREIRO,
      ...PASSIVAS_DO_MAGO,
      ...CARTAS_DE_CLASSE_DO_GUERREIRO,
      ...CARTAS_DE_CLASSE_DO_MAGO,
    ];
    for (const carta of naoJogaveis) {
      expect(perfilDaCarta(carta.id), carta.id).toBeUndefined();
    }
  });

  it('toda Carta de Classe imprime os dois efeitos, Ativar e Exaurir', () => {
    for (const carta of [...CARTAS_DE_CLASSE_DO_GUERREIRO, ...CARTAS_DE_CLASSE_DO_MAGO]) {
      expect(carta.textoAtivar, carta.id).toBeTruthy();
      expect(carta.textoExaurir, carta.id).toBeTruthy();
      expect(carta.textoAtivar, carta.id).not.toBe(carta.textoExaurir);
    }
  });
});
