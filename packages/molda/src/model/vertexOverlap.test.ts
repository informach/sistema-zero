import { describe, expect, test } from 'bun:test'
import type { MoldaMesh, Vec3 } from '../core/model'
import { type MeshIssue, meshIssues } from './mesh'

/** Independent quadratic oracle: exact former ordering and distance calculation. */
function overlaps(vertices: Record<string, Vec3>) {
  const entries = Object.entries(vertices)
  const result: MeshIssue[] = []
  for (let i = 0; i < entries.length; i += 1) {
    const [ka, a] = entries[i]!
    for (let j = i + 1; j < entries.length; j += 1) {
      const [kb, b] = entries[j]!
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= 1e-6) {
        result.push({ kind: 'overlap', vertices: [ka, kb] })
      }
    }
  }
  return result
}

describe('overlapping vertex diagnostics', () => {
  test('matches the independent oracle, including stable pair ordering and epsilon boundaries', () => {
    let seed = 19
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    for (let sample = 0; sample < 60; sample += 1) {
      const vertices: Record<string, Vec3> = {}
      for (let i = 0; i < 80; i += 1) {
        const base = Math.floor(random() * 4) - 2
        vertices[`v_${i}`] = [base + random() * 4e-6, random() * 4e-6, random() * 4e-6]
      }
      const mesh: MoldaMesh = { vertices, faces: {} }
      expect(meshIssues(mesh)).toEqual(overlaps(vertices))
    }
    const vertices: Record<string, Vec3> = {
      v_a: [0, 0, 0],
      v_b: [1e-6, 0, 0],
      v_c: [-1e-6, 0, 0],
      v_d: [1e-6 + Number.EPSILON, 0, 0],
      v_e: [0, 0, 0],
      v_f: [-2e-6, 0, 0],
      v_g: [1e100, 0, 0],
      v_h: [1e100, 0, 0],
    }
    expect(meshIssues({ vertices, faces: {} })).toEqual(overlaps(vertices))
  })

  test('does not alter geometry or silently cache mutable callers', () => {
    const mesh: MoldaMesh = { vertices: { v_a: [0, 0, 0], v_b: [2, 0, 0] }, faces: {} }
    const original = structuredClone(mesh)
    expect(meshIssues(mesh)).toEqual([])
    expect(mesh).toEqual(original)
    mesh.vertices.v_b = [0, 0, 0]
    expect(meshIssues(mesh)).toEqual([{ kind: 'overlap', vertices: ['v_a', 'v_b'] }])
  })
})
