import type { PintaMemoryAsset } from './assetMemory'
import { COPY } from './copy'
import { type PintaResourceObservation, pintaResourceObservation } from './localAssetOrigin'
import { isObjectLayer, PINTA_DEPENDENCY_ASSET_LIMIT, pintaAssetDependencyIds } from './project'

export class SceneMapClosureError extends Error {
  constructor(
    readonly code:
      | 'missing-map'
      | 'ambiguous-map'
      | 'missing-resource'
      | 'too-many-maps'
      | 'too-many-resources',
  ) {
    super(
      code === 'missing-map'
        ? COPY.scene.linkedMapMissing
        : code === 'ambiguous-map'
          ? COPY.scene.linkedMapAmbiguous
          : code === 'missing-resource'
            ? COPY.scene.linkedResourceMissing
            : code === 'too-many-maps'
              ? COPY.scene.esteJogoPassouDe16MapasLigados
              : COPY.scene.linkedResourceLimit,
    )
    this.name = 'SceneMapClosureError'
  }
}

function* rawDoorSelectors(asset: PintaMemoryAsset): IterableIterator<unknown> {
  const map = asset.kind === 'tilemap' ? asset : asset.kind === 'map-set' ? asset.map : null
  if (!map) return
  const unwrap = (value: unknown): unknown =>
    value && typeof value === 'object' && 'value' in value ? value.value : value
  for (const layer of map.layers) {
    if (!isObjectLayer(layer)) continue
    for (const object of layer.objects) {
      if (object.role !== 'door') continue
      const destination = unwrap(object.properties.destino) || unwrap(object.properties.destination)
      if (!destination) continue // An unconfigured door remains editable data.
      yield destination
    }
  }
}

/** The authored selector needs the complete current catalog for ID-first resolution. */
export function* pintaDoorSelectors(asset: PintaMemoryAsset): IterableIterator<string> {
  for (const destination of rawDoorSelectors(asset)) {
    if (typeof destination !== 'string') throw new SceneMapClosureError('missing-map')
    yield destination
  }
}

function doorBinding(destination: string, byId: ReadonlyMap<string, PintaMemoryAsset>) {
  const exact = byId.get(destination)
  if (exact)
    return exact.kind === 'tilemap'
      ? { type: 'target' as const, id: exact.id }
      : { type: 'wrong-kind' as const, kind: exact.kind }
  const matches = [...byId.values()]
    .filter((asset) => asset.kind === 'tilemap' && asset.name === destination)
    .map((asset) => asset.id)
  if (matches.length > 1) return { type: 'ambiguous' as const, ids: matches.sort() }
  const id = matches[0]
  return id ? { type: 'target' as const, id } : { type: 'missing' as const }
}

/** A catalog update must preserve each selector's resolution, even in a partly configured map. */
export function pintaDoorBindings(
  asset: PintaMemoryAsset,
  byId: ReadonlyMap<string, PintaMemoryAsset>,
) {
  return [...rawDoorSelectors(asset)].map((selector) => ({
    selector,
    binding:
      typeof selector === 'string' ? doorBinding(selector, byId) : { type: 'invalid' as const },
  }))
}

/** Door references share the same rules in playable worlds and editable files. */
export function pintaDoorDependencyIds(
  asset: PintaMemoryAsset,
  byId: ReadonlyMap<string, PintaMemoryAsset>,
): string[] {
  const ids = new Set<string>()
  for (const destination of pintaDoorSelectors(asset)) {
    const binding = doorBinding(destination, byId)
    if (binding.type === 'ambiguous') throw new SceneMapClosureError('ambiguous-map')
    if (binding.type !== 'target') throw new SceneMapClosureError('missing-map')
    ids.add(binding.id)
  }
  return [...ids]
}

/** Observe the revisions on screen before an authored reference is saved. */
export function observePintaReferences<Asset extends PintaMemoryAsset>(
  asset: Asset,
  catalog: readonly Asset[],
): PintaResourceObservation[] {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  byId.set(asset.id, asset)
  const references = new Set(pintaAssetDependencyIds(asset))
  for (const { binding } of pintaDoorBindings(asset, byId))
    if (binding.type === 'target') references.add(binding.id)
  references.delete(asset.id)
  return [...references].map((id) => {
    const target = byId.get(id)
    return (target && pintaResourceObservation(target)) || { id, localRevision: null }
  })
}

/** Complete authored world, including hidden doors and doors inside linked sets. No raster or UI. */
export function sceneMapClosure<Asset extends PintaMemoryAsset>(
  root: Asset,
  assets: readonly Asset[],
): { maps: Extract<Asset, { kind: 'tilemap' }>[]; assets: Asset[] } {
  const byId = new Map(assets.map((a) => [a.id, a]))
  byId.set(root.id, root)
  const found = new Map<string, Asset>([[root.id, root]])
  const pending: Asset[] = [root],
    maps: Extract<Asset, { kind: 'tilemap' }>[] = []
  const isMap = (asset: Asset): asset is Extract<Asset, { kind: 'tilemap' }> =>
    asset.kind === 'tilemap'
  const add = (asset: Asset): void => {
    if (found.has(asset.id)) return
    if (found.size >= PINTA_DEPENDENCY_ASSET_LIMIT)
      throw new SceneMapClosureError('too-many-resources')
    found.set(asset.id, asset)
    pending.push(asset)
  }
  for (let cursor = 0; cursor < pending.length; cursor++) {
    const asset = pending[cursor]!
    if (isMap(asset)) {
      maps.push(asset)
      if (maps.length > 16) throw new SceneMapClosureError('too-many-maps')
    }
    for (const id of pintaAssetDependencyIds(asset)) {
      const dependency = byId.get(id)
      if (!dependency) throw new SceneMapClosureError('missing-resource')
      add(dependency)
    }
    for (const id of pintaDoorDependencyIds(asset, byId)) add(byId.get(id)!)
  }
  return { maps, assets: [...found.values()] }
}
