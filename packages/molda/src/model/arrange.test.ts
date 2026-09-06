import { describe, expect, it } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createModelAsset, createPart, type MoldaModelAsset } from '../core/model'
import { alignParts, centerPartsOnStage, putPartsOnFloor, repeatPartsInLine } from './arrange'
import { boxMesh } from './mesh'

function model(
  parts: MoldaModelAsset['parts'],
  input: Partial<MoldaModelAsset> = {},
): MoldaModelAsset {
  return { ...createModelAsset({ name: 'teste', starter: false, now: 1 }), parts, ...input }
}

describe('arrange', () => {
  it('puts the lowest rotated world point of a group on the floor atomically', () => {
    const a = createPart({ name: 'a', from: [-1, 4, -1], to: [1, 6, 1], color: 1 })
    const b = createPart({
      name: 'b',
      from: [3, 5, -1],
      to: [5, 7, 1],
      color: 1,
      rotation: [0, 0, 90],
    })
    const result = putPartsOnFloor(model([a, b]), [a.id, b.id])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.model.parts[0]?.from[1]).toBe(0)
    expect(result.model.parts[1]?.from[1]).toBe(1)
  })

  it('centers the selected group on X and Z without changing Y', () => {
    const a = createPart({ name: 'a', from: [4, 3, 6], to: [6, 5, 8], color: 1 })
    const b = createPart({ name: 'b', from: [8, 1, 2], to: [10, 3, 4], color: 1 })
    const result = centerPartsOnStage(model([a, b]), [a.id, b.id])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.model.parts[0]?.from).toEqual([-3, 3, 1])
    expect(result.model.parts[1]?.from).toEqual([1, 1, -3])
  })

  it('aligns the other selected parts to the primary center on one axis', () => {
    const primary = createPart({ name: 'principal', from: [-3, 2, 0], to: [1, 4, 2], color: 1 })
    const other = createPart({ name: 'outra', from: [5, 7, 0], to: [7, 9, 2], color: 1 })
    const result = alignParts(model([primary, other]), [primary.id, other.id], 'x')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.model.parts[0]?.from).toEqual(primary.from)
    expect(result.model.parts[1]?.from[0]).toBe(-2)
    expect(result.model.parts[1]?.from[1]).toBe(7)
  })

  it('refuses every movement when any selected source is locked', () => {
    const a = {
      ...createPart({ name: 'a', from: [1, 1, 1], to: [2, 2, 2], color: 1 }),
      locked: true as const,
    }
    const b = createPart({ name: 'b', from: [3, 1, 1], to: [4, 2, 2], color: 1 })
    const original = model([a, b])

    const result = centerPartsOnStage(original, [a.id, b.id])
    expect(result).toEqual({ ok: false, reason: 'locked', model: original })
  })

  it('repeats a multi-part group touching in all six directions', () => {
    const directions = ['+x', '-x', '+y', '-y', '+z', '-z'] as const
    for (const direction of directions) {
      const a = createPart({ name: 'bloco', from: [-2, 4, -1], to: [0, 6, 1], color: 3 })
      const b = createPart({ name: 'bloco 2', from: [0, 4, -1], to: [2, 6, 1], color: 4 })
      const result = repeatPartsInLine(model([a, b]), [a.id, b.id], {
        direction,
        count: 1,
        gapSteps: 0,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.addedIds).toHaveLength(2)
      expect(result.model.parts).toHaveLength(4)
      const axis = direction.endsWith('x') ? 0 : direction.endsWith('y') ? 1 : 2
      const sign = direction.startsWith('+') ? 1 : -1
      const originalCenter = (a.from[axis] + b.to[axis]) / 2
      const copies = result.model.parts.filter((part) => result.addedIds.includes(part.id))
      const copyCenter = Math.min(...copies.map((part) => part.from[axis])) + 2
      expect(Math.sign(copyCenter - originalCenter)).toBe(sign)
    }
  })

  it('copies mesh, skins and pivot with fresh ids/names and clears hidden/locked', () => {
    const source = createPart({
      name: 'asa',
      shape: 'mesh',
      from: [0, 1, 0],
      to: [2, 3, 2],
      color: 5,
      mesh: boxMesh([0, 1, 0], [2, 3, 2]),
    })
    source.origin = [0, 2, 1]
    source.faces.f_px = { width: 2, height: 2, data: Uint8Array.from([0, 2, 3, 0]) }
    source.locked = true
    source.hidden = true

    const result = repeatPartsInLine(model([source]), [source.id], {
      direction: '+x',
      count: 2,
      gapSteps: 1,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const copies = result.model.parts.filter((part) => result.addedIds.includes(part.id))
    expect(new Set(copies.map((part) => part.id)).size).toBe(2)
    expect(copies.map((part) => part.name)).toEqual(['asa 2', 'asa 3'])
    expect(copies[0]?.from).toEqual([3, 1, 0])
    expect(copies[0]?.origin).toEqual([3, 2, 1])
    expect(copies[0]?.locked).toBeUndefined()
    expect(copies[0]?.hidden).toBeUndefined()
    expect(copies[0]?.mesh).not.toBe(source.mesh)
    expect(copies[0]?.faces.f_px).not.toBe(source.faces.f_px)
    expect(copies[0]?.faces.f_px?.data).toEqual(source.faces.f_px.data)
  })

  it('allows repeating a locked source because the copies are new editable parts', () => {
    const source = {
      ...createPart({ name: 'torre', from: [0, 0, 0], to: [1, 1, 1], color: 1 }),
      locked: true as const,
    }
    const result = repeatPartsInLine(model([source]), [source.id], {
      direction: '+x',
      count: 1,
      gapSteps: 0,
    })
    expect(result.ok).toBe(true)
  })

  it('keeps mirror twins coherent and counts the required slots before committing', () => {
    const source = createPart({ name: 'asa', from: [1, 0, 0], to: [2, 1, 1], color: 1 })
    const base = model([source], { mirrorX: true })
    const result = repeatPartsInLine(base, [source.id], {
      direction: '+z',
      count: 1,
      gapSteps: 0,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const copyId = result.addedIds[0]
    expect(result.model.parts.some((part) => part.mirrorOf === copyId)).toBe(true)
  })

  it('returns typed failures without partial copies at grid and part limits', () => {
    const source = createPart({ name: 'borda', from: [15, 0, 0], to: [16, 1, 1], color: 1 })
    const edge = model([source])
    expect(
      repeatPartsInLine(edge, [source.id], { direction: '+x', count: 2, gapSteps: 0 }),
    ).toEqual({
      ok: false,
      reason: 'outside-grid',
      model: edge,
    })

    const parts = Array.from({ length: MOLDA_LIMITS.maxParts }, (_unused, index) =>
      createPart({
        id: `p-${index}`,
        name: `p ${index}`,
        from: [0, 0, 0],
        to: [1, 1, 1],
        color: 1,
      }),
    )
    const full = model(parts)
    expect(repeatPartsInLine(full, ['p-0'], { direction: '+x', count: 1, gapSteps: 0 })).toEqual({
      ok: false,
      reason: 'parts-full',
      model: full,
    })
  })

  it('refuses the entire repetition when its projected meshes exceed the triangle limit', () => {
    const faces = Object.fromEntries(
      Array.from({ length: MOLDA_LIMITS.maxMeshFaces }, (_unused, index) => [
        `f_${index}`,
        { v: ['v_a', 'v_b', 'v_c'] },
      ]),
    )
    const parts = Array.from({ length: 3 }, (_unused, index) =>
      createPart({
        id: `mesh-${index}`,
        name: `malha ${index}`,
        shape: 'mesh',
        from: [0, 0, 0],
        to: [1, 1, 1],
        color: 1,
        mesh: {
          vertices: { v_a: [0, 0, 0], v_b: [1, 0, 0], v_c: [0, 1, 0] },
          faces,
        },
      }),
    )
    const original = model(parts)

    expect(
      repeatPartsInLine(
        original,
        parts.map((part) => part.id),
        {
          direction: '+x',
          count: 8,
          gapSteps: 0,
        },
      ),
    ).toEqual({ ok: false, reason: 'triangles-full', model: original })
  })
})
