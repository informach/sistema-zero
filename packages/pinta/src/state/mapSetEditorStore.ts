import { createStore } from 'zustand/vanilla'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { COPY } from '../core/copy'
import type { PintaAsset } from '../core/project'
import type { PintaEditorState, PintaEditorStore } from './editorStore'

/** A view of the outer editor, sharing its history and persistence authority. */
export function createMapSetEditorStore(outer: PintaEditorStore) {
  return createMapSetLens<PintaAsset>(
    outer,
    (asset) => (asset.kind === 'map-set' ? asset.map : null),
    (set, map) => {
      if (set.kind !== 'map-set' || map.kind !== 'tilemap') throw Error(COPY.scene.conjuntoInvalido)
      return { ...set, map }
    },
  )
}
export function createRegionalMapSetEditorStore(outer: PintaEditorStore<PintaMemoryAsset>) {
  return createMapSetLens<PintaMemoryAsset>(
    outer,
    (asset) => (asset.kind === 'map-set' ? asset.map : null),
    (set, map) => {
      if (set.kind !== 'map-set' || map.kind !== 'tilemap') throw Error(COPY.scene.conjuntoInvalido)
      if ('origin' in set.map && 'origin' in map && map.schema === 8)
        return { ...set, schema: 8, map }
      if (!('origin' in set.map) && !('origin' in map)) return { ...set, map }
      throw Error(COPY.scene.conjuntoInvalido)
    },
  )
}
function createMapSetLens<Asset extends PintaMemoryAsset>(
  outer: PintaEditorStore<Asset>,
  innerMap: (asset: Asset) => Asset | null,
  replaceMap: (set: Asset, map: Asset) => Asset,
) {
  const outerOf = new WeakMap<Asset, Asset>(),
    innerOf = new WeakMap<Asset, Asset>()
  const unwrap = (asset: Asset): Asset => {
    const source = innerMap(asset)
    if (!source) return asset
    let map = innerOf.get(asset)
    if (!map) {
      map = { ...source }
      innerOf.set(asset, map)
      outerOf.set(map, asset)
    }
    return map
  }
  const wrap = (asset: Asset): Asset => {
    const current = outer.getState().asset
    return (
      outerOf.get(asset) ?? (innerMap(current) === asset ? current : replaceMap(current, asset))
    )
  }
  const changed = (asset: Asset): Asset | null => {
    const current = outer.getState().asset
    return innerMap(current) === asset || outerOf.get(asset) === current
      ? null
      : replaceMap(current, asset)
  }
  const read = (): PintaEditorState<Asset> => {
    const state = outer.getState()
    return {
      ...state,
      asset: unwrap(state.asset),
      savedAsset: unwrap(state.savedAsset),
      commit: (asset) => {
        const next = changed(asset)
        return next ? outer.getState().commit(next) : false
      },
      replace: (asset) => {
        const next = changed(asset)
        if (next) outer.getState().replace(next)
      },
      replaceIfCurrent: (expected, asset) => {
        const source = outerOf.get(expected),
          current = outer.getState()
        if (!source || source !== current.asset) return null
        if (expected === asset) return expected
        const written = current.replaceIfCurrent(source, wrap(asset))
        return written ? unwrap(written) : null
      },
      commitGesture: (asset) => outer.getState().commitGesture(wrap(asset)),
      commitLinked: (asset, linked, indices) =>
        outer.getState().commitLinked(wrap(asset), linked, indices),
    }
  }
  return { store: createStore<PintaEditorState<Asset>>(() => read()), read }
}
