import { describe, expect, test } from 'bun:test'
import { createPart, type MeshFaceKey, type MoldaMesh, type Vec3 } from '../core/model'
import { cross, dot, planarFaceFrame } from './frame'
import { BOX_MESH_FACES, boxMesh, faceVertices } from './mesh'
import { faceLocalPolygon, meshFaceFrame, polygonContains } from './meshFrame'
import { faceSkinSize, partFaces } from './shapes'

function near(a: number, b: number): void {
  expect(Math.abs(a - b)).toBeLessThan(1e-9)
}

function nearVec(a: Vec3, b: Vec3): void {
  for (let i = 0; i < 3; i += 1) near(a[i] as number, b[i] as number)
}

describe('base das faces de malha', () => {
  const from: Vec3 = [-1, 0, -2]
  const to: Vec3 = [2, 3, 1]
  const mesh = boxMesh(from, to)
  const box = createPart({ name: 'caixa', from, to, color: 1 })

  test('cada face da caixa-malha tem base IDÊNTICA à da caixa (origem, s, t, tamanhos, normal)', () => {
    for (const face of BOX_MESH_FACES) {
      const expected = planarFaceFrame(box, face)
      const actual = meshFaceFrame(mesh, `f_${face}`)
      if (!expected || !actual) throw new Error(face)
      nearVec(actual.origin, expected.origin)
      nearVec(actual.s, expected.s)
      nearVec(actual.t, expected.t)
      nearVec(actual.normal, expected.normal)
      near(actual.su, expected.su)
      near(actual.tv, expected.tv)
    }
  })

  test('invariante cross(s, t) == -normal também num quad torto e num triângulo', () => {
    const torta: MoldaMesh = {
      vertices: { v_a: [0, 2, 0], v_b: [0, 0, 0], v_c: [3, 0, 1], v_d: [3, 2, 0] },
      faces: { f_q: { v: ['v_a', 'v_b', 'v_c', 'v_d'] }, f_t: { v: ['v_a', 'v_b', 'v_c'] } },
    }
    for (const key of ['f_q', 'f_t'] as const) {
      const frame = meshFaceFrame(torta, key)
      if (!frame) throw new Error(key)
      const c = cross(frame.s, frame.t)
      nearVec(c, [-frame.normal[0], -frame.normal[1], -frame.normal[2]])
      near(Math.hypot(...frame.s), 1)
      near(Math.hypot(...frame.t), 1)
      near(dot(frame.s, frame.t), 0)
      expect(frame.su).toBeGreaterThan(0)
      expect(frame.tv).toBeGreaterThan(0)
    }
  })

  test('face degenerada (pontos colineares) não tem base', () => {
    const linha: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [1, 0, 0], v_c: [2, 0, 0] },
      faces: { f_l: { v: ['v_a', 'v_b', 'v_c'] } },
    }
    expect(meshFaceFrame(linha, 'f_l')).toBeNull()
  })

  test('o polígono local do quad da caixa é o retângulo inteiro [0,0] [0,1] [1,1] [1,0]', () => {
    const frame = meshFaceFrame(mesh, 'f_pz')
    const points = faceVertices(mesh, 'f_pz')
    if (!frame || !points) throw new Error('f_pz')
    const polygon = faceLocalPolygon(frame, points)
    const expected: Array<[number, number]> = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ]
    polygon.forEach((p, i) => {
      near(p[0], (expected[i] as [number, number])[0])
      near(p[1], (expected[i] as [number, number])[1])
    })
  })

  test('polygonContains: dentro, fora, na borda com folga, e o triângulo não cobre a pele inteira', () => {
    const square: Array<[number, number]> = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ]
    expect(polygonContains(square, [0.5, 0.5])).toBe(true)
    expect(polygonContains(square, [1.5, 0.5])).toBe(false)
    expect(polygonContains(square, [1.01, 0.5], 0.02)).toBe(true)
    const triangle: Array<[number, number]> = [
      [0, 0],
      [0, 1],
      [1, 1],
    ]
    expect(polygonContains(triangle, [0.2, 0.8])).toBe(true)
    expect(polygonContains(triangle, [0.8, 0.2])).toBe(false)
  })

  test('planarFaceFrame delega para a malha e faceSkinSize mede pela base (igual à caixa)', () => {
    const part = createPart({ name: 'malha', shape: 'mesh', from, to, color: 1 })
    expect(part.mesh).toBeDefined()
    expect(partFaces(part).map(String)).toEqual(BOX_MESH_FACES.map((face) => `f_${face}`))
    for (const face of BOX_MESH_FACES) {
      const key: MeshFaceKey = `f_${face}`
      expect(planarFaceFrame(part, key)).not.toBeNull()
      expect(faceSkinSize(part, key, 4)).toEqual(faceSkinSize(box, face, 4))
    }
    expect(planarFaceFrame(part, 'px')).toBeNull()
    expect(faceSkinSize(part, 'px', 4)).toBeNull()
  })
})
