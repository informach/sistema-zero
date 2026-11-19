import { readValues, writeInOneTransaction } from '../idbTransaction'
import { encodeProjectJsonGraph } from '../projectJsonGraph'
import type { ProjectStorageScope } from '../projectStorageRuntime'
import { createEmptyProject } from '../../core/project'
import { migrateLocalV3Project } from '../../project-migrations/localV3'
import { projectStorageEntries } from '../projectStorageRecords'
import {
  projectBlocksKey,
  projectHeadKey,
  projectMetaKey,
  projectRecoveryKey,
} from '../projectStorageKeys'
import { gameTwoDManifest } from '../../official-extensions/game-2d/manifest'
import {
  prepareLocalV3Recovery,
  stageLocalV3Recovery,
} from '../../project-migrations/localV3Recovery'
import type { RecoveryWrite } from '../projectStorageCoordinator'
import { stageSynchronousExitJournal } from '../synchronousExitJournal'
import { readSynchronousExitJournal } from '../synchronousExitJournalRead'

async function qualifyLegacyDeepStaging(scope: ProjectStorageScope, blocks: unknown) {
  const sourceScope = { ...scope, identity: `${scope.identity}-legacy-deep-stage` }
  const project = {
    ...createEmptyProject('native-deep-recovery', 'Rascunho profundo'),
    blocksState: blocks,
    installedExtensions: [
      { id: gameTwoDManifest.id, version: gameTwoDManifest.version, installedAt: 1 },
    ],
  }
  const recovery: RecoveryWrite = {
    version: 1,
    projectId: project.id,
    head: {
      version: 1,
      writer: 'legacy-deep-writer',
      token: 'legacy-deep-token',
      base: null,
      sequence: 1,
    },
    applications: [],
    write: { puts: projectStorageEntries(project, 3) },
  }
  const start = performance.now()
  const sourceKey = stageSynchronousExitJournal(
    localStorage,
    sourceScope.identity,
    {
      projectId: project.id,
      writer: recovery.head.writer,
      token: recovery.head.token,
    },
    recovery,
  )
  const sourceStored = performance.now()
  try {
    const entry = readSynchronousExitJournal(localStorage, sourceScope.identity, project.id)[0]
    if (!entry) throw new Error('Native legacy exit source missing')
    const sourceRead = performance.now()
    const prepared = await prepareLocalV3Recovery(entry, sourceScope)
    const preparedAt = performance.now()
    await stageLocalV3Recovery(sourceScope, prepared)
    const stagedAt = performance.now()
    const [draft, archive, committed] = await readValues(scope.store, [
      projectRecoveryKey(project.id, recovery.head.writer, 4),
      prepared.backupKey,
      projectMetaKey(project.id, 4),
    ])
    if (
      encodeProjectJsonGraph(draft) !== encodeProjectJsonGraph(prepared.projected) ||
      encodeProjectJsonGraph(archive) !== encodeProjectJsonGraph(prepared.archive)
    )
      throw new Error('Native legacy staging changed the snapshot or archive')
    const blockRecord = (draft as RecoveryWrite).write.puts!.find(
      ([key]) => key === projectBlocksKey(project.id, 4),
    )![1] as { blocksState: unknown }
    if (
      encodeProjectJsonGraph(blockRecord.blocksState) !== encodeProjectJsonGraph(blocks) ||
      committed !== undefined
    )
      throw new Error('Native legacy staging changed blocks or bypassed recovery promotion')
    if (localStorage.getItem(sourceKey) !== entry.encoded)
      throw new Error('Native legacy staging acknowledged an unconfirmed source')
    const verifiedAt = performance.now()
    return {
      pendingOnly: true,
      sourceRetained: true,
      wireChars: entry.encoded.length,
      timingsMs: {
        sourceWrite: Math.round(sourceStored - start),
        sourceRead: Math.round(sourceRead - sourceStored),
        prepare: Math.round(preparedAt - sourceRead),
        stage: Math.round(stagedAt - preparedAt),
        verification: Math.round(verifiedAt - stagedAt),
        total: Math.round(verifiedAt - start),
      },
    }
  } finally {
    // Fixture teardown releases its own localStorage quota after checking retention.
    // The production helper does not acknowledge this source; v4 archive/journal remain.
    localStorage.removeItem(sourceKey)
  }
}

