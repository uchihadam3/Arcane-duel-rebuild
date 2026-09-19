/*
 * As zonas seguras da tela.
 *
 * Este módulo é a correção **estrutural** que a revisão pediu. A separação
 * entre HUD, campo e mão não pode depender de `z-index`, porque `z-index`
 * decide quem fica por cima de quem — ele não impede a colisão, só escolhe o
 * vencedor dela. Aqui a colisão é impedida na **geometria**: cada camada
 * recebe um retângulo, os retângulos não se tocam, e um teste percorre os seis
 * viewports alvo e falha o build se algum par proibido se cruzar.
 *
 * A tela é dividida em três faixas horizontais e duas colunas de apoio:
 *
 *   ┌──────────────┬───────────────────────┬──────────────┐
 *   │ HUD da IA    │   mão da IA (versos)  │              │  faixa de cima
 *   ├──────────────┴───────────────────────┴──────────────┤
 *   │                  ARENA (tabuleiro 3D)               │  faixa do meio
 *   ├──────────────┬───────────────────────┬──────────────┤
 *   │ HUD do       │   mão do jogador      │  controles   │  faixa de baixo
 *   │ jogador      │                       │  de turno    │
 *   └──────────────┴───────────────────────┴──────────────┘
 *
 * A arena ocupa a faixa do meio inteira, e a projeção dela termina **antes**
 * da zona útil da mão: o pé das cartas da mão pode sair pela borda de baixo da
 * tela, mas o topo delas, que é onde mora o nome, nunca fica sob o campo.
 */

