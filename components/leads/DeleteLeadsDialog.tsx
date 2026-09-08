'use client';

import { Modal } from '@/components/ui/Modal';

interface Props {
  /** Quantos leads somem se confirmar. */
  count: number;
  /** Nome do lead quando é um só — a confirmação precisa dizer qual. */
  nome: string | null;
  apagando: boolean;
  erro: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteLeadsDialog({ count, nome, apagando, erro, onConfirm, onCancel }: Props) {
  return (
    <Modal
      eyebrow="Ação irreversível"
      title={count === 1 ? 'Apagar lead' : `Apagar ${count} leads`}
      onClose={onCancel}
    >
      <div className="modal-body">
        {erro && <p role="alert" className="error">{erro}</p>}
        <p className="confirm-text">
          {nome
            ? <>Apagar <strong>{nome}</strong> da base?</>
            : <>Apagar <strong>{count} leads</strong> da base?</>}
          {' '}O histórico de atividades some junto e não dá para desfazer.
        </p>
        <p className="modal-note">
          Se a ideia é só tirar da lista, marque como descartado no detalhe do lead.
        </p>
      </div>
      <div className="modal-actions">
        <span />
        <button type="button" className="btn btn-outline" disabled={apagando} onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" disabled={apagando} onClick={onConfirm}>
          {apagando ? 'Apagando…' : 'Apagar'}
        </button>
      </div>
    </Modal>
  );
}
