import { readAssetSummary } from '../core/assetSummary'
import { readMoldaDocumentForId } from '../core/documentReader'
import { list, record, requireScene } from '../scene/validation'
import {
  DELETED_KEY_PREFIX,
  PREVIOUS_DELETED_KEY_PREFIX,
  PREVIOUS_RECOVERY_KEY_PREFIX,
  RECOVERY_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
  SUMMARY_KEY_PREFIX,
  V1_DOCUMENT_PREFIXES,
} from './storageKeys'

/** These supported legacy layouts own inline pixels, never scene-blob references. */
export function isInlineLegacyRecord(key: string, raw: unknown): boolean {
  if (key.startsWith(SUMMARY_KEY_PREFIX)) {
    const summary = record(raw, 'legacy-summary', [
      'formatVersion',
      'id',
      'name',
      'kind',
      'createdAt',
      'updatedAt',
      'bytes',
      'thumbDataUrl',
    ])
    requireScene(
      summary.formatVersion === undefined || summary.formatVersion === 1,
      'legacy-summary',
      'Índice legado desconhecido.',
    )
    return readAssetSummary(raw, key.slice(SUMMARY_KEY_PREFIX.length)) !== null
  }
  const deleted = [DELETED_KEY_PREFIX, PREVIOUS_DELETED_KEY_PREFIX].find((prefix) =>
    key.startsWith(prefix),
  )
  if (deleted) return raw === true
  const prefix = [...V1_DOCUMENT_PREFIXES, RECOVERY_KEY_PREFIX, PREVIOUS_RECOVERY_KEY_PREFIX].find(
    (prefix) => key.startsWith(prefix),
  )
  if (prefix) return readMoldaDocumentForId(raw, key.slice(prefix.length)).status === 'valid'
  if (!key.startsWith(SCENE_RECOVERY_KEY_PREFIX)) return false
  const row = record(raw, 'originals', ['formatVersion', 'kind', 'id', 'records', 'issues'])
  requireScene(
    row.formatVersion === 2 &&
      row.kind === 'molda-scene-originals' &&
      row.id === key.slice(SCENE_RECOVERY_KEY_PREFIX.length),
    'originals',
    'Originais desconhecidos.',
  )
  list(row.issues, 'issues', 100_000)
  return list(row.records, 'records', 32).every((raw) => {
    const entry = record(raw, 'original', ['key', 'value'])
    return (
      typeof entry.key === 'string' &&
      [
        ...V1_DOCUMENT_PREFIXES,
        RECOVERY_KEY_PREFIX,
        PREVIOUS_RECOVERY_KEY_PREFIX,
        SUMMARY_KEY_PREFIX,
        DELETED_KEY_PREFIX,
        PREVIOUS_DELETED_KEY_PREFIX,
      ].some((prefix) => entry.key === `${prefix}${row.id}`) &&
      isInlineLegacyRecord(entry.key, entry.value)
    )
  })
}
