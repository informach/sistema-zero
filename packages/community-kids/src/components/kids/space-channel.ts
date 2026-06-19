import type { SpaceViewMode } from './kids-space-view-client'

export const WALL_CHANNEL_SLUG = 'parede'

export function pickInitialChannel<T extends { slug: string }>(
  channels: T[],
  mode: SpaceViewMode,
): T | null {
  if (mode === 'wall') return channels.find((channel) => channel.slug === WALL_CHANNEL_SLUG) ?? null
  return channels[0] ?? null
}
