import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { formatFilterDate } from '../utils/dates'
import type { EventCategory, EventFilters } from '../types/event'
import { EVENT_CATEGORIES } from '../types/event'
import { TIME_OPTIONS } from '../utils/dates'

export type FilterModal = 'category' | 'date' | 'time' | null

interface FilterBarProps {
  filters: EventFilters
  onOpenModal: (modal: FilterModal) => void
}

function categoryLabel(categories: EventCategory[]): string {
  if (categories.length === 0) return 'All events'
  if (categories.length === 1) {
    return EVENT_CATEGORIES.find((c) => c.id === categories[0])?.label ?? 'Events'
  }
  return `${categories.length} types`
}

export function FilterBar({ filters, onOpenModal }: FilterBarProps) {
  const timeLabel =
    TIME_OPTIONS.find((t) => t.id === filters.timeOfDay)?.label ?? 'Time'

  return (
    <div className="filter-bar">
      <button
        type="button"
        className="filter-pill icon-only"
        aria-label="Open filters"
        onClick={() => onOpenModal('category')}
      >
        <SlidersHorizontal size={18} />
      </button>
      <button
        type="button"
        className={`filter-pill ${filters.categories.length ? 'is-active' : ''}`}
        onClick={() => onOpenModal('category')}
      >
        {categoryLabel(filters.categories)}
        <ChevronDown size={16} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className={`filter-pill ${filters.onDate ? 'is-active' : ''}`}
        onClick={() => onOpenModal('date')}
      >
        {formatFilterDate(filters.onDate)}
        <ChevronDown size={16} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className={`filter-pill ${filters.timeOfDay !== 'all' ? 'is-active' : ''}`}
        onClick={() => onOpenModal('time')}
      >
        {filters.timeOfDay === 'all' ? 'Time' : timeLabel}
        <ChevronDown size={16} strokeWidth={2.2} />
      </button>
    </div>
  )
}
