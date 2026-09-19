import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { CardId, IndiceDeAcao, ModoDeUso } from '@arcane-duel/shared-types';
import type { OpcaoDeEscolha, PedidoDeAcao, SituacaoDaJogada } from '@arcane-duel/gameplay/jogo';
import {
  analisarDeclaracao,
  analisarResposta,
  cartasJogaveis,
  nomeDaDefesaInata,
} from '@arcane-duel/gameplay/jogo';
import { BotaoDeJogo } from '@arcane-duel/ui';

import type { ConfiguracaoLocal } from '../partida/controlador.js';
import { usePartidaLocal } from '../hooks/usePartidaLocal.js';
import { cartaVisivel, nomeDaCarta, nomeDaClasse } from '../partida/apresentacao.js';
import { textoDoErro } from '../partida/mensagens.js';
import { REGRAS_UNIVERSAIS } from '@arcane-duel/rules-engine';

import { webglDisponivel } from '../arena/webgl.js';
import { cartasConhecidas, roteirizar } from '../partida/roteiro.js';
/*
 * A arena entra por `lazy`.
 *
 * Three.js, a cena, os efeitos e as texturas de carta somam mais que todo o
 * resto do cliente. Menu, configuração e tela de status não precisam de nada
 * disso — o download só acontece quando alguém entra numa partida, e só
 * quando há WebGL para desenhá-la.
 */
const ArenaDeBatalha = lazy(async () => {
  const modulo = await import('../batalha/ArenaDeBatalha.js');
  return { default: modulo.ArenaDeBatalha };
});

import type { AcaoDoDisco } from '../batalha/DiscoDeTurno.js';
import { useApresentacao } from '../batalha/useApresentacao.js';
import { AvisoDeRuptura } from '../batalha/AvisoDeRuptura.js';
import { BannerDeTurno } from '../batalha/BannerDeTurno.js';
import { CampoDeBatalha } from '../batalha/CampoDeBatalha.js';
import { Handoff } from '../batalha/Handoff.js';
import { InspetorDeCarta } from '../batalha/InspetorDeCarta.js';
import type { AcaoDoInspetor } from '../batalha/InspetorDeCarta.js';
import { PainelDeEscolha } from '../batalha/PainelDeEscolha.js';
import { PainelDeResposta } from '../batalha/PainelDeResposta.js';
import { ResultadoDaPartida } from '../batalha/ResultadoDaPartida.js';

/*
 * A orquestração da partida local.
 *
 * Aqui não se decide regra nenhuma: cada botão pergunta ao `gameplay` o que é
 * possível e manda o comando. O estado da apresentação — carta em foco,
 * painel aberto, confirmação pendente — vive neste componente e **não** entra
 * no estado da partida.
 */

const NOME_DO_JOGADOR: Readonly<Record<string, string>> = {
  'jogador-1': 'Jogador 1',
  'jogador-2': 'Jogador 2',
};

const nomeDe = (id: string): string => NOME_DO_JOGADOR[id] ?? id;

interface JogadaEmCurso {
  readonly pedido: PedidoDeAcao;
  readonly situacao: Extract<SituacaoDaJogada, { estado: 'faltam-escolhas' }>;
}

interface Confirmacao {
  readonly texto: string;
  readonly aoConfirmar: () => void;
}

interface EscolhaDaResposta {
  readonly tipo: 'defesa-inata' | 'carta-de-reacao';
  readonly carta?: CardId;
  readonly situacao: Extract<SituacaoDaJogada, { estado: 'faltam-escolhas' }>;
}

export interface PartidaLocalProps {
  readonly configuracao: ConfiguracaoLocal;
  readonly semente: string;
  readonly aoSair: () => void;
  readonly aoRevanche: () => void;
  /**
   * Se a arena tridimensional está disponível.
   *
   * O padrão pergunta ao navegador. O parâmetro existe para o teste poder
   * montar os dois caminhos — e porque a resposta precisa ser injetável de
   * qualquer forma: o contexto pode se perder no meio da partida.
   */
  readonly cenaDisponivel?: boolean;
}

