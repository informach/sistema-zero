import type { MoldaMesh, Vec3 } from '../../core/model'
import { faceNormal, normalizeMesh } from '../../model/mesh'
import { buildTemplateModel } from '../builders'
import type { MoldaTemplate } from '../types'

// Paleta Arcade: 10 roxo · 9 azul-gelo · 3 rosa (os cristais) · 11 cinza (a pedra).
// O template de MALHA: três cristais (bipirâmides de base quadrada, 8 faces
// triangulares cada) fincados numa pedra. É a vitrine do "Editar malha": pontas,
// arestas e faces para puxar, cortar e mexer.

function average(points: readonly Vec3[]): Vec3 {
  const sum: Vec3 = [0, 0, 0]
  for (const point of points) {
    sum[0] += point[0]
    sum[1] += point[1]
    sum[2] += point[2]
  }
  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length]
}

/** O ciclo com a normal apontando para FORA do cristal (para longe do centro dele). */
function outward(cycle: string[], vertices: Record<string, Vec3>, center: Vec3): string[] {
  const points = cycle.map((key) => vertices[key] as Vec3)
  const normal = faceNormal(points)
  const centroid = average(points)
  const away: Vec3 = [centroid[0] - center[0], centroid[1] - center[1], centroid[2] - center[2]]
  const dot = normal[0] * away[0] + normal[1] * away[1] + normal[2] * away[2]
  return dot >= 0 ? cycle : [...cycle].reverse()
}

/**
 * Um cristal: ponta embaixo (`bottom`), anel quadrado de raio `r` na altura `ring`
 * e ponta em cima (`top`). Chaves curtas e estáveis (o template é dado embutido).
 */
function crystal(
  prefix: string,
  cx: number,
  cz: number,
  r: number,
  bottom: number,
  ring: number,
  top: number,
): MoldaMesh {
  const vertices: Record<string, Vec3> = {
    [`v_${prefix}b`]: [cx, bottom, cz],
    [`v_${prefix}t`]: [cx, top, cz],
    [`v_${prefix}0`]: [cx + r, ring, cz],
    [`v_${prefix}1`]: [cx, ring, cz + r],
    [`v_${prefix}2`]: [cx - r, ring, cz],
    [`v_${prefix}3`]: [cx, ring, cz - r],
  }
  const center: Vec3 = [cx, (bottom + top) / 2, cz]
  const faces: MoldaMesh['faces'] = {}
  for (let i = 0; i < 4; i += 1) {
    const a = `v_${prefix}${i}`
    const b = `v_${prefix}${(i + 1) % 4}`
    faces[`f_${prefix}t${i}`] = { v: outward([`v_${prefix}t`, a, b], vertices, center) }
    faces[`f_${prefix}b${i}`] = { v: outward([`v_${prefix}b`, b, a], vertices, center) }
  }
  return normalizeMesh({ vertices, faces })
}

export const cristalTemplate: MoldaTemplate = {
  id: 'cristal',
  suggestedName: 'cristal',
  build() {
    return buildTemplateModel({
      name: 'cristal',
      parts: [
        { name: 'pedra', from: [-4, 0, -3], to: [4, 1, 3], color: 11 },
        { name: 'cristal-grande', shape: 'mesh', color: 10, mesh: crystal('g', 0, 0, 2, 1, 5, 10) },
        { name: 'cristal-azul', shape: 'mesh', color: 9, mesh: crystal('a', 3, 1, 1, 1, 3, 6) },
        { name: 'cristal-rosa', shape: 'mesh', color: 3, mesh: crystal('r', -3, -1, 1, 1, 4, 7) },
      ],
    })
  },
}
