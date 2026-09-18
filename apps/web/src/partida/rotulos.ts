import type { CampoDeEscolha, OpcaoDeEscolha, ValorDeEscolha } from '@arcane-duel/gameplay/jogo';

import { nomeDaCarta } from './apresentacao.js';

/*
 * O rótulo de uma escolha, em português.
 *
 * A camada de interação devolve o campo e os valores que o motor aceita; o que
 * falta é dizê-los em palavras. A tabela é exaustiva por construção — um campo
 * novo em `EscolhasDaAcao` não compila sem a frase dele.
 */

export const PERGUNTA_DO_CAMPO: Readonly<Record<CampoDeEscolha, string>> = {
  recursoAdicional: 'Quanto gastar?',
  reforco: 'Reforçar o quê?',
  cartaDeClasse: 'Qual Carta de Classe?',
  cartaEmCooldown: 'Qual carta do seu cooldown?',
  cartasEmCooldown: 'Quais cartas do seu cooldown?',
  condicao: 'Qual Condição?',
  forma: 'Qual Forma?',
  precoProibido: 'Pagar o Preço Proibido?',
  vidaOferecida: 'Quanta Vida oferecer?',
  precoDaPassiva: 'Aceitar o preço da Passiva?',
  escolhaDoAbismo: 'O que a Boca do Abismo faz?',
  guardaReduzida: 'Quanta Guarda reduzir?',
  servo: 'Qual Servo?',
  bonusDoMilagre: 'Qual bônus do Milagre?',
  almasColhidas: 'Quantas Almas colher?',
  usarAlmaAnexada: 'Usar a Alma anexada?',
  divisao: 'Como dividir entre Dano e Impacto?',
  descontoDeRecurso: 'Quanto abater do custo?',
  cartaAdversariaEmCooldown: 'Qual carta do cooldown adversário?',
  cartaDaMao: 'Qual carta da sua mão?',
  descerEstado: 'Descer um estado de Convicção?',
  nota: 'Qual Nota?',
  passiva: 'Qual Passiva?',
  disciplinaDoPasso: 'Gastar 1 Chi para ignorar o aumento?',
  passoDeKata: 'Qual passo de Kata?',
  explorarMarca: 'Explorar a Marca da Presa?',
};

/** Rótulos de valores fechados que o catálogo imprime como palavras. */
const ROTULOS: Readonly<Record<string, string>> = {
  dano: 'Dano',
  impacto: 'Impacto',
  cura: 'Cura',
  vida: 'Vida',
  maldicao: 'Maldição',
  humana: 'Forma Humana',
  selvagem: 'Forma Selvagem',
  queimadura: 'Queimadura',
  lento: 'Lento',
  murchar: 'Murchar',
  sangramento: 'Sangramento',
  pulso: 'Pulso',
  melodia: 'Melodia',
  harmonia: 'Harmonia',
  abertura: 'Abertura',
  fluxo: 'Fluxo',
  finalizacao: 'Finalização',
};

const textoDoValor = (valor: ValorDeEscolha): string => {
  switch (valor.forma) {
    case 'carta':
      return nomeDaCarta(valor.carta);
    case 'cartas':
      return valor.cartas.map(nomeDaCarta).join(' e ');
    case 'numero':
      return String(valor.numero);
    case 'booleano':
      return valor.ligado ? 'Sim' : 'Não';
    case 'rotulo':
      return ROTULOS[valor.rotulo] ?? valor.rotulo;
    case 'divisao':
      return `${String(valor.dano)} de Dano e ${String(valor.impacto)} de Impacto`;
  }
};

export const rotuloDaOpcao = (opcao: OpcaoDeEscolha): string => textoDoValor(opcao.valor);
