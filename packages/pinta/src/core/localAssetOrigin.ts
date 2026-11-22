import type { PintaMemoryAsset } from './assetMemory'

// Session-only provenance. Symbols survive object spreads used by editing commands,
// but never enter IndexedDB structured clone, JSON, exported assets or cloud files.
const LOCAL_ORIGIN = Symbol('pinta.localOrigin')
type Origin = { database: string; id: string; revision: string | null }
type WithOrigin = PintaMemoryAsset & { [LOCAL_ORIGIN]?: Origin }

/** Opaque identity of the confirmed native revision, for adapters' sync baselines. */
export function pintaLocalRevisionOf(asset: PintaMemoryAsset): string | undefined {
  const origin = (asset as WithOrigin)[LOCAL_ORIGIN]
  return origin?.id === asset.id && origin.revision !== null ? origin?.revision : undefined
}

export function pintaLocalOriginOf(asset: PintaMemoryAsset, database: string): Origin | undefined {
  const origin = (asset as WithOrigin)[LOCAL_ORIGIN]
  return origin?.database === database && origin.id === asset.id ? origin : undefined
}

export function recordPintaLocalOrigin(
  asset: PintaMemoryAsset,
  database: string,
  revision: string | null,
): void {
  const existing = pintaLocalOriginOf(asset, database)
  // The same editing lineage (including undo and edits queued during autosave) advances
  // only after ITS write commits. A background read has a separate origin object.
  if (existing) existing.revision = revision
  else if (Object.isExtensible(asset))
    Object.defineProperty(asset, LOCAL_ORIGIN, {
      value: { database, id: asset.id, revision },
      enumerable: true,
      configurable: true,
    })
}

/** Preserve the local base of an adapter replacement, instead of borrowing a later read. */
export function inheritPintaLocalOrigin<T extends PintaMemoryAsset>(
  replacement: T,
  base?: PintaMemoryAsset | null,
): T {
  const origin = (base as WithOrigin | undefined | null)?.[LOCAL_ORIGIN]
  return origin && origin.id === replacement.id
    ? { ...replacement, [LOCAL_ORIGIN]: origin }
    : replacement
}
