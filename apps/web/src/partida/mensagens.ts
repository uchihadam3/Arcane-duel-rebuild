import type { ErroDeDominio } from '@arcane-duel/rules-engine';

import { nomeDaCarta } from './apresentacao.js';

/*
 * A recusa do motor, dita para uma pessoa.
 *
 * O erro tipado continua sendo o erro tipado: ele não é convertido, não é
 * simplificado e não é engolido. O que muda é só o que aparece na tela —
 * "Você precisa de mais 1 AP." em vez de `{"tipo":"ap-insuficiente"}`.
 *
 * A tradução é exaustiva por construção: o `switch` cobre a união inteira e o
 * compilador acusa quando um erro novo entra no motor sem frase.
 */

const plural = (quantidade: number, singular: string, muitos: string): string =>
  quantidade === 1 ? singular : muitos;

export const textoDoErro = (erro: ErroDeDominio): string => {
  switch (erro.tipo) {
    case 'partida-nao-iniciada':
      return 'A partida ainda não começou.';
    case 'partida-ja-iniciada':
      return 'A partida já começou.';
    case 'partida-encerrada':
      return 'A partida já terminou.';
    case 'jogador-desconhecido':
      return 'Esse jogador não está nesta partida.';
    case 'turno-nao-iniciado':
      return 'O turno ainda não começou.';
    case 'turno-ja-iniciado':
      return 'O turno já começou.';
    case 'fora-do-turno':
      return 'Não é a sua vez.';
    case 'limite-de-acoes-atingido':
      return `Você já usou as suas ${String(erro.limite)} Ações neste turno.`;
    case 'ap-insuficiente': {
      const faltam = erro.necessario - erro.disponivel;
      return `Você precisa de mais ${String(faltam)} ${plural(faltam, 'AP', 'AP')}.`;
    }
    case 'reserva-insuficiente': {
      const faltam = erro.necessario - erro.disponivel;
      return `Você precisa de mais ${String(faltam)} de Reserva.`;
    }
    case 'carta-fora-da-mao':
      return `${nomeDaCarta(erro.carta)} não está na sua mão.`;
    case 'moeda-de-custo-invalida':
      return erro.esperada === 'reserva'
        ? 'Essa carta é paga com Reserva.'
        : 'Essa carta é paga com pontos de Ação.';
    case 'tipo-de-carta-invalido':
      return `${nomeDaCarta(erro.carta)} não pode ser usada assim.`;
    case 'acao-inexistente':
      return 'Esse espaço de Ação não existe.';
    case 'acao-nao-declarada':
      return 'Não há Ação declarada nesse espaço.';
    case 'acao-ja-resolvida':
      return 'Essa Ação já foi resolvida.';
    case 'segunda-resposta-voluntaria':
      return 'Você só pode usar uma Resposta voluntária contra cada Ação.';
    case 'passiva-desconhecida':
      return 'Essa Passiva não está na sua build.';
    case 'passiva-ainda-oculta':
      return `${nomeDaCarta(erro.carta)} ainda não foi revelada.`;
    case 'passiva-ja-revelada':
      return `${nomeDaCarta(erro.carta)} já está revelada.`;
    case 'passiva-nao-esta-pronta':
      return `${nomeDaCarta(erro.carta)} não está Pronta.`;
    case 'carta-de-classe-desconhecida':
      return 'Essa Carta de Classe não está na sua build.';
    case 'carta-de-classe-nao-esta-pronta':
      return `${nomeDaCarta(erro.carta)} não está Pronta.`;
    case 'carta-de-classe-ja-exaurida':
      return `${nomeDaCarta(erro.carta)} foi Exaurida e saiu da partida.`;
    case 'carta-de-classe-ja-usada-nesta-acao':
      return `${nomeDaCarta(erro.carta)} já foi usada nesta Ação.`;
    case 'ultimate-ja-consumida':
      return 'A sua Ultimate já foi usada nesta partida.';
    case 'recurso-insuficiente': {
      const faltam = erro.necessario - erro.disponivel;
      return `Falta ${String(faltam)} de ${erro.recurso}.`;
    }
    case 'recurso-indisponivel':
      return `A sua classe não usa ${erro.recurso}.`;
    case 'carta-desconhecida':
      return 'Essa carta não existe no catálogo.';
    case 'carta-fora-da-build':
      return `${nomeDaCarta(erro.carta)} não faz parte da sua build.`;
    case 'carta-de-outra-classe':
      return `${nomeDaCarta(erro.carta)} é de outra classe.`;
    case 'composicao-invalida':
      return 'A build não tem a composição exigida.';
    case 'carta-repetida-na-build':
      return 'A build repete uma carta.';
    case 'tipo-invalido-no-slot':
      return 'Essa carta não cabe nesse espaço da build.';
    case 'personagem-em-slot-jogavel':
      return 'O Personagem não é uma carta jogável.';
    case 'personagem-invalido':
      return 'O Personagem não é o da classe escolhida.';
    case 'escolha-invalida':
      return `${nomeDaCarta(erro.carta)}: ${erro.detalhe}.`;
    case 'escolha-obrigatoria':
      return `${nomeDaCarta(erro.carta)}: ${erro.detalhe}.`;
    case 'escolha-pendente':
      return `Resolva primeiro a escolha de ${nomeDaCarta(erro.origem)}.`;
    case 'sem-escolha-pendente':
      return 'Não há escolha pendente para resolver.';
    case 'condicao-de-uso-nao-satisfeita':
      return `${nomeDaCarta(erro.carta)}: ${erro.detalhe}.`;
    case 'acao-extra-nao-liberada':
      return 'Você só tem três Ações neste turno.';
    case 'defesa-inata-ja-usada':
      return 'Você já usou a sua Defesa Inata neste turno.';
    case 'carta-fora-do-cooldown':
      return `${nomeDaCarta(erro.carta)} não está no cooldown.`;
    case 'condicao-acima-do-limite':
      return `Essa Condição não passa de ${String(erro.limite)}.`;
    case 'interacao-nao-definida':
      // O motor recusa porque o documento não define a interação. A tela diz
      // exatamente isso: não é bug, não é jogada ilegal, é regra em aberto.
      return 'Interação ainda não definida pelas regras.';
  }
};
