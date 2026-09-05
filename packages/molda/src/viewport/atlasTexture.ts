/**
 * O atlas como UMA `DataTexture` RGBA8 (sRGB, `flipY = false`, NEAREST, sem
 * mipmap) com upload PARCIAL: cada pincelada escreve nos pixels e marca as
 * linhas sujas (`addUpdateRange`, em COMPONENTES RGBA, uma faixa por linha), e o three
 * sobe só essas linhas (`texSubImage2D`) em vez da folha inteira.
 */
import { DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType } from 'three'
import type { DirtyRows } from '../model/atlasRaster'

export class AtlasTexture {
  readonly texture: DataTexture
  readonly size: number
  readonly pixels: Uint8Array

  constructor(pixels: Uint8Array, size: number) {
    this.pixels = pixels
    this.size = size
    this.texture = new DataTexture(pixels, size, size, RGBAFormat, UnsignedByteType)
    this.texture.colorSpace = SRGBColorSpace
    this.texture.flipY = false
    this.texture.magFilter = NearestFilter
    this.texture.minFilter = NearestFilter
    this.texture.generateMipmaps = false
    this.texture.needsUpdate = true
  }

  /** Linhas re-rasterizadas: sobe só elas. */
  markRows(rows: DirtyRows): void {
    const componentsPerPixel = 4
    const width = rows.x1 - rows.x0 + 1
    for (let y = rows.y0; y <= rows.y1; y += 1) {
      this.texture.addUpdateRange(
        (y * this.size + rows.x0) * componentsPerPixel,
        width * componentsPerPixel,
      )
    }
    this.texture.needsUpdate = true
  }

  /** Tudo mudou (paleta trocada): sobe a folha inteira. */
  markAll(): void {
    this.texture.clearUpdateRanges()
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.texture.dispose()
  }
}
