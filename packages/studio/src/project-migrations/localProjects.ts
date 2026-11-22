import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import { prepareProjectStorageWrite, readValues } from '../state/idbTransaction'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import { recoverProjectWrites } from '../state/projectStorageCoordinator'
import {
  PROJECT_STORAGE_VERSION,
  type ProjectStorageVersion,
  projectAssetsKey,
  projectBackupKey,
  projectBlocksKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectMigrationKey,
  projectStateKey,
  projectThumbKey,
} from '../state/projectStorageKeys'
import { readCurrentProject } from '../state/projectStorageRead'
import {
  assembleProjectRecord,
  projectStorageEntries,
  type StoredProjectRecord,
} from '../state/projectStorageRecords'
import { installLocalRevision, isLocalHead } from '../state/projectStorageRevision'
import { gameStorageKey, type ProjectStorageScope } from '../state/projectStorageRuntime'
import { type ProjectSummary, projectEnvironmentSummary } from '../state/projectSummary'
import { prepareProjectForHost } from '../state/projectValidation'
import { interruptedByExit, localSnapshotsEqual, promoteLocalMigration } from './localTransaction'

const PREFIXES = [
  'sz:project:',
  'sz:project-meta:',
  'sz:project-files:',
  'sz:project-state:',
  'sz:project-blocks:',
  'sz:project-assets:',
  'sz:project-thumb:',
]
const V2_PREFIXES = PREFIXES.map((prefix) => prefix.replace('sz:', 'sz:v2:'))

export function historicalLocalIds(keys: readonly IDBValidKey[]): string[] {
  const ids = new Set<string>()
  for (const key of keys) {
    if (typeof key !== 'string') continue
    const prefix = [...PREFIXES.slice(0, 6), ...V2_PREFIXES.slice(0, 6)].find((item) =>
      key.startsWith(item),
    )
    if (prefix) ids.add(key.slice(prefix.length))
  }
  return [...ids]
}

async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(encodeProjectJsonGraph(value))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

/**
 * O original, os dados novos e a remoção das chaves antigas são promovidos juntos.
 * Uma aba antiga que volte a gravar reaparece como cópia recuperada, sem tocar na atual.
 */
export async function migrateLocalProject(
  id: string,
  scope: ProjectStorageScope,
  version: ProjectStorageVersion = PROJECT_STORAGE_VERSION,
): Promise<string | undefined> {
  let changed: string | undefined
  for (const prefixes of [PREFIXES, V2_PREFIXES])
    changed = (await migrateLocalLayout(id, scope, prefixes, version)) ?? changed
  return changed
}

