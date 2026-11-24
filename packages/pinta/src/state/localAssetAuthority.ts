import { isPintaVersionedKind } from '@sistemazero/core/creations'
import { pintaValuesEqual as localValuesEqual } from '../core/assetEquality'
import type { PintaWorkshopAsset } from '../core/assetMemory'
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
import {
  type LocalCompatibilityIsolation,
  readCompatibilityIsolation,
  sameCompatibilityIsolation,
  sealCompatibilityInventory,
} from './localCompatibilityIsolation'

export {
  PintaLocalConflictError,
  PintaLocalStorageError,
  PintaStorageBudgetError,
} from '../core/localStorageErrors'

export const LOCAL_ASSET_PREFIX = 'pinta:local:document:'
export const mirrorKey = (id: string) => `pinta:asset:${id}`
export const authorityKey = (id: string) => LOCAL_ASSET_PREFIX + id
export interface LocalDocument<Asset extends PintaWorkshopAsset = PintaAsset> {
  version: 1
  capability: number
  revision: string
  asset: Asset | null
  isolation?: LocalCompatibilityIsolation
}
export type LocalReadIssue = { id: string; name: string; status: 'unsupported'; version: number }

export { pintaValuesEqual as localValuesEqual } from '../core/assetEquality'

export interface LocalSnapshot<Asset extends PintaWorkshopAsset = PintaAsset> {
  assets: Map<string, Asset>
  documents: Map<string, LocalDocument<Asset>>
  issues: LocalReadIssue[]
  recovered: Asset[]
  baseline: Asset[]
}

/** The local bytes and revision observed before preparing a multi-document change. */
export interface LocalAssetTransition<Asset extends PintaWorkshopAsset> {
  id: string
  before: Asset | null
  beforeRevision: string | null
  after: Asset | null
}

interface LocalBudgetBytes {
  before: number
  after: number
}

/** Internal format policy; the default exports retain the existing public 0–7 contract. */
export interface LocalAssetFormat<Asset extends PintaWorkshopAsset> {
  readonly maxSchema: number
  sanitize(raw: unknown): Asset | null
  stamp(asset: Asset): Asset
  schema(asset: Asset): number
  checkBudget(before: readonly Asset[], after: readonly Asset[], bytes?: LocalBudgetBytes): void
  mirror?(asset: Asset, revision: string): unknown
  readMirror?(raw: unknown, id: string, doc: LocalDocument<Asset> | null): Asset | null
}

