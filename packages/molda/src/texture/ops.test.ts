import { describe, expect, test } from 'bun:test'
import { createTextureAsset } from '../core/model'
import { resolvePaletteColors } from '../core/sanitize'
import { exportTexturePng, textureToRgba } from '../export/texturePng'
import { faceSkinSize } from '../model/shapes'
import { makeModel, makeTexture, paintedSkin } from '../testing/fixtures'
import { decodePng } from '../testing/pngDecode'
import {
  addTextureColor,
  applyTextureToPart,
  buildColorRemap,
  floodFillTexture,
  lineTexelsWrap,
  paintTexture,
  removeTextureColor,
  sampleTexture,
} from './ops'

describe('textura: pintura', () => {
  test('paintTexture recorta sem wrap e dá a volta com wrap', () => {
    const asset = createTextureAsset({ name: 't', size: 16 })
    const clipped = paintTexture(asset, [[-1, 0]], 3, 1, false)
    expect(clipped).toBe(asset)
    const wrapped = paintTexture(asset, [[-1, 0]], 3, 1, true)
    expect(sampleTexture(wrapped, 15, 0)).toBe(3)
    const big = paintTexture(asset, [[15, 15]], 4, 3, true)
    // Carimbo 3×3 centrado no canto: atravessa para o canto oposto.
    expect(sampleTexture(big, 0, 0)).toBe(4)
    expect(sampleTexture(big, 14, 14)).toBe(4)
    expect(paintTexture(big, [[15, 15]], 4, 1, true)).toBe(big)
  })

  test('lineTexelsWrap pega o caminho curto pela borda', () => {
    const straight = lineTexelsWrap(16, 2, 0, 5, 0, false)
    expect(straight).toHaveLength(4)
    const across = lineTexelsWrap(16, 15, 0, 0, 0, true)
    expect(across).toHaveLength(2)
    expect(across[1]).toEqual([16, 0])
    const noWrap = lineTexelsWrap(16, 15, 0, 0, 0, false)
    expect(noWrap).toHaveLength(16)
  })

  test('floodFillTexture respeita a borda sem wrap e atravessa com wrap', () => {
    const asset = createTextureAsset({ name: 't', size: 16 })
    // Uma barreira vertical em x = 4.
    const walled = paintTexture(
      asset,
      Array.from({ length: 16 }, (_, y) => [4, y] as [number, number]),
      2,
      1,
      false,
    )
    const filled = floodFillTexture(walled, 0, 0, 5, false)
    expect(sampleTexture(filled, 3, 3)).toBe(5)
    expect(sampleTexture(filled, 6, 3)).toBe(0)
    const wrapped = floodFillTexture(walled, 0, 0, 5, true)
    expect(sampleTexture(wrapped, 6, 3)).toBe(5)
    expect(floodFillTexture(filled, 0, 0, 5, false)).toBe(filled)
  })

  test('cores extras: adicionar, apagar (texels viram transparentes) e o teto', () => {
    const asset = makeTexture()
    const added = addTextureColor(asset, '#123456')
    expect(added?.index).toBe(16)
    const painted = paintTexture(added?.asset ?? asset, [[0, 0]], 16, 1, false)
    const removed = removeTextureColor(painted, 16)
    expect(removed && sampleTexture(removed, 0, 0)).toBe(0)
    expect(removed && 'extraColors' in removed).toBe(false)
    expect(removeTextureColor(asset, 3)).toBeNull()
  })
})

describe('textura: PNG', () => {
  test('índice 0 vira alfa 0; o PNG decodifica de volta', () => {
    const asset = makeTexture()
    const rgba = textureToRgba(asset)
    const transparent = asset.bitmap.data.indexOf(0)
    expect(rgba[transparent * 4 + 3]).toBe(0)
    const opaque = asset.bitmap.data.findIndex((v) => v > 0)
    expect(rgba[opaque * 4 + 3]).toBe(255)
    const result = exportTexturePng(asset)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    const decoded = decodePng(result.bytes)
    expect(decoded.width).toBe(16)
    expect(decoded.rgba).toEqual(rgba)
  })
})

