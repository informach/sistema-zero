import { pintaValuesEqual } from '../core/assetEquality'
import { isWorkshopProjectedMap, type PintaWorkshopAsset } from '../core/assetMemory'
import {
  isObjectLayer,
  isTileLayerGraph,
  isTilesetKind,
  type MapGraph,
  pintaAssetDependencyIds,
  tileLayerTilesetId,
} from '../core/project'
import { pintaDoorBinding, pintaDoorBindings } from '../core/sceneMapClosure'
import { type AutomapBook, automapSheetDefinition } from '../tiles/automapping/book'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { planImport } from './importPlan'
import type { LocalAssetTransition, LocalSnapshot } from './localAssetAuthority'
import type { PintaCausalLocalPull } from './localCausalOutbox'

export function localRecoverySeeds<Asset extends PintaWorkshopAsset>(
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
export function localRecoveryClosure<Asset extends PintaWorkshopAsset>(
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
function restoreDoorTargets(
  before: MapGraph,
  copy: MapGraph,
  originals: ReadonlyMap<string, PintaWorkshopAsset>,
  recoveredIds: ReadonlyMap<string, string>,
): void {
  for (const [i, layer] of copy.layers.entries()) {
    const original = before.layers[i]
    if (!original || !isObjectLayer(original) || !isObjectLayer(layer)) continue
    for (const [j, obj] of layer.objects.entries()) {
      const source = original.objects[j]
      if (source?.role !== 'door') continue
      const properties = { ...obj.properties }
      for (const key of ['destino', 'destination']) {
        const value = source.properties[key]
        if (value === undefined) continue
        const selector = typeof value === 'object' ? value.value : value
        const binding = typeof selector === 'string' ? pintaDoorBinding(selector, originals) : null
        const target = binding?.type === 'target' ? recoveredIds.get(binding.id) : undefined
        properties[key] = target
          ? typeof value === 'object'
            ? { ...value, value: target }
            : target
          : value
      }
      layer.objects[j] = { ...obj, properties }
    }
  }
}

/** Keep the exact rule signature on a copy with new layer/sheet IDs. A changed sheet requires
 * an explicit recovery from the original bytes; the IDB compare-and-swap never guesses a hash. */
function restoreRuleBindings<Asset extends PintaWorkshopAsset>(
  original: MapGraph,
  rules: AutomapBook,
  copy: MapGraph & { automapping?: AutomapBook },
  originals: ReadonlyMap<string, Asset>,
  copies: ReadonlyMap<string, Asset>,
): boolean {
  const layers = new Map(original.layers.map((layer, i) => [layer.id, i]))
  const checked = new Map<string, string>()
  const lookup = (map: MapGraph, catalog: ReadonlyMap<string, Asset>, id: string) =>
    map.resources?.find((row) => row.asset.id === id)?.asset ?? catalog.get(id)
  const book = structuredClone(rules)
  for (const rule of book.rules)
    for (const group of [rule.input, ...rule.outputs])
      for (const plane of group) {
        const index = layers.get(plane.layer)
        const from = index === undefined ? undefined : original.layers[index],
          into = index === undefined ? undefined : copy.layers[index]
        if (
          !from ||
          !into ||
          !isTileLayerGraph(from) ||
          !isTileLayerGraph(into) ||
          tileLayerTilesetId(original, from) !== plane.sheet
        )
          return false
        const id = tileLayerTilesetId(copy, into)
        if (checked.get(plane.sheet) !== id) {
          const old = lookup(original, originals, plane.sheet),
            next = lookup(copy, copies, id)
          if (
            !old ||
            !next ||
            !isTilesetKind(old) ||
            !isTilesetKind(next) ||
            !pintaValuesEqual(automapSheetDefinition(old), automapSheetDefinition(next))
          )
            return false
          checked.set(plane.sheet, id)
        }
        plane.layer = into.id
        plane.sheet = id
      }
  copy.automapping = book
  return true
}

export function projectRecoveryCopies<Asset extends PintaWorkshopAsset>(
  selected: readonly Asset[],
  originals: ReadonlyMap<string, Asset>,
  destination: ReadonlyMap<string, Asset>,
): { copies: Asset[]; catalog: Map<string, Asset> } | null {
  const names = new Set([
    ...[...destination.values()].map(({ name }) => name),
    ...originals.keys(),
    ...destination.keys(),
  ])
  for (const [assets, catalog] of [
    [originals, originals],
    [destination, destination],
  ] as const)
    for (const asset of assets.values())
      for (const { selector } of pintaDoorBindings(asset, catalog))
        if (typeof selector === 'string') names.add(selector)
  const imported = planImport(
    [...selected],
    new Set(selected.filter(isTilesetKind).map(({ id }) => id)),
    names,
    ({ name }) => `${name.slice(0, 42).replace(/-+$/, '')}-copia`,
  )
  if (imported.error || imported.pairs.length !== selected.length) return null
  const copies = imported.pairs.map(({ restored }, index) => {
    const original = selected[index]!
    const copy = { ...restored, createdAt: original.createdAt }
    if (copy.kind === 'tilemap' && original.kind === 'tilemap')
      restoreDoorTargets(original, copy, originals, imported.idMap)
    if (copy.kind === 'map-set' && original.kind === 'map-set')
      restoreDoorTargets(original.map, copy.map, originals, imported.idMap)
    return copy
  })
  const catalog = new Map(destination)
  for (const copy of copies) {
    if (catalog.has(copy.id)) return null
    catalog.set(copy.id, copy)
  }
  for (const asset of destination.values())
    if (!pintaValuesEqual(pintaDoorBindings(asset, destination), pintaDoorBindings(asset, catalog)))
      return null
  for (const [i, copy] of copies.entries()) {
    const original = selected[i]!
    if (
      isPintaAuthoredMap(original) &&
      (!isPintaAuthoredMap(copy) ||
        !restoreRuleBindings(original, original.automapping, copy, originals, catalog))
    )
      return null
    // A projected copy carries its book too; the same rebinding keeps its exact signature.
    if (
      isWorkshopProjectedMap(original) &&
      original.automapping &&
      (!isWorkshopProjectedMap(copy) ||
        !restoreRuleBindings(original, original.automapping, copy, originals, catalog))
    )
      return null
    const expected = pintaDoorBindings(original, originals).map(({ binding }) =>
      binding.type === 'target'
        ? { ...binding, id: imported.idMap.get(binding.id) ?? binding.id }
        : binding,
    )
    const actual = pintaDoorBindings(copy, catalog).map(({ binding }) => binding)
    if (!pintaValuesEqual(expected, actual)) return null
  }
  return { copies, catalog }
}

export function recoverLocalAssets<Asset extends PintaWorkshopAsset>(
  ids: readonly string[],
  pull: PintaCausalLocalPull<Asset>,
  snapshot: LocalSnapshot<Asset>,
  official: ReadonlyMap<string, Asset>,
): { writes: LocalAssetTransition<Asset>[]; copies: Asset[]; catalog: Map<string, Asset> } | null {
  const selected = ids
    .flatMap((id) => {
      const original = snapshot.assets.get(id)
      return original ? [original] : []
    })
    .sort((a, b) => Number(isTilesetKind(b)) - Number(isTilesetKind(a)))
  if (selected.length !== ids.length) return null
  const written = new Set(pull.transitions.map(({ id }) => id))
  const destination = new Map(snapshot.assets)
  for (const original of selected) destination.delete(original.id)
  for (const id of written) destination.delete(id)
  for (const [id, after] of official) destination.set(id, after)
  for (const asset of snapshot.assets.values()) {
    if (written.has(asset.id) || !destination.has(asset.id) || official.has(asset.id)) continue
    if (
      !pintaValuesEqual(
        pintaDoorBindings(asset, snapshot.assets),
        pintaDoorBindings(asset, destination),
      )
    )
      return null
  }
  for (const asset of official.values())
    if (
      !pintaValuesEqual(pintaDoorBindings(asset, official), pintaDoorBindings(asset, destination))
    )
      return null
  const recovered = projectRecoveryCopies(selected, snapshot.assets, destination)
  if (!recovered) return null
  const writes: LocalAssetTransition<Asset>[] = recovered.copies.map((after) => ({
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
  return { writes, ...recovered }
}
