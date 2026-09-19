import { useEffect, useRef, useState } from 'react';

import type { CartaVisivel } from '../../partida/apresentacao.js';
import type { Caixa } from '../animacao/voo.js';
import { CartaVetorial } from '../carta/CartaVetorial.jsx';

import { DURACAO_DA_ABERTURA_MS, DURACAO_DO_FECHAMENTO_MS, poseDaInspecao } from './aproximacao.js';

/*
 * A inspeção.
 *
 * O que aparece aqui é uma **cópia de apresentação**, e a distinção é a regra
 * inteira do arquivo. A carta física continua onde estava, no ângulo em que
 * estava; a cópia nasce em cima dela, se aproxima, endireita e cresce até
 * caber na leitura. Girar a peça real porque alguém a inspecionou seria
 * mentir sobre o estado da mesa — e voltar a fechá-la deixaria a dúvida de
 * qual carta tinha sido olhada.
 *
 * O fundo escurece, mas não apaga: a arena continua visível por trás, porque
 * inspecionar é um gesto **dentro** da partida, e não uma tela separada.
 */

export interface AlvoDaInspecao {
  readonly chave: string;
  readonly carta: CartaVisivel;
  /** Onde a carta está na tela, medida pelo navegador. */
  readonly origem: Caixa;
  /** O ângulo em que a peça física está: 180 na metade da máquina. */
  readonly giroDeOrigem: number;
}

export interface InspetorProps {
  readonly alvo: AlvoDaInspecao | null;
  readonly tela: { readonly largura: number; readonly altura: number };
  readonly aoFechar: () => void;
}

const agora = (): number => (typeof performance === 'undefined' ? 0 : performance.now());

export const Inspetor = ({ alvo, tela, aoFechar }: InspetorProps): React.JSX.Element | null => {
  /*
   * O progresso tem vida própria depois que o alvo some.
   *
   * Fechar não é desmontar: a cópia precisa voltar **para a carta**, e para
   * isso ela tem de continuar existindo enquanto o caminho de volta roda.
   * Por isso o alvo fica guardado aqui até o fim da animação inversa.
   */
  const [emCena, definirEmCena] = useState<AlvoDaInspecao | null>(alvo);
  const [progresso, definirProgresso] = useState(0);
  const alvoAtual = useRef<AlvoDaInspecao | null>(alvo);
  alvoAtual.current = alvo;

  useEffect(() => {
    if (alvo !== null) definirEmCena(alvo);
  }, [alvo]);

  useEffect(() => {
    if (typeof requestAnimationFrame === 'undefined') {
      definirProgresso(alvo === null ? 0 : 1);
      if (alvo === null) definirEmCena(null);
      return;
    }
    const abrindo = alvo !== null;
    const duracao = abrindo ? DURACAO_DA_ABERTURA_MS : DURACAO_DO_FECHAMENTO_MS;
    const inicio = agora();
    const de = progresso;
    const para = abrindo ? 1 : 0;
    let vivo = true;
    let bilhete = 0;

    const passo = (): void => {
      if (!vivo) return;
      const t = Math.min(1, (agora() - inicio) / duracao);
      definirProgresso(de + (para - de) * t);
      if (t >= 1) {
        if (!abrindo) definirEmCena(null);
        return;
      }
      bilhete = requestAnimationFrame(passo);
    };
    bilhete = requestAnimationFrame(passo);
    return () => {
      vivo = false;
      cancelAnimationFrame(bilhete);
    };
    // `progresso` fica de fora de propósito: ele é o ponto de partida lido uma
    // vez, e incluí-lo religaria o laço a cada quadro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo]);

  if (emCena === null) return null;

  const pose = poseDaInspecao(
    { origem: emCena.origem, giroDeOrigem: emCena.giroDeOrigem, tela },
    progresso,
  );

  return (
    <div className="v2-inspetor" data-teste="inspetor">
      {/*
       * O fundo é o botão de fechar.
       *
       * Um "X" num canto exigiria mira; o fundo inteiro não exige nada. O
       * gesto de fechar é o mesmo de qualquer lugar da tela fora da carta.
       */}
      <button
        type="button"
        className="v2-inspetor__fundo"
        data-teste="fechar-inspecao"
        aria-label="Fechar inspeção"
        style={{ opacity: pose.escuridao }}
        onClick={aoFechar}
      />
      <div
        className="v2-inspetor__copia"
        data-teste="carta-inspecionada"
        data-chave={emCena.chave}
        style={{
          width: `${String(emCena.origem.largura)}px`,
          height: `${String(emCena.origem.altura)}px`,
          transform: [
            `translate3d(${String(pose.x - emCena.origem.largura / 2)}px,`,
            `${String(pose.y - emCena.origem.altura / 2)}px, 0)`,
            `rotate(${String(pose.giro)}deg)`,
            `scale(${String(pose.escala)})`,
          ].join(' '),
        }}
      >
        <CartaVetorial carta={emCena.carta} comTexto />
      </div>
    </div>
  );
};
