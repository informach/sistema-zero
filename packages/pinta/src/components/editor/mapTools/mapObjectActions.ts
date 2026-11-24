/** As ações dos objetos da camada de objetos ativa (nada muda = nada é gravado). */

import type { PintaMemoryAsset } from '../../../core/assetMemory'
import { COPY } from '../../../core/copy'
import {
  effectiveLayer,
  PINTA_LIMITS,
  type TilemapObjectLayer,
  type TilemapObjectPropertyValue,
} from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import { type AuthorMap, isAuthorMap } from '../../../tiles/mapCellEdits'
import {
  addMapObject,
  createMapObject,
  type MapObjectPatch,
  nextObjectName,
  nextPropertyKey,
  objectLayerById,
  removeMapObject,
  snapObjectPoint,
  updateMapObject,
  withObjectProperty,
  withoutObjectProperty,
} from '../../../tiles/mapObjects'
import { commitIfChanged } from './commitGuard'

export function createMapObjectActions<Asset extends PintaMemoryAsset>(deps: {
  editor: PintaEditorStore<Asset>
  showToast: (message: string) => void
  activeObjectLayer: TilemapObjectLayer | null
  selectedObjectId: string | null
  selectedObjectIds: readonly string[]
  chooseObjects: (ids: string[]) => void
  setSelectedObjectId: (id: string | null) => void
}) {
  const { editor, showToast, activeObjectLayer } = deps

  /** Camada trancada: avisa e devolve `true`. */
  function locked(map: AuthorMap): boolean {
    if (!activeObjectLayer) return false
    const layer = objectLayerById(map, activeObjectLayer.id)
    if (!layer || !effectiveLayer(map, layer).locked) return false
    showToast(COPY.layers.lockedWarning)
    return true
  }

  function commitEdit(
    edit: (map: Asset & AuthorMap, objectLayerId: string) => Asset & AuthorMap,
  ): boolean {
    const state = editor.getState()
    if (!isAuthorMap(state.asset) || !activeObjectLayer) return false
    const accepted = commitIfChanged(state, edit(state.asset, activeObjectLayer.id))
    if (!accepted) locked(state.asset)
    return accepted
  }

  function update(id: string, patch: MapObjectPatch): void {
    commitEdit((map, objectLayerId) => updateMapObject(map, objectLayerId, id, patch))
  }

  /** Propriedades do objeto como estão AGORA no editor (não no último render). */
  function liveProperties(id: string): Record<string, TilemapObjectPropertyValue> | null {
    const current = editor.getState().asset
    if (!isAuthorMap(current) || !activeObjectLayer) return null
    const object = objectLayerById(current, activeObjectLayer.id)?.objects.find((o) => o.id === id)
    return object ? object.properties : null
  }

  function setProperty(
    id: string,
    key: string,
    value: TilemapObjectPropertyValue,
    previousKey?: string,
  ): void {
    const properties = liveProperties(id)
    if (!properties) return
    // Mudar ou renomear uma propriedade que já saiu (o rascunho gravado ao desmontar o campo
    // da linha apagada) não a traz de volta.
    if (previousKey !== undefined && !Object.hasOwn(properties, previousKey)) return
    const result = withObjectProperty(properties, key, value, previousKey)
    if (!result.ok) {
      showToast(
        result.reason === 'limit'
          ? COPY.tiles.propertyLimit
          : result.reason === 'duplicate-key'
            ? COPY.tiles.propertyDuplicateKey
            : COPY.tiles.propertyInvalidKey,
      )
      return
    }
    update(id, { properties: result.properties })
  }

  return {
    addMarker(position: { x: number; y: number }, tileSize: number, snap: boolean): void {
      const state = editor.getState()
      if (!isAuthorMap(state.asset) || !activeObjectLayer || locked(state.asset)) return
      const map = state.asset
      const layer = objectLayerById(map, activeObjectLayer.id)
      if (!layer) return
      const offset = effectiveLayer(map, layer)
      const coordinate = (value: number, shift: number, cells: number): number | null => {
        const minimum = Math.max(0, Math.ceil(-shift))
        const maximum = Math.min(PINTA_LIMITS.maxObjectCoord, Math.floor(cells * tileSize - shift))
        return maximum < minimum
          ? null
          : Math.max(minimum, Math.min(maximum, snapObjectPoint(value - shift, tileSize, snap)))
      }
      const x = coordinate(position.x, offset.offsetX, map.cols)
      const y = coordinate(position.y, offset.offsetY, map.rows)
      if (x === null || y === null) {
        showToast(COPY.scene.libraryUnavailable)
        return
      }
      const object = createMapObject({
        name: nextObjectName(layer),
        x,
        y,
      })
      const next = addMapObject<Asset & AuthorMap>(map, layer.id, object)
      if (next === map) {
        showToast(COPY.tiles.objectLimit)
        return
      }
      if (commitIfChanged(state, next)) deps.chooseObjects([object.id])
    },
    update,
    setProperty,
    remove(id: string): void {
      const accepted = commitEdit((map, objectLayerId) => removeMapObject(map, objectLayerId, id))
      if (accepted && id === deps.selectedObjectId) deps.setSelectedObjectId(null)
    },
    removeProperty(id: string, key: string): void {
      const properties = liveProperties(id)
      if (properties) update(id, { properties: withoutObjectProperty(properties, key) })
    },
    addProperty(id: string): void {
      const properties = liveProperties(id)
      if (properties) setProperty(id, nextPropertyKey(properties), '')
    },
    /** O Delete: apaga os objetos escolhidos. Devolve se a tecla foi usada. */
    deleteSelected(): boolean {
      if (!activeObjectLayer || !deps.selectedObjectId) return false
      const s = editor.getState()
      if (!isAuthorMap(s.asset)) return false
      if (locked(s.asset)) return true
      const removed = commitIfChanged(
        s,
        deps.selectedObjectIds.reduce(
          (m, id) => removeMapObject<Asset & AuthorMap>(m, activeObjectLayer.id, id),
          s.asset,
        ),
      )
      if (removed) deps.chooseObjects([])
      return true
    },
  }
}
