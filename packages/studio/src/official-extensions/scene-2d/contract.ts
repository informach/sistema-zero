export type ScenePass = 'back' | 'front'
export type SceneSpace = 'screen' | 'world' | 'parallax'
/** Which way a layer tiles: a strip of hills repeats sideways without stacking. */
export type SceneRepeat = 'none' | 'x' | 'y' | 'both'
export type ProjectionProperty = 'x' | 'y' | 'scale' | 'visible'

/**
 * Private projection and compositing primitives; never exported by the game API.
 * Distances: distances are world units; horizon is a percentage.
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
  drawSceneLayers(pass: ScenePass): void
  createTrack(name: string, horizon: number, focal: number, height: number, follow: number): void
  viewTrack(name: string, near: number, far: number): void
  cameraTrack(name: string, x: number, z: number): void
  advanceTrack(name: string, distance: number): void
  projectTrack(name: string, x: number, z: number, property: ProjectionProperty): number
}
