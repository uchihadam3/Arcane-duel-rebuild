import { useMemo, useState } from 'react';
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
}

export const PartidaLocal = ({
  configuracao,
  semente,
  aoSair,
  aoRevanche,
}: PartidaLocalProps): React.JSX.Element => {
  const { sessao, visao, controle } = usePartidaLocal(configuracao, semente);
  const [focada, setFocada] = useState<CardId | null>(null);
  const [jogada, setJogada] = useState<JogadaEmCurso | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [escolhaDaResposta, setEscolhaDaResposta] = useState<EscolhaDaResposta | null>(null);

  const { partida, etapa, aguardando, noAparelho, avisos, ultimoErro } = sessao;

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

  const avisoDeRuptura = avisos.find((aviso) => aviso.tipo === 'ruptura');
  const avisoDeTurno = avisos.find((aviso) => aviso.tipo === 'turno');
  const encerrada = partida.situacao === 'encerrada';

  return (
    <div className="partida" data-teste="partida">
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

      <BannerDeTurno
        texto={
          avisoDeTurno?.tipo === 'turno' ? `Turno de ${nomeDe(String(avisoDeTurno.jogador))}` : null
        }
      />
      <AvisoDeRuptura
        bonus={avisoDeRuptura?.tipo === 'ruptura' ? avisoDeRuptura.bonus : null}
        alvo={avisoDeRuptura?.tipo === 'ruptura' ? nomeDe(String(avisoDeRuptura.alvo)) : null}
      />

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
