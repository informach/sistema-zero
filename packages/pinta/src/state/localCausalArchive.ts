import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import { isTilesetKind, pintaAssetDependencyIds } from '../core/project'
import { pintaDoorBindings } from '../core/sceneMapClosure'
import type { LocalAssetTransition, LocalSnapshot } from './localAssetAuthority'
import type {
  LocalCausalState,
  PintaCausalConfirmed,
  PintaCausalLocalPull,
  PintaLocalCausalRead,
} from './localCausalOutbox'
import { projectRecoveryCopies } from './localCausalRecovery'

interface RecoveryDraft {
  opId: string
  baseEpoch?: string
  members: ReadonlyMap<string, { localRevision: string; deleted: boolean }>
  readSet: readonly (
    | PintaLocalCausalRead
    | {
        source: 'local'
        consumerId: string
        targetId: string
        localRevision: string | null
      }
  )[]
  hashes: ReadonlyMap<string, string>
}

type Pull<Asset extends PintaWorkshopAsset> = PintaCausalLocalPull<Asset>
type Archived<Asset extends PintaWorkshopAsset> = NonNullable<Pull<Asset>['archived']>[number]
type Read = RecoveryDraft['readSet'][number]

function matchesRead(
  mark: Pick<PintaCausalConfirmed, 'revision' | 'sha256' | 'layoutRevision'> | null | undefined,
  edge: Extract<Read, { source: 'snapshot' }>,
): boolean {
  return (
    mark?.revision === edge.revision &&
    mark.sha256 === edge.sha256 &&
    (mark.layoutRevision ?? undefined) === edge.layoutRevision
  )
}

function recoveryDrafts<Asset extends PintaWorkshopAsset>(
  pull: Pull<Asset>,
  state: LocalCausalState,
) {
  const groups: RecoveryDraft[] = []
  const sealed = pull.recoverUnit ? state.sealed : null
  if (sealed) {
    for (const group of [sealed.local, ...state.pending]) {
      const stored = state.prepared?.get(group.opId) ?? state.shadows?.get(group.opId)
      const puts =
        group === sealed.local
          ? sealed.intent.members.filter((part) => part.action === 'put')
          : (stored?.puts ?? [])
      groups.push({
        opId: group.opId,
        baseEpoch: group.baseEpoch,
        members: new Map(
          group.members.map(({ itemId, localRevision, action }) => [
            itemId,
            { localRevision, deleted: action === 'delete' },
          ]),
        ),
        readSet: group.readSet,
        hashes: new Map(puts.map(({ itemId, sha256 }) => [itemId, sha256])),
      })
    }
  } else if (pull.recoverInitial && state.epoch === null && state.unbased) {
    const { opId, members, readSet } = state.unbased
    groups.push({
      opId,
      members: new Map(members.map(({ itemId, ...member }) => [itemId, member])),
      readSet: readSet.map((edge) => ({ ...edge, source: 'local' })),
      hashes: new Map(state.shadows?.get(opId)?.puts.map(({ itemId, sha256 }) => [itemId, sha256])),
    })
  }
  return groups
}