export interface Caixa {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

export interface Viewport {
  readonly largura: number;
  readonly altura: number;
}

export interface ZonasDaTela {
  readonly arena: Caixa;
  readonly maoDoJogador: Caixa;
  readonly maoDaMaquina: Caixa;
  readonly hudDoJogador: Caixa;
  readonly hudDaMaquina: Caixa;
  readonly controlesDeTurno: Caixa;
}

export type NomeDaZona = keyof ZonasDaTela;

/**
 * Os viewports alvo.
 *
 * 915×412 é o de calibração — a experiência de referência é celular deitado, e
 * é nele que a composição é decidida. Os outros cinco adaptam; nenhum deles
 * pode desmanchar o que foi calibrado no primeiro.
 */
export const VIEWPORTS_ALVO: readonly Viewport[] = [
  { largura: 915, altura: 412 },
  { largura: 844, altura: 390 },
  { largura: 800, altura: 360 },
  { largura: 720, altura: 360 },
  { largura: 1280, altura: 720 },
  { largura: 1560, altura: 720 },
];

export const VIEWPORT_DE_CALIBRACAO: Viewport = { largura: 915, altura: 412 };

/**
 * A altura mínima em que a batalha cabe deitada.
 *
 * Abaixo disto a composição não é espremida: a tela pede para girar. Achatar
 * esta arena em retrato produziria uma coisa pior que uma mensagem honesta.
 */
export const PROPORCAO_MINIMA_DEITADA = 1.5;

export const ehDeitado = (viewport: Viewport): boolean =>
  viewport.largura / Math.max(1, viewport.altura) >= PROPORCAO_MINIMA_DEITADA;

/*
 * As proporções da composição, calibradas em 915×412.
 *
 * Elas são frações da tela, e não pixels, para que a composição **escale** em
 * vez de se redistribuir: uma tela maior mostra a mesma composição maior, que
 * é o que mantém o enquadramento calibrado quando o aparelho muda.
 *
 * Os limites em pixels existem porque nem tudo escala bem: um HUD proporcional
 * fica ilegível em 720×360 e absurdo em 1560×720.
 */
const FAIXA_DE_CIMA = 0.175;
const FAIXA_DE_BAIXO = 0.29;
const MARGEM_LATERAL = 0.011;
const RESPIRO = 0.016;

const limitar = (valor: number, minimo: number, maximo: number): number =>
  Math.min(maximo, Math.max(minimo, valor));

/**
 * As seis zonas, para um viewport.
 *
 * Nenhuma delas é escrita por tentativa: a faixa de cima e a de baixo saem de
 * frações da altura, as colunas de apoio saem de frações da largura com
 * limites, e o que sobra é da arena. Como todas nascem da mesma subdivisão, a
 * ausência de colisão é uma propriedade da conta — o teste apenas confere que
 * ninguém a quebrou depois.
 */
export const zonasDaTela = (viewport: Viewport): ZonasDaTela => {
  const { largura: L, altura: A } = viewport;
  const margem = Math.round(L * MARGEM_LATERAL);
  const respiro = Math.round(A * RESPIRO);

  const alturaDeCima = Math.round(limitar(A * FAIXA_DE_CIMA, 54, 116));
  const alturaDeBaixo = Math.round(limitar(A * FAIXA_DE_BAIXO, 96, 214));

  /*
   * As colunas de apoio.
   *
   * Largura suficiente para "MOMENTUM ◆ ◆ ◇" caber numa linha e para
   * "ENCERRAR TURNO" caber no botão, e estreita o bastante para a mão ficar
   * com o meio da tela — que é onde a mão precisa estar.
   */
  const colunaDoHud = Math.round(limitar(L * 0.235, 168, 300));
  const colunaDosControles = Math.round(limitar(L * 0.215, 150, 272));

  const arena: Caixa = {
    x: 0,
    y: alturaDeCima + respiro,
    largura: L,
    altura: Math.max(0, A - alturaDeCima - alturaDeBaixo - respiro * 2),
  };

  const baseDaFaixaDeBaixo = arena.y + arena.altura + respiro;

  const hudDoJogador: Caixa = {
    x: margem,
    y: baseDaFaixaDeBaixo,
    largura: colunaDoHud,
    altura: A - baseDaFaixaDeBaixo - Math.round(A * 0.02),
  };

  const controlesDeTurno: Caixa = {
    x: L - margem - colunaDosControles,
    y: baseDaFaixaDeBaixo,
    largura: colunaDosControles,
    altura: hudDoJogador.altura,
  };

  /*
   * A zona útil da mão.
   *
   * "Útil" é a parte que precisa ficar legível: o topo das cartas. Ela começa
   * onde a faixa de baixo começa e vai até a borda da tela, porque o pé das
   * cartas sai pela borda de propósito — é o que permite que elas sejam
   * grandes o bastante para o nome ser lido num telefone.
   */
  const inicioDaMao = hudDoJogador.x + hudDoJogador.largura + margem;
  const maoDoJogador: Caixa = {
    x: inicioDaMao,
    y: baseDaFaixaDeBaixo,
    largura: Math.max(0, controlesDeTurno.x - margem - inicioDaMao),
    altura: A - baseDaFaixaDeBaixo,
  };

  const hudDaMaquina: Caixa = {
    x: margem,
    y: Math.round(A * 0.012),
    largura: colunaDoHud,
    altura: alturaDeCima - Math.round(A * 0.024),
  };

  /*
   * A mão da máquina.
   *
   * No topo, menor que a do jogador, e à direita do HUD dela — as duas coisas
   * moram na faixa de cima e não podem se cruzar. Ela é mais estreita porque
   * são versos: não há nome para ler, então não há motivo para ocupar espaço.
   */
  const inicioDaMaoDaMaquina = hudDaMaquina.x + hudDaMaquina.largura + margem;
  const maoDaMaquina: Caixa = {
    x: inicioDaMaoDaMaquina,
    y: 0,
    largura: Math.max(0, L - margem - inicioDaMaoDaMaquina),
    altura: alturaDeCima,
  };

  return { arena, maoDoJogador, maoDaMaquina, hudDoJogador, hudDaMaquina, controlesDeTurno };
};

/* ---------------------------------------------------------------------------
 * A conferência de colisão.
 * ------------------------------------------------------------------------- */

export const seCruzam = (a: Caixa, b: Caixa): boolean =>
  a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;

/**
 * Os pares que **não podem** se cruzar, com o motivo de cada um.
 *
 * A lista é explícita em vez de "todos contra todos" porque o motivo importa:
 * quando o teste falhar, quem for ler precisa saber o que quebrou e por quê,
 * e não só que dois retângulos se tocaram.
 */
export const PARES_PROIBIDOS: readonly {
  readonly a: NomeDaZona;
  readonly b: NomeDaZona;
  readonly porque: string;
}[] = [
  { a: 'hudDoJogador', b: 'maoDoJogador', porque: 'o HUD taparia as cartas que dá para jogar' },
  { a: 'controlesDeTurno', b: 'maoDoJogador', porque: 'Encerrar Turno cairia sobre a mão' },
  { a: 'hudDoJogador', b: 'controlesDeTurno', porque: 'os dois blocos de baixo se atropelariam' },
  { a: 'hudDoJogador', b: 'arena', porque: 'o HUD taparia Passiva, Classe, Ultimate ou Cooldown' },
  { a: 'controlesDeTurno', b: 'arena', porque: 'o controle de turno taparia o campo do jogador' },
  { a: 'maoDoJogador', b: 'arena', porque: 'o campo cobriria o topo legível das cartas da mão' },
  {
    a: 'hudDaMaquina',
    b: 'arena',
    porque: 'o HUD de cima taparia Passiva, Ultimate ou Cooldown da IA',
  },
  { a: 'hudDaMaquina', b: 'maoDaMaquina', porque: 'o HUD de cima e a mão da IA se atropelariam' },
  { a: 'maoDaMaquina', b: 'arena', porque: 'a mão da IA cobriria a retaguarda dela' },
  { a: 'hudDaMaquina', b: 'maoDoJogador', porque: 'nada de cima pode alcançar a mão' },
  { a: 'hudDaMaquina', b: 'hudDoJogador', porque: 'os dois HUDs precisam de faixas separadas' },
];

export interface Colisao {
  readonly viewport: Viewport;
  readonly a: NomeDaZona;
  readonly b: NomeDaZona;
  readonly porque: string;
}

/** Toda colisão proibida, em todos os viewports alvo. Vazio é o que se espera. */
export const colisoesProibidas = (
  viewports: readonly Viewport[] = VIEWPORTS_ALVO,
): readonly Colisao[] => {
  const achadas: Colisao[] = [];
  for (const viewport of viewports) {
    const zonas = zonasDaTela(viewport);
    for (const par of PARES_PROIBIDOS) {
      if (seCruzam(zonas[par.a], zonas[par.b])) {
        achadas.push({ viewport, a: par.a, b: par.b, porque: par.porque });
      }
    }
  }
  return achadas;
};
