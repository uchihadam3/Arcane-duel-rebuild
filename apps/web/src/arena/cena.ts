import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
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
import { MEIA_ARENA, PECAS_DA_ARENA } from './layout.js';
import { ARENA, paletaDaClasse } from './paleta.js';
import type { ContextoDeTextura, FabricaDeTexturas } from './textura-de-carta.js';
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

const ASSET_DO_SLOT: Readonly<Record<FormaDaPeca, string | null>> = {
  acao: 'slot-acao',
  resposta: 'slot-resposta',
  'carta-de-classe': 'slot-carta-de-classe',
  passiva: 'slot-passiva',
  ultimate: 'slot-ultimate',
  // A bandeja de cooldown é uma peça só, com três encaixes desenhados: ela é
  // montada uma vez, cobrindo CD1, CD2 e CD3 — repeti-la em cada um mostraria
  // três bandejas de três encaixes.
  cooldown: null,
  condicoes: 'tray-condicoes',
  // O Personagem é carta, e a carta desenha a si mesma. O pedestal fica liso.
  personagem: null,
  removidas: null,
  mao: null,
};

/** A luz que cada estado de seleção acende na própria carta. */
const REALCE_DA_SELECAO: Readonly<Record<EstadoDeSelecao, number>> = {
  nenhum: 0x000000,
  selecionavel: 0x16253d,
  selecionada: 0x54411a,
  'alvo-valido': 0x16351f,
};

/** Altura do pedestal de cada forma. É o relevo que produz sombra de contato. */
const RELEVO: Readonly<Record<FormaDaPeca, number>> = {
  acao: 0.22,
  resposta: 0.14,
  'carta-de-classe': 0.3,
  passiva: 0.18,
  ultimate: 0.34,
  cooldown: 0.12,
  condicoes: 0.1,
  personagem: 0.36,
  removidas: 0.08,
  mao: 0,
};

export interface OpcoesDaCena {
  readonly qualidade: QualidadeDeVfx;
  readonly contextoDeTextura: ContextoDeTextura;
  /** Avisa que uma textura carregou e a cena precisa de um quadro novo. */
  readonly aoPrecisarDeQuadro: () => void;
}

export interface CenaDaArena {
  readonly scene: Scene;
  readonly grupoDeEfeitos: Group;
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

const descartarMaterial = (material: Material | readonly Material[]): void => {
  if (ehListaDeMateriais(material)) {
    for (const item of material) item.dispose();
    return;
  }
  material.dispose();
};

/**
 * O tampo, desenhado em canvas.
 *
 * O `arena_board_clean_vertical.png` entra como textura do miolo; em volta
 * dele o canvas produz a borda ornamentada e o degradê que escurece as
 * quinas. Esticar o PNG na tela inteira faria dele papel de parede — aqui ele
 * é a superfície de um objeto que tem espessura, borda e sombra.
 */
const desenharTampo = (arena: HTMLImageElement | null): HTMLCanvasElement | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  ctx.fillStyle = '#17130f';
  ctx.fillRect(0, 0, 1024, 1024);

  if (arena !== null) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(arena, 96, 40, 832, 944);
    ctx.restore();
  }

  /* Ornamento nas bordas, miolo limpo: a hierarquia que o vídeo confirma. */
  ctx.strokeStyle = 'rgba(190, 150, 80, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, 944, 944);
  ctx.strokeStyle = 'rgba(190, 150, 80, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(66, 66, 892, 892);

  /* A linha de centro: divide os dois lados sem cobrir nenhum deles. */
  ctx.strokeStyle = 'rgba(210, 180, 120, 0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, 512);
  ctx.lineTo(952, 512);
  ctx.stroke();

  const vinheta = ctx.createRadialGradient(512, 512, 260, 512, 512, 720);
  vinheta.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vinheta.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
  ctx.fillStyle = vinheta;
  ctx.fillRect(0, 0, 1024, 1024);

  return canvas;
};

