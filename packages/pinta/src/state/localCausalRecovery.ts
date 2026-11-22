import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import {
  isObjectLayer,
  isTilesetKind,
  pintaAssetDependencyIds,
  type TilemapAsset,
  type TilemapCells,
} from '../core/project'
import { pintaDoorBinding, pintaDoorBindings } from '../core/sceneMapClosure'
import { planImport } from './importPlan'
import type { LocalAssetTransition, LocalSnapshot } from './localAssetAuthority'
import type { PintaCausalLocalPull } from './localCausalOutbox'

export function localRecoverySeeds<Asset extends PintaMemoryAsset>(
  pull: PintaCausalLocalPull<Asset>,
  local: ReadonlyMap<string, Asset>,
  official: ReadonlyMap<string, Asset>,
  distinctLocal: (id: string) => boolean,
): Set<string> {
  const beforeByName = new Map([...local.values()].map((asset) => [asset.name, asset]))
  const written = new Set(pull.transitions.map(({ id }) => id))
  const seeds = new Set<string>()
  for (const { id, before, after } of pull.transitions) {
    if (before && distinctLocal(id) && !pintaValuesEqual(before, after)) seeds.add(id)
    if (!after) continue
    const incumbent = beforeByName.get(after.name)
    if (
      incumbent &&
      incumbent.id !== id &&
      (!written.has(incumbent.id) || official.get(incumbent.id)?.name === incumbent.name)
    )
      seeds.add(incumbent.id)
  }
  const retained = [...local.values()].filter(
    (asset) => !official.has(asset.id) && !written.has(asset.id),
  )
  const projected = new Map([...official, ...retained.map((asset) => [asset.id, asset] as const)])
  const retainedByName = new Map(retained.map((asset) => [asset.name, asset]))
  for (const asset of official.values()) {
    for (const { selector, binding } of pintaDoorBindings(asset, official)) {
      if (
        typeof selector !== 'string' ||
        pintaValuesEqual(binding, pintaDoorBinding(selector, projected))
      )
        continue
      const shadow = projected.get(selector)
      if (shadow && !official.has(shadow.id)) seeds.add(shadow.id)
      const namesake = retainedByName.get(selector)
      if (namesake?.kind === 'tilemap') seeds.add(namesake.id)
    }
  }
  return seeds
}

/** Both sides keep their authored references, including readers of a restored sheet. */
export function localRecoveryClosure<Asset extends PintaMemoryAsset>(
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

/** A portal follows the original global target even when the map has an embedded alias. */
function restoreDoorTargets<Map extends TilemapAsset<TilemapCells>>(
  before: TilemapAsset<TilemapCells>,
  copy: Map,
  originals: ReadonlyMap<string, PintaMemoryAsset>,
  recoveredIds: ReadonlyMap<string, string>,
): Map {
  return {
    ...copy,
    layers: copy.layers.map((layer, i) => {
      const original = before.layers[i]
      if (!original || !isObjectLayer(original) || !isObjectLayer(layer)) return layer
      return {
        ...layer,
        objects: layer.objects.map((obj, j) => {
          const source = original.objects[j]
          if (source?.role !== 'door') return obj
          const properties = { ...obj.properties }
          for (const key of ['destino', 'destination']) {
            const value = source.properties[key]
            if (value === undefined) continue
            const selector = typeof value === 'object' ? value.value : value
            const binding =
              typeof selector === 'string' ? pintaDoorBinding(selector, originals) : null
            const target = binding?.type === 'target' ? recoveredIds.get(binding.id) : undefined
            properties[key] = target
              ? typeof value === 'object'
                ? { ...value, value: target }
                : target
              : value
          }
          return { ...obj, properties }
        }),
      }
    }),
  }
}

export function recoverLocalAssets<Asset extends PintaMemoryAsset>(
  ids: readonly string[],
  pull: PintaCausalLocalPull<Asset>,
  snapshot: LocalSnapshot<Asset>,
  official: ReadonlyMap<string, Asset>,
): { writes: LocalAssetTransition<Asset>[]; copies: Asset[] } | null {
  const selected = ids
    .flatMap((id) => {
      const original = snapshot.assets.get(id)
      return original ? [original] : []
    })
    .sort((a, b) => Number(isTilesetKind(b)) - Number(isTilesetKind(a)))
  if (selected.length !== ids.length) return null
  const written = new Set(pull.transitions.map(({ id }) => id))
  const names = new Set([
    ...[...snapshot.assets.values()]
      .filter((asset) => !official.has(asset.id))
      .map(({ name }) => name),
    ...[...official.values()].map(({ name }) => name),
    ...snapshot.assets.keys(),
    ...official.keys(),
  ])
  for (const asset of [...snapshot.assets.values(), ...official.values()]) {
    for (const { selector } of pintaDoorBindings(asset, snapshot.assets))
      if (typeof selector === 'string') names.add(selector)
  }
  const imported = planImport(
    selected,
    new Set(selected.filter(isTilesetKind).map(({ id }) => id)),
    names,
    ({ name }) => `${name.slice(0, 42).replace(/-+$/, '')}-copia`,
  )
  if (imported.error || imported.pairs.length !== selected.length) return null
  const copies = imported.pairs.map(({ restored }, index) => {
    const original = selected[index]!
    const copy = { ...restored, createdAt: original.createdAt }
    if (copy.kind === 'tilemap' && original.kind === 'tilemap')
      return restoreDoorTargets(original, copy, snapshot.assets, imported.idMap)
    if (copy.kind === 'map-set' && original.kind === 'map-set')
      return {
        ...copy,
        map: restoreDoorTargets(original.map, copy.map, snapshot.assets, imported.idMap),
      }
    return copy
  })
  const projected = new Map(snapshot.assets)
  for (const original of selected) projected.delete(original.id)
  for (const id of written) projected.delete(id)
  for (const [id, after] of official) projected.set(id, after)
  for (const copy of copies) {
    if (projected.has(copy.id)) return null
    projected.set(copy.id, copy)
  }
  for (const asset of snapshot.assets.values()) {
    if (written.has(asset.id) || imported.idMap.has(asset.id) || official.has(asset.id)) continue
    if (
      !pintaValuesEqual(
        pintaDoorBindings(asset, snapshot.assets),
        pintaDoorBindings(asset, projected),
      )
    )
      return null
  }
  for (const asset of official.values())
    if (!pintaValuesEqual(pintaDoorBindings(asset, official), pintaDoorBindings(asset, projected)))
      return null
  for (const [i, copy] of copies.entries()) {
    const original = selected[i]!
    const expected = pintaDoorBindings(original, snapshot.assets).map(({ binding }) =>
      binding.type === 'target'
        ? { ...binding, id: imported.idMap.get(binding.id) ?? binding.id }
        : binding,
    )
    const actual = pintaDoorBindings(copy, projected).map(({ binding }) => binding)
    if (!pintaValuesEqual(expected, actual)) return null
  }
  const writes: LocalAssetTransition<Asset>[] = copies.map((after) => ({
    id: after.id,
    before: null,
    beforeRevision: null,
    after,
  }))
  for (const original of selected) {
    if (official.has(original.id) || written.has(original.id)) continue
    const beforeRevision = snapshot.documents.get(original.id)?.revision
    if (!beforeRevision) return null
    writes.push({ id: original.id, before: original, beforeRevision, after: null })
  }
  return { writes, copies }
}
