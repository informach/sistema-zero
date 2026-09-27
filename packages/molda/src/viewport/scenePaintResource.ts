import { type ColorSpace, SRGBColorSpace } from 'three'
import type { ScenePixelRegion } from '../scene/composite'
import type { SceneRasterPatch } from '../scene/imageRaster'
import { SceneRasterWindow } from '../scene/SceneRasterWindow'
import { RgbaTexture } from './rgbaTexture'

/** One derived texture owner per image/base. Materials borrow it and never dispose it. */
export class ScenePaintResource {
  private raster: RgbaTexture | null = null
  private readonly window = new SceneRasterWindow()
  private disposed = false

  constructor(private readonly colorSpace: ColorSpace = SRGBColorSpace) {}

  get texture() {
    return this.raster?.texture ?? null
  }
  get transparent() {
    return this.window.transparent
  }

  update(paint: SceneRasterPatch | null, region: ScenePixelRegion | null = null): void {
    if (this.disposed) throw new Error('Pintura já descartada.')
    const dirty = this.window.update(paint, region)
    const view = this.window.raster!
    if (this.raster?.pixels !== view.pixels) {
      this.raster?.dispose()
      this.raster = new RgbaTexture(view.pixels, view.width, view.height, this.colorSpace)
    }
    if (dirty === 'all') this.raster.markAll()
    else if (dirty) this.raster.markRows(dirty)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.raster?.dispose()
    this.raster = null
    this.window.clear()
  }
}
