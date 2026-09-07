'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Modal({ title, eyebrow = 'Refinar resultados', onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
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
  return <dialog ref={ref} className="modal" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
    }}>
    <div className="modal-heading"><div><span className="mono">{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
      <button type="button" className="btn btn-outline" aria-label="Fechar filtros" onClick={onClose}>×</button>
    </div>
    {children}
  </dialog>;
}
