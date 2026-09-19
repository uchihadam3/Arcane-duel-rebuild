import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClassId, VisaoDeJogador } from '@arcane-duel/shared-types';
import { acoesLegais, ameacaDaAcao, respostasLegais } from '@arcane-duel/gameplay';
import type { PedidoDeResposta } from '@arcane-duel/gameplay/jogo';

import { Sobreposicao } from './animacao/Sobreposicao.jsx';
import { Cenario } from './arena/Cenario.jsx';
import type { EfeitoDoLote } from './animacao/apresentacao.js';
import type { Andamento } from './animacao/ritmo.js';
import { PASSO_DA_CASCATA_MS } from './animacao/ritmo.js';
import { useValorNoBeat } from './animacao/useValorNoBeat.js';
import { useVoos } from './animacao/useVoos.js';
import { Tabuleiro } from './arena/Tabuleiro.jsx';
import type { Metade } from './arena/planta.js';
import { CARTA, TABULEIRO } from './arena/planta.js';
import { CartaVetorial, VersoVetorial } from './carta/CartaVetorial.jsx';
import { corDaClasse } from './carta/paleta.js';
import { cartasNaMaoDaMaquina, maoDoJogador, pecasDoCampo } from './cena/montar.js';
import { ControlesDeTurno } from './hud/ControlesDeTurno.jsx';
import { HudV2 } from './hud/HudV2.jsx';
import type { AlvoDaInspecao } from './inspecao/Inspetor.jsx';
import { Inspetor } from './inspecao/Inspetor.jsx';
import { Leque } from './mao/Leque.jsx';
import { CAMERA, enquadrarTabuleiro } from './layout/camera.js';
import { ehDeitado, zonasDaTela } from './layout/zonas.js';
import type { EstadoDaDemo } from './sessao.js';
import { HUMANO, MAQUINA, criarControladorDaDemo } from './sessao.js';
import { criarPalco } from './som/palco.js';
import { CamadaDeEfeitos } from './vfx/CamadaDeEfeitos.jsx';
import { useEfeito } from './vfx/useEfeito.js';
import './estilos.css';

/*
 * A Demo Visual V2: uma pessoa contra a IA, com a câmera parada.
 *
 * **A arquitetura em camadas**, que é a correção estrutural desta revisão:
 *
 *   1. **arena** — o tabuleiro, transformado em 3D. Contém somente cartas.
 *   2. **mãos** — em coordenadas de tela, fora da transformação, uma embaixo
 *      e uma em cima. Nenhuma delas é filha do tabuleiro.
 *   3. **sobreposição** — a camada global por onde a carta viaja entre as
 *      duas anteriores, acima das duas e abaixo dos painéis.
 *   4. **HUD** — informação, em retângulos próprios que não encostam em nada.
 *
 * Cada camada recebe um retângulo de `layout/zonas.ts`, e um teste geométrico
 * percorre os seis viewports alvo e falha o build se dois deles se cruzarem. A
 * separação não depende de `z-index`: ela é impedida na geometria.
 *
 * **O que esta tela prova**: que a perspectiva pode ser fixa. Não existe aqui
 * nenhuma variável de "lado de quem olha", nenhuma inversão de campo e nenhuma
 * troca de aparelho. A metade de baixo é do humano da primeira linha à última.
 *
 * **O que ela não prova**: que o jogo inteiro está pronto. Quatro cartas têm
 * arte e efeito próprios; as outras usam o sigilo neutro, de propósito.
 */

export interface DemoVisualProps {
  readonly classeDoHumano: ClassId;
  readonly classeDaIa: ClassId;
  readonly semente?: string;
  readonly aoSair: () => void;
}

interface Medida {
  readonly largura: number;
  readonly altura: number;
}

/** Mede a área disponível. Toda a composição depende dela. */
const useMedida = (): [Medida, (elemento: HTMLDivElement | null) => void] => {
  const [medida, definir] = useState<Medida>({ largura: 915, altura: 412 });
  const referencia = useRef<HTMLDivElement | null>(null);

  const guardar = useCallback((elemento: HTMLDivElement | null) => {
    referencia.current = elemento;
    if (elemento !== null) {
      definir({ largura: elemento.clientWidth, altura: elemento.clientHeight });
    }
  }, []);

  useEffect(() => {
    const elemento = referencia.current;
    if (elemento === null || typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => {
      definir({ largura: elemento.clientWidth, altura: elemento.clientHeight });
    });
    observador.observe(elemento);
    return () => {
      observador.disconnect();
    };
  }, []);

  return [medida, guardar];
};

