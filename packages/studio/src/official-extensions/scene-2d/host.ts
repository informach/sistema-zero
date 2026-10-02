/**
 * What each engine lends to the shared scene. The browser types live here, and not
 * in `contract.ts`, on purpose: the block catalog imports the public contract, and
 * the catalog is reachable from server packages that compile without the DOM lib.
 */
export interface SceneHost {
  context(): CanvasRenderingContext2D | null
  width(): number
  height(): number
  image(name: string): HTMLImageElement | null
  camera(): { x: number; y: number }
  /** Enter logical screen coordinates, retaining the device-pixel transform. */
  screen(ctx: CanvasRenderingContext2D): void
  /**
   * Set image smoothing for the next draw of `image` at `width` logical pixels. It is
   * called inside the scene's own save/restore, so the engine's setting returns.
   */
  smoothing?(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number): void
  warn(message: string): void
}
