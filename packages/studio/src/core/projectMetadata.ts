import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'

const PARTITION_FIELDS = new Set([
  'files',
  'extraFiles',
  'tree',
  'python',
  'ir',
  'blocksState',
  'assets',
])
const KNOWN_METADATA = new Set([
  'id',
  'name',
  'createdAt',
  'updatedAt',
  'mode',
  'installedExtensions',
  'kind',
  'proMeta',
  'programmingLanguage',
  'runtime',
  'publication',
  'bridgeCodeAhead',
  'formatVersion',
  'projectTools',
  'coverAssetName',
  'storageVersion',
])

/** Known optional projections can be normalized; future fields must retain presence. */
export function isKnownProjectField(key: string): boolean {
  return PARTITION_FIELDS.has(key) || KNOWN_METADATA.has(key)
}

export function projectMetadataSnapshot(project: object) {
  const metadata: Array<[string, unknown]> = []
  const unknown: Array<[string, unknown]> = []
  for (const key of Object.keys(project)) {
    const descriptor = Object.getOwnPropertyDescriptor(project, key)
    if (!descriptor || !('value' in descriptor))
      throw new Error('O projeto contém uma propriedade executável.')
    if (PARTITION_FIELDS.has(key)) continue
    metadata.push([key, descriptor.value])
    if (!KNOWN_METADATA.has(key)) unknown.push([key, descriptor.value])
  }
  // Validate only unknown metadata, not the large file/block/material partitions.
  // String keys are document data; local lineage symbols never enter the record.
  const preserved = copyStudioProjectJson(Object.fromEntries(unknown)) as Record<string, unknown>
  return { metadata: { ...Object.fromEntries(metadata), ...preserved }, unknown: preserved }
}
