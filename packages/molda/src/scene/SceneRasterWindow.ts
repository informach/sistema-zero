import type { ScenePixelRegion } from './composite'
import type { SceneRasterPatch } from './imageRaster'
import { intersectImageRegions, readImageRegion } from './imageRegion'

interface Raster {
  width: number
  height: number
  pixels: Uint8Array
}

function sameRegion(a: ScenePixelRegion | null, b: ScenePixelRegion | null) {
  return a === b || (!!a && !!b && a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1 && a.y1 === b.y1)
}

/** Derived pixels only. Static views alias the source; cropped views own one reusable frame. */
export class SceneRasterWindow {
  private source: Raster | null = null
  private view: Raster | null = null
  private region: ScenePixelRegion | null = null
  private transparentPixels = 0

  get raster() {
    return this.view
  }
  /** Classify the whole sheet so changing frames cannot change the material's depth policy. */
  get transparent() {
    return this.transparentPixels > 0
  }

  update(
    patch: SceneRasterPatch | null,
    region: ScenePixelRegion | null = null,
  ): ScenePixelRegion | 'all' | null {
    const size = patch ?? this.source
    if (!size) throw new Error('Recorte sem imagem correspondente.')
    const { width, height } = size
    if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1)
      throw new Error('Dimensões de imagem inválidas.')
    // Validate both windows and byte lengths before touching any retained pixels.
    const nextRegion = region ? readImageRegion(region, size) : null
    const changed = patch?.region ? readImageRegion(patch.region, size) : null
    if (patch) {
      if (changed && (this.source?.width !== width || this.source.height !== height))
        throw new Error('Região de pintura sem imagem correspondente.')
      const length = changed
        ? (changed.x1 - changed.x0 + 1) * (changed.y1 - changed.y0 + 1) * 4
        : width * height * 4
      if (patch.pixels.length !== length)
        throw new Error('Pixels não correspondem à região de pintura.')
    }
    const moved =
      !this.view ||
      !sameRegion(nextRegion, this.region) ||
      this.source?.width !== width ||
      this.source.height !== height
    if (patch) {
      if (changed) {
        const source = this.source!
        const rowBytes = (changed.x1 - changed.x0 + 1) * 4
        for (let y = changed.y0; y <= changed.y1; y++) {
          const from = (y - changed.y0) * rowBytes
          const to = (y * width + changed.x0) * 4
          for (let x = 3; x < rowBytes; x += 4) {
            if (source.pixels[to + x]! < 255) this.transparentPixels--
            if (patch.pixels[from + x]! < 255) this.transparentPixels++
          }
          source.pixels.set(patch.pixels.subarray(from, from + rowBytes), to)
        }
      } else {
        if (this.source?.width === width && this.source.height === height)
          this.source.pixels.set(patch.pixels)
        else this.source = { width, height, pixels: patch.pixels }
        this.transparentPixels = 0
        for (let i = 3; i < patch.pixels.length; i += 4)
          if (patch.pixels[i]! < 255) this.transparentPixels++
      }
    }
    const source = this.source!
    if (!nextRegion) {
      this.view = source
      this.region = null
      return moved || (patch && !changed) ? 'all' : changed
    }
    const viewWidth = nextRegion.x1 - nextRegion.x0 + 1
    const viewHeight = nextRegion.y1 - nextRegion.y0 + 1
    if (!this.region || this.view?.width !== viewWidth || this.view.height !== viewHeight)
      this.view = {
        width: viewWidth,
        height: viewHeight,
        pixels: new Uint8Array(viewWidth * viewHeight * 4),
      }
    this.region = nextRegion
    const dirty =
      moved || (patch && !changed)
        ? nextRegion
        : changed
          ? intersectImageRegions(changed, nextRegion)
          : null
    if (!dirty) return null
    for (let y = dirty.y0; y <= dirty.y1; y++) {
      const from = (y * width + dirty.x0) * 4
      const to = ((y - nextRegion.y0) * viewWidth + dirty.x0 - nextRegion.x0) * 4
      this.view!.pixels.set(source.pixels.subarray(from, from + (dirty.x1 - dirty.x0 + 1) * 4), to)
    }
    return moved || !changed
      ? 'all'
      : {
          x0: dirty.x0 - nextRegion.x0,
          y0: dirty.y0 - nextRegion.y0,
          x1: dirty.x1 - nextRegion.x0,
          y1: dirty.y1 - nextRegion.y0,
        }
  }

  clear() {
    this.source = null
    this.view = null
    this.region = null
    this.transparentPixels = 0
  }
}
