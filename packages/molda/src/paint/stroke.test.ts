import { describe, expect, test } from 'bun:test'
import { faceSkinSize } from '../model/shapes'
import { createSkin } from '../model/skinOps'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { floodFillSkin, lineTexels, paintSkin, stampTexels } from './skinPaint'
import { ensureFaceSkin, fillFace, finishStroke, paintSegment, sampleColor } from './stroke'

describe('pintura na pele', () => {
  test('carimbos de 1, 2 e 3', () => {
    expect(stampTexels(5, 5, 1)).toEqual([[5, 5]])
    expect(stampTexels(5, 5, 2)).toHaveLength(4)
    expect(stampTexels(5, 5, 3)).toHaveLength(9)
    expect(stampTexels(5, 5, 3)).toContainEqual([4, 4])
    expect(stampTexels(5, 5, 3)).toContainEqual([6, 6])
  })

  test('Bresenham é inclusivo e contínuo', () => {
    const line = lineTexels(0, 0, 5, 2)
    expect(line[0]).toEqual([0, 0])
    expect(line.at(-1)).toEqual([5, 2])
    for (let i = 1; i < line.length; i += 1) {
      const [ax, ay] = line[i - 1] as [number, number]
      const [bx, by] = line[i] as [number, number]
      expect(Math.max(Math.abs(bx - ax), Math.abs(by - ay))).toBe(1)
    }
    expect(lineTexels(3, 3, 3, 3)).toEqual([[3, 3]])
  })

  test('paintSkin copia só quando muda, ignora fora da pele', () => {
    const skin = createSkin(4, 4)
    const same = paintSkin(
      skin,
      [
        [-1, -1],
        [9, 9],
      ],
      3,
    )
    expect(same).toBe(skin)
    const painted = paintSkin(skin, [[0, 0]], 3, 2)
    expect(painted).not.toBe(skin)
    expect(Array.from(painted.data.slice(0, 2))).toEqual([3, 3])
    expect(Array.from(painted.data.slice(4, 6))).toEqual([3, 3])
    expect(skin.data[0]).toBe(0)
    expect(paintSkin(painted, [[0, 0]], 3)).toBe(painted)
  })

  test('balde preenche a região conectada', () => {
    const skin = paintedSkin(4, 4, (x) => (x < 2 ? 1 : 2))
    const filled = floodFillSkin(skin, 0, 0, 7)
    for (let y = 0; y < 4; y += 1) {
      expect(filled.data[y * 4]).toBe(7)
      expect(filled.data[y * 4 + 1]).toBe(7)
      expect(filled.data[y * 4 + 2]).toBe(2)
    }
    expect(floodFillSkin(skin, 0, 0, 1)).toBe(skin)
    expect(floodFillSkin(skin, 9, 9, 5)).toBe(skin)
  })
})

describe('pintura no modelo', () => {
  test('ensureFaceSkin cria a pele no tamanho da face; nunca num gêmeo', () => {
    const model = makeModel()
    const ensured = ensureFaceSkin(model, 'body', 'px')
    const body = ensured.parts[0]
    const size = faceSkinSize(
      body ?? model.parts[0] ?? { shape: 'box', from: [0, 0, 0], to: [1, 1, 1] },
      'px',
      model.texelsPerUnit,
    )
    expect(body?.faces.px?.width).toBe(size?.width ?? -1)
    expect(ensureFaceSkin(ensured, 'body', 'px')).toBe(ensured)
    expect(ensureFaceSkin(model, 'nope', 'px')).toBe(model)
  })

  test('paintSegment: carimbo no 1º toque, linha na mesma face, carimbo em face nova', () => {
    const model = makeModel()
    const first = paintSegment(model, null, { partId: 'body', face: 'px', x: 0, y: 0 }, 5, 1)
    expect(first.parts[0]?.faces.px?.data[0]).toBe(5)
    const lined = paintSegment(
      first,
      { partId: 'body', face: 'px', x: 0, y: 0 },
      { partId: 'body', face: 'px', x: 3, y: 0 },
      5,
      1,
    )
    expect(Array.from(lined.parts[0]?.faces.px?.data.slice(0, 4) ?? [])).toEqual([5, 5, 5, 5])
    const other = paintSegment(
      lined,
      { partId: 'body', face: 'px', x: 3, y: 0 },
      { partId: 'body', face: 'pz', x: 2, y: 2 },
      5,
      1,
    )
    const pz = other.parts[0]?.faces.pz
    expect(pz?.data.filter((v) => v === 5)).toHaveLength(1)
    // Peça intocada mantém a referência.
    expect(other.parts[1]).toBe(model.parts[1])
  })

  test('fillFace, sampleColor e finishStroke', () => {
    const model = makeModel()
    const filled = fillFace(model, { partId: 'body', face: 'nx', x: 0, y: 0 }, 9)
    const nx = filled.parts[0]?.faces.nx
    expect(nx?.data.every((v) => v === 9)).toBe(true)
    expect(sampleColor(filled, { partId: 'body', face: 'nx', x: 1, y: 1 })).toBe(9)
    // Texel 0 e face sem pele = a cor base da peça.
    expect(sampleColor(model, { partId: 'body', face: 'py', x: 1, y: 0 })).toBe(8)
    expect(sampleColor(model, { partId: 'body', face: 'nz', x: 0, y: 0 })).toBe(8)
    // Apagar tudo com a borracha: a pele some no finishStroke.
    const erased = fillFace(filled, { partId: 'body', face: 'nx', x: 0, y: 0 }, 0)
    expect(erased.parts[0]?.faces.nx).toBeDefined()
    const finished = finishStroke(erased)
    expect(finished.parts[0]?.faces.nx).toBeUndefined()
    expect(finishStroke(finished)).toBe(finished)
  })
})
