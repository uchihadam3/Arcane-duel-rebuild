import { useId } from 'react';

import { Materiais, OPACIDADE_DA_LUZ_DE_CLASSE, PALETA } from './materiais.jsx';
import type { Metade, Retangulo } from './planta.js';
import {
  COMPARTIMENTO_DE_COOLDOWN,
  LINHA_DE_CENTRO,
  PEDESTAL_DE_ACAO,
  TABULEIRO,
  ZONAS_DE_COOLDOWN,
  compartimentoDeCooldown,
  encaixeDePassiva,
  pecaDeCooldown,
  pedestalDeAcao,
  pedestalDeClasse,
  slotDeUltimate,
} from './planta.js';

/*
 * A superfície da arena, desenhada por código.
 *
 * Nada aqui vem de imagem. A leitura de "pedra escura nobre com metal
 * envelhecido e ouro" sai de camadas empilhadas sempre na mesma ordem, e a
 * ordem é o que produz a sensação de objeto físico:
 *
 *   1. a pedra, com variação tonal, granulação, veios e microfissuras;
 *   2. a estrutura de metal escuro, com bisel — luz em cima, sombra embaixo;
 *   3. o ouro, sempre como **fio**, nunca como área;
 *   4. o sulco arcano, a única coisa que emite luz, e pouca;
 *   5. a luz ambiente e a vinheta, que fecham os cantos.
 *
 * O centro fica deliberadamente livre. Os três pedestais de Ação de cada lado
 * são o que o olho precisa achar primeiro, e ornamento entre eles é ruído. O
 * ornamento mora na borda, e os cantos da borda são mais elaborados que as
 * laterais — que é como uma peça cara de verdade é feita: o trabalho vai onde
 * a vista para.
 */

const CHANFRO = 13;

const placa = (caixa: Retangulo, chanfro = CHANFRO): string => {
  const { x, y, largura: l, altura: a } = caixa;
  return [
    `M ${String(x + chanfro)} ${String(y)}`,
    `H ${String(x + l - chanfro)}`,
    `L ${String(x + l)} ${String(y + chanfro)}`,
    `V ${String(y + a - chanfro)}`,
    `L ${String(x + l - chanfro)} ${String(y + a)}`,
    `H ${String(x + chanfro)}`,
    `L ${String(x)} ${String(y + a - chanfro)}`,
    `V ${String(y + chanfro)}`,
    'Z',
  ].join(' ');
};

const encolher = (caixa: Retangulo, quanto: number): Retangulo => ({
  x: caixa.x + quanto,
  y: caixa.y + quanto,
  largura: caixa.largura - quanto * 2,
  altura: caixa.altura - quanto * 2,
});

/**
 * Um anel: a banda entre duas placas, e só ela.
 *
 * A moldura precisa disto e não de um retângulo preenchido. A primeira versão
 * desenhava a base de metal como uma placa cheia do tamanho do tabuleiro, por
 * cima de tudo — e o campo inteiro sumiu debaixo dela. Duas subtrajetórias com
 * `evenodd` preenchem só a faixa, que é o que uma moldura é.
 */
const anel = (fora: Retangulo, espessura: number, chanfro: number): string =>
  `${placa(fora, chanfro)} ${placa(encolher(fora, espessura), Math.max(2, chanfro - espessura))}`;

interface Pincel {
  readonly url: (nome: string) => string;
}

/* ---------------------------------------------------------------------------
 * A cavidade: onde uma carta assenta.
 * ------------------------------------------------------------------------- */

interface CavidadeProps extends Pincel {
  readonly caixa: Retangulo;
  /** Quanto esta cavidade pesa na composição, de 0 a 1. */
  readonly peso: number;
  readonly chanfro?: number;
}

/**
 * Uma cavidade, e não um pedestal saliente.
 *
 * Uma carta que entra num buraco tem sombra de contato e tem lugar; uma carta
 * pousada em cima de um bloco flutua. A profundidade sai de quatro traços, e
 * os quatro são necessários: a sombra que a borda de cima projeta para dentro,
 * o fio de ouro que contorna, o brilho fino na aresta de baixo que fecha o
 * relevo, e o escurecimento do fundo.
 */
