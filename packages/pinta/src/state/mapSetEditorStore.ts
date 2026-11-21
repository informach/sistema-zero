import { createStore } from 'zustand/vanilla'
import { COPY } from '../core/copy'
import type { PintaAsset } from '../core/project'
import type { PintaEditorState, PintaEditorStore } from './editorStore'

/** A view of the outer editor, sharing its history and persistence authority. */
export function createMapSetEditorStore(outer: PintaEditorStore) {
  const outerOf = new WeakMap<PintaAsset, PintaAsset>(),
    innerOf = new WeakMap<PintaAsset, PintaAsset>()
  const unwrap = (asset: PintaAsset): PintaAsset => {
    if (asset.kind !== 'map-set') return asset
    let map = innerOf.get(asset)
    if (!map) {
      // Every outer revision has its own view identity, even if only its name
      // changed and it deliberately reused the same map value.
      map = { ...asset.map }
      innerOf.set(asset, map)
      outerOf.set(map, asset)
    }
    return map
  }
  const wrap = (asset: PintaAsset): PintaAsset => {
    const current = outer.getState().asset
    if (current.kind !== 'map-set' || asset.kind !== 'tilemap')
      throw new Error(COPY.scene.conjuntoInvalido)
    return outerOf.get(asset) ?? (current.map === asset ? current : { ...current, map: asset })
  }
  const changed = (asset: PintaAsset): PintaAsset | null => {
    const current = outer.getState().asset
    if (current.kind !== 'map-set' || asset.kind !== 'tilemap')
      throw new Error(COPY.scene.conjuntoInvalido)
    return current.map === asset || outerOf.get(asset) === current
      ? null
      : { ...current, map: asset }
  }
  const read = (): PintaEditorState => {
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
      commitLinked: (asset, linked) => outer.getState().commitLinked(wrap(asset), linked),
    }
  }
  return { store: createStore<PintaEditorState>(() => read()), read }
}
