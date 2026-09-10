/**
 * O atlas como UMA `DataTexture` RGBA8 (sRGB, `flipY = false`, NEAREST, sem
 * mipmap) com upload PARCIAL: cada pincelada escreve nos pixels e marca as
 * linhas sujas (`addUpdateRange`, em COMPONENTES RGBA, uma faixa por linha), e o three
 * sobe só essas linhas (`texSubImage2D`) em vez da folha inteira.
 */
import {
  type ColorSpace,
  DataTexture,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three'
import type { DirtyRows } from '../model/atlasRaster'

export class RgbaTexture {
  readonly texture: DataTexture
  readonly pixels: Uint8Array
  private readonly pendingRows = new Map<number, { start: number; count: number }>()
  private fullPending = true
  private disposed = false

  constructor(
    pixels: Uint8Array,
    readonly width: number,
    readonly height: number,
    colorSpace: ColorSpace = SRGBColorSpace,
  ) {
    if (
      !Number.isSafeInteger(width) ||
      width < 1 ||
      !Number.isSafeInteger(height) ||
      height < 1 ||
      pixels.length !== width * height * 4
    )
      throw new RangeError('Dimensões da textura não correspondem aos pixels.')
    this.pixels = pixels
    this.texture = new DataTexture(pixels, width, height, RGBAFormat, UnsignedByteType)
    this.texture.colorSpace = colorSpace
    this.texture.flipY = false
    this.texture.magFilter = NearestFilter
    this.texture.minFilter = NearestFilter
    this.texture.generateMipmaps = false
    this.texture.needsUpdate = true
    this.texture.onUpdate = () => {
      this.fullPending = false
      this.pendingRows.clear()
      this.texture.clearUpdateRanges()
    }
  }

  /** Linhas re-rasterizadas: sobe só elas. */
  markRows(rows: DirtyRows): void {
    if (this.disposed || this.fullPending) return
    const componentsPerPixel = 4
    const width = rows.x1 - rows.x0 + 1
    for (let y = rows.y0; y <= rows.y1; y += 1) {
      const start = (y * this.width + rows.x0) * componentsPerPixel
      const count = width * componentsPerPixel
      const pending = this.pendingRows.get(y)
      if (pending) {
        const end = Math.max(pending.start + pending.count, start + count)
        pending.start = Math.min(pending.start, start)
        pending.count = end - pending.start
      } else {
        this.texture.addUpdateRange(start, count)
        this.pendingRows.set(y, this.texture.updateRanges[this.texture.updateRanges.length - 1]!)
      }
    }
    this.texture.needsUpdate = true
  }

  /** Tudo mudou (paleta trocada): sobe a folha inteira. */
  markAll(): void {
    if (this.disposed) return
    this.fullPending = true
    this.pendingRows.clear()
    this.texture.clearUpdateRanges()
    this.texture.needsUpdate = true
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.pendingRows.clear()
    this.texture.onUpdate = null
    this.texture.dispose()
  }
}
