import type {
  CardId,
  ClassId,
  PlayerId,
  VisaoDaPartida,
  Zona,
  ZonaDeCooldown,
} from '@arcane-duel/shared-types';
import type { EventoUniversal } from '@arcane-duel/rules-engine';
import type { EventoDeApresentacao, LadoVisual } from '@arcane-duel/vfx';
import { eventoDeApresentacao } from '@arcane-duel/vfx';
import type { LadoDoCampo } from '@arcane-duel/ui';
import { chaveDaAncora } from '@arcane-duel/ui';

import { familiaDaCarta, familiaDaDefesaInata } from './familia-visual.js';
import { cartaVisivel, nomeDaCarta } from './apresentacao.js';

/*
 * Do evento do motor ao beat da tela.
 *
 * O roteiro lê os eventos canônicos que os comandos produziram e escreve a
 * sequência que a fila de apresentação vai tocar. Ele é uma função pura de
 * eventos: não chama comando, não muda estado e não decide nada da partida.
 *
 * A direção do fluxo importa. O motor nunca pergunta nada a este arquivo; se
 * ele deixar de existir, a partida continua exatamente igual — e muda.
 *
 * A privacidade atravessa daqui também: os eventos vêm do motor, então podem
 * carregar a carta que Preparar Emboscada guardou face-down. Um beat só
 * recebe `carta` quando o observador tem direito de saber qual é; caso
 * contrário ele descreve a **zona**, e a tela desenha o verso.
 */

export interface ContextoDoRoteiro {
  /** De quem é a tela. Decide o que é `proprio` e o que é `adversario`. */
  readonly observador: PlayerId;
  readonly classeDoObservador: ClassId;
  readonly classeDoAdversario: ClassId;
  /** Os identificadores que o observador tem direito de conhecer. */
  readonly cartasVisiveis: ReadonlySet<string>;
}

const ladoDe = (jogador: PlayerId, contexto: ContextoDoRoteiro): LadoVisual =>
  jogador === contexto.observador ? 'proprio' : 'adversario';

const ancora = (lado: LadoDoCampo, zona: Zona, indice = 0): string =>
  chaveDaAncora({ lado, zona, indice });

/** A trilha de cooldown é numerada no motor e nomeada no campo. */
const ZONA_DO_COOLDOWN: Readonly<Record<ZonaDeCooldown, Zona>> = { 1: 'cd1', 2: 'cd2', 3: 'cd3' };

const podeVer = (carta: CardId, contexto: ContextoDoRoteiro): boolean =>
  contexto.cartasVisiveis.has(String(carta));

const classeDoLado = (lado: LadoVisual, contexto: ContextoDoRoteiro): ClassId =>
  lado === 'proprio' ? contexto.classeDoObservador : contexto.classeDoAdversario;

/**
 * A família de um evento que nasce de uma carta.
 *
 * Quando o observador não pode conhecer a carta, o efeito não pode revelar a
 * família dela — isso vazaria informação por cor. Nesse caso ele usa a família
 * padrão da classe, que já é pública.
 */
const familiaDoEvento = (
  carta: CardId | null,
  lado: LadoVisual,
  contexto: ContextoDoRoteiro,
): EventoDeApresentacao['familia'] => {
  if (carta !== null && podeVer(carta, contexto)) return familiaDaCarta(carta);
  return familiaDaDefesaInata(classeDoLado(lado, contexto));
};

const nomeVisivel = (carta: CardId, contexto: ContextoDoRoteiro): string | null =>
  podeVer(carta, contexto) ? nomeDaCarta(carta) : null;

/** Cartas cuja entrada merece apresentação ampliada, e não um beat comum. */
const mereceApresentacao = (carta: CardId): boolean => {
  const visivel = cartaVisivel(carta);
  return visivel?.tipo === 'ultimate';
};

/**
 * Escreve a sequência de um lote de eventos.
 *
 * `prefixo` distingue lotes: dois impactos iguais em turnos diferentes
 * precisam de identidades diferentes, senão a fila reaproveita o efeito do
 * anterior.
 */
