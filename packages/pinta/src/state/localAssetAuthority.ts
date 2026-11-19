import { isPintaVersionedKind } from '@sistemazero/core/creations'
import { pintaValuesEqual as localValuesEqual } from '../core/assetEquality'
import { pintaLocalOriginOf } from '../core/localAssetOrigin'
import { PintaLocalStorageError, PintaStorageBudgetError } from '../core/localStorageErrors'
import {
  PINTA_MAX_SCHEMA,
  type PintaAsset,
  pintaAssetDependencyIds,
  pintaAssetSchema,
  sanitizePintaAsset,
  withPintaSchemaStamp,
} from '../core/project'
import { galleryBackupByteLength, MAX_BACKUP_FILE_BYTES } from '../export/projectJson'
import { planImport } from './importPlan'

export {
  PintaLocalConflictError,
  PintaLocalStorageError,
  PintaStorageBudgetError,
} from '../core/localStorageErrors'

export const LOCAL_ASSET_PREFIX = 'pinta:local:document:'
const mirrorKey = (id: string) => `pinta:asset:${id}`
const authorityKey = (id: string) => LOCAL_ASSET_PREFIX + id
export interface LocalDocument {
  version: 1
  capability: number
  revision: string
  asset: PintaAsset | null
}
export type LocalReadIssue = { id: string; name: string; status: 'unsupported'; version: number }

export { pintaValuesEqual as localValuesEqual } from '../core/assetEquality'

function validAsset(raw: unknown, id: string): PintaAsset | null {
  const asset = sanitizePintaAsset(raw)
  return asset?.id === id ? asset : null
}
function document(raw: unknown): LocalDocument | null {
  if (!raw || typeof raw !== 'object') return null
  if (
    !('version' in raw) ||
    raw.version !== 1 ||
    !('capability' in raw) ||
    typeof raw.capability !== 'number' ||
    !Number.isSafeInteger(raw.capability) ||
    raw.capability < 1 ||
    !('revision' in raw) ||
    typeof raw.revision !== 'string' ||
    !raw.revision ||
    !('asset' in raw)
  )
    return null
  if (
    raw.asset !== null &&
    (!raw.asset ||
      typeof raw.asset !== 'object' ||
      !('id' in raw.asset) ||
      typeof raw.asset.id !== 'string')
  )
    return null
  const asset = raw.asset === null ? null : sanitizePintaAsset(raw.asset)
  if (raw.asset !== null && !asset) return null
  return { version: 1, capability: raw.capability, revision: raw.revision, asset }
}
function unsupported(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null
  if ('version' in raw && typeof raw.version === 'number' && raw.version > 1) return raw.version
  if (
    'capability' in raw &&
    typeof raw.capability === 'number' &&
    raw.capability > PINTA_MAX_SCHEMA
  )
    return raw.capability
  if ('schema' in raw && typeof raw.schema === 'number' && raw.schema > PINTA_MAX_SCHEMA)
    return raw.schema
  return null
}
const checkpoint = (asset: PintaAsset | null): LocalDocument => ({
  version: 1,
  // O protocolo transacional v1 exige o leitor 5. Só conteúdo novo exige uma capacidade maior.
  // Publicar um leitor 6 não precisa bloquear abas 5 que ainda editam documentos compatíveis.
  capability: Math.max(5, asset ? pintaAssetSchema(asset) : 0),
  revision: crypto.randomUUID(),
  asset,
})

/** Normal reads visit only the dependency closure; a fork expands for atomic budgeting. */
export function selectLocalAssetRecords(ids: readonly string[], signal?: AbortSignal) {
  return (records: ReadonlyMap<string, unknown>): readonly string[] | null => {
    signal?.throwIfAborted()
    const found = new Set(ids)
    for (const id of found) {
      const raw = records.get(mirrorKey(id)),
        protectedRaw = records.get(authorityKey(id))
      if (unsupported(protectedRaw) !== null || unsupported(raw) !== null) continue
      const doc = document(protectedRaw),
        legacy = validAsset(raw, id)
      if (doc && !localValuesEqual(legacy, doc.asset)) return null
      for (const asset of [doc?.asset, legacy])
        if (asset) for (const ref of pintaAssetDependencyIds(asset)) found.add(ref)
      if (found.size > 225) return null
    }
    return [...found].flatMap((id) => [mirrorKey(id), authorityKey(id)])
  }
}
export interface LocalSnapshot {
  assets: Map<string, PintaAsset>
  documents: Map<string, LocalDocument>
  issues: LocalReadIssue[]
  recovered: PintaAsset[]
  baseline: PintaAsset[]
}

