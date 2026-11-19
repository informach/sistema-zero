import { COPY } from './copy'
import {
  isObjectLayer,
  PINTA_DEPENDENCY_ASSET_LIMIT,
  type PintaAsset,
  pintaAssetDependencyIds,
  type TilemapAsset,
} from './project'

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

/** Complete authored world, including hidden doors and doors inside linked sets. No raster or UI. */
export function sceneMapClosure(
  root: TilemapAsset,
  assets: readonly PintaAsset[],
): { maps: TilemapAsset[]; assets: PintaAsset[] } {
  const byId = new Map(assets.map((a) => [a.id, a]))
  byId.set(root.id, root)
  const found = new Map<string, PintaAsset>([[root.id, root]])
  const pending: PintaAsset[] = [root],
    maps: TilemapAsset[] = []
  const add = (asset: PintaAsset): void => {
    if (found.has(asset.id)) return
    if (found.size >= PINTA_DEPENDENCY_ASSET_LIMIT)
      throw new SceneMapClosureError('too-many-resources')
    found.set(asset.id, asset)
    pending.push(asset)
  }
  for (let cursor = 0; cursor < pending.length; cursor++) {
    const asset = pending[cursor]!
    if (asset.kind === 'tilemap') {
      maps.push(asset)
      if (maps.length > 16) throw new SceneMapClosureError('too-many-maps')
    }
    for (const id of pintaAssetDependencyIds(asset)) {
      const dependency = byId.get(id)
      if (!dependency) throw new SceneMapClosureError('missing-resource')
      add(dependency)
    }
    const map = asset.kind === 'tilemap' ? asset : asset.kind === 'map-set' ? asset.map : null
    if (!map) continue
    for (const layer of map.layers) {
      if (!isObjectLayer(layer)) continue
      for (const object of layer.objects) {
        if (object.role !== 'door') continue
        const unwrap = (value: unknown): unknown =>
          value && typeof value === 'object' && 'value' in value ? value.value : value
        const destination =
          unwrap(object.properties.destino) || unwrap(object.properties.destination)
        if (!destination) continue // An unconfigured door remains editable data.
        if (typeof destination !== 'string') throw new SceneMapClosureError('missing-map')
        const exact = byId.get(destination)
        if (exact) {
          if (exact.kind !== 'tilemap') throw new SceneMapClosureError('missing-map')
          add(exact)
          continue
        }
        const candidates = [...byId.values()].filter(
          (a) => a.kind === 'tilemap' && a.name === destination,
        )
        if (candidates.length > 1) throw new SceneMapClosureError('ambiguous-map')
        const target = candidates[0]
        if (!target) throw new SceneMapClosureError('missing-map')
        add(target)
      }
    }
  }
  return { maps, assets: [...found.values()] }
}
