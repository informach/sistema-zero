import { pintaValuesEqual } from '../core/assetEquality'
import { REGION_METADATA_BUDGET, RegionMetadataBudgetCache } from '../core/mapDocumentBoundary'

export interface LocalCompatibilityIsolation {
  version: 1
  readerSchema: number
  inventoryRevision: string
}
type OpaqueRevision = { id: string; revision: string | null }
type Inventory = { version: 1; revision: string; documents: Array<[string, string]> }
const PREFIX = 'pinta:local:compatibility:'

export function readCompatibilityIsolation(raw: unknown): LocalCompatibilityIsolation | undefined {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    !new RegionMetadataBudgetCache().accepts(raw)
  )
    return undefined
  const value = raw as Record<string, unknown>
  if (
    Object.keys(value).length !== 3 ||
    value.version !== 1 ||
    typeof value.readerSchema !== 'number' ||
    !Number.isSafeInteger(value.readerSchema) ||
    value.readerSchema < 1 ||
    typeof value.inventoryRevision !== 'string' ||
    !value.inventoryRevision
  )
    return undefined
  return {
    version: 1,
    readerSchema: value.readerSchema,
    inventoryRevision: value.inventoryRevision,
  }
}

/** Exact inventory seals; no hash or clock can grant permission to overwrite a dependency.
 * One small ledger per reader capability avoids duplicating the opaque inventory in each fork.
 * An unversioned/corrupt opaque record cannot grant an isolation exemption.
 */
export function sealCompatibilityInventory(
  records: Map<string, unknown>,
  unreadable: readonly OpaqueRevision[],
  readerSchema: number,
): LocalCompatibilityIsolation | undefined {
  if (
    !unreadable.length ||
    unreadable.length * 3 > REGION_METADATA_BUDGET.maxNodes ||
    unreadable.some((item) => !item.revision)
  )
    return undefined
  const documents: Array<[string, string]> = []
  for (const item of unreadable) {
    if (!item.revision) return undefined
    documents.push([item.id, item.revision])
  }
  documents.sort((left, right) => (left[0] === right[0] ? 0 : left[0] < right[0] ? -1 : 1))
  const budget = new RegionMetadataBudgetCache()
  if (!budget.accepts(documents)) return undefined
  const key = PREFIX + readerSchema,
    stored = records.get(key)
  let revision: string
  if (stored !== undefined) {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored) || !budget.accepts(stored))
      return undefined
    const value = stored as Record<string, unknown>
    if (
      Object.keys(value).length !== 3 ||
      value.version !== 1 ||
      typeof value.revision !== 'string' ||
      !value.revision ||
      !Array.isArray(value.documents) ||
      value.documents.some(
        (pair) =>
          !Array.isArray(pair) ||
          pair.length !== 2 ||
          pair.some((part) => typeof part !== 'string'),
      )
    )
      return undefined
    revision = pintaValuesEqual(value.documents, documents) ? value.revision : crypto.randomUUID()
    if (revision !== value.revision)
      records.set(key, { version: 1, revision, documents } satisfies Inventory)
  } else {
    revision = crypto.randomUUID()
    records.set(key, { version: 1, revision, documents } satisfies Inventory)
  }
  return { version: 1, readerSchema, inventoryRevision: revision }
}

export function sameCompatibilityIsolation(
  left: LocalCompatibilityIsolation | undefined,
  right: LocalCompatibilityIsolation | undefined,
): boolean {
  return (
    !!left &&
    !!right &&
    left.version === right.version &&
    left.readerSchema === right.readerSchema &&
    left.inventoryRevision === right.inventoryRevision
  )
}
