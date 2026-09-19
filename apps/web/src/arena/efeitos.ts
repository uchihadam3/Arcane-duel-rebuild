import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
  CylinderGeometry,
  PlaneGeometry,
} from 'three';
import type { Group } from 'three';
import type { FamiliaDeVfx, MomentoEmCena, QualidadeDeVfx } from '@arcane-duel/vfx';
import { ORCAMENTO_VISUAL } from '@arcane-duel/vfx';

import type { Ponto3D } from './layout.js';
import { pecaPorChave } from './layout.js';
import { COR_DA_FAMILIA } from './paleta.js';

/*
 * Os efeitos da arena.
 *
 * Eles **recebem** evento, origem, destino, valores e família. Não decidem
 * Dano, Impacto, Ruptura, Queimadura, Lento nem custo: quando um efeito nasce,
 * o motor já resolveu tudo. Se este arquivo inteiro sumir, a partida continua
 * correta.
 *
 * Origem e destino chegam como chave de âncora e são resolvidos aqui contra a
 * planta da arena. Não existe, em lugar nenhum, uma coordenada de tela escrita
 * à mão.
 *
 * As duas linguagens são deliberadamente diferentes. O Guerreiro é massa: arco
 * baixo, fragmentos pesados que caem, faísca curta e quente. O Mago é energia
 * concentrada: arco alto, anéis de geometria, rastro que se sustenta. Nenhuma
 * família é compartilhada entre as duas classes — é assim que se reconhece de
 * quem é o efeito sem ler uma palavra.
 */

const ALTURA_DO_ARCO = { golpe: 1.6, feitico: 4.6 } as const;

/** As famílias do Guerreiro caem; as do Mago flutuam. É a diferença de massa. */
const FAMILIAS_PESADAS: ReadonlySet<FamiliaDeVfx> = new Set<FamiliaDeVfx>([
  'golpe-pesado',
  'pressao',
  'fragmentos',
  'momentum',
  'guarda-marcial',
]);

interface Emissao {
  readonly pontos: Points;
  readonly velocidades: Float32Array;
  readonly gravidade: number;
  readonly vida: number;
  nascidoEm: number;
}

export interface DiretorDeEfeitos {
  readonly atualizar: (momentos: readonly MomentoEmCena[], tempoMs: number) => void;
  readonly definirQualidade: (qualidade: QualidadeDeVfx) => void;
  /**
   * Movimento reduzido corta deslocamento, arco e quantidade de partículas —
   * e **nunca** apaga o efeito. Um beat que sumisse aqui esconderia feedback
   * competitivo de quem mais precisa dele (§57).
   */
  readonly definirMovimentoReduzido: (reduzido: boolean) => void;
  readonly descartar: () => void;
}

export interface OpcoesDosEfeitos {
  readonly qualidade: QualidadeDeVfx;
  /** Corta deslocamento e partículas sem apagar o feedback (§57). */
  readonly movimentoReduzido: boolean;
}

const pontoDaChave = (chave: string | null): Ponto3D | null => {
  if (chave === null) return null;
  const peca = pecaPorChave(chave);
  if (peca === undefined) return null;
  return { x: peca.centro.x, y: peca.centro.y + 0.5, z: peca.centro.z };
};

/** Interpolação suave: começa e termina calmo, corre no meio. */
const suave = (t: number): number => t * t * (3 - 2 * t);

