import type {
  CardId,
  CondicaoId,
  EscolhasDaAcao,
  EstadoDaPartida,
  EstadoDeJogador,
  FormaDoDruida,
  IndiceDeAcao,
  Nota,
  PassoDeKata,
  PerfilDeHabilidade,
  PlayerId,
} from '@arcane-duel/shared-types';
import { CONDICOES } from '@arcane-duel/shared-types';
import type { ErroDeDominio } from '@arcane-duel/rules-engine';
import { perfilDaCarta } from '@arcane-duel/card-data';

import { emboscadaArmada } from '@arcane-duel/rules-engine';

import type { PedidoDeAcao, PedidoDeResposta } from './partida.js';
import { declarar, responder } from './partida.js';

/*
 * A camada de interação: o que a interface pode perguntar ao motor.
 *
 * Existe uma tentação óbvia ao escrever a tela de partida — reimplementar, em
 * React, "esta carta pode ser jogada?" e "esta carta pede qual escolha?". Isso
 * seria um segundo motor de regras, e dois motores divergem no dia seguinte.
 *
 * Aqui não há regra nenhuma. O que existe é uma pergunta feita ao motor de
 * verdade: o comando é executado sobre uma cópia do estado e o resultado é
 * jogado fora. Como os comandos são funções puras de estado, "simular para
 * perguntar" custa microssegundos e **não pode divergir**, porque é o mesmo
 * código que decide de verdade quando o jogador confirma.
 *
 * A única coisa que esta camada conhece é a forma dos dados: quais campos de
 * escolha existem (`keyof EscolhasDaAcao`, exaustivo por tipo) e de onde saem
 * os valores candidatos de cada um (a mão, o cooldown, a trilha — sempre o
 * estado autoritativo). Qual deles a carta quer, e qual valor ela aceita, quem
 * responde é o motor.
 */

export type CampoDeEscolha = keyof EscolhasDaAcao;

/**
 * O valor de uma escolha, em forma que a interface consegue rotular sem
 * inspecionar tipo em tempo de execução e sem `any`.
 */
export type ValorDeEscolha =
  | { readonly forma: 'carta'; readonly carta: CardId }
  | { readonly forma: 'cartas'; readonly cartas: readonly CardId[] }
  | { readonly forma: 'numero'; readonly numero: number }
  | { readonly forma: 'booleano'; readonly ligado: boolean }
  | { readonly forma: 'rotulo'; readonly rotulo: string }
  | { readonly forma: 'divisao'; readonly dano: number; readonly impacto: number };

export interface OpcaoDeEscolha {
  readonly campo: CampoDeEscolha;
  /** Identidade estável da opção, para listas e para testes. */
  readonly chave: string;
  readonly valor: ValorDeEscolha;
  /** O pedaço de `EscolhasDaAcao` que esta opção representa. */
  readonly fragmento: EscolhasDaAcao;
}

/** O que falta para a jogada sair, segundo o próprio motor. */
export type SituacaoDaJogada =
  | { readonly estado: 'pronta' }
  | {
      readonly estado: 'faltam-escolhas';
      readonly campo: CampoDeEscolha;
      readonly carta: CardId;
      /** O texto que o motor usou para descrever a exigência. */
      readonly detalhe: string;
      readonly opcoes: readonly OpcaoDeEscolha[];
    }
  | { readonly estado: 'recusada'; readonly erro: ErroDeDominio };

/* ------------------------------------------------------------------ */
/* Valores candidatos                                                  */
/* ------------------------------------------------------------------ */

const opcao = (
  campo: CampoDeEscolha,
  chave: string,
  valor: ValorDeEscolha,
  fragmento: EscolhasDaAcao,
): OpcaoDeEscolha => ({ campo, chave, valor, fragmento });

const daCarta = (campo: CampoDeEscolha, cartas: readonly CardId[]) =>
  cartas.map((carta) => opcao(campo, String(carta), { forma: 'carta', carta }, { [campo]: carta }));

const doRotulo = (campo: CampoDeEscolha, rotulos: readonly string[]) =>
  rotulos.map((rotulo) => opcao(campo, rotulo, { forma: 'rotulo', rotulo }, { [campo]: rotulo }));

const doBooleano = (campo: CampoDeEscolha) =>
  [true, false].map((ligado) =>
    opcao(campo, String(ligado), { forma: 'booleano', ligado }, { [campo]: ligado }),
  );

const doNumero = (campo: CampoDeEscolha, de: number, ate: number) => {
  const opcoes: OpcaoDeEscolha[] = [];
  for (let n = de; n <= ate; n += 1) {
    opcoes.push(opcao(campo, String(n), { forma: 'numero', numero: n }, { [campo]: n }));
  }
  return opcoes;
};

