import { PINTA_SCENE_PLAYER_METHODS } from '@sistemazero/core/studio/pinta-limits'
import type { PintaSceneObject } from '@sistemazero/core/studio/pinta-scene'
export interface MapTwoDApi {
  createMapScene(name: string, image: string): void
  drawMapScene(name: string, pass: 'back' | 'front'): void
  collideMapScene(sprite: unknown, name: string): void
  mapObjects(name: string, type: string): PintaSceneObject[]
  mapObjectNamed(name: string, objectName: string): PintaSceneObject | null
  mapObjectProperty(object: unknown, key: string): unknown
  mapObjectField(object: unknown, key: string): unknown
  mapInArea(sprite: unknown, object: unknown): boolean
  mapArea(
    name: string,
    sprite: unknown,
    type: string,
    callback: (object: PintaSceneObject) => void,
  ): void
  useMapDoor(name: string, sprite: unknown, object: unknown): void
  mapSpawn(name: string, axis: 'x' | 'y'): number
  mapSize(name: string, axis: 'width' | 'height'): number
}
/** A lista mora no core, junto do detector que decide o motor e os metadados do documento. */
export const MAP_TWO_D_API_KEYS = PINTA_SCENE_PLAYER_METHODS satisfies readonly (keyof MapTwoDApi)[]
