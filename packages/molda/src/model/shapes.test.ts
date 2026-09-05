import { describe, expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createPart, SHAPE_IDS } from '../core/model'
import { paintedSkin } from '../testing/fixtures'
import { FACES_BY_SHAPE, faceSkinSize, faceUnits, partCenter, partSize } from './shapes'
import { flipSkinH, isSkinBlank, resampleSkin } from './skinOps'

describe('formas', () => {
  test('toda forma tem faces e toda face tem tamanho de pele', () => {
    for (const shape of SHAPE_IDS) {
      const faces = FACES_BY_SHAPE[shape]
      expect(faces.length).toBeGreaterThan(0)
      const part = createPart({ name: 'p', shape, from: [0, 0, 0], to: [2, 3, 4], color: 1 })
      for (const face of faces) {
        expect(faceUnits(shape, partSize(part), face)).not.toBeNull()
        const size = faceSkinSize(part, face, 4)
        expect(size).not.toBeNull()
        expect(size?.width).toBeGreaterThanOrEqual(MOLDA_LIMITS.minSkin)
        expect(size?.height).toBeGreaterThanOrEqual(MOLDA_LIMITS.minSkin)
        expect(size?.width).toBeLessThanOrEqual(MOLDA_LIMITS.maxSkin)
        expect(size?.height).toBeLessThanOrEqual(MOLDA_LIMITS.maxSkin)
      }
    }
  })

  test('face que a forma não tem devolve null', () => {
    const sphere = createPart({
      name: 'p',
      shape: 'sphere',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 1,
    })
    expect(faceSkinSize(sphere, 'px', 4)).toBeNull()
  })

  test('o tamanho da pele acompanha a peça e a resolução, dentro da faixa', () => {
    const box = createPart({ name: 'p', from: [0, 0, 0], to: [2, 1, 3], color: 1 })
    expect(faceSkinSize(box, 'py', 4)).toEqual({ width: 8, height: 12 })
    expect(faceSkinSize(box, 'py', 8)).toEqual({ width: 16, height: 24 })
    expect(faceSkinSize(box, 'py', 2)).toEqual({ width: 4, height: 6 })
    const huge = createPart({ name: 'p', from: [0, 0, 0], to: [32, 32, 32], color: 1 })
    expect(faceSkinSize(huge, 'py', 8)).toEqual({ width: 32, height: 32 })
    const tiny = createPart({ name: 'p', from: [0, 0, 0], to: [0.5, 0.5, 0.5], color: 1 })
    expect(faceSkinSize(tiny, 'py', 2)).toEqual({ width: 4, height: 4 })
  })

  test('centro e tamanho', () => {
    const box = createPart({ name: 'p', from: [-1, 0, 2], to: [3, 2, 4], color: 1 })
    expect(partSize(box)).toEqual([4, 2, 2])
    expect(partCenter(box)).toEqual([1, 1, 3])
  })
})

describe('peles', () => {
  test('resample por vizinho mais próximo preserva o desenho ao dobrar e ao reduzir', () => {
    const skin = paintedSkin(4, 4, (x, y) => (x < 2 ? 1 : 2) + (y < 2 ? 0 : 2))
    const big = resampleSkin(skin, 8, 8)
    expect(big.data[0]).toBe(1)
    expect(big.data[7]).toBe(2)
    expect(big.data[63]).toBe(4)
    const back = resampleSkin(big, 4, 4)
    expect(back.data).toEqual(skin.data)
    expect(resampleSkin(skin, 4, 4)).toBe(skin)
  })

  test('flipSkinH inverte as colunas; isSkinBlank', () => {
    const skin = paintedSkin(3, 2, (x) => x)
    const flipped = flipSkinH(skin)
    expect(Array.from(flipped.data)).toEqual([2, 1, 0, 2, 1, 0])
    expect(isSkinBlank(paintedSkin(2, 2, () => 0))).toBe(true)
    expect(isSkinBlank(skin)).toBe(false)
  })
})
