import { describe, expect, test } from 'bun:test'
import type { MoldaModelAsset, MoldaPart } from '../core/model'
import { rasterAtlas } from '../model/atlasRaster'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { ModelAtlasResource } from './modelAtlasResource'

describe('model atlas resource', () => {
  test('raster target is reused exactly, clears removed regions and rejects mismatched buffers', () => {
    const model = makeModel()
    const resource = new ModelAtlasResource()
    const { layout } = resource.update(model)
    const pixels: Uint8Array = new Uint8Array(layout.size ** 2 * 4).fill(99)
    expect(rasterAtlas(model, layout, pixels)).toBe(pixels)
    expect(pixels).toEqual(rasterAtlas(model, layout))
    const empty = { ...model, parts: [] }
    expect(rasterAtlas(empty, layout, pixels)).toBe(pixels)
    expect(pixels).toEqual(rasterAtlas(empty, layout))
    const invalid = new Uint8Array(4).fill(99)
    expect(() => rasterAtlas(empty, layout, invalid)).toThrow(RangeError)
    expect(invalid).toEqual(new Uint8Array(4).fill(99))
    resource.dispose()
  })

  test('palette and equal-size layout edits retain the texture, pixels and exact raster', () => {
    let model = makeModel()
    const resource = new ModelAtlasResource()
    const first = resource.update(model)
    const texture = first.atlas.texture
    const pixels = first.atlas.pixels
    let disposals = 0
    texture.addEventListener('dispose', () => disposals++)
    texture.onUpdate?.(texture)
    model = { ...model, paletteId: 'pastel' }
    const palette = resource.update(model)
    expect(palette.textureChanged).toBe(false)
    expect(palette.layoutChanged).toBe(false)
    expect(palette.atlas.texture).toBe(texture)
    expect(palette.atlas.pixels).toBe(pixels)
    expect(pixels).toEqual(rasterAtlas(model, palette.layout))
    const body = model.parts[0]!
    const painted = { ...body, faces: { ...body.faces, px: paintedSkin(4, 4, () => 3) } }
    model = { ...model, parts: [painted, model.parts[1]!] }
    const paint = resource.update(model)
    expect(paint.layoutChanged).toBe(true)
    expect(paint.textureChanged).toBe(false)
    expect(paint.atlas.texture).toBe(texture)
    expect(pixels).toEqual(rasterAtlas(model, paint.layout))
    expect(disposals).toBe(0)
    resource.dispose()
    resource.dispose()
    expect(disposals).toBe(1)
  })

  test('partial painting preserves all pending palette pixels and unchanged models do not upload', () => {
    let model = makeModel()
    const resource = new ModelAtlasResource()
    const first = resource.update(model)
    first.atlas.texture.onUpdate?.(first.atlas.texture)
    const version = first.atlas.texture.version
    resource.update(model)
    expect(first.atlas.texture.version).toBe(version)
    model = { ...model, paletteId: 'pastel' }
    resource.update(model)
    const body = model.parts[0]!
    const skin = body.faces.py!
    const changedSkin = { ...skin, data: skin.data.slice() }
    changedSkin.data[0] = 4
    model = {
      ...model,
      parts: [{ ...body, faces: { ...body.faces, py: changedSkin } }, model.parts[1]!],
    }
    const next = resource.update(model)
    expect(next.atlas.pixels).toEqual(rasterAtlas(model, next.layout))
    expect(next.atlas.texture.updateRanges).toEqual([])
    next.atlas.texture.onUpdate?.(next.atlas.texture)
    model = { ...model, parts: [{ ...model.parts[0]!, color: 5 }, model.parts[1]!] }
    const partial = resource.update(model)
    expect(partial.atlas.texture.updateRanges.length).toBeGreaterThan(0)
    expect(partial.atlas.pixels).toEqual(rasterAtlas(model, partial.layout))
    resource.dispose()
  })

  test('growing, fallback and restoration replace dimensions only and dispose all resources', () => {
    let model = makeModel()
    const resource = new ModelAtlasResource()
    let result = resource.update(model)
    const textures = [result.atlas.texture]
    const disposed = new Set<typeof result.atlas.texture>()
    const observe = () => {
      const texture = result.atlas.texture
      if (!textures.includes(texture)) textures.push(texture)
      texture.addEventListener('dispose', () => disposed.add(texture))
    }
    observe()
    const parts: MoldaPart[] = Array.from({ length: 128 }, (_, index) => ({
      ...model.parts[0]!,
      id: `p${index}`,
      faces: Object.fromEntries(
        ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((face) => [
          face,
          paintedSkin(32, 32, () => index % 16),
        ]),
      ),
    }))
    const fullModel: MoldaModelAsset = { ...model, parts }
    // Force the well-defined base-color fallback without claiming this synthetic layout is a native fixture.
    result = resource.update(fullModel)
    observe()
    expect(result.full).toBe(true)
    expect(result.atlas.pixels).toEqual(rasterAtlas(fullModel, result.layout))
    model = { ...model, parts: parts.slice(0, 8) }
    result = resource.update(model)
    observe()
    expect(result.full).toBe(false)
    expect(result.layout.size).toBeGreaterThan(textures[0]!.image.width)
    expect(result.atlas.pixels).toEqual(rasterAtlas(model, result.layout))
    result.atlas.texture.onUpdate?.(result.atlas.texture)
    resource.restore()
    expect(result.atlas.texture.updateRanges).toEqual([])
    resource.dispose()
    expect(disposed.size).toBe(textures.length)
    expect(() => resource.update(model)).toThrow('disposed')
  })
})