/** Build distinct authoring catalogs from retained members and their recorded reads. */
export function planArchivedRecovery<Asset extends PintaWorkshopAsset>(
  pull: Pull<Asset>,
  state: LocalCausalState,
  snapshot: LocalSnapshot<Asset>,
): {
  ids: Set<string>
  diverged: Set<string>
  displacedResources: Set<string>
  groups: { selected: Asset[]; originals: ReadonlyMap<string, Asset> }[]
  incomplete: boolean
} {
  const result = {
    ids: new Set<string>(),
    diverged: new Set<string>(),
    displacedResources: new Set<string>(),
    groups: [] as { selected: Asset[]; originals: ReadonlyMap<string, Asset> }[],
    incomplete: false,
  }
  const drafts = recoveryDrafts(pull, state)
  if (!drafts.length) return result
  const byOp = new Map(drafts.map((draft) => [draft.opId, draft]))
  const archived = new Map<string, Map<string, Archived<Asset>>>()
  const latest = new Map<string, RecoveryDraft>()
  for (const draft of drafts) for (const id of draft.members.keys()) latest.set(id, draft)
  for (const item of pull.archived ?? []) {
    const draft = byOp.get(item.opId)
    const part = draft?.members.get(item.asset.id)
    if (
      !draft ||
      !part ||
      part.deleted ||
      part.localRevision !== item.localRevision ||
      draft.hashes.get(item.asset.id) !== item.sha256
    )
      continue
    const candidates = archived.get(draft.opId) ?? new Map<string, Archived<Asset>>()
    candidates.set(item.asset.id, item)
    archived.set(draft.opId, candidates)
  }
  for (const [id, draft] of latest) {
    const member = draft.members.get(id)!
    if (member.deleted || snapshot.documents.get(id)?.revision === member.localRevision) continue
    result.ids.add(id)
    result.diverged.add(id)
  }
  const remote = new Map(pull.transitions.map((change) => [change.id, change]))
  const certified = new Map<string, Asset>()
  for (const [id, mark] of state.confirmed) {
    if (mark.deleted || !mark.sha256) continue
    const data = snapshot.assets.get(id)
    if (data && snapshot.documents.get(id)?.revision === mark.localRevision) certified.set(id, data)
  }
  function memberAsset(draft: RecoveryDraft, id: string): Asset | undefined {
    const part = draft.members.get(id)
    if (!part || part.deleted) return
    return (
      archived.get(draft.opId)?.get(id)?.asset ??
      (snapshot.documents.get(id)?.revision === part.localRevision
        ? snapshot.assets.get(id)
        : undefined)
    )
  }
  const pinCatalogs = new Map<RecoveryDraft, ReadonlyMap<string, Asset>>()
  function pinnedCatalog(draft: RecoveryDraft): ReadonlyMap<string, Asset> {
    const cached = pinCatalogs.get(draft)
    if (cached) return cached
    const entries = new Map(state.pins?.get(draft.opId)?.map((pin) => [pin.itemId, pin]))
    const catalog = new Map<string, Asset>()
    for (const id of draft.members.keys()) {
      const asset = memberAsset(draft, id)
      if (asset) catalog.set(id, asset)
    }
    for (const { opId, sha256, asset } of pull.archivedPins ?? [])
      if (opId === draft.opId && entries.get(asset.id)?.put.sha256 === sha256)
        catalog.set(asset.id, asset)
    pinCatalogs.set(draft, catalog)
    return catalog
  }
  function sourceDraft(draft: RecoveryDraft, edge: Read): RecoveryDraft | undefined {
    switch (edge.source) {
      case 'unit':
        return draft
      case 'predecessor': {
        const source = byOp.get(edge.base.opId)
        const part = source?.members.get(edge.targetId)
        return part?.localRevision === edge.base.localRevision &&
          source?.hashes.get(edge.targetId) === edge.base.sha256
          ? source
          : undefined
      }
      case 'local':
        return draft.members.get(edge.targetId)?.localRevision === edge.localRevision
          ? draft
          : undefined
      case 'snapshot':
        return undefined
    }
  }
  type Member = { draft: RecoveryDraft; id: string }
  const seeds = new Map<RecoveryDraft, Set<string>>()
  const pendingSeeds: Member[] = []
  const readers = new Map<string, Member[]>()
  const address = (draft: RecoveryDraft, id: string) => `${draft.opId}/${id}`
  function seed(draft: RecoveryDraft, id: string): void {
    const ids = seeds.get(draft) ?? new Set<string>()
    if (ids.has(id)) return
    ids.add(id)
    seeds.set(draft, ids)
    pendingSeeds.push({ draft, id })
  }
  for (const draft of drafts) {
    const displacedPins = state.pins
      ?.get(draft.opId)
      ?.some(
        (pin) =>
          pin.localRevision !== null &&
          snapshot.documents.get(pin.itemId)?.revision !== pin.localRevision,
      )
    for (const [itemId, { localRevision, deleted }] of draft.members) {
      if (deleted) continue
      const current = snapshot.documents.get(itemId)
      if (displacedPins) seed(draft, itemId)
      if (current?.revision === localRevision) continue
      const retained = memberAsset(draft, itemId)
      if (!retained) {
        if (latest.get(itemId) === draft || draft.hashes.has(itemId)) result.incomplete = true
        continue
      }
      if (!pintaValuesEqual(retained, current?.asset)) seed(draft, itemId)
    }
    for (const edge of draft.readSet) {
      const id = edge.targetId
      const producer = sourceDraft(draft, edge)
      if (producer) {
        const key = address(producer, id)
        const members = readers.get(key) ?? []
        members.push({ draft, id: edge.consumerId })
        readers.set(key, members)
      }
      const mark = state.confirmed.get(id)
      const observed =
        edge.source === 'snapshot'
          ? matchesRead(mark, edge) && !mark?.deleted
            ? mark?.localRevision
            : undefined
          : edge.source === 'local'
            ? edge.localRevision
            : edge.source === 'predecessor'
              ? edge.base.localRevision
              : producer?.members.get(id)?.localRevision
      if (edge.source === 'local' && !observed && !result.diverged.has(id)) continue
      if (observed && snapshot.documents.get(id)?.revision === observed) continue
      result.ids.add(id)
      result.displacedResources.add(id)
      seed(draft, edge.consumerId)
    }
  }
  for (const { draft, id } of pendingSeeds)
    for (const reader of readers.get(address(draft, id)) ?? []) seed(reader.draft, reader.id)

  const incomingCatalog = new Map(certified)
  for (const { id, after } of pull.transitions) {
    if (after) incomingCatalog.set(id, after)
    else incomingCatalog.delete(id)
  }
  type Source = RecoveryDraft | ReadonlyMap<string, Asset> | null
  const isDraft = (source: Source): source is RecoveryDraft => !!source && 'opId' in source

  for (const [draft, ids] of seeds) {
    const catalog = new Map(certified)
    const selected = new Map<string, { asset: Asset; source: Source }>()
    const pending: string[] = []
    function include(id: string, asset: Asset | undefined, source: Source): void {
      if (!asset) {
        result.incomplete = true
        return
      }
      const previous = selected.get(id)
      if (previous) {
        if (
          !pintaValuesEqual(previous.asset, asset) ||
          (previous.source !== source && resourceIds(asset, catalog).length)
        )
          result.incomplete = true
        return
      }
      result.ids.add(id)
      selected.set(id, { asset, source })
      catalog.set(id, asset)
      pending.push(id)
    }
    for (const id of ids) include(id, memberAsset(draft, id), draft)
    for (let i = 0; i < pending.length; i++) {
      const id = pending[i]!
      const { asset, source } = selected.get(id)!
      if (!isDraft(source)) {
        const refs = resourceIds(asset, source ?? catalog)
        if (source) for (const target of refs) include(target, source.get(target), source)
        else if (refs.length) result.incomplete = true
        continue
      }
      // Resolve each reference to its own source. The current contents of a shared ID are not a basis.
      for (const edge of source.readSet.filter(({ consumerId }) => consumerId === id)) {
        const target = edge.targetId
        if (edge.source !== 'unit') {
          const pinned = pinnedCatalog(source)
          const resource = state.pins?.get(source.opId)?.some((pin) => pin.itemId === target)
          if (resource) {
            include(target, pinned.get(target), pinned)
            continue
          }
        }
        switch (edge.source) {
          case 'unit':
            include(target, memberAsset(source, target), source)
            break
          case 'predecessor': {
            const predecessor = sourceDraft(source, edge)
            include(
              target,
              predecessor ? memberAsset(predecessor, target) : undefined,
              predecessor ?? null,
            )
            break
          }
          case 'local': {
            const part = source.members.get(target)
            if (edge.localRevision && part?.localRevision === edge.localRevision)
              include(target, memberAsset(source, target), source)
            else
              include(
                target,
                edge.localRevision &&
                  snapshot.documents.get(target)?.revision === edge.localRevision
                  ? snapshot.assets.get(target)
                  : undefined,
                null,
              )
            break
          }
          case 'snapshot': {
            const incoming = remote.get(target)
            const base = state.confirmed.get(target)
            const atPreviousEpoch =
              source.baseEpoch === state.epoch && (state.writeEpoch ?? state.epoch) === state.epoch
            const earlier = matchesRead(base, edge) ? certified.get(target) : undefined
            const later = matchesRead(incoming?.remote, edge) ? incoming?.after : null
            if (earlier && atPreviousEpoch) include(target, earlier, certified)
            else if (later)
              include(target, later, source.baseEpoch === pull.epoch ? incomingCatalog : null)
            else include(target, earlier, null)
            break
          }
        }
      }
    }
    for (const [id, { asset, source }] of selected) {
      const refs = resourceIds(asset, catalog)
      const observed =
        isDraft(source) &&
        new Set(
          source.readSet
            .filter(({ consumerId }) => consumerId === id)
            .map(({ targetId }) => targetId),
        )
      if (
        refs.some((target) => !selected.has(target) || (observed && !observed.has(target))) ||
        (observed && observed.size !== refs.length)
      )
        result.incomplete = true
    }
    const assets = [...selected.values()].map(({ asset }) => asset)
    if (
      assets.length &&
      !result.groups.some((group) =>
        assets.every((asset) => group.selected.some((other) => pintaValuesEqual(asset, other))),
      )
    ) {
      result.groups = result.groups.filter(
        (group) =>
          !group.selected.every((asset) => pintaValuesEqual(asset, selected.get(asset.id)?.asset)),
      )
      result.groups.push({
        selected: assets.sort((a, b) => Number(isTilesetKind(b)) - Number(isTilesetKind(a))),
        originals: catalog,
      })
    }
  }
  return result
}

function resourceIds<Asset extends PintaWorkshopAsset>(
  asset: Asset,
  catalog: ReadonlyMap<string, Asset>,
): string[] {
  const ids = new Set(pintaAssetDependencyIds(asset))
  for (const { binding } of pintaDoorBindings(asset, catalog))
    if (binding.type === 'target') ids.add(binding.id)
  ids.delete(asset.id)
  return [...ids]
}

export function copyArchivedRecovery<Asset extends PintaWorkshopAsset>(
  recovery: ReturnType<typeof planArchivedRecovery<Asset>>,
  destination: ReadonlyMap<string, Asset>,
): { copies: Asset[]; writes: LocalAssetTransition<Asset>[] } | null {
  const copies: Asset[] = []
  for (const { selected, originals } of recovery.groups) {
    const group = projectRecoveryCopies(selected, originals, destination)
    if (!group) return null
    copies.push(...group.copies)
    destination = group.catalog
  }
  return {
    copies,
    writes: copies.map((after) => ({ id: after.id, before: null, beforeRevision: null, after })),
  }
}
