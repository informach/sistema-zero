import { describe, expect, test } from 'bun:test'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three'
import { createPart, type MoldaPart, SHAPE_IDS, type ShapeId } from '../core/model'
import { makeModel } from '../testing/fixtures'
import { planarFaceFrame } from './frame'
import { buildPartGeometry, modelTriangleCount, triangleCountOf } from './geometry'
import { FACES_BY_SHAPE, partCenter } from './shapes'

function partOf(shape: ShapeId): MoldaPart {
  return createPart({ name: 'p', shape, from: [-1, 0, -2], to: [2, 3, 1], color: 1 })
}

function toThree(part: MoldaPart): Mesh {
  const built = buildPartGeometry(part)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(built.positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(built.normals, 3))
  // FrontSide: o Raycaster só acerta triângulos com o winding certo (CCW de fora).
  return new Mesh(geometry, new MeshBasicMaterial())
}

describe('geometria das peças', () => {
  test('contagem de triângulos por forma e por modelo', () => {
    for (const shape of SHAPE_IDS) {
      const built = buildPartGeometry(partOf(shape))
      expect(built.triangleCount).toBe(triangleCountOf(shape))
      expect(built.positions.length).toBe(built.triangleCount * 9)
      expect(built.normals.length).toBe(built.triangleCount * 9)
      expect(built.uvs.length).toBe(built.triangleCount * 6)
      expect(built.faceOfTriangle).toHaveLength(built.triangleCount)
      const covered = Object.values(built.faceRanges).reduce((sum, r) => sum + (r?.count ?? 0), 0)
      expect(covered).toBe(built.triangleCount)
      for (const face of Object.keys(built.faceRanges)) {
        expect(FACES_BY_SHAPE[shape] as readonly string[]).toContain(face)
      }
    }
    expect(modelTriangleCount(makeModel())).toBe(12 + 8)
  })

  test('normais unitárias apontando para fora; UV em [0, 1]; vértices dentro da caixa', () => {
    for (const shape of SHAPE_IDS) {
      const part = partOf(shape)
      const built = buildPartGeometry(part)
      const center = partCenter(part)
      for (let t = 0; t < built.triangleCount; t += 1) {
        const n = [built.normals[t * 9], built.normals[t * 9 + 1], built.normals[t * 9 + 2]] as [
          number,
          number,
          number,
        ]
        expect(Math.abs(Math.hypot(...n) - 1)).toBeLessThan(1e-5)
        const centroid = [0, 0, 0]
        for (let v = 0; v < 3; v += 1) {
          for (let i = 0; i < 3; i += 1) {
            centroid[i] =
              (centroid[i] as number) + (built.positions[t * 9 + v * 3 + i] as number) / 3
          }
        }
        if (shape !== 'wedge') {
          // Formas convexas em volta do centro: a normal se afasta do centro.
          const outward =
            n[0] * ((centroid[0] as number) - center[0]) +
            n[1] * ((centroid[1] as number) - center[1]) +
            n[2] * ((centroid[2] as number) - center[2])
          expect(outward).toBeGreaterThan(0)
        } else {
          const face = built.faceOfTriangle[t]
          const frame = face ? planarFaceFrame(part, face) : null
          if (!frame) throw new Error(String(face))
          expect(Math.abs(n[0] - frame.normal[0])).toBeLessThan(1e-5)
          expect(Math.abs(n[1] - frame.normal[1])).toBeLessThan(1e-5)
          expect(Math.abs(n[2] - frame.normal[2])).toBeLessThan(1e-5)
        }
      }
      for (const uv of built.uvs) {
        expect(uv).toBeGreaterThanOrEqual(-1e-6)
        expect(uv).toBeLessThanOrEqual(1 + 1e-6)
      }
      for (let i = 0; i < built.positions.length; i += 3) {
        for (let k = 0; k < 3; k += 1) {
          expect(built.positions[i + k] as number).toBeGreaterThanOrEqual(
            (part.from[k] as number) - 1e-5,
          )
          expect(built.positions[i + k] as number).toBeLessThanOrEqual(
            (part.to[k] as number) + 1e-5,
          )
        }
      }
    }
  })

  test('o Raycaster do three (FrontSide) acerta cada face vindo de fora: o winding é CCW', () => {
    const rays: Array<{
      origin: [number, number, number]
      direction: [number, number, number]
      expect: string
    }> = [
      { origin: [10, 1.5, -0.5], direction: [-1, 0, 0], expect: 'px' },
      { origin: [-10, 1.5, -0.5], direction: [1, 0, 0], expect: 'nx' },
      { origin: [0.5, 10, -0.5], direction: [0, -1, 0], expect: 'py' },
      { origin: [0.5, -10, -0.5], direction: [0, 1, 0], expect: 'ny' },
      { origin: [0.5, 1.5, 10], direction: [0, 0, -1], expect: 'pz' },
      { origin: [0.5, 1.5, -10], direction: [0, 0, 1], expect: 'nz' },
    ]
    const box = partOf('box')
    const boxMesh = toThree(box)
    const built = buildPartGeometry(box)
    for (const ray of rays) {
      const caster = new Raycaster(new Vector3(...ray.origin), new Vector3(...ray.direction))
      const hit = caster.intersectObject(boxMesh, false)[0]
      expect(hit).toBeDefined()
      if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) throw new Error('sem hit')
      expect(built.faceOfTriangle[hit.faceIndex]).toBe(ray.expect as never)
    }
    // Rampa: por cima (na inclinação), por trás, por baixo e pelos lados.
    const wedge = partOf('wedge')
    const wedgeMesh = toThree(wedge)
    const wedgeBuilt = buildPartGeometry(wedge)
    const wedgeRays = [
      { origin: [0.5, 10, -0.5], direction: [0, -1, 0], expect: 'slope' },
      { origin: [0.5, 1, -10], direction: [0, 0, 1], expect: 'nz' },
      { origin: [0.5, -10, -0.5], direction: [0, 1, 0], expect: 'ny' },
      { origin: [10, 0.5, -1.5], direction: [-1, 0, 0], expect: 'px' },
      { origin: [-10, 0.5, -1.5], direction: [1, 0, 0], expect: 'nx' },
    ] as const
    for (const ray of wedgeRays) {
      const caster = new Raycaster(new Vector3(...ray.origin), new Vector3(...ray.direction))
      const hit = caster.intersectObject(wedgeMesh, false)[0]
      expect(hit).toBeDefined()
      if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) throw new Error('sem hit')
      expect(wedgeBuilt.faceOfTriangle[hit.faceIndex]).toBe(ray.expect)
    }
    // Cilindro e bola: de qualquer lado acerta, e de dentro para fora NÃO (culling).
    for (const shape of ['cylinder', 'sphere'] as const) {
      const mesh = toThree(partOf(shape))
      for (const direction of [
        [-1, 0, 0],
        [1, 0, 0],
        [0, 0, -1],
        [0, -1, 0],
      ] as const) {
        const origin = new Vector3(0.5, 1.5, -0.5).addScaledVector(new Vector3(...direction), -10)
        const caster = new Raycaster(origin, new Vector3(...direction))
        expect(caster.intersectObject(mesh, false).length).toBeGreaterThan(0)
      }
      const inside = new Raycaster(new Vector3(0.5, 1.5, -0.5), new Vector3(1, 0, 0))
      expect(inside.intersectObject(mesh, false)).toHaveLength(0)
    }
  })

  test('a mesma UV local (0,0) é o canto superior esquerdo visto de fora na face pz', () => {
    const box = partOf('box')
    const built = buildPartGeometry(box)
    const range = built.faceRanges.pz
    if (!range) throw new Error('pz')
    // Primeiro vértice do primeiro triângulo = TL = (x0, y1, z1).
    const i = range.start * 9
    expect(built.positions[i]).toBe(-1)
    expect(built.positions[i + 1]).toBe(3)
    expect(built.positions[i + 2]).toBe(1)
    expect(built.uvs[range.start * 6]).toBe(0)
    expect(built.uvs[range.start * 6 + 1]).toBe(0)
  })
})
