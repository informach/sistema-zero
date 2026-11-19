import { readAllKeys, readValue } from '../state/idbTransaction'
import { projectHeadKey, projectMetaKey } from '../state/projectStorageKeys'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { type ProjectSummary, toProjectSummary } from '../state/projectSummary'
import { migrateLocalV3Project } from './localV3'

/** Retained v3 control records alone are not a new edit after a successful migration. */
export function localV3BaseIds(keys: readonly IDBValidKey[]): string[] {
  const present = new Set(keys)
  const ids = new Set<string>()
  for (const key of keys) {
    if (typeof key !== 'string') continue
    const match =
      /^sz:v3:project-(meta|files|state|blocks|assets|thumb|head|applications|source):(.+)$/.exec(
        key,
      )
    if (!match) continue
    const [, part, id] = match
    if (!id) continue
    const data = ['meta', 'files', 'state', 'blocks', 'assets', 'thumb'].includes(part!)
    if (data || (!present.has(projectMetaKey(id, 4)) && !present.has(projectHeadKey(id, 4))))
      ids.add(id)
  }
  return [...ids]
}

/** Batch adapter over the existing per-project CAS; no second migration protocol. */
export async function migrateLocalV3Projects(
  sourceScope: ProjectStorageScope,
  knownKeys?: readonly IDBValidKey[],
  projectId?: string,
): Promise<{ changed: string[]; pending: ProjectSummary[] }> {
  const scope = Object.freeze({ ...sourceScope })
  const ids = localV3BaseIds(knownKeys ?? (await readAllKeys(scope.store))).filter(
    (id) => projectId === undefined || id === projectId,
  )
  const changed: string[] = []
  const pending: ProjectSummary[] = []
  for (const id of ids) {
    try {
      const target = await migrateLocalV3Project(id, scope)
      if (target) changed.push(target)
    } catch (error) {
      // Opening must never fall back to a stale historical copy after a failed cut.
      if (projectId !== undefined) throw error
      const meta = await readValue(scope.store, projectMetaKey(id, 3))
      pending.push({
        ...(toProjectSummary(id, meta) ?? toProjectSummary(id, { name: 'Projeto preservado' }))!,
        migrationPending: true,
        hasPreservedEdit: true,
      })
    }
  }
  return { changed, pending }
}
