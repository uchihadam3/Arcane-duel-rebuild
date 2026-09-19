import {
  AdditiveBlending,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import type { Material, Texture } from 'three';
import type { EstadoDeSelecao } from '@arcane-duel/ui';
import type { QualidadeDeVfx } from '@arcane-duel/vfx';
import { ORCAMENTO_VISUAL } from '@arcane-duel/vfx';

import type { EstadoVisualDaArena } from './estado-visual.js';
import type { FormaDaPeca, PecaDaArena } from './layout.js';
import { DESLOCAMENTO_DO_TAMPO, MEIA_ARENA, PECAS_DA_ARENA, TAMPO } from './layout.js';
import { ARENA, paletaDaClasse } from './paleta.js';
import type { ContextoDeTextura, FabricaDeTexturas, NivelDeTextura } from './textura-de-carta.js';
import { criarFabricaDeTexturas } from './textura-de-carta.js';

/*
 * A cena da arena.
 *
 * Geometria de verdade, luz de verdade, sombra de verdade. As zonas são lajes
 * embutidas no tampo, com a mesma iluminação do resto da mesa — uma zona vazia
 * continua sendo objeto do mundo, e não um buraco na interface. Foi essa a
 * leitura mais forte do vídeo de referência, e é ela que separa uma arena de
 * dez retângulos inclinados.
 *
 * A câmera não mora aqui: ela é fixa, vem de `camera.ts`, e nada nesta cena
 * pode movê-la.
 *
 * Nenhuma regra passa por este arquivo. Ele recebe um estado visual já
 * projetado e o desenha.
 */

/** Proporção mestre do catálogo, aplicada à carta como objeto do mundo. */
const CARTA = { largura: 2.5, altura: 3.5 } as const;
/** A altura em que uma carta assenta acima da laje. */
const ALTURA_DA_CARTA = 0.28;

/*
 * Que arte aprovada cada forma usa — e quais não usam nenhuma.
 *
 * `slot-passiva` está no catálogo e **não foi entregue**. A versão reprovada
 * pedia o arquivo mesmo assim e, no erro, caía para um retângulo cinza opaco:
 * eram oito manchas chapadas por cima da arena, uma por Passiva de cada lado.
 * Zona sem arte aprovada agora não recebe arte nenhuma — recebe um rebaixo, e
 * a pedra da arena continua aparecendo por baixo.
 */
const ASSET_DO_SLOT: Readonly<Record<FormaDaPeca, string | null>> = {
  acao: 'slot-acao',
  resposta: 'slot-resposta',
  'carta-de-classe': 'slot-carta-de-classe',
  passiva: null,
  ultimate: 'slot-ultimate',
  // A bandeja de cooldown é uma peça só, com três encaixes desenhados: ela é
  // montada uma vez, cobrindo CD1, CD2 e CD3 — repeti-la em cada um mostraria
  // três bandejas de três encaixes.
  cooldown: null,
  condicoes: 'tray-condicoes',
  // O Personagem é carta, e a carta desenha a si mesma.
  personagem: null,
  removidas: null,
  mao: null,
};

/*
 * Quanto cada forma pesa na composição.
 *
 * É a hierarquia do olho, e é o que faltava: na versão reprovada as quarenta e
 * uma zonas tinham todas o mesmo peso, com pedestal escuro e placa por cima —
 * um xadrez de retângulos pretos que enterrava a arena e não dizia onde olhar
 * primeiro. Os três espaços de Ação são o choque da partida e vêm na frente;
 * o resto é apoio e fica discreto.
 */
const PESO_DA_PECA: Readonly<Record<FormaDaPeca, number>> = {
  acao: 1,
  resposta: 0.78,
  'carta-de-classe': 0.66,
  ultimate: 0.7,
  condicoes: 0.5,
  cooldown: 0.5,
  passiva: 0.42,
  personagem: 0.42,
  removidas: 0.34,
  mao: 0,
};

/** A luz que cada estado de seleção acende na própria carta. */
const REALCE_DA_SELECAO: Readonly<Record<EstadoDeSelecao, number>> = {
  nenhum: 0x000000,
  selecionavel: 0x16253d,
  selecionada: 0x54411a,
  'alvo-valido': 0x16351f,
};

/*
 * A que altura a placa da zona assenta sobre a arena.
 *
 * Milímetros, e não degraus. A arte da arena é um chão pintado em perspectiva;
 * levantar cada zona num pedestal de vinte centímetros somava uma segunda
 * perspectiva por cima da primeira e era metade do motivo de o campo ler como
 * uma cama tombada. A profundidade quem dá é a sombra da carta, não a caixa
 * embaixo dela.
 */
const ASSENTAMENTO: Readonly<Record<FormaDaPeca, number>> = {
  acao: 0.03,
  resposta: 0.026,
  'carta-de-classe': 0.026,
  passiva: 0.02,
  ultimate: 0.028,
  cooldown: 0.022,
  condicoes: 0.02,
  personagem: 0.02,
  removidas: 0.018,
  mao: 0,
};

export interface OpcoesDaCena {
  readonly qualidade: QualidadeDeVfx;
  readonly contextoDeTextura: ContextoDeTextura;
  /**
   * A anisotropia que **este** aparelho suporta, perguntada ao renderizador.
   *
   * Chutar o número é o que borra uma textura vista de lado: o tampo da arena
   * é justamente isso, um plano quase deitado em relação à câmera. Sem
   * anisotropia o mipmap escolhe o nível pelo eixo pior e a pedra do fundo
   * vira papa.
   */
  readonly anisotropiaMaxima: number;
  /** Avisa que uma textura carregou e a cena precisa de um quadro novo. */
  readonly aoPrecisarDeQuadro: () => void;
}

export interface CenaDaArena {
  readonly scene: Scene;
  readonly grupoDeEfeitos: Group;
  /** Recalibra neblina e sombra para a distância em que a câmera ficou. */
  readonly ajustarProfundidade: (distanciaDaCamera: number) => void;
  readonly atualizar: (estado: EstadoVisualDaArena, tempoMs: number) => void;
  readonly definirQualidade: (qualidade: QualidadeDeVfx) => void;
  readonly descartar: () => void;
}

/*
 * Uma malha pode ter um material ou um por face, como o tampo.
 *
 * `Array.isArray` não estreita uma lista somente-leitura, então o predicado
 * abaixo diz o que ela realmente responde. Sem ele, o tipo cairia para `any` e
 * levaria junto toda a checagem do descarte.
 */
const ehListaDeMateriais = (
  material: Material | readonly Material[],
): material is readonly Material[] => Array.isArray(material);

/**
 * O degradê do fundo.
 *
 * Por mais arte que o tampo mostre, as quinas de cima de uma tela deitada
 * sempre veem além dele. Preto chapado ali lê como "acabou o desenho"; um
 * degradê quente lê como a escuridão que continua depois da arena. É a
 * diferença entre um tabuleiro recortado e um lugar.
 *
 * Quatro pixels de largura bastam: a textura é esticada e o que varia é só a
 * altura. Isto não é arte inventada — é o vazio. Nenhum traço, nenhum
 * ornamento, nada que possa competir com o desenho aprovado.
 */
const degradeDeFundo = (): CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;
  const degrade = ctx.createLinearGradient(0, 0, 0, 256);
  degrade.addColorStop(0, '#0a090b');
  degrade.addColorStop(0.62, '#150f13');
  degrade.addColorStop(1, '#1e1712');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 4, 256);
  const textura = new CanvasTexture(canvas);
  textura.colorSpace = SRGBColorSpace;
  return textura;
};