export const roteirizar = (
  eventos: readonly EventoUniversal[],
  contexto: ContextoDoRoteiro,
  prefixo: string,
): readonly EventoDeApresentacao[] => {
  const beats: EventoDeApresentacao[] = [];
  let passo = 0;
  const id = (nome: string): string => {
    passo += 1;
    return `${prefixo}:${String(passo)}:${nome}`;
  };

  /* A última Ação declarada, para o impacto saber de onde o efeito sai. */
  let origemDoAtaque: string | null = null;
  let familiaDoAtaque: EventoDeApresentacao['familia'] = 'neutro';
  let ladoDoAtacante: LadoVisual = 'proprio';
  let viajou = false;

  for (const evento of eventos) {
    switch (evento.tipo) {
      case 'turno-iniciado': {
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id('turno'), {
            tipo: 'banner-de-turno',
            lado,
            rotulo: `Turno ${String(evento.numero)}`,
            som: 'mudar-turno',
          }),
        );
        break;
      }

      case 'acao-declarada': {
        const lado = ladoDe(evento.jogador, contexto);
        const visivel = podeVer(evento.carta, contexto);
        origemDoAtaque = ancora(lado, 'acao', evento.indice);
        familiaDoAtaque = familiaDoEvento(evento.carta, lado, contexto);
        ladoDoAtacante = lado;
        viajou = false;

        beats.push(
          eventoDeApresentacao(id('declaracao'), {
            tipo: 'declaracao',
            lado,
            familia: familiaDoAtaque,
            origem: ancora(lado, 'mao'),
            destino: origemDoAtaque,
            carta: visivel ? String(evento.carta) : null,
            rotulo: nomeVisivel(evento.carta, contexto),
            som: 'colocar-carta-em-acao',
          }),
        );

        if (visivel && mereceApresentacao(evento.carta)) {
          beats.push(
            eventoDeApresentacao(id('ultimate'), {
              tipo: 'ultimate',
              lado,
              familia: familiaDoAtaque,
              origem: origemDoAtaque,
              destino: ancora(lado === 'proprio' ? 'adversario' : 'proprio', 'personagem'),
              carta: String(evento.carta),
              rotulo: nomeDaCarta(evento.carta),
              som: 'usar-ultimate',
            }),
          );
        }
        break;
      }

      case 'resposta-registrada': {
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id('resposta'), {
            tipo: 'resposta',
            lado,
            familia: familiaDaDefesaInata(classeDoLado(lado, contexto)),
            origem: ancora(lado, 'mao'),
            destino: ancora(lado, 'resposta', evento.indice),
            som: 'declarar-reacao',
          }),
        );
        break;
      }

      case 'defesa-inata-usada': {
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id('defesa-inata'), {
            tipo: 'resposta',
            lado,
            familia: familiaDaDefesaInata(classeDoLado(lado, contexto)),
            origem: ancora(lado, 'personagem'),
            destino: ancora(lado, 'resposta', 0),
            som: 'declarar-reacao',
          }),
        );
        break;
      }

      case 'impacto-aplicado': {
        const lado = ladoDe(evento.alvo, contexto);
        const destino = ancora(lado, 'personagem');
        if (!viajou && origemDoAtaque !== null) {
          viajou = true;
          beats.push(
            eventoDeApresentacao(id('viagem'), {
              tipo: 'viagem',
              lado: ladoDoAtacante,
              familia: familiaDoAtaque,
              origem: origemDoAtaque,
              destino,
            }),
          );
        }
        const perdeu = evento.guardaAntes - evento.guardaDepois;
        beats.push(
          eventoDeApresentacao(id('impacto'), {
            tipo: 'impacto',
            lado,
            familia: familiaDoAtaque,
            origem: origemDoAtaque,
            destino,
            som: 'aplicar-impacto',
          }),
        );
        if (perdeu > 0) {
          beats.push(
            eventoDeApresentacao(id('numero-guarda'), {
              tipo: 'numero-flutuante',
              lado,
              familia: familiaDoAtaque,
              destino,
              valores: [{ rotulo: 'GUARDA', valor: -perdeu, tom: 'guarda' }],
            }),
          );
        }
        break;
      }

      case 'ruptura': {
        const lado = ladoDe(evento.alvo, contexto);
        const destino = ancora(lado, 'personagem');
        beats.push(
          eventoDeApresentacao(id('ruptura'), {
            tipo: 'ruptura',
            lado,
            familia: 'fragmentos',
            origem: origemDoAtaque,
            destino,
            rotulo: 'RUPTURA',
            valores:
              evento.danoAdicional > 0
                ? [{ rotulo: '+DANO', valor: evento.danoAdicional, tom: 'ruptura' }]
                : [],
            som: 'ruptura',
          }),
        );
        break;
      }

      case 'dano-aplicado': {
        const lado = ladoDe(evento.alvo, contexto);
        const destino = ancora(lado, 'personagem');
        if (!viajou && origemDoAtaque !== null) {
          viajou = true;
          beats.push(
            eventoDeApresentacao(id('viagem'), {
              tipo: 'viagem',
              lado: ladoDoAtacante,
              familia: familiaDoAtaque,
              origem: origemDoAtaque,
              destino,
            }),
          );
        }
        beats.push(
          eventoDeApresentacao(id('dano'), {
            tipo: 'impacto',
            lado,
            familia: familiaDoAtaque,
            origem: origemDoAtaque,
            destino,
            som: 'aplicar-dano',
          }),
          eventoDeApresentacao(id('numero-vida'), {
            tipo: 'numero-flutuante',
            lado,
            familia: familiaDoAtaque,
            destino,
            valores: [{ rotulo: 'VIDA', valor: -evento.valor, tom: 'vida' }],
          }),
        );
        break;
      }

      case 'vida-perdida': {
        const lado = ladoDe(evento.alvo, contexto);
        beats.push(
          eventoDeApresentacao(id('vida-perdida'), {
            tipo: 'numero-flutuante',
            lado,
            familia: familiaDoEvento(evento.origem, lado, contexto),
            destino: ancora(lado, 'personagem'),
            valores: [{ rotulo: 'VIDA', valor: -evento.valor, tom: 'vida' }],
          }),
        );
        break;
      }

      case 'vida-restaurada': {
        if (evento.restaurado <= 0) break;
        const lado = ladoDe(evento.alvo, contexto);
        beats.push(
          eventoDeApresentacao(id('cura'), {
            tipo: 'numero-flutuante',
            lado,
            familia: familiaDoEvento(evento.origem, lado, contexto),
            destino: ancora(lado, 'personagem'),
            valores: [{ rotulo: 'VIDA', valor: evento.restaurado, tom: 'cura' }],
          }),
        );
        break;
      }

      case 'passiva-revelada': {
        const lado = ladoDe(evento.jogador, contexto);
        const visivel = podeVer(evento.carta, contexto);
        beats.push(
          eventoDeApresentacao(id('passiva-revelada'), {
            tipo: 'passiva-revelada',
            lado,
            familia: familiaDoEvento(evento.carta, lado, contexto),
            origem: ancora(lado, 'passiva'),
            carta: visivel ? String(evento.carta) : null,
            rotulo: nomeVisivel(evento.carta, contexto),
            som: 'revelar-passiva',
          }),
        );
        break;
      }

      case 'passiva-ativada': {
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id('passiva-ativada'), {
            tipo: 'passiva-ativada',
            lado,
            familia: familiaDoEvento(evento.carta, lado, contexto),
            origem: ancora(lado, 'passiva'),
            carta: podeVer(evento.carta, contexto) ? String(evento.carta) : null,
            som: 'ativar-carta-de-classe',
          }),
        );
        break;
      }

      case 'carta-de-classe-ativada': {
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id('classe-ativada'), {
            tipo: 'classe-ativada',
            lado,
            familia: familiaDoEvento(evento.carta, lado, contexto),
            origem: ancora(lado, 'carta-de-classe'),
            carta: String(evento.carta),
            rotulo: nomeVisivel(evento.carta, contexto),
            som: 'ativar-carta-de-classe',
          }),
        );
        break;
      }

      case 'carta-de-classe-exaurida': {
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id('classe-exaurida'), {
            tipo: 'classe-exaurida',
            lado,
            familia: familiaDoEvento(evento.carta, lado, contexto),
            origem: ancora(lado, 'carta-de-classe'),
            destino: ancora(lado, 'removidas'),
            carta: String(evento.carta),
            rotulo: nomeVisivel(evento.carta, contexto),
            som: 'exaurir-carta-de-classe',
          }),
        );
        break;
      }

      case 'ultimate-consumida': {
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id('ultimate-carta'), {
            tipo: 'apresentacao-de-carta',
            lado,
            familia: familiaDoEvento(evento.carta, lado, contexto),
            origem: ancora(lado, 'ultimate'),
            carta: String(evento.carta),
            rotulo: nomeVisivel(evento.carta, contexto),
          }),
        );
        break;
      }

      case 'condicao-aplicada': {
        const lado = ladoDe(evento.alvo, contexto);
        beats.push(
          eventoDeApresentacao(id(`condicao-${evento.condicao}`), {
            tipo: 'condicao-aplicada',
            lado,
            familia: evento.condicao === 'queimadura' ? 'fogo' : 'gelo',
            origem: ancora(lado, 'condicoes'),
            destino: ancora(lado, 'personagem'),
            rotulo: `${evento.condicao} ${String(evento.total)}`,
          }),
        );
        break;
      }

      case 'condicao-resolvida': {
        if (evento.vidaPerdida <= 0) break;
        const lado = ladoDe(evento.alvo, contexto);
        beats.push(
          eventoDeApresentacao(id(`tick-${evento.condicao}`), {
            tipo: 'condicao-tick',
            lado,
            familia: evento.condicao === 'queimadura' ? 'fogo' : 'gelo',
            destino: ancora(lado, 'personagem'),
            valores: [{ rotulo: 'VIDA', valor: -evento.vidaPerdida, tom: 'vida' }],
          }),
        );
        break;
      }

      case 'recurso-alterado': {
        if (evento.delta === 0) break;
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id(`recurso-${evento.recurso}`), {
            tipo: 'recurso',
            lado,
            familia: evento.recurso === 'momentum' ? 'momentum' : 'mana',
            origem: ancora(lado, 'personagem'),
            valores: [
              { rotulo: evento.recurso.toUpperCase(), valor: evento.delta, tom: 'recurso' },
            ],
          }),
        );
        break;
      }

      case 'carta-para-cooldown': {
        const lado = ladoDe(evento.jogador, contexto);
        beats.push(
          eventoDeApresentacao(id('cooldown'), {
            tipo: 'cooldown',
            lado,
            familia: familiaDoEvento(evento.carta, lado, contexto),
            origem: ancora(lado, 'acao'),
            destino: ancora(lado, ZONA_DO_COOLDOWN[evento.zona]),
            carta: String(evento.carta),
          }),
        );
        break;
      }

      case 'partida-encerrada': {
        const lado = evento.vencedor === null ? 'proprio' : ladoDe(evento.vencedor, contexto);
        beats.push(
          eventoDeApresentacao(id('vitoria'), {
            tipo: 'vitoria',
            lado,
            familia: familiaDaDefesaInata(classeDoLado(lado, contexto)),
            origem: ancora(lado, 'personagem'),
            som: lado === 'proprio' ? 'vitoria' : 'derrota',
          }),
        );
        break;
      }

      default:
        break;
    }
  }

  return beats;
};

