import { describe, expect, it } from 'bun:test'
import { createModelAsset, createPart, type MeshFaceKey, type MoldaModelAsset } from '../core/model'
import {
  facePaintCanvas,
  facePaintFill,
  facePaintSegment,
  mirrorFaceTexel,
  resolveFacePaintTarget,
} from './facePaint'

function model(parts: MoldaModelAsset['parts']): MoldaModelAsset {
  return { ...createModelAsset({ name: 'teste', starter: false, now: 1 }), parts }
}

describe('face paint adapter', () => {
  it('uses the part base color for empty texels on a rectangular face', () => {
    const part = createPart({ name: 'caixa', from: [0, 0, 0], to: [2, 2, 2], color: 7 })
    const canvas = facePaintCanvas(model([part]), { partId: part.id, face: 'px', flipX: false })
    expect(canvas?.width).toBe(8)
    expect(canvas?.height).toBe(8)
    expect(canvas?.baseColor).toBe(7)
    expect(canvas?.data.every((value) => value === 0)).toBe(true)
    expect(canvas?.mask.every((value) => value === 1)).toBe(true)
  })

  it('masks the non-polygon half of a triangular wedge face', () => {
    const part = createPart({
      name: 'rampa',
      shape: 'wedge',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 2,
    })
    const canvas = facePaintCanvas(model([part]), { partId: part.id, face: 'px', flipX: false })
    expect(canvas).not.toBeNull()
    expect(canvas?.mask[0]).toBe(0)
    expect(canvas?.mask.at(-1)).toBe(1)
    expect(canvas?.mask.some((value) => value === 0)).toBe(true)
    expect(canvas?.mask.some((value) => value === 1)).toBe(true)
  })

  it('builds a strict mask for a concave mesh face', () => {
    const face = 'f_dart' as MeshFaceKey
    const part = createPart({
      name: 'dente',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [4, 4, 1],
      color: 3,
      mesh: {
        vertices: {
          v_a: [0, 4, 0],
          v_b: [0, 0, 0],
          v_c: [4, 4, 0],
          v_d: [2, 2, 0],
        },
        faces: { [face]: { v: ['v_a', 'v_b', 'v_c', 'v_d'] } },
      },
    })
    const canvas = facePaintCanvas(model([part]), { partId: part.id, face, flipX: false })
    expect(canvas).not.toBeNull()
    expect(canvas?.mask.some((value) => value === 0)).toBe(true)
    expect(canvas?.mask.some((value) => value === 1)).toBe(true)
  })

  it('never changes a texel outside the face polygon with pencil or bucket', () => {
    const part = createPart({
      name: 'rampa',
      shape: 'wedge',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 2,
    })
    const original = model([part])
    const target = { partId: part.id, face: 'px' as const, flipX: false }
    const canvas = facePaintCanvas(original, target)
    expect(canvas?.mask[0]).toBe(0)

    const pencil = facePaintSegment(
      original,
      null,
      { partId: part.id, face: 'px', x: 0, y: 0 },
      5,
      3,
      canvas?.mask,
    )
    const bucket = facePaintFill(
      original,
      { partId: part.id, face: 'px', x: 0, y: 0 },
      5,
      canvas?.mask,
    )
    expect(pencil).toBe(original)
    expect(bucket).toBe(original)
  })

  it('keeps flood fill inside a disconnected masked region', () => {
    const part = createPart({
      name: 'rampa',
      shape: 'wedge',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 2,
    })
    const original = model([part])
    const hit = { partId: part.id, face: 'px' as const, x: 7, y: 7 }
    const canvas = facePaintCanvas(original, { partId: part.id, face: 'px', flipX: false })
    const painted = facePaintFill(original, hit, 6, canvas?.mask)
    const data = painted.parts[0]?.faces.px?.data
    expect(data?.[0]).toBe(0)
    expect(data?.at(-1)).toBe(6)
  })

  it('maps the same texel to the mirrored source face', () => {
    const left = createPart({ name: 'esquerda', from: [-4, 0, -1], to: [-2, 2, 1], color: 2 })
    const right = createPart({ name: 'direita', from: [2, 0, -1], to: [4, 2, 1], color: 2 })
    const asset = model([left, right])
    const mirrored = mirrorFaceTexel(asset, { partId: left.id, face: 'nx', x: 2, y: 3 })
    expect(mirrored?.partId).toBe(right.id)
    expect(mirrored?.face).toBe('px')
    expect(mirrored?.y).toBe(3)
  })

  it('opens a touched mirror twin on its source with the visible orientation preserved', () => {
    const source = createPart({
      id: 'source',
      name: 'asa',
      from: [1, 0, 0],
      to: [3, 2, 1],
      color: 2,
    })
    const twin = {
      ...createPart({
        id: 'twin',
        name: 'asa espelho',
        from: [-3, 0, 0],
        to: [-1, 2, 1],
        color: 2,
      }),
      mirrorOf: source.id,
    }

    expect(
      resolveFacePaintTarget(model([source, twin]), {
        partId: twin.id,
        face: 'px',
        flipX: false,
      }),
    ).toEqual({ partId: source.id, face: 'nx', flipX: true })
  })

  it('returns null when the selected face was deleted', () => {
    const part = createPart({ name: 'caixa', from: [0, 0, 0], to: [1, 1, 1], color: 1 })
    expect(facePaintCanvas(model([]), { partId: part.id, face: 'px', flipX: false })).toBeNull()
  })
})
