export type ScenePass = 'back' | 'front'
export type SceneSpace = 'screen' | 'world' | 'parallax'
/** Which way a layer tiles: a strip of hills repeats sideways without stacking. */
export type SceneRepeat = 'none' | 'x' | 'y' | 'both'
export type TrackProperty = 'distance' | 'previous' | 'x'
export type ProjectionProperty = 'x' | 'y' | 'scale' | 'visible'

/**
 * Shared public vocabulary: distances are world units; horizon is a percentage.
 * Keep this module free of browser types (they live in `host.ts`): server packages
 * reach it through the block catalog and compile without the DOM lib.
 */
export interface SceneTwoDApi {
  createSceneLayer(name: string, image: string, pass: ScenePass): void
  transformSceneLayer(name: string, x: number, y: number, scale: number, opacity: number): void
  motionSceneLayer(
    name: string,
    space: SceneSpace,
    fx: number,
    fy: number,
    repeat: SceneRepeat,
  ): void
  orderSceneLayer(name: string, order: number): void
  showSceneLayer(name: string, visible: boolean): void
  removeSceneLayer(name: string): void
  drawSceneLayers(pass: ScenePass): void
  createTrack(name: string, horizon: number, focal: number, height: number, follow: number): void
  viewTrack(name: string, near: number, far: number): void
  cameraTrack(name: string, x: number, z: number): void
  advanceTrack(name: string, distance: number): void
  placeTrackObject(
    name: string,
    id: string,
    image: string,
    x: number,
    z: number,
    w: number,
    h: number,
  ): void
  moveTrackObject(name: string, id: string, x: number, z: number): void
  removeTrackObject(name: string, id: string): void
  drawTrack(name: string): void
  trackValue(name: string, property: TrackProperty): number
  projectTrack(name: string, x: number, z: number, property: ProjectionProperty): number
  trackPassed(name: string, id: string): boolean
  trackTouching(name: string, id: string, x: number, width: number): boolean
}

export const SCENE_API_KEYS = [
  'createSceneLayer',
  'transformSceneLayer',
  'motionSceneLayer',
  'orderSceneLayer',
  'showSceneLayer',
  'removeSceneLayer',
  'drawSceneLayers',
  'createTrack',
  'viewTrack',
  'cameraTrack',
  'advanceTrack',
  'placeTrackObject',
  'moveTrackObject',
  'removeTrackObject',
  'drawTrack',
  'trackValue',
  'projectTrack',
  'trackPassed',
  'trackTouching',
] as const satisfies readonly (keyof SceneTwoDApi)[]
