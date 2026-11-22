import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { isTilesetKind, pintaAssetDependencyIds } from '../core/project'
import { pintaDoorBindings } from '../core/sceneMapClosure'
import type { LocalAssetTransition, LocalSnapshot } from './localAssetAuthority'
import type {
  LocalCausalState,
  PintaCausalLocalPull,
  PintaLocalCausalRead,
} from './localCausalOutbox'
import { projectRecoveryCopies } from './localCausalRecovery'

interface RecoveryDraft {
  opId: string
  baseEpoch?: string
  members: readonly { itemId: string; localRevision: string; deleted: boolean }[]
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

type Pull<Asset extends PintaMemoryAsset> = PintaCausalLocalPull<Asset>
type Archived<Asset extends PintaMemoryAsset> = NonNullable<Pull<Asset>['archived']>[number]

function recoveryDrafts<Asset extends PintaMemoryAsset>(
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
        members: group.members.map(({ itemId, localRevision, action }) => ({
          itemId,
          localRevision,
          deleted: action === 'delete',
        })),
        readSet: group.readSet,
        hashes: new Map(puts.map(({ itemId, sha256 }) => [itemId, sha256])),
      })
    }
  } else if (pull.recoverInitial && state.epoch === null && state.unbased) {
    const { opId, members, readSet } = state.unbased
    groups.push({
      opId,
      members,
      readSet: readSet.map((edge) => ({ ...edge, source: 'local' })),
      hashes: new Map(state.shadows?.get(opId)?.puts.map(({ itemId, sha256 }) => [itemId, sha256])),
    })
  }
  return groups
}

