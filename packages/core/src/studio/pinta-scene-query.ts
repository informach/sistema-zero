/** In-memory queries only. These views are neither wire documents nor new player capabilities. */
import { createRegionCellReader } from '../creations/pinta-region-reader'
import type { PintaRegionCells } from '../creations/pinta-regions'
import type { PintaRegionScene } from './pinta-region-scene'
import type { PintaScene } from './pinta-scene'
import {
  type SceneBox,
  sceneIntersectsBox,
  sceneMoveBox,
  scenePlatformLanding,
} from './pinta-scene-geometry'
import {
  createSceneObjectIterator,
  moveSceneCharacter,
  sceneObjects,
  sceneSolidAt,
  sceneSpawn,
} from './pinta-scene-runtime'

export type PintaSceneDocument = PintaScene | PintaRegionScene
export type PintaRegionSceneQuery = PintaRegionScene & {
  regionCells: (grid: PintaRegionCells) => ReturnType<typeof createRegionCellReader>
}
/** Dense callers keep their old API; regional geometry requires an indexed runtime view. */
export type PintaSceneQuery = PintaScene | PintaRegionSceneQuery

/** One context per admitted immutable scene snapshot. No global document/cache retention.
 * Geometric methods do not select a game's physics mode: players must still honor `physics`.
 */
export function createRegionSceneQueries(scene: PintaRegionScene) {
  const readers = new WeakMap<PintaRegionCells, ReturnType<typeof createRegionCellReader>>()
  const context: PintaRegionSceneQuery = {
    ...scene,
    regionCells(grid) {
      let reader = readers.get(grid)
      if (!reader) {
        reader = createRegionCellReader(grid)
        readers.set(grid, reader)
      }
      return reader
    },
  }
  return {
    context,
    objects: () => sceneObjects(context),
    iterateObjects: createSceneObjectIterator(context),
    spawn: () => sceneSpawn(context),
    solidAt: (x: number, y: number) => sceneSolidAt(context, x, y),
    moveCharacter: (position: { x: number; y: number }, dx: number, dy: number, radius?: number) =>
      moveSceneCharacter(context, position, dx, dy, radius),
    intersectsBox: (box: SceneBox) => sceneIntersectsBox(context, box),
    moveBox: (box: SceneBox, dx: number, dy: number) => sceneMoveBox(context, box, dx, dy),
    platformLanding: (previous: SceneBox, desired: SceneBox, gravity = 1) =>
      scenePlatformLanding(context, previous, desired, gravity),
  }
}
