import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardId, ClassId } from '@arcane-duel/shared-types';
import { acoesLegais, ameacaDaAcao, respostasLegais } from '@arcane-duel/gameplay';
import type { PedidoDeResposta } from '@arcane-duel/gameplay/jogo';

import { CartaVetorial, VersoVetorial } from './carta/CartaVetorial.jsx';
import { corDaClasse } from './carta/paleta.js';
import { Tabuleiro } from './arena/Tabuleiro.jsx';
import { CAMERA, CARTA, TABULEIRO, enquadrarTabuleiro, pedestalDeAcao } from './arena/planta.js';
import { montarCena } from './cena/montar.js';
import { useCena } from './cena/useCena.js';
import { HudV2 } from './hud/HudV2.jsx';
import type { EstadoDaDemo } from './sessao.js';
import { HUMANO, MAQUINA, criarControladorDaDemo } from './sessao.js';
import { criarPalco } from './som/palco.js';
import { CamadaDeEfeitos } from './vfx/CamadaDeEfeitos.jsx';
import { useEfeito } from './vfx/useEfeito.js';
import './estilos.css';

/*
 * A Demo Visual V2: uma pessoa contra a IA, com a câmera parada.
 *
 * O que esta tela prova, e o que ela não prova.
 *
 * **Prova**: que a perspectiva pode ser fixa. Não existe aqui nenhuma variável
 * de "lado de quem olha", nenhuma inversão de campo e nenhuma troca de
 * aparelho. A metade de baixo é do humano da primeira linha de código à
 * última. Durante o turno da máquina a única coisa que muda é **quem** está
 * movendo carta.
 *
 * **Não prova**: que o jogo inteiro está pronto. Quatro cartas têm arte e
 * efeito próprios; as outras usam o sigilo neutro, de propósito, para ninguém
 * confundir "ainda não foi feito" com "foi feito assim".
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

/** Mede a área disponível. O enquadramento do campo depende dela. */
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
  const [focada, definirFocada] = useState<CardId | null>(null);
  const [pensando, definirPensando] = useState(false);
  const [medida, medir] = useMedida();

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
   * apresentação da decisão. O aviso fica no ar pelo tempo que a decisão
   * mereceu, e só então o comando é aplicado. Nenhuma regra espera este
   * relógio: se o navegador congelar, a partida continua correta.
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

  /* Som: a partida toca por cima do que o estado publica. */
  useEffect(() => {
    palco.reagir(estado);
  }, [palco, estado]);

  const eu = estado.visao.jogadores.find((jogador) => jogador.id === HUMANO);
  const ela = estado.visao.jogadores.find((jogador) => jogador.id === MAQUINA);

  const coresDoJogador = corDaClasse(classeDoHumano);
  const coresDaMaquina = corDaClasse(classeDaIa);

  const enquadramento = useMemo(
    () => enquadrarTabuleiro(medida.largura, medida.altura),
    [medida.largura, medida.altura],
  );

  const alvoDaCena = useMemo(
    () => montarCena(estado.visao, String(HUMANO), -CAMERA.inclinacaoEmGraus),
    [estado.visao],
  );

  const pecas = useCena(alvoDaCena, {
    inclinacaoDaMao: -CAMERA.inclinacaoEmGraus,
    ritmo: 1,
    movimentoReduzido: false,
  });

  /*
   * O efeito da carta que acabou de resolver.
   *
   * Ele lê o log de eventos, e não a tela: quando o primeiro beat começa, o
   * motor já aplicou Dano, Guarda e Ruptura. O efeito conta o que houve.
   */
  const efeito = useEfeito({
    eventos: estado.eventos,
    lote: estado.lote,
    humano: HUMANO,
    palco,
  });

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

  const tocar = useCallback(
    (carta: CardId | null) => {
      if (carta === null) return;
      palco.tocarInterface('pegar');
      definirFocada((atual) => (atual === carta ? null : carta));
    },
    [palco],
  );

  const usar = useCallback(() => {
    if (focada === null) return;
    const candidata = jogaveis.get(String(focada));
    if (candidata === undefined) return;
    palco.tocarInterface('soltar');
    controlador.declarar(candidata.pedido);
  }, [controlador, focada, jogaveis, palco]);

  const responder = useCallback(
    (pedido: PedidoDeResposta) => {
      palco.tocarInterface('soltar');
      controlador.responder(pedido);
    },
    [controlador, palco],
  );

  if (eu === undefined || ela === undefined) {
    return <div className="v2" />;
  }

  const vencedor = estado.visao.desfecho?.vencedor ?? null;
  const ganhei = vencedor === HUMANO;

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

  return (
    <div className="v2" style={variaveis} data-teste="demo-v2">
      <div className="v2__palco" ref={medir}>
        <div className="v2__tabuleiro" data-teste="tabuleiro-v2">
          <Tabuleiro
            energiaDoJogador={coresDoJogador.energia}
            energiaDaMaquina={coresDaMaquina.energia}
          />

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

          {/* Os encaixes acesos: para onde a carta escolhida pode ir. */}
          {focada !== null &&
            jogaveis.has(String(focada)) &&
            eu.acoes
              .filter((slot) => slot.situacao === 'vazio')
              .slice(0, 1)
              .map((slot) => {
                const caixa = pedestalDeAcao('jogador', slot.indice);
                return (
                  <button
                    key={slot.indice}
                    type="button"
                    className="v2-alvo"
                    data-teste={`alvo-acao-${String(slot.indice)}`}
                    aria-label="Jogar aqui"
                    style={{
                      ['--px' as string]: `${String(caixa.x + caixa.largura / 2)}px`,
                      ['--py' as string]: `${String(caixa.y + caixa.altura / 2)}px`,
                      ['--alvo-largura' as string]: `${String(caixa.largura)}px`,
                      ['--alvo-altura' as string]: `${String(caixa.altura)}px`,
                    }}
                    onClick={usar}
                  />
                );
              })}

          {pecas.map((peca) => {
            const ehJogavel = peca.carta !== null && jogaveis.has(String(peca.carta.id));
            const estaFocada = peca.carta !== null && focada === peca.carta.id;
            const altura = peca.pose.altura;
            const classes = [
              'v2-peca',
              peca.interativa ? 'v2-peca--tocavel' : '',
              ehJogavel ? 'v2-peca--jogavel' : '',
              estaFocada ? 'v2-peca--focada' : '',
            ]
              .filter((item) => item !== '')
              .join(' ');

            return (
              <div
                key={peca.chave}
                className={classes}
                data-teste={`peca-${peca.chave}`}
                data-lugar={peca.lugar}
                data-metade={peca.metade}
                style={{
                  ['--px' as string]: `${String(peca.pose.x)}px`,
                  ['--py' as string]: `${String(peca.pose.y)}px`,
                  ['--pz' as string]: `${String(altura)}px`,
                  ['--giro' as string]: `${String(peca.pose.giro)}deg`,
                  ['--inclinacao' as string]: `${String(peca.pose.inclinacao)}deg`,
                  ['--escala' as string]: String(peca.pose.escala * (estaFocada ? 1.3 : 1)),
                  ['--presenca' as string]: String(peca.presenca),
                  ['--sombra-escala' as string]: String(1 + altura / 260),
                  ['--sombra-opacidade' as string]: String(Math.max(0, 0.85 - altura / 360)),
                  zIndex: peca.ordem + (estaFocada ? 200 : 0),
                }}
              >
                <div className="v2-peca__sombra" />
                {peca.virada >= 0.5 && peca.carta !== null ? (
                  <div className="v2-peca__face">
                    <CartaVetorial carta={peca.carta} comTexto={peca.lugar === 'mao'} />
                  </div>
                ) : (
                  <div className="v2-peca__verso">
                    <VersoVetorial />
                  </div>
                )}
                {peca.interativa && peca.carta !== null && (
                  <button
                    type="button"
                    className="v2-peca__toque"
                    data-teste={`tocar-${String(peca.carta.id)}`}
                    aria-label={peca.carta.nome}
                    onClick={() => {
                      tocar(peca.carta?.id ?? null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="v2__interface">
        <HudV2
          jogador={ela}
          rotulo="Adversário"
          detalhado={false}
          daVez={estado.aguardando === MAQUINA}
          posicao="maquina"
          dadoDeTeste="hud-maquina"
        />

        <HudV2
          jogador={eu}
          rotulo="Você"
          detalhado
          daVez={estado.aguardando === HUMANO}
          posicao="jogador"
          dadoDeTeste="hud-jogador"
        />

        <button type="button" className="v2__sair" onClick={aoSair} data-teste="sair-da-demo">
          Sair
        </button>

        {pensando && (
          <div className="v2__pensando" data-teste="pensando">
            <span>ADVERSÁRIO PENSANDO</span>
            <span className="v2__pensando-pontos">
              <i className="v2__pensando-ponto" />
              <i className="v2__pensando-ponto" />
              <i className="v2__pensando-ponto" />
            </span>
          </div>
        )}

        {estado.etapa.tipo === 'acao' && estado.aguardando === HUMANO && (
          <div className="v2__comando">
            <button
              type="button"
              className="v2__botao v2__botao--forte"
              data-teste="usar-carta"
              disabled={focada === null || !jogaveis.has(String(focada))}
              onClick={usar}
            >
              Usar
            </button>
            <button
              type="button"
              className="v2__botao"
              data-teste="encerrar-turno"
              onClick={() => {
                controlador.encerrarTurno();
              }}
            >
              Encerrar turno
            </button>
          </div>
        )}

        {respostas !== null && (
          <>
            <p className="v2__aviso" data-teste="janela-de-resposta">
              {respostas.ameaca.ehTecnica
                ? 'TÉCNICA INIMIGA — RESPONDER?'
                : `ATAQUE: ${String(respostas.ameaca.dano)} D / ${String(respostas.ameaca.impacto)} I`}
            </p>
            <div className="v2__painel">
              {focada !== null && respostas.cartas.has(String(focada)) && (
                <button
                  type="button"
                  className="v2__botao v2__botao--forte"
                  data-teste="usar-reacao"
                  onClick={() => {
                    const item = respostas.cartas.get(String(focada));
                    if (item !== undefined) responder(item.pedido);
                  }}
                >
                  Usar reação
                </button>
              )}
              <button
                type="button"
                className="v2__botao"
                data-teste="sem-resposta"
                onClick={() => {
                  responder({ tipo: 'sem-resposta' });
                }}
              >
                Sem resposta
              </button>
            </div>
          </>
        )}

        {estado.etapa.tipo === 'escolha-pendente' && estado.etapa.escolha.jogador === HUMANO && (
          <div className="v2__painel" data-teste="escolha-pendente">
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

        {estado.etapa.tipo === 'fim' && (
          <div className="v2__fim" data-teste="fim-da-demo">
            <h2 className="v2__fim-titulo">{ganhei ? 'VITÓRIA' : 'DERROTA'}</h2>
            <button type="button" className="v2__botao v2__botao--forte" onClick={aoSair}>
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
