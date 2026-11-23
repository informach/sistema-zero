import { PINTA_REGION_LIMITS, type PintaRegionCells } from '@sistemazero/core/creations'
import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import type { PintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import { PINTA_SCENE_LIMITS, type PintaSceneCellsLayer } from '@sistemazero/core/studio/pinta-scene'

export const GODOT_REGION_SET_DEFINITIONS = 64
export const GODOT_REGION_WORK = {
  cells: PINTA_IMAGE_WORLD_LIMITS.cells,
  // The existing map/set inventory bounds the number of materialized layer nodes.
  layers: PINTA_REGION_LIMITS.maxLayers * (1 + GODOT_REGION_SET_DEFINITIONS),
  objects: PINTA_SCENE_LIMITS.layers * PINTA_SCENE_LIMITS.objects,
}

function work(layers: readonly PintaSceneCellsLayer<PintaRegionCells>[]) {
  let cells = 0
  let objects = 0
  for (const layer of layers) {
    if (layer.kind === 'objects') objects += layer.objects.length
    if (layer.kind === 'tiles')
      for (const chunk of layer.cells.chunks) for (const cell of chunk.cells) if (cell >= 0) cells++
  }
  return { cells, objects, layers: layers.length }
}

/** Scene4 sets cannot nest. Count each definition once and charge its fan-out
 * before constructing a TileMapLayer or projecting the companion Tiled file.
 */
export function assertGodotRegionWork(scene: PintaRegionScene): void {
  const definitions = new Map(scene.sets?.map((set) => [set.id, work(set.layers)]))
  const instances = new Map<string, number>()
  for (const layer of scene.layers)
    if (layer.kind === 'objects')
      for (const { setId } of layer.objects)
        if (setId) instances.set(setId, (instances.get(setId) ?? 0) + 1)
  const total = work(scene.layers)
  for (const [id, count] of instances) {
    const usage = definitions.get(id)
    if (!usage) throw new Error('Falta um conjunto no mapa para o Godot.')
    total.cells += usage.cells * count
    total.layers += usage.layers * count
    total.objects += usage.objects * count
  }
  if (
    total.cells > GODOT_REGION_WORK.cells ||
    total.layers > GODOT_REGION_WORK.layers ||
    total.objects > GODOT_REGION_WORK.objects
  )
    throw new Error('As cópias dos conjuntos ocupam espaço demais no Godot. Exporte mapas menores.')
}
