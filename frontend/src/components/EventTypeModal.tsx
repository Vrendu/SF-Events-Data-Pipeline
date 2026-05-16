import { useEffect, useState } from 'react'
import type { EventCategory } from '../types/event'
import { EVENT_CATEGORIES } from '../types/event'

interface EventTypeModalProps {
  selected: EventCategory[]
  onApply: (categories: EventCategory[]) => void
  onClose: () => void
}

export function EventTypeModal({ selected, onApply, onClose }: EventTypeModalProps) {
  const [draft, setDraft] = useState<EventCategory[]>(selected)

  useEffect(() => {
    setDraft(selected)
  }, [selected])

  const toggle = (id: EventCategory) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="etype-title" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="etype-title" className="modal-title">
            Event type
          </h2>
          <button type="button" className="modal-link" onClick={() => setDraft([])}>
            Deselect all
          </button>
        </div>
        {EVENT_CATEGORIES.map(({ id, label }) => (
          <label key={id} className="check-row">
            <input
              type="checkbox"
              checked={draft.includes(id)}
              onChange={() => toggle(id)}
            />
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
