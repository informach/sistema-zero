import type { MoldaPart } from '../core/model'

/** Temporary solo mode includes generated twins but never unhides saved hidden parts. */
export function isPartVisible(part: MoldaPart, isolatedIds: ReadonlySet<string> | null): boolean {
  return (
    !part.hidden &&
    (isolatedIds === null ||
      isolatedIds.has(part.id) ||
      Boolean(part.mirrorOf && isolatedIds.has(part.mirrorOf)))
  )
}
