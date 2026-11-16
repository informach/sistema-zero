import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three'
import { paraMundo } from './terreno'

/** Margens e fundo compartilham a geometria com a física. */
export function geometriaDaBacia(
  a: DocumentoDeCenario['aguas'][number],
  altura: (x: number, z: number) => number,
) {
  const fundo = -a.profundidade / a.escala,
    vertices: number[] = [],
    indices: number[] = []
  for (const p of a.recorte) {
    const w = paraMundo(p, a.centro, a.giro, a.escala)
    vertices.push(p.x, (altura(w.x, w.z) - a.nivel) / a.escala, p.z, p.x, fundo, p.z)
  }
  const n = a.recorte.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    indices.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1)
  }
  const pontos = a.recorte.map((p) => new Vector2(p.x, p.z)),
    faces = ShapeUtils.triangulateShape(pontos, [])
  for (const f of faces) {
    const [i, j, k] = f as [number, number, number]
    const p = a.recorte[i]!,
      q = a.recorte[j]!,
      r = a.recorte[k]!,
      cima = (q.z - p.z) * (r.x - p.x) - (q.x - p.x) * (r.z - p.z)
    indices.push(i * 2 + 1, (cima > 0 ? j : k) * 2 + 1, (cima > 0 ? k : j) * 2 + 1)
  }
  const geo = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return { geo, vertices: new Float32Array(vertices), indices: new Uint32Array(indices) }
}
