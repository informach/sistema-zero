import { describe, expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createModelAsset, createPart, type MoldaMesh, type Vec3 } from '../core/model'
import { modelTriangleCount } from '../model/geometry'
import { exportModelGlb } from './modelGlb'

/**
 * MEDIÇÃO do teto de triângulos da malha (`maxTriangles`): um modelo de 20 000
 * triângulos de malha, sem pele (atlas mínimo), tem de caber no `.glb` que o
 * Estúdio aceita (`studioMax3DChars`, 7 M chars). É o que justifica o número.
 */
function stripMesh(y: number): MoldaMesh {
  // Uma tira 2 × 501 vértices (1 002 ≤ 1 024) = 500 quads = 1 000 triângulos.
  const vertices: Record<string, Vec3> = {}
  const faces: MoldaMesh['faces'] = {}
  const columns = 501
  for (let i = 0; i < columns; i += 1) {
    const x = -16 + (32 * i) / (columns - 1)
    vertices[`v_a${i}`] = [x, y, -1]
    vertices[`v_b${i}`] = [x, y, 1]
  }
  for (let i = 0; i + 1 < columns; i += 1) {
    faces[`f_${i}`] = { v: [`v_b${i}`, `v_a${i}`, `v_a${i + 1}`, `v_b${i + 1}`] }
  }
  return { vertices, faces }
}

describe('malha no .glb', () => {
  test('20 000 triângulos de malha cabem no teto do Estúdio', () => {
    const model = createModelAsset({ name: 'medicao', starter: false, now: 1 })
    model.parts = Array.from({ length: 20 }, (_, index) =>
      createPart({
        name: `tira-${index}`,
        shape: 'mesh',
        from: [-16, index, -1],
        to: [16, index, 1],
        color: 2,
        mesh: stripMesh(index),
      }),
    )
    expect(modelTriangleCount(model)).toBe(MOLDA_LIMITS.maxTriangles)
    const result = exportModelGlb(model)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.triangles).toBe(MOLDA_LIMITS.maxTriangles)
    expect(result.chars).toBeLessThanOrEqual(MOLDA_LIMITS.studioMax3DChars)
  })

  test('uma caixa-malha exporta como a caixa (12 triângulos)', () => {
    const model = createModelAsset({ name: 'cubo', starter: false, now: 1 })
    model.parts = [
      createPart({ name: 'cubo', shape: 'mesh', from: [0, 0, 0], to: [2, 2, 2], color: 2 }),
    ]
    const result = exportModelGlb(model)
    expect(result.ok && result.triangles).toBe(12)
  })

  test('arestas de construção não viram triângulos no GLB', () => {
    const model = createModelAsset({ name: 'molde', starter: false, now: 1 })
    const part = createPart({
      name: 'cubo-com-guia',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 2,
    })
    if (!part.mesh) throw new Error('sem malha')
    part.mesh.looseEdges = [['v_000', 'v_111']]
    model.parts = [part]

    const result = exportModelGlb(model)
    expect(result.ok && result.triangles).toBe(12)
  })
})