const cooldownDe = (jogador: EstadoDeJogador): readonly CardId[] => [
  ...jogador.cooldown[1],
  ...jogador.cooldown[2],
  ...jogador.cooldown[3],
];

/** Pares de divisão que somam no máximo o teto impresso mais alto do catálogo. */
const DIVISOES: readonly OpcaoDeEscolha[] = (() => {
  const lista: OpcaoDeEscolha[] = [];
  for (let total = 0; total <= 3; total += 1) {
    for (let dano = 0; dano <= total; dano += 1) {
      const impacto = total - dano;
      lista.push(
        opcao(
          'divisao',
          `${String(dano)}-${String(impacto)}`,
          { forma: 'divisao', dano, impacto },
          { divisao: { dano, impacto } },
        ),
      );
    }
  }
  return lista;
})();

export interface ContextoDasOpcoes {
  readonly jogador: EstadoDeJogador;
  readonly adversario: EstadoDeJogador;
  /** O perfil impresso da carta que está sendo jogada, quando há uma. */
  readonly perfil: PerfilDeHabilidade | null;
}

const FORMAS: readonly FormaDoDruida[] = ['humana', 'selvagem'];
const NOTAS: readonly Nota[] = ['pulso', 'melodia', 'harmonia'];
const PASSOS: readonly PassoDeKata[] = ['abertura', 'fluxo', 'finalizacao'];
const CONDICOES_ESCOLHIVEIS: readonly CondicaoId[] = CONDICOES;

/**
 * De onde sai o valor candidato de cada campo.
 *
 * A tabela é exaustiva por construção — `Record<CampoDeEscolha, ...>` obriga
 * quem acrescentar um campo a dizer de onde ele vem. Ela **não** decide
 * legalidade: só diz o que existe na mesa. Quem aceita ou recusa é o motor.
 */
const CANDIDATOS: Readonly<
  Record<CampoDeEscolha, (contexto: ContextoDasOpcoes) => readonly OpcaoDeEscolha[]>
> = {
  recursoAdicional: ({ perfil }) => {
    const variavel = perfil?.custo.variavel;
    return variavel === undefined
      ? doNumero('recursoAdicional', 0, 3)
      : doNumero('recursoAdicional', variavel.minimo, variavel.maximo);
  },
  reforco: () => doRotulo('reforco', ['dano', 'impacto'] as const),
  cartaDeClasse: ({ jogador }) =>
    daCarta(
      'cartaDeClasse',
      jogador.cartasDeClasse.map((item) => item.carta),
    ),
  cartaEmCooldown: ({ jogador }) => daCarta('cartaEmCooldown', cooldownDe(jogador)),
  cartasEmCooldown: ({ jogador }) => {
    // "Até duas": a interface monta o par, e o motor confere o teto impresso.
    const cartas = cooldownDe(jogador);
    const lista: OpcaoDeEscolha[] = cartas.map((carta) =>
      opcao(
        'cartasEmCooldown',
        String(carta),
        { forma: 'cartas', cartas: [carta] },
        { cartasEmCooldown: [carta] },
      ),
    );
    for (let i = 0; i < cartas.length; i += 1) {
      for (let j = i + 1; j < cartas.length; j += 1) {
        const par = [cartas[i], cartas[j]].filter((item): item is CardId => item !== undefined);
        if (par.length !== 2) continue;
        lista.push(
          opcao(
            'cartasEmCooldown',
            par.join('+'),
            { forma: 'cartas', cartas: par },
            { cartasEmCooldown: par },
          ),
        );
      }
    }
    return lista;
  },
  condicao: () => doRotulo('condicao', CONDICOES_ESCOLHIVEIS),
  forma: () => doRotulo('forma', FORMAS),
  precoProibido: () => doBooleano('precoProibido'),
  vidaOferecida: ({ jogador }) => doNumero('vidaOferecida', 0, Math.max(0, jogador.vida - 1)),
  precoDaPassiva: () => doBooleano('precoDaPassiva'),
  escolhaDoAbismo: () => doRotulo('escolhaDoAbismo', ['vida', 'maldicao'] as const),
  guardaReduzida: ({ jogador }) => doNumero('guardaReduzida', 0, jogador.guarda),
  servo: ({ jogador }) =>
    daCarta(
      'servo',
      jogador.cartasDeClasse.map((item) => item.carta),
    ),
  bonusDoMilagre: () => doRotulo('bonusDoMilagre', ['dano', 'impacto', 'cura'] as const),
  almasColhidas: () => doNumero('almasColhidas', 0, 4),
  usarAlmaAnexada: () => doBooleano('usarAlmaAnexada'),
  divisao: () => DIVISOES,
  descontoDeRecurso: () => doNumero('descontoDeRecurso', 0, 3),
  cartaAdversariaEmCooldown: ({ adversario }) =>
    daCarta('cartaAdversariaEmCooldown', cooldownDe(adversario)),
  cartaDaMao: ({ jogador }) => daCarta('cartaDaMao', jogador.mao),
  descerEstado: () => doBooleano('descerEstado'),
  nota: () => doRotulo('nota', NOTAS),
  passiva: ({ jogador }) =>
    daCarta(
      'passiva',
      jogador.passivas.map((item) => item.carta),
    ),
  disciplinaDoPasso: () => doBooleano('disciplinaDoPasso'),
  passoDeKata: () => doRotulo('passoDeKata', PASSOS),
  explorarMarca: () => doBooleano('explorarMarca'),
};

