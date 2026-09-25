import type { EventImage } from '../types/event'

/** Returns the first image in the array that has a URL (e.g. for a card thumbnail). */
export function pickThumbnailImage(images?: EventImage[] | null): EventImage | null {
  return images?.find((img) => img.url) ?? null
}