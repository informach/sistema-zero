/** Storage generation is independent of native format. Older tabs cannot mutate the index. */
export const LEGACY_KEY_PREFIX = 'molda:asset:'
export const PREVIOUS_DOCUMENT_KEY_PREFIX = 'molda:document:'
export const PREVIOUS_RECOVERY_KEY_PREFIX = 'molda:recovery:'
export const PREVIOUS_DELETED_KEY_PREFIX = 'molda:deleted:'
export const DOCUMENT_KEY_PREFIX = 'molda:record:'
export const SUMMARY_KEY_PREFIX = 'molda:summary:'
export const RECOVERY_KEY_PREFIX = 'molda:record-recovery:'
export const DELETED_KEY_PREFIX = 'molda:record-deleted:'
/** Unreleased scene generation. Tabs from the v1 era cannot address these keys. */
export const SCENE_DOCUMENT_KEY_PREFIX = 'molda:scene:'
export const SCENE_SUMMARY_KEY_PREFIX = 'molda:scene-summary:'
export const SCENE_RECOVERY_KEY_PREFIX = 'molda:scene-originals:'
export const SCENE_DELETED_KEY_PREFIX = 'molda:scene-deleted:'
/** Internal pixel layout. This does not activate writes into any database. */
export const SCENE_BLOB_KEY_PREFIX = 'molda:scene-blob:'

export const V1_DOCUMENT_PREFIXES = [
  DOCUMENT_KEY_PREFIX,
  PREVIOUS_DOCUMENT_KEY_PREFIX,
  LEGACY_KEY_PREFIX,
] as const
export const DOCUMENT_PREFIXES = [SCENE_DOCUMENT_KEY_PREFIX, ...V1_DOCUMENT_PREFIXES] as const

export function documentKeys(id: string): string[] {
  return [
    ...DOCUMENT_PREFIXES,
    SCENE_DELETED_KEY_PREFIX,
    DELETED_KEY_PREFIX,
    PREVIOUS_DELETED_KEY_PREFIX,
  ].map((prefix) => `${prefix}${id}`)
}

/** A canonical document always wins. Tombstones prevent late legacy writes resurrecting it. */
export function storedDocumentKey(
  records: ReadonlyMap<IDBValidKey, unknown>,
  id: string,
): string | null {
  const sceneKey = `${SCENE_DOCUMENT_KEY_PREFIX}${id}`
  if (records.has(sceneKey)) return sceneKey
  if (records.has(`${SCENE_DELETED_KEY_PREFIX}${id}`)) return null
  const currentKey = `${DOCUMENT_KEY_PREFIX}${id}`
  if (records.has(currentKey)) return currentKey
  if (records.has(`${DELETED_KEY_PREFIX}${id}`)) return null
  const previousKey = `${PREVIOUS_DOCUMENT_KEY_PREFIX}${id}`
  if (records.has(previousKey)) return previousKey
  if (records.has(`${PREVIOUS_DELETED_KEY_PREFIX}${id}`)) return null
  const legacyKey = `${LEGACY_KEY_PREFIX}${id}`
  return records.has(legacyKey) ? legacyKey : null
}

export function storedDocument(records: ReadonlyMap<IDBValidKey, unknown>, id: string): unknown {
  const key = storedDocumentKey(records, id)
  return key === null ? undefined : records.get(key)
}
