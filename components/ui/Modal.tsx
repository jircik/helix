'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  title: string;
  /** Rótulo curto acima do título. Omitido quando o cabeçalho já se explica. */
  eyebrow?: string;
  /** Linha de contexto sob o título — telefone, endereço, selo. */
  subtitle?: ReactNode;
  /** Faixa entre o cabeçalho e o corpo: abas, seletor de etapa. */
  toolbar?: ReactNode;
  size?: 'default' | 'wide';
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  title, eyebrow, subtitle, toolbar, size = 'default',
  closeLabel = 'Fechar', onClose, children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  return (
    <dialog
      ref={ref}
      className={size === 'wide' ? 'modal modal-wide' : 'modal'}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right
          || event.clientY < box.top || event.clientY > box.bottom) onClose();
      }}
    >
      <div className="modal-heading">
        <div className="modal-heading-text">
          {eyebrow && <span className="mono">{eyebrow}</span>}
          <h2 id={titleId}>{title}</h2>
          {subtitle && <div className="modal-subtitle">{subtitle}</div>}
        </div>
        <button type="button" className="btn btn-outline modal-close" aria-label={closeLabel} onClick={onClose}>
          <Icon name="close" width={16} height={16} />
        </button>
      </div>
      {toolbar && <div className="modal-toolbar">{toolbar}</div>}
      {children}
    </dialog>
  );
}