const Cavidade = ({ caixa, peso, chanfro = CHANFRO, url }: CavidadeProps): React.JSX.Element => (
  <g>
    <path d={placa(caixa, chanfro)} fill={url('cavidade')} />
    <path
      d={placa(caixa, chanfro)}
      fill="none"
      stroke={url('fioDeOuro')}
      strokeWidth={1.2 + peso * 1.9}
      strokeOpacity={0.34 + peso * 0.42}
    />
    <path
      d={`M ${String(caixa.x + chanfro)} ${String(caixa.y + 2.5)} H ${String(caixa.x + caixa.largura - chanfro)}`}
      stroke="#000000"
      strokeOpacity="0.8"
      strokeWidth={5 + peso * 5}
      strokeLinecap="round"
      filter={url('suavizar')}
    />
    <path
      d={`M ${String(caixa.x + chanfro)} ${String(caixa.y + caixa.altura - 2)} H ${String(caixa.x + caixa.largura - chanfro)}`}
      stroke="#8e8574"
      strokeOpacity={0.24 + peso * 0.22}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </g>
);

/** Os parafusos que prendem uma placa. Quatro, nos cantos, sempre. */
const Rebites = ({
  caixa,
  raio = 3.6,
  recuo = 11,
  url,
}: {
  readonly caixa: Retangulo;
  readonly raio?: number;
  readonly recuo?: number;
} & Pincel): React.JSX.Element => (
  <g>
    {(
      [
        [caixa.x + recuo, caixa.y + recuo],
        [caixa.x + caixa.largura - recuo, caixa.y + recuo],
        [caixa.x + recuo, caixa.y + caixa.altura - recuo],
        [caixa.x + caixa.largura - recuo, caixa.y + caixa.altura - recuo],
      ] as const
    ).map(([cx, cy]) => (
      <g key={`${String(cx)}-${String(cy)}`}>
        <circle cx={cx} cy={cy} r={raio} fill={url('metalRebite')} />
        <circle cx={cx} cy={cy - 0.8} r={raio * 0.42} fill="#c4bba8" opacity="0.42" />
      </g>
    ))}
  </g>
);

/* ---------------------------------------------------------------------------
 * O pedestal de Ação: a maior peça da arena.
 * ------------------------------------------------------------------------- */

const MARCAS_DE_ACAO = ['I', 'II', 'III'] as const;

/**
 * O pedestal de Ação.
 *
 * Ele não é um retângulo com borda. É uma peça construída: a base de metal que
 * sai da pedra, o aro que a contorna, a cavidade funda onde a carta entra, o
 * sulco arcano que corre pela base, o fio de ouro, a marca pequena, e a sombra
 * que a peça inteira projeta na mesa.
 *
 * A marca é pequena de propósito. O pedestal precisa ser reconhecível pela
 * forma e pela posição — se ele precisa de um rótulo grande para ser entendido,
 * a composição falhou antes.
 */
