import { useState } from 'react';
import type { ClassId } from '@arcane-duel/shared-types';
import { NOME_DA_RECEITA_INICIAL } from '@arcane-duel/gameplay/receitas';

import { CartaVetorial } from './carta/CartaVetorial.jsx';
import { corDaClasse } from './carta/paleta.js';
import { cartaVisivel } from '../partida/apresentacao.js';
import { cardId } from '@arcane-duel/shared-types';
import './estilos.css';

/*
 * A escolha da Demo V2.
 *
 * Duas classes, e só. Quem a pessoa escolher, ela joga; a outra fica com a IA.
 * Não há escolha de quem começa nem de dificuldade: o vertical slice testa
 * aparência, movimento e IA, e cada botão a mais é uma decisão que o avaliador
 * precisa tomar antes de ver o que interessa.
 */

const CLASSES: readonly ClassId[] = ['guerreiro', 'mago'];

/** A carta-modelo de cada classe, como cartaz da escolha. */
const CARTAZ: Readonly<Record<string, string>> = {
  guerreiro: 'W08',
  mago: 'M02',
};

export interface EscolhaDaDemoProps {
  readonly aoEscolher: (classeDoHumano: ClassId, classeDaIa: ClassId) => void;
  readonly aoVoltar: () => void;
}

export const EscolhaDaDemo = ({ aoEscolher, aoVoltar }: EscolhaDaDemoProps): React.JSX.Element => {
  const [escolhida, definirEscolhida] = useState<ClassId>('guerreiro');
  const adversaria: ClassId = escolhida === 'guerreiro' ? 'mago' : 'guerreiro';
  const cores = corDaClasse(escolhida);

  return (
    <main
      className="v2-escolha"
      data-teste="escolha-da-demo"
      style={{ ['--v2-energia' as string]: cores.energia }}
    >
      <h1 className="v2-escolha__titulo">DEMO VISUAL V2</h1>
      <p className="v2-escolha__receita">
        Guerreiro × Mago · perspectiva fixa · adversário controlado pela IA
      </p>

      <div className="v2-escolha__linha" data-teste="classes-da-demo">
        {CLASSES.map((classe) => {
          const modelo = cartaVisivel(cardId(CARTAZ[classe] ?? 'W08'));
          return (
            <button
              key={classe}
              type="button"
              className="v2-escolha__opcao"
              data-classe={classe}
              aria-pressed={escolhida === classe}
              onClick={() => {
                definirEscolhida(classe);
              }}
              style={{ ['--v2-energia' as string]: corDaClasse(classe).energia }}
            >
              <span style={{ display: 'block', width: '108px', aspectRatio: '5 / 7' }}>
                {modelo !== null && <CartaVetorial carta={modelo} comTexto={false} />}
              </span>
              <span className="v2-escolha__nome">
                {classe === 'guerreiro' ? 'GUERREIRO' : 'MAGO'}
              </span>
              <span className="v2-escolha__receita">{NOME_DA_RECEITA_INICIAL[classe]}</span>
            </button>
          );
        })}
      </div>

      <div className="v2-escolha__linha">
        <button
          type="button"
          className="v2__botao v2__botao--forte"
          data-teste="iniciar-demo"
          onClick={() => {
            aoEscolher(escolhida, adversaria);
          }}
        >
          Entrar na arena
        </button>
        <button type="button" className="v2__botao" onClick={aoVoltar} data-teste="voltar-do-demo">
          Voltar
        </button>
      </div>
    </main>
  );
};
