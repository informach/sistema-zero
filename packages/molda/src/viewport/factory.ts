/**
 * Fábrica do palco com ponto de injeção: os testes de componente instalam um
 * palco falso; o playground embrulha o real para expor a instância no
 * `window.__molda` (QA no console e Playwright).
 */
import { MoldaViewport } from './MoldaViewport'
import type {
  MoldaViewportLike,
  ViewportCallbacks,
  ViewportFactory,
  ViewportOptions,
} from './types'

export const defaultViewportFactory: ViewportFactory = (canvas, callbacks, options) =>
  new MoldaViewport(canvas, callbacks, options)

let factory: ViewportFactory | null = null

export function setMoldaViewportFactory(next: ViewportFactory | null): void {
  factory = next
}

export function createMoldaViewport(
  canvas: HTMLCanvasElement,
  callbacks: ViewportCallbacks,
  options: ViewportOptions,
): MoldaViewportLike {
  return (factory ?? defaultViewportFactory)(canvas, callbacks, options)
}
