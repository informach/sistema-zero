/** Fábrica da prévia do céu com ponto de injeção (testes e playground). */
import {
  SkyPreview,
  type SkyPreviewFactory,
  type SkyPreviewLike,
  type SkyPreviewOptions,
} from './SkyPreview'

export const defaultSkyPreviewFactory: SkyPreviewFactory = (canvas, options) =>
  new SkyPreview(canvas, options)

let factory: SkyPreviewFactory | null = null

export function setMoldaSkyPreviewFactory(next: SkyPreviewFactory | null): void {
  factory = next
}

export function createSkyPreview(
  canvas: HTMLCanvasElement,
  options: SkyPreviewOptions,
): SkyPreviewLike {
  return (factory ?? defaultSkyPreviewFactory)(canvas, options)
}
