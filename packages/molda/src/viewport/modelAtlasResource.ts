import type { FaceId, MoldaModelAsset } from '../core/model'
import { resolvePaletteColors } from '../core/sanitize'
import {
  type AtlasLayout,
  atlasKey,
  packAtlas,
  packAtlasFallback,
  packAtlasIncremental,
} from '../model/atlas'
import { rasterAtlas, rasterFaceRegion } from '../model/atlasRaster'
import { AtlasTexture } from './atlasTexture'

/** Atlas layout, pixels and upload lifetime. No scene, input, React or material ownership. */
export class ModelAtlasResource {
  private layout: AtlasLayout | null = null
  private atlas: AtlasTexture | null = null
  private full = false
  private colorsSignature = ''
  private model: MoldaModelAsset | null = null
  private disposed = false

  update(model: MoldaModelAsset) {
    if (this.disposed) throw new Error('Atlas resource is disposed')
    const previous = this.model
    const colors = resolvePaletteColors(model)
    const colorsSignature = colors.join(',')
    const paletteChanged = colorsSignature !== this.colorsSignature
    const key = atlasKey(model)
    const layoutChanged = !this.layout || this.layout.key !== key
    if (layoutChanged) {
      const packed = this.layout ? packAtlasIncremental(model, this.layout) : packAtlas(model)
      this.layout = packed.ok ? packed.layout : packAtlasFallback(model)
      this.full = !packed.ok
    }
    const layout = this.layout
    if (!layout) throw new Error('Missing atlas layout')
    const textureChanged = !this.atlas || this.atlas.size !== layout.size
    if (textureChanged) {
      const next = new AtlasTexture(rasterAtlas(model, layout), layout.size)
      this.atlas?.dispose()
      this.atlas = next
    } else if ((layoutChanged || paletteChanged) && this.atlas) {
      rasterAtlas(model, layout, this.atlas.pixels)
      this.atlas.markAll()
    } else if (previous && this.atlas) {
      const before = new Map(previous.parts.map((part) => [part.id, part]))
      for (const part of model.parts) {
        if (part.mirrorOf) continue
        const old = before.get(part.id)
        const colorChanged = old !== undefined && old.color !== part.color
        for (const face of Object.keys(part.faces) as FaceId[]) {
          const skin = part.faces[face]
          if (!skin || (!colorChanged && old?.faces[face] === skin)) continue
          const rows = rasterFaceRegion(this.atlas.pixels, layout, colors, part, face)
          if (rows) this.atlas.markRows(rows)
        }
      }
    }
    if (!this.atlas) throw new Error('Missing atlas texture')
    this.model = model
    this.colorsSignature = colorsSignature
    return { layout, atlas: this.atlas, full: this.full, layoutChanged, textureChanged }
  }

  restore(): void {
    if (!this.disposed) this.atlas?.markAll()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.atlas?.dispose()
    this.atlas = null
    this.layout = null
    this.model = null
  }
}
