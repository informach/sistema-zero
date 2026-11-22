import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { isTilesetKind, pintaAssetDependencyIds } from '../core/project'
import { pintaDoorBindings } from '../core/sceneMapClosure'
import { planImport } from './importPlan'
import type { LocalAssetTransition, LocalSnapshot } from './localAssetAuthority'
import type { PintaCausalLocalPull } from './localCausalOutbox'

export function initialRecoverySeeds<Asset extends PintaMemoryAsset>(
  pull: PintaCausalLocalPull<Asset>,
  local: ReadonlyMap<string, Asset>,
): Set<string> {
  const beforeByName = new Map([...local.values()].map((asset) => [asset.name, asset]))
  const remoteNames = new Map(pull.transitions.map(({ id, after }) => [id, after?.name]))
  const seeds = new Set<string>()
  for (const { id, before, after } of pull.transitions) {
    if (!after) continue
    if (before && !pintaValuesEqual(before, after)) seeds.add(id)
    const incumbent = beforeByName.get(after.name)
    if (
      incumbent &&
      incumbent.id !== id &&
      (!remoteNames.has(incumbent.id) || remoteNames.get(incumbent.id) === incumbent.name)
    )
      seeds.add(incumbent.id)
  }
  return seeds
}

/** Both sides keep their authored references, including readers of a restored sheet. */
export function initialRecoveryClosure<Asset extends PintaMemoryAsset>(
  seeds: ReadonlySet<string>,
  assets: ReadonlyMap<string, Asset>,
): { ids: string[]; incomplete: boolean } {
  if (!seeds.size) return { ids: [], incomplete: false }
  const adjacent = new Map<string, Set<string>>()
  const unavailable = new Set<string>()
  function connect(from: string, to: string): void {
    if (!assets.has(to)) {
      unavailable.add(from)
      return
    }
    const links = adjacent.get(from) ?? new Set<string>()
    links.add(to)
    adjacent.set(from, links)
  }
  for (const asset of assets.values()) {
    const doors = pintaDoorBindings(asset, assets)
    if (doors.some(({ binding }) => binding.type !== 'target')) unavailable.add(asset.id)
    const refs = new Set([
      ...pintaAssetDependencyIds(asset),
      ...doors.flatMap(({ binding }) => (binding.type === 'target' ? [binding.id] : [])),
    ])
    for (const id of refs) {
      connect(asset.id, id)
      if (assets.has(id)) connect(id, asset.id)
    }
  }
  const ids = [...seeds]
  const seen = new Set(ids)
  for (const id of ids)
    for (const neighbour of adjacent.get(id) ?? []) {
      if (seen.has(neighbour)) continue
      seen.add(neighbour)
      ids.push(neighbour)
    }
  return { ids, incomplete: ids.some((id) => unavailable.has(id) || !assets.has(id)) }
}

export function recoverInitialLocalAssets<Asset extends PintaMemoryAsset>(
  ids: readonly string[],
  pull: PintaCausalLocalPull<Asset>,
  snapshot: LocalSnapshot<Asset>,
): { writes: LocalAssetTransition<Asset>[]; copies: Asset[] } | null {
  const selected = ids
    .flatMap((id) => {
      const original = snapshot.assets.get(id)
      return original ? [original] : []
    })
    .sort((a, b) => Number(isTilesetKind(b)) - Number(isTilesetKind(a)))
  if (selected.length !== ids.length) return null
  const remote = new Map(pull.transitions.map(({ id, after }) => [id, after]))
  const names = new Set([
    ...[...snapshot.assets.values()]
      .filter((asset) => !remote.has(asset.id))
      .map(({ name }) => name),
    ...[...remote.values()].flatMap((asset) => (asset ? [asset.name] : [])),
  ])
  const imported = planImport(
    selected,
    new Set(selected.filter(isTilesetKind).map(({ id }) => id)),
    names,
    ({ name }) => `${name.slice(0, 42).replace(/-+$/, '')}-copia`,
  )
  if (imported.error || imported.pairs.length !== selected.length) return null
  const copies = imported.pairs.map(({ restored }, index) => ({
    ...restored,
    createdAt: selected[index]!.createdAt,
  }))
  const writes: LocalAssetTransition<Asset>[] = copies.map((after) => ({
    id: after.id,
    before: null,
    beforeRevision: null,
    after,
  }))
  for (const original of selected) {
    if (remote.has(original.id)) continue
    const beforeRevision = snapshot.documents.get(original.id)?.revision
    if (!beforeRevision) return null
    writes.push({ id: original.id, before: original, beforeRevision, after: null })
  }
  return { writes, copies }
}
