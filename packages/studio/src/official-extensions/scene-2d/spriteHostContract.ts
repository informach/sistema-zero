import type { SceneSprite, SpriteSceneBounds } from './spriteContract'

/** Engine adapter. Browser-only members stay outside the public catalog contract. */
export interface SpriteSceneHost<T extends SceneSprite = SceneSprite> {
  width(): number
  height(): number
  context(): CanvasRenderingContext2D | null
  screen(ctx: CanvasRenderingContext2D): void
  image(name: string): { width: number; height: number } | null
  camera(): { x: number; y: number }
  spriteAlive(sprite: T): boolean
  moldName(sprite: T): string
  copySprite(sprite: T): T | null
  destroySprite(sprite: T): void
  drawSprite(ctx: CanvasRenderingContext2D, sprite: T): void
  hitbox(sprite: T): SpriteSceneBounds
  motion(sprite: T, lateral: number, forward: number): void
  health(sprite: T): number
  setHealth(sprite: T, lives: number): void
  hurt(sprite: T, amount: number): void
  animate(sprite: T, image: string, animation: string, once: boolean): void
  direction(): number
  pointer(): { x: number; y: number; down: boolean }
  state(): 'start' | 'playing' | 'paused' | 'won' | 'lost'
  setState(state: 'start' | 'playing' | 'paused' | 'won' | 'lost'): void
  setPaused(paused: boolean): void
  restart(): void
  wake(): void
  invoke(fn: () => void): void
  drawHud?(
    title: string,
    instructions: string,
    label: string,
    score: number,
    total: number,
    lives: number,
    progress: number,
    /** False when only the ready screens are on: no lives bar, no pause button. */
    hud: boolean,
    /** The track input mode: 'arrows', 'pointer', 'both' or 'off' (no footer). */
    controls: string,
  ): void
  warn(message: string): void
}
