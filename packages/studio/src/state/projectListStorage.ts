import { perfSpanAsync } from '../core/perf'
import { readAllKeys, readValues } from './idbTransaction'
import { notifyRecoveredProjects } from './projectPersistenceEvents'
import { listPreservedProjectDrafts } from './projectPreservedDrafts'
import {
  localV3BaseIds,
  PROJECT_META_KEY_PREFIX,
  PROJECT_RECOVERY_PREFIX,
  PROJECT_STORAGE_VERSION,
  projectMetaKey,
  projectRecoveryPrefix,
  projectThumbKey,
  RETAINED_PROJECT_PREFIX,
} from './projectStorageKeys'
import type { StoredProjectRecord } from './projectStorageRecords'
import {
  captureProjectStorageScope,
  isPrivateRegionalProjectScope,
  type ProjectStorageScope,
} from './projectStorageRuntime'
import { type ProjectSummary, toProjectSummary } from './projectSummary'
import { thumbDataUrlOf } from './projectThumbData'
import { hasSynchronousExitJournal } from './synchronousExitJournalProbe'

export type { ProjectSummary } from './projectSummary'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function currentProjectSummary(
  id: string,
  value: unknown,
  knownRecord = false,
): ProjectSummary | null {
  const summary = toProjectSummary(id, value)
  if (PROJECT_STORAGE_VERSION !== 4 || (value === undefined && !knownRecord)) return summary
  if (summary && isRecord(value) && value.id === id && value.storageVersion === 4) return summary
  return {
    ...(summary ?? toProjectSummary(id, { name: 'Projeto preservado' }))!,
    migrationPending: true,
    hasPreservedEdit: true,
  }
}

export function listAllProjects(storageScope?: ProjectStorageScope): Promise<ProjectSummary[]> {
  return perfSpanAsync('studio:projects:list', () =>
    listAllProjectsInternal(storageScope, { withThumbs: true }),
  )
}

/**
 * A lista LEVE: só os metadados (sem as capas). Para quem só precisa de id/nome/datas —
 * a varredura de desenhos do Pinta e a descida da nuvem comparavam ids pagando 1,5–12 MB
 * de capas em base64 por chamada. A lista de projetos continua usando `listAllProjects`
 * (com capas); o adapter local (`StudioPersistenceAdapter.list`) também.
 */
export function listProjectSummariesLight(
  storageScope?: ProjectStorageScope,
): Promise<ProjectSummary[]> {
  return perfSpanAsync('studio:projects:list-light', () =>
    listAllProjectsInternal(storageScope, { withThumbs: false }),
  )
}

/**
 * O resumo de UM projeto (meta + capa), para a lista atualizar só o card que mudou
 * (`PROJECT_CHANGED_EVENT`/`PROJECT_THUMB_UPDATED_EVENT`). `null` = não existe mais.
 */
export async function loadProjectSummaryById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<ProjectSummary | null> {
  const scope = storageScope ?? captureProjectStorageScope()
  if (isPrivateRegionalProjectScope(scope)) {
    const { readRetainedSummary } = await import('./retainedProjectList')
    const retained = await readRetainedSummary(scope, id, true)
    if (retained !== undefined) return retained
  }
  const kvStore = scope.store
  const [meta, thumb] = await readValues(kvStore, [projectMetaKey(id), projectThumbKey(id)])
  let summary = currentProjectSummary(id, meta)
  if (!summary) {
    const legacy = await loadHistoricalProject(id, scope)
    summary = toProjectSummary(id, legacy)
  }
  if (!summary) return null
  const thumbDataUrl = thumbDataUrlOf(thumb)
  if (thumbDataUrl) summary.thumbDataUrl = thumbDataUrl
  return summary
}

/**
 * Os resumos de VÁRIOS projetos num `getMany` só (meta + capa de cada): a lista drena os
 * ids que chegaram juntos (uma descida da nuvem traz vários) sem N idas ao IndexedDB.
 * Ausente/apagado → `null` na posição.
 */
export async function loadProjectSummariesByIds(
  ids: readonly string[],
  storageScope?: ProjectStorageScope,
): Promise<Array<ProjectSummary | null>> {
  if (ids.length === 0) return []
  const scope = storageScope ?? captureProjectStorageScope()
  const retained = new Map<string, ProjectSummary | null>()
  if (isPrivateRegionalProjectScope(scope)) {
    const { readRetainedSummary } = await import('./retainedProjectList')
    for (const id of new Set(ids)) {
      const card = await readRetainedSummary(scope, id, true)
      if (card !== undefined) retained.set(id, card)
    }
  }
  const legacyIds = ids.filter((id) => !retained.has(id))
  const values = await readValues(
    scope.store,
    legacyIds.flatMap((id) => [projectMetaKey(id), projectThumbKey(id)]),
  )
  const out: Array<ProjectSummary | null> = []
  let offset = 0
  for (const id of ids) {
    if (retained.has(id)) {
      out.push(retained.get(id)!)
      continue
    }
    const [meta, thumb] = [values[offset++], values[offset++]]
    let summary = currentProjectSummary(id, meta)
    if (!summary) {
      const legacy = await loadHistoricalProject(id, scope)
      summary = toProjectSummary(id, legacy)
    }
    if (summary) {
      const thumbDataUrl = thumbDataUrlOf(thumb)
      if (thumbDataUrl) summary.thumbDataUrl = thumbDataUrl
    }
    out.push(summary)
  }
  return out
}