/** Same authority, causal revisions, tombstones and recovery for every admitted cell format. */
export function createLocalAssetAuthority<Asset extends PintaWorkshopAsset>(
  format: LocalAssetFormat<Asset>,
) {
  function validAsset(raw: unknown, id: string): Asset | null {
    const asset = format.sanitize(raw)
    return asset?.id === id ? asset : null
  }
  const readMirror = (raw: unknown, id: string, doc: LocalDocument<Asset> | null) =>
    format.readMirror ? format.readMirror(raw, id, doc) : validAsset(raw, id)
  const mirrorValue = (asset: Asset, doc: LocalDocument<Asset>) =>
    format.mirror ? format.mirror(asset, doc.revision) : asset
  function document(raw: unknown): LocalDocument<Asset> | null {
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
    const asset = raw.asset === null ? null : format.sanitize(raw.asset)
    if (raw.asset !== null && !asset) return null
    const isolation = 'isolation' in raw ? readCompatibilityIsolation(raw.isolation) : undefined
    return {
      version: 1,
      capability: raw.capability,
      revision: raw.revision,
      asset,
      ...(isolation ? { isolation } : {}),
    }
  }
  function unsupported(raw: unknown): number | null {
    if (!raw || typeof raw !== 'object') return null
    if ('version' in raw && typeof raw.version === 'number' && raw.version > 1) return raw.version
    if (
      'capability' in raw &&
      typeof raw.capability === 'number' &&
      raw.capability > format.maxSchema
    )
      return raw.capability
    if ('schema' in raw && typeof raw.schema === 'number' && raw.schema > format.maxSchema)
      return raw.schema
    return null
  }
  const checkpoint = (
    asset: Asset | null,
    isolation?: LocalCompatibilityIsolation,
  ): LocalDocument<Asset> => ({
    version: 1,
    // O protocolo transacional v1 exige o leitor 5. Só conteúdo novo exige uma capacidade maior.
    // Publicar um leitor 6 não precisa bloquear abas 5 que ainda editam documentos compatíveis.
    capability: Math.max(5, asset ? format.schema(asset) : 0),
    revision: crypto.randomUUID(),
    asset,
    ...(isolation ? { isolation } : {}),
  })

  /** Normal reads visit only the dependency closure; a fork expands for atomic budgeting. */
  function selectLocalAssetRecords(
    ids: readonly string[],
    signal?: AbortSignal,
    includeSceneMaps = false,
  ) {
    return (records: ReadonlyMap<string, unknown>): readonly string[] | null => {
      signal?.throwIfAborted()
      const found = new Set(ids)
      for (const id of found) {
        const raw = records.get(mirrorKey(id)),
          protectedRaw = records.get(authorityKey(id))
        if (unsupported(protectedRaw) !== null || unsupported(raw) !== null) continue
        const doc = document(protectedRaw),
          legacy = readMirror(raw, id, doc)
        if (doc && !localValuesEqual(legacy, doc.asset)) return null
        // Named legacy doors require the authoritative map inventory in this same transaction.
        if (
          includeSceneMaps &&
          [doc?.asset, legacy].some((a) => a?.kind === 'tilemap' || a?.kind === 'map-set')
        )
          return null
        for (const asset of [doc?.asset, legacy])
          if (asset) for (const ref of pintaAssetDependencyIds(asset)) found.add(ref)
        if (found.size > 225) return null
      }
      return [...found].flatMap((id) => [mirrorKey(id), authorityKey(id)])
    }
  }

  /** One authority per ID. Legacy divergence is a fork, never a newer canonical revision. */
  function resolveLocalRecords(
    records: Map<string, unknown>,
    checkRecoveryBudget = true,
  ): LocalSnapshot<Asset> {
    const ids = new Set<string>()
    for (const key of records.keys()) {
      if (key.startsWith('pinta:asset:')) ids.add(key.slice('pinta:asset:'.length))
      if (key.startsWith(LOCAL_ASSET_PREFIX)) ids.add(key.slice(LOCAL_ASSET_PREFIX.length))
    }
    const assets = new Map<string, Asset>(),
      documents = new Map<string, LocalDocument<Asset>>(),
      issues: LocalReadIssue[] = []
    const divergent: Asset[] = [],
      restore: LocalDocument<Asset>[] = []
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
        const legacy = readMirror(raw, id, null)
        if (legacy) {
          assets.set(id, legacy)
          // Establish provenance BEFORE returning RAM to a modern editor. Otherwise its
          // first save could erase a legacy edit made after this initial read.
          if (isPintaVersionedKind(legacy.kind)) {
            const migrated = checkpoint(legacy)
            documents.set(id, migrated)
            records.set(authorityKey(id), migrated)
            records.set(mirrorKey(id), mirrorValue(legacy, migrated))
          }
        }
        continue
      }
      documents.set(id, doc)
      if (doc.asset) assets.set(id, doc.asset)
      const edited = readMirror(raw, id, doc)
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
    const recovered = plan.pairs.map((p) => format.stamp(p.restored))
    for (const asset of recovered) {
      const doc = checkpoint(asset)
      records.set(authorityKey(asset.id), doc)
      records.set(mirrorKey(asset.id), mirrorValue(asset, doc))
      assets.set(asset.id, asset)
      documents.set(asset.id, doc)
    }
    for (const doc of restore) {
      if (doc.asset) records.set(mirrorKey(doc.asset.id), mirrorValue(doc.asset, doc))
    }
    // Tombstones need the key's ID; they intentionally contain no retained document payload.
    for (const [id, doc] of documents) if (!doc.asset) records.delete(mirrorKey(id))
    if (recovered.length && checkRecoveryBudget)
      checkLocalBudget(beforeRecovery, [...assets.values()])
    return { assets, documents, issues, recovered, baseline: beforeRecovery }
  }
  function protectAsset(
    records: Map<string, unknown>,
    snapshot: LocalSnapshot<Asset>,
    asset: Asset,
    isolation = snapshot.documents.get(asset.id)?.isolation,
  ): void {
    const doc = checkpoint(asset, isolation)
    records.set(authorityKey(asset.id), doc)
    records.set(mirrorKey(asset.id), mirrorValue(asset, doc))
    snapshot.assets.set(asset.id, asset)
    snapshot.documents.set(asset.id, doc)
  }
  function checkLocalBudget(
    before: readonly Asset[],
    after: readonly Asset[],
    bytes?: LocalBudgetBytes,
  ): void {
    format.checkBudget(before, after, bytes)
  }
  function compatibilityContext(
    records: Map<string, unknown>,
    snapshot: LocalSnapshot<Asset>,
  ): LocalCompatibilityIsolation | undefined {
    return sealCompatibilityInventory(
      records,
      snapshot.issues.map((issue) => {
        const raw = records.get(authorityKey(issue.id))
        const futureAuthority =
          unsupported(raw) !== null ||
          (raw && typeof raw === 'object' && 'asset' in raw && unsupported(raw.asset) !== null)
        const revision =
          raw && typeof raw === 'object'
            ? Object.getOwnPropertyDescriptor(raw, 'revision')?.value
            : null
        return {
          id: issue.id,
          revision: futureAuthority && typeof revision === 'string' && revision ? revision : null,
        }
      }),
      format.maxSchema,
    )
  }
  function writeLocalRecords(
    records: Map<string, unknown>,
    incoming: readonly Asset[],
    observed: ReadonlyMap<string, string | null>,
    database: string,
    bytes?: LocalBudgetBytes,
  ): LocalSnapshot<Asset> & { forks: Map<string, Asset> } {
    incoming = incoming.map((asset) => format.stamp(asset))
    const snapshot = resolveLocalRecords(records, false),
      before = snapshot.baseline
    const stale = incoming.filter((a) => {
      const doc = snapshot.documents.get(a.id)
      const origin = pintaLocalOriginOf(a, database)
      const revision = origin ? origin.revision : observed.get(a.id)
      return doc && revision !== doc.revision && !localValuesEqual(doc.asset, a)
    })
    const isolation = compatibilityContext(records, snapshot)
    const unknownConsumer =
      snapshot.issues.length > 0 &&
      incoming.some(
        (asset) =>
          snapshot.issues.some((issue) => issue.id === asset.id) ||
          ((snapshot.assets.has(asset.id) || snapshot.documents.has(asset.id)) &&
            !localValuesEqual(snapshot.assets.get(asset.id), asset) &&
            !sameCompatibilityIsolation(snapshot.documents.get(asset.id)?.isolation, isolation)),
      )
    const forks = new Map<string, Asset>()
    if (stale.length || unknownConsumer) {
      const plan = planImport(
        incoming,
        new Set(),
        new Set([...snapshot.assets.values()].map((a) => a.name)),
        (a) => `${a.name.slice(0, 42)}-copia`,
      )
      if (plan.error || plan.pairs.length !== incoming.length)
        throw new PintaLocalStorageError('Não consegui guardar a cópia das suas mudanças.')
      for (const [index, pair] of plan.pairs.entries()) {
        const asset = format.stamp(pair.restored)
        protectAsset(records, snapshot, asset, isolation)
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
    checkLocalBudget(before, [...snapshot.assets.values()], bytes)
    return { ...snapshot, forks }
  }
  function deleteLocalRecord(
    records: Map<string, unknown>,
    id: string,
    observed: ReadonlyMap<string, string | null>,
    database: string,
    base?: Asset,
    bytes?: LocalBudgetBytes,
  ): LocalSnapshot<Asset> {
    const snapshot = resolveLocalRecords(records, false)
    if (snapshot.issues.some((i) => i.id === id))
      throw new PintaLocalStorageError('Atualize a página antes de apagar este desenho.')
    const current = snapshot.documents.get(id)
    if (
      snapshot.issues.length &&
      !sameCompatibilityIsolation(current?.isolation, compatibilityContext(records, snapshot))
    )
      throw new PintaLocalStorageError(
        'Não consegui conferir onde este desenho é usado. Atualize a página antes de apagar.',
      )
    const origin = base?.id === id ? pintaLocalOriginOf(base, database) : undefined
    if (current?.asset && (origin ? origin.revision : observed.get(id)) !== current.revision)
      throw new PintaLocalStorageError(
        'Este desenho mudou em outra janela. Abra de novo antes de apagar.',
      )
    putTombstone(records, snapshot, id)
    checkLocalBudget(snapshot.baseline, [...snapshot.assets.values()], bytes)
    return snapshot
  }

  function putTombstone(
    records: Map<string, unknown>,
    snapshot: LocalSnapshot<Asset>,
    id: string,
  ): void {
    const tombstone = checkpoint(null, snapshot.documents.get(id)?.isolation)
    records.set(authorityKey(id), tombstone)
    records.delete(mirrorKey(id))
    snapshot.assets.delete(id)
    snapshot.documents.set(id, tombstone)
  }

  /** An explicit unit either matches every local base or leaves the original unit intact. */
  function applyAssetTransitions(
    records: Map<string, unknown>,
    transitions: readonly LocalAssetTransition<Asset>[],
    requireKnownInventory: boolean,
    authorize?: (snapshot: LocalSnapshot<Asset>) => readonly LocalAssetTransition<Asset>[],
  ): LocalSnapshot<Asset> {
    const snapshot = resolveLocalRecords(records, false)
    const additions = authorize?.(snapshot) ?? []
    const writes = additions.length ? [...transitions, ...additions] : transitions
    const ids = new Set(writes.map(({ id }) => id))
    if (
      ids.size !== writes.length ||
      snapshot.issues.some(({ id }) => requireKnownInventory || ids.has(id))
    )
      throw new PintaLocalStorageError('Não consegui conferir todos os desenhos desta mudança.')
    for (const { id, before, beforeRevision, after } of writes) {
      if (
        (before && before.id !== id) ||
        (after && after.id !== id) ||
        (snapshot.documents.get(id)?.revision ?? null) !== beforeRevision ||
        !localValuesEqual(snapshot.assets.get(id) ?? null, before)
      )
        throw new PintaLocalStorageError('Um dos desenhos mudou. Confira antes de guardar de novo.')
    }
    const names = new Set(
      [...snapshot.assets.values()]
        .filter((asset) => !ids.has(asset.id))
        .map((asset) => asset.name),
    )
    for (const { id, after } of writes) {
      if (!after) {
        putTombstone(records, snapshot, id)
        continue
      }
      if (names.has(after.name))
        throw new PintaLocalStorageError('Já existe outro desenho com um dos nomes desta mudança.')
      names.add(after.name)
      protectAsset(records, snapshot, format.stamp(after))
    }
    checkLocalBudget(snapshot.baseline, [...snapshot.assets.values()])
    return snapshot
  }

  return {
    selectLocalAssetRecords,
    resolveLocalRecords,
    protectAsset,
    checkLocalBudget,
    writeLocalRecords,
    deleteLocalRecord,
    applyAssetTransitions,
  }
}

const legacyAuthority = createLocalAssetAuthority<PintaAsset>({
  maxSchema: PINTA_MAX_SCHEMA,
  sanitize: sanitizePintaAsset,
  stamp: withPintaSchemaStamp,
  schema: pintaAssetSchema,
  checkBudget(before, after, bytes) {
    const projected = galleryBackupByteLength([...after]) + (bytes?.after ?? 0)
    if (
      projected > MAX_BACKUP_FILE_BYTES &&
      projected >= galleryBackupByteLength([...before]) + (bytes?.before ?? 0)
    )
      throw new PintaStorageBudgetError(projected)
  },
})

export const {
  selectLocalAssetRecords,
  resolveLocalRecords,
  protectAsset,
  checkLocalBudget,
  writeLocalRecords,
  deleteLocalRecord,
  applyAssetTransitions,
} = legacyAuthority
