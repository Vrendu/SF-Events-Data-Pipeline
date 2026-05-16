import { useState } from 'react'
import { TIME_OPTIONS, type TimeOfDay } from '../utils/dates'

interface TimeModalProps {
  value: TimeOfDay
  onApply: (time: TimeOfDay) => void
  onClose: () => void
}

export function TimeModal({ value, onApply, onClose }: TimeModalProps) {
  const [draft, setDraft] = useState<TimeOfDay>(value)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">Time</h2>
        </div>
        {TIME_OPTIONS.map(({ id, label }) => (
          <label key={id} className="check-row">
            <input type="radio" name="time-slot" checked={draft === id} onChange={() => setDraft(id)} />
            {label}
          </label>
        ))}
        <div className="modal-actions">
          <button type="button" className="btn-apply" onClick={() => onApply(draft)}>
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
