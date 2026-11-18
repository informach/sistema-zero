import { type JSX, useEffect, useMemo } from 'react'
import { createStore } from 'zustand/vanilla'
import { COPY } from '../../core/copy'
import type { PintaAsset } from '../../core/project'
import type { PintaEditorState } from '../../state/editorStore'
import { PintaEditorProvider, useEditorStores } from './editorContext'
import { TilemapEditor } from './TilemapEditor'

/** A edição usa o editor de mapa e o histórico do desenho externo, sem outra cópia/salvamento. */
export function MapSetEditor(): JSX.Element {
  const outer = useEditorStores()
  const inner = useMemo(() => {
    // De qual conjunto saiu cada mapa mostrado ao editor de dentro. Com isso, o mapa que não
    // mudou volta a ser o MESMO conjunto, e o editor de fora percebe que nada mudou.
    const outerOf = new WeakMap<PintaAsset, PintaAsset>()
    const wrap = (asset: PintaAsset): PintaAsset => {
      const current = outer.editor.getState().asset
      if (current.kind !== 'map-set' || asset.kind !== 'tilemap')
        throw new Error(COPY.scene.conjuntoInvalido)
      if (current.map === asset) return current
      return outerOf.get(asset) ?? { ...current, map: asset }
    }
    const changed = (asset: PintaAsset): PintaAsset | null => {
      const current = outer.editor.getState().asset
      if (current.kind !== 'map-set' || asset.kind !== 'tilemap')
        throw new Error(COPY.scene.conjuntoInvalido)
      return current.map === asset ? null : { ...current, map: asset }
    }
    const read = (): PintaEditorState => {
      const state = outer.editor.getState()
      if (state.asset.kind === 'map-set') outerOf.set(state.asset.map, state.asset)
      return {
        ...state,
        asset: state.asset.kind === 'map-set' ? state.asset.map : state.asset,
        savedAsset: state.savedAsset.kind === 'map-set' ? state.savedAsset.map : state.savedAsset,
        commit: (a) => {
          const next = changed(a)
          if (next) outer.editor.getState().commit(next)
        },
        replace: (a) => {
          const next = changed(a)
          if (next) outer.editor.getState().replace(next)
        },
        commitGesture: (a) => outer.editor.getState().commitGesture(wrap(a)),
        commitLinked: (a, linked) => outer.editor.getState().commitLinked(wrap(a), linked),
      }
    }
    return { store: createStore<PintaEditorState>(() => read()), read }
  }, [outer.editor])
  useEffect(
    () => outer.editor.subscribe(() => inner.store.setState(inner.read(), true)),
    [outer.editor, inner],
  )
  return (
    <PintaEditorProvider value={{ ...outer, editor: inner.store }}>
      <TilemapEditor setEditor />
    </PintaEditorProvider>
  )
}
