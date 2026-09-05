import { describe, expect, test } from 'bun:test'
import { hexToRgb } from '../core/color'
import { MOLDA_LIMITS } from '../core/limits'
import { createModelAsset, createPart, type FaceId, type MoldaModelAsset } from '../core/model'
import { resolvePaletteColors } from '../core/sanitize'
import { makeModel, paintedSkin } from '../testing/fixtures'
import {
  ATLAS_PADDING,
  ATLAS_SIZES,
  type AtlasRegion,
  atlasKey,
  faceKey,
  mapFaceUv,
  packAtlas,
  packAtlasFallback,
  packAtlasIncremental,
  SWATCH_SIZE,
} from './atlas'
import { rasterAtlas, rasterFaceRegion } from './atlasRaster'
import { setMirrorX } from './partOps'
import { faceSkinSize } from './shapes'

function padded(region: AtlasRegion): AtlasRegion {
  return {
    x: region.x - ATLAS_PADDING,
    y: region.y - ATLAS_PADDING,
    width: region.width + ATLAS_PADDING * 2,
    height: region.height + ATLAS_PADDING * 2,
  }
}

function overlaps(a: AtlasRegion, b: AtlasRegion): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/** Um modelo com N caixas, todas com a face de cima pintada em peles w×h. */
function paintedBoxes(count: number, texelsPerUnit: 2 | 4 | 8, side = 4): MoldaModelAsset {
  const model = { ...createModelAsset({ name: 'x', starter: false }), texelsPerUnit }
  const parts = []
  for (let i = 0; i < count; i += 1) {
    const part = createPart({
      id: `p${i}`,
      name: `p${i}`,
      from: [0, 0, 0],
      to: [side, side, side],
      color: 2,
    })
    const size = faceSkinSize(part, 'py', texelsPerUnit)
    if (!size) throw new Error('size')
    part.faces.py = paintedSkin(size.width, size.height, (x) => (x % 2) + 1)
    parts.push(part)
  }
  return { ...model, parts }
}

