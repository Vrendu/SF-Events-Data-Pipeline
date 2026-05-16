import { useState } from 'react'

interface DateModalProps {
  value: string | null
  onApply: (date: string | null) => void
  onClose: () => void
}

export function DateModal({ value, onApply, onClose }: DateModalProps) {
  const [draft, setDraft] = useState(value ?? '')

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">Date</h2>
          <button type="button" className="modal-link" onClick={() => setDraft('')}>
            Clear
          </button>
        </div>
        <input
          type="date"
          className="date-field"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="modal-actions">
          <button type="button" className="btn-apply" onClick={() => onApply(draft || null)}>
            Apply
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
