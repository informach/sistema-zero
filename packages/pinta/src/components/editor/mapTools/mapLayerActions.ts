/** As ações do painel de camadas do mapa: cada uma grava só quando muda alguma coisa. */
import { COPY } from '../../../core/copy'
import { type AnyTilesetAsset, isObjectLayer } from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import {
  addLayer,
  addObjectLayer,
  removeLayer,
  setLayerTileset,
  toggleLayerFront,
  toggleLayerVisible,
} from '../../../tiles/tilemapOps'
import { commitIfChanged } from './commitGuard'

export function createMapLayerActions(deps: {
  editor: PintaEditorStore
  showToast: (message: string) => void
  activeLayerId: string
  setActiveLayerId: (id: string | null) => void
  baseTileset: AnyTilesetAsset
  layerTilesetChoices: readonly AnyTilesetAsset[]
}) {
  const { editor, showToast, setActiveLayerId } = deps
  return {
    toggleFront(id: string): void {
      const state = editor.getState()
      if (state.asset.kind === 'tilemap') commitIfChanged(state, toggleLayerFront(state.asset, id))
    },
    toggleVisible(id: string): void {
      const state = editor.getState()
      if (state.asset.kind === 'tilemap')
        commitIfChanged(state, toggleLayerVisible(state.asset, id))
    },
    remove(id: string): void {
      const state = editor.getState()
      if (state.asset.kind !== 'tilemap') return
      const next = removeLayer(state.asset, id)
      if (next === state.asset) {
        // O único "não" possível com mais de uma camada: era a última de PEÇAS.
        if (state.asset.layers.length > 1) showToast(COPY.tiles.lastTileLayer)
        return
      }
      if (!state.commit(next)) return
      if (id === deps.activeLayerId) setActiveLayerId(next.layers[0]?.id ?? null)
    },
    add(): void {
      const state = editor.getState()
      if (state.asset.kind !== 'tilemap') return
      const next = addLayer(
        state.asset,
        `${COPY.tiles.layerNamePrefix} ${state.asset.layers.length + 1}`,
      )
      if (next === state.asset) {
        showToast(COPY.tiles.layerLimit)
        return
      }
      state.commit(next)
      if (editor.getState().asset === state.asset) return
      setActiveLayerId(next.layers[next.layers.length - 1]?.id ?? null)
    },
    addObjects(): void {
      const state = editor.getState()
      if (state.asset.kind !== 'tilemap') return
      const count = state.asset.layers.filter(isObjectLayer).length
      const next = addObjectLayer(
        state.asset,
        count === 0
          ? COPY.tiles.objectLayerNamePrefix
          : `${COPY.tiles.objectLayerNamePrefix} ${count + 1}`,
      )
      if (next === state.asset) {
        showToast(COPY.tiles.layerLimit)
        return
      }
      state.commit(next)
      if (editor.getState().asset === state.asset) return
      setActiveLayerId(next.layers[next.layers.length - 1]?.id ?? null)
    },
    setTileset(id: string, tilesetId: string): void {
      const state = editor.getState()
      const chosen = deps.layerTilesetChoices.find((choice) => choice.id === tilesetId)
      if (state.asset.kind !== 'tilemap' || !chosen) return
      const next = setLayerTileset(state.asset, id, chosen, deps.baseTileset)
      if (next !== state.asset) state.commit(next)
    },
  }
}