describe('vestir a peça', () => {
  test('tile repete a folha e stretch estica; 0 preserva a cor base; paleta remapeada', () => {
    const model = makeModel()
    const texture = makeTexture()
    const tiled = applyTextureToPart(model, 'body', texture, 'tile')
    const body = tiled.parts[0]
    if (!body) throw new Error('body')
    for (const face of ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const) {
      const skin = body.faces[face]
      const size = faceSkinSize(body, face, model.texelsPerUnit)
      expect(skin?.width).toBe(size?.width ?? -1)
      expect(skin?.height).toBe(size?.height ?? -1)
    }
    // Repetição: o texel (x, y) da face = o (x % 16, y % 16) da folha (mesma paleta arcade).
    const py = body.faces.py
    if (!py) throw new Error('py')
    for (let y = 0; y < py.height; y += 1) {
      for (let x = 0; x < py.width; x += 1) {
        expect(py.data[y * py.width + x]).toBe(texture.bitmap.data[(y % 16) * 16 + (x % 16)] ?? -1)
      }
    }
    const stretched = applyTextureToPart(model, 'body', texture, 'stretch')
    const spy = stretched.parts[0]?.faces.py
    if (!spy) throw new Error('spy')
    // Esticada: o último texel da face lê o último da folha.
    expect(spy.data[py.height * py.width - 1]).toBe(texture.bitmap.data[255] ?? -1)
    // Paletas diferentes: a cor do texel entra como extra do modelo.
    const pastel = { ...texture, paletteId: 'pastel' as const }
    const remapped = applyTextureToPart(model, 'wing', pastel, 'tile')
    expect(remapped.extraColors?.length ?? 0).toBeGreaterThan(0)
    const wing = remapped.parts[1]
    const colors = resolvePaletteColors(remapped)
    const textureColors = resolvePaletteColors(pastel)
    const slope = wing?.faces.slope
    if (!slope) throw new Error('slope')
    const texel = slope.data.findIndex((v) => v > 0)
    const sourceIndex =
      pastel.bitmap.data[
        (Math.floor(texel / slope.width) % 16) * 16 + ((texel % slope.width) % 16)
      ] ?? 0
    expect(colors[slope.data[texel] ?? 0]).toBe(textureColors[sourceIndex])
    // Gêmeo e peça inexistente não mudam nada.
    expect(applyTextureToPart(model, 'nope', texture, 'tile')).toBe(model)
  })

  test('buildColorRemap: mesma cor reaproveita, cor nova vira extra, sem vaga pega a mais parecida', () => {
    const model = makeModel()
    const { model: next, map } = buildColorRemap(
      ['', '#ffffff', '#123456'],
      Uint8Array.of(1, 2),
      model,
    )
    expect(map).toEqual([0, 1, 16])
    expect(next.extraColors).toEqual(['#123456'])
    const full = {
      ...model,
      extraColors: Array.from(
        { length: 48 },
        (_, i) => `#${(0x100000 + i).toString(16).padStart(6, '0')}`,
      ),
    }
    const { model: same, map: nearest } = buildColorRemap(['', '#ff2020'], Uint8Array.of(1), full)
    expect(same.extraColors).toHaveLength(48)
    expect(nearest[1]).toBe(2)
  })

  test('applyTextureToPart numa face só e com skins prévias', () => {
    const model = makeModel()
    const texture = { ...makeTexture(), bitmap: paintedSkin(16, 16, () => 3) }
    const one = applyTextureToPart(model, 'body', texture, 'tile', ['px'])
    expect(one.parts[0]?.faces.px?.data.every((v) => v === 3)).toBe(true)
    expect(one.parts[0]?.faces.py).toBe(model.parts[0]?.faces.py)
  })

  test('textura transparente limpa as peles sem reservar cores que não usa', () => {
    const model = makeModel()
    const customColors = [
      '',
      ...Array.from(
        { length: 15 },
        (_, index) => `#${((index + 1) * 0x010101).toString(16).padStart(6, '0')}`,
      ),
    ]
    const texture = makeTexture({
      paletteId: 'custom',
      customPalette: { name: 'Só para o teste', colors: customColors },
      bitmap: paintedSkin(16, 16, () => 0),
    })
    const applied = applyTextureToPart(model, 'body', texture, 'stretch')

    expect(applied.extraColors).toBeUndefined()
    expect(applied.parts[0]?.faces).toEqual({})
  })
})