async function qualifyLegacyMigration(scope: ProjectStorageScope) {
  const original = Object.assign(createEmptyProject('native-v3-migration', 'Antes da migração'), {
    futureMetadata: { reference: 'preserved-scene', enabled: false },
  })
  const head = {
    version: 1,
    token: 'legacy-head-one',
    writer: 'old-native-tab',
    base: null,
    sequence: 1,
  }
  await writeInOneTransaction(scope.store, {
    puts: [...projectStorageEntries(original, 3), [projectHeadKey(original.id, 3), head]],
  })
  if ((await migrateLocalV3Project(original.id, scope)) !== original.id)
    throw new Error('Native migration did not preserve identity')
  const [metadata, legacyHead] = await readValues(scope.store, [
    projectMetaKey(original.id, 4),
    projectHeadKey(original.id, 3),
  ])
  const read = metadata as { name?: string; futureMetadata?: unknown }
  if (
    read?.name !== original.name ||
    encodeProjectJsonGraph(read.futureMetadata) !==
      encodeProjectJsonGraph(original.futureMetadata) ||
    encodeProjectJsonGraph(legacyHead) !== encodeProjectJsonGraph(head)
  )
    throw new Error('Native migration changed metadata or legacy head')
  await writeInOneTransaction(scope.store, {
    puts: [
      ...projectStorageEntries({ ...original, name: 'Editou na aba antiga' }, 3),
      [projectHeadKey(original.id, 3), { ...head, token: 'legacy-head-two', sequence: 2 }],
    ],
  })
  const recovered = await migrateLocalV3Project(original.id, scope)
  if (!recovered || recovered === original.id)
    throw new Error('Native old writer was not separated')
  const [current, copy] = await readValues(scope.store, [
    projectMetaKey(original.id, 4),
    projectMetaKey(recovered, 4),
  ])
  if (
    (current as { name?: string })?.name !== original.name ||
    (copy as { name?: string })?.name !== 'Editou na aba antiga (edição recuperada)'
  )
    throw new Error('Native old writer overwrote the current revision')
  return { migrated: true, legacyCopy: true }
}

function identity(value: unknown) {
  const pending = [{ value, depth: 0 }]
  const ids: string[] = []
  let blocks = 0
  let depth = 0
  while (pending.length) {
    const item = pending.pop()!
    if (!item.value || typeof item.value !== 'object') continue
    depth = Math.max(depth, item.depth)
    const record = item.value as Record<string, unknown>
    if (typeof record.type === 'string') {
      blocks++
      if (typeof record.id === 'string') ids.push(record.id)
    }
    for (const child of Object.values(record)) pending.push({ value: child, depth: item.depth + 1 })
  }
  if (new Set(ids).size !== ids.length)
    throw new Error('Duplicate block identity in native fixture')
  return { blocks, ids: ids.length, depth }
}

/** Only the browser fixture calls this; no learner/project API is extended. */
export async function qualifyDeepStorage(scope: ProjectStorageScope) {
  const response = await fetch('/deep-blocks.json')
  if (!response.ok) throw new Error('Deep block fixture missing')
  const blocks: unknown = await response.json()
  const source = { blocks, unknown: { missing: undefined, retained: [-0, [], [0], [-1]] } }
  const shape = identity(source)
  if (shape.blocks < 10_000 || shape.depth < 1_000)
    throw new Error(`Native fixture is not a deep large project: ${JSON.stringify(shape)}`)
  const key = 'sz:v4:project-blocks:deep-native'
  const meta = 'sz:v4:project-meta:deep-native'
  await readValues(scope.store, [key]) // Opening prepares the codec before any exit write.
  let nativeCloneError: string | null = null
  try {
    structuredClone(source)
  } catch (error) {
    nativeCloneError = error instanceof Error ? error.name : 'unknown'
  }
  const before = performance.now()
  const encoded = encodeProjectJsonGraph(source)
  await writeInOneTransaction(scope.store, {
    puts: [
      [key, source],
      [meta, { revision: 1 }],
    ],
  })
  const [restored] = await readValues(scope.store, [key])
  if (encodeProjectJsonGraph(restored) !== encoded)
    throw new Error('Deep project changed during native round-trip')
  const readMs = performance.now() - before
  const revision = { ...source, edit: { name: 'edited', value: 42 } }
  await writeInOneTransaction(scope.store, {
    puts: [
      [key, revision],
      [meta, { revision: 2 }],
    ],
  })
  const [edited] = await readValues(scope.store, [key])
  if (encodeProjectJsonGraph(edited) !== encodeProjectJsonGraph(revision))
    throw new Error('Deep edit changed during native round-trip')
  let rejected = false
  try {
    await writeInOneTransaction(scope.store, {
      puts: [
        [meta, { revision: 3 }],
        [key, { format: 'sz-project-json-graph', version: 2, payload: encoded }],
      ],
    })
  } catch {
    rejected = true
  }
  const [after, metadata] = await readValues(scope.store, [key, meta])
  if (
    !rejected ||
    encodeProjectJsonGraph(after) !== encodeProjectJsonGraph(revision) ||
    (metadata as { revision?: number })?.revision !== 2
  )
    throw new Error('Incompatible storage write was not atomic')
  const migration = await qualifyLegacyMigration(scope)
  const legacyRecovery = await qualifyLegacyDeepStaging(scope, blocks)
  return {
    migration,
    legacyRecovery,
    ...shape,
    nativeCloneError,
    graphChars: encoded.length,
    firstRoundTripMs: Math.round(readMs),
  }
}
