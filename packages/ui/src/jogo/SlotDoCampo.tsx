import { AssetImage } from '../components/AssetImage.js';

/*
 * Uma zona do campo.
 *
 * O slot é objeto do tabuleiro, não retângulo desenhado por cima: o asset
 * aprovado é o fundo, e o conteúdo é composto dentro dele. Uma zona vazia
 * continua sendo uma zona — ela não some quando não há carta.
 */

export type EstadoDoSlot = 'vazio' | 'ocupado' | 'reservado' | 'aguardando';

export interface SlotDoCampoProps {
  readonly assetId: string;
  readonly rotulo: string;
  readonly estado?: EstadoDoSlot | undefined;
  readonly enfase?: 'nenhuma' | 'selecionavel' | 'alvo-valido' | undefined;
  readonly className?: string | undefined;
  /** Chave da âncora de campo desta zona, quando ela é mensurável. */
  readonly ancora?: string | undefined;
  readonly children?: React.ReactNode | undefined;
}

const OVERLAY: Readonly<Record<string, string>> = {
  selecionavel: 'overlay-selecionavel',
  'alvo-valido': 'overlay-alvo-valido',
};

export const SlotDoCampo = ({
  assetId,
  rotulo,
  estado = 'vazio',
  enfase = 'nenhuma',
  className,
  ancora,
  children,
}: SlotDoCampoProps): React.JSX.Element => {
  const overlay = OVERLAY[enfase];
  return (
    <div
      className={['slot', `slot--${estado}`, className ?? ''].filter((p) => p !== '').join(' ')}
      data-slot={rotulo}
      data-ancora={ancora}
    >
      <AssetImage assetId={assetId} alt="" className="slot__fundo" />
      <div className="slot__conteudo">{children}</div>
      {overlay !== undefined && <AssetImage assetId={overlay} alt="" className="slot__enfase" />}
    </div>
  );
};