/** One authority per ID. Legacy divergence is a fork, never a newer canonical revision. */
export function resolveLocalRecords(
  records: Map<string, unknown>,
  checkRecoveryBudget = true,
): LocalSnapshot {
  const ids = new Set<string>()
  for (const key of records.keys()) {
    if (key.startsWith('pinta:asset:')) ids.add(key.slice('pinta:asset:'.length))
    if (key.startsWith(LOCAL_ASSET_PREFIX)) ids.add(key.slice(LOCAL_ASSET_PREFIX.length))
  }
  const assets = new Map<string, PintaAsset>(),
    documents = new Map<string, LocalDocument>(),
    issues: LocalReadIssue[] = []
  const divergent: PintaAsset[] = [],
    restore: LocalDocument[] = []
  for (const id of ids) {
    const raw = records.get(mirrorKey(id)),
      protectedRaw = records.get(authorityKey(id))
    const future =
      unsupported(protectedRaw) ??
      (protectedRaw && typeof protectedRaw === 'object' && 'asset' in protectedRaw
        ? unsupported(protectedRaw.asset)
        : null) ??
      unsupported(raw)
    if (future !== null) {
      issues.push({
        id,
        name: typeof raw === 'object' && raw && 'name' in raw ? String(raw.name) : id,
        status: 'unsupported',
        version: future,
      })
      continue
    }
    const doc = protectedRaw === undefined ? null : document(protectedRaw)
    if (protectedRaw !== undefined && (!doc || (doc.asset && doc.asset.id !== id)))
      throw new PintaLocalStorageError(
        'Não consegui conferir um desenho guardado. Seus dados foram mantidos.',
      )
    if (!doc) {
      const legacy = validAsset(raw, id)
      if (legacy) {
        assets.set(id, legacy)
        // Establish provenance BEFORE returning RAM to a modern editor. Otherwise its
        // first save could erase a legacy edit made after this initial read.
        if (isPintaVersionedKind(legacy.kind)) {
          const migrated = checkpoint(legacy)
          documents.set(id, migrated)
          records.set(authorityKey(id), migrated)
          records.set(mirrorKey(id), legacy)
        }
      }
      continue
    }
    documents.set(id, doc)
    if (doc.asset) assets.set(id, doc.asset)
    const edited = validAsset(raw, id)
    if (raw !== undefined && !edited)
      throw new PintaLocalStorageError(
        'Não consegui recuperar a edição antiga. Seus dados foram mantidos.',
      )
    if (!localValuesEqual(edited, doc.asset)) {
      if (edited) divergent.push(edited)
      restore.push(doc)
    }
  }
  const beforeRecovery = [...assets.values()]
  const taken = new Set(beforeRecovery.map((a) => a.name))
  const plan = planImport(divergent, new Set(), taken, (a) => `${a.name.slice(0, 42)}-copia`)
  if (plan.error || plan.pairs.length !== divergent.length)
    throw new PintaLocalStorageError('Não consegui guardar uma cópia da edição antiga.')
  const recovered = plan.pairs.map((p) => withPintaSchemaStamp(p.restored))
  for (const asset of recovered) {
    const doc = checkpoint(asset)
    records.set(authorityKey(asset.id), doc)
    records.set(mirrorKey(asset.id), asset)
    assets.set(asset.id, asset)
    documents.set(asset.id, doc)
  }
  for (const doc of restore) {
    if (doc.asset) records.set(mirrorKey(doc.asset.id), doc.asset)
  }
  // Tombstones need the key's ID; they intentionally contain no retained document payload.
  for (const [id, doc] of documents) if (!doc.asset) records.delete(mirrorKey(id))
  if (recovered.length && checkRecoveryBudget)
    checkLocalBudget(beforeRecovery, [...assets.values()])
  return { assets, documents, issues, recovered, baseline: beforeRecovery }
}
export function protectAsset(
  records: Map<string, unknown>,
  snapshot: LocalSnapshot,
  asset: PintaAsset,
): void {
  const doc = checkpoint(asset)
  records.set(authorityKey(asset.id), doc)
  records.set(mirrorKey(asset.id), asset)
  snapshot.assets.set(asset.id, asset)
  snapshot.documents.set(asset.id, doc)
}
export function checkLocalBudget(
  before: readonly PintaAsset[],
  after: readonly PintaAsset[],
): void {
  const projected = galleryBackupByteLength([...after])
  if (projected > MAX_BACKUP_FILE_BYTES && projected >= galleryBackupByteLength([...before]))
    throw new PintaStorageBudgetError(projected)
}
export function writeLocalRecords(
  records: Map<string, unknown>,
  incoming: readonly PintaAsset[],
  observed: ReadonlyMap<string, string | null>,
  database: string,
): LocalSnapshot & { forks: Map<string, PintaAsset> } {
  const snapshot = resolveLocalRecords(records, false),
    before = snapshot.baseline
  const stale = incoming.filter((a) => {
    const doc = snapshot.documents.get(a.id)
    const origin = pintaLocalOriginOf(a, database)
    const revision = origin ? origin.revision : observed.get(a.id)
    return doc && revision !== doc.revision && !localValuesEqual(doc.asset, a)
  })
  if (incoming.some((a) => snapshot.issues.some((i) => i.id === a.id)))
    throw new PintaLocalStorageError('Atualize a página antes de alterar este desenho.')
  const forks = new Map<string, PintaAsset>()
  if (stale.length) {
    const plan = planImport(
      incoming,
      new Set(),
      new Set([...snapshot.assets.values()].map((a) => a.name)),
      (a) => `${a.name.slice(0, 42)}-copia`,
    )
    if (plan.error || plan.pairs.length !== incoming.length)
      throw new PintaLocalStorageError('Não consegui guardar a cópia das suas mudanças.')
    for (const [index, pair] of plan.pairs.entries()) {
      const asset = withPintaSchemaStamp(pair.restored)
      protectAsset(records, snapshot, asset)
      snapshot.recovered.push(asset)
      const source = incoming[index]
      if (source) forks.set(source.id, asset)
    }
  } else
    for (const asset of incoming) {
      if (localValuesEqual(snapshot.documents.get(asset.id)?.asset, asset)) continue
      if (isPintaVersionedKind(asset.kind) || snapshot.documents.has(asset.id))
        protectAsset(records, snapshot, asset)
      else {
        records.set(mirrorKey(asset.id), asset)
        snapshot.assets.set(asset.id, asset)
      }
    }
  checkLocalBudget(before, [...snapshot.assets.values()])
  return { ...snapshot, forks }
}
export function deleteLocalRecord(
  records: Map<string, unknown>,
  id: string,
  observed: ReadonlyMap<string, string | null>,
  database: string,
  base?: PintaAsset,
): LocalSnapshot {
  const snapshot = resolveLocalRecords(records, false)
  if (snapshot.issues.some((i) => i.id === id))
    throw new PintaLocalStorageError('Atualize a página antes de apagar este desenho.')
  const current = snapshot.documents.get(id)
  const origin = base?.id === id ? pintaLocalOriginOf(base, database) : undefined
  if (current?.asset && (origin ? origin.revision : observed.get(id)) !== current.revision)
    throw new PintaLocalStorageError(
      'Este desenho mudou em outra janela. Abra de novo antes de apagar.',
    )
  const tombstone = checkpoint(null)
  records.set(authorityKey(id), tombstone)
  records.delete(mirrorKey(id))
  snapshot.assets.delete(id)
  snapshot.documents.set(id, tombstone)
  checkLocalBudget(snapshot.baseline, [...snapshot.assets.values()])
  return snapshot
}
