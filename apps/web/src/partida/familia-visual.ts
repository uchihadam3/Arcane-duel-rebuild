import type { CardId, ClassId, TipoDeCarta } from '@arcane-duel/shared-types';
import type { FamiliaDeVfx } from '@arcane-duel/vfx';

import { cartaVisivel } from './apresentacao.js';

/*
 * De qual família visual é cada carta.
 *
 * Isto é direção de arte, e não regra: nada aqui muda custo, Dano, Impacto,
 * alcance ou condição. O que a tabela decide é do que o efeito é **feito** —
 * se o golpe levanta fragmentos ou se a magia desenha geometria.
 *
 * Ela é explícita, e não derivada do texto da carta, por uma razão de método:
 * ler o texto para adivinhar "isto parece fogo" seria interpretar a carta, e
 * interpretar carta é exatamente o que este projeto não faz fora do catálogo.
 * Quando uma carta usa fogo, ela usa fogo porque o catálogo diz, e a entrada
 * abaixo transcreve essa leitura uma vez só.
 *
 * As trinta cartas das Receitas 1 de Guerreiro e Mago têm entrada própria.
 * Todas as outras 438 caem no padrão da classe e do tipo — continuam legíveis
 * e jogáveis, com acabamento genérico, que é o escopo honesto desta etapa.
 */

const FAMILIA_DA_CARTA: Readonly<Record<string, FamiliaDeVfx>> = {
  /* --- Guerreiro, Quebra-Muralhas ---------------------------------- */
  W02: 'golpe-pesado', // Ombro de Guerra
  W03: 'fragmentos', // Quebra-Escudo — o efeito é contra a Guarda
  W08: 'pressao', // Golpe de Cerco
  W10: 'golpe-pesado', // Ataque de Oportunidade
  W11: 'pressao', // Pressão Implacável
  W15: 'guarda-marcial', // Aparar
  W16: 'guarda-marcial', // Base Firme
  W19: 'guarda-marcial', // Interposição
  WP04: 'fragmentos', // Predador de Ruptura
  WP08: 'golpe-pesado', // Mão Pesada
  WP07: 'pressao', // Pressão de Veterano
  WP01: 'momentum', // Instinto de Ferro
  WC02: 'momentum', // Postura da Vanguarda
  WC04: 'pressao', // Cerco Metódico
  WU01: 'fragmentos', // Quebra-Reinos

  /* --- Mago, Piromante ---------------------------------------------- */
  M01: 'dardo-arcano', // Dardo Arcano
  M02: 'fogo', // Bola de Fogo
  M03: 'fogo', // Chama Persistente
  M04: 'gelo', // Pulso Cinético — cinética, tonalidade fria
  M11: 'mana', // Canalizar
  M12: 'prisma', // Concentração Prismática
  M15: 'barreira-arcana', // Barreira de Mana
  M17: 'barreira-arcana', // Égide Cinética
  MP01: 'mana', // Reserva Arcana
  MP06: 'fogo', // Combustão Controlada
  MP08: 'runa', // Geometria Rúnica
  MP10: 'prisma', // Núcleo Sobrecarregado
  MC01: 'runa', // Runa de Cinzas
  MC05: 'runa', // Runa do Conduíte
  MU01: 'fogo', // Meteoro
};

/** O padrão de quem ainda não tem tratamento próprio. */
const PADRAO_DA_CLASSE: Readonly<Partial<Record<ClassId, FamiliaDeVfx>>> = {
  guerreiro: 'golpe-pesado',
  mago: 'dardo-arcano',
};

const PADRAO_DO_TIPO: Readonly<Record<TipoDeCarta, FamiliaDeVfx>> = {
  ataque: 'neutro',
  tecnica: 'neutro',
  reacao: 'neutro',
  passiva: 'neutro',
  'carta-de-classe': 'neutro',
  ultimate: 'neutro',
  personagem: 'neutro',
};

export const familiaDaCarta = (carta: CardId): FamiliaDeVfx => {
  const direta = FAMILIA_DA_CARTA[String(carta)];
  if (direta !== undefined) return direta;

  const visivel = cartaVisivel(carta);
  if (visivel === null) return 'neutro';
  return PADRAO_DA_CLASSE[visivel.classe] ?? PADRAO_DO_TIPO[visivel.tipo];
};

/** A Defesa Inata de cada classe, que não é carta e não pode fingir ser. */
export const FAMILIA_DA_DEFESA_INATA: Readonly<Partial<Record<ClassId, FamiliaDeVfx>>> = {
  guerreiro: 'guarda-marcial',
  mago: 'barreira-arcana',
};

export const familiaDaDefesaInata = (classe: ClassId): FamiliaDeVfx =>
  FAMILIA_DA_DEFESA_INATA[classe] ?? 'neutro';

/** As cartas com acabamento próprio nesta etapa, para o teste conferir a lista. */
export const CARTAS_DO_VERTICAL_SLICE: readonly string[] = Object.keys(FAMILIA_DA_CARTA);
