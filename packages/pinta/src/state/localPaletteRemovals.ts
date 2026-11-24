import {
  type PaletteLibrary,
  type RemovedPaletteMark,
  readAuthoredPaletteLibrary,
} from '../core/paletteLibrary'

/** The v1 file keeps 48 marks. Older authored removals relevant to a confirmed/in-flight
 * color stay local until a matching receipt or an observed remote edit resolves them. */
export function captureRemovals(raw: unknown): RemovedPaletteMark[] | undefined {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw)) throw Error('As exclusões guardadas não podem ser conferidas.')
  const updatedAt = raw.reduce(
    (latest, entry) => Math.max(latest, typeof entry?.removedAt === 'number' ? entry.removedAt : 0),
    0,
  )
  const saved = readAuthoredPaletteLibrary({ version: 1, palettes: [], removed: raw, updatedAt })
  if (!saved) throw Error('As exclusões guardadas não podem ser conferidas.')
  return saved.removed
}

export function retainCompactedRemovals(
  retained: readonly RemovedPaletteMark[] | undefined,
  before: PaletteLibrary | null,
  changes: PaletteLibrary,
  merged: PaletteLibrary,
  confirmed: PaletteLibrary | null,
  inFlight: PaletteLibrary | undefined,
  introduced?: readonly string[],
) {
  const relevant = new Set(
    [...(confirmed?.palettes ?? []), ...(inFlight?.palettes ?? [])].map((p) => p.id),
  )
  for (const id of introduced ?? []) relevant.add(id)
  for (const mark of retained ?? []) relevant.add(mark.id)
  const stored = new Set(merged.removed.map((p) => p.id))
  const live = new Map(merged.palettes.map((p) => [p.id, p.updatedAt]))
  const result = new Map<string, RemovedPaletteMark>()
  for (const mark of [...(retained ?? []), ...(before?.removed ?? []), ...changes.removed]) {
    if (
      !relevant.has(mark.id) ||
      stored.has(mark.id) ||
      (live.get(mark.id) ?? -Infinity) > mark.removedAt
    )
      continue
    const known = result.get(mark.id)
    if (!known || known.removedAt < mark.removedAt) result.set(mark.id, mark)
  }
  return [...result.values()]
}

export function settleRemovals(
  current: RemovedPaletteMark[] | undefined,
  observed: readonly RemovedPaletteMark[] | undefined,
  confirmed: PaletteLibrary | null,
) {
  if (!current?.length) return []
  const known = new Map(observed?.map((mark) => [mark.id, mark.removedAt]))
  const live = new Map(confirmed?.palettes.map((p) => [p.id, p.updatedAt]))
  return current.filter((mark) => {
    if (known.get(mark.id) !== mark.removedAt) return true
    const remoteEdit = live.get(mark.id)
    return remoteEdit !== undefined && remoteEdit <= mark.removedAt
  })
}
