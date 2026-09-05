import { describe, expect, test } from 'bun:test'
import { createPart, type FaceId, SHAPE_IDS } from '../core/model'
import { cross, dot, faceUvToPoint, planarFaceFrame, pointToFaceUv } from './frame'
import { FACES_BY_SHAPE, faceUnits, partSize } from './shapes'

const EPS = 1e-9

function near(a: number, b: number): void {
  expect(Math.abs(a - b)).toBeLessThan(1e-6)
}

describe('base (s, t) das faces planas', () => {
  const part = createPart({ name: 'p', from: [-1, 0, -2], to: [2, 3, 1], color: 1 })

  test('cross(s, t) == -normal, eixos unitários e ortogonais, em toda face plana de toda forma', () => {
    for (const shape of SHAPE_IDS) {
      const shaped = { ...part, shape }
      for (const face of FACES_BY_SHAPE[shape]) {
        const frame = planarFaceFrame(shaped, face)
        if (!frame) {
          // Só as faces CURVAS não têm base plana.
          expect(['side', 'around']).toContain(face)
          continue
        }
        const c = cross(frame.s, frame.t)
        near(c[0], -frame.normal[0])
        near(c[1], -frame.normal[1])
        near(c[2], -frame.normal[2])
        near(Math.hypot(...frame.s), 1)
        near(Math.hypot(...frame.t), 1)
        near(dot(frame.s, frame.t), 0)
        near(Math.hypot(...frame.normal), 1)
      }
    }
  })

  test('as extensões da base batem com faceUnits (a régua do tamanho da pele)', () => {
    for (const shape of SHAPE_IDS) {
      const shaped = { ...part, shape }
      for (const face of FACES_BY_SHAPE[shape]) {
        const frame = planarFaceFrame(shaped, face)
        const units = faceUnits(shape, partSize(shaped), face)
        if (!frame || !units) continue
        near(frame.su, units[0])
        near(frame.tv, units[1])
      }
    }
  })

  test('os cantos de cada face da caixa ficam no plano da face', () => {
    const planes: Record<string, [number, number]> = {
      px: [0, 2],
      nx: [0, -1],
      py: [1, 3],
      ny: [1, 0],
      pz: [2, 1],
      nz: [2, -2],
    }
    for (const face of FACES_BY_SHAPE.box) {
      const frame = planarFaceFrame(part, face)
      if (!frame) throw new Error(face)
      const plane = planes[face]
      if (!plane) throw new Error(face)
      for (const [u, v] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        const point = faceUvToPoint(frame, u, v)
        near(point[plane[0]] as number, plane[1])
        for (let i = 0; i < 3; i += 1) {
          expect(point[i] as number).toBeGreaterThanOrEqual((part.from[i] as number) - EPS)
          expect(point[i] as number).toBeLessThanOrEqual((part.to[i] as number) + EPS)
        }
      }
    }
  })

  test('pointToFaceUv é a inversa de faceUvToPoint (inclusive na rampa)', () => {
    const wedge = { ...part, shape: 'wedge' as const }
    for (const face of ['slope', 'px', 'ny'] as FaceId[]) {
      const frame = planarFaceFrame(wedge, face)
      if (!frame) throw new Error(face)
      for (const [u, v] of [
        [0.1, 0.9],
        [0.5, 0.5],
        [0.99, 0.01],
      ]) {
        const [u2, v2] = pointToFaceUv(frame, faceUvToPoint(frame, u as number, v as number))
        near(u2, u as number)
        near(v2, v as number)
      }
    }
  })

  test('a normal da rampa aponta para cima e para a frente', () => {
    const frame = planarFaceFrame({ ...part, shape: 'wedge' }, 'slope')
    expect(frame?.normal[1]).toBeGreaterThan(0)
    expect(frame?.normal[2]).toBeGreaterThan(0)
    near(frame?.normal[0] ?? 1, 0)
  })
})