describe('atlas: empacotamento', () => {
  test('o maior tamanho vem da fonte única de limites', () => {
    expect(ATLAS_SIZES.at(-1)).toBe(MOLDA_LIMITS.atlasMax)
  })

  test('um modelo sem pintura vira só swatches, no menor atlas', () => {
    const model = makeModel()
    for (const part of model.parts) part.faces = {}
    const packed = packAtlas(model)
    expect(packed.ok).toBe(true)
    if (!packed.ok) return
    expect(packed.layout.size).toBe(ATLAS_SIZES[0])
    expect(packed.layout.swatches).toHaveLength(16)
    expect(packed.layout.faces.size).toBe(0)
  })

  test('regiões nunca se sobrepõem (contando a folga) e ficam dentro do atlas', () => {
    const model = makeModel()
    const packed = packAtlas(model)
    if (!packed.ok) throw new Error('atlas-full')
    const regions = [...packed.layout.swatches, ...packed.layout.faces.values()].map(padded)
    for (let i = 0; i < regions.length; i += 1) {
      const a = regions[i] as AtlasRegion
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.width).toBeLessThanOrEqual(packed.layout.size)
      expect(a.y + a.height).toBeLessThanOrEqual(packed.layout.size)
      for (let j = i + 1; j < regions.length; j += 1) {
        expect(overlaps(a, regions[j] as AtlasRegion)).toBe(false)
      }
    }
    expect(packed.layout.faces.has(faceKey('body', 'py'))).toBe(true)
    expect(packed.layout.faces.has(faceKey('wing', 'slope'))).toBe(true)
  })

  test('é determinístico e a chave só muda com a lista de faces pintadas', () => {
    const model = makeModel()
    const a = packAtlas(model)
    const b = packAtlas(structuredClone(model))
    expect(a).toEqual(b)
    const moved = {
      ...model,
      parts: model.parts.map((p) => ({ ...p, from: [...p.from] as [number, number, number] })),
    }
    expect(atlasKey(moved)).toBe(atlasKey(model))
    const painted = structuredClone(model)
    const body = painted.parts[0]
    if (!body) throw new Error('fixture')
    const size = faceSkinSize(body, 'px', painted.texelsPerUnit)
    if (!size) throw new Error('size')
    body.faces.px = paintedSkin(size.width, size.height, () => 3)
    expect(atlasKey(painted)).not.toBe(atlasKey(model))
  })

  test('incremental preserva as regiões existentes quando entra uma face nova', () => {
    const model = makeModel()
    const first = packAtlas(model)
    if (!first.ok) throw new Error('atlas-full')
    const painted = structuredClone(model)
    const body = painted.parts[0]
    if (!body) throw new Error('fixture')
    const size = faceSkinSize(body, 'px', painted.texelsPerUnit)
    if (!size) throw new Error('size')
    body.faces.px = paintedSkin(size.width, size.height, () => 3)

    const next = packAtlasIncremental(painted, first.layout)
    const repeated = packAtlasIncremental(structuredClone(painted), first.layout)

    expect(next).toEqual(repeated)
    if (!next.ok) throw new Error('atlas-full')
    expect(next.layout.swatches).toEqual(first.layout.swatches)
    for (const [key, region] of first.layout.faces) {
      expect(next.layout.faces.get(key)).toEqual(region)
    }
    expect(next.layout.faces.has(faceKey('body', 'px'))).toBe(true)
  })

  test('cresce 64 → 128 → 256 → 512 e estoura com atlas-full', () => {
    const small = packAtlas(paintedBoxes(4, 4))
    expect(small.ok && small.layout.size).toBe(64)
    const medium = packAtlas(paintedBoxes(40, 4))
    expect(medium.ok && medium.layout.size).toBe(128)
    // 128 caixas 32×32 em texels 8 = 128 peles de 32×32 (+ folga): não cabe em 512².
    const huge = paintedBoxes(128, 8, 4)
    const wide = {
      ...huge,
      parts: huge.parts.map((p) => ({ ...p, to: [32, 32, 32] as [number, number, number] })),
    }
    for (const part of wide.parts) {
      part.faces = {
        py: paintedSkin(32, 32, () => 2),
        px: paintedSkin(32, 32, () => 2),
        pz: paintedSkin(32, 32, () => 2),
      }
    }
    const full = packAtlas(wide)
    expect(full.ok).toBe(false)
    if (!full.ok) expect(full.reason).toBe('atlas-full')

    const fallback = packAtlasFallback(wide)
    expect(fallback.key).toBe(atlasKey(wide))
    expect(fallback.faces.size).toBe(0)
    expect(fallback.swatches.length).toBeGreaterThan(1)
    const first = wide.parts[0]
    if (!first) throw new Error('fixture')
    const uv = mapFaceUv(fallback, first, first, 'py', 0.25, 0.75)
    expect(uv.every(Number.isFinite)).toBe(true)
  })

  test('200 listas aleatórias são determinísticas, limitadas e sem sobreposição', () => {
    let seed = 0x5a17c0de
    const random = (): number => {
      seed ^= seed << 13
      seed ^= seed >>> 17
      seed ^= seed << 5
      return (seed >>> 0) / 0x1_0000_0000
    }

    for (let sample = 0; sample < 200; sample += 1) {
      const count = 1 + Math.floor(random() * MOLDA_LIMITS.maxParts)
      const model = createModelAsset({ name: `random-${sample}`, starter: false })
      model.parts = Array.from({ length: count }, (_, index) => {
        const part = createPart({
          id: `r${sample}-${index}`,
          name: `r${index}`,
          from: [0, 0, 0],
          to: [1, 1, 1],
          color: 1 + Math.floor(random() * 15),
        })
        const faceCount = Math.floor(random() * 7)
        const faces: FaceId[] = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
        for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
          const face = faces[faceIndex]
          if (!face) continue
          const width = 4 + Math.floor(random() * 29)
          const height = 4 + Math.floor(random() * 29)
          part.faces[face] = paintedSkin(width, height, () => 2)
        }
        return part
      })

      const packed = packAtlas(model)
      expect(packAtlas(structuredClone(model))).toEqual(packed)
      if (!packed.ok) {
        expect(packAtlasFallback(model).faces.size).toBe(0)
        continue
      }
      const regions = [...packed.layout.swatches, ...packed.layout.faces.values()].map(padded)
      for (let i = 0; i < regions.length; i += 1) {
        const a = regions[i] as AtlasRegion
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.y).toBeGreaterThanOrEqual(0)
        expect(a.x + a.width).toBeLessThanOrEqual(packed.layout.size)
        expect(a.y + a.height).toBeLessThanOrEqual(packed.layout.size)
        for (let j = i + 1; j < regions.length; j += 1) {
          expect(overlaps(a, regions[j] as AtlasRegion)).toBe(false)
        }
      }
    }
  })
})