const PedestalDeAcao = ({
  caixa,
  marca,
  energia,
  url,
}: {
  readonly caixa: Retangulo;
  readonly marca: string;
  readonly energia: string;
} & Pincel): React.JSX.Element => {
  const base = { ...encolher(caixa, -13), altura: caixa.altura + 30 };
  const aro = encolher(caixa, -5);
  const centroX = caixa.x + caixa.largura / 2;
  return (
    <g filter={url('sombraDaPeca')}>
      {/* A base de metal, que sai da pedra e dá altura à peça. */}
      <path d={placa(base, CHANFRO + 5)} fill={url('metal')} />
      <path
        d={placa(base, CHANFRO + 5)}
        fill="none"
        stroke="#0a0810"
        strokeOpacity="0.85"
        strokeWidth="2"
      />
      {/* O aro de bronze que contorna a cavidade. */}
      <path d={placa(aro, CHANFRO + 2)} fill={url('bronzeLargo')} />
      <path
        d={placa(aro, CHANFRO + 2)}
        fill="none"
        stroke={url('fioDeOuro')}
        strokeWidth="1.6"
        strokeOpacity="0.72"
      />
      <Cavidade caixa={caixa} peso={1} url={url} />
      <Rebites caixa={base} recuo={13} raio={4} url={url} />

      {/* O sulco arcano na base: a luz contextual, discreta. */}
      <path
        d={`M ${String(base.x + 16)} ${String(base.y + base.altura - 13)} H ${String(base.x + base.largura - 16)}`}
        stroke={energia}
        strokeOpacity="0.32"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* A marca, gravada na base. Dois traços: o fundo e a luz. */}
      <text
        x={centroX}
        y={base.y + base.altura - 20}
        textAnchor="middle"
        fontFamily="ui-serif, Georgia, serif"
        fontSize="27"
        letterSpacing="5"
        fill="#05040a"
        opacity="0.85"
      >
        {marca}
      </text>
      <text
        x={centroX}
        y={base.y + base.altura - 21.5}
        textAnchor="middle"
        fontFamily="ui-serif, Georgia, serif"
        fontSize="27"
        letterSpacing="5"
        fill={PALETA.ouroClaro}
        opacity="0.42"
      >
        {marca}
      </text>
    </g>
  );
};

/**
 * O trilho das Passivas.
 *
 * Quatro cavidades soltas na retaguarda leem como quatro falhas na pedra. Um
 * trilho baixo ligando as quatro lê como fileira **desenhada** — e a diferença
 * entre uma composição cuidada e uma composição funcional mora exatamente aí.
 * Ele é discreto de propósito: a Passiva é a menor peça da arena e não pode
 * competir com o centro.
 */
const TrilhoDePassivas = ({
  metade,
  url,
}: { readonly metade: Metade } & Pincel): React.JSX.Element => {
  const primeiro = encaixeDePassiva(metade, 0);
  const ultimo = encaixeDePassiva(metade, 3);
  const esquerda = Math.min(primeiro.x, ultimo.x);
  const direita = Math.max(primeiro.x + primeiro.largura, ultimo.x + ultimo.largura);
  const corpo: Retangulo = {
    x: esquerda - 22,
    y: primeiro.y - 14,
    largura: direita - esquerda + 44,
    altura: primeiro.altura + 28,
  };
  return (
    <g>
      <path d={placa(corpo, 18)} fill={url('metal')} opacity="0.85" />
      <path
        d={placa(corpo, 18)}
        fill="none"
        stroke={url('fioDeOuro')}
        strokeWidth="1.5"
        strokeOpacity="0.42"
      />
      {/* O fio gravado que corre por dentro do trilho, ligando as quatro. */}
      <path
        d={`M ${String(corpo.x + 16)} ${String(corpo.y + corpo.altura / 2)} H ${String(corpo.x + corpo.largura - 16)}`}
        stroke={PALETA.ouro}
        strokeOpacity="0.22"
        strokeWidth="1.4"
      />
      {[0, 1, 2, 3].map((indice) => (
        <Cavidade
          key={indice}
          caixa={encaixeDePassiva(metade, indice)}
          peso={0.24}
          chanfro={10}
          url={url}
        />
      ))}
      <Rebites caixa={corpo} recuo={11} raio={3} url={url} />
    </g>
  );
};

/* ---------------------------------------------------------------------------
 * A peça de cooldown: um corpo só, com três compartimentos.
 * ------------------------------------------------------------------------- */

/**
 * A gaveta de cooldown.
 *
 * Três caixas soltas leem como três marcadores. Um corpo único com três
 * divisões lê como gaveta — e gaveta é o que ela é, porque a carta **entra**
 * num compartimento e depois anda de um para o outro. As divisórias são
 * desenhadas como costelas de metal, com luz de um lado e sombra do outro,
 * para que a peça leia como fundida e não como três coisas encostadas.
 */