/** A ordem em que os campos são sondados. Exaustiva por construção. */
export const CAMPOS_DE_ESCOLHA: readonly CampoDeEscolha[] = Object.keys(
  CANDIDATOS,
) as readonly CampoDeEscolha[];

/* ------------------------------------------------------------------ */
/* Sondagem                                                            */
/* ------------------------------------------------------------------ */

const jogadorDe = (partida: EstadoDaPartida, id: PlayerId): EstadoDeJogador | undefined =>
  partida.jogadores.find((item) => item.id === id);

/** Duas recusas falam da mesma exigência? É o par carta + detalhe que a nomeia. */
const mesmaExigencia = (erro: ErroDeDominio, carta: CardId, detalhe: string): boolean =>
  (erro.tipo === 'escolha-obrigatoria' || erro.tipo === 'escolha-invalida') &&
  erro.carta === carta &&
  erro.detalhe === detalhe;

/**
 * Recusas que dizem "a escolha serviu, o que falta é preço".
 *
 * Elas existem para o segundo passe da sondagem: se nenhum candidato levou a
 * jogada até o fim porque ela é impagável, a escolha certa continua sendo a
 * escolha certa, e esconder o painel seria mentir sobre o motivo.
 */
const EhFaltaDeRecurso = (erro: ErroDeDominio): boolean =>
  erro.tipo === 'ap-insuficiente' ||
  erro.tipo === 'reserva-insuficiente' ||
  erro.tipo === 'recurso-insuficiente' ||
  erro.tipo === 'limite-de-acoes-atingido';

/**
 * Este candidato satisfez a exigência?
 *
 * Satisfazer é sair dela: a jogada passa, ou o motor passa a pedir **outra**
 * coisa. Um candidato de campo errado deixa a mesma exigência de pé — ou
 * provoca uma recusa que nada tem a ver com escolha, como "o Preço Proibido é
 * a mecânica do Bruxo", e essa também não vale.
 */
const satisfaz = (erro: ErroDeDominio | null, carta: CardId, detalhe: string): boolean => {
  if (erro === null) return true;
  if (mesmaExigencia(erro, carta, detalhe)) return false;
  return erro.tipo === 'escolha-obrigatoria' || erro.tipo === 'escolha-invalida';
};

const contextoDe = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  carta: CardId,
): ContextoDasOpcoes | null => {
  const dono = jogadorDe(partida, jogador);
  const outro = partida.jogadores.find((item) => item.id !== jogador);
  if (dono === undefined || outro === undefined) return null;
  return { jogador: dono, adversario: outro, perfil: perfilDaCarta(carta) ?? null };
};

/**
 * Descobre qual escolha o motor está pedindo, e quais valores ele aceita.
 *
 * A sondagem é cega de propósito: ela oferece candidatos de todos os campos e
 * observa qual deles muda a recusa. Nenhuma linha aqui sabe o que R13, W03 ou
 * NC03 pedem — quem sabe é a carta, e a carta responde pelo motor.
 */