async function migrateLocalLayout(
  id: string,
  scope: ProjectStorageScope,
  prefixes: readonly string[],
  version: ProjectStorageVersion,
): Promise<string | undefined> {
  const sourceKeys = prefixes.map((prefix) => `${prefix}${id}`)
  for (let attempt = 0; attempt < 3; attempt++) {
    const keys = [
      ...sourceKeys,
      projectMetaKey(id, version),
      projectMigrationKey(id, version),
      projectHeadKey(id, version),
      gameStorageKey(id),
    ]
    const values = await readValues(scope.store, keys)
    const [
      flat,
      meta,
      files,
      state,
      blocks,
      assets,
      thumb,
      currentMeta,
      marker,
      currentHead,
      gameStorage,
    ] = values
    if (!flat && !meta && !files && !state && !blocks && !assets) return
    const raw =
      meta && files && state
        ? assembleProjectRecord(id, meta, files, state, assets, blocks)
        : !meta && !files && !state && isDocumentRecord(flat)
          ? flat
          : null
    if (!raw || raw.id !== id)
      throw new ProjectDocumentError(
        'migration-pending',
        'As partes do projeto local estão incompletas. O original foi preservado.',
        id,
      )
    const project = await prepareProjectForHost(raw)
    if (!project)
      throw new ProjectDocumentError(
        'migration-pending',
        'Não foi possível converter o projeto local.',
        id,
      )
    const content: Record<string, unknown> = { ...raw }
    delete content.updatedAt
    delete content.storageVersion
    const hash = await digest(content)
    const sourceRecords = values.slice(0, sourceKeys.length)
    const sourceSnapshot = Object.fromEntries(
      sourceKeys.map((key, index) => [key, sourceRecords[index]]),
    )
    const sourceHash = await digest(sourceSnapshot)
    const backupRecords = version === 4 ? sourceSnapshot : sourceRecords
    // Preserve the v3 backup namespace; deep v4 snapshots require the versioned transport.
    const backupKey =
      version === 4 ? projectBackupKey(id, sourceHash, 4) : `sz:project-backup:${id}:${sourceHash}`
    const [existingBackup] = await readValues(scope.store, [backupKey])
    if (
      existingBackup !== undefined &&
      (!isDocumentRecord(existingBackup) ||
        existingBackup.version !== (version === 4 ? 2 : 1) ||
        existingBackup.sourceId !== id ||
        !localSnapshotsEqual(existingBackup.sourceKeys, sourceKeys) ||
        !localSnapshotsEqual(existingBackup.records, backupRecords))
    )
      throw new ProjectDocumentError(
        'migration-pending',
        'O backup local precisa ser conferido antes de continuar.',
        id,
      )
    if (
      marker !== undefined &&
      (!isDocumentRecord(marker) ||
        (marker.sourceHashAlgorithm !== undefined &&
          marker.sourceHashAlgorithm !== 'project-json-graph-v1'))
    )
      throw new ProjectDocumentError(
        'migration-pending',
        'A origem da migração usa um contrato incompatível. Ela foi preservada.',
        id,
      )
    const previousHash =
      isDocumentRecord(marker) && marker.sourceHashAlgorithm === 'project-json-graph-v1'
        ? marker.sourceHash
        : undefined
    const recovery = Boolean(currentMeta || marker)
    const targetId = recovery ? `recuperado-${id.slice(0, 28)}-${hash.slice(0, 24)}` : id
    const targetMeta = recovery
      ? await readValues(scope.store, [
          projectMetaKey(targetId, version),
          projectHeadKey(targetId, version),
        ])
      : [currentMeta, currentHead]
    const targetExists = Boolean(targetMeta[0] || targetMeta[1])
    const sameSource = previousHash === hash
    const puts: Array<[IDBValidKey, unknown]> = [
      [
        backupKey,
        {
          version: version === 4 ? 2 : 1,
          sourceId: id,
          capturedAt: Date.now(),
          sourceKeys,
          records: backupRecords,
        },
      ],
      [
        projectMigrationKey(id, version),
        {
          ...(isDocumentRecord(marker) ? marker : {}),
          sourceHash: hash,
          sourceHashAlgorithm: 'project-json-graph-v1',
          lastTargetId: targetId,
        },
      ],
    ]
    if (existingBackup !== undefined) puts.shift()
    if (!sameSource && !targetExists) {
      const converted = recovery
        ? {
            ...project,
            id: targetId,
            name: `${project.name} (edição recuperada)`,
            updatedAt: Date.now(),
          }
        : project
      puts.push(...projectStorageEntries(converted, version))
      puts.push([
        projectHeadKey(targetId, version),
        { version: 1, token: crypto.randomUUID(), writer: '', base: null, sequence: 0 },
      ])
      if (isDocumentRecord(thumb))
        puts.push([projectThumbKey(targetId, version), { ...thumb, id: targetId }])
      if (recovery && gameStorage !== undefined) puts.push([gameStorageKey(targetId), gameStorage])
    }
    const expected: Array<[IDBValidKey, unknown]> = keys
      .slice(0, -1)
      .map((key, index) => [key, values[index]])
    if (recovery)
      expected.push(
        [projectMetaKey(targetId, version), targetMeta[0]],
        [projectHeadKey(targetId, version), targetMeta[1]],
      )
    expected.push([backupKey, existingBackup])
    const physicalWrite =
      version === 4
        ? await prepareProjectStorageWrite({ puts, deletes: sourceKeys })
        : { puts, deletes: sourceKeys }
    const promoted = await promoteLocalMigration(
      scope.store,
      expected,
      physicalWrite,
      scope.identity,
    ).catch(interruptedByExit)
    if (promoted === true) return !sameSource && !targetExists ? targetId : undefined
  }
  throw new ProjectDocumentError(
    'migration-pending',
    'O projeto está sendo alterado em outra aba. Feche essa aba e abra o projeto novamente; as duas versões foram preservadas.',
    id,
  )
}

