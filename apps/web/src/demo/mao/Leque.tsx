import type { CartaVisivel } from '../../partida/apresentacao.js';
import { CartaVetorial, VersoVetorial } from '../carta/CartaVetorial.jsx';
import type { Caixa } from '../layout/leque.js';
import { lugaresDoLeque, tamanhoDaCartaNaMao } from '../layout/leque.js';

/*
 * A mão, em coordenadas de tela.
 *
 * Ela fica **fora do tabuleiro**, e isso é a correção estrutural que a revisão
 * pediu. Antes a mão morava dentro do elemento transformado em 3D e desfazia a
 * inclinação carta por carta; era truque, e aparecia como truque — a carta
 * ficava deitada na mesa fingindo estar em pé.
 *
 * Aqui a mão é o que ela é: cartas que a pessoa segura, de frente para ela,
 * na frente da mesa. Nenhuma transformação 3D, nenhuma perspectiva herdada.
 *
 * A posição de cada carta vem de `layout/leque.ts`, que é conta pura. Este
 * arquivo só desenha.
 */

export interface CartaDaMao {
  readonly chave: string;
  /** `null` é verso: a carta que o observador não pode conhecer. */
  readonly carta: CartaVisivel | null;
  readonly indice: number;
}

export interface LequeProps {
  readonly zona: Caixa;
  readonly cartas: readonly CartaDaMao[];
  readonly focada: number | null;
  /** Vira o leque: é a mão da máquina, no topo. */
  readonly invertido?: boolean;
  /** As cartas que estão voando agora, e por isso não aparecem no leque. */
  readonly emVoo?: ReadonlySet<string>;
  readonly aoTocar?: (indice: number) => void;
  /** Quais cartas dá para jogar agora. As outras ficam recuadas. */
  readonly jogaveis?: ReadonlySet<string>;
  /**
   * O que a carta focada oferece: `usar`, `reagir` ou nada.
   *
   * O selo aparece **dentro** da moldura da carta levantada, e não num botão
   * solto na tela. Botão solto precisaria de um lugar próprio, e não há lugar
   * livre na faixa de baixo — o HUD ocupa a esquerda e os controles a direita.
   * Dentro da carta, o alvo de toque é a própria carta.
   */
  readonly selo?: string | null;
  readonly dadoDeTeste?: string;
}

export const Leque = ({
  zona,
  cartas,
  focada,
  invertido = false,
  emVoo,
  aoTocar,
  jogaveis,
  selo = null,
  dadoDeTeste,
}: LequeProps): React.JSX.Element => {
  const lugares = lugaresDoLeque({
    zona,
    total: cartas.length,
    focada,
    ...(invertido ? { invertido: true } : {}),
  });
  const { largura, altura } = tamanhoDaCartaNaMao(zona, invertido);

  return (
    <div
      className={`v2-leque${invertido ? ' v2-leque--maquina' : ''}`}
      data-teste={dadoDeTeste}
      style={{
        left: `${String(zona.x)}px`,
        top: `${String(zona.y)}px`,
        width: `${String(zona.largura)}px`,
        height: `${String(zona.altura)}px`,
      }}
    >
      {cartas.map((item, indice) => {
        const lugar = lugares[indice];
        if (lugar === undefined) return null;
        /*
         * Uma carta em voo desaparece do leque.
         *
         * O clone que viaja na camada de cima é quem a representa. Sem isso
         * haveria duas cartas iguais na tela ao mesmo tempo — e a da mão
         * sumiria de repente quando o voo acabasse.
         */
        if (emVoo?.has(item.chave) === true) return null;

        const podeJogar = jogaveis === undefined || jogaveis.has(item.chave);
        const classes = [
          'v2-leque__carta',
          lugar.focada ? 'v2-leque__carta--focada' : '',
          podeJogar ? '' : 'v2-leque__carta--bloqueada',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={item.chave}
            type="button"
            className={classes}
            data-teste={item.carta === null ? undefined : `carta-na-mao-${String(item.carta.id)}`}
            data-chave={item.chave}
            disabled={aoTocar === undefined}
            onClick={
              aoTocar === undefined
                ? undefined
                : () => {
                    aoTocar(indice);
                  }
            }
            style={{
              width: `${String(largura)}px`,
              height: `${String(altura)}px`,
              transform: [
                `translate3d(${String(lugar.x - zona.x - largura / 2)}px,`,
                `${String(lugar.y - zona.y - altura / 2)}px, 0)`,
                `rotate(${String(lugar.giro)}deg)`,
                `scale(${String(lugar.escala)})`,
              ].join(' '),
              zIndex: lugar.ordem,
              // O recuo escurece a vizinha sem apagá-la: ela continua legível.
              filter: lugar.recuo > 0 ? `brightness(${String(1 - lugar.recuo * 0.55)})` : undefined,
            }}
          >
            {item.carta === null ? (
              <VersoVetorial />
            ) : (
              <CartaVetorial carta={item.carta} comTexto={lugar.focada} />
            )}
            {lugar.focada && selo !== null && podeJogar && (
              <span className="v2-leque__selo" data-teste="usar-carta">
                {selo}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