/** Build distinct authoring catalogs from retained members and their recorded reads. */
export function planArchivedRecovery<Asset extends PintaMemoryAsset>(
  pull: Pull<Asset>,
  state: LocalCausalState,
  snapshot: LocalSnapshot<Asset>,
): {
  ids: Set<string>
  diverged: Set<string>
  restoredCurrent: Set<string>
  groups: { selected: Asset[]; originals: ReadonlyMap<string, Asset> }[]
  incomplete: boolean
} {
  const result = {
    ids: new Set<string>(),
    diverged: new Set<string>(),
    restoredCurrent: new Set<string>(),
    groups: [] as { selected: Asset[]; originals: ReadonlyMap<string, Asset> }[],
    incomplete: false,
  }
  const drafts = recoveryDrafts(pull, state)
  const archived = new Map<string, Map<string, Archived<Asset>>>()
  const latest = new Map<string, RecoveryDraft>()
  for (const draft of drafts) {
    const candidates = new Map<string, Archived<Asset>>()
    for (const part of draft.members) latest.set(part.itemId, draft)
    for (const item of pull.archived ?? []) {
      if (item.opId !== draft.opId) continue
      const part = draft.members.find(({ itemId }) => itemId === item.asset.id)
      if (
        part &&
        !part.deleted &&
        part.localRevision === item.localRevision &&
        draft.hashes.get(item.asset.id) === item.sha256
      )
        candidates.set(item.asset.id, item)
    }
    archived.set(draft.opId, candidates)
  }
  for (const [id, draft] of latest) {
    const member = draft.members.find(({ itemId }) => itemId === id)!
    if (member.deleted || snapshot.documents.get(id)?.revision === member.localRevision) continue
    result.ids.add(id)
    result.diverged.add(id)
  }
  if (!result.diverged.size) return result

  const byOp = new Map(drafts.map((draft) => [draft.opId, draft]))
  const remote = new Map(pull.transitions.map((change) => [change.id, change]))
  const certified = new Map<string, Asset>()
  for (const [id, mark] of state.confirmed) {
    if (mark.deleted || !mark.sha256) continue
    const data = snapshot.assets.get(id)
    if (data && snapshot.documents.get(id)?.revision === mark.localRevision) certified.set(id, data)
  }
  function memberAsset(draft: RecoveryDraft, id: string): Asset | undefined {
    const part = draft.members.find(({ itemId }) => itemId === id)
    if (!part || part.deleted) return
    return (
      archived.get(draft.opId)?.get(id)?.asset ??
      (snapshot.documents.get(id)?.revision === part.localRevision
        ? snapshot.assets.get(id)
        : undefined)
    )
  }
  const seeds = new Map<RecoveryDraft, Set<string>>()
  for (const draft of drafts) {
    for (const { itemId, localRevision, deleted } of draft.members) {
      if (deleted || latest.get(itemId) !== draft) continue
      const current = snapshot.documents.get(itemId)
      const retained = memberAsset(draft, itemId)
      const displaced = current?.revision !== localRevision
      const affectedReader = draft.readSet.some(
        ({ consumerId, targetId }) => consumerId === itemId && result.diverged.has(targetId),
      )
      if (!displaced && !affectedReader) continue
      if (!retained) {
        if (latest.get(itemId) === draft || draft.hashes.has(itemId)) result.incomplete = true
        continue
      }
      if (!affectedReader && pintaValuesEqual(retained, current?.asset)) continue
      const ids = seeds.get(draft) ?? new Set()
      ids.add(itemId)
      seeds.set(draft, ids)
    }
  }

  for (const [draft, ids] of seeds) {
    const catalog = new Map(certified)
    const selected = new Map<string, { asset: Asset; source?: RecoveryDraft }>()
    const pending: string[] = []
    function include(id: string, asset: Asset | undefined, source?: RecoveryDraft): void {
      if (!asset) {
        result.incomplete = true
        return
      }
      const previous = selected.get(id)
      if (previous) {
        if (!pintaValuesEqual(previous.asset, asset)) result.incomplete = true
        return
      }
      result.ids.add(id)
      if (
        source?.members.some(
          ({ itemId, localRevision }) =>
            itemId === id && localRevision === snapshot.documents.get(id)?.revision,
        )
      )
        result.restoredCurrent.add(id)
      selected.set(id, { asset, ...(source ? { source } : {}) })
      catalog.set(id, asset)
      pending.push(id)
    }
    for (const id of ids) include(id, memberAsset(draft, id), draft)
    for (let i = 0; i < pending.length; i++) {
      const id = pending[i]!
      const { asset, source } = selected.get(id)!
      if (!source) {
        const refs = resourceIds(asset, catalog)
        // A nested published document has no local read set. Its reachable bytes are only
        // reconstructible from the complete catalog observed at the same epoch.
        if (
          refs.length &&
          (!draft.baseEpoch ||
            draft.baseEpoch !== state.epoch ||
            (state.writeEpoch ?? state.epoch) !== state.epoch)
        ) {
          result.incomplete = true
          continue
        }
        for (const target of refs) include(target, certified.get(target))
        continue
      }
      // Resolve each reference to its own source. The current contents of a shared ID are not a basis.
      for (const edge of source.readSet.filter(({ consumerId }) => consumerId === id)) {
        const target = edge.targetId
        switch (edge.source) {
          case 'unit':
            include(target, memberAsset(source, target), source)
            break
          case 'predecessor': {
            const producer = byOp.get(edge.base.opId)
            const part = producer?.members.find(({ itemId }) => itemId === target)
            include(
              target,
              producer &&
                part?.localRevision === edge.base.localRevision &&
                producer.hashes.get(target) === edge.base.sha256
                ? memberAsset(producer, target)
                : undefined,
              producer,
            )
            break
          }
          case 'local': {
            const part = source.members.find(({ itemId }) => itemId === target)
            if (edge.localRevision && part?.localRevision === edge.localRevision)
              include(target, memberAsset(source, target), source)
            else
              include(
                target,
                edge.localRevision &&
                  snapshot.documents.get(target)?.revision === edge.localRevision
                  ? snapshot.assets.get(target)
                  : undefined,
              )
            break
          }
          case 'snapshot': {
            const sameBase = (
              part:
                | { revision: number; sha256: string | null; layoutRevision: string | null }
                | null
                | undefined,
            ) =>
              part?.revision === edge.revision &&
              part.sha256 === edge.sha256 &&
              (part.layoutRevision ?? undefined) === edge.layoutRevision
            const incoming = remote.get(target)
            const base = state.confirmed.get(target)
            include(
              target,
              sameBase(base) && certified.has(target)
                ? certified.get(target)
                : sameBase(incoming?.remote)
                  ? (incoming?.after ?? undefined)
                  : undefined,
            )
            break
          }
        }
      }
    }
    for (const [id, { asset, source }] of selected) {
      const refs = resourceIds(asset, catalog)
      const observed =
        source &&
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
    result.groups.push({
      selected: [...selected.values()]
        .map(({ asset }) => asset)
        .sort((a, b) => Number(isTilesetKind(b)) - Number(isTilesetKind(a))),
      originals: catalog,
    })
  }
  return result
}

function resourceIds<Asset extends PintaMemoryAsset>(
  asset: Asset,
  catalog: ReadonlyMap<string, Asset>,
): string[] {
  const ids = new Set(pintaAssetDependencyIds(asset))
  for (const { binding } of pintaDoorBindings(asset, catalog))
    if (binding.type === 'target') ids.add(binding.id)
  ids.delete(asset.id)
  return [...ids]
}

export function copyArchivedRecovery<Asset extends PintaMemoryAsset>(
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