const PecaDeCooldown = ({
  metade,
  url,
}: { readonly metade: Metade } & Pincel): React.JSX.Element => {
  const corpo = pecaDeCooldown(metade);
  return (
    <g filter={url('sombraDaPeca')}>
      <path d={placa(corpo, CHANFRO + 6)} fill={url('metal')} />
      <path
        d={placa(corpo, CHANFRO + 6)}
        fill="none"
        stroke={url('fioDeOuro')}
        strokeWidth="1.8"
        strokeOpacity="0.55"
      />
      <path
        d={placa(encolher(corpo, 5), CHANFRO + 3)}
        fill="none"
        stroke="#0a0810"
        strokeOpacity="0.6"
        strokeWidth="1.4"
      />
      {ZONAS_DE_COOLDOWN.map((zona) => (
        <Cavidade
          key={zona}
          caixa={compartimentoDeCooldown(metade, zona)}
          peso={0.34}
          chanfro={9}
          url={url}
        />
      ))}
      {/* As costelas entre os compartimentos, com luz de um lado e sombra do outro. */}
      {[1, 2].map((corte) => {
        const anterior = compartimentoDeCooldown(metade, corte === 1 ? 1 : 2);
        const x = anterior.x + anterior.largura + (COMPARTIMENTO_DE_COOLDOWN.largura > 0 ? 4 : 0);
        return (
          <g key={corte}>
            <path
              d={`M ${String(x)} ${String(corpo.y + 8)} V ${String(corpo.y + corpo.altura - 8)}`}
              stroke="#5b5364"
              strokeOpacity="0.5"
              strokeWidth="1.4"
            />
            <path
              d={`M ${String(x + 1.6)} ${String(corpo.y + 8)} V ${String(corpo.y + corpo.altura - 8)}`}
              stroke="#07060a"
              strokeOpacity="0.7"
              strokeWidth="1.6"
            />
          </g>
        );
      })}
      <Rebites caixa={corpo} recuo={10} raio={3.2} url={url} />
    </g>
  );
};

/* ---------------------------------------------------------------------------
 * O slot de Ultimate: único, e por isso mais ornamentado.
 * ------------------------------------------------------------------------- */