/** O sistema pediu movimento reduzido? */
const useMovimentoReduzido = (): boolean => {
  const [reduzido, definir] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const consulta = matchMedia('(prefers-reduced-motion: reduce)');
    definir(consulta.matches);
    const ouvir = (): void => {
      definir(consulta.matches);
    };
    consulta.addEventListener('change', ouvir);
    return () => {
      consulta.removeEventListener('change', ouvir);
    };
  }, []);
  return reduzido;
};

export const DemoVisual = ({
  classeDoHumano,
  classeDaIa,
  semente = 'demo-v2',
  aoSair,
}: DemoVisualProps): React.JSX.Element => {
  const controlador = useMemo(
    () => criarControladorDaDemo({ classeDoHumano, classeDaIa, comeca: HUMANO }, semente),
    [classeDoHumano, classeDaIa, semente],
  );

  const [estado, definirEstado] = useState<EstadoDaDemo>(() => controlador.estado());
  const [focada, definirFocada] = useState<number | null>(null);
  const [pensando, definirPensando] = useState(false);
  /*
   * O andamento.
   *
   * NORMAL é o padrão, e é o andamento em que o jogo deve ser jogado: cada
   * beat tem o tempo dele e a jogada é contada inteira. RÁPIDO existe para
   * quem já conhece as cartas, e é **visivelmente** outro andamento — não uma
   * preferência sem efeito.
   */
  const [andamento, definirAndamento] = useState<Andamento>('normal');
  const [inspecionada, definirInspecionada] = useState<AlvoDaInspecao | null>(null);
  const [medida, medir] = useMedida();
  const raiz = useRef<HTMLDivElement | null>(null);
  const movimentoReduzido = useMovimentoReduzido();

  const palco = useMemo(() => criarPalco(), []);

  useEffect(() => {
    const parar = controlador.aoMudar((proximo) => {
      definirEstado(proximo);
      definirFocada(null);
    });
    return () => {
      parar();
      controlador.descartar();
      palco.descartar();
    };
  }, [controlador, palco]);

  /*
   * O turno da máquina.
   *
   * Ela já decidiu quando este efeito roda — o que acontece aqui é só a
   * apresentação da decisão. Nenhuma regra espera este relógio: se o navegador
   * congelar, a partida continua correta.
   */
  useEffect(() => {
    if (estado.etapa.tipo === 'fim') return;
    if (estado.aguardando !== MAQUINA) {
      definirPensando(false);
      return;
    }
    definirPensando(true);
    const espera = controlador.pensamentoMs();
    const bilhete = setTimeout(() => {
      definirPensando(false);
      controlador.passoDaIa();
    }, espera);
    return () => {
      clearTimeout(bilhete);
    };
  }, [controlador, estado]);

  const eu = estado.visao.jogadores.find((jogador) => jogador.id === HUMANO);
  const ela = estado.visao.jogadores.find((jogador) => jogador.id === MAQUINA);

  const coresDoJogador = corDaClasse(classeDoHumano);
  const coresDaMaquina = corDaClasse(classeDaIa);

  const zonas = useMemo(() => zonasDaTela(medida), [medida]);
  const enquadramento = useMemo(
    () => enquadrarTabuleiro(zonas.arena.largura, zonas.arena.altura),
    [zonas.arena.largura, zonas.arena.altura],
  );

  const pecas = useMemo(() => pecasDoCampo(estado.visao, String(HUMANO)), [estado.visao]);

  /*
   * O que resolveu neste lote.
   *
   * A fila precisa saber disto **antes** de montar os beats: se uma Ação
   * resolveu, ela reserva telégrafo, efeito, impacto e resultado depois do
   * encaixe. Sem a reserva, o efeito entraria no quadro em que o log chegou —
   * com a carta ainda no ar.
   */
  const efeitoDoLote = useMemo<EfeitoDoLote>(() => {
    if (!estado.eventos.some((evento) => evento.tipo === 'acao-resolvida')) return 'nenhum';
    return estado.eventos.some((evento) => evento.tipo === 'ultimate-consumida')
      ? 'ultimate'
      : 'comum';
  }, [estado.eventos]);

  /*
   * Quem ganhou a quarta Ação agora.
   *
   * `indisponivel` é o estado normal do quarto slot: ele não existe. Quando
   * uma regra o concede, o pedestal surge; quando a concessão acaba, some.
   */
  const acoesExtras = useMemo(() => {
    const metades: Metade[] = [];
    const quarta = (jogador: VisaoDeJogador | undefined): boolean =>
      jogador?.acoes.find((slot) => slot.indice === 3)?.situacao !== 'indisponivel';
    if (quarta(ela)) metades.push('maquina');
    if (quarta(eu)) metades.push('jogador');
    return metades;
  }, [eu, ela]);
  const mao = useMemo(() => maoDoJogador(estado.visao, String(HUMANO)), [estado.visao]);
  const versosDaMaquina = useMemo(
    () => cartasNaMaoDaMaquina(estado.visao, String(HUMANO)),
    [estado.visao],
  );

  /*
   * A cena para o diretor de movimento.
   *
   * O lugar de uma carta no cooldown carrega a zona, porque sem isso o avanço
   * CD3 → CD2 seria "continuou no cooldown" e as cartas trocariam de casa sem
   * nada se mover.
   */
  const cenaParaVoo = useMemo(
    () => ({
      lote: estado.lote,
      pecas: pecas.map((peca) => ({
        chave: peca.chave,
        lugar: peca.lugar === 'cooldown' ? `cooldown:${String(peca.indice)}` : peca.lugar,
      })),
      mao: mao.map((item) => item.chave),
      maoDaMaquina: versosDaMaquina,
      cartaDe: (chave: string) =>
        pecas.find((peca) => peca.chave === chave)?.carta ??
        mao.find((item) => item.chave === chave)?.carta ??
        null,
      // A mão vive em coordenadas de tela e repousa a 0°; o campo dita o resto.
      giroDe: (chave: string) => pecas.find((peca) => peca.chave === chave)?.giro ?? 0,
    }),
    [estado.lote, pecas, mao, versosDaMaquina],
  );

  const aoEncaixar = useCallback(() => {
    palco.tocarInterface('soltar');
  }, [palco]);

  /*
   * Abrir a inspeção a partir do elemento que o dedo tocou.
   *
   * A origem é **medida**, e não calculada: a peça do campo é filha do
   * elemento transformado em 3D, então o retângulo que o navegador devolve já
   * é o projetado na tela. Recalcular a projeção por conta própria foi o que
   * deformou a Etapa 6, e vale aqui pelo mesmo motivo que vale no voo.
   */
  const inspecionar = useCallback(
    (elemento: HTMLElement | null, alvo: Omit<AlvoDaInspecao, 'origem'>) => {
      if (elemento === null) return;
      const caixaDaRaiz = raiz.current?.getBoundingClientRect();
      const rect = elemento.getBoundingClientRect();
      palco.tocarInterface('pegar');
      definirInspecionada({
        ...alvo,
        origem: {
          x: rect.x - (caixaDaRaiz?.x ?? 0),
          y: rect.y - (caixaDaRaiz?.y ?? 0),
          largura: rect.width,
          altura: rect.height,
        },
      });
    },
    [palco],
  );

  const fecharInspecao = useCallback(() => {
    definirInspecionada(null);
  }, []);

  const { clones, emVoo, marcos } = useVoos({
    cena: cenaParaVoo,
    raiz,
    movimentoReduzido,
    andamento,
    efeito: efeitoDoLote,
    aoEncaixar,
  });

  const efeito = useEfeito({
    eventos: estado.eventos,
    lote: estado.lote,
    humano: HUMANO,
    palco,
    marcos,
  });

  /*
   * Os números do HUD entram no beat de resultado.
   *
   * O motor já baixou a Vida quando o log chegou; o HUD espera o instante em
   * que a apresentação conta o resultado. Antes disso ele estaria revelando o
   * desfecho enquanto a carta ainda atravessa a arena.
   */
  const beatDoResultado = useMemo(
    () => ({ lote: marcos.lote, emMs: marcos.resultadoMs }),
    [marcos.lote, marcos.resultadoMs],
  );
  const jogadoresNoBeat = useValorNoBeat(estado.visao.jogadores, estado.lote, beatDoResultado);

  /*
   * O som entra no mesmo compasso da imagem.
   *
   * `marcos` é publicado pela medição de layout, então ele chega um commit
   * depois do estado. O efeito abaixo depende dos dois: quando os marcos do
   * lote atual aparecem, as vozes são reagendadas a partir do beat certo — e
   * o palco descarta as do lote anterior sozinho.
   */
  useEffect(() => {
    palco.reagir(estado, {
      aPartirDeMs: marcos.lote === estado.lote ? marcos.efeitoMs : null,
      passoMs: PASSO_DA_CASCATA_MS,
    });
  }, [palco, estado, marcos]);

  /* As cartas que o motor aceitaria agora, e as Respostas legais. */
  const jogaveis = useMemo(() => {
    if (estado.etapa.tipo !== 'acao' || estado.aguardando !== HUMANO) {
      return new Map<string, ReturnType<typeof acoesLegais>[number]>();
    }
    return new Map(
      acoesLegais(estado.visao, HUMANO).map((item) => [String(item.pedido.carta), item]),
    );
  }, [estado]);

  const respostas = useMemo(() => {
    if (estado.etapa.tipo !== 'resposta' || estado.aguardando !== HUMANO) return null;
    const ameaca = ameacaDaAcao(estado.visao, HUMANO, estado.etapa.indice);
    if (ameaca === null) return null;
    return {
      ameaca,
      cartas: new Map(
        respostasLegais(estado.visao, HUMANO, ameaca).map((item) => [
          String(item.pedido.tipo === 'carta-de-reacao' ? item.pedido.carta : ''),
          item,
        ]),
      ),
    };
  }, [estado]);

  const chavesJogaveis = useMemo(
    () =>
      respostas === null
        ? new Set([...jogaveis.keys()].map((id) => `c:${id}`))
        : new Set([...respostas.cartas.keys()].map((id) => `c:${id}`)),
    [jogaveis, respostas],
  );

  const selo = respostas === null ? 'USAR' : 'REAGIR';

  const responder = useCallback(
    (pedido: PedidoDeResposta) => {
      palco.tocarInterface('soltar');
      controlador.responder(pedido);
    },
    [controlador, palco],
  );

  /*
   * A gramática de toque, e ela precisa ser previsível.
   *
   * **Primeiro toque inspeciona**: a carta se descola do leque, sobe, cresce e
   * fica legível. **Segundo toque na mesma carta joga**. Um botão solto
   * exigiria um lugar próprio na tela, e não há: o HUD ocupa a esquerda da
   * faixa de baixo e os controles de turno a direita. O selo dentro da carta
   * levantada diz o que o segundo toque vai fazer.
   */
  const tocarNaMao = useCallback(
    (indice: number) => {
      const carta = mao[indice]?.carta?.id ?? null;

      if (focada !== indice) {
        palco.tocarInterface('pegar');
        definirFocada(indice);
        return;
      }

      if (carta === null) {
        definirFocada(null);
        return;
      }

      if (respostas !== null) {
        const reacao = respostas.cartas.get(String(carta));
        if (reacao !== undefined) {
          responder(reacao.pedido);
          return;
        }
        definirFocada(null);
        return;
      }

      const candidata = jogaveis.get(String(carta));
      if (candidata === undefined) {
        /*
         * Não dá para jogar agora — mas a identidade é minha, então dá para
         * **ler**. O segundo toque numa carta bloqueada abre a inspeção em vez
         * de simplesmente devolvê-la ao leque: recusar o comando não é motivo
         * para recusar a informação.
         */
        const naTela = document.querySelector<HTMLElement>(
          `[data-teste="mao-do-jogador"] [data-chave="${mao[indice]?.chave ?? ''}"]`,
        );
        const visivel = mao[indice]?.carta ?? null;
        if (naTela !== null && visivel !== null) {
          inspecionar(naTela, { chave: mao[indice]?.chave ?? '', carta: visivel, giroDeOrigem: 0 });
          return;
        }
        definirFocada(null);
        return;
      }
      palco.tocarInterface('soltar');
      controlador.declarar(candidata.pedido);
    },
    [controlador, focada, inspecionar, jogaveis, mao, palco, respostas, responder],
  );

  if (eu === undefined || ela === undefined) {
    return <div className="v2" ref={medir} />;
  }

  /*
   * Retrato pede para girar.
   *
   * Achatar esta composição num telefone em pé produziria algo pior que uma
   * mensagem honesta: a arena é uma faixa larga, e espremê-la tiraria
   * justamente a legibilidade que a revisão cobrou.
   */
  if (!ehDeitado(medida)) {
    return (
      <div className="v2 v2--retrato" ref={medir} data-teste="pedir-para-girar">
        <div className="v2__girar">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect
              x="18"
              y="6"
              width="28"
              height="52"
              rx="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M 8 46 a 22 22 0 0 0 14 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M 22 58 l -8 -2 l 2 8 Z" fill="currentColor" />
          </svg>
          <p>Gire o aparelho para jogar.</p>
          <button type="button" className="v2__botao" onClick={aoSair}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  /* O HUD desenha a projeção do beat, e não a do motor. */
  const euNoHud = jogadoresNoBeat.find((jogador) => jogador.id === HUMANO) ?? eu;
  const elaNoHud = jogadoresNoBeat.find((jogador) => jogador.id === MAQUINA) ?? ela;

  const vencedor = estado.visao.desfecho?.vencedor ?? null;
  const ganhei = vencedor === HUMANO;
  const acoesUsadas = eu.acoesRealizadasNoTurno;

  const variaveis = {
    ['--v2-largura' as string]: `${String(TABULEIRO.largura)}px`,
    ['--v2-altura' as string]: `${String(TABULEIRO.altura)}px`,
    ['--v2-escala' as string]: String(enquadramento.escala),
    ['--v2-deslocamento' as string]: `${enquadramento.deslocamentoY.toFixed(2)}px`,
    ['--v2-inclinacao' as string]: `${String(CAMERA.inclinacaoEmGraus)}deg`,
    ['--v2-perspectiva' as string]: `${String(CAMERA.perspectiva)}px`,
    ['--v2-origem' as string]: `${String(CAMERA.origemVertical * 100)}%`,
    ['--v2-carta-largura' as string]: `${String(CARTA.largura)}px`,
    ['--v2-carta-altura' as string]: `${String(CARTA.altura)}px`,
    ['--v2-energia' as string]: coresDoJogador.energia,
    ['--v2-energia-maquina' as string]: coresDaMaquina.energia,
  };

  const versosEmVoo = new Set([...emVoo].filter((chave) => chave.startsWith('v:maquina:mao')));

  return (
    <div className="v2" style={variaveis} data-teste="demo-v2" ref={medir}>
      <div className="v2__camadas" ref={raiz}>
        {/* 0 · o salão em volta da mesa, que dá lugar e escala à partida */}
        <Cenario
          energiaDoJogador={coresDoJogador.energia}
          energiaDaMaquina={coresDaMaquina.energia}
        />

        {/* 1 · a arena */}
        <div
          className="v2__arena"
          style={{
            left: `${String(zonas.arena.x)}px`,
            top: `${String(zonas.arena.y)}px`,
            width: `${String(zonas.arena.largura)}px`,
            height: `${String(zonas.arena.altura)}px`,
          }}
        >
          <div className="v2__palco">
            <div className="v2__tabuleiro" data-teste="tabuleiro-v2">
              <Tabuleiro
                energiaDoJogador={coresDoJogador.energia}
                energiaDaMaquina={coresDaMaquina.energia}
                acoesExtras={acoesExtras}
              />
              {pecas.map((peca) => {
                // A narrowing local: `peca.carta` num callback perde o
                // estreitamento, e o `null` aqui é o verso — que não se lê.
                const legivel = peca.carta;
                return (
                  <div
                    key={peca.chave}
                    className={`v2-peca v2-peca--${peca.lugar}${
                      peca.podeInspecionar ? ' v2-peca--legivel' : ''
                    }`}
                    data-chave={peca.chave}
                    data-teste={`peca-${peca.chave}`}
                    data-pode-inspecionar={peca.podeInspecionar ? 'sim' : 'nao'}
                    onClick={
                      legivel === null
                        ? undefined
                        : (evento) => {
                            inspecionar(evento.currentTarget, {
                              chave: peca.chave,
                              carta: legivel,
                              giroDeOrigem: peca.giro,
                            });
                          }
                    }
                    style={{
                      left: `${String(peca.caixa.x)}px`,
                      top: `${String(peca.caixa.y)}px`,
                      width: `${String(peca.caixa.largura)}px`,
                      height: `${String(peca.caixa.altura)}px`,
                      transform: `rotate(${String(peca.giro)}deg)`,
                      zIndex: peca.ordem,
                      opacity: emVoo.has(peca.chave) ? 0 : 1,
                    }}
                  >
                    {legivel === null ? (
                      <VersoVetorial />
                    ) : (
                      <CartaVetorial carta={legivel} comTexto={false} />
                    )}
                  </div>
                );
              })}
              {efeito !== null && (
                <CamadaDeEfeitos
                  beats={efeito.beats}
                  origem={efeito.origem}
                  coluna={efeito.coluna}
                  energia={
                    efeito.origem === 'jogador' ? coresDoJogador.energia : coresDaMaquina.energia
                  }
                  energiaClara={
                    efeito.origem === 'jogador'
                      ? coresDoJogador.energiaClara
                      : coresDaMaquina.energiaClara
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* 2 · as mãos, em coordenadas de tela */}
        <Leque
          zona={zonas.maoDaMaquina}
          invertido
          cartas={Array.from({ length: versosDaMaquina }, (_, indice) => ({
            chave: `v:maquina:mao:${String(indice)}`,
            carta: null,
            indice,
          }))}
          focada={null}
          emVoo={versosEmVoo}
          dadoDeTeste="mao-da-maquina"
        />
        <Leque
          zona={zonas.maoDoJogador}
          cartas={mao}
          focada={focada}
          emVoo={emVoo}
          jogaveis={chavesJogaveis}
          selo={selo}
          aoTocar={tocarNaMao}
          dadoDeTeste="mao-do-jogador"
        />

        {/* 3 · a camada global de animação */}
        <Sobreposicao clones={clones} />
      </div>

      {/* 4 · o HUD, em retângulos próprios */}
      <HudV2
        jogador={elaNoHud}
        caixa={zonas.hudDaMaquina}
        daVez={estado.aguardando === MAQUINA}
        posicao="maquina"
        pensando={pensando}
        dadoDeTeste="hud-maquina"
      />
      <HudV2
        jogador={euNoHud}
        caixa={zonas.hudDoJogador}
        daVez={estado.aguardando === HUMANO}
        posicao="jogador"
        dadoDeTeste="hud-jogador"
      />
      <ControlesDeTurno
        jogador={eu}
        caixa={zonas.controlesDeTurno}
        acoesUsadas={acoesUsadas}
        acoesPermitidas={eu.acoes.length}
        podeEncerrar={estado.etapa.tipo === 'acao' && estado.aguardando === HUMANO}
        aoEncerrar={() => {
          controlador.encerrarTurno();
        }}
        pergunta={
          respostas === null
            ? null
            : {
                texto: respostas.ameaca.ehTecnica
                  ? 'TÉCNICA INIMIGA'
                  : `ATAQUE ${String(respostas.ameaca.dano)} D / ${String(respostas.ameaca.impacto)} I`,
                aoDispensar: () => {
                  responder({ tipo: 'sem-resposta' });
                },
              }
        }
      />

      <button type="button" className="v2__sair" onClick={aoSair} data-teste="sair-da-demo">
        Sair
      </button>

      {/*
       * O andamento, à vista.
       *
       * Ele fica na tela e não num menu porque é uma decisão de leitura, e
       * não uma configuração: quem não está entendendo o que aconteceu
       * precisa achar isto sem sair da partida.
       */}
      <button
        type="button"
        className="v2__andamento"
        data-teste="andamento"
        data-andamento={andamento}
        onClick={() => {
          definirAndamento((atual) => (atual === 'normal' ? 'rapido' : 'normal'));
        }}
      >
        {andamento === 'normal' ? 'RITMO NORMAL' : 'RITMO RÁPIDO'}
      </button>

      {/*
       * 5 · os painéis contextuais.
       *
       * A janela de Resposta é o único painel que aparece no meio da tela, e
       * ela é curta de propósito: fica **acima** do campo, na faixa da arena,
       * e some assim que a pessoa decide. O comando de jogar não é painel — é
       * o segundo toque na própria carta.
       */}
      {estado.etapa.tipo === 'escolha-pendente' && estado.etapa.escolha.jogador === HUMANO && (
        <div className="v2__painel v2__painel--escolha" data-teste="escolha-pendente">
          {estado.etapa.escolha.opcoes.slice(0, 4).map((opcao) => (
            <button
              key={String(opcao)}
              type="button"
              className="v2__botao"
              onClick={() => {
                controlador.resolverEscolha(opcao);
              }}
            >
              {String(opcao)}
            </button>
          ))}
        </div>
      )}

      <Inspetor
        alvo={inspecionada}
        tela={{ largura: medida.largura, altura: medida.altura }}
        aoFechar={fecharInspecao}
      />

      {estado.etapa.tipo === 'fim' && (
        <div className="v2__fim" data-teste="fim-da-demo">
          <h2 className="v2__fim-titulo">{ganhei ? 'VITÓRIA' : 'DERROTA'}</h2>
          <button type="button" className="v2__botao v2__botao--forte" onClick={aoSair}>
            Voltar
          </button>
        </div>
      )}
    </div>
  );
};
