import type { PintaProjectedScene } from '@sistemazero/core/studio/pinta-projected-scene'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import { isProjectedTileLayer, type WorkshopProjectedMap } from '../core/projectedDocument'

function sameFields(a: object, b: object, ignored: ReadonlySet<string>) {
  const left = Object.keys(a).filter((key) => !ignored.has(key))
  const right = Object.keys(b).filter((key) => !ignored.has(key))
  return (
    left.length === right.length &&
    left.every((key) => Object.hasOwn(b, key) && Reflect.get(a, key) === Reflect.get(b, key))
  )
}
const mutableMapFields = new Set([
  'layers',
  'origin',
  'cols',
  'rows',
  'updatedAt',
  'name',
  'automapping',
])
const mutableLayerFields = new Set(['cells'])

/** Only canonical cell edits/bounds/book changes can reuse prepared resources. Changes to
 * layer metadata, captured resources or any external dependency require full admission. */
export function sameProjectedSceneResources(
  before: WorkshopProjectedMap,
  after: WorkshopProjectedMap,
  beforeCatalog: readonly PintaWorkshopAsset[],
  afterCatalog: readonly PintaWorkshopAsset[],
) {
  if (
    !sameFields(before, after, mutableMapFields) ||
    before.layers.length !== after.layers.length ||
    !before.layers.every((layer, index) =>
      sameFields(layer, after.layers[index]!, mutableLayerFields),
    )
  )
    return false
  if (beforeCatalog === afterCatalog) return true
  const previous = new Map(
    beforeCatalog.filter((asset) => asset.id !== before.id).map((asset) => [asset.id, asset]),
  )
  const next = afterCatalog.filter((asset) => asset.id !== after.id)
  return previous.size === next.length && next.every((asset) => previous.get(asset.id) === asset)
}

/** The editor has already admitted these cells through its atomic writer. Keep its live
 * buffers; serializing and decoding the whole world per pointer movement would duplicate
 * memory and repeatedly prepare identical images. Portable exports still use full admission. */
export function projectedEditorScene(
  scene: PintaProjectedScene,
  map: WorkshopProjectedMap,
): PintaProjectedScene {
  return {
    ...scene,
    name: map.name,
    origin: map.origin,
    cols: map.cols,
    rows: map.rows,
    layers: scene.layers.map((layer, index) => {
      const authored = map.layers[index]
      if (layer.kind !== 'tiles') return layer
      if (!authored || !isProjectedTileLayer(authored) || authored.id !== layer.id)
        throw new Error('As camadas do cenário mudaram durante a preparação.')
      return { ...layer, cells: authored.cells }
    }),
  }
}