describe('atlas: UV e raster', () => {
  test('face pintada mapeia para a região; face sem pele cai no centro do swatch', () => {
    const model = makeModel()
    const packed = packAtlas(model)
    if (!packed.ok) throw new Error('atlas-full')
    const body = model.parts[0]
    if (!body) throw new Error('fixture')
    const region = packed.layout.faces.get(faceKey('body', 'py'))
    if (!region) throw new Error('region')
    const [u0, v0] = mapFaceUv(packed.layout, body, body, 'py', 0, 0)
    const [u1, v1] = mapFaceUv(packed.layout, body, body, 'py', 1, 1)
    expect(u0 * packed.layout.size).toBeCloseTo(region.x)
    expect(v0 * packed.layout.size).toBeCloseTo(region.y)
    expect(u1 * packed.layout.size).toBeCloseTo(region.x + region.width)
    expect(v1 * packed.layout.size).toBeCloseTo(region.y + region.height)
    const swatch = packed.layout.swatches[body.color]
    if (!swatch) throw new Error('swatch')
    const [su, sv] = mapFaceUv(packed.layout, body, body, 'px', 0.3, 0.9)
    expect(su * packed.layout.size).toBeCloseTo(swatch.x + SWATCH_SIZE / 2)
    expect(sv * packed.layout.size).toBeCloseTo(swatch.y + SWATCH_SIZE / 2)
  })

  test('o gêmeo usa a região da face espelhada da fonte com o u invertido', () => {
    const model = setMirrorX(makeModel(), true)
    const wing = model.parts.find((p) => p.id === 'wing')
    const twin = model.parts.find((p) => p.mirrorOf === 'wing')
    if (!wing || !twin) throw new Error('fixture')
    const packed = packAtlas(model)
    if (!packed.ok) throw new Error('atlas-full')
    const region = packed.layout.faces.get(faceKey('wing', 'slope'))
    if (!region) throw new Error('region')
    const [u, v] = mapFaceUv(packed.layout, twin, wing, 'slope', 0, 0.5)
    expect(u * packed.layout.size).toBeCloseTo(region.x + region.width)
    expect(v * packed.layout.size).toBeCloseTo(region.y + region.height / 2)
  })

  test('raster: swatches com a cor da paleta, texel 0 = cor base, folga dilatada', () => {
    const model = makeModel()
    const packed = packAtlas(model)
    if (!packed.ok) throw new Error('atlas-full')
    const { layout } = packed
    const colors = resolvePaletteColors(model)
    const pixels = rasterAtlas(model, layout)
    const at = (x: number, y: number): [number, number, number] => {
      const o = (y * layout.size + x) * 4
      return [pixels[o] as number, pixels[o + 1] as number, pixels[o + 2] as number]
    }
    const swatch = layout.swatches[2]
    if (!swatch) throw new Error('swatch')
    expect(at(swatch.x, swatch.y)).toEqual(hexToRgb(colors[2] ?? ''))
    // Folga do swatch = a mesma cor.
    expect(at(swatch.x - 1, swatch.y - 1)).toEqual(hexToRgb(colors[2] ?? ''))
    const body = model.parts[0]
    if (!body?.faces.py) throw new Error('fixture')
    const region = layout.faces.get(faceKey('body', 'py'))
    if (!region) throw new Error('region')
    const base = hexToRgb(colors[body.color] ?? '')
    for (let y = 0; y < region.height; y += 1) {
      for (let x = 0; x < region.width; x += 1) {
        const index = body.faces.py.data[y * region.width + x] ?? 0
        const expected = index === 0 ? base : hexToRgb(colors[index] ?? '')
        expect(at(region.x + x, region.y + y)).toEqual(expected)
      }
    }
    // Folga esquerda = primeira coluna; folga de cima = primeira linha.
    expect(at(region.x - 1, region.y + 3)).toEqual(at(region.x, region.y + 3))
    expect(at(region.x + 5, region.y - 1)).toEqual(at(region.x + 5, region.y))
    // Re-raster de uma região devolve as linhas sujas (com a folga).
    const rows = rasterFaceRegion(pixels, layout, colors, body, 'py' as FaceId)
    expect(rows).toEqual({
      x0: region.x - 1,
      x1: region.x + region.width,
      y0: region.y - 1,
      y1: region.y + region.height,
    })
    expect(pixels.length).toBe(layout.size * layout.size * 4)
  })
})
