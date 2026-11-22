import { pintaHexCellTile } from '../creations/pinta-hex-cell'
import type { PintaMapProjection } from '../creations/pinta-map-projection'
import { createPintaProjectionGeometry } from '../creations/pinta-projection-geometry'
import { createHexRegionCellReader, createRegionCellReader } from '../creations/pinta-region-reader'
import type { PintaHexRegionCells, PintaRegionCells } from '../creations/pinta-regions'
import type { PintaProjectedScene } from './pinta-projected-scene'
import {
  type PintaProjectedCollisionView,
  type SceneBox,
  sceneIntersectsBox,
  sceneMoveBox,
  scenePlatformLanding,
} from './pinta-scene-geometry'
import { createSceneObjectIterator, sceneSpawn } from './pinta-scene-runtime'

/** Queries over an admitted Scene 5. Indexes belong to the snapshot and its caller. */
export function createProjectedSceneQueries(scene: PintaProjectedScene) {
  const readers = new WeakMap<
    PintaRegionCells | PintaHexRegionCells,
    ReturnType<typeof createRegionCellReader>
  >()
  const projections = new WeakMap<
    PintaMapProjection,
    ReturnType<typeof createPintaProjectionGeometry>
  >()
  function projectionGeometry(projection: PintaMapProjection) {
    const existing = projections.get(projection)
    if (existing) return existing
    const geometry = createPintaProjectionGeometry(projection)
    projections.set(projection, geometry)
    return geometry
  }
  const worldBounds = projectionGeometry(scene.projection).worldBounds({
    ...scene.origin,
    cols: scene.cols,
    rows: scene.rows,
  })
  const context: PintaProjectedCollisionView = {
    ...scene,
    worldBounds,
    projectionGeometry,
    regionCells(grid) {
      const existing = readers.get(grid)
      if (existing) return existing
      const reader =
        grid.kind === 'hex-regions' ? createHexRegionCellReader(grid) : createRegionCellReader(grid)
      readers.set(grid, reader)
      return reader
    },
    tileIndex: (cell, grid) =>
      grid.kind === 'hex-regions' ? pintaHexCellTile(cell) : cell < 0 ? -1 : cell & 4095,
  }
  return {
    context,
    iterateObjects: createSceneObjectIterator(scene),
    spawn: () => sceneSpawn(scene),
    intersectsBox: (box: SceneBox) => sceneIntersectsBox(context, box),
    moveBox: (box: SceneBox, dx: number, dy: number) => sceneMoveBox(context, box, dx, dy),
    platformLanding: (previous: SceneBox, desired: SceneBox, gravity = 1) =>
      scenePlatformLanding(context, previous, desired, gravity),
  }
}