export const PartidaLocal = ({
  configuracao,
  semente,
  aoSair,
  aoRevanche,
  cenaDisponivel,
}: PartidaLocalProps): React.JSX.Element => {
  const { sessao, visao, controle } = usePartidaLocal(configuracao, semente);
  const apresentacao = useApresentacao();
  const [cenaAtiva, setCenaAtiva] = useState(() => cenaDisponivel ?? webglDisponivel());
  const [focada, setFocada] = useState<CardId | null>(null);
  const [jogada, setJogada] = useState<JogadaEmCurso | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [escolhaDaResposta, setEscolhaDaResposta] = useState<EscolhaDaResposta | null>(null);

  const { partida, etapa, aguardando, noAparelho, avisos, ultimoErro } = sessao;

  /*
   * Do motor para a tela, uma vez por lote.
   *
   * O estado já mudou quando isto roda. A fila só recebe o que desenhar e
   * segue no relógio dela; nenhum comando espera um beat terminar, e perder um
   * lote deixaria a partida feia, nunca errada.
   */
  const ultimoLote = useRef(0);
  const enfileirar = apresentacao.enfileirar;
  useEffect(() => {
    if (sessao.lote === ultimoLote.current || sessao.eventos.length === 0) return;
    /*
     * Enquanto ninguém está com o aparelho, o lote **espera**.
     *
     * Na troca de jogador não existe observador, e sem observador não há para
     * quem apresentar — nem projeção calculada. Guardar o lote e tocá-lo
     * depois de a pessoa confirmar é o que faz o próximo jogador ver o ataque
     * que acabou de resolver, em vez de encontrar o campo já mudado.
     */
    if (visao === null || noAparelho === null) return;
    ultimoLote.current = sessao.lote;
    const outro = visao.jogadores.find((item) => item.id !== noAparelho);
    enfileirar(
      roteirizar(
        sessao.eventos,
        {
          observador: noAparelho,
          classeDoObservador:
            visao.jogadores.find((item) => item.id === noAparelho)?.classe ?? 'guerreiro',
          classeDoAdversario: outro?.classe ?? 'mago',
          cartasVisiveis: cartasConhecidas(visao),
        },
        String(sessao.lote),
      ),
    );
  }, [sessao.lote, sessao.eventos, visao, noAparelho, enfileirar]);

  const eu = visao?.jogadores.find((item) => item.id === noAparelho) ?? null;
  const adversario = visao?.jogadores.find((item) => item.id !== noAparelho) ?? null;
  const minhaVez = noAparelho !== null && aguardando === noAparelho;
  const indiceDaResposta = etapa.tipo === 'resposta' ? etapa.indice : null;

  /* ---- O que dá para jogar agora, segundo o motor -------------------- */
  const jogaveis = useMemo(() => {
    if (noAparelho === null || !minhaVez || etapa.tipo !== 'acao') return new Set<string>();
    return new Set(
      cartasJogaveis(partida, noAparelho)
        .filter((item) => item.situacao.estado !== 'recusada')
        .map((item) => String(item.carta)),
    );
  }, [partida, noAparelho, minhaVez, etapa.tipo]);

  const reservado = useMemo<IndiceDeAcao | null>(() => {
    const recurso = eu?.recurso;
    if (recurso?.classe !== 'patrulheiro' || recurso.emboscada === null) return null;
    return recurso.emboscada.estado === 'armada' ? 2 : null;
  }, [eu?.recurso]);

  const reacoesDisponiveis = useMemo(() => {
    if (indiceDaResposta === null || eu === null || noAparelho === null) return [];
    return eu.mao
      .filter((item) => item.visivel)
      .map((item) => (item.visivel ? item.carta : null))
      .filter((carta): carta is CardId => carta !== null)
      .filter((carta) => cartaVisivel(carta)?.tipo === 'reacao')
      .filter(
        (carta) =>
          analisarResposta(partida, noAparelho, indiceDaResposta, {
            tipo: 'carta-de-reacao',
            carta,
          }).estado !== 'recusada',
      );
  }, [partida, noAparelho, indiceDaResposta, eu]);

  const defesa = useMemo(() => {
    if (indiceDaResposta === null || noAparelho === null) {
      return { disponivel: false, motivo: null as string | null };
    }
    const situacao = analisarResposta(partida, noAparelho, indiceDaResposta, {
      tipo: 'defesa-inata',
    });
    return situacao.estado === 'recusada'
      ? { disponivel: false, motivo: textoDoErro(situacao.erro) }
      : { disponivel: true, motivo: null };
  }, [partida, noAparelho, indiceDaResposta]);

  /* ---- A troca de jogador vem antes de tudo -------------------------- */
  if (noAparelho === null) {
    const classe = partida.jogadores.find((item) => item.id === aguardando)?.classe;
    return (
      <Handoff
        nomeDoJogador={nomeDe(String(aguardando))}
        classe={classe === undefined ? '' : nomeDaClasse(classe)}
        aoConfirmar={() => {
          setFocada(null);
          setJogada(null);
          controle.confirmarTroca();
        }}
      />
    );
  }

  if (visao === null || eu === null || adversario === null) {
    return <div className="carregando">Preparando a partida…</div>;
  }

  /* ---- Declarar ------------------------------------------------------ */
  const tentarJogada = (pedido: PedidoDeAcao): void => {
    const situacao = analisarDeclaracao(partida, noAparelho, pedido);
    if (situacao.estado === 'pronta') {
      setJogada(null);
      setFocada(null);
      controle.declarar(pedido);
      return;
    }
    if (situacao.estado === 'faltam-escolhas') {
      setJogada({ pedido, situacao });
      return;
    }
    setJogada(null);
    controle.declarar(pedido);
  };

  const escolher = (opcao: OpcaoDeEscolha): void => {
    if (jogada === null) return;
    tentarJogada({
      ...jogada.pedido,
      escolhas: { ...jogada.pedido.escolhas, ...opcao.fragmento },
    });
  };

  /* ---- Responder ----------------------------------------------------- */
  const acaoRecebida =
    indiceDaResposta === null
      ? null
      : (adversario.acoes.find((slot) => slot.indice === indiceDaResposta)?.perfil?.carta ?? null);

  const responderComDefesa = (): void => {
    if (indiceDaResposta === null) return;
    const situacao = analisarResposta(partida, noAparelho, indiceDaResposta, {
      tipo: 'defesa-inata',
    });
    if (situacao.estado === 'faltam-escolhas') {
      setJogada(null);
      // A Guarda Marcial pergunta "1 D ou 1 I": a escolha é do defensor.
      setEscolhaDaResposta({ tipo: 'defesa-inata', situacao });
      return;
    }
    controle.responder({ tipo: 'defesa-inata' });
  };

  const responderComCarta = (carta: CardId): void => {
    if (indiceDaResposta === null) return;
    const situacao = analisarResposta(partida, noAparelho, indiceDaResposta, {
      tipo: 'carta-de-reacao',
      carta,
    });
    if (situacao.estado === 'faltam-escolhas') {
      setEscolhaDaResposta({ tipo: 'carta-de-reacao', carta, situacao });
      return;
    }
    controle.responder({ tipo: 'carta-de-reacao', carta });
  };

  /* ---- Ações do inspetor --------------------------------------------- */
  const acoesDaCarta = (carta: CardId): readonly AcaoDoInspetor[] => {
    const visivel = cartaVisivel(carta);
    if (visivel === null) return [];

    if (visivel.tipo === 'carta-de-classe') {
      const podeUsar = etapa.tipo === 'complementos' || etapa.tipo === 'resposta';
      const equipada = eu.cartasDeClasse.find((item) => item.carta === carta);
      const pronta = equipada?.estado === 'pronta';
      const usar = (modo: ModoDeUso): void => {
        controle.usarCartaDeClasse({ carta, modo });
        setFocada(null);
      };
      return [
        {
          rotulo: 'Ativar',
          aoTocar: () => {
            usar('ativar');
          },
          desabilitado: !podeUsar || !pronta,
        },
        {
          rotulo: 'Exaurir',
          tom: 'perigo',
          desabilitado: !podeUsar || equipada?.estado === 'exaurida',
          aoTocar: () => {
            setConfirmacao({
              texto: `Exaurir ${visivel.nome} permanentemente? Ela sai da partida e não volta.`,
              aoConfirmar: () => {
                usar('exaurir');
              },
            });
          },
        },
      ];
    }

    if (visivel.tipo === 'passiva') {
      const podeUsar = etapa.tipo === 'complementos' || etapa.tipo === 'resposta';
      return [
        {
          rotulo: 'Ativar Passiva',
          desabilitado: !podeUsar,
          aoTocar: () => {
            controle.ativarPassiva(carta);
            setFocada(null);
          },
        },
      ];
    }

    if (visivel.tipo === 'ultimate') {
      return [
        {
          rotulo: 'Usar Ultimate',
          desabilitado: !minhaVez || etapa.tipo !== 'acao' || !jogaveis.has(String(carta)),
          aoTocar: () => {
            setConfirmacao({
              texto: 'Usar a Ultimate? Ela só pode ser usada uma vez nesta partida.',
              aoConfirmar: () => {
                tentarJogada({ carta });
              },
            });
          },
        },
      ];
    }

    return [
      {
        rotulo: 'Usar',
        desabilitado: !minhaVez || etapa.tipo !== 'acao' || !jogaveis.has(String(carta)),
        aoTocar: () => {
          tentarJogada({ carta });
        },
      },
    ];
  };

  // Quem venceu, lido uma vez só: `null` quando não há vencedor único — o
  // documento não resolve morte simultânea, e a tela não inventa um campeão.
  const vencedor = partida.desfecho?.vencedor ?? null;
  const campeao =
    vencedor === null ? null : (partida.jogadores.find((item) => item.id === vencedor) ?? null);
  const derrotado =
    vencedor === null ? null : (partida.jogadores.find((item) => item.id !== vencedor) ?? null);

  // A Defesa Inata tem nome impresso por classe. Ele é público — a classe do
  // jogador está à vista — e é assim que a tela o chama.
  const nomeDaDefesa =
    noAparelho === null
      ? null
      : (nomeDaDefesaInata(
          partida.jogadores.find((item) => item.id === noAparelho) ?? partida.jogadores[0],
        ) ?? null);

  /*
   * O que o disco de turno oferece agora.
   *
   * Ele não decide nada: apenas mostra qual dos comandos do controlador está
   * disponível na etapa atual, e diz "aguardando" quando a vez é do outro.
   */
  const acaoDoDisco: AcaoDoDisco = !minhaVez
    ? 'aguardando'
    : etapa.tipo === 'complementos'
      ? 'enviar-acao'
      : etapa.tipo === 'acao'
        ? 'encerrar-turno'
        : 'aguardando';

  /*
   * Quando a coluna lateral precisa existir.
   *
   * Ela é coluna, e não modal: enquanto está fechada a arena recebe a tela
   * inteira, e o enquadramento é recalculado sozinho quando ela abre — sem
   * cortar nada e sem mover a câmera.
   */
  const lateralAberta =
    focada !== null ||
    jogada !== null ||
    escolhaDaResposta !== null ||
    (etapa.tipo === 'resposta' && minhaVez) ||
    (etapa.tipo === 'escolha-pendente' && minhaVez);

  const avisoDeRuptura = avisos.find((aviso) => aviso.tipo === 'ruptura');
  const avisoDeTurno = avisos.find((aviso) => aviso.tipo === 'turno');
  const encerrada = partida.situacao === 'encerrada';

  return (
    <div
      className={[
        'partida',
        cenaAtiva ? 'partida--arena' : '',
        lateralAberta ? 'partida--lateral-aberta' : '',
      ]
        .filter((parte) => parte !== '')
        .join(' ')}
      data-teste="partida"
    >
      <div className="partida__topo">
        <BotaoDeJogo
          tom="discreto"
          aoTocar={() => {
            setMenuAberto(true);
          }}
          dadoDeTeste="menu-da-partida"
        >
          Menu
        </BotaoDeJogo>
        <span className="partida__turno" data-teste="turno">
          Turno {visao.turno?.numero ?? 0} · {nomeDe(String(visao.turno?.jogadorAtivo ?? ''))}
        </span>
      </div>

      <div className="partida__corpo">
        {cenaAtiva ? (
          <Suspense fallback={<div className="arena arena--carregando" data-teste="campo" />}>
            <ArenaDeBatalha
              visao={visao}
              eu={eu}
              adversario={adversario}
              nomeDoJogador={nomeDe(String(eu.id))}
              nomeDoAdversario={nomeDe(String(adversario.id))}
              focada={focada}
              jogaveis={jogaveis}
              respondendo={indiceDaResposta}
              momentos={apresentacao.momentos}
              enfaseProprio={apresentacao.enfaseProprio}
              enfaseAdversario={apresentacao.enfaseAdversario}
              bloqueada={apresentacao.bloqueada}
              comCena={cenaAtiva}
              vidaMaxima={REGRAS_UNIVERSAIS.vidaInicial}
              guardaMaxima={REGRAS_UNIVERSAIS.guardaInicial}
              acaoDoDisco={acaoDoDisco}
              aoTocarDisco={() => {
                apresentacao.destravarAudio();
                if (acaoDoDisco === 'enviar-acao') controle.enviarAcao();
                if (acaoDoDisco === 'encerrar-turno') controle.encerrarTurno();
              }}
              aoFocarCarta={(carta) => {
                apresentacao.destravarAudio();
                setFocada(carta);
              }}
              aoFalharCena={() => {
                // Contexto perdido não derruba a partida: a cena sai, a camada
                // em DOM continua com o campo inteiro e o jogo segue.
                setCenaAtiva(false);
              }}
            />
          </Suspense>
        ) : (
          <CampoDeBatalha
            visao={visao}
            eu={eu}
            adversario={adversario}
            nomeDoJogador={nomeDe(String(eu.id))}
            nomeDoAdversario={nomeDe(String(adversario.id))}
            focada={focada}
            jogaveis={jogaveis}
            reservado={reservado}
            emFoco={indiceDaResposta}
            aoFocarCarta={(carta) => {
              setFocada(carta);
            }}
          />
        )}

        <div className="partida__lateral">
          {jogada !== null ? (
            <PainelDeEscolha
              situacao={jogada.situacao}
              aoEscolher={escolher}
              aoCancelar={() => {
                setJogada(null);
              }}
            />
          ) : escolhaDaResposta !== null ? (
            <PainelDeEscolha
              situacao={escolhaDaResposta.situacao}
              aoEscolher={(opcao) => {
                const base = escolhaDaResposta;
                setEscolhaDaResposta(null);
                if (base.tipo === 'defesa-inata') {
                  const reducao = opcao.valor.forma === 'rotulo' ? opcao.valor.rotulo : undefined;
                  controle.responder(
                    reducao === 'dano' || reducao === 'impacto'
                      ? { tipo: 'defesa-inata', reducao }
                      : { tipo: 'defesa-inata', escolhas: opcao.fragmento },
                  );
                  return;
                }
                if (base.carta !== undefined) {
                  controle.responder({
                    tipo: 'carta-de-reacao',
                    carta: base.carta,
                    escolhas: opcao.fragmento,
                  });
                }
              }}
              aoCancelar={() => {
                setEscolhaDaResposta(null);
              }}
            />
          ) : etapa.tipo === 'resposta' && minhaVez ? (
            <PainelDeResposta
              cartaDaAcao={acaoRecebida}
              reacoes={reacoesDisponiveis}
              nomeDaDefesa={nomeDaDefesa}
              defesaDisponivel={defesa.disponivel}
              motivoDaDefesa={defesa.motivo}
              aoResponderComCarta={responderComCarta}
              aoUsarDefesaInata={responderComDefesa}
              aoNaoResponder={() => {
                controle.responder({ tipo: 'sem-resposta' });
              }}
            />
          ) : etapa.tipo === 'escolha-pendente' && minhaVez ? (
            <section className="painel-de-escolha" data-teste="escolha-pendente">
              <h2 className="painel-de-escolha__titulo">
                {nomeDaCarta(etapa.escolha.origem)} pede uma escolha
              </h2>
              <div className="painel-de-escolha__opcoes">
                {etapa.escolha.opcoes.map((opcao) => (
                  <BotaoDeJogo
                    key={opcao}
                    tom="secundario"
                    aoTocar={() => {
                      controle.resolverEscolha(opcao);
                    }}
                    dadoDeTeste={`pendente-${String(opcao)}`}
                  >
                    {nomeDaCarta(opcao)}
                  </BotaoDeJogo>
                ))}
              </div>
            </section>
          ) : (
            <InspetorDeCarta
              carta={focada}
              acoes={focada === null ? [] : acoesDaCarta(focada)}
              aoFechar={
                focada === null
                  ? undefined
                  : () => {
                      setFocada(null);
                    }
              }
            />
          )}

          {/*
            Na arena o disco de turno é quem carrega estes dois comandos: ele
            fica ao alcance do polegar e junta estado e ação no mesmo lugar.
            Sem a cena, eles voltam a ser botões da coluna lateral.
          */}
          {!cenaAtiva && (
            <div className="partida__controles">
              {etapa.tipo === 'complementos' && minhaVez && (
                <BotaoDeJogo
                  tom="principal"
                  aoTocar={() => {
                    controle.enviarAcao();
                  }}
                  largo
                  dadoDeTeste="enviar-acao"
                >
                  Enviar Ação
                </BotaoDeJogo>
              )}
              {etapa.tipo === 'acao' && minhaVez && (
                <BotaoDeJogo
                  tom="principal"
                  aoTocar={() => {
                    controle.encerrarTurno();
                  }}
                  largo
                  dadoDeTeste="encerrar-turno"
                >
                  Encerrar turno
                </BotaoDeJogo>
              )}
            </div>
          )}
        </div>
      </div>

      {ultimoErro !== null && (
        <div className="aviso-de-erro" role="alert" data-teste="erro">
          <span>{textoDoErro(ultimoErro)}</span>
          <BotaoDeJogo
            tom="discreto"
            aoTocar={() => {
              controle.limparErro();
            }}
          >
            Fechar
          </BotaoDeJogo>
        </div>
      )}

      {/*
        Com a arena no ar, a faixa de turno e a Ruptura são desenhadas pela
        camada de momentos, sobre o campo e no ritmo da fila. Sem ela, valem
        os avisos da Etapa 5 — nunca os dois, que seriam dois avisos iguais.
      */}
      {!cenaAtiva && (
        <>
          <BannerDeTurno
            texto={
              avisoDeTurno?.tipo === 'turno'
                ? `Turno de ${nomeDe(String(avisoDeTurno.jogador))}`
                : null
            }
          />
          <AvisoDeRuptura
            bonus={avisoDeRuptura?.tipo === 'ruptura' ? avisoDeRuptura.bonus : null}
            alvo={avisoDeRuptura?.tipo === 'ruptura' ? nomeDe(String(avisoDeRuptura.alvo)) : null}
          />
        </>
      )}

      {confirmacao !== null && (
        <div className="confirmacao" role="dialog" aria-modal="true" data-teste="confirmacao">
          <div className="confirmacao__caixa">
            <p>{confirmacao.texto}</p>
            <div className="confirmacao__acoes">
              <BotaoDeJogo
                tom="perigo"
                aoTocar={() => {
                  confirmacao.aoConfirmar();
                  setConfirmacao(null);
                }}
                dadoDeTeste="confirmar"
              >
                Confirmar
              </BotaoDeJogo>
              <BotaoDeJogo
                tom="discreto"
                aoTocar={() => {
                  setConfirmacao(null);
                }}
              >
                Cancelar
              </BotaoDeJogo>
            </div>
          </div>
        </div>
      )}

      {menuAberto && (
        <div className="confirmacao" role="dialog" aria-modal="true" data-teste="menu-aberto">
          <div className="confirmacao__caixa">
            <p>Abandonar esta partida?</p>
            <div className="confirmacao__acoes">
              <BotaoDeJogo tom="perigo" aoTocar={aoSair} dadoDeTeste="abandonar">
                Abandonar
              </BotaoDeJogo>
              <BotaoDeJogo
                tom="discreto"
                aoTocar={() => {
                  setMenuAberto(false);
                }}
              >
                Cancelar
              </BotaoDeJogo>
            </div>
          </div>
        </div>
      )}

      {encerrada && (
        <ResultadoDaPartida
          vencedor={campeao === null ? null : nomeDe(String(campeao.id))}
          classeVencedora={campeao === null ? null : nomeDaClasse(campeao.classe)}
          classePerdedora={derrotado === null ? null : nomeDaClasse(derrotado.classe)}
          turnos={partida.turno?.numero ?? 0}
          vidaRestante={campeao?.vida ?? null}
          aoRevanche={aoRevanche}
          aoMenu={aoSair}
        />
      )}
    </div>
  );
};
