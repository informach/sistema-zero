/** Common geometry only; the owning engine keeps animation, appearance and health. */
export interface SceneSprite {
  x: number
  y: number
  w: number
  h: number
}

export type SceneBackdropPlane = 'far' | 'back' | 'front'
export type SceneBackdropFit = 'cover' | 'contain' | 'repeat'
export type TrackSpritePattern = 'line' | 'alternate' | 'weave' | 'steps-left' | 'steps-right'
export type TrackCameraView = 'near' | 'wide' | 'high'
export interface SpriteSceneApi {
  addSceneBackdrop(name: string, image: string, plane: SceneBackdropPlane): void
  sceneBackdropMotion(name: string, percent: number): void
  sceneBackdropFit(name: string, fit: SceneBackdropFit): void
  createSpriteTrack(name: string): void
  trackPlayer(name: string, sprite: SceneSprite, lives: number): void
  trackControls(name: string, speed: number, limit: number): void
  trackTravel(name: string, speed: number, finish: number): void
  putTrackSprite(name: string, sprite: SceneSprite, x: number, distance: number): void
  putTrackSpriteAt(
    name: string,
    sprite: SceneSprite,
    side: 'left' | 'center' | 'right',
    distance: number,
  ): void
  repeatTrackSprite(
    name: string,
    sprite: SceneSprite,
    count: number,
    spacing: number,
    pattern: TrackSpritePattern,
  ): void
  trackSpriteVelocity(sprite: SceneSprite, lateral: number, distance: number): void
  trackCameraView(name: string, view: TrackCameraView): void
  onTrackEncounter(name: string, sprite: SceneSprite, fn: () => void): void
  onTrackFinish(name: string, fn: () => void): void
  collectTrackItem(): void
  trackScore(name: string, amount: number): void
  trackHurt(name: string, amount: number): void
  trackHud(name: string, label: string, total: number): void
  sceneGameScreens(title: string, instructions: string): void
  sceneAnimation(sprite: SceneSprite, image: string, animation: string, once: boolean): void
  sceneResult(result: 'won' | 'lost'): void
  spriteTrackValue(name: string, property: 'score' | 'distance' | 'lateral' | 'lives'): number
  trackFollow(name: string, sprite: SceneSprite): void
  trackSpeed(name: string, speed: number): void
  trackFinishLine(name: string, distance: number): void
  trackInput(name: string, mode: 'arrows' | 'pointer' | 'both' | 'off', speed: number): void
  trackLimit(name: string, left: number, right: number): void
  trackPosition(name: string, property: 'distance' | 'lateral'): number
  onTrackSpriteEncounter<T extends SceneSprite>(
    name: string,
    sprite: T,
    fn: (encountered: T) => void,
  ): void
  forEachTrackSprite<T extends SceneSprite>(sprite: T, fn: (copy: T) => void): void
  onTrackMoldEncounter(name: string, mold: string, fn: (encountered: SceneSprite) => void): void
}

export const COMMON_SPRITE_SCENE_API_KEYS = [
  'addSceneBackdrop',
  'sceneBackdropMotion',
  'sceneBackdropFit',
  'createSpriteTrack',
  'putTrackSprite',
  'repeatTrackSprite',
  'trackSpriteVelocity',
  'trackCameraView',
  'onTrackFinish',
  'collectTrackItem',
  'sceneAnimation',
] as const satisfies readonly (keyof SpriteSceneApi)[]

export const BASIC_SPRITE_SCENE_API_KEYS = [
  ...COMMON_SPRITE_SCENE_API_KEYS,
  'trackPlayer',
  'putTrackSpriteAt',
  'trackControls',
  'trackTravel',
  'onTrackEncounter',
  'trackScore',
  'trackHurt',
  'trackHud',
  'sceneGameScreens',
  'sceneResult',
  'spriteTrackValue',
] as const satisfies readonly (keyof SpriteSceneApi)[]

export const ADVANCED_SPRITE_SCENE_API_KEYS = [
  ...COMMON_SPRITE_SCENE_API_KEYS,
  'trackFollow',
  'trackSpeed',
  'trackFinishLine',
  'trackInput',
  'trackLimit',
  'trackPosition',
  'onTrackSpriteEncounter',
  'onTrackMoldEncounter',
  'forEachTrackSprite',
] as const satisfies readonly (keyof SpriteSceneApi)[]

export type BasicSpriteSceneApi = Pick<SpriteSceneApi, (typeof BASIC_SPRITE_SCENE_API_KEYS)[number]>
export type AdvancedSpriteSceneApi = Pick<
  SpriteSceneApi,
  (typeof ADVANCED_SPRITE_SCENE_API_KEYS)[number]
>

export interface SpriteSceneBounds {
  x: number
  y: number
  w: number
  h: number
}
export interface SpriteSceneController extends SpriteSceneApi {
  hasScreens(): boolean
  simulationBlocked(): boolean
  epoch(): number
  active(): boolean
  owns(sprite: SceneSprite): boolean
  retains(sprite: SceneSprite): boolean
  release(sprite: SceneSprite): void
  bounds(sprite: SceneSprite): SpriteSceneBounds | null
  offscreen(sprite: SceneSprite, margin: number): boolean
  decorate(sprite: SceneSprite, draw: (bounds: SpriteSceneBounds) => void): boolean
  step(dt: number): void
  draw(pass: 'back' | 'world' | 'front' | 'hud'): void
  reset(): void
  input(action: 'start' | 'pause' | 'restart'): void
}