const descartarMaterial = (material: Material | readonly Material[]): void => {
  if (ehListaDeMateriais(material)) {
    for (const item of material) item.dispose();
    return;
  }
  material.dispose();
};

export const criarCena = (opcoes: OpcoesDaCena): CenaDaArena => {
  const scene = new Scene();
  scene.background = new Color(ARENA.fundo);
  /*
   * Neblina medida a partir de onde a câmera está.
   *
   * Números fixos não servem mais: a lente é longa e a distância muda com a
   * tela, então o mesmo par que dava profundidade discreta numa resolução
   * enterrava o lado do adversário em outra. `ajustarProfundidade` recebe a
   * distância real e reposiciona a faixa — a neblina passa a começar depois da
   * borda do fundo do campo e a fechar bem além dela.
   */
  const neblina = new Fog(ARENA.neblina, 120, 260);
  scene.fog = neblina;

  let orcamento = ORCAMENTO_VISUAL[opcoes.qualidade];

  /*
   * Tudo o que esta cena cria fica registrado aqui.
   *
   * Descartar percorrendo o grafo obrigaria a reconstruir o tipo de cada
   * objeto — `Mesh` do Three.js é genérico e, sem argumentos, resolve para
   * `any`. Guardar a referência na hora da criação custa uma linha e devolve o
   * descarte tipado, além de garantir que nada criado aqui fique para trás.
   */
  const criadas: Mesh[] = [];
  const registrar = (malha: Mesh): Mesh => {
    criadas.push(malha);
    return malha;
  };
  const texturas: FabricaDeTexturas = criarFabricaDeTexturas(opcoes.contextoDeTextura, {
    anisotropiaMaxima: opcoes.anisotropiaMaxima,
  });
  texturas.aoCarregarMoldura(opcoes.aoPrecisarDeQuadro);

  const carregador = new TextureLoader();
  const carregadas: Texture[] = [];

  const fundo = degradeDeFundo();
  if (fundo !== null) {
    scene.background = fundo;
    carregadas.push(fundo);
  }

  /*
   * Carrega a textura de um asset aprovado, se ele existir.
   *
   * Nem todos existem ainda: o slot de Passiva está no catálogo e não foi
   * entregue. Um material sem mapa é uma laje lisa com a luz certa — feia, mas
   * honesta. Inventar arte no lugar dela seria pior, e deixar o erro estourar
   * no console esconderia os erros que importam.
   */
  const aplicarTextura = (material: MeshStandardMaterial, assetId: string): void => {
    carregador.load(
      opcoes.contextoDeTextura.url(assetId),
      (textura) => {
        textura.colorSpace = SRGBColorSpace;
        textura.generateMipmaps = true;
        textura.minFilter = LinearMipmapLinearFilter;
        textura.magFilter = LinearFilter;
        textura.anisotropy = opcoes.anisotropiaMaxima;
        carregadas.push(textura);
        material.map = textura;
        material.needsUpdate = true;
        opcoes.aoPrecisarDeQuadro();
      },
      undefined,
      () => {
        material.transparent = false;
        material.opacity = 0.55;
        material.needsUpdate = true;
      },
    );
  };

  /* ---- Luz ---------------------------------------------------------- */
  /*
   * Luz medida para uma arte que já vem iluminada.
   *
   * A arena aprovada tem tocha, cascata e sombra pintadas. Somar a ela uma
   * iluminação de cena cheia — era o que acontecia, com hemisférica 1,05 mais
   * direcional 1,45 — dava mais de 2× de irradiância num chão branco: a pedra
   * lavava e o desenho sumia. O par abaixo soma perto de 1,0 no plano do
   * tampo, que é o que devolve a arte na cor em que ela foi aprovada.
   *
   * A direcional continua existindo porque é ela que produz a sombra de
   * contato das cartas — o que amarra a carta ao chão em vez de deixá-la
   * flutuando sobre um desenho.
   */
  const ambiente = new HemisphereLight(0x8fa4c8, 0x140f0a, 0.32);
  scene.add(ambiente);

  const principal = new DirectionalLight(0xffe7c4, 0.9);
  principal.position.set(-14, 34, 20);
  principal.castShadow = orcamento.sombras;
  principal.shadow.mapSize.set(2048, 2048);
  principal.shadow.camera.near = 6;
  principal.shadow.camera.far = 110;
  /*
   * A caixa da sombra cobre o campo inteiro, e com margem.
   *
   * Apertada demais, ela corta a sombra das peças da borda — e uma carta sem
   * sombra parece colada no vidro, que é exatamente a leitura que esta revisão
   * está tentando desfazer.
   */
  principal.shadow.camera.left = -30;
  principal.shadow.camera.right = 30;
  principal.shadow.camera.top = 30;
  principal.shadow.camera.bottom = -30;
  principal.shadow.bias = -0.0009;
  scene.add(principal);
  scene.add(principal.target);

  /* Uma luz de recorte por lado, tingida pela classe daquele jogador. */
  const luzDoProprio = new PointLight(0xffffff, 0, 46, 1.6);
  luzDoProprio.position.set(0, 9.5, 11);
  scene.add(luzDoProprio);
  const luzDoAdversario = new PointLight(0xffffff, 0, 46, 1.6);
  luzDoAdversario.position.set(0, 9.5, -11);
  scene.add(luzDoAdversario);

  /* ---- Tampo -------------------------------------------------------- */
  /*
   * O chão além da arena.
   *
   * Um plano grande e escuro, na cor da neblina, para que o que existe além do
   * tampo seja continuação e não recorte. Ele não recebe textura nenhuma: o
   * papel dele é justamente não ter nada.
   */
  const chao = registrar(
    new Mesh(
      new PlaneGeometry(420, 420),
      new MeshStandardMaterial({ color: ARENA.borda, roughness: 1, metalness: 0 }),
    ),
  );
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.26;
  chao.receiveShadow = true;
  scene.add(chao);

  /*
   * O tampo é a arte aprovada, inteira, e nada além dela.
   *
   * Sem caixa, sem moldura dourada por cima, sem vinheta. A primeira entrega
   * embrulhava a arena num tabuleiro desenhado por código — borda, linha de
   * centro, degradê radial — e o resultado foi a arte aprovada competindo com
   * ornamento que ninguém aprovou, e perdendo. A arena já tem muro, tocha,
   * cascata e rosa dos ventos; o trabalho aqui é mostrá-la.
   *
   * O plano é maior que o campo e recuado em Z, de forma que as escadarias do
   * fundo e da frente fiquem fora do quadro — é assim que a arena cobre uma
   * tela deitada sem ser esticada — e que a rosa dos ventos caia exatamente
   * sobre a linha que separa os dois lados.
   */
  const materialDoTampo = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
  });
  const tampo = registrar(
    new Mesh(new PlaneGeometry(TAMPO.largura, TAMPO.profundidade), materialDoTampo),
  );
  tampo.rotation.x = -Math.PI / 2;
  tampo.position.set(0, 0, DESLOCAMENTO_DO_TAMPO);
  tampo.receiveShadow = true;
  scene.add(tampo);

  /*
   * A arena aprovada, direto para a GPU.
   *
   * A versão reprovada desenhava o PNG dentro de um canvas 1024 × 1024 antes
   * de virar textura: 941 × 1672 viravam 832 × 944, o que é 1,57× de
   * deformação horizontal e metade dos pixels jogados fora. A rosa dos ventos
   * virava elipse. Por cima ainda ia uma vinheta radial de 78 % de preto, que
   * apagava justamente a borda ornamentada — a parte mais rica do desenho.
   *
   * Agora não há intermediário e não há recorte: o arquivo vai inteiro para a
   * GPU, num plano que tem exatamente a proporção dele, no espaço de cor
   * certo, com mipmap e com a anisotropia que o aparelho oferece. Um pixel da
   * arte é um quadrado no chão, em qualquer tela.
   */
  const aplicarTexturaDoTampo = (): void => {
    carregador.load(
      opcoes.contextoDeTextura.url('arena'),
      (textura) => {
        textura.colorSpace = SRGBColorSpace;
        textura.generateMipmaps = true;
        textura.minFilter = LinearMipmapLinearFilter;
        textura.magFilter = LinearFilter;
        textura.anisotropy = opcoes.anisotropiaMaxima;
        textura.wrapS = ClampToEdgeWrapping;
        textura.wrapT = ClampToEdgeWrapping;
        textura.needsUpdate = true;
        carregadas.push(textura);
        materialDoTampo.map = textura;
        materialDoTampo.needsUpdate = true;
        opcoes.aoPrecisarDeQuadro();
      },
      undefined,
      () => {
        // Sem a arte, o tampo fica pedra lisa com a luz certa. Feio, e honesto.
        opcoes.aoPrecisarDeQuadro();
      },
    );
  };

  aplicarTexturaDoTampo();

  /* ---- Lajes das zonas ---------------------------------------------- */
  const grupoDeSlots = new Group();
  scene.add(grupoDeSlots);
  const realceDoSlot = new Map<string, Mesh>();

  const montarPeca = (peca: PecaDaArena): void => {
    if (peca.forma === 'mao') return;

    const altura = ASSENTAMENTO[peca.forma];
    const peso = PESO_DA_PECA[peca.forma];
    const assetId = ASSET_DO_SLOT[peca.forma];

    if (assetId === null) {
      /*
       * Zona sem arte aprovada vira rebaixo, e não mancha.
       *
       * Um retângulo escuro translúcido, sem ornamento nenhum: a pedra da
       * arena continua legível por baixo e a zona mesmo assim se anuncia como
       * lugar de pôr carta. Inventar moldura aqui seria desenhar arte que
       * ninguém aprovou, em cima de arte que foi aprovada.
       */
      const rebaixo = registrar(
        new Mesh(
          new PlaneGeometry(peca.largura * 0.92, peca.profundidade * 0.92),
          new MeshBasicMaterial({
            color: 0x05040a,
            transparent: true,
            opacity: 0.16 + peso * 0.18,
            depthWrite: false,
          }),
        ),
      );
      rebaixo.rotation.x = -Math.PI / 2;
      rebaixo.position.set(peca.centro.x, altura, peca.centro.z);
      grupoDeSlots.add(rebaixo);
    } else {
      const material = new MeshStandardMaterial({
        transparent: true,
        // As zonas de apoio cedem presença para os três espaços de Ação.
        opacity: 0.55 + peso * 0.45,
        roughness: 1,
        metalness: 0,
        depthWrite: false,
      });
      aplicarTextura(material, assetId);
      const placa = registrar(
        new Mesh(new PlaneGeometry(peca.largura * 0.98, peca.profundidade * 0.98), material),
      );
      placa.rotation.x = -Math.PI / 2;
      placa.position.set(peca.centro.x, altura, peca.centro.z);
      placa.receiveShadow = true;
      grupoDeSlots.add(placa);
    }

    /*
     * O realce de zona válida. Fica apagado até alguém acendê-lo.
     *
     * Dourado e discreto, e não verde-limão a plena carga: a versão reprovada
     * acendia um retângulo neon **e** um contorno em CSS por cima do mesmo
     * slot, e os dois juntos viravam uma mancha que apagava a pedra e a
     * ornamentação do encaixe. Aqui quem diz "pode jogar" é a luz sobre a
     * arte, não uma tinta por cima dela.
     */
    const realce = registrar(
      new Mesh(
        new PlaneGeometry(peca.largura * 1.02, peca.profundidade * 1.02),
        new MeshBasicMaterial({
          color: 0xffcf7a,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    realce.rotation.x = -Math.PI / 2;
    realce.position.set(peca.centro.x, altura + 0.012, peca.centro.z);
    grupoDeSlots.add(realce);
    realceDoSlot.set(peca.chave, realce);
  };

  for (const peca of PECAS_DA_ARENA) montarPeca(peca);

  /* A bandeja de cooldown: uma peça física cobrindo as três posições. */
  const montarBandejaDeCooldown = (lado: 'proprio' | 'adversario'): void => {
    const primeira = PECAS_DA_ARENA.find((p) => p.lado === lado && p.zona === 'cd1');
    const ultima = PECAS_DA_ARENA.find((p) => p.lado === lado && p.zona === 'cd3');
    if (primeira === undefined || ultima === undefined) return;

    const material = new MeshStandardMaterial({
      transparent: true,
      opacity: 0.78,
      roughness: 1,
      metalness: 0,
      depthWrite: false,
    });
    aplicarTextura(material, 'tray-cooldown');
    const largura = ultima.centro.x - primeira.centro.x + primeira.largura;
    const bandeja = registrar(
      new Mesh(new PlaneGeometry(largura, primeira.profundidade), material),
    );
    bandeja.rotation.x = -Math.PI / 2;
    bandeja.position.set(
      (primeira.centro.x + ultima.centro.x) / 2,
      ASSENTAMENTO.cooldown + 0.004,
      primeira.centro.z,
    );
    bandeja.receiveShadow = true;
    grupoDeSlots.add(bandeja);
  };
  montarBandejaDeCooldown('proprio');
  montarBandejaDeCooldown('adversario');

  /* ---- Ênfase de lado ------------------------------------------------ */
  const banhoDeLuz = (sinal: number): Mesh => {
    const plano = registrar(
      new Mesh(
        new PlaneGeometry(MEIA_ARENA.largura * 2, MEIA_ARENA.profundidade),
        new MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          side: DoubleSide,
        }),
      ),
    );
    plano.rotation.x = -Math.PI / 2;
    plano.position.set(0, 0.06, (sinal * MEIA_ARENA.profundidade) / 2);
    scene.add(plano);
    return plano;
  };
  const enfaseDoProprio = banhoDeLuz(1);
  const enfaseDoAdversario = banhoDeLuz(-1);

  /* ---- Cartas -------------------------------------------------------- */
  const grupoDeCartas = new Group();
  scene.add(grupoDeCartas);
  const malhaDaCarta = new Map<string, Mesh>();
  const geometriaDaCarta = new PlaneGeometry(CARTA.largura, CARTA.altura);

  const grupoDeEfeitos = new Group();
  scene.add(grupoDeEfeitos);

  const atualizar = (estado: EstadoVisualDaArena, tempoMs: number): void => {
    const vistas = new Set<string>();

    for (const item of estado.cartas) {
      vistas.add(item.chave);
      let malha = malhaDaCarta.get(item.chave);
      if (malha === undefined) {
        malha = registrar(
          new Mesh(
            geometriaDaCarta,
            new MeshStandardMaterial({
              transparent: true,
              roughness: 0.52,
              metalness: 0.06,
              side: DoubleSide,
            }),
          ),
        );
        malha.castShadow = orcamento.sombras;
        grupoDeCartas.add(malha);
        malhaDaCarta.set(item.chave, malha);
      }

      const material = malha.material;
      if (material instanceof MeshStandardMaterial) {
        /*
         * A resolução acompanha o tamanho que a carta tem na tela.
         *
         * Em foco ela é a maior coisa do quadro e recebe a moldura em tamanho
         * nativo; na mão, um nível intermediário; numa laje do campo, o menor.
         * Gastar a textura de foco nas trinta cartas do campo custaria memória
         * sem nenhum pixel a mais aparecendo.
         */
        const nivel: NivelDeTextura = item.foco ? 'foco' : item.noLeque ? 'mao' : 'campo';
        const textura =
          item.carta === null ? texturas.doVerso(nivel) : texturas.daCarta(item.carta, nivel);
        if (textura !== null && material.map !== textura) {
          material.map = textura;
          material.needsUpdate = true;
        }
        /*
         * A ênfase da carta é luz na própria carta.
         *
         * Os overlays aprovados são molduras opacas: inteiros sobre oito
         * cartas da mão, eles apagavam justamente o nome. Na arena a mesma
         * leitura vem do material — a carta acende, e o nome continua legível.
         */
        material.emissive.setHex(REALCE_DA_SELECAO[item.selecao]);
        material.emissiveIntensity = item.foco ? 1.35 : 0.85;
      }

      const alturaDoFoco = item.foco ? 0.9 : 0;
      malha.position.set(
        item.posicao.x,
        item.posicao.y + ALTURA_DA_CARTA + alturaDoFoco,
        item.posicao.z - (item.foco ? 0.5 : 0),
      );

      if (item.noLeque) {
        // No leque a carta fica inclinada para a câmera: apoiada na mesa, não
        // colada no vidro.
        malha.rotation.set(-1.16, 0, item.giro);
      } else {
        malha.rotation.set(-Math.PI / 2, 0, item.deitada ? Math.PI / 2 : item.giro);
      }

      const pulso = item.foco ? 1 + Math.sin(tempoMs / 260) * 0.012 : 1;
      malha.scale.setScalar(item.escala * (item.foco ? 1.24 : 1) * pulso);
      malha.renderOrder = item.ordem + (item.foco ? 100 : 0);
    }

    for (const [chave, malha] of malhaDaCarta) {
      if (vistas.has(chave)) continue;
      grupoDeCartas.remove(malha);
      descartarMaterial(malha.material);
      malhaDaCarta.delete(chave);
    }

    for (const [chave, realce] of realceDoSlot) {
      const aceso = estado.slotsEmDestaque.includes(chave);
      const esperando = estado.slotEmEspera === chave;
      const material = realce.material;
      if (!(material instanceof MeshBasicMaterial)) continue;
      const alvo = esperando ? 0.3 + Math.sin(tempoMs / 380) * 0.1 : aceso ? 0.21 : 0;
      material.opacity += (alvo - material.opacity) * 0.2;
      material.color.setHex(esperando ? 0xffd166 : 0xffcf7a);
    }

    const paletaProprio = paletaDaClasse(estado.classeDoProprio);
    const paletaAdversario = paletaDaClasse(estado.classeDoAdversario);

    const acender = (plano: Mesh, luz: PointLight, cor: number, forca: number): void => {
      const material = plano.material;
      if (material instanceof MeshBasicMaterial) {
        material.color.setHex(cor);
        material.opacity += (forca * 0.3 - material.opacity) * 0.2;
      }
      luz.color.setHex(cor);
      luz.intensity += (forca * 34 - luz.intensity) * 0.2;
    };
    acender(enfaseDoProprio, luzDoProprio, paletaProprio.luz, estado.enfaseProprio);
    acender(enfaseDoAdversario, luzDoAdversario, paletaAdversario.luz, estado.enfaseAdversario);
  };

  return {
    scene,
    grupoDeEfeitos,

    /*
     * A profundidade acompanha a câmera.
     *
     * A neblina existe para dar distância ao fundo, não para escurecer o
     * campo: presa a números fixos enquanto a câmera se afastava, ela apagou a
     * arena inteira na primeira tentativa de lente longa. Aqui a faixa começa
     * bem depois da borda do fundo e fecha muito além dela.
     */
    ajustarProfundidade: (distanciaDaCamera) => {
      neblina.near = distanciaDaCamera * 1.35;
      neblina.far = distanciaDaCamera * 2.4;
    },

    atualizar,

    definirQualidade: (qualidade) => {
      orcamento = ORCAMENTO_VISUAL[qualidade];
      principal.castShadow = orcamento.sombras;
      for (const malha of malhaDaCarta.values()) malha.castShadow = orcamento.sombras;
      // As placas são rasas e deitadas: elas recebem sombra, nunca projetam.
      grupoDeSlots.traverse((objeto) => {
        if (objeto instanceof Mesh) objeto.castShadow = false;
      });
    },

    descartar: () => {
      for (const textura of carregadas) textura.dispose();
      texturas.descartar();
      geometriaDaCarta.dispose();
      for (const malha of criadas) {
        malha.geometry.dispose();
        descartarMaterial(malha.material);
      }
      criadas.length = 0;
    },
  };
};
