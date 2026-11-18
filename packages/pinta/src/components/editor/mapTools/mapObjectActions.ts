/** As ações dos objetos da camada de objetos ativa (nada muda = nada é gravado). */
import { COPY } from '../../../core/copy'
import {
  effectiveLayer,
  type TilemapAsset,
  type TilemapObjectLayer,
  type TilemapObjectPropertyValue,
} from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import {
  type MapObjectPatch,
  nextPropertyKey,
  objectLayerById,
  removeMapObject,
  updateMapObject,
  withObjectProperty,
  withoutObjectProperty,
} from '../../../tiles/mapObjects'
import { commitIfChanged } from './commitGuard'

export function createMapObjectActions(deps: {
  editor: PintaEditorStore
  showToast: (message: string) => void
  activeObjectLayer: TilemapObjectLayer | null
  selectedObjectId: string | null
  selectedObjectIds: readonly string[]
  chooseObjects: (ids: string[]) => void
  setSelectedObjectId: (id: string | null) => void
}) {
  const { editor, showToast, activeObjectLayer } = deps

  /** Camada trancada: avisa e devolve `true`. */
  function locked(map: TilemapAsset): boolean {
    if (!activeObjectLayer) return false
    const layer = objectLayerById(map, activeObjectLayer.id)
    if (!layer || !effectiveLayer(map, layer).locked) return false
    showToast(COPY.layers.lockedWarning)
    return true
  }

  function commitEdit(edit: (map: TilemapAsset, objectLayerId: string) => TilemapAsset): void {
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap' || !activeObjectLayer) return
    if (!commitIfChanged(state, edit(state.asset, activeObjectLayer.id))) locked(state.asset)
  }

  function update(id: string, patch: MapObjectPatch): void {
    commitEdit((map, objectLayerId) => updateMapObject(map, objectLayerId, id, patch))
  }

  /** Propriedades do objeto como estão AGORA no editor (não no último render). */
  function liveProperties(id: string): Record<string, TilemapObjectPropertyValue> | null {
    const current = editor.getState().asset
    if (current.kind !== 'tilemap' || !activeObjectLayer) return null
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
    update,
    setProperty,
    remove(id: string): void {
      commitEdit((map, objectLayerId) => removeMapObject(map, objectLayerId, id))
      if (id === deps.selectedObjectId) deps.setSelectedObjectId(null)
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
      if (s.asset.kind !== 'tilemap') return false
      if (locked(s.asset)) return true
      const removed = commitIfChanged(
        s,
        deps.selectedObjectIds.reduce(
          (m, id) => removeMapObject(m, activeObjectLayer.id, id),
          s.asset,
        ),
      )
      deps.chooseObjects([])
      return removed
    },
  }
}