export async function migrateLocalProjects(
  scope: ProjectStorageScope,
  keys: readonly IDBValidKey[],
  version: ProjectStorageVersion = PROJECT_STORAGE_VERSION,
): Promise<{
  changed: string[]
  pending: ProjectSummary[]
}> {
  const changed: string[] = []
  const pending: ProjectSummary[] = []
  for (const id of historicalLocalIds(keys)) {
    try {
      const target = await migrateLocalProject(id, scope, version)
      if (target) changed.push(target)
    } catch (error) {
      if (!(error instanceof ProjectDocumentError)) throw error
      const [meta, flat, v2meta] = await readValues(scope.store, [
        `sz:project-meta:${id}`,
        `sz:project:${id}`,
        `sz:v2:project-meta:${id}`,
      ])
      const raw = isDocumentRecord(v2meta)
        ? v2meta
        : isDocumentRecord(meta)
          ? meta
          : isDocumentRecord(flat)
            ? flat
            : {}
      const stamp = (value: unknown) =>
        typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 8.64e15
          ? value
          : 0
      pending.push({
        id,
        name:
          typeof raw.name === 'string' && raw.name.trim()
            ? raw.name.slice(0, 200)
            : 'Projeto preservado',
        updatedAt: stamp(raw.updatedAt),
        createdAt: stamp(raw.createdAt),
        mode: raw.mode === 'code' || raw.mode === 'bridge' ? raw.mode : 'blocks',
        migrationPending: true,
        ...projectEnvironmentSummary(raw),
      })
    }
  }
  return { changed, pending }
}

/** Point-read adapter over the same migrations; it never bypasses current-part guards. */
export async function loadLocalHistoricalProject(
  id: string,
  scope: ProjectStorageScope,
  notifyChanged: (ids: string[]) => void,
): Promise<StoredProjectRecord | null> {
  const historicalKeys = [
    `sz:project:${id}`,
    `sz:v2:project:${id}`,
    `sz:project-meta:${id}`,
    `sz:v2:project-meta:${id}`,
  ]
  let old: readonly unknown[]
  if (PROJECT_STORAGE_VERSION === 4) {
    notifyChanged(await recoverProjectWrites(scope, id))
    // One atomic probe for the destination and older formats. Missing IDs must
    // not pay a separate transaction for each generation of local storage.
    const snapshot = await readValues(scope.store, [
      projectMetaKey(id),
      projectFilesKey(id),
      projectStateKey(id),
      projectBlocksKey(id),
      projectAssetsKey(id),
      projectHeadKey(id),
      ...historicalKeys,
    ])
    const current = await readCurrentProject(id, scope, snapshot.slice(0, 6))
    if (current) return current
    old = snapshot.slice(6)
  } else old = await readValues(scope.store, historicalKeys)
  if (!old.some(Boolean)) return null
  const migrated = await migrateLocalProject(id, scope)
  if (migrated) notifyChanged([migrated])
  const [meta, files, state, blocks, assets, head] = await readValues(scope.store, [
    projectMetaKey(id),
    projectFilesKey(id),
    projectStateKey(id),
    projectBlocksKey(id),
    projectAssetsKey(id),
    projectHeadKey(id),
  ])
  const project =
    meta && files && state ? assembleProjectRecord(id, meta, files, state, assets, blocks) : null
  return project
    ? installLocalRevision(project, scope.identity, isLocalHead(head) ? head : undefined)
    : null
}