async function listAllProjectsInternal(
  storageScope: ProjectStorageScope | undefined,
  options: { withThumbs: boolean },
): Promise<ProjectSummary[]> {
  const scope = storageScope ?? captureProjectStorageScope()
  const kvStore = scope.store
  let allKeys = await readAllKeys(kvStore)
  let pending: ProjectSummary[] = []
  let blockedReads: Set<string> | undefined
  if (
    hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity) ||
    localV3BaseIds(allKeys).length ||
    allKeys.some(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith(PROJECT_RECOVERY_PREFIX) ||
          key.startsWith(projectRecoveryPrefix(3)) ||
          /^sz:(v2:)?project(?:-(?:meta|files|state|blocks|assets))?:/.test(key)),
    )
  ) {
    const { prepareLocalProjectList } = await import('../project-migrations/localV3Projects')
    const prepared = await prepareLocalProjectList(scope, allKeys)
    allKeys = prepared.keys
    pending = prepared.pending
    blockedReads = prepared.blockedReads
    notifyRecoveredProjects(scope, prepared.changed)
  }
  const retainedIds = new Set(
    isPrivateRegionalProjectScope(scope)
      ? allKeys.flatMap((key) =>
          typeof key === 'string' && key.startsWith(RETAINED_PROJECT_PREFIX)
            ? [key.slice(RETAINED_PROJECT_PREFIX.length)]
            : [],
        )
      : [],
  )
  const metaKeys = allKeys.filter(
    (key): key is string =>
      typeof key === 'string' &&
      key.startsWith(PROJECT_META_KEY_PREFIX) &&
      !retainedIds.has(key.slice(PROJECT_META_KEY_PREFIX.length)),
  )
  const metaValues = await readValues(kvStore, metaKeys)
  const summaries = metaKeys
    .map((key, index) =>
      currentProjectSummary(key.slice(PROJECT_META_KEY_PREFIX.length), metaValues[index], true),
    )
    .filter((summary): summary is ProjectSummary => Boolean(summary))
  for (const summary of summaries)
    if (blockedReads?.has(summary.id)) {
      summary.migrationPending = true
      summary.hasPreservedEdit = true
    }
  const drafts = await listPreservedProjectDrafts(scope, allKeys)
  const listed = new Set(summaries.map((summary) => summary.id))
  summaries.push(...drafts.filter((draft) => !listed.has(draft.id) && !retainedIds.has(draft.id)))
  const preservedIds = new Set(drafts.map((draft) => draft.id))
  for (const summary of summaries) if (preservedIds.has(summary.id)) summary.hasPreservedEdit = true
  if (options.withThumbs || PROJECT_STORAGE_VERSION === 4) {
    const currentIds = new Set(summaries.map((summary) => summary.id))
    const pendingIds = new Set(pending.map((summary) => summary.id))
    for (const summary of summaries) if (pendingIds.has(summary.id)) summary.hasPreservedEdit = true
    summaries.push(
      ...pending.filter((summary) => !currentIds.has(summary.id) && !retainedIds.has(summary.id)),
    )
  }

  // Anexa as miniaturas (partição própria) aos summaries que têm uma.
  if (options.withThumbs && summaries.length > 0) {
    const thumbValues = await readValues(
      kvStore,
      summaries.map((summary) => projectThumbKey(summary.id)),
    )
    for (let index = 0; index < summaries.length; index += 1) {
      const summary = summaries[index]
      const thumb = thumbDataUrlOf(thumbValues[index])
      if (summary && thumb) summary.thumbDataUrl = thumb
    }
  }

  if (retainedIds.size) {
    const { readRetainedSummary } = await import('./retainedProjectList')
    for (const id of retainedIds) {
      const summary = await readRetainedSummary(scope, id, options.withThumbs)
      if (summary) summaries.push(summary)
    }
  }
  summaries.sort((a, b) => b.updatedAt - a.updatedAt)
  return summaries
}

/** Historical decoding and preparation share the existing rare migration boundary. */
export async function loadHistoricalProject(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<StoredProjectRecord | null> {
  const scope = storageScope ?? captureProjectStorageScope()
  const { loadLocalHistoricalProject } = await import('../project-migrations/localProjects')
  return loadLocalHistoricalProject(id, scope, (ids) => notifyRecoveredProjects(scope, ids))
}
