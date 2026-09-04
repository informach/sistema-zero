/** Fábrica da prévia 3D da textura com ponto de injeção (testes e playground). */
import {
  TexturePreview,
  type TexturePreviewFactory,
  type TexturePreviewLike,
  type TexturePreviewOptions,
} from './TexturePreview'

export const defaultTexturePreviewFactory: TexturePreviewFactory = (canvas, options) =>
  new TexturePreview(canvas, options)

let factory: TexturePreviewFactory | null = null

export function setMoldaTexturePreviewFactory(next: TexturePreviewFactory | null): void {
  factory = next
}

export function createTexturePreview(
  canvas: HTMLCanvasElement,
  options: TexturePreviewOptions,
): TexturePreviewLike {
  return (factory ?? defaultTexturePreviewFactory)(canvas, options)
}
