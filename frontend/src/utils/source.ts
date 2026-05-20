/** Human-readable labels for known event sources (keys are lowercase). */
const SOURCE_LABELS: Record<string, string> = {
  'thewarfieldtheatre.com': 'The Warfield',
  'dothebay.com': 'DoTheBay',
  'sf.funcheap.com': 'Funcheap',
  sfrecpark: 'SF Rec & Park',
  ticketmaster: 'Ticketmaster',
  resident_advisor: 'Resident Advisor',
  'residentadvisor.net': 'Resident Advisor',
  'ra.co': 'Resident Advisor',
}

export function formatEventSource(source?: string | null): string | null {
  if (!source?.trim()) return null
  const key = source.trim().toLowerCase()
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key]
  // e.g. "example.com" → "example.com", "Some Source" → as-is
  if (key.includes('.')) {
    return key.replace(/^www\./, '')
  }
  return source.trim()
}
