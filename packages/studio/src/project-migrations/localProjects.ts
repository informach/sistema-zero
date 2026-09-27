import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import { readValues } from '../state/idbTransaction'
import { projectMetaKey, projectMigrationKey, projectThumbKey } from '../state/projectStorageKeys'
import { assembleProjectRecord, projectStorageEntries } from '../state/projectStorageRecords'
import { gameStorageKey, type ProjectStorageScope } from '../state/projectStorageRuntime'
import { prepareProjectForHost } from '../state/projectValidation'
import { promoteLocalMigration } from './localTransaction'

const PREFIXES = [
  'sz:project:',
  'sz:project-meta:',
  'sz:project-files:',
  'sz:project-state:',
  'sz:project-blocks:',
  'sz:project-assets:',
  'sz:project-thumb:',
]

export function historicalLocalIds(keys: readonly IDBValidKey[]): string[] {
  const ids = new Set<string>()
  for (const key of keys) {
    if (typeof key !== 'string') continue
    const prefix = PREFIXES.slice(0, 6).find((item) => key.startsWith(item))
    if (prefix) ids.add(key.slice(prefix.length))
  }
  return [...ids]
}

async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
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
): Promise<string | undefined> {
  const sourceKeys = PREFIXES.map((prefix) => `${prefix}${id}`)
  for (let attempt = 0; attempt < 3; attempt++) {
    const keys = [...sourceKeys, projectMetaKey(id), projectMigrationKey(id), gameStorageKey(id)]
    const values = await readValues(scope.store, keys)
    const [flat, meta, files, state, blocks, assets, thumb, currentMeta, marker, gameStorage] =
      values
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
    const sourceHash = await digest(values.slice(0, sourceKeys.length))
    const backupKey = `sz:project-backup:${id}:${sourceHash}`
    const [existingBackup] = await readValues(scope.store, [backupKey])
    if (
      existingBackup !== undefined &&
      (!isDocumentRecord(existingBackup) || (await digest(existingBackup.records)) !== sourceHash)
    )
      throw new ProjectDocumentError(
        'migration-pending',
        'O backup local precisa ser conferido antes de continuar.',
        id,
      )
    const previousHash = isDocumentRecord(marker) ? marker.sourceHash : undefined
    const recovery = Boolean(currentMeta || marker)
    const targetId = recovery ? `recuperado-${id.slice(0, 28)}-${hash.slice(0, 24)}` : id
    const targetMeta = recovery
      ? await readValues(scope.store, [projectMetaKey(targetId)])
      : [currentMeta]
    const sameSource = previousHash === hash
    const puts: Array<[IDBValidKey, unknown]> = [
      [
        backupKey,
        {
          sourceId: id,
          capturedAt: Date.now(),
          sourceKeys,
          records: values.slice(0, sourceKeys.length),
        },
      ],
      [projectMigrationKey(id), { sourceHash: hash, lastTargetId: targetId }],
    ]
    if (existingBackup !== undefined) puts.shift()
    if (!sameSource && !targetMeta[0]) {
      const converted = recovery
        ? {
            ...project,
            id: targetId,
            name: `${project.name} (edição recuperada)`,
            updatedAt: Date.now(),
          }
        : project
      puts.push(...projectStorageEntries(converted))
      if (isDocumentRecord(thumb))
        puts.push([projectThumbKey(targetId), { ...thumb, id: targetId }])
      if (recovery && gameStorage !== undefined) puts.push([gameStorageKey(targetId), gameStorage])
    }
    const expected: Array<[IDBValidKey, unknown]> = keys
      .slice(0, -1)
      .map((key, index) => [key, values[index]])
    if (recovery) expected.push([projectMetaKey(targetId), targetMeta[0]])
    expected.push([backupKey, existingBackup])
    if (await promoteLocalMigration(scope.store, expected, { puts, deletes: sourceKeys }))
      return !sameSource && !targetMeta[0] ? targetId : undefined
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
): Promise<{
  changed: string[]
  pending: Array<{
    id: string
    name: string
    updatedAt: number
    createdAt: number
    mode: 'blocks' | 'code' | 'bridge'
    migrationPending: true
  }>
}> {
  const changed: string[] = []
  const pending: Array<{
    id: string
    name: string
    updatedAt: number
    createdAt: number
    mode: 'blocks' | 'code' | 'bridge'
    migrationPending: true
  }> = []
  for (const id of historicalLocalIds(keys)) {
    try {
      const target = await migrateLocalProject(id, scope)
      if (target) changed.push(target)
    } catch (error) {
      if (!(error instanceof ProjectDocumentError)) throw error
      const [meta, flat] = await readValues(scope.store, [
        `sz:project-meta:${id}`,
        `sz:project:${id}`,
      ])
      const raw = isDocumentRecord(meta) ? meta : isDocumentRecord(flat) ? flat : {}
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
      })
    }
  }
  return { changed, pending }
}