export const criarDiretorDeEfeitos = (grupo: Group, opcoes: OpcoesDosEfeitos): DiretorDeEfeitos => {
  let orcamento = ORCAMENTO_VISUAL[opcoes.qualidade];
  let movimentoReduzido = opcoes.movimentoReduzido;

  const emissoes = new Map<string, Emissao>();
  const projetis = new Map<string, Mesh>();
  const aneis = new Map<string, Mesh>();
  const colunas = new Map<string, Mesh>();
  const fissuras = new Map<string, Mesh>();

  const geometriaDoProjetil = new PlaneGeometry(0.9, 0.9);
  const geometriaDoAnel = new RingGeometry(0.5, 0.62, 48);
  const geometriaDaColuna = new CylinderGeometry(1.2, 2.2, 14, 24, 1, true);
  const geometriaDaFissura = new PlaneGeometry(1, 0.5);

  const corDe = (familia: FamiliaDeVfx): number => COR_DA_FAMILIA[familia];

  const emitir = (
    chave: string,
    origem: Ponto3D,
    familia: FamiliaDeVfx,
    intensidade: number,
    tempoMs: number,
  ): void => {
    if (emissoes.has(chave)) return;
    const pesada = FAMILIAS_PESADAS.has(familia);
    const quantidade = Math.max(
      4,
      Math.round(orcamento.particulasPorEfeito * intensidade * (movimentoReduzido ? 0.35 : 1)),
    );

    const posicoes = new Float32Array(quantidade * 3);
    const velocidades = new Float32Array(quantidade * 3);
    for (let indice = 0; indice < quantidade; indice += 1) {
      posicoes[indice * 3] = origem.x;
      posicoes[indice * 3 + 1] = origem.y;
      posicoes[indice * 3 + 2] = origem.z;
      const angulo = (indice / quantidade) * Math.PI * 2;
      // Pesada: espalha rente à mesa e cai. Arcana: sobe e se dissolve.
      const raio = pesada ? 5.2 : 2.6;
      velocidades[indice * 3] = Math.cos(angulo) * raio * (0.4 + (indice % 7) / 10);
      velocidades[indice * 3 + 1] = pesada ? 2.4 + (indice % 5) : 3.6 + (indice % 3) * 1.4;
      velocidades[indice * 3 + 2] = Math.sin(angulo) * raio * (0.4 + (indice % 5) / 10);
    }

    const geometria = new BufferGeometry();
    geometria.setAttribute('position', new BufferAttribute(posicoes, 3));
    const pontos = new Points(
      geometria,
      new PointsMaterial({
        color: new Color(corDe(familia)),
        size: pesada ? 0.3 : 0.2,
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    grupo.add(pontos);
    emissoes.set(chave, {
      pontos,
      velocidades,
      gravidade: pesada ? -9.4 : -1.2,
      vida: pesada ? 700 : 950,
      nascidoEm: tempoMs,
    });
  };

  const removerEmissao = (chave: string): void => {
    const emissao = emissoes.get(chave);
    if (emissao === undefined) return;
    grupo.remove(emissao.pontos);
    emissao.pontos.geometry.dispose();
    (emissao.pontos.material as PointsMaterial).dispose();
    emissoes.delete(chave);
  };

  const removerDe = (mapa: Map<string, Mesh>, chave: string): void => {
    const malha = mapa.get(chave);
    if (malha === undefined) return;
    grupo.remove(malha);
    (malha.material as MeshBasicMaterial).dispose();
    mapa.delete(chave);
  };

  const obter = (
    mapa: Map<string, Mesh>,
    chave: string,
    geometria: BufferGeometry,
    cor: number,
  ): Mesh => {
    const existente = mapa.get(chave);
    if (existente !== undefined) return existente;
    const malha = new Mesh(
      geometria,
      new MeshBasicMaterial({
        color: new Color(cor),
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    grupo.add(malha);
    mapa.set(chave, malha);
    return malha;
  };

  const opacidade = (malha: Mesh, valor: number): void => {
    const material = malha.material;
    if (material instanceof MeshBasicMaterial) material.opacity = Math.max(0, valor);
  };

  const atualizar = (momentos: readonly MomentoEmCena[], tempoMs: number): void => {
    const vivos = new Set<string>();

    for (const momento of momentos) {
      const { evento, progresso } = momento;
      const chave = evento.id;
      vivos.add(chave);
      const origem = pontoDaChave(evento.origem);
      const destino = pontoDaChave(evento.destino);
      const cor = corDe(evento.familia);
      const pesada = FAMILIAS_PESADAS.has(evento.familia);

      switch (evento.tipo) {
        case 'viagem': {
          if (origem === null || destino === null) break;
          const projetil = obter(projetis, chave, geometriaDoProjetil, cor);
          const t = suave(progresso);
          const altura = movimentoReduzido
            ? 0.6
            : pesada
              ? ALTURA_DO_ARCO.golpe
              : ALTURA_DO_ARCO.feitico;
          projetil.position.set(
            origem.x + (destino.x - origem.x) * t,
            origem.y + (destino.y - origem.y) * t + Math.sin(Math.PI * t) * altura,
            origem.z + (destino.z - origem.z) * t,
          );
          projetil.rotation.set(-Math.PI / 2, 0, pesada ? t * 7.4 : t * 2.1);
          projetil.scale.setScalar((pesada ? 1.5 : 1.1) * (0.7 + Math.sin(Math.PI * t) * 0.8));
          opacidade(projetil, 1 - Math.max(0, progresso - 0.85) * 6);
          break;
        }

        case 'impacto': {
          const ponto = destino ?? origem;
          if (ponto === null) break;
          const anel = obter(aneis, chave, geometriaDoAnel, cor);
          anel.rotation.x = -Math.PI / 2;
          anel.position.set(ponto.x, ponto.y - 0.3, ponto.z);
          anel.scale.setScalar(1 + suave(progresso) * (pesada ? 7.5 : 5.5));
          opacidade(anel, 1 - progresso);
          if (progresso < 0.2)
            emitir(`${chave}:p`, ponto, evento.familia, evento.intensidade, tempoMs);
          break;
        }

        case 'ruptura': {
          const ponto = destino ?? origem;
          if (ponto === null) break;
          /*
           * Fissura, não flash de tela inteira.
           *
           * O documento é explícito: forte e legível, sem apagar o campo por
           * um segundo. A luz fica presa à laje do alvo e some rápido; o peso
           * vem dos fragmentos e do anel, não de cobrir tudo de branco.
           */
          const fissura = obter(fissuras, chave, geometriaDaFissura, 0xffd7c0);
          fissura.rotation.x = -Math.PI / 2;
          fissura.position.set(ponto.x, ponto.y - 0.28, ponto.z);
          const abertura = suave(Math.min(1, progresso * 2.2));
          fissura.scale.set(9 * abertura, 1 + 5 * abertura, 1);
          opacidade(fissura, (1 - progresso) * 0.85);

          const anel = obter(aneis, `${chave}:anel`, geometriaDoAnel, 0xff5a3c);
          anel.rotation.x = -Math.PI / 2;
          anel.position.set(ponto.x, ponto.y - 0.26, ponto.z);
          anel.scale.setScalar(1 + suave(progresso) * 11);
          opacidade(anel, 1 - progresso);
          if (progresso < 0.16) emitir(`${chave}:p`, ponto, 'fragmentos', 1, tempoMs);
          break;
        }

        case 'ultimate': {
          const ponto = origem ?? destino;
          if (ponto === null) break;
          const coluna = obter(colunas, chave, geometriaDaColuna, cor);
          coluna.position.set(ponto.x, ponto.y + 6.6, ponto.z);
          const subida = suave(Math.min(1, progresso * 1.6));
          coluna.scale.set(0.6 + subida * 0.9, subida, 0.6 + subida * 0.9);
          opacidade(coluna, (1 - Math.max(0, progresso - 0.55) * 2.2) * 0.62);

          const onda = obter(aneis, `${chave}:onda`, geometriaDoAnel, cor);
          onda.rotation.x = -Math.PI / 2;
          onda.position.set(ponto.x, ponto.y - 0.3, ponto.z);
          onda.scale.setScalar(1 + suave(progresso) * 26);
          opacidade(onda, (1 - progresso) * 0.8);
          if (progresso < 0.12) emitir(`${chave}:p`, ponto, evento.familia, 1, tempoMs);
          break;
        }

        case 'classe-exaurida':
        case 'passiva-revelada':
        case 'apresentacao-de-carta': {
          const ponto = origem ?? destino;
          if (ponto === null) break;
          const halo = obter(aneis, chave, geometriaDoAnel, cor);
          halo.rotation.x = -Math.PI / 2;
          halo.position.set(ponto.x, ponto.y - 0.24, ponto.z);
          halo.scale.setScalar(1.4 + Math.sin(Math.PI * progresso) * 2.6);
          opacidade(halo, Math.sin(Math.PI * progresso) * 0.9);
          if (evento.tipo === 'classe-exaurida' && progresso > 0.55 && progresso < 0.7) {
            // Exaurir some com a carta: cinza subindo, e o slot fica vazio.
            emitir(`${chave}:p`, ponto, 'fragmentos', 1, tempoMs);
          }
          break;
        }

        case 'classe-ativada':
        case 'passiva-ativada':
        case 'condicao-aplicada':
        case 'condicao-tick':
        case 'recurso': {
          const ponto = origem ?? destino;
          if (ponto === null) break;
          const pulso = obter(aneis, chave, geometriaDoAnel, cor);
          pulso.rotation.x = -Math.PI / 2;
          pulso.position.set(ponto.x, ponto.y - 0.26, ponto.z);
          pulso.scale.setScalar(0.9 + suave(progresso) * 2.4);
          opacidade(pulso, (1 - progresso) * 0.75);
          break;
        }

        default:
          break;
      }
    }

    /* O que não está mais em cena sai da cena. */
    for (const chave of [...projetis.keys()]) if (!vivos.has(chave)) removerDe(projetis, chave);
    for (const chave of [...colunas.keys()]) if (!vivos.has(chave)) removerDe(colunas, chave);
    for (const chave of [...fissuras.keys()]) if (!vivos.has(chave)) removerDe(fissuras, chave);
    for (const chave of [...aneis.keys()]) {
      const raiz = chave.split(':')[0] ?? chave;
      if (!vivos.has(chave) && !vivos.has(raiz)) removerDe(aneis, chave);
    }

    /* As partículas correm no próprio relógio: elas sobrevivem ao beat. */
    for (const [chave, emissao] of [...emissoes]) {
      const decorrido = tempoMs - emissao.nascidoEm;
      if (decorrido > emissao.vida) {
        removerEmissao(chave);
        continue;
      }
      const atributo = emissao.pontos.geometry.getAttribute('position');
      if (!(atributo instanceof BufferAttribute)) continue;
      const posicoes = atributo.array as Float32Array;
      const passo = 1 / 60;
      for (let indice = 0; indice < posicoes.length; indice += 3) {
        emissao.velocidades[indice + 1] =
          (emissao.velocidades[indice + 1] ?? 0) + emissao.gravidade * passo;
        posicoes[indice] = (posicoes[indice] ?? 0) + (emissao.velocidades[indice] ?? 0) * passo;
        posicoes[indice + 1] = Math.max(
          0.06,
          (posicoes[indice + 1] ?? 0) + (emissao.velocidades[indice + 1] ?? 0) * passo,
        );
        posicoes[indice + 2] =
          (posicoes[indice + 2] ?? 0) + (emissao.velocidades[indice + 2] ?? 0) * passo;
      }
      atributo.needsUpdate = true;
      const material = emissao.pontos.material;
      if (material instanceof PointsMaterial) {
        material.opacity = 1 - decorrido / emissao.vida;
      }
    }
  };

  return {
    atualizar,
    definirQualidade: (qualidade) => {
      orcamento = ORCAMENTO_VISUAL[qualidade];
    },
    definirMovimentoReduzido: (reduzido) => {
      movimentoReduzido = reduzido;
    },
    descartar: () => {
      for (const chave of [...emissoes.keys()]) removerEmissao(chave);
      for (const mapa of [projetis, aneis, colunas, fissuras]) {
        for (const chave of [...mapa.keys()]) removerDe(mapa, chave);
      }
      geometriaDoProjetil.dispose();
      geometriaDoAnel.dispose();
      geometriaDaColuna.dispose();
      geometriaDaFissura.dispose();
    },
  };
};
