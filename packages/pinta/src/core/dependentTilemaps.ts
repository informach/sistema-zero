import {
  type PintaAsset,
  pintaAssetDependencyIds,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  type TilemapAsset,
} from './project'

type DependencyAsset = PintaAsset | RegionMapSetAsset | RegionTilemapAsset

/** Reverse dependency closure. Frozen provenance is deliberately excluded by the native contract. */
export function dependentTilemaps(changedId: string, assets: readonly PintaAsset[]): TilemapAsset[]
export function dependentTilemaps(
  changedId: string,
  assets: readonly DependencyAsset[],
): Array<TilemapAsset | RegionTilemapAsset>
export function dependentTilemaps(
  changedId: string,
  assets: readonly DependencyAsset[],
): Array<TilemapAsset | RegionTilemapAsset> {
  const consumers = new Map<string, Set<string>>()
  for (const asset of assets) {
    for (const dependency of pintaAssetDependencyIds(asset)) {
      let ids = consumers.get(dependency)
      if (!ids) {
        ids = new Set()
        consumers.set(dependency, ids)
      }
      ids.add(asset.id)
    }
  }
  const seen = new Set([changedId]),
    pending = [changedId]
  for (let cursor = 0; cursor < pending.length; cursor++) {
    for (const id of consumers.get(pending[cursor]!) ?? []) {
      if (seen.has(id)) continue
      seen.add(id)
      pending.push(id)
    }
  }
  return assets.filter(
    (a): a is TilemapAsset | RegionTilemapAsset =>
      a.kind === 'tilemap' && a.id !== changedId && seen.has(a.id),
  )
}