const sondarEscolha = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  carta: CardId,
  detalhe: string,
  tentar: (escolhas: EscolhasDaAcao) => ErroDeDominio | null,
  escolhasAtuais: EscolhasDaAcao,
): SituacaoDaJogada => {
  const contexto = contextoDe(partida, jogador, carta);
  if (contexto === null) {
    return { estado: 'recusada', erro: { tipo: 'jogador-desconhecido', jogador } };
  }

  const sondar = (aceita: (erro: ErroDeDominio | null) => boolean): SituacaoDaJogada | null => {
    for (const campo of CAMPOS_DE_ESCOLHA) {
      if (escolhasAtuais[campo] !== undefined) continue;
      const aceitas = CANDIDATOS[campo](contexto).filter((candidata) =>
        aceita(tentar({ ...escolhasAtuais, ...candidata.fragmento })),
      );
      if (aceitas.length > 0) {
        return { estado: 'faltam-escolhas', campo, carta, detalhe, opcoes: aceitas };
      }
    }
    return null;
  };

  const direta = sondar((erro) => satisfaz(erro, carta, detalhe));
  if (direta !== null) return direta;

  // Segundo passe: a escolha pode estar certa e a jogada, impagável.
  const impagavel = sondar(
    (erro) => erro !== null && !mesmaExigencia(erro, carta, detalhe) && EhFaltaDeRecurso(erro),
  );
  if (impagavel !== null) return impagavel;

  // Nenhum candidato satisfaz a exigência: a jogada não é possível agora, e
  // dizer isso é mais honesto do que abrir um painel de escolha vazio.
  return { estado: 'recusada', erro: { tipo: 'escolha-obrigatoria', carta, detalhe } };
};

/** A jogada sai agora, pede escolha, ou é recusada — segundo o próprio motor. */
export const analisarDeclaracao = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
  pedido: PedidoDeAcao,
): SituacaoDaJogada => {
  const tentar = (escolhas: EscolhasDaAcao): ErroDeDominio | null => {
    const resposta = declarar(partida, jogador, { ...pedido, escolhas });
    return resposta.ok ? null : resposta.erro;
  };

  const escolhasAtuais = pedido.escolhas ?? {};
  const erro = tentar(escolhasAtuais);
  if (erro === null) return { estado: 'pronta' };
  if (erro.tipo !== 'escolha-obrigatoria') return { estado: 'recusada', erro };

  return sondarEscolha(partida, jogador, erro.carta, erro.detalhe, tentar, escolhasAtuais);
};

/** O mesmo, do lado de quem responde. */
export const analisarResposta = (
  partida: EstadoDaPartida,
  defensor: PlayerId,
  indice: IndiceDeAcao,
  pedido: PedidoDeResposta,
): SituacaoDaJogada => {
  const tentar = (escolhas: EscolhasDaAcao): ErroDeDominio | null => {
    const completo: PedidoDeResposta =
      pedido.tipo === 'sem-resposta' ? pedido : { ...pedido, escolhas };
    const resposta = responder(partida, defensor, indice, completo);
    return resposta.ok ? null : resposta.erro;
  };

  const escolhasAtuais = pedido.tipo === 'sem-resposta' ? {} : (pedido.escolhas ?? {});
  const erro = tentar(escolhasAtuais);
  if (erro === null) return { estado: 'pronta' };
  if (erro.tipo !== 'escolha-obrigatoria') return { estado: 'recusada', erro };

  return sondarEscolha(partida, defensor, erro.carta, erro.detalhe, tentar, escolhasAtuais);
};

/* ------------------------------------------------------------------ */
/* De onde uma carta pode ser declarada                                */
/* ------------------------------------------------------------------ */

/** A zona de onde a carta sai quando é declarada. */
export type OrigemDaJogada = 'mao' | 'ultimate' | 'emboscada';

export interface CartaJogavel {
  readonly carta: CardId;
  readonly origem: OrigemDaJogada;
  readonly situacao: SituacaoDaJogada;
}

/**
 * Tudo o que este jogador pode tentar declarar agora, com o veredito do motor.
 *
 * São três zonas próprias: a mão, a Ultimate — que é jogada sem passar pela
 * mão — e a Emboscada armada do Patrulheiro, que é a carta face-down sobre o
 * terceiro espaço.
 */
export const cartasJogaveis = (
  partida: EstadoDaPartida,
  jogador: PlayerId,
): readonly CartaJogavel[] => {
  const dono = jogadorDe(partida, jogador);
  if (dono === undefined) return [];

  const entradas: { readonly carta: CardId; readonly origem: OrigemDaJogada }[] = [
    ...dono.mao.map((carta) => ({ carta, origem: 'mao' as const })),
  ];
  if (dono.ultimate.estado === 'disponivel') {
    entradas.push({ carta: dono.ultimate.carta, origem: 'ultimate' });
  }
  const reservada = emboscadaArmada(dono);
  if (reservada !== null) entradas.push({ carta: reservada.carta, origem: 'emboscada' });

  return entradas.map(({ carta, origem }) => ({
    carta,
    origem,
    situacao: analisarDeclaracao(partida, jogador, { carta }),
  }));
};

/** A jogada é ao menos tentável agora — sai direto ou depois de uma escolha? */
export const podeTentar = (situacao: SituacaoDaJogada): boolean => situacao.estado !== 'recusada';