/**
 * Tudo o que este observador pode conhecer, lido da própria projeção.
 *
 * É a forma mais segura de responder "posso mostrar esta carta?": em vez de
 * uma lista escrita à mão, que envelheceria, a resposta vem do único lugar que
 * já passou pelo filtro de privacidade. Uma carta que a projeção não entrega
 * não aparece aqui — e, por consequência, não aparece em efeito nenhum.
 */
export const cartasConhecidas = (visao: VisaoDaPartida): ReadonlySet<string> => {
  const conhecidas = new Set<string>();
  for (const jogador of visao.jogadores) {
    conhecidas.add(String(jogador.personagem));
    conhecidas.add(String(jogador.ultimate.carta));
    for (const equipada of jogador.cartasDeClasse) conhecidas.add(String(equipada.carta));
    for (const passiva of jogador.passivas) {
      if (passiva.carta.visivel) conhecidas.add(String(passiva.carta.carta));
    }
    for (const carta of jogador.mao) {
      if (carta.visivel) conhecidas.add(String(carta.carta));
    }
    for (const zona of [1, 2, 3] as const) {
      for (const carta of jogador.cooldown[zona]) conhecidas.add(String(carta));
    }
    for (const carta of jogador.removidas) conhecidas.add(String(carta));
    for (const slot of jogador.acoes) {
      if (slot.perfil !== null) conhecidas.add(String(slot.perfil.carta));
      const resposta = slot.resposta.voluntaria;
      if (resposta !== null && resposta.tipo === 'carta-de-reacao') {
        conhecidas.add(String(resposta.perfil.carta));
      }
    }
  }
  return conhecidas;
};
