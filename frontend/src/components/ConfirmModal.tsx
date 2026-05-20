interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <div
      className="modal-backdrop confirm-modal-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
      onClick={onClose}
    >
      <div className="modal-panel confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-modal-title" className="confirm-modal__title">
          {title}
        </h2>
        <p id="confirm-modal-message" className="confirm-modal__message">
          {message}
        </p>
        <div className="modal-actions confirm-modal__actions">
          <button
            type="button"
            className="btn-confirm-danger"
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button type="button" className="btn-cancel" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