export const criarCena = (opcoes: OpcoesDaCena): CenaDaArena => {
  const scene = new Scene();
  scene.background = new Color(ARENA.fundo);
  scene.fog = new Fog(ARENA.neblina, 34, 76);

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
  const texturas: FabricaDeTexturas = criarFabricaDeTexturas(opcoes.contextoDeTextura);
  texturas.aoCarregarMoldura(opcoes.aoPrecisarDeQuadro);

  const carregador = new TextureLoader();
  const carregadas: Texture[] = [];

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
  const ambiente = new HemisphereLight(0x8fa4c8, 0x140f0a, 1.05);
  scene.add(ambiente);

  const principal = new DirectionalLight(0xffe7c4, 1.45);
  principal.position.set(-9, 22, 13);
  principal.castShadow = orcamento.sombras;
  principal.shadow.mapSize.set(1024, 1024);
  principal.shadow.camera.near = 4;
  principal.shadow.camera.far = 64;
  principal.shadow.camera.left = -22;
  principal.shadow.camera.right = 22;
  principal.shadow.camera.top = 22;
  principal.shadow.camera.bottom = -22;
  principal.shadow.bias = -0.0012;
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
  const tampo = registrar(
    new Mesh(new BoxGeometry(MEIA_ARENA.largura * 2, 1.1, MEIA_ARENA.profundidade * 2), [
      new MeshStandardMaterial({ color: ARENA.borda, roughness: 0.92, metalness: 0.08 }),
      new MeshStandardMaterial({ color: ARENA.borda, roughness: 0.92, metalness: 0.08 }),
      new MeshStandardMaterial({ color: ARENA.tampo, roughness: 0.82, metalness: 0.12 }),
      new MeshStandardMaterial({ color: ARENA.borda, roughness: 0.95, metalness: 0.02 }),
      new MeshStandardMaterial({ color: ARENA.borda, roughness: 0.92, metalness: 0.08 }),
      new MeshStandardMaterial({ color: ARENA.borda, roughness: 0.92, metalness: 0.08 }),
    ]),
  );
  tampo.position.y = -0.55;
  tampo.receiveShadow = true;
  scene.add(tampo);

  /* A moldura ornamentada, mais larga que o tampo e um degrau abaixo. */
  const moldura = registrar(
    new Mesh(
      new BoxGeometry(MEIA_ARENA.largura * 2 + 2.4, 0.7, MEIA_ARENA.profundidade * 2 + 2.4),
      new MeshStandardMaterial({
        color: ARENA.ornamento,
        roughness: 0.55,
        metalness: 0.65,
        emissive: new Color(0x2a1d08),
      }),
    ),
  );
  moldura.position.y = -1.0;
  moldura.receiveShadow = true;
  scene.add(moldura);

  const aplicarTexturaDoTampo = (imagem: HTMLImageElement | null): void => {
    const canvas = desenharTampo(imagem);
    if (canvas === null) return;
    const textura = new CanvasTexture(canvas);
    textura.colorSpace = SRGBColorSpace;
    textura.wrapS = RepeatWrapping;
    textura.wrapT = RepeatWrapping;
    carregadas.push(textura);
    const materiais = tampo.material;
    if (Array.isArray(materiais)) {
      const superior = materiais[2];
      if (superior instanceof MeshStandardMaterial) {
        superior.map = textura;
        superior.needsUpdate = true;
      }
    }
    opcoes.aoPrecisarDeQuadro();
  };

  aplicarTexturaDoTampo(null);
  if (typeof Image !== 'undefined') {
    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => {
      aplicarTexturaDoTampo(imagem);
    };
    imagem.src = opcoes.contextoDeTextura.url('arena');
  }

  /* ---- Lajes das zonas ---------------------------------------------- */
  const grupoDeSlots = new Group();
  scene.add(grupoDeSlots);
  const realceDoSlot = new Map<string, Mesh>();

  const montarPeca = (peca: PecaDaArena): void => {
    if (peca.forma === 'mao') return;

    const altura = RELEVO[peca.forma];
    const pedestal = registrar(
      new Mesh(
        new BoxGeometry(peca.largura, altura, peca.profundidade),
        new MeshStandardMaterial({
          color: peca.forma === 'acao' ? 0x3b342c : 0x2f2a24,
          roughness: 0.74,
          metalness: 0.26,
        }),
      ),
    );
    pedestal.position.set(peca.centro.x, altura / 2, peca.centro.z);
    pedestal.castShadow = orcamento.sombras;
    pedestal.receiveShadow = true;
    grupoDeSlots.add(pedestal);

    const assetId = ASSET_DO_SLOT[peca.forma];
    if (assetId !== null) {
      const material = new MeshStandardMaterial({
        transparent: true,
        roughness: 0.6,
        metalness: 0.2,
        depthWrite: false,
      });
      aplicarTextura(material, assetId);
      const tampa = registrar(
        new Mesh(new PlaneGeometry(peca.largura * 0.96, peca.profundidade * 0.96), material),
      );
      tampa.rotation.x = -Math.PI / 2;
      tampa.position.set(peca.centro.x, altura + 0.012, peca.centro.z);
      tampa.receiveShadow = true;
      grupoDeSlots.add(tampa);
    }

    /* O contorno de zona válida. Fica apagado até alguém acendê-lo. */
    const realce = registrar(
      new Mesh(
        new PlaneGeometry(peca.largura * 1.12, peca.profundidade * 1.12),
        new MeshBasicMaterial({
          color: 0xbfe04a,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    realce.rotation.x = -Math.PI / 2;
    realce.position.set(peca.centro.x, altura + 0.026, peca.centro.z);
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
      roughness: 0.62,
      metalness: 0.28,
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
      RELEVO.cooldown + 0.014,
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
        const textura = item.carta === null ? texturas.doVerso() : texturas.daCarta(item.carta);
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
      const alvo = esperando ? 0.5 + Math.sin(tempoMs / 300) * 0.16 : aceso ? 0.32 : 0;
      material.opacity += (alvo - material.opacity) * 0.24;
      material.color.setHex(esperando ? 0xffd166 : 0xbfe04a);
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
    atualizar,

    definirQualidade: (qualidade) => {
      orcamento = ORCAMENTO_VISUAL[qualidade];
      principal.castShadow = orcamento.sombras;
      for (const malha of malhaDaCarta.values()) malha.castShadow = orcamento.sombras;
      grupoDeSlots.traverse((objeto) => {
        if (objeto instanceof Mesh) objeto.castShadow = orcamento.sombras && objeto !== tampo;
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