const SlotDeUltimate = ({
  caixa,
  energia,
  url,
}: { readonly caixa: Retangulo; readonly energia: string } & Pincel): React.JSX.Element => {
  const moldura = encolher(caixa, -14);
  const centro = { x: caixa.x + caixa.largura / 2, y: caixa.y + caixa.altura / 2 };
  return (
    <g filter={url('sombraDaPeca')}>
      <path d={placa(moldura, CHANFRO + 8)} fill={url('metal')} />
      <path
        d={placa(moldura, CHANFRO + 8)}
        fill="none"
        stroke={url('fioDeOuro')}
        strokeWidth="3.4"
        strokeOpacity="0.88"
      />
      {/* A segunda volta de ouro: só a Ultimate tem duas. */}
      <path
        d={placa(encolher(moldura, 8), CHANFRO + 5)}
        fill="none"
        stroke={PALETA.ouro}
        strokeOpacity="0.45"
        strokeWidth="1.6"
      />
      {/*
       * O anel de raios em volta do encaixe.
       *
       * É o único ornamento da arena que fica **dentro** de uma peça, e é o
       * que faz a Ultimate ler como diferente sem precisar ser maior. Dezesseis
       * raios curtos, alternando comprimento, presos à moldura.
       */}
      <g opacity="0.58">
        {Array.from({ length: 16 }, (_, indice) => indice).map((indice) => {
          const angulo = (indice * Math.PI * 2) / 16;
          const raioInterno = caixa.largura * 0.58;
          const comprimento = indice % 2 === 0 ? 17 : 9;
          return (
            <path
              key={indice}
              d={`M ${String(centro.x + Math.cos(angulo) * raioInterno)} ${String(centro.y + Math.sin(angulo) * raioInterno * 0.78)}
                  l ${String(Math.cos(angulo) * comprimento)} ${String(Math.sin(angulo) * comprimento * 0.78)}`}
              stroke={PALETA.ouroClaro}
              strokeOpacity="0.6"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      {/*
       * A gema no alto da moldura.
       *
       * A Ultimate precisa ler como diferente **sem ser maior** — maior faria
       * dela o centro da arena, e o centro é das três Ações. A gema e o anel
       * de raios fazem isso por ornamento, que é como uma peça cara se
       * distingue de uma peça comum.
       */}
      <g transform={`translate(${String(centro.x)} ${String(moldura.y + 3)})`}>
        <path
          d="M 0 -11 L 13 0 L 0 11 L -13 0 Z"
          fill={energia}
          fillOpacity="0.55"
          stroke={PALETA.ouroClaro}
          strokeOpacity="0.8"
          strokeWidth="1.6"
        />
        <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" fill="#ffffff" opacity="0.32" />
      </g>
      <Cavidade caixa={caixa} peso={0.8} url={url} />
      <Rebites caixa={moldura} recuo={11} raio={3.4} url={url} />
      <path
        d={`M ${String(moldura.x + 18)} ${String(moldura.y + moldura.altura - 10)} H ${String(moldura.x + moldura.largura - 18)}`}
        stroke={energia}
        strokeOpacity="0.3"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
  );
};

/* ---------------------------------------------------------------------------
 * A moldura externa: seis camadas, cantos mais elaborados.
 * ------------------------------------------------------------------------- */

const CANTO = 96;

/**
 * O ornamento de canto.
 *
 * Duas voltas de fio dourado e um losango, presos à quina. Ele existe nos
 * quatro cantos e é o mesmo desenho girado — pela mesma razão que a metade da
 * máquina é derivada: dois ornamentos escritos à mão divergem.
 */
const OrnamentoDeCanto = ({
  x,
  y,
  giro,
}: {
  readonly x: number;
  readonly y: number;
  readonly giro: number;
}): React.JSX.Element => (
  <g transform={`translate(${String(x)} ${String(y)}) rotate(${String(giro)})`} opacity="0.85">
    <path
      d={`M 8 ${String(CANTO)} V 46 Q 8 8 46 8 H ${String(CANTO)}`}
      fill="none"
      stroke={PALETA.ouro}
      strokeOpacity="0.8"
      strokeWidth="3.4"
    />
    <path
      d={`M 22 ${String(CANTO - 6)} V 54 Q 22 22 54 22 H ${String(CANTO - 6)}`}
      fill="none"
      stroke={PALETA.ouroClaro}
      strokeOpacity="0.4"
      strokeWidth="1.2"
    />
    <path
      d="M 38 38 l 13 -12 l 13 12 l -13 12 Z"
      fill={PALETA.ouro}
      fillOpacity="0.5"
      stroke={PALETA.ouroClaro}
      strokeOpacity="0.5"
      strokeWidth="1"
    />
  </g>
);

const Moldura = ({ url }: Pincel): React.JSX.Element => {
  const fora: Retangulo = { x: 0, y: 0, largura: TABULEIRO.largura, altura: TABULEIRO.altura };
  return (
    <g>
      {/* 1 · a sombra externa, que descola a mesa do fundo */}
      <path
        d={placa(encolher(fora, 4), 30)}
        fill="none"
        stroke="#000000"
        strokeOpacity="0.85"
        strokeWidth="22"
        filter={url('suavizar')}
      />
      {/*
       * 2 · a base metálica.
       *
       * Anel, e não placa. Preenchida, ela cobriria o campo inteiro — foi
       * exatamente o que aconteceu na primeira prova, e o tabuleiro saiu vazio.
       */}
      <path d={anel(fora, 52, 32)} fill={url('metal')} fillRule="evenodd" />
      {/* 3 · o filete dourado */}
      <path
        d={placa(encolher(fora, 12), 26)}
        fill="none"
        stroke={url('fioDeOuro')}
        strokeWidth="3.6"
        strokeOpacity="0.9"
      />
      {/* 4 · a pedra da borda, entre o filete e o ornamento */}
      <path
        d={placa(encolher(fora, 26), 22)}
        fill="none"
        stroke={PALETA.pedraProfunda}
        strokeWidth="20"
        strokeOpacity="0.92"
      />
      {/* 5 · o ornamento interno: um fio fino e contínuo */}
      <path
        d={placa(encolher(fora, 42), 18)}
        fill="none"
        stroke={PALETA.ouro}
        strokeOpacity="0.42"
        strokeWidth="1.8"
      />
      {/* 6 · o microdetalhe: a aresta de luz que fecha a borda interna */}
      <path
        d={placa(encolher(fora, 48), 16)}
        fill="none"
        stroke="#8b8294"
        strokeOpacity="0.18"
        strokeWidth="1.4"
      />
      <OrnamentoDeCanto x={14} y={14} giro={0} />
      <OrnamentoDeCanto x={TABULEIRO.largura - 14} y={14} giro={90} />
      <OrnamentoDeCanto x={TABULEIRO.largura - 14} y={TABULEIRO.altura - 14} giro={180} />
      <OrnamentoDeCanto x={14} y={TABULEIRO.altura - 14} giro={270} />
    </g>
  );
};

/* ---------------------------------------------------------------------------
 * O centro livre.
 * ------------------------------------------------------------------------- */

/**
 * O brasão do centro.
 *
 * Contraste baixo, e é obrigatório que seja: este é o corredor por onde golpe,
 * projétil e magia atravessam, e um ornamento forte aqui competiria com o
 * efeito toda vez que uma carta resolve. Ele existe para que a mesa não tenha
 * um vazio morto no meio — não para ser visto.
 */
const BrasaoDoCentro = ({ url }: Pincel): React.JSX.Element => {
  const cx = TABULEIRO.largura / 2;
  const cy = LINHA_DE_CENTRO;
  /*
   * O brasão é **grande**.
   *
   * Na primeira versão ele cabia inteiro dentro do corredor, e por isso lia
   * como um adorno pequeno perdido num vazio. Um emblema de arena é gravado no
   * chão e passa por baixo do que estiver em cima dele: aqui ele é desenhado
   * antes das treze zonas, então os pedestais o cobrem em parte, que é
   * exatamente o que faz uma marca de piso parecer marca de piso.
   *
   * O achatamento é o que o mantém legível sob a inclinação da câmera: visto
   * a 47°, uma elipse com esta razão volta a parecer um círculo.
   */
  const RAIOS = [430, 336, 214] as const;
  const ACHATAMENTO = 0.42;
  const raioDasRunas = 384;
  return (
    <g opacity="0.3" data-teste="brasao-do-centro">
      {/* As linhas gravadas que correm para os lados, sumindo nas pontas. */}
      <path
        d={`M 120 ${String(cy)} H ${String(cx - RAIOS[0] - 40)}`}
        stroke={url('sulco')}
        strokeWidth="3.2"
      />
      <path
        d={`M ${String(cx + RAIOS[0] + 40)} ${String(cy)} H ${String(TABULEIRO.largura - 120)}`}
        stroke={url('sulco')}
        strokeWidth="3.2"
      />
      {RAIOS.map((raio, indice) => (
        <ellipse
          key={raio}
          cx={cx}
          cy={cy}
          rx={raio}
          ry={raio * ACHATAMENTO}
          fill="none"
          stroke={indice === 0 ? PALETA.ouro : PALETA.sulco}
          strokeOpacity={indice === 0 ? 0.6 : 0.8}
          strokeWidth={indice === 0 ? 3.4 : 2}
        />
      ))}
      {/* Doze runas curtas no anel. Abstratas, e de propósito. */}
      {Array.from({ length: 12 }, (_, indice) => (indice * 360) / 12).map((angulo) => {
        const radianos = (angulo * Math.PI) / 180;
        return (
          <path
            key={angulo}
            transform={`translate(${String(cx + Math.cos(radianos) * raioDasRunas)} ${String(cy + Math.sin(radianos) * raioDasRunas * ACHATAMENTO)}) rotate(${String(angulo)})`}
            d="M -14 -16 L 14 -16 M 0 -16 L 0 16 M -11 10 L 11 10"
            stroke={PALETA.ouroClaro}
            strokeOpacity="0.45"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
      {/*
       * O nome, gravado no centro.
       *
       * Ele é a razão de o brasão existir: a mesa é de um jogo, e o jogo tem
       * nome. O contraste é o mínimo que ainda se lê — acima disso ele
       * competiria com o efeito que atravessa este mesmo corredor.
       */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fontSize="72"
        letterSpacing="26"
        fill={PALETA.ouroClaro}
        fillOpacity="0.18"
        fontFamily="'Iowan Old Style', Palatino, Georgia, serif"
      >
        ARCANE
      </text>
      <text
        x={cx}
        y={cy + 62}
        textAnchor="middle"
        fontSize="72"
        letterSpacing="26"
        fill={PALETA.ouroClaro}
        fillOpacity="0.18"
        fontFamily="'Iowan Old Style', Palatino, Georgia, serif"
      >
        DUEL
      </text>
      {/* O losango, agora nas pontas do eixo, onde ele não cobre o nome. */}
      {[-1, 1].map((lado) => (
        <path
          key={lado}
          d={`M ${String(cx + lado * 262)} ${String(cy - 44)} l ${String(lado * 30)} 44 l ${String(-lado * 30)} 44 l ${String(-lado * 30)} -44 Z`}
          fill={PALETA.ouro}
          fillOpacity="0.22"
          stroke={PALETA.ouroClaro}
          strokeOpacity="0.4"
          strokeWidth="1.4"
        />
      ))}
    </g>
  );
};

/* ---------------------------------------------------------------------------
 * A composição.
 * ------------------------------------------------------------------------- */

export interface TabuleiroProps {
  readonly energiaDoJogador: string;
  readonly energiaDaMaquina: string;
  /**
   * As metades que ganharam a quarta Ação agora.
   *
   * Não existe quarto pedestal permanente. Quando uma regra concede a Ação
   * extra, o pedestal **surge** — menor, à direita do trio, com uma entrada
   * curta — e some quando a concessão acaba. Exceção de regra não polui a
   * arena para sempre.
   */
  readonly acoesExtras?: readonly Metade[];
}

const METADES: readonly Metade[] = ['maquina', 'jogador'];

export const Tabuleiro = ({
  energiaDoJogador,
  energiaDaMaquina,
  acoesExtras = [],
}: TabuleiroProps): React.JSX.Element => {
  /*
   * Identificador único por tabuleiro.
   *
   * `id` em SVG é global no documento, e `useId` reinicia a cada
   * `renderToStaticMarkup` — então sozinho ele volta a colidir fora do
   * navegador, que é onde a folha de prova desenha seis arenas na mesma
   * página. As energias entram no sufixo porque são o que distingue um
   * tabuleiro do outro.
   */
  const sufixo = `${useId()}${energiaDoJogador}${energiaDaMaquina}`.replace(/[^a-zA-Z0-9]/g, '');
  const url = (nome: string): string => `url(#${nome}${sufixo})`;
  const energiaDa = (metade: Metade): string =>
    metade === 'jogador' ? energiaDoJogador : energiaDaMaquina;

  return (
    <svg
      className="v2-tabuleiro__svg"
      viewBox={`0 0 ${String(TABULEIRO.largura)} ${String(TABULEIRO.altura)}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <Materiais
        sufixo={sufixo}
        energiaDoJogador={energiaDoJogador}
        energiaDaMaquina={energiaDaMaquina}
      />

      {/* 1 · a pedra */}
      <rect width={TABULEIRO.largura} height={TABULEIRO.altura} fill={url('pedraBase')} />
      <rect
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        filter={url('desgaste')}
        opacity="0.55"
      />
      <rect
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        filter={url('veios')}
        opacity="0.8"
      />
      <rect
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        fill={url('fissuras')}
        mask={`url(#bordasApenas${sufixo})`}
        opacity="0.6"
      />
      {/*
       * As manchas de temperatura, entre o veio e a granulação.
       *
       * Elas entram **antes** da granulação de propósito: o grão precisa
       * passar por cima das manchas, e não ao contrário, ou a pedra ganha um
       * aspecto de tinta aplicada sobre textura.
       */}
      <rect
        data-camada="luz"
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        filter={url('manchaQuente')}
        opacity="0.3"
        style={{ mixBlendMode: 'soft-light' }}
      />
      <rect
        data-camada="luz"
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        filter={url('manchaFria')}
        opacity="0.26"
        style={{ mixBlendMode: 'soft-light' }}
      />
      <rect
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        filter={url('granulacao')}
        opacity="0.85"
      />

      {/*
       * A luz de classe de cada lado, ainda por baixo das peças.
       *
       * Ela é ambiente: ilumina a **pedra**, e não as cartas. Por isso entra
       * aqui, antes das treze zonas, e não na camada de luz do fim — lá ela
       * pintaria as peças junto e a arena viraria duas metades coloridas.
       */}
      <rect
        data-camada="luz"
        data-teste="luz-de-classe-maquina"
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        fill={url('luzDaMaquina')}
        opacity={String(OPACIDADE_DA_LUZ_DE_CLASSE)}
        style={{ mixBlendMode: 'screen' }}
      />
      <rect
        data-camada="luz"
        data-teste="luz-de-classe-jogador"
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        fill={url('luzDoJogador')}
        opacity={String(OPACIDADE_DA_LUZ_DE_CLASSE)}
        style={{ mixBlendMode: 'screen' }}
      />

      {/* 2 · o centro livre, desenhado antes das peças para ficar por baixo */}
      <BrasaoDoCentro url={url} />

      {/* 3 · as treze zonas de cada metade */}
      {METADES.map((metade) => (
        <g key={metade}>
          <TrilhoDePassivas metade={metade} url={url} />
          {[0, 1].map((indice) => {
            const caixa = pedestalDeClasse(metade, indice);
            return (
              <g key={indice} filter={url('sombraDaPeca')}>
                <path d={placa(encolher(caixa, -7), CHANFRO + 4)} fill={url('bronzeLargo')} />
                <path
                  d={placa(encolher(caixa, -7), CHANFRO + 4)}
                  fill="none"
                  stroke={url('fioDeOuro')}
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                />
                <Cavidade caixa={caixa} peso={0.5} chanfro={11} url={url} />
              </g>
            );
          })}
          <PecaDeCooldown metade={metade} url={url} />
          <SlotDeUltimate caixa={slotDeUltimate(metade)} energia={energiaDa(metade)} url={url} />
          {([0, 1, 2] as const).map((indice) => (
            <PedestalDeAcao
              key={indice}
              caixa={pedestalDeAcao(metade, indice)}
              marca={MARCAS_DE_ACAO[indice] ?? ''}
              energia={energiaDa(metade)}
              url={url}
            />
          ))}
          {acoesExtras.includes(metade) && (
            <g className="v2-acao-extra" data-teste={`acao-extra-${metade}`}>
              <PedestalDeAcao
                caixa={pedestalDeAcao(metade, 3)}
                marca="IV"
                energia={energiaDa(metade)}
                url={url}
              />
            </g>
          )}
        </g>
      ))}

      {/*
       * 4 · a luz e a vinheta, por cima de tudo.
       *
       * Estas duas cobrem o tabuleiro inteiro, e podem: são passagens de luz
       * translúcidas, não pintura. `data-camada="luz"` é a declaração disso —
       * o teste que impede uma forma cheia de tapar o campo lê essa marca, e
       * sem ela ele reprova. Foi assim que a base de metal da moldura apagou a
       * arena inteira na primeira prova.
       */}
      <rect
        data-camada="luz"
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        fill={url('luzAmbiente')}
        style={{ mixBlendMode: 'screen' }}
      />
      <rect
        data-camada="luz"
        width={TABULEIRO.largura}
        height={TABULEIRO.altura}
        fill={url('vinheta')}
      />
      <Moldura url={url} />
    </svg>
  );
};

/** A altura que o pedestal de Ação ocupa, para quem precisa reservar espaço. */
export const ALTURA_DO_PEDESTAL = PEDESTAL_DE_ACAO.altura;
