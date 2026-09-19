import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ModoDeAnimacao, QualidadeDeVfx, VelocidadeDeAnimacao } from '@arcane-duel/vfx';
import { VELOCIDADE_DO_MODO } from '@arcane-duel/vfx';

/*
 * As preferências de apresentação.
 *
 * Três eixos, e os três só mexem em aparência:
 *
 * - **modo** (normal / rápido) encurta as animações;
 * - **qualidade** (alta / média / baixa) mexe em partículas, sombra e brilho;
 * - **movimento reduzido** corta deslocamento e zoom.
 *
 * Nenhum deles altera regra, informação ou o que o jogador pode fazer. Baixar
 * a qualidade não pode virar vantagem competitiva, e reduzir movimento não
 * pode apagar feedback — só movê-lo menos.
 *
 * Elas ficam em `localStorage`, que é conveniência por aparelho: se o
 * armazenamento estiver bloqueado, tudo continua funcionando no padrão.
 */

export interface Preferencias {
  readonly modo: ModoDeAnimacao;
  readonly qualidade: QualidadeDeVfx;
  readonly movimentoReduzido: boolean;
  readonly somLigado: boolean;
}

export const PREFERENCIAS_INICIAIS: Preferencias = {
  modo: 'normal',
  qualidade: 'alta',
  movimentoReduzido: false,
  somLigado: true,
};

const CHAVE = 'arcane-duel:preferencias';

const ehModo = (valor: unknown): valor is ModoDeAnimacao =>
  valor === 'normal' || valor === 'rapido';

const ehQualidade = (valor: unknown): valor is QualidadeDeVfx =>
  valor === 'alta' || valor === 'media' || valor === 'baixa';

const lerDoArmazenamento = (): Partial<Preferencias> => {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (bruto === null) return {};
    const lido: unknown = JSON.parse(bruto);
    if (typeof lido !== 'object' || lido === null) return {};
    const registro = lido as Record<string, unknown>;
    const parcial: Partial<Preferencias> = {};
    if (ehModo(registro.modo)) Object.assign(parcial, { modo: registro.modo });
    if (ehQualidade(registro.qualidade)) Object.assign(parcial, { qualidade: registro.qualidade });
    if (typeof registro.movimentoReduzido === 'boolean') {
      Object.assign(parcial, { movimentoReduzido: registro.movimentoReduzido });
    }
    if (typeof registro.somLigado === 'boolean') {
      Object.assign(parcial, { somLigado: registro.somLigado });
    }
    return parcial;
  } catch {
    return {};
  }
};

/** O sistema pode pedir menos movimento; a preferência interna pode pedir também. */
export const sistemaPedeMenosMovimento = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export interface ControleDePreferencias {
  readonly preferencias: Preferencias;
  readonly velocidade: VelocidadeDeAnimacao;
  /** Verdadeiro quando o sistema **ou** o jogador pediu menos movimento. */
  readonly movimentoReduzido: boolean;
  readonly definir: (parcial: Partial<Preferencias>) => void;
}

const Contexto = createContext<ControleDePreferencias | null>(null);

export interface ProvedorDePreferenciasProps {
  readonly children: ReactNode;
  readonly iniciais?: Partial<Preferencias>;
}

export const ProvedorDePreferencias = ({
  children,
  iniciais,
}: ProvedorDePreferenciasProps): React.JSX.Element => {
  const [preferencias, setPreferencias] = useState<Preferencias>(() => ({
    ...PREFERENCIAS_INICIAIS,
    ...iniciais,
  }));
  const [sistemaReduz, setSistemaReduz] = useState(false);

  useEffect(() => {
    setPreferencias((atual) => ({ ...atual, ...lerDoArmazenamento(), ...iniciais }));
    // `iniciais` é a configuração do teste; ela vence o que estiver salvo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSistemaReduz(sistemaPedeMenosMovimento());
    try {
      const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
      const ouvir = (): void => {
        setSistemaReduz(consulta.matches);
      };
      consulta.addEventListener('change', ouvir);
      return () => {
        consulta.removeEventListener('change', ouvir);
      };
    } catch {
      return undefined;
    }
  }, []);

  const definir = useCallback((parcial: Partial<Preferencias>) => {
    setPreferencias((atual) => {
      const proximas = { ...atual, ...parcial };
      try {
        window.localStorage.setItem(CHAVE, JSON.stringify(proximas));
      } catch {
        // Armazenamento bloqueado é um detalhe do aparelho, não um erro do jogo.
      }
      return proximas;
    });
  }, []);

  const valor = useMemo<ControleDePreferencias>(
    () => ({
      preferencias,
      velocidade: VELOCIDADE_DO_MODO[preferencias.modo],
      movimentoReduzido: preferencias.movimentoReduzido || sistemaReduz,
      definir,
    }),
    [preferencias, sistemaReduz, definir],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
};

/** Fora do provedor as preferências são as padrão, e nada quebra. */
export const usePreferencias = (): ControleDePreferencias => {
  const contexto = useContext(Contexto);
  return (
    contexto ?? {
      preferencias: PREFERENCIAS_INICIAIS,
      velocidade: VELOCIDADE_DO_MODO[PREFERENCIAS_INICIAIS.modo],
      movimentoReduzido: false,
      definir: () => undefined,
    }
  );
};
