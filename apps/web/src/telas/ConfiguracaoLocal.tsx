import { useState } from 'react';
import type { ClassId, PlayerId } from '@arcane-duel/shared-types';
import { NOME_DA_RECEITA_INICIAL } from '@arcane-duel/gameplay/jogo';
import { BotaoDeJogo } from '@arcane-duel/ui';

import type { ConfiguracaoLocal as Configuracao } from '../partida/controlador.js';
import { JOGADOR_1, JOGADOR_2 } from '../partida/controlador.js';
import { CLASSES_VISIVEIS } from '../partida/apresentacao.js';

/*
 * A configuração da partida local.
 *
 * Cada classe mostra o componente próprio e o nome da Receita 1 — a única
 * desbloqueada. As 39 cartas não aparecem aqui: escolher build é o Construtor
 * da Etapa 7, e mostrar 39 cartas para uma escolha que ainda não existe só
 * atrapalha.
 *
 * Quem começa é pergunta explícita. O documento não define o critério
 * competitivo, então a interface não sorteia nem alterna por conta própria.
 */

export interface ConfiguracaoLocalProps {
  readonly aoComecar: (configuracao: Configuracao) => void;
  readonly aoVoltar: () => void;
  readonly inicial?: Configuracao | undefined;
}

export const ConfiguracaoLocal = ({
  aoComecar,
  aoVoltar,
  inicial,
}: ConfiguracaoLocalProps): React.JSX.Element => {
  const [classe1, setClasse1] = useState<ClassId>(inicial?.classeDoJogador1 ?? 'guerreiro');
  const [classe2, setClasse2] = useState<ClassId>(inicial?.classeDoJogador2 ?? 'mago');
  const [comeca, setComeca] = useState<PlayerId | null>(inicial?.comeca ?? null);

  return (
    <main className="configuracao" data-teste="configuracao">
      <header className="configuracao__cabecalho">
        <h1>Partida local</h1>
        <BotaoDeJogo tom="discreto" aoTocar={aoVoltar} dadoDeTeste="voltar-do-setup">
          Voltar
        </BotaoDeJogo>
      </header>

      <div className="configuracao__jogadores">
        <EscolhaDeClasse
          titulo="Jogador 1"
          selecionada={classe1}
          aoEscolher={setClasse1}
          dadoDeTeste="classes-jogador-1"
        />
        <EscolhaDeClasse
          titulo="Jogador 2"
          selecionada={classe2}
          aoEscolher={setClasse2}
          dadoDeTeste="classes-jogador-2"
        />
      </div>

      <section className="configuracao__inicio">
        <h2>Quem começa?</h2>
        <div className="configuracao__inicio-opcoes">
          <BotaoDeJogo
            tom={comeca === JOGADOR_1 ? 'principal' : 'secundario'}
            aoTocar={() => {
              setComeca(JOGADOR_1);
            }}
            dadoDeTeste="comeca-jogador-1"
          >
            Jogador 1
          </BotaoDeJogo>
          <BotaoDeJogo
            tom={comeca === JOGADOR_2 ? 'principal' : 'secundario'}
            aoTocar={() => {
              setComeca(JOGADOR_2);
            }}
            dadoDeTeste="comeca-jogador-2"
          >
            Jogador 2
          </BotaoDeJogo>
        </div>
        <p className="configuracao__nota">
          Escolha usada apenas para partida local; a regra competitiva ainda não foi definida.
        </p>
      </section>

      <BotaoDeJogo
        tom="principal"
        largo
        desabilitado={comeca === null}
        dadoDeTeste="iniciar-partida"
        aoTocar={() => {
          if (comeca === null) return;
          aoComecar({ classeDoJogador1: classe1, classeDoJogador2: classe2, comeca });
        }}
      >
        Iniciar partida
      </BotaoDeJogo>
    </main>
  );
};

const EscolhaDeClasse = ({
  titulo,
  selecionada,
  aoEscolher,
  dadoDeTeste,
}: {
  readonly titulo: string;
  readonly selecionada: ClassId;
  readonly aoEscolher: (classe: ClassId) => void;
  readonly dadoDeTeste: string;
}): React.JSX.Element => (
  <section className="escolha-de-classe" data-teste={dadoDeTeste}>
    <h2>{titulo}</h2>
    <ul className="escolha-de-classe__lista">
      {CLASSES_VISIVEIS.map((classe) => (
        <li key={classe.id}>
          <button
            type="button"
            className={`classe${selecionada === classe.id ? ' classe--selecionada' : ''}`}
            aria-pressed={selecionada === classe.id}
            data-classe={classe.id}
            onClick={() => {
              aoEscolher(classe.id);
            }}
          >
            <span className="classe__nome">{classe.nome}</span>
            <span className="classe__componente">{classe.componente}</span>
            <span className="classe__resumo">{classe.resumo}</span>
            <span className="classe__receita">
              Receita 1 — {NOME_DA_RECEITA_INICIAL[classe.id]}
            </span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);
